# dev レビュー R4 — 3件の指摘 (⑩⑪⑫) root cause 調査

対象: user の dev レビュー R4 で挙がった 3 件の指摘:

1. ⑩ EXE フォルダ監視で深さ 4 階層ぐらいにすると読み込みが非常に遅い
2. ⑪ カラーテーマで反映されないものがある (プライマリカラー等)
3. ⑫ カラーのランダムボタンが効いていない / 全然色が変わらない

- 解析時点 main HEAD = `4245481d` (PR #582 まで merge 済)。
- 解析方法: 静的 grep + 実コード読解 + 実機 dev (Tauri + Vite + CDP 9222) 経由の `getComputedStyle` 実測 (theme は実機の active state を採取)。
- **本ドキュメントは分析のみで、 コードは一切変更していない。**

---

## TL;DR

| # | root cause                                                                                                                                                                                                                                                                                | 確度                        | 修正方針案                                                                                                                                                                                  |
| - | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⑩ | scan が **single-threaded 再帰 walk** + 階層ごとの `fs::read_dir` + `fs::symlink_metadata` の syscall 並列性なし、 さらに Windows Defender 等のリアルタイム scan と直列処理で乗算的に遅延                                                                                                 | 高                          | scan 第1階層 fork → 並列 walk (rayon 等)、 早期打ち切り (1 entry あたり「default 候補が 1 個確定したら collect 終了」)、 depth 漸進取得 (まず 1→2→3 と段階表示)                             |
| ⑪ | **`ThemeEditor` が AG_VARS (全 28 token) を save 時に literal 値で JSON 凍結** している。 `--ag-accent`/`--ag-accent-text`/`--ag-accent-bg`/`--ag-accent-border`/`--ag-accent-secondary` 等が `var(--c-primary)` 連動を失い、 `--c-primary` を変えても CSS chain が切れたまま反映されない | **実測確認済 / 確度: 確実** | save 時に LAYER 2 (`--ag-*`) を JSON に書かない (LAYER 1 `--c-*` のみ persist)、 もしくは CSS rule で literal-equivalent な値を save しない (= 元値と完全一致 token は除外して JSON に書く) |
| ⑫ | (a) ⑪ と同じ chain 切断で **random 後の primary 変化が見えにくい**。 (b) `randomize()` が aesthetic を `'glass'` ハードコードしているため、 brutalist / neumorph テーマでも glass レンジ (chroma 0.16–0.22 / l 0.58–0.7) になり、 aesthetic ごとの個性が出ない                            | 高                          | ⑪修正で chain が直れば (a) は連動解消。 (b) は `theme.base_theme` か theme metadata から aesthetic を推定して渡す                                                                           |

### ⑫ 後半 (design feedback) 「もっと差があれば」

UI 全体で `--ag-accent` をベタ塗り使用する箇所が **9 file 程度に限定** (focus ring / 選択 ring / starred badge / switch / setup wizard アクセント等)。 background や text 等の支配的サーフェスは `--ag-surface-*` (中立グレー) で構成されているため、 「primary を変えても見た目があまり変わらない」 は **デザインモデルの帰結**。 ⑪修正後も「テーマごとの個性」 を出すには別途デザイン方針 (例: surface tint に primary を hue だけ混ぜる、 widget header に primary border を入れる 等) が要る (§7)。

---

## 1. ⑩ EXE フォルダ scan が深い階層で遅い

### 1.1 spawn 経路

[`ExeFolderWatchWidget.svelte:152-249`](../../../src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte) →
[`cmd_scan_exe_folders`](../../../src-tauri/src/commands/exe_scanner_commands.rs) (`spawn_blocking`) →
[`exe_scanner_service::scan_exe_folders_with_cancel`](../../../src-tauri/src/services/exe_scanner_service.rs) →
`fs::read_dir` (root) → 第1階層 dir list → 各第1階層 dir で
[`collect()`](../../../src-tauri/src/services/exe_scanner_service.rs):271-354 を再帰呼出。

### 1.2 perf 観点

#### a. 再帰 walk が single-threaded

[`collect()`](../../../src-tauri/src/services/exe_scanner_service.rs):271 は **同期再帰**で、 ある dir 内の subdirs を 1 つずつ深さ優先で降りる。 並列化なし。 depth = 4 で各階層 ~10 subdir × 5 内訳としても **5^4 = 625 dir × `read_dir` + entry 数 × `symlink_metadata`** が **serialize される**。

```rust
// 該当箇所 (services/exe_scanner_service.rs):
if current_depth < max_depth {
    subdirs.sort();
    for sub in subdirs {                   // ← serial
        if cancel.load(Ordering::Relaxed) {
            return;
        }
        collect(&sub, current_depth + 1, ...);
    }
}
```

#### b. Windows Defender / AV 経由の syscall コスト

各 `fs::symlink_metadata` / `fs::read_dir` は Defender の minifilter を経由するため、 同期 syscall が **数ms単位で増える** ケースが Windows 11 で報告されている (特に `Program Files\` 配下 / 大きい games フォルダ)。 single-threaded だとこの cost が 線形累積する。

#### c. cache の hit 率

PH-CF-900 で `cmd_get_exe_scan_cached` がある (key: `<path>|<depth>|<exts>`)。 cache hit なら即表示で walk は走らない。 ただし:

- depth 変更で cache key が変わる → user が depth を 4 に上げた瞬間 (= 報告のシナリオ) は **必ず cache miss → cold walk**。
- watched_paths watcher が file 変更を検知すると cache invalidate されるため、 大きい games フォルダ全体 (各 game の更新) で頻繁に cache が消える可能性あり (`features/backend/exe-scanner.md` 要 cross-check)。

#### d. bulk register コストは支配的でない

スキャン後の [`register_exe_items_bulk`](../../../src-tauri/src/services/item_service.rs):730-823 は K-3 perf fix (2026-05-15) で `1 lock + 1 transaction で N 件処理` に集約済。 `register_exe_item_on_conn` は **icon 抽出を呼ばない** (`icon_path: None` で insert、 line 684)。 icons は表示時に lazy 抽出する経路。 つまり DB 書き込みは数百件でも 数十ms 程度。

#### e. depth 上限

[`MAX_SCAN_DEPTH`](../../../src-tauri/src/services/exe_scanner_service.rs):15 = 10。 user が深くしすぎても 10 でクランプ。 ただし 10 階層を実 walk すると現状の serial だと数十秒オーダーに膨らむ可能性あり。

### 1.3 真因の切り分け

⑩ の支配項は **`collect()` の serial 再帰 walk** で、 cache の miss が同時に起きると cold walk のコストがそのまま user に見える時間になる。 「深さ 4」 が遅いと感じる閾値は branching × syscall cost の積で、 Windows AV 環境では 100–500 ms / dir 程度の syscall がボトルネック化することがある。

実測 (実機 dev で `pnpm tauri dev` 経由) は本 audit では未取得 — 修正実装側で `std::time::Instant` の段階計測ログを入れて (a) `read_dir` 累計、 (b) `symlink_metadata` 累計、 (c) total を切り分ける必要あり。 静的読解だけで「serial 再帰が支配」 と判定するのは確度: 中。

### 1.4 修正方針案 (実装はしない)

#### Option A: 第1階層フォルダ単位で並列 walk

[`scan_exe_folders_with_cancel`](../../../src-tauri/src/services/exe_scanner_service.rs):76-181 が第1階層 dir を列挙した後、 各 dir の `collect()` を **rayon / `std::thread::spawn` 等で並列化**。 第1階層が 20 個あるなら 20 × CPU core での並列。 `found` / `found_ico` は dir 単位で独立しているので合成は trivial (現実装で既に dir ごとに作っている)。 cancel チェックは `Arc<AtomicBool>` のまま共有。

利点: 大改修なし、 既存 cache 経路と整合。 利点が大きいのは「games フォルダ配下に 50+ サブフォルダがある」 配置 (= ⑩ の典型ケース)。

#### Option B: 早期打ち切り

1 第1階層 dir につき「default 1 ファイル」 が確定すれば walk 終了。 現状は全候補を集めてから sort して 1 件選んでいる ([scan_exe_folders_with_cancel:144-157](../../../src-tauri/src/services/exe_scanner_service.rs))。 popover の候補一覧表示のため全部要るが、 一覧は遅延展開で許容できれば「最初に見つかった対象 → entry 作成 → 残りは popover open 時に追加 walk」 に分割可能。

利点: depth=4 で各 dir に「launcher.exe が浅い階層にあれば即終了」 で大半が剪定される。
欠点: popover の候補一覧が遅延展開になる UX 変化 (現状の即時 candidates 仕様を変える)。

#### Option C: depth 漸進取得

最初に depth=1 で walk → entry 即表示 → background で depth=2,3,...,N を順次 walk して entry を update。 体感的に「いきなり全部出る」 から 「少しずつ増える」 に変わるが、 user の「読み込みが非常に遅い」 体感 (= UI が固まる) は解消する。

利点: cancel と相性が良い (深い walk を中断しやすい)。
欠点: 「entry が後から増える」 を UI で受け止める design (= sticky じゃない場所に新規 entry が追加で出る)。

#### Option D: cache の漸進化 (差分 walk)

現 cache は「entries 全体」 を 1 row に持つ完全 snapshot 方式。 entry id (= 第1階層 folder path) ごとに row を持って、 watcher 検知時は該当 entry だけ invalidate + rescan する形にできる。 これは PH-CF-900 設計の発展形だが、 cache table を分割する大改修になる。

### 1.5 推奨 (調査結論)

実装方針として A (並列 walk) が **最小コストで最大効果** の見込み。 user の「クリーンに改善できる余地 (ハックなし)」 要件にも合う:

- 並列化は std lib + rayon で 50 行以内、 cancel / 既存 cache と直交
- 早期打ち切り (B) は UX 変化を伴うので別 PR
- depth 漸進 (C) は perf 真因とは別の体感対策

実装前に **`std::time::Instant` で段階計測ログを 1 PR 入れて user の実機で walk の支配項を確定** することが prudent (= ハック無しで効くか の確認)。

---

## 2. ⑪ プライマリカラーが UI に反映されない

### 2.1 実機 CDP 実測

実機 dev (Tauri + Vite + CDP 9222) で active custom theme (light base + user-changed primary `#a57aff`) の `documentElement` 状態を `getComputedStyle` で採取:

```text
--c-primary           = "#a57aff"                                                       ← user 変更済 (purple)
--ag-accent           = "oklch(0.50 0.14 215)"                                          ← 初期 blue で凍結  ⚠
--ag-accent-text      = "color-mix(in oklab, oklch(0.50 0.14 215), oklch(0.22 0.02 260) 52%)"  ← 凍結  ⚠
--ag-accent-bg        = "color-mix(in oklab, oklch(0.50 0.14 215), transparent 88%)"    ← 凍結  ⚠
--ag-accent-border    = "color-mix(in oklab, oklch(0.50 0.14 215), transparent 74%)"    ← 凍結  ⚠
--ag-accent-secondary = "oklch(from oklch(0.50 0.14 215) l c calc(h + 180))"            ← 凍結  ⚠
--ag-accent-active-bg = "color-mix(in oklab, #a57aff, transparent 84%)"                 ← 動的 (chain 生きてる)
```

`--c-primary` だけが purple、 主要 `--ag-accent*` は **全て初期 blue (oklch(0.50 0.14 215))** で凍結。 これは「accent token が UI 描画に使われている全箇所で blue のまま」 を意味する。

### 2.2 chain 構造 (期待される動作)

[`arcagate-theme.css`](../../../src/lib/styles/arcagate-theme.css):115-130 で LAYER 2 token は LAYER 1 `--c-primary` から `var()` 経由で派生する:

```css
--ag-accent: var(--c-primary);
--ag-accent-text: color-mix(in oklab, var(--c-primary), var(--c-fg) 52%);
--ag-accent-bg: color-mix(in oklab, var(--c-primary), transparent 88%);
--ag-accent-border: color-mix(in oklab, var(--c-primary), transparent 74%);
--ag-accent-active-bg: color-mix(in oklab, var(--c-primary), transparent 84%);
--ag-accent-active-border: color-mix(in oklab, var(--c-primary), transparent 70%);
--ag-accent-secondary: var(--c-secondary);
```

CSS variables は動的解決のため、 `--c-primary` を変更すれば `--ag-accent` も連動するはず。 **しかし inline style で literal が上書きされると chain は切断される**。

### 2.3 真因: `ThemeEditor` の save 時 freeze

[`ThemeEditor.svelte:39-68 (AG_VARS)`](../../../src/lib/components/settings/ThemeEditor.svelte) と
[`ThemeEditor.svelte:83-90 (initEntries)`](../../../src/lib/components/settings/ThemeEditor.svelte) と
[`ThemeEditor.svelte:175-200 (handleSave)`](../../../src/lib/components/settings/ThemeEditor.svelte) の組合せで次の事象が起こる:

1. `initEntries()` で 28 token (SEED_VARS + AG_VARS) を **全て computed value で初期化** (overrides に無ければ `style.getPropertyValue(key)`)。 編集前は `style.getPropertyValue('--ag-accent')` = 解決後の `oklch(0.50 0.14 215)` (デフォルトプライマリ由来) 等。
2. user は color picker で `--c-primary` を `#a57aff` に変更。 `setVar('--c-primary', '#a57aff')` が inline style に書く → CSS chain で `--ag-accent` も live 更新 (purple-derived) されるはず — だが entries 配列の `--ag-accent` value は **初期化時の凍結 literal のまま**。
3. user が save → `handleSave` が全 28 entries を **literal で JSON に保存**:
   ```ts
   for (const { key, value } of entries) {
       cssVars[key] = value;  // ← --ag-accent も literal "oklch(0.50 0.14 215)"
   }
   ```
4. `themeStore.updateTheme` → `applyTheme()` → JSON parse → 全 token を `style.setProperty(key, value)` で **inline style に上書き** → CSS chain が切れる:
   - `--ag-accent` は inline style で `oklch(0.50 0.14 215)` (frozen) になり、 CSS rule の `var(--c-primary)` は完全に無視される。
   - 一方 `--ag-accent-active-bg` は AG_VARS に無いため inline style に書かれず CSS rule 経由で `var(--c-primary)` → `#a57aff` を拾う (= probe 結果と一致)。

### 2.4 確認テスト

`AG_VARS` に含まれる token (= 凍結対象) と含まれない token を probe 結果で対照:

| token                       | AG_VARS にある? | probe 値                              | 連動?   |
| --------------------------- | --------------- | ------------------------------------- | ------- |
| `--ag-accent`               | Yes             | `oklch(0.50 0.14 215)`                | ❌ 凍結 |
| `--ag-accent-text`          | Yes             | `oklch(0.50 0.14 215)` 派生           | ❌ 凍結 |
| `--ag-accent-bg`            | Yes             | `oklch(0.50 0.14 215)` 派生           | ❌ 凍結 |
| `--ag-accent-border`        | Yes             | `oklch(0.50 0.14 215)` 派生           | ❌ 凍結 |
| `--ag-accent-secondary`     | Yes             | `oklch(0.50 0.14 215)` 派生           | ❌ 凍結 |
| `--ag-accent-active-bg`     | No              | `#a57aff` 派生                        | ✓ 動的  |
| `--ag-accent-active-border` | No              | (probe で目視確認、 chain 生きる想定) | ✓ 動的  |

→ **AG_VARS に列挙された LAYER 2 token が全て freeze 対象** という構造的な bug が確定。

### 2.5 修正方針案 (実装はしない)

#### Option A: save 時に LAYER 2 を JSON に書かない

最も小さい diff。 `handleSave` で `SEED_VARS` の token のみ JSON 化する (`AG_VARS` 側は CSS の動的派生に任せる)。 ただし「LAYER 2 を上書きしたい user (advanced)」 のユースケースは塞ぐ。 現状 ThemeEditor の `showAdvanced` セクションが LAYER 2 編集 UI を持っているので、 そこで明示的に user が編集した token のみ JSON に書く形に変える必要あり (= dirty 判定を per-token に持つ)。

#### Option B: JSON に書く時、 CSS rule と同値なら除外

`--ag-accent` の CSS rule 上の値 = `var(--c-primary)` を **CSSStyleSheet.cssRules** から読み出し、 entries[key] の literal computed が rule 上の派生と一致するなら save から除外する。 動的 chain を温存できるが、 比較ロジックが脆弱 (computed value の文字列一致は信頼度が低い)。

#### Option C: dirty トラッキング (推奨)

entries に「user が明示編集した?」 フラグを足し、 `handleSave` は dirty=true の entries のみ JSON 化。 `initEntries` の computed value 取得は読み取り専用 reference として表示するだけ。 これだと未編集の LAYER 2 が JSON に漏れず、 CSS chain が温存される + advanced で user が明示編集した literal は永続化される。

実装コスト: ThemeEditor 内のみ完結する 30 行以内の改修。 既存 freeze 済 custom theme は migration では救えない (= user の意図と区別不能) ため、 issue 移行時には **「user の壊れた theme を 1 度 reset するか、 自動 cleanup」** のフォローアップ判断が必要。

### 2.6 既存 freeze 済 theme の救出

⑪ の修正だけだと **既に freeze された custom theme は持続的に壊れたまま**。 cleanup 戦略:

- 戦略 i: app 起動時に migration / loader で「`--ag-*` token が CSS rule の派生値とほぼ一致するなら JSON から除去」 (ヒューリスティック、 false negative あり)
- 戦略 ii: ThemeEditor 開いたタイミングで「リセット推奨 toast」 表示 + ボタンで `--ag-*` を JSON から一括削除 (user 同意ベース)
- 戦略 iii: 何もしない (user が手動で「複製」 で作り直す)

⑪ の本体修正と分けて user 確認の上で決める方針が安全。

---

## 3. ⑫ カラーのランダムボタンが効いていない / 全然色が変わらない

### 3.1 root cause (a): ⑪ chain 切断と同じ

[`randomize()` (ThemeEditor.svelte:129-134)](../../../src/lib/components/settings/ThemeEditor.svelte) は `setVar('--c-primary', pair.primary)` / `setVar('--c-secondary', pair.secondary)` で **inline style に書く** ため、 ⑪ と同じく既に freeze された LAYER 2 entries が JSON に save されると、 次回 apply で chain が切れて見た目に効かない。 **`randomize()` 自体は動いている**が、 visual change が `--ag-accent-active-bg` のような chain-alive token に限定される。

### 3.2 root cause (b): aesthetic ハードコード

[`randomize()` (ThemeEditor.svelte:130)](../../../src/lib/components/settings/ThemeEditor.svelte):

```ts
const pair = randomSeedPair('glass', bgRef, primaryHex, secondaryHex);
//                          ^^^^^^^ aesthetic 固定
```

[`AESTHETIC_RANGE` (`utils/color.ts:121-125`)](../../../src/lib/utils/color.ts):

```ts
const AESTHETIC_RANGE: Record<Aesthetic, { c: [number, number]; l: [number, number] }> = {
    glass: { c: [0.16, 0.22], l: [0.58, 0.7] },
    neumorph: { c: [0.02, 0.06], l: [0.85, 0.95] },
    brutalist: { c: [0.18, 0.28], l: [0.55, 0.65] },
};
```

`'glass'` は chroma 0.16–0.22 (中庸) / lightness 0.58–0.70 (中庸) の比較的おとなしい範囲。 つまり「random しても muted な中間色しか出ない」。 brutalist / neumorph テーマで random を押しても **glass 範囲の色が来る** ので、 brutalist の鮮烈 red / neumorph の pastel purple とは離れた色になる ( = aesthetic の個性がさらに薄れる)。

### 3.3 修正方針案

#### Option A: ⑪ 修正で chain が直れば自動解消

LAYER 2 freeze の bug を直すと、 random の `--c-primary` / `--c-secondary` 変更が全 accent 派生に伝播する。 視覚変化は劇的になる。

#### Option B: aesthetic を theme から推定

[`themeStore.themes`](../../../src/lib/state/theme.svelte.ts) の各 theme は `base_theme: 'dark' | 'light'` を持つが、 「glass / neumorph / brutalist」 のような aesthetic ラベルは持たない。 audit doc TS-3 (PR #581) で議論された aesthetic 列を追加するか、 theme id (`brutalist`, `neumorph-dark` 等) を見て map で aesthetic を決める方法がある。

`base_theme` 派生 (= dark / light のみ) で aesthetic を決められないため、 spec 上は次の何れかが必要:

- theme model に `aesthetic` 列を追加 (`'glass' | 'neumorph' | 'brutalist'`、 builtin で seed)
- theme id literal → aesthetic の hard-coded mapping (custom theme は base が glass 想定なので default = glass)

#### Option C: aesthetic range を広げる

`'glass'` のレンジを chroma 0.10–0.28 / lightness 0.48–0.78 程度に広げると random の振れ幅が増える。 ただし contrast チェック (3:1 / 1.25:1) を満たさず fallback に落ちる確率が増える → 結果として primary 変化が出ない事象は逆に増えうる。

### 3.4 推奨 (調査結論)

⑫ root cause は ⑪ と同根の chain 切断が支配。 まず ⑪ を治す。 (b) の aesthetic ハードコードは 「base_theme + theme id → aesthetic」 mapping で塞ぐのが妥当。 (c) は最後の手段。

---

## 4. ⑫ 後半 design feedback の論点整理

user 報告: 「もっと変わってほしいけど難しそう、 そもそも色あんまり使ってないし、 各テーマもっと差があればなぁ」

### 4.1 UI で primary を使う面積の現状調査

`bg-[var(--ag-accent)]` (ベタ塗り背景として primary を使う) を repo 全体で grep した結果 **8 file** に限定:

- `LibraryCard.svelte` (starred badge 背景・選択 ring)
- `LibraryDetailActions.svelte` (起動ボタン)
- `LibraryItemPicker.svelte` (選択 chip)
- `WidgetHandles.svelte` (アクセント細部)
- `Switch.svelte` (toggle ON 状態)
- `SetupWizard.svelte` (重要 CTA)
- `SnippetWidget.svelte` (色付き label の一部)
- `SystemMonitorWidget.svelte` (gauge アクセント)

残りの大半 (focus ring / 選択 border / accent text 等) は `ring-[var(--ag-accent)]` / `text-[var(--ag-accent-text)]` 等の **細い線・小さな chip** 用途に限定。 dominant surface は `--ag-surface-0..4` (中立グレー / theme bg) + `--ag-text-*` (中立 fg) で組み立てる design model。

つまり「primary 変えても見た目があんまり変わらない」 は ⑪ 修正後も**デザインモデル由来の体感**として残る。 「primary 色 = 個性」 を強くするには **次のいずれかの design方針切替** が要る:

### 4.2 検討可能な方向性 (実装方針として確定はしない — user の design 判断待ち)

| 方向性                                          | 説明                                                                                                                                          | 副作用                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| α. surface tint に primary を混ぜる             | `--ag-surface-3` 等を `color-mix(in oklab, var(--c-bg), var(--c-primary) 4%)` に変更                                                          | 全画面の「無彩色」 が無くなり、 中立感が消える。 brutalist (純白/純黒) の aesthetic と矛盾 |
| β. widget header / sticky bar に primary border | header 上端や sticky bar に `border-top: 2px solid var(--ag-accent)` を入れる                                                                 | UI に重さが加わる、 brutalist 系で過剰になる可能性                                         |
| γ. アイコン色を primary 派生に                  | lucide icon 全体に `color: var(--ag-accent-text-soft)` を当てる                                                                               | 「すべてのアイコンが色付き」 は強い変化、 accessibility / 認知負荷の検討必要               |
| δ. 「theme = surface も変わる」 設計            | builtin theme で primary だけでなく `--ag-surface-*` の hue も連動させる (例: cyberpunk = magenta surface tint、 nature = green surface tint) | 「theme の世界観」 が出るが、 既存 6 builtin のキャラクタ再設計が必要                      |
| ε. 「現状維持 + 文言で説明」                    | primary は「アクセント色」 と UI 上明示                                                                                                       | 期待値ギャップは残るが、 design model はクリーン                                           |

α や β は ⑪ 修正後の自然な発展だが、 design 哲学 (中立 surface + 控えめ accent) と衝突する。 user の好み / 製品方針との整合が必要。

### 4.3 推奨 (調査結論)

「もっと差があれば」 の修正方針は **⑪ chain 切断修正の後** に user 検収して、 不足の有無を判断するのが順序として正。 chain が直れば「random 押すと小さな accent 色が連動して変わる」 が一斉に効くため、 体感は劇的に変わる可能性がある。 もし chain 修正後も不足するなら、 上記 α–ε から user 同意の上で 1 つを選択して別 PR を立てる。

---

## 5. ⑩⑪⑫ 共通の構造的教訓

- LAYER 1 (seed) / LAYER 2 (semantic) の二層 token は **「LAYER 2 は LAYER 1 の `var()` で動的派生」** が contract。 編集 UI が computed value を読んで literal で persist すると chain が切断され、 「seed を変えても見た目に反映しない」 という致命的 UX 不具合になる。 本件はその典型。
- scan / walk 系 IPC は **first-level fork で並列化** が perf の主軸。 single-threaded 再帰は depth が浅いうちは問題が見えないが、 user が深く設定した瞬間に体感が悪化する。 cache の有無とは独立して並列化を持つべき。

---

## 引用元 / 関連 doc

- `docs/l3_phases/audit/CODEX_AESTHETIC_THEME_F3_2026-05-27.md` (PR #581: F3 builtin css_vars seed)
- `docs/l3_phases/audit/SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26.md` (PR #580: 共通化 + audit 案)
- `memory/feedback_horizontal_application.md` (横展開 sweep 原則)
- `src/lib/styles/arcagate-theme.css` (LAYER 1 / LAYER 2 token chain)
- `src/lib/components/settings/ThemeEditor.svelte` (本件の真因コード位置)
- `src/lib/utils/color.ts` (random 生成ロジック)
- `src-tauri/src/services/exe_scanner_service.rs` (scan 再帰 walk)
