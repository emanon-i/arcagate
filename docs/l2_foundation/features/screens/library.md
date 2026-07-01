# Library 画面

> Functional Spec。機能契約のみ記載。詳細な機能カタログは [`../../screens/library.md`](../../screens/library.md)。

## 目的

全登録 item の一覧画面。item を登録 / タグ付け / 起動する。アプリ起動時に最初に見える default 画面。

## やること (必要処理)

- item の一覧表示 (card grid、S / M / L サイズ切替)
- item 登録: exe / folder / script の D&D、URL の D&D (title 自動取得)、ブックマーク HTML 取込、手入力 form + file/folder picker
- toolbar 検索 input で label の fuzzy filter (live)
- sidebar tag (type / workspace / user tag) でフィルタ、非表示 item の toggle
- ソート (名前 / 作成 / 更新 / 起動頻度 / 最終起動、asc / desc)
- detail panel で icon + metadata + アクション (起動 / 編集 / お気に入り / 削除) + per-card 視覚 override
- 複数選択 mode で bulk star / bulk delete
- card 右クリック context menu (Default app で開く / パスをコピー / Explorer で開く / 削除 / 設定)
- sidebar 統計 (総 item 数 / タグ数 / 今週の起動回数) の表示

## やらないこと (禁止 / scope 外)

- list view を提供しない (card grid のみ。未実装)
- セマンティック検索 / 内容検索をしない (label / aliases / tag のみ)
- マルチデバイス同期をしない (1 PC 完結)
- **per-card の $effect から個別 IPC を呼ばない** (metadata / icon は store で 1 回 batch fetch + cache、N card で N 並列 invoke 禁止 — lessons.md per-card $effect IPC の罠)
- **metadata 取得で非画像 file のハンドルを開かない** (Defender real-time scan を誘発し freeze する — #524 真因)
- item 起動・OS アクセスを frontend でしない (backend 経由)

## 性能予算

- 画面遷移 P95: warm < 200ms / cold < 2000ms (実機 SMR HDD・100+ item 基準)
- card 一覧の metadata warmup は async (`cmd_get_items_metadata_batch`)、main thread を block しない
- 検索入力 → 結果反映 < 100ms

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` / `tags` / `launch_log` テーブルへ CRUD
- icon を `%APPDATA%/icons/<uuid>.png` に保存
- mutation 系 store 関数は内部で sidebar 統計 / tag count を一括 refresh (caller に refresh 責務を持たせない — lessons.md)

## 依存

- IPC: `cmd_create_item` / `cmd_update_item` / `cmd_delete_item` / `cmd_list_items` / `cmd_search_items` / `cmd_extract_item_icon` / `cmd_fetch_url_title` / `cmd_import_bookmarks` / `cmd_toggle_star` / `cmd_get_library_stats` / `cmd_get_tag_counts` / `cmd_create_tag` / `cmd_update_tag` / `cmd_delete_tag` / `cmd_get_items_metadata_batch`
- backend: [Item Service](../backend/item-service.md) / [Tag Service](../backend/tag-service.md) / [Icon Service](../backend/icon-service.md) / [Metadata Service](../backend/metadata-service.md)
- 依存される: Palette / 各 library 系 widget (Favorites / Recent / Stats / Item)

## 既知の判断

- icon は file system 保存 (base64 TEXT 比で容量 33% 削減、search query で icon data を load しない)
- system tag は type 系 (`sys-type-*`) と workspace 系 (`sys-ws-*`) の 2 系統 + user tag

## 破壊的操作の確認契約 (PH-CF-300)

item / workspace / タブの削除など取り返しのつかない操作は、 **専用 confirm modal** または
**undo-toast** のいずれかを必ず経由する。 `window.confirm` / `window.alert` / `window.prompt`
は使わない (チェックボックス等の拡張不能・OS 依存の見た目・ag-glass theme と不整合)。
削除確認モーダルは影響範囲 (削除される item 数 / 連鎖削除の有無) を文言で明示する。

### Library での適用

- **カード右クリックメニューの「削除」 (C1)**: `LibraryView.svelte` で開き、 `deleteWithUndo`
  経由で `LibraryUndoSnackbar` の undo-toast 経路に乗せる (5 秒以内なら元に戻せる)。
- **複数選択時の一括削除**: 専用 `ConfirmDialog` (`destructive` variant、 削除件数 + 影響
  範囲文言を `extraNote` で表示)。 確認後に `bulkDeleteItems` を実行。
- **detail panel の削除ボタン**: Tauri `ask()` (OS-native confirm) で確認、 確認後に
  `deleteWithUndo` 経路で undo-toast を出す (既存)。

### 機械検出

- `scripts/audit-window-confirm.sh` が `src/**/*.{ts,svelte}` に対し
  `window.confirm|window.alert|window.prompt` 0 件を検証 (lefthook + `pnpm audit:all` で gate)。
- e2e: `tests/e2e/destructive-confirm.spec.ts` が
  (a) Library カード右クリック → 「削除」 表示 + クリックで item 消滅 + undo snackbar 表示
  (b) 複数選択 → 削除 → ConfirmDialog 経由
  を検証。

## hidden 表示契約 (PH-CF-600 C4)

「非表示を表示」 (`configStore.libraryShowHidden`) ON 時、 hidden (`is_enabled = false`)
item は **All タブだけでなく Type タブ / tag タブでも表示** する。 表示はグレーアウト
(`LibraryCard` の `opacity-40 grayscale`) で hidden 状態を視覚的に区別する。

hidden を返すかは backend クエリの `include_disabled` 引数で明示制御し、 呼び出し側が画面の
意図に応じて渡す。 `is_enabled = 1` をクエリにハードコード固定除外しない (固定除外すると Type / tag
タブから hidden が消えるため)。

共有クエリ (`searchItemsInTag` 等) の挙動を変えるときは **全 call-site を matrix で確認**
する。 詳細な matrix は `src/lib/ipc/items.ts` の `searchItemsInTag` doc comment と
[Item Service hidden item 取得契約](../backend/item-service.md#hidden-item-取得契約-ph-cf-600-c4)
を参照。

### 機械検出

- backend unit test `test_search_in_tag_include_disabled_flag` (`src-tauri/src/repositories/item_repository.rs`)
- e2e: `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts` の hidden item Type タブ表示シナリオ
  (「非表示を表示」 ON + Type=exe タブで hidden exe item がグレーアウト表示される /
  FavoritesWidget には hidden item が漏れない)

## detail panel 閉じ条件契約 (PH-CF-600 C7)

Library detail panel が閉じるのは **余白クリックのみ**。 検索バー / sort select / view モード
切替 button / add button / グリッド内のインタラクティブ要素のクリックでは閉じない。

実装方針: 閉じトリガーは `e.target === e.currentTarget` (= padding 領域そのもののクリック) に
限定する。 「カードでなければ閉じる」 のホワイトリスト方式
(`closest('[data-testid^="library-card-"]')`) は対象集合が広すぎて検索バー / sort 等の
インタラクティブ要素まで閉じトリガーになる構造欠陥のため使わない。 click-outside の正規
パターンは `ContextMenu.svelte` の `contains()` 判定。

### 機械検出

- e2e: `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts` で detail panel を開いた状態で
  検索バー / sort select クリック → panel が閉じない、 余白クリック → 閉じる を verify。

## ツールバー契約 (PH-CF-700 C5)

ライブラリ画面のツールバー (`LibrarySortControls`) のアクションボタンは以下に統一する:

- **アイコンボタンに統一**: 非表示トグル / sort / view / 複数選択トグルなどの 1 アクション系は
  `p-2` のアイコンのみボタンで揃える (テキスト混在禁止)。 必ず `aria-label` + `title`
  (両方とも i18n キー) を持つ ([CLAUDE.md `<critical-rule id="label-content">`])。
- **「アイテムを追加」 は最右**: ライブラリの主要 CTA (新規追加) は必ずツールバーの右端に
  配置し、 アイコン + テキストの「大きめボタン」 で他のアイコンボタン群と差を付ける。
- **複数選択トグルの位置**: 「アイテムを追加」 の左隣にアイコンボタン (`ListChecks` / `CheckSquare`)
  として置く。 選択中は `aria-pressed="true"` + accent 色で active 状態を表現。

### 機械検出

- e2e: `tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts` の LB-5 で
  ツールバー子要素の DOM 順 (= visual 順) を取得し、 `library-selection-toggle` →
  `add-item-button` で「追加が最右」 を verify。 同 spec で複数選択トグルが
  aria-label / aria-pressed を持つアイコンボタンであることを assert。

## サイドバーアイコン契約 (PH-CF-700 C6)

`LibrarySidebar` の icon は section ごとに意味のあるものを使う:

- **タグ行** (`userTags`): `Tag` (lucide) — 「ユーザー定義タグ」 を表す。
- **Type タグ行** (`typeTags`): `typeIconMap` で `exe → Gamepad2` / `url → Globe` / `folder →
  FolderOpen` 等。 未知 type は `CircleDashed` 等の汎用アイコンに fallback (workspace アイコン
  `LayoutDashboard` を fallback に使わない)。
- **Workspace タグ行** (`workspaceTags`): `LayoutDashboard` — workspace 自身を表すアイコン。

「workspace アイコン (`LayoutDashboard`) を別 section の fallback に使わない」 を契約として
明文化することで、 「タグなのに workspace アイコンが付く」 認知ミスマッチを防ぐ。

### 機械検出

- 静的 grep: `grep -nE "LayoutDashboard" src/lib/components/arcagate/library/LibrarySidebar.svelte`
  の occurrence が **workspace section の 1 箇所のみ** であること
  (`scripts/audit-library-sidebar-icons.sh` で gate)。
- e2e (snapshot 系): 必要なら sidebar 各 section のアイコンが期待 component で render される
  ことを screenshot diff で verify (本 PH では grep audit を採用)。

## appearance 設定の状態管理契約 (PH-CF-1100 ②⑤⑥)

ライブラリ item の「見た目設定 (per-card appearance)」 — 画像 (`icon_path`) + 位置調整
(`card_override_json.background.offsetX/Y`/`rotation`) + ラベル style — は以下の不変条件を
満たして state 管理する。 user 検収 (2026-05-25) で「画像が即時反映しない (②)」 「解除しても
画像が残る (⑤)」 「解除→復元で位置調整が消える (⑥)」 を再発させないため。

### スキーマ

`card_override_json` (`Item.card_override_json` 文字列、parse 後 `CardOverrideJson`):

```ts
{
  background?: { offsetX?, offsetY?, rotation? },
  style?: { textColor?, overlayEnabled?, strokeEnabled?, strokeColor?, strokeWidthPx? },
  opener_id?: string | null,
  disabled?: boolean,     // PH-CF-1100 ⑤⑥
  icon_backup?: string | null, // PH-CF-1100 ⑤
}
```

`disabled` / `icon_backup` 以外のフィールドは従来通り。 `null` (= json 自体が無い) は「見た目
設定が一度も有効化されていない」 状態を意味する。

### 状態遷移

`LibraryDetailPanel` の「見た目設定」 checkbox は以下 3 状態を遷移する:

| state                       | json                                                   | item.icon_path     | LibraryCard 表示                                   |
| --------------------------- | ------------------------------------------------------ | ------------------ | -------------------------------------------------- |
| **A. Never enabled**        | `null`                                                 | (任意)             | 共通 default + item.icon_path or fallback アイコン |
| **B. Active**               | `{ ...settings, disabled: undefined }`                 | (user 設定済 path) | per-card override 全面 cover                       |
| **C. Disabled (preserved)** | `{ ...settings, disabled: true, icon_backup: <prev> }` | `null`             | 共通 default + fallback アイコン                   |

- **A → B (初回 ON)**: checkbox を ON にすると `CARD_OVERRIDE_INITIAL_BACKGROUND` + 現在の global
  style で json を新規作成。 `item.icon_path` は維持。
- **B → C (解除)**: `disabled: true` を立て、 `item.icon_path` を `icon_backup` に退避してから
  null へ倒す。 background / style 等の本体は **必ず維持** する (= ⑥ の前提)。
- **C → B (復元)**: `disabled` フィールドと `icon_backup` フィールドを `delete` で消費して、
  `icon_path` に backup を書き戻す。 結果 user 視点では位置調整含む一切の設定が一気に蘇る。

`updateItem` IPC は **1 回** で `card_override_json` と `icon_path` を一括で書き換える (中間
状態を露出しない)。

### 即時反映 (画像 / 位置調整 / 解除・復元)

per-card override の視覚要素 (`icon_path` / `card_override_json`) 更新は、 ダイアログ open 中
でも grid の該当カードが **画面遷移なしに反映** されること (= ② 契約)。

paint stale 解消責務は `ItemIcon` 内に局所化されている (`src/lib/components/arcagate/common/ItemIcon.svelte`):

- `<img>` 要素を `{#key iconSrc}` で囲み、 iconSrc 変化で **`<img>` element 単独で再生成** する。
  新規 `<img>` は DOM に attach された時点で新 src を HTML 属性として持ち、 browser の fresh
  paint pipeline で処理される (前 element の compositor layer / tile cache の連続性が断ち切られる)。
- これにより `CardOverrideDialog` overlay 下での `<img src>` 更新でも、 一覧 grid が遷移なしに
  切替わる。
- `LibraryCard` に `content-visibility: auto` 仮想化は使わない (paint stale の構造的欠陥を招くため)。 perf 影響は 690 cards の cold open で initial paint ~150ms (許容)、 scroll は 60fps 維持。
- card 全体の `{#key item.icon_path|card_override_json}` 広域再 mount はしない (paint stale 解消責務は ItemIcon に局所化済で、 card 全体再 mount は冗長)。

経緯詳細: `docs/l3_phases/audit/LIBRARY_ICON_REFRESH_TARGET_ARCH_2026-05-25.md`。

### 機械検出

- `scripts/audit-appearance-state-mgmt.sh`:
  - (A) `card-override.ts` に `isCardOverrideActive` / `disabled?: boolean` / `icon_backup?: string`
  - (B) `LibraryCard.svelte` が `isCardOverrideActive` を import + 使用
  - (C) `LibraryCard.svelte` に `content-visibility: auto;` CSS 宣言が再導入されていない
  - (D) `LibraryDetailPanel.svelte` の toggle OFF 経路に `disabled: true` / `icon_backup` /
    `icon_path: null` が揃っている
  - (E) restore 分岐で `delete restored.disabled` / `delete restored.icon_backup` を呼ぶ
  - (F) `ItemIcon.svelte` の `<img>` が `{#key iconSrc}` で囲まれており、 かつ `LibraryView` から
    広域 `{#key item.icon_path|card_override_json}` 対症ハックが消えていること
- e2e: `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts` の **LB-2** (② 真因経路):
  - detail panel UI で toggle ON → 歯車 button click → CardOverrideDialog → 「画像を選択」 button
    click までを実機相当の click sequence で踏む。
  - 唯一の test seam は `src/lib/ipc/icon-picker.ts` の native dialog leaf 1 個。 Vite を
    `VITE_E2E=1` で起動した時のみ seam が live になり、 `globalThis.__arcagateIconPickerE2ESeam__`
    に fixture path を set すると次回 1 回だけ消費する。 production build (`pnpm tauri build`)
    では `import.meta.env.VITE_E2E` が undefined のため seam block は tree-shake で削除され、
    binary に seam check のコードは残らない。
  - 上流の click sequence は production と同じパスで走り、 `cmd_save_icon_file` →
    `applyOptimisticUpdate` → `updateItem` → ItemIcon の `{#key iconSrc}` 再生成 → 一覧カード
    `<img src>` が新 path に切替、 を機械検証する。
  - `__arcagateTest__` のような UI 全体 bypass は禁止 (PR #570 の教訓 — 「test は通るが実機で
    直っていない」 を許す)。
