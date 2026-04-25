---
id: PH-20260425-262
status: done
batch: 61
type: 改善
---

# PH-262: Item Widget（単一アイテムウィジェット）

## 背景・目的

実機フィードバック: 「アイテム単体を Workspace に置けるウィジェット」が欲しい。
汎用プレースホルダとして配置 → 設定でアイテムを選ぶ 2 段階 UX。

## UX フロー

1. Workspace 編集モードのサイドバーから **Item Widget** を D&D で配置
2. 初期状態: 「アイテムを選択」ボタン
3. ボタンクリック → `LibraryItemPicker.svelte`（検索 + 選択 UI）
4. 選択後: アイコン + ラベル + クリックで起動
5. 右クリックメニュー → 「アイテム変更」で再ピッカー

## DB / IPC

- `widget_type` = `'item'` を追加（Rust enum + migration）
- `widget_config.itemId: string | null` で紐付け
- `cmd_update_widget_config` IPC で保存

## 新規コンポーネント

- `ItemWidget.svelte`: ウィジェット本体
- `LibraryItemPicker.svelte`: 検索 + 選択 UI（PaletteOverlay 類似）

## 受け入れ条件

- [x] Item Widget を Workspace に配置できる（WorkspaceSidebar + widgetComponents 登録）
- [x] アイテムを選択・変更できる（LibraryItemPicker.svelte + WidgetShell メニュー）
- [x] 選択後クリックでアイテム起動
- [x] widget_config（item_id）が永続化される（cmd_update_widget_config）
- [x] `pnpm verify` 全通過
