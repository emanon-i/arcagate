---
id: PH-20260425-259
status: done
batch: 61
type: 改善
---

# PH-259: アイテム表示固定サイズ + S/M/L プリセット

## 背景・目的

現在のアイテムカードサイズはウィンドウ幅で変動する設計（widgetZoom）。
実機フィードバックにより「固定サイズ + S/M/L プリセットを Settings から選択」に変更する。

## 設計

- S: アイコン 40px / ラベル省略 (1行)
- M: アイコン 56px / ラベル 2行
- L: アイコン 72px / ラベル 2行 + メタ情報

ux_standards.md に S/M/L の数値定義を追記。
configStore に `itemSize: 'S' | 'M' | 'L'` を追加して永続化。

## 実装ステップ

### Step 1: ux_standards.md にサイズ定義追記

### Step 2: DB マイグレーション + configStore 更新

- config テーブルに `item_size` (S/M/L) を追加
- configStore に `itemSize` getter/setter を追加

### Step 3: LibraryCard.svelte / ItemCard コンポーネント修正

- `configStore.itemSize` に基づいてサイズクラスを切り替え

### Step 4: Settings に S/M/L セレクター UI 追加

### Step 5: pnpm verify

## 受け入れ条件

- [x] Settings から S/M/L を切り替えられる
- [x] Library のアイテムカードがサイズに追従する
- [x] Workspace のウィジェット内アイテムもサイズに追従する（FavoritesWidget / RecentLaunchesWidget アイコン）
- [x] 再起動後もサイズ設定が保持される（DB config `item_size` キー）
- [x] `pnpm verify` 全通過
