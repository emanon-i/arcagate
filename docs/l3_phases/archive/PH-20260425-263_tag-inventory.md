---
id: PH-20260425-263
status: done
batch: 61
type: 整理
---

# PH-263: タグ実装現状棚卸し

## 背景・目的

実機フィードバックを受け、タグシステム（sys-starred / Favorites / システムタグ）の
現状を一覧化して batch-62 以降の Favorites タグ統合設計に活用する。

## 調査項目

### DB schema 確認

- `tags` テーブルの `is_system`, `prefix`, `name` カラムの使われ方
- `sys-starred` ID のシステムタグの実装
- `sys:type:*` システムタグ群（item_type 別フィルタ）

### Favorites の現状

- `FavoritesWidget.svelte` が使う IPC: `getFrequentItems` か `sys-starred` タグか？
- `LibraryDetailPanel` のスター操作と Favorites ウィジェットの関係

### 統合候補の整理

- Favorites = `sys-starred` タグで統一可能か？
- 既存 Favorites ウィジェットを sys-starred タグフィルタに変更できるか？

## 成果物

- dispatch-log に「タグ実装現状」セクションを追加
- `refactoring-opportunities.md` または新規 L2 文書に整理結果を記録

## 受け入れ条件

- [x] タグシステムの現状が文書化される（refactoring-opportunities.md §タグシステム現状）
- [x] Favorites → タグ統合の可否が明確になる（統合済み: searchItemsInTag('sys-starred', '')）
- [x] `pnpm verify` 全通過（docs のみなので自明）
