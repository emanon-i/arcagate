---
id: PH-20260425-260
status: todo
batch: 61
type: 改善
---

# PH-260: multi-item ウィジェット フィルタ + ソート共通化

## 背景・目的

RecentLaunchesWidget / FavoritesWidget / ProjectsWidget など複数アイテムを表示する
ウィジェット全般に、フィルタと ソート機能を追加する。
widget instance 単位で設定を永続化（`widget_config` JSON）。

## 設計

### 共通コンポーネント

`WidgetItemList.svelte` を抽出:

- Props: `items: Item[]`, `filterConfig: FilterConfig`, `sortConfig: SortConfig`
- フィルタ: type / tag / 検索文字列
- ソート: 名前 / 最終起動 / 頻度

### 永続化

`widget_config.filterConfig` + `widget_config.sortConfig` として JSON 保存。
`cmd_update_widget_config` IPC で更新。

## 実装ステップ

### Step 1: FilterConfig / SortConfig 型定義

### Step 2: WidgetItemList.svelte 作成

### Step 3: 各ウィジェットに適用

### Step 4: pnpm verify

## 受け入れ条件

- [ ] RecentLaunchesWidget にフィルタ + ソート UI が追加される
- [ ] 設定が widget instance 単位で永続化される
- [ ] 再起動後も設定が保持される
- [ ] `pnpm verify` 全通過
