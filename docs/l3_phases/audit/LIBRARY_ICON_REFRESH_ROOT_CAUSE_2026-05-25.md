# Library アイテム見た目設定の即時反映 — 根本分析 (2026-05-25)

対象: PH-CF-600 → PR #570 → PR #573 で 3 回継ぎ足された
「Library アイテムの見た目設定で画像を変えても一覧カードに即反映されない」
(以下 ②) を、 これ以上対症療法を積まずに根治するための事実ベース分析。

前提:

- 解析時点 main HEAD = `c078233f` (PR #573 マージ済)。
- 解析方法: 静的コードトレース。 動的実機検証は行っていない。
- 同じ問いを Codex (`codex exec --sandbox read-only`) にも独立調査させた結果を
  [`CODEX_LIBRARY_ICON_REFRESH_2026-05-25.md`](CODEX_LIBRARY_ICON_REFRESH_2026-05-25.md)
  に保存。 本文では Claude / Codex の見解が一致した箇所と分かれた箇所を明示する。
- **本ドキュメントは分析のみで、 コードは一切変更していない。**

---

## TL;DR (経営判定)

- 現状 (#573 後) の ② は **「動く構成にはなっているが、 `{#key}` 再マウントは Svelte 5 の
  素直な reactivity を信頼しないための回避策」**。 対症療法のラスト 1 枚。
- 真の root cause は「カード `<img>` の **paint scheduling 不確実性** (lazy + decoding=async +
  modal overlay 下の再描画タイミング) が、 src 文字列が変わっても visible image を
  古いまま残しうる」 こと。 `content-visibility: auto` は #573 で撤廃済だが、 同型問題を
  起こす要素として `<img loading="lazy" decoding="async">` が **まだ残っている**。
- WebView2 を巻き込む LB-2 クラッシュは **製品バグの兆候としては確認できない**。 主因は
  「shared worker (`workers: 1`) + 単一 WebView2 + Tauri internal IPC を monkey-patch する
  mock + spec-local な CSS injection + afterEach cleanup」 という **テストハーネス側の
  脆弱性スタック** であり、 これは Claude / Codex で見解一致。
- `card_override_json` に UI 状態 (`disabled`, `icon_backup`) を混在させているのは
  **JSON schema としてはワークアラウンド寄り** (Codex 一致)。 ⑤⑥ の遷移整合自体は取れて
  いるが、 設定値とライフサイクル制御を 1 カラムに同居させていることが将来 schema 拡張で
  破綻リスクになる。
- ② を実 UI 機械検証する e2e は、 ハーネスを今のままにする限り「単独 worker / 単独 job /
  cleanup 失敗時に WebView2 を確実再起動できる pair fixture」 への投資が必須。 その投資を
  取らないなら **「② は構造 audit + 手動 CDP 目視で担保、 e2e は捨てる」 が honest な代替**。
- 仕様書 [library.md](../../l2_foundation/features/screens/library.md):224 は
  「LB-2-real が機械検出経路」 と宣言しているが、 実テストは `test.skip` に倒れている
  ([ph-cf-600-library-bug-fixes.spec.ts](../../../tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):105)。
  この **仕様 ⇄ 実装の乖離は運用品質リスク**。 audit doc / spec doc / test 三者を同期させる
  整理を分離 PR で行うべき。

---

## 用語整理

| 語                  | 指すもの                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ②                   | 「見た目設定で画像変更 → Library 一覧カードが即時反映」 という user 要求                                                            |
| 即時反映            | dialog open / close を待たず、 grid card の `<img src>` が新 path に切替わる                                                        |
| paint stale         | DOM/src は更新されているのに、 browser が古い image を表示し続ける現象                                                              |
| `{#key}` 再マウント | 各 card を <code>{#key item.icon_path&#124;card_override_json}</code> で囲み、 src 変化で DOM 自体を作り直す PR #573 の構造的回避策 |
| LB-2                | ② を実 UI 経路で検証する e2e (現在 skip)                                                                                            |
| LB-2-real           | PR #573 で導入を計画した、 dialog mock + 実 UI click sequence 版 LB-2                                                               |

---

## 1. 現状 (#573 後) の ② は本当に正しいのか — データフロー追跡

### 1.1 画像変更フロー (file:line)

| Step | 場所                                                                                                          | 内容                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | [`LibraryDetailPanel.svelte`](../../../src/lib/components/arcagate/library/LibraryDetailPanel.svelte):214-326 | 「見た目設定」 checkbox = ON → 歯車 button enable → click で `cardOverrideDialogOpen = true`                                                                       |
| 2    | [`CardOverrideDialog.svelte`](../../../src/lib/components/arcagate/library/CardOverrideDialog.svelte):31-58   | `<ItemFormCardOverride item={item}>` を render                                                                                                                     |
| 3    | [`ItemFormCardOverride.svelte`](../../../src/lib/components/item/ItemFormCardOverride.svelte):89-117          | `selectImage()` で `plugin-dialog open()` → `cmd_save_icon_file` → `applyOptimisticUpdate` → `updateItem`                                                          |
| 4    | [`items.svelte.ts`](../../../src/lib/state/items.svelte.ts):62-67                                             | `items = items.map((item) => (item.id === id ? updated : item))` で配列再代入                                                                                      |
| 5    | [`LibraryMainArea.svelte`](../../../src/lib/components/arcagate/library/LibraryMainArea.svelte):227-246       | `filteredItems = $derived.by(...)` で fuzzy filter / sort をかけ直し                                                                                               |
| 6    | [`LibraryView.svelte`](../../../src/lib/components/arcagate/library/LibraryView.svelte):187-209, 246-262      | <code>{#each filteredItems as item (item.id)}</code> の中で <code>{#key `${item.icon_path}&#124;${item.card_override_json}`}</code> で LibraryCard を **再 mount** |
| 7    | [`LibraryCard.svelte`](../../../src/lib/components/arcagate/library/LibraryCard.svelte):148-159               | `<ItemIcon iconPath={item.icon_path} ...>`                                                                                                                         |
| 8    | [`ItemIcon.svelte`](../../../src/lib/components/arcagate/common/ItemIcon.svelte):32, 61-71                    | `iconSrc = $derived(iconPath ? convertFileSrc(iconPath) : null)` → `<img src={iconSrc} loading="lazy" decoding="async">`                                           |

### 1.2 `{#key}` 再マウントは本当に必要か

判定: **必須ではないが、 paint stale を確実に潰すための最小コスト回避策**。

理由:

- Svelte 5 では `{#each ... (item.id)}` でキー固定すると、 同じ key の要素は DOM を保持して
  props だけ更新する標準挙動。 props (`item`) の reference は `items.map(...)` で必ず新規。
  Svelte 5 reactivity 的には `item.icon_path` 変化が `<ItemIcon iconPath={...}>` を再評価し、
  `iconSrc = $derived(...)` 経由で `<img src>` 属性 patch が走る — **これだけなら `{#key}` は
  論理的に不要**。
- LibraryView.svelte:188-193 のコメント自身が「実 UI 経路 e2e (LB-2) で
  `card.locator('img').first().getAttribute('src')` が古い path を返す regression を出した」 と
  経験則ベースで `{#key}` を **再導入** している。 つまり **「論理的には不要だが実機で stale を
  観測したので再導入」** という対症療法の自己申告がある。
- Codex も「Svelte の通常 prop 更新に依存せず、 DOM 再生成で確実反映させる回避策」 と同じ
  評価 (CODEX:21-23)。

### 1.3 結論

- データフロー自体は閉じている (store → derived → each → key → card → img)。
- ただし `{#key}` の存在は **「素直な reactivity を信頼しない」 という設計上の異臭** を持つ。
  「動くようになった」 のは事実だが、 「なぜ素直な経路で動かなかったかを潰した」 とは言えない。

---

## 2. なぜ素直なリアクティビティで画像が更新されないのか — 構造的原因

### 2.1 過去に積まれた対症メカニズムの棚卸し

| PR                  | 機構                                                                                                                        | ブロックしていた相手 (主張)                                                                 | 現状             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| #564 (PH-CF-600 C2) | `content-visibility: auto` 2 rAF 経過後にだけ有効化 + `applyOptimisticUpdate`                                               | CV による off-screen 扱いで fresh mount card の paint をスキップ                            | #573 で **撤廃** |
| #570                | `freshIconMark` (items.svelte.ts に bump カウンタ) + 実 UI 経路 LB-2 復活                                                   | CV: auto + lazy img の paint window 不整合                                                  | #573 で **撤廃** |
| #573 (PH-CF-1100 ②) | `content-visibility: auto` 全撤廃 + `freshIconMark` 撤廃 + <code>{#key icon_path&#124;card_override_json}</code> 再マウント | 旧 freshIconMark + onMount/$effect の 2 段 fix が「modal overlay 下で paint window を浪費」 | #573 で **現状** |

PR 本文 (PR #573 body) は ② の root cause を以下と主張:

> LibraryCard の `content-visibility: auto` (L3-A 仮想化) が modal overlay 下で paint window
> を浪費。 PR #564/#570 の freshIconMark + onMount/$effect 2 段 fix は窓のタイミング不整合で
> 実 UI 経路の paint stale を残し続けていた。

これは「CV を抜けば素直に reactive で更新されるはずだった」 という仮説に立っている。 ところが
#573 自身が `{#key}` を再導入していること = **CV を抜いただけでは素直 reactive で paint
stale を完全には消せなかった**ことを示唆している。

### 2.2 残存する paint scheduling 要因

[ItemIcon.svelte](../../../src/lib/components/arcagate/common/ItemIcon.svelte):30, 61-71 を読むと、
`<img>` には以下 2 つの属性が default で付く:

```html
<img
  src={iconSrc}
  loading="lazy"     <!-- default、 LibraryCard が override していない -->
  decoding="async"
  ...
/>
```

[LibraryCard.svelte](../../../src/lib/components/arcagate/library/LibraryCard.svelte):148-159
で `<ItemIcon iconPath={item.icon_path} ... />` を呼ぶ際、 `loading` prop は渡されていないため
`'lazy'` が当たる。

`loading="lazy"` + `decoding="async"` + modal overlay 下での src 差し替え、 という組合せは:

1. lazy: viewport との intersection で fetch trigger 制御 — overlay 下でも element の bounding
   box は viewport 内なので intersection 自体は真。 src 変化 → 新 image fetch trigger。
2. decoding=async: 新 image の decode を critical path から外す。 decode 完了までは **古い
   image を visible に残す** のが多くの WebView 実装の挙動。
3. modal overlay 下: card は paint されているが視覚的に覆われている。 modal close 直後、
   browser は **既に表示済の合成済 frame を re-composite** することがあり、 decode 完了済の
   新 image でも tile cache が古いまま残るケースが報告されている (WebView2 / Chromium
   bug tracker レベルの flake、 dedicated 再現ハーネスがないと安定再現困難)。

これらは **framework 層 (Svelte 5) ではなく browser 描画パイプライン層の不確実性**。
src 文字列は確実に変わっているし、 reactive update 自体は走っている。 ただし browser が
visible に出す image が新フレームに揃うタイミングは **OS / GPU / compositor 依存**で、
JS 側から保証できない。

→ `{#key}` で **DOM 自体を作り直す** = browser に「これは別 element」 と伝える = tile cache の
連続性を断ち切る、 のが最も確実な workaround。

### 2.3 仮説の確度

- **Codex の指摘 (CV: auto + lazy の組合せが主因)** は #564/#570 までは正しい。
- **#573 で CV: auto は撤廃されている** のに `{#key}` を残している = **lazy + decoding=async +
  paint scheduling**だけでも paint stale が起き得ることを #573 自身が経験則で示唆している
  (LB-2 で `img.first().getAttribute('src')` が古い path を返したというコメント)。
- ただし「**実機で paint stale が起きた**」 のか「**e2e ハーネスの読み取りタイミングが早すぎた**」
  のかは現時点で区別できていない (LB-2 が skip 状態のため再現観測不能)。
- 確度: 高 (構造) / 中 (定量的観測なし)。

### 2.4 結論

- 素直な reactivity が「効かない」 のではない。 store → props 更新までは確実に伝播する。
- 「効かない (ように見える)」 のは **`<img>` の paint scheduling**。 `loading="lazy"` +
  `decoding="async"` + modal overlay 下の src 差し替えタイミングという browser 層の不確実性が
  残っている。
- 過去の content-visibility / freshIconMark / 楽観的更新は **同じ層の不確実性** を別角度から
  叩こうとしていたが、 paint scheduling は JS 層からは間接制御しかできないので、 試行が
  「効いた / 効かない」 が flaky になり積み重なった。

---

## 3. ② の e2e (LB-2) が WebView2 を巻き込んで落ちる根本理由

### 3.1 製品コード側 — クラッシュ兆候を起こす要因

検証範囲:

- [`cmd_save_icon_file`](../../../src-tauri/src/commands/item_commands.rs):277-289 —
  `spawn_blocking` で同期 I/O を逃がし、 join error は `Result` 返却。 `unwrap` panic 経路無し。
- [`save_icon_file`](../../../src-tauri/src/services/item_service.rs):891-919 — source 存在
  チェック → 拡張子検証 → `std::fs::create_dir_all` → `std::fs::copy` → forward slash 正規化。
  すべて失敗パスは `AppError::Io` / `AppError::InvalidInput` で `Err` を返す。 panic 経路無し。
- `cmd_update_item` ([item_commands.rs](../../../src-tauri/src/commands/item_commands.rs):37-44)
  は `State<AppServices>` を読み取って `item.update_item` を呼ぶだけ。 副作用は SQLite 更新のみ。

**結論**: 製品コード経路 (`plugin:dialog|open` → `cmd_save_icon_file` → `cmd_update_item`)
**単独で WebView2 を crash させる根拠は静的に確認できない**。 Claude / Codex 一致。

ただし `100% 製品バグでない` を断定するには、 CI runner 上の crash dump / WebView2
event log / Tauri process exit code 取得が必要 (現在 LB-2 skip のため取得経路なし)。 ここは
低信頼。

### 3.2 テストハーネス側 — 落ちる構造の積み上げ

[`tests/fixtures/tauri.ts`](../../../tests/fixtures/tauri.ts):11-24 と
[`playwright.config.ts`](../../../playwright.config.ts):20 が **workers: 1 で単一 WebView2
プロセスを worker-scoped で共有**する設計。 1 spec の WebView2 crash がそのまま worker 内
全 spec を巻き込む。

LB-2 が積んでいる脆弱要素:

| 要素                                                                         | 場所                                                                       | 性質                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mockTauriOpenDialog` で `window.__TAURI_INTERNALS__.invoke` を monkey patch | [dialog-mock.ts](../../../tests/helpers/dialog-mock.ts):26-46              | Tauri v2 internal API を直接書換。 internal API は SemVer 保証なし。 失敗 / unmock 漏れで以降の全 IPC が破壊される。                                                                |
| `enableForceDetailWrapper` の `<style>` 動的 inject + afterEach cleanup      | [window-resize.ts](../../../tests/helpers/window-resize.ts):22-50          | sharedBrowser worker scope に CSS が残ると後続 spec で wrapper が他要素を遮る (履歴 v1 / v2 で連鎖 fail を実体験済)。                                                               |
| 同 worker 内 spec の連鎖実行                                                 | [tauri.ts](../../../tests/fixtures/tauri.ts):11-24                         | sharedBrowser を `worker` scope で再利用。 1 spec で WebView2 が落ちると以降 reconnect 不能。                                                                                       |
| `cmd_save_icon_file` の disk I/O + asset:// scope load                       | [item_service.rs](../../../src-tauri/src/services/item_service.rs):891-919 | 単独では crash しないが、 直後の `convertFileSrc` + img load + decoding=async + 同 worker 内 CSS injection 残骸 と組み合わさると、 Tauri-WebView2 IPC bridge の race を踏みやすい。 |

LB-2 spec 自身のコメントも「mockTauriOpenDialog → cmd_save_icon_file 経路で WebView2 process
が落ち、 同 worker の workspace-dnd / dialog-pin spec まで連鎖 fail させる flake が解消できなかった」
と明記 ([ph-cf-600-library-bug-fixes.spec.ts](../../../tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):96-103)。

### 3.3 断定

- **製品バグの兆候: 確認できない** (静的解析範囲)。
- **テストハーネス起因の不安定性: 高確度で主因**。
  - workers: 1 + 単一 WebView2 共有
  - Tauri internal API monkey patch
  - sharedBrowser worker scope に副作用が残る CSS injection
  - これらが LB-2 1 spec で同時に動くため race の温床

これは Claude / Codex で一致。

### 3.4 補足: 真の製品バグだった場合のシグナル

仮に製品バグが含まれているとしたら、 以下が出るはず。 現状は出ていない (静的範囲):

- `cmd_save_icon_file` 内の panic / unwrap (なし — `?` で `Result` 返却)
- async runtime での send/sync 違反 (なし — `spawn_blocking` で sync 実行)
- file copy 中の hold-out で SQLite WAL が壊れる (なし — `save_icon_file` は DB を触らない)
- asset:// scope 外 path を `icon_path` に保存 (なし — forward slash 正規化済)

クラッシュダンプ (`%LOCALAPPDATA%\CrashDumps\WebView2*.dmp`) を CI で artifact 化して
1 度でも取得できれば断定できる — これは ④ の e2e 復活策と一緒に検討すべき。

---

## 4. 見た目設定の状態管理は筋が通っているか

### 4.1 schema 棚卸し

[`card-override.ts`](../../../src/lib/utils/card-override.ts):20-29 の `CardOverrideJson`:

```ts
interface CardOverrideJson {
  background?: Partial<LibraryCardBackgroundConfig>; // 視覚設定
  style?: Partial<LibraryCardStyleConfig>;           // 視覚設定
  opener_id?: string | null;                          // cascade 起動先 (機能設定)
  disabled?: boolean;                                  // ライフサイクル制御 ← #573 追加
  icon_backup?: string | null;                         // 退避領域      ← #573 追加
}
```

- `background` / `style` / `opener_id` は **「per-card の設定値」** = 純粋な設定 schema。
- `disabled` / `icon_backup` は **「OFF した時の過去状態を保存しておく退避領域」** = ライフ
  サイクル制御 / 一時記憶。

異なる責務が同 JSON に同居している。 これは Codex 指摘 (CODEX:62-63) と一致。

### 4.2 ⑤⑥ 遷移は素直か

[`LibraryDetailPanel.svelte`](../../../src/lib/components/arcagate/library/LibraryDetailPanel.svelte):235-275 の `handleCardOverrideToggle`:

| 遷移           | 操作                                                                                   | 副作用                          |
| -------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| A→B (初回 ON)  | `card_override_json` を `CARD_OVERRIDE_INITIAL_BACKGROUND` + global style で新規作成   | `icon_path` は維持              |
| B→C (解除 / ⑤) | `disabled: true` を立て、 `icon_path` を `icon_backup` に退避 → null へ倒す            | `card_override_json` 本体は維持 |
| C→B (復元 / ⑥) | `delete restored.disabled` + `delete restored.icon_backup` + `icon_path = icon_backup` | 設定値は全復元                  |

これは **1 回の `updateItem` IPC で `card_override_json` と `icon_path` を一括書換**することで
中間状態露出を排除しており、 遷移自体は整合している。

[`LibraryCard.svelte`](../../../src/lib/components/arcagate/library/LibraryCard.svelte):59-60 で
`isCardOverrideActive(parsedOverride)` を介して `disabled=true` の override は非適用扱いに
落としている。

### 4.3 ワークアラウンドの匂い

「`item.icon_path` を `card_override_json.icon_backup` に退避」 という設計が、 そもそも
**`item.icon_path` と `card_override_json` の責務分離が曖昧** であることを露呈している:

- `item.icon_path` は **「item 自身のアイコン」** (Library 一覧 / palette / workspace widget /
  他 widget の表示で参照される共通 path)。
- `card_override_json.background` は **「Library 一覧カードでの背景全面表示」** に限定された
  override。

PH-CF-1100 ⑤ 解除時に `item.icon_path` を null へ倒すと、 **Library 以外の表示経路 (palette /
workspace) でもアイコンが消える**。 仕様としてはこれが正しい (user が「画像を撤回」 と意図する
なら全画面でアイコンが消えるべき) のだが、 backup 領域を Library 専用の `card_override_json`
の中に持つのは **責務逆転**: Library 専用 JSON が item 全体の状態を抱えている。

### 4.4 改善方向 (target architecture 第 4 軸)

- **schema 純化**: `CardOverrideJson` は表示設定だけにする。
- **ライフサイクル制御は別フィールド** (例 `item.icon_path_backup` を新カラム化、 または
  `item.is_card_override_enabled` boolean カラムを追加して `card_override_json IS NOT NULL`
  との semantics を切り分ける)。
- migration 039 相当で旧 `disabled` / `icon_backup` フィールドを新フィールドに移動。

これは ②⑤⑥ 即修正の scope を超える設計判断のため、 本 audit doc では **方向性提示** に留める。

### 4.5 結論

- 遷移整合は取れている (⑤⑥ の機能は壊れていない)。
- schema 設計としては JSON に責務 2 種を同居させており、 将来拡張で破綻リスクあり。 ただし
  これは ② の即時反映問題とは独立で、 直すなら別 PR (migration を伴う) で。

---

## 5. PH-CF-600 / PR #570 / PR #573 の時系列

| commit / PR         | 日付       | 主張した root cause                                                                  | 入れた対症メカニズム                                                                                                                                                                 | なぜ定着しなかったか                                                                                                                                  |
| ------------------- | ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| #564 (PH-CF-600 C2) | 2026-05-23 | `content-visibility: auto` が fresh mount card の paint をスキップ                   | (a) 2 rAF 経過後に CV: auto 有効化 (b) `applyOptimisticUpdate` で IPC 待ちを排除                                                                                                     | 楽観的更新は store 更新の即時化に貢献するが、 paint scheduling 不確実性は解消せず。 modal overlay 下では rAF 窓と modal close タイミングが competing  |
| #570                | 2026-05-24 | C2 fix path (applyOptimisticUpdate + freshIconMark) を実 UI 経路駆動でテスト         | (a) `window.__arcagateTest__.itemStore` test hook を介した LB-2 復活 (b) `audit-no-test-hook-leak.sh` 追加                                                                           | 合成 store hook 経由なので「test pass、 実機で reflect しない」 を許す構造盲点。 `selectImage()` の OS picker → cmd_save_icon_file 経路を踏んでいない |
| #573 (PH-CF-1100 ②) | 2026-05-24 | freshIconMark + onMount / $effect 2 段 fix が modal overlay 下で paint window を浪費 | (a) `content-visibility: auto` 全撤廃 (b) `freshIconMark` 削除 (c) `__arcagateTest__` test hook 廃止 (d) `mockTauriOpenDialog` + 実 UI click sequence LB-2 (e) `{#key item.icon_path | card_override_json}` 再マウント                                                                                                                       |

定着しない構造的理由: **各 PR が違うレイヤーで対症療法を入れている**。

- #564 = CSS (CV) レイヤー
- #570 = store hook レイヤー (テスト経路の問題)
- #573 = DOM 再マウントレイヤー (Svelte 再構築強制)

真の真因 (browser paint scheduling) は **どのレイヤーからも直接制御できない領域** にあり、
JS 層・CSS 層・テスト層から間接攻略を続けている限り flaky な「効いた / 効かない」 が続く。

---

## 真の root cause

Library カード `<img>` の **paint scheduling 不確実性** (lazy + decoding=async + modal overlay
下 src 差し替え) が、 **DOM 再生成なしに src 文字列のみ更新する経路では reliable に新フレームへ
切替らない**。

これは:

- Svelte 5 reactivity の問題ではない (props → derived → src 属性の patch は確実に走っている)。
- backend / store 層の問題でもない (`items = items.map(...)` で reference を更新済、 `selectedItem`
  は最新値を返す)。
- **browser の composite layer / tile cache / decode pipeline の挙動** に起因する。 JS layer から
  確実に外せる手段は **`<img>` element 自体を作り直す** = `{#key}` 相当の DOM 再生成のみ。

#573 の `{#key}` 再マウントはこれを **LibraryCard 全体**でやっているため動くが、 LibraryCard
全体 (metadata $derived, styling, isStarred badge, label gradient 等) を毎回 unmount + mount する
コストを払っている。 paint stale を起こすのは `<img>` だけなのに、 そこに最適化された解決
ではない。

---

## 対症療法を剥がした target アーキテクチャ

以下は **方向性提示**であり、 具体的 PR 設計は別 plan で行う。

### A. `<img>` element だけを `{#key}` で囲む (最小侵襲)

[`ItemIcon.svelte`](../../../src/lib/components/arcagate/common/ItemIcon.svelte) の内部で、
`{#key iconSrc}<img ... />{/key}` のように `<img>` 直前で keyed block を作る。

```svelte
<!-- 案 (実装はしていない、 方向性のみ) -->
{#if iconSrc && !iconError}
  {#key iconSrc}
    <img src={iconSrc} {alt} class={className} {style} {loading} decoding="async"
         onerror={() => { iconError = true; }} />
  {/key}
{/if}
```

- LibraryView の `{#key item.icon_path|card_override_json}` は **撤去**。
- LibraryCard 全体は keep-alive のまま `<img>` だけ src 変化で再生成。
- メタデータ / スタイル / starred 等の周辺 reactive は走り続け、 不要な再マウントコスト 0。
- 同じ仕組みが ItemFormCardOverride 内の preview img にも自動適用される (`<ItemIcon>` 経由のため)。

trade-off:

- `<img>` の DOM 作り直しコスト 1 件 ≪ LibraryCard 全体再マウントコスト 1 件、 perf プラス。
- ItemIcon が再利用される全箇所で同 paint stale 回避が効くため、 「Library 以外で同じ症状が
  起きていないか lateral sweep」 で副次効果を確認できる。

### B. `loading="lazy"` を撤去 + 自前 lazy 化 (構造解)

`<img loading="lazy">` の browser native lazy 制御を捨て、 IntersectionObserver で自前に
fetch trigger する。 src 属性は IntersectionObserver で `<img>` に `src` を attach するときに
セットし、 trigger 解除時に detach する。

- 100+ icon の cold start 並列 fetch 抑制 (lazy の本来の効能) は維持できる。
- decoding=async も残せる (decode 自体は問題ではない、 decode 完了タイミングと paint
  scheduling の交錯が問題)。
- src 変化時の paint stale は、 `<img>` element ライフサイクルを完全に自分で管理することで
  予測可能化する。

trade-off:

- 実装コスト中。 IntersectionObserver のテストハーネス整備が要る。
- A 案より侵襲度高、 ただし「素直な reactive で動く」 形に戻る。

### C. schema 純化 (中期、 ②⑤⑥ とは独立)

[§4.4](#44-改善方向-target-architecture-第-4-軸) の通り、 `card_override_json` から `disabled` /
`icon_backup` を分離して migration で別カラム化。

- ② の即時反映と直接は関係しないが、 ⑤⑥ で混入した「ライフサイクル制御 JSON 化」 を解消。
- 将来 schema 拡張 (例 background image の 2 段 layer, animated icon 等) で「設定 JSON
  vs UI 状態」 の責務混在による事故を予防。

### D. 推奨優先順位

1. **A 案 (`<img>` 単位 `{#key}`)** を先行 PR で投入。 LibraryView の re-mount を最小化。
2. e2e LB-2 を [§e2e 再構築](#-を実-ui-で機械検証する-e2e-の実現案) の単独 job 化で復活。
3. 安定したら **B 案 (lazy 撤廃 + 自前 IntersectionObserver)** を検討。 `{#key}` も完全に
   消せる可能性。
4. C 案 (schema 純化) は migration を含むので、 ⑤⑥ の追加要求が出たタイミングで bundle。

---

## ② を実 UI で機械検証する e2e の実現案

### E1. 単独 worker / 単独 job 化

LB-2 を `tests/e2e/library-icon-refresh/` 等の専用ディレクトリへ隔離し、 別 Playwright
config (`playwright.icon-refresh.config.ts`) で **workers: 1 + globalSetup を専用化**する。

- CI workflow を 2 job (`e2e-main` + `e2e-icon-refresh`) に分割。 後者が WebView2 crash しても
  前者は無傷。
- 専用 globalSetup で WebView2 user data dir を spec 独自にして共有 state を 0 にする。

### E2. mockTauriOpenDialog の脆弱性を消す

現状 [`dialog-mock.ts`](../../../tests/helpers/dialog-mock.ts):26-46 は
`window.__TAURI_INTERNALS__.invoke` を直接上書きする。 これを以下に置換:

- Tauri v2 official `mockIPC` helper (`@tauri-apps/api/mocks`) を使う。 internal API ではなく
  公式 API なので SemVer 保証あり。
- `mockIPC` が cmd dispatch を mock するため、 `plugin:dialog|open` だけでなく
  `cmd_save_icon_file` も同時に mock して **製品コードの I/O を完全に停止**できる。
  paint scheduling だけを純粋に試験する。
- mock 範囲を `t.use()` / `t.afterEach()` で確実に scope 化。

### E3. CSS injection cleanup の自動化

`enableForceDetailWrapper` / `disableForceDetailWrapper` の pair API は良い形だが、
**spec 失敗時に afterEach が呼ばれない可能性** (Playwright fixture teardown 順) が残る。

- `test.use({ libraryDetailWrapperForced: true })` の fixture 経由に変更し、 fixture が
  setup / teardown 両方を保証。
- afterEach に依存しない pattern にする。

### E4. WebView2 crash dump の artifact 化

`%LOCALAPPDATA%\CrashDumps\WebView2*.dmp` を CI が自動回収する設定を CI workflow に追加。
1 度でも crash dump が取れれば、 製品バグかハーネス起因かを断定可能。

### E5. honest な代替 (E1〜E4 が高コストすぎる場合)

② の構造保証を以下 3 段で諦観的に担保し、 LB-2 e2e は **削除** する:

1. **構造 audit** (`scripts/audit-appearance-state-mgmt.sh`) で `{#key item.icon_path|card_override_json}`
   の存在を fail-closed gate。 (現状 ⇄ #573 で実装済)
2. **手動 CDP 検証**を release process の checklist に追加 ([`operations.md`](../../l1_requirements/operations.md)
   の Release process)。 user 検収の固定項目に組み込む。
3. **paint stale が起きるシナリオ ベンチ** を Rust 側 e2e (Tauri 起動なし、 直接 SQLite +
   WebView2 を起動するスタンドアロン bench) で代替する。 これは LB-2 と semantics が違うが、
   `cmd_save_icon_file` 経路の確実性は機械検証できる。

E5 は CLAUDE.md `<critical-rule id="dom-not-fixed">` の「画面で目視確認」 を release process
として制度化することと等価。 機械検出が完全に取れないなら、 「機械検出が無いことを明示
した上で」 release ゲートで補う方が嘘がない。

### 推奨

- 短期: **E1 + E2 + E3** を組合せて LB-2-real を復活させる (専用 job + 公式 mock + fixture
  化された CSS injection)。
- 中期: **E4** で crash dump 回収を CI で恒久化。
- E5 はあくまで「E1-E4 投資が割に合わないと判定した場合の honest fallback」。

---

## 仕様 / 実装 / テストの乖離

Codex の補足指摘 (CODEX:101-104) と Claude の独立確認:

- 仕様 ([`docs/l2_foundation/features/screens/library.md`](../../l2_foundation/features/screens/library.md):224)
  は **「LB-2-real (② 真因経路) を機械検出経路として明記」**。
- 実装 ([`tests/e2e/ph-cf-600-library-bug-fixes.spec.ts`](../../../tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):105)
  は **`test.skip(...)`** (audit-no-test-hook-leak の例外マーカー `audit-no-test-hook-leak:ok`
  で gate を通している)。

この乖離は audit doc にも残してはいけない。 本 audit doc とは別 PR で:

1. spec から LB-2-real の機械検出記述を一時的に削除 (e2e を復活させるまでは「手動検証」
   と書く)。
2. または LB-2-real を本当に復活させる (§e2e 再構築の E1-E4)。

どちらかを選ばないと「仕様と実装の食い違い」 がそのまま残り、 future agent / user が誤判定
する材料になる。

---

## 付録: 横展開 (lateral sweep) チェック

CLAUDE.md `<critical-rule id="lateral-sweep">` に従い、 ItemIcon が src 変化で paint stale を
起こす可能性のある他経路を列挙する。 **本 audit doc では検証のみで修正はしない**。

| 経路                                    | 影響                                                      | 現状                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library 一覧カード                      | ②                                                         | `{#key}` で対症済                                                                                                                                                                                                                                                                     |
| LibraryDetailPanel の preview           | ItemFormCardOverride の `<ItemIcon>` で同 element pattern | `{#key}` なし。 ItemFormCardOverride の `<ItemIcon>` ([ItemFormCardOverride.svelte:137-141](../../../src/lib/components/item/ItemFormCardOverride.svelte)) は modal 内なので paint stale の主舞台。 ただし modal 内 preview は同 modal が close されないので overlay 競合は起きない。 |
| LibraryItemPicker (workspace 内 picker) | item の icon_path 表示                                    | 影響可能性 中 — 未確認                                                                                                                                                                                                                                                                |
| Workspace の item widget                | item の icon_path 表示                                    | 影響可能性 中 — 未確認                                                                                                                                                                                                                                                                |
| Palette / Recent / Favorites widget     | item の icon_path 表示                                    | 影響可能性 中 — 未確認                                                                                                                                                                                                                                                                |

target architecture A 案 (`<img>` 直前 `{#key}` を ItemIcon 内部化) を採れば、 これら全経路が
**同じ機構で paint stale 耐性を得る**。 これは A 案を推す追加根拠。

---

## まとめ

| 問い                                       | 答え                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 現状 ② は正しいか                          | 動く構成だが `{#key}` は対症療法。 root cause を迂回しただけ                                                                                            |
| なぜ素直な reactivity で更新されなかったか | Svelte / store 層ではない。 `<img loading="lazy" decoding="async">` の paint scheduling 不確実性 (modal overlay 下 src 差し替え)                        |
| WebView2 crash は製品バグか                | 静的範囲で根拠なし。 主因はテストハーネス (workers:1 + 単一 WebView2 共有 + Tauri internal IPC monkey patch + spec-local CSS injection 残骸)            |
| 状態管理は筋が通っているか                 | ⑤⑥ 遷移整合 OK。 ただし `card_override_json` に UI 状態混在は schema として歪                                                                           |
| 時系列                                     | #564 (CSS 層) / #570 (test hook 層) / #573 (DOM 再マウント層) と毎回違うレイヤーで対症。 真因 (browser paint scheduling) はどの層からも直接制御できない |

target アーキテクチャ要約:

- A: ItemIcon 内部で `<img>` を `{#key iconSrc}` で囲み、 LibraryView 全体の re-mount を撤去
- B: 中期で `loading="lazy"` を自前 IntersectionObserver lazy に置換
- C: 別 PR で `card_override_json` から UI 状態を分離 (migration を伴う)

e2e 再構築要約:

- E1 (単独 job 隔離) + E2 (公式 `mockIPC` 化) + E3 (fixture-based CSS hack) を組合せて LB-2-real
  復活
- E4 (CI で WebView2 crash dump artifact 化) で長期診断手段確保
- E5 (構造 audit + manual CDP 検証 + Rust スタンドアロン bench) は honest fallback
