---
status: todo
phase_id: PH-20260422-013
title: sys:starred システムタグ実装（Rust 基盤 + DetailPanel ★ トグル）
depends_on:
  - PH-20260422-001
scope_files:
  - src-tauri/src/lib.rs
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
parallel_safe: true
---

# PH-20260422-013: sys:starred システムタグ

## 目的

PH-20260422-010 の代替。FavoritesWidget は `getFrequentItems`（起動頻度自動集計）ベースであり、\
ユーザが手動でアイテムを「お気に入り」にする仕組みがない。\
`sys:starred` システムタグを追加し、LibraryDetailPanel から ★ トグルで付与/解除できるようにする。\
タグは Library サイドバーの「★ Starred」行でフィルタ可能になる（is_hidden: false で自動表示）。

## 設計判断

- `sys-starred` を固定 ID とする（`sys_ws_tag_id` / `sys_type_tag_id` パターンに準拠）
- `upsert_system_tag` は既に `tag_repository::upsert_system_tag` として実装済み
- フロントエンドの ★ トグルは既存の `handleAddTag` / `handleRemoveTag` 仕組みを再利用
- is_hidden: false → `find_all_with_counts` クエリが `WHERE is_hidden = 0` で自動フィルタするため、
  「★ Starred」行がサイドバーに表示される
- LibraryCard のバッジ表示は PH-20260422-015 で行う（スコープ分離）

## 実装ステップ

### Step 1: Rust 側 sys-starred 登録

`src-tauri/src/lib.rs` の `setup` 関数内（DB 初期化後）に追加:

```rust
// sys:starred システムタグ（手動スター付け）
let starred_tag = Tag {
    id: "sys-starred".to_string(),
    name: "Starred".to_string(),
    is_hidden: false,
    is_system: true,
    prefix: Some("★".to_string()),
    icon: None,
    sort_order: 90,
    created_at: String::new(),
    updated_at: String::new(),
};
let conn = db.0.lock().expect("db lock");
let _ = tag_repository::upsert_system_tag(&conn, &starred_tag);
```

`upsert_system_tag` は既存関数。副作用なし（既に存在すれば name/prefix 更新のみ）。

### Step 2: LibraryDetailPanel に ★ トグルボタン追加

- `itemTags` に `sys-starred` が含まれるかで `isStarred` を `$derived` で算出
- ボタン: `isStarred` なら `handleRemoveTag("sys-starred")`、else `handleAddTag("sys-starred")`
- ボタンラベル: `isStarred ? "スターを外す" : "スターを付ける"`
- アイコン: `Star`（lucide、既存 import があるか確認して追加）

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-013): sys:starred システムタグ追加 + LibraryDetailPanel ★ トグル`

## 受け入れ条件

- [ ] アプリ起動後に Library サイドバーに「★ Starred」行が表示される
- [ ] Library でアイテムを選択 → 詳細パネルの「スターを付ける」ボタンクリック → タグが付与される
- [ ] 同ボタンを再クリック（スターを外す）→ タグが解除される
- [ ] `pnpm verify` 通過

## 停止条件

- `upsert_system_tag` の呼び出し箇所で DB ロック問題が発生 → 停止して報告
- フロントエンドの `handleAddTag("sys-starred")` で ID 解決に問題 → 停止して報告
