# Library アイコン即時反映 ② — target architecture 再評価 (B 撤回 / A 精密化)

対象: 先行 audit doc
[`LIBRARY_ICON_REFRESH_ROOT_CAUSE_2026-05-25.md`](LIBRARY_ICON_REFRESH_ROOT_CAUSE_2026-05-25.md)
で target architecture A / B / C を提示したが、 user から **B 案 (`loading="lazy"` 自前
IntersectionObserver 置換) に妥当な疑問**が出たため、 B の必要性と A 案の精密化を独立に
再検証する。

- 解析時点 main HEAD = `93187f69` (前 audit PR #574 マージ済)。
- 解析方法: 静的コードトレース + Codex 二次調査。
- Codex 出力:
  [`CODEX_LIBRARY_ICON_REFRESH_FOLLOWUP_2026-05-25.md`](CODEX_LIBRARY_ICON_REFRESH_FOLLOWUP_2026-05-25.md)
- **本ドキュメントは分析のみで、 コードは一切変更していない。**

---

## TL;DR

1. **B 案は不要**。 native `loading="lazy"` を自前 IO 実装に置換する積極理由が無い。 perf
   観点で同等以上は出ない見込み、 保守負債は確実に増える。 Claude / Codex 一致。
2. **A 案を「正しく」やる**: ItemIcon 内部で `<img>` を `{#key iconSrc}` で囲み、
   LibraryView の card 全体再マウントを撤去。 iconSrc 変化で `<img>` 要素だけ再生成 →
   新 `<img>` が最初から新 src を持って素直に load・paint → modal 下の paint
   scheduling 不確実性を構造的に回避。 user の理解は実コード上で **成立する**。 Claude /
   Codex 一致。
3. **`img.decode()` 待ち方式より素直**。 decode は問題の core ではない (paint scheduling
   / tile cache が core)。 element 再生成は tile cache 連続性を断ち切る最も直接的な手段。
4. **`loading="lazy"` を残したまま `{#key iconSrc}` で再生成しても fetch trigger は問題ない**
   と構造的には判断。 新 `<img>` element は IntersectionObserver の attach 時に viewport
   判定が再走り、 viewport 内 (Library card は表示中) なら即 fetch trigger。 ただし
   **実機保証は静的では取れない** ため Codex / Claude 双方が低信頼マーク。
5. **A を正しくやれば、 LibraryView 全体の `{#key}` と関連 gate / コメントは剥がせる**
   (具体リストは §3)。 ただし `applyOptimisticUpdate` 系は ② とは別目的なので
   keep (slider drag の live preview / 画像選択時の UX 体感改善)。
6. **結論**: 「B 不要、 A を `<img>` 限定 `{#key iconSrc}` で正しく実装 + 広い対症コード
   全撤去」 で ② は **構造的に根治可能**。 ただし「modal 下で `{#key iconSrc}` が実機で
   reliable に paint stale を消すか」 は実機検証必須 — 実装 PR では LB-2 相当を
   E1-E4 ([前 audit §e2e 再構築](LIBRARY_ICON_REFRESH_ROOT_CAUSE_2026-05-25.md#-を実-ui-で機械検証する-e2e-の実現案))
   で復活させて確認する。

---

## 1. B 案 (自前 IntersectionObserver lazy) は本当に必要か

### 1.1 user 懸念の整理

(a) Library 画面の perf を犠牲にしないか (多数カードの cold start fetch)。
(b) native 機能の自前再実装 = 過剰実装で保守負債にならないか。

### 1.2 perf 観点

[`ItemIcon.svelte`](../../../src/lib/components/arcagate/common/ItemIcon.svelte):13-21,
56-59 は `loading="lazy"` の必要性を明示している:

> Library 一覧で全 card の icon が一斉に asset:// fetch される問題の対策。
> asset protocol は request を直列処理するため、 117 item で 117 件の icon request が
> serialize し初期表示が固まる (117 item 計測で確認)。 lazy で viewport 近傍のみ fetch する。

これは **計測ベース** (117 item 実機確認) で確定している必要要件。 自前 IO 実装で **同等以上**
の perf を出すには:

- IntersectionObserver の root margin / threshold チューニング
- observe / unobserve / 再入 / element 破棄時の cleanup
- 初期 mount 時の bounding box 確定タイミングと IO callback の同期
- SSR safety (本 app は Tauri で SSR 無いが、 SvelteKit 由来の hydration safety)

native lazy はこれらすべてを browser 内部で最適化済。 同等以上を出すのはほぼ不可能 (perf
中立がベスト、 多くの場合 native の方が速い)。

### 1.3 保守負債観点

repo に `IntersectionObserver` の実コード出現は無い (grep 確認、 Codex も同確認)。 導入
すると以下が新規責務として加わる:

- observer の lifecycle 管理 (mount / unmount / re-attach)
- 重複 observe の防止
- 要素破棄時の unobserve (memory leak 防止)
- ItemIcon 単体テスト用の mock 整備
- a11y / motion-reduce / prefers-reduced-data 等の native lazy が暗黙担保するシナリオを
  自前で再実装

これは **過剰実装** の典型。 ② の paint stale 解消とは独立した問題に対する解で、 ②と
混同して投入する根拠が無い。

### 1.4 user 懸念への回答

| 懸念                    | 回答                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| (a) perf 犠牲           | はい、 native と同等を出すのが難しく、 多くの場合悪化する。 計測根拠もある (117 item 直列 fetch) |
| (b) 過剰実装 / 保守負債 | はい、 自前 IO 実装は新規責務群を追加する。 ② root cause を A で潰せるなら不要                   |

### 1.5 判定

**B 案は前 audit doc から撤回する**。 中期検討としても入れない (A 案で潰れるなら永続的に
不要)。 Codex も同判定 (CODEX_FOLLOWUP:13-17, 26-30)。

---

## 2. A 案を「`<img>` 限定 `{#key iconSrc}`」 で正しくやれば B は不要か

### 2.1 user 仮説の言い換え

> `{#key}` を LibraryView 全体や LibraryCard 全体ではなく、 ItemIcon コンポーネント内の
> `<img>` 要素だけに `{#key iconSrc}` の形で当てる。 これは「icon が変わった時だけ `<img>`
> 要素を作り直す」 = 新しい `<img>` が最初から新 src を持って普通にロード・ペイントされる、
> ので modal 下のペイント不確実性を構造的に回避できる。

### 2.2 実コードでの成立性

[`ItemIcon.svelte`](../../../src/lib/components/arcagate/common/ItemIcon.svelte):24-32 で
`iconPath` props を受け、 `iconSrc = $derived(iconPath ? convertFileSrc(iconPath) : null)`
で derive。 `<img src={iconSrc}>` は line 61-71 で render される。

A 案を擬似コードで書くと:

```svelte
<!-- 案 (実装はしない、 方向性のみ) -->
{#if iconSrc && !iconError}
  {#key iconSrc}
    <img
      src={iconSrc}
      {alt}
      class={className}
      {style}
      {loading}
      decoding="async"
      onerror={() => { iconError = true; }}
    />
  {/key}
{/if}
```

**挙動**:

1. `iconPath` props 変化 → `iconSrc = $derived(...)` 再評価 → `iconSrc` 文字列が変わる
2. `{#key iconSrc}` block は iconSrc が変わると **前 block を unmount + 新 block を mount**
3. 新 block で render される `<img>` は **DOM tree に新規 attach される別 element**
4. 新 `<img>` は `src={iconSrc}` で **最初から新 iconSrc を HTML 属性として持つ**状態で生成
5. browser は新 element を「fresh paint 対象」 として treat (前 element の tile cache とは
   独立の compositor layer)

これは Svelte 5 の `{#key}` 仕様 + browser 標準 image lifecycle に基づく **構造的に成立する
挙動**。 Codex も同判定 (CODEX_FOLLOWUP:34-39)。

### 2.3 vs. `img.decode()` 待ち方式

`img.decode()` 待ち方式の擬似コード:

```ts
// 案 (実装しない、 比較のため)
let displayedSrc = $state<string | null>(null);
$effect(() => {
  const src = iconSrc;
  if (!src) { displayedSrc = null; return; }
  const probe = new Image();
  probe.src = src;
  probe.decode()
    .then(() => { displayedSrc = src; })
    .catch(() => { displayedSrc = src; });
});
```

`img.decode()` は image data の decode 完了を Promise で通知する API。 これで「decode 完了
までは古い src を表示し続け、 完了したら新 src に切替」 を制御できる。

| 軸                        | `{#key iconSrc}` (A 案)                             | `img.decode()` 待ち                                                   |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| paint stale 解消          | element 再生成 = tile cache 連続性を断ち切る (確実) | decode 完了は保証するが、 element は同じ。 tile cache は browser 任せ |
| 実装複雑性                | Svelte 機能のみ (1 行)                              | `$effect` + `new Image()` + Promise chain + error handling (10+ 行)   |
| 浪費                      | 0 (Svelte が DOM 差分処理)                          | probe Image (1 個追加 fetch、 browser cache hit すれば cheap だが)    |
| paint scheduling 不確実性 | 構造的に排除 (element 入替で composite layer reset) | 残る (decode 後の new frame composite タイミングは GPU 任せ)          |
| 素直さ                    | 高 (declarative)                                    | 低 (imperative async flow)                                            |

`{#key iconSrc}` の方が **素直で確実**。 Codex も同判定 (CODEX_FOLLOWUP:41-45)。

### 2.4 `loading="lazy"` を残したまま `{#key iconSrc}` で再生成するリスク

懸念: 新 `<img>` element の IntersectionObserver attach タイミングが viewport 判定より僅かに
遅れて、 fetch trigger を逃すリスクが無いか。

**構造的回答**:

- `loading="lazy"` の native 挙動: element が DOM attach されたとき、 IntersectionObserver が
  「すでに viewport 内」 なら即 fetch trigger (W3C HTML Loading Attribute 仕様)。 Library
  card は表示中 (= 既に viewport 内) なので、 新 `<img>` mount → 即 fetch trigger 期待。
- 例外: element の bounding box が computed していないタイミングで IO が走ると 0 サイズ扱いで
  viewport 外と誤判定するリスク。 ただし ItemIcon は **parent (LibraryCard) 経由で sizing
  class を受け取る**形 (`class={className}`、 例 `h-full w-full object-cover`)、 sizing は
  parent が既に layout 確定済のタイミングで新 `<img>` を mount するため問題は起きにくい。

**確度**: 構造的には問題なし、 ただし **WebView2 / Chromium の特定 version での
IntersectionObserver flake は実機検証が必要**。 Claude / Codex 一致で **低信頼マーク**。

### 2.5 ItemIcon 内の `iconError` $state は A 案でも整合するか

[`ItemIcon.svelte`](../../../src/lib/components/arcagate/common/ItemIcon.svelte):33,
36-39 で `iconError = $state(false)` + `$effect` で iconPath 変化時にリセット。

A 案では `{#key iconSrc}` で `<img>` 再生成 → 新 `<img>` の `onerror` は fresh state で
走る。 ItemIcon component 自体は keep mount なので `iconError` は ItemIcon scope に残る
が、 `$effect` で iconPath 変化時に `false` リセットされる仕組みは **既に存在**しており、
A 案でも整合する。

つまり A 案実装時に `iconError` リセット機構は **削除せず維持**。

### 2.6 card_override_json (offsetX / offsetY / rotation) 変化への対応

LibraryCard.svelte:82-87 の `bgImageStyle`:

```ts
let bgImageStyle = $derived.by(() => {
  const transform = cardRotationTransform(bg.rotation);
  return `object-position: ${bg.offsetX}% ${bg.offsetY}%;${
    transform ? ` transform: ${transform};` : ''
  }`;
});
```

これは `<ItemIcon style={bgImageStyle}>` (line 154) で `<img>` の `style` 属性に渡る。
**style 属性の patch は paint stale を起こさない** (CSS transform / object-position は
compositor layer 内で reflow なしに反映される標準挙動)。

つまり A 案 (`{#key iconSrc}`) で `card_override_json` 変化 (背景設定の調整) も問題なく
カバーされる。 user の slider drag や rotation 切替も live preview で素直に動く
(`applyOptimisticUpdate` 経由で store 更新 → `bgImageStyle` 再 derive → `<img>` style
patch で反映)。

### 2.7 ⑤⑥ ケース (disabled → restore) への対応

- **B → C (解除)**: `disabled: true` + `icon_path: null`。 ItemIcon の iconPath が null に
  → `iconSrc = null` → `{#if iconSrc && !iconError}` が false → fallback アイコン経路へ
  ([ItemIcon.svelte:72-74](../../../src/lib/components/arcagate/common/ItemIcon.svelte))。
  `{#key iconSrc}` は内部の `<img>` だけを囲むので、 fallback 経路は通常 reactive で
  切り替わる。 OK。
- **C → B (復元)**: `delete disabled` + `icon_path = icon_backup`。 iconPath が path に
  戻る → `iconSrc` 再 derive → `{#key iconSrc}` で `<img>` 新規 mount → fallback から
  image に切替。 OK。

つまり A 案で ⑤⑥ も正しく動く。

### 2.8 判定

user の理解は **実コード上で成立する**。 `img.decode()` 待ちより素直で確実。 `loading="lazy"`
を残したままで構造的に問題ない。 ⑤⑥ schema との整合も取れる。

**残る不確実性**: 実機検証なし。 §5 で列挙。

---

## 3. A を「正しく」 やる場合に剥がせる対症ハック / 剥がせないもの

### 3.1 剥がせる (A 案で不要になる)

| 位置                                                                                                | 内容                                                             | 撤去理由                                                               |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [LibraryView.svelte:194](../../../src/lib/components/arcagate/library/LibraryView.svelte)           | `{#key \`${item.icon_path}                                       | ${item.card_override_json}\`}` (list mode)                             |
| [LibraryView.svelte:248](../../../src/lib/components/arcagate/library/LibraryView.svelte)           | 同 (grid mode)                                                   | 同上                                                                   |
| [LibraryView.svelte:188-193, 247](../../../src/lib/components/arcagate/library/LibraryView.svelte)  | `{#key}` 経緯コメント                                            | 不要になる                                                             |
| [scripts/audit-appearance-state-mgmt.sh:93-104](../../../scripts/audit-appearance-state-mgmt.sh)    | (F) LibraryView `{#key}` 必須化 gate                             | ItemIcon 内 `{#key iconSrc}` を必須化する新 gate に置換                |
| [items.svelte.ts:15-18](../../../src/lib/state/items.svelte.ts)                                     | `freshIconMark` 撤廃 + LibraryView `{#key}` への切替経緯コメント | A 案の経緯コメントに更新                                               |
| [items.svelte.ts:91-92](../../../src/lib/state/items.svelte.ts)                                     | `applyOptimisticUpdate` の freshIconMark 言及コメント            | freshIconMark 言及部分のみ削除                                         |
| [ItemFormCardOverride.svelte:106-110](../../../src/lib/components/item/ItemFormCardOverride.svelte) | 「`{#key icon_path}` で再マウント」 言及コメント                 | 「ItemIcon 内 `{#key iconSrc}` で `<img>` 再マウント」 に書き換え      |
| [ItemIcon.svelte:13-21](../../../src/lib/components/arcagate/common/ItemIcon.svelte)                | `loading` prop docstring 内の `content-visibility` 言及          | `content-visibility` は #573 で撤廃済、 古い理由付け。 docstring 整理  |
| [LibraryCard.svelte:89-98](../../../src/lib/components/arcagate/library/LibraryCard.svelte)         | `content-visibility: auto` 撤廃の長い経緯コメント                | library.md に集約、 svelte 内は短く / `${#key iconSrc}` 経緯に書き換え |
| [LibraryCard.svelte:203-208](../../../src/lib/components/arcagate/library/LibraryCard.svelte)       | CSS 内 `content-visibility` 撤廃コメント                         | 同上                                                                   |

### 3.2 剥がせない (A 案後も必要)

| 位置                                                                                            | 内容                                                              | keep 理由                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [items.svelte.ts:94-96](../../../src/lib/state/items.svelte.ts)                                 | `applyOptimisticUpdate` 関数本体                                  | slider drag (oninput) で IPC 殺到回避のため必須。 ItemFormCardOverride.svelte:35-38 docstring 参照                                                                          |
| [ItemFormCardOverride.svelte:78](../../../src/lib/components/item/ItemFormCardOverride.svelte)  | slider drag 中の `applyOptimisticUpdate` (in-memory live preview) | 同上                                                                                                                                                                        |
| [ItemFormCardOverride.svelte:111](../../../src/lib/components/item/ItemFormCardOverride.svelte) | `selectImage()` 内の `applyOptimisticUpdate` (画像変更直後)       | A 案で paint stale 自体は解消されるが、 `updateItem` IPC 往復 (数十 ms) を待たずに store 即時更新で UX 体感を改善する目的が残る。 Codex も keep 推奨 (CODEX_FOLLOWUP:64-66) |
| [ItemFormCardOverride.svelte:121](../../../src/lib/components/item/ItemFormCardOverride.svelte) | `clearImage()` 内の `applyOptimisticUpdate`                       | 同上 (画像削除の体感即時化)                                                                                                                                                 |
| [scripts/audit-appearance-state-mgmt.sh:33-91](../../../scripts/audit-appearance-state-mgmt.sh) | (A)(B)(D)(E) gate (⑤⑥ schema 契約)                                | ②と独立、 ⑤⑥ 機能契約として有効                                                                                                                                             |
| [scripts/audit-appearance-state-mgmt.sh:48-64](../../../scripts/audit-appearance-state-mgmt.sh) | (C) `content-visibility: auto;` 再導入禁止 gate                   | LibraryCard CV 撤廃の構造保証として keep (CV を再導入する状況は今後も望ましくない)                                                                                          |
| [LibraryCard.svelte:206-208](../../../src/lib/components/arcagate/library/LibraryCard.svelte)   | `.library-card { contain: layout style; }`                        | これは paint stale 対策ではなくレイアウト分離 CSS。 perf 観点で keep (Codex も「剥がし可だが別評価」、 ②と独立)                                                             |
| [card-override.ts 全体](../../../src/lib/utils/card-override.ts)                                | `disabled` / `icon_backup` / `isCardOverrideActive`               | ⑤⑥ schema 契約。 ② とは独立                                                                                                                                                 |

### 3.3 新規追加 (A 案実装時)

- [`ItemIcon.svelte`](../../../src/lib/components/arcagate/common/ItemIcon.svelte) 内に
  `{#key iconSrc}<img ...>{/key}` 構造
- [`audit-appearance-state-mgmt.sh`](../../../scripts/audit-appearance-state-mgmt.sh) に
  「ItemIcon に `{#key iconSrc}` (または同等) が存在する」 という新 gate (旧 F を置換)
- [`library.md`](../../l2_foundation/features/screens/library.md) の appearance 設定契約
  §機械検出 を新 gate に追従

### 3.4 死骸 (既に撤廃済の確認)

`freshIconMark` / `__arcagateTest__` の実コード参照は **0 件** (grep 確認、 Codex も同確認)。
コメントの言及だけ残っており、 これは経緯記録として library.md / lessons.md に集約して
svelte 内は短くする。

---

## 4. ②が壊れないかの構造的検証

### 4.1 ② シナリオの A 案でのフロー

1. user が LibraryDetailPanel → 「見た目設定」 checkbox ON → 歯車 → CardOverrideDialog
   が開く
2. CardOverrideDialog 内の ItemFormCardOverride で「画像を選択」 click → `selectImage()`
3. `selectImage()` → `cmd_save_icon_file` → `applyOptimisticUpdate({ icon_path: saved })`
   → `updateItem({ icon_path: saved })`
4. `applyOptimisticUpdate` で `items = items.map(...)` → store 即時更新
5. LibraryView の `{#each filteredItems as item (item.id)}` で各 LibraryCard に新 `item` が
   props として伝播
6. LibraryCard 内の `<ItemIcon iconPath={item.icon_path}>` も新 `iconPath` を受け取る
7. ItemIcon 内の `iconSrc = $derived(convertFileSrc(iconPath))` が再評価 → 新文字列
8. ItemIcon 内の `{#key iconSrc}<img>{/key}` が iconSrc 変化を検出 → 前 `<img>` unmount +
   新 `<img>` mount
9. 新 `<img>` は新 `iconSrc` を最初から HTML 属性として持つ → browser が fresh paint
   pipeline で処理 → modal close 後の grid に新 icon が反映される

### 4.2 各 step での paint stale リスク

| Step | 動作                                       | paint stale リスク                                                                                                                        |
| ---- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1-4  | store 更新 / Svelte reactivity             | 0 (Svelte 5 + items.map 再代入で確実伝播。 前 audit doc §1 で確認済)                                                                      |
| 5-6  | props 経由で `iconPath` が ItemIcon に伝播 | 0 (props reactive で確実)                                                                                                                 |
| 7    | `iconSrc` derive                           | 0 (純関数 derive)                                                                                                                         |
| 8    | `{#key iconSrc}` で `<img>` 再生成         | **これが核心**。 新 `<img>` element の DOM attach 時の native lazy 判定が viewport 内で即 trigger される構造的期待 (低信頼: 実機検証必須) |
| 9    | browser paint pipeline                     | element 入替で composite layer reset により tile cache 連続性が断ち切られる構造的期待 (低信頼: 実機検証必須)                              |

### 4.3 ⑤⑥ シナリオ

- 解除 (B→C): `icon_path: null`。 ItemIcon で `iconSrc = null` → `{#if iconSrc && !iconError}`
  が false → fallback icon。 `{#key iconSrc}` は内部の `<img>` だけを囲むので、 if 文の経路
  切替は通常 reactive で動く。 OK。
- 復元 (C→B): `icon_path = icon_backup`。 iconPath が path に戻る → `iconSrc` 再 derive
  → `{#key iconSrc}` で `<img>` 新規 mount → fallback から image。 OK。

⑤⑥ の機能契約 (card-override.ts の `disabled` / `icon_backup`、 LibraryDetailPanel の遷移
ロジック) は A 案で **影響を受けない**。 keep。

### 4.4 lateral sweep の利得

[ItemIcon.svelte](../../../src/lib/components/arcagate/common/ItemIcon.svelte) は Library
カードだけでなく、 LibraryDetailPanel の preview / LibraryItemPicker / palette / recent
等の **全 `<img>` 表示経路**で使われている。 A 案で paint stale 解消ロジックを ItemIcon 内に
寄せると、 これらすべての caller で同じ paint stale 耐性が**自動で適用**される。 これは
LibraryView の `{#key}` (現状) では得られない副次利得。

---

## 5. 残る不確実性 (honest list)

A 案で「構造的に解決」 と判定したが、 実機検証なしに 100% 断定できない箇所:

1. **modal overlay 下で `{#key iconSrc}` 再生成が本当に paint stale を消すか**: WebView2 /
   Chromium 標準仕様上の期待挙動だが、 特定 version の compositor 実装で stale が残る
   flake が報告されている (まれ)。 LB-2 相当の実 UI 経路 e2e (前 audit §e2e 再構築の
   E1-E4) で確認必須。
2. **`loading="lazy"` 新 `<img>` の IntersectionObserver attach タイミング**: 新 element が
   bounding box 確定前に IO 判定が走って viewport 外と誤判定するリスク (rare)。 ItemIcon
   は parent から sizing class を受ける構造で発生しにくいが、 0 ではない。 実機検証で
   確認。
3. **`contain: layout style` を keep するか撤去するか**: ②と独立な perf 観点だが、 A 案
   実装後に「②の paint scheduling が完全に解消されている」 と確証が取れたら、 contain CSS
   は keep のまま影響ないとみなせる。 撤去判断は別 perf bench が必要。
4. **`convertFileSrc` で同 path → 同文字列 → `{#key}` trigger なし**: `cmd_save_icon_file`
   は必ず uuid v7 で新 path を生成 ([item_service.rs:914](../../../src-tauri/src/services/item_service.rs))
   するため ② シナリオでは path 必ず変化 → 影響なし。 ただし「user が手動で同 path に上書き」
   のような edge case は paint stale が残る (これは ② の範囲外 — そもそも user 操作 path
   ではない)。
5. **WebView2 LB-2 crash**: 前 audit §3 でハーネス起因と判定したが、 A 案実装時の e2e
   復活で再評価が必要。 mock IPC / 単独 worker / fixture-based cleanup の組合せで安定
   稼働するか確認必須。

### 5.1 実装 PR で要求すべき検証

- LB-2 相当を E1 (単独 job) + E2 (Tauri 公式 `mockIPC`) + E3 (fixture-based CSS hack) で
  復活させて、 ② が green pass することを確認。
- 同 LB-2 で `loading="lazy"` を維持したまま新 `<img>` mount → fetch trigger → paint 完了
  を timeline trace で確認 (CDP performance.now() で計測)。
- `contain: layout style` を keep / 撤去で perf 比較 bench (Library 690 cards cold start)。

---

## 結論

### 「B 不要、 A を `<img>` 限定 `{#key iconSrc}` で正しくやる + 広い対症ハックを全撤去」 で ② は根治するか

**構造的には根治可能**。 Claude / Codex 一致。 ただし以下を満たす必要がある:

1. ItemIcon 内に `{#key iconSrc}<img>{/key}` を導入。
2. LibraryView の card 全体 `{#key item.icon_path|card_override_json}` を撤去。
3. `audit-appearance-state-mgmt.sh` の (F) を ItemIcon 必須化 gate に置換。
4. `library.md` / `items.svelte.ts` / `LibraryCard.svelte` / `LibraryView.svelte` /
   `ItemFormCardOverride.svelte` の関連経緯コメントを A 案ベースに書き換え。
5. `applyOptimisticUpdate` 系は keep (slider drag + 画像変更時の体感即時化)。
6. ⑤⑥ schema (`disabled` / `icon_backup`) は keep。
7. **実装 PR で LB-2 相当の実 UI 経路 e2e を E1-E4 で復活させて green を確認** (構造解
   だけで「治った」 と宣言しない — CLAUDE.md `<critical-rule id="dom-not-fixed">` 厳守)。

### 前 audit doc target architecture の改訂

- **A 案**: 採用方針確定。 ただし「ItemIcon 内 `{#key iconSrc}` に絞り、 LibraryView の
  全体再マウントを撤去」 と precision を上げる。
- **B 案**: **撤回**。 中期検討としても入れない。 native lazy で十分。
- **C 案** (`card_override_json` schema 純化): keep。 ② とは独立した別 PR で。

### 推奨優先順位 (改訂)

1. (短期) A 案を実装 PR で投入: ItemIcon 内 `{#key iconSrc}` 化 + LibraryView 広域 `{#key}`
   撤去 + audit gate 更新 + 経緯コメント更新。
2. (短期) 同 PR 内で LB-2-real を E1-E4 で復活させ green 確認。
3. (中期) ~~B 案~~ 撤回。
4. (中期) C 案 (schema 純化) は ⑤⑥ の追加要求が出たタイミングで bundle。
5. (中期) `contain: layout style` の perf 影響 bench → 撤去 / keep 判断 (これは ② とは独立)。

---

## 仕様 / 実装 / テストの乖離 (前 audit 指摘事項)

前 audit doc §仕様 / 実装 / テストの乖離 で指摘した [`library.md`](../../l2_foundation/features/screens/library.md):224
の LB-2-real 機械検出記述と
[`ph-cf-600-library-bug-fixes.spec.ts`](../../../tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):105
の `test.skip` の乖離は、 A 案実装 PR で LB-2-real を復活させることで自然に解消できる。
別 PR で先に乖離を解消するより、 A 案実装と同時にやる方が整合性が取れる。
