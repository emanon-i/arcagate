---
status: wip
phase_id: PH-20260422-019
title: sys:starred タグ実装 + ★ボタン + Library カード表示
depends_on:
  - PH-20260422-001
scope_files:
  - src-tauri/src/services/config_service.rs
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
  - src/lib/components/arcagate/library/LibraryCard.svelte
  - src/lib/ipc/items.ts
parallel_safe: false
---

# PH-20260422-019: sys:starred タグ実装

## 目的

PH-20260422-010 で停止した「お気に入り追加」機能を `sys:starred` システムタグで実現する。

## 現状

- `FavoritesWidget` は `getFrequentItems`（起動頻度）ベース。ユーザーが明示的に選べない
- `sys:ws` タグはアプリ起動時に `upsert_system_tag` で登録されるパターンが確立済み
- `LibraryDetailPanel` にスター操作ボタンなし
- `LibraryCard` にスター視覚表示なし

## 設計判断

- `sys:starred` タグを起動時に upsert（DB マイグレーション不要）
- ★/☆ トグルは `cmd_set_item_tags` 経由でタグの付与/解除
- LibraryCard にスター表示: タグ一覧を IPC で取得してフロントで判定するのではなく、
  `Item` 型に `is_starred: bool` を追加し IPC レスポンスに含める（既存 `list_items` 拡張）

## 実装ステップ

### Step 1: Rust — sys:starred 起動時 upsert

`config_service.rs` の初期化処理に `upsert_system_tag(db, "sys:starred", "スター", false)` を追加。

### Step 2: IPC — is_starred フィールド追加

`cmd_list_items` / `cmd_get_item` のレスポンス `Item` に `is_starred: bool` を追加。
実装: `items.find_all()` の結果に対して `sys:starred` タグが付いているか JOIN で判定。

ただし既存の `Item` 型への変更は破壊的変更となるため、**代替案**として
`cmd_is_starred(item_id) -> bool` の単発コマンドを追加する（ListItems に影響なし）。

→ 単発コマンド方式を採用:

```rust
pub fn cmd_is_starred(db: State<DbState>, item_id: String) -> Result<bool, AppError>
pub fn cmd_set_starred(db: State<DbState>, item_id: String, starred: bool) -> Result<(), AppError>
```

### Step 3: フロント — LibraryDetailPanel ★ボタン

`LibraryDetailPanel.svelte` にスター状態の取得と toggle:

```svelte
let isStarred = $state(false);
$effect(() => {
    if (!selectedItemId) return;
    void invoke<boolean>('cmd_is_starred', { itemId: selectedItemId })
        .then(v => { isStarred = v; });
});
async function toggleStar() {
    await invoke('cmd_set_starred', { itemId: selectedItemId, starred: !isStarred });
    isStarred = !isStarred;
}
```

ボタン: `<button onclick={toggleStar}>` + `Star` / `StarOff` アイコン

### Step 4: フロント — LibraryCard ★インジケータ

`LibraryCard.svelte` に prop `isStarred?: boolean` を追加し、
true 時に右上隅に小さな ★ バッジを表示。
`LibraryMainArea.svelte` 側で `cmd_is_starred` の結果をまとめて渡すか、
Card 内で個別に取得するかは **Card 内個別取得は IPC 爆発するため**、
LibraryMainArea がアイテム一覧取得後に starred タグ付きアイテム ID セットを
`cmd_list_items_by_tag('sys:starred')` で取得し、Set で管理する方式を採用。

### Step 5: pnpm verify

## コミット規約

`feat(PH-20260422-019): sys:starred タグ + ★ボタン + Library カード表示`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] `cmd_is_starred` / `cmd_set_starred` IPC コマンドが存在すること
- [ ] LibraryDetailPanel に ★ トグルボタンが表示されること
- [ ] LibraryCard でスター付きアイテムに ★ バッジが表示されること

## 停止条件

- `Item` 型変更が 10 ファイル以上に波及する → 停止して報告
