# §4 UX gap 棚卸し

Library 画面の機能領域ごとに「現状」と「gap (欠落 / 不足)」を整理。industry 標準と照合 (詳細は industry-comparison.md)。

## 4.1 add (item 追加)

### 現状

- 手動: 「+」 button → ItemForm dialog (URL / 自動 type 検出)
- drag-drop: file → ItemForm prefilled (path 検出 + icon extract)
- folder watch (workspace widget) 経由 auto-register
- file search (workspace widget) 経由 auto-register

### gap

- **重大**: 多くの user は「add 経路を発見できない」(空状態に explicit な scan / drop / template 誘導なし)
- **欠落**: 一括 add (フォルダ選択 → 配下全 exe を Library に登録) の Library 画面側 entry なし (workspace widget 経由のみ)
- **欠落**: 同 path の重複検出 / merge UX なし (重複したら別 item として作成される)
- **欠落**: clipboard URL paste (Cmd+V で URL から自動 add)

## 4.2 edit

### 現状

- LibraryDetailPanel の「編集」 button → ItemFormDialog (update mode)
- LibraryCard 右クリック → 編集

### gap

- **欠落**: rename だけのインライン編集 (Playnite F2)
- **欠落**: bulk edit (複数 item の type / tag / icon を一括変更) — Notion 標準
- **欠落**: 名前 / icon の手動再生成 (icon が壊れたら再 extract する明示 UI なし)

## 4.3 delete

### 現状

- LibraryDetailPanel「削除」 → confirm dialog (workspace widget 参照数表示) → cmd_delete_item
- bulk delete: LibraryMainArea の bulk select → 一括削除 (現状 confirm なし? 要確認)

### gap

- **欠落**: undo (5 秒 toast でキャンセル) — Notion / Trash convention
- **欠落**: Trash collection (削除済 item を 30 日保持) — soft delete UX
- **欠落**: keyboard `Del` shortcut

## 4.4 sort / filter

### 現状

- sidebar tag click で filter (single tag のみ)
- sort: 不明 (UI 上選択肢なし? 内部 sort_order で固定)
- search bar (LibraryMainArea) で名称 substring filter

### gap

- **重大**: sort 選択肢 UI なし (name / 追加日 / 最終起動日 / launch count / size 等)
- **重大**: multi-tag filter (AND/OR) なし、Steam / Playnite 標準
- **欠落**: 「dynamic collection」 (rule-based) なし — Steam / Playnite 標準
- **欠落**: 保存可能な「filter preset」(Playnite 標準)
- **欠落**: filter 状態のリロード後保持

## 4.5 search

### 現状

- LibraryMainArea search bar: `cmd_search_items_in_tag(tagId, query)` で substring match (DB LIKE %q%)
- IME 対応: Svelte の `bind:value` でナイーブ更新、`compositionstart/end` 別扱いなし

### gap

- **重大**: fuzzy search なし (Raycast 標準)、"slk" → "Slack" は match しない
- **重大**: 日本語 かな-カナ-漢字 揺れなし ("みんちょう" でも "明朝" hit できない)
- **欠落**: alias / target path / tag 横断 search (現状 label だけ)
- **欠落**: search history / recent queries
- **欠落**: scoped search (tag 内のみ / 全体)
- **欠落**: regex / operator (Obsidian の `tag:` `path:` 等)

## 4.6 empty state

### 現状

- 全 item ゼロ: 何が表示されるか要確認 (たぶん「アイテムがありません」程度)
- filter 結果ゼロ: 「該当なし」程度

### gap

- **重大**: onboarding scan (Playnite ライク「フォルダを scan しますか?」CTA) なし
- **欠落**: 例 item / template / placeholder image
- **欠落**: filter zero 時に「filter を解除」 button 直結

## 4.7 keyboard navigation

### 現状

- 矢印キー: 動作不明 (実装されていない可能性)
- Enter: 不明 (動作不明)
- `Cmd+A`: 不明
- `Del`: 不明
- `Cmd+F`: search bar focus? 不明
- `Esc`: dialog close 程度

### gap

- **重大**: 完全な keyboard nav 不在の可能性大 — Playnite 標準の `F2/F3/F5/Enter/Del/Ctrl+A/Ctrl+F` を採用
- **欠落**: arrow grid nav (上下左右で card 間移動)
- **欠落**: type-to-jump (文字 type で該当 item にジャンプ)

## 4.8 icon UX

### 現状

- LibraryCard が `iconPath` を 3 mode (image / fill / none) で表示
- extract: ItemForm drop-drop 時 / register 時に `cmd_extract_item_icon` (同期、I3 主犯)
- fallback: 不明 (extract 失敗時何が出るか要確認)
- cache: filesystem に `app_data_dir/icons/{item_id}.png` で保存、DB icon_path 列がそれを参照

### gap

- **重大**: extract 失敗時の fallback 明示 UI (Playnite ライクに「icon を再取得」 button)
- **欠落**: 自動定期再 extract (target file が変わったとき)
- **欠落**: icon variants (cover / hero / thumbnail) — Playnite / Steam 標準
- **欠落**: icon edit UI (crop / re-color / replace に統一)
- **欠落**: cache invalidation (古い icon が残り続ける)

## 4.9 grouping

### 現状

- 単一 tag filter のみ (sidebar で active tag を 1 つ)
- group view なし

### gap

- **重大**: group by tag / type / 起動頻度 (Playnite 標準)
- **欠落**: sticky section header
- **欠落**: collapse / expand per group

## 4.10 bulk operations

### 現状

- LibraryMainArea で multi-select mode (toggle)
- bulk action: star toggle / delete (3 cmd_bulk_*)

### gap

- **重大**: bulk tag add/remove の UI 露出弱い (たぶん floating bar なし)
- **欠落**: bulk move (collection 移動) — Steam 標準
- **欠落**: bulk export / import (settings 系)
- **欠落**: rubber-band selection (drag で範囲選択)

## 4.11 virtualization (大量 item 描画)

### 現状

- すべての item card を DOM render (lazy なし)
- 69+ で重い (I3 主犯の一つ)

### gap

- **重大**: virtual scroll 未実装 → 数百 item で frame drop / GC pressure / memory
- **欠落**: progressive load (initial 50 → scroll で追加 50)

## 4.12 persistence (state 永続化)

### 現状

- sidebarExpanded / activeTag / scrollTop は LibraryLayout で localStorage 永続化
- itemSize (S/M/L) は configStore で永続化
- libraryCard 設定 (style) は config 永続化

### gap

- **欠落**: filter 状態の永続化 (リロードで消える)
- **欠落**: search query 永続化 (recent queries 含め)
- **欠落**: bulk select state はリロードで消失 (これは妥当)
- **欠落**: multi-view (grid/list/details) の per-tag 設定保存 (現状 global 1 個)

## 4.13 不確かな点 (要 dev 再現)

- (中) Library の現状 keyboard nav 実態 (要 dev で実際に矢印 / Enter 押して確認)
- (中) bulk delete の confirm UX (要再現)
- (中) sort UI の実装有無 (LibraryMainArea を再 read 要)
- (低) filter 結果ゼロの empty state 実装
