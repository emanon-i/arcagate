---
status: todo
phase_id: PH-20260422-020
title: FavoritesWidget → sys:starred items 接続
depends_on:
  - PH-20260422-019
scope_files:
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
  - src-tauri/src/commands/workspace_commands.rs
  - src-tauri/src/services/workspace_service.rs
parallel_safe: false
---

# PH-20260422-020: FavoritesWidget → sys:starred 接続

## 目的

`FavoritesWidget` が現在表示する「頻繁に起動したアイテム」を、
ユーザーが明示的にスターを付けたアイテム（`sys:starred` タグ）に変更する。

## 現状

```rust
// workspace_commands.rs
pub fn cmd_get_frequent_items(db: State<DbState>, limit: i64) -> Result<Vec<Item>, AppError>
```

`FavoritesWidget.svelte` は `cmd_get_frequent_items` を呼んでいる。

## 設計判断

- `cmd_get_starred_items(limit: i64) -> Result<Vec<Item>, AppError>` を新規追加
- 実装: `item_repository::find_by_tag(db, "sys:starred", limit)`
- `FavoritesWidget.svelte` の IPC 呼び出しを切り替えるだけ（表示 UI は変更不要）
- `cmd_get_frequent_items` は残す（削除するとスモークテストが壊れる）

## 実装ステップ

### Step 1: Rust — cmd_get_starred_items 追加

```rust
pub fn cmd_get_starred_items(db: State<DbState>, limit: i64) -> Result<Vec<Item>, AppError> {
    workspace_service::get_starred_items(&db, limit)
}
```

`workspace_service::get_starred_items` は `item_repository::find_by_tag(db, "sys:starred", limit)` を呼ぶ。

### Step 2: Svelte — FavoritesWidget 切り替え

`FavoritesWidget.svelte` の `invoke('cmd_get_frequent_items')` を
`invoke('cmd_get_starred_items')` に変更。

空の場合の表示:

```svelte
{:else}
    <p class="text-sm text-[var(--ag-text-muted)]">
        ★ のついたアイテムがここに表示されます
    </p>
{/if}
```

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-020): FavoritesWidget を sys:starred ベースに切り替え`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] `cmd_get_starred_items` IPC コマンドが存在すること
- [ ] FavoritesWidget がスター付きアイテムのみを表示すること（頻度ベース廃止）
- [ ] スターなしの場合にガイドメッセージが表示されること

## 停止条件

- `find_by_tag` に相当する repository 関数が存在せず実装コストが高い → 停止して報告
