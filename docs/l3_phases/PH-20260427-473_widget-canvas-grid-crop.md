---
id: PH-20260427-473
title: Widget 衝突回避 + Grid 縮小 + Canvas 拡大 + Crop 機能
status: todo
batch: 107
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/state/workspace.svelte.ts
  - src/lib/utils/resize-delta.ts
  - src/lib/utils/widget-grid.ts
---

# PH-473: Widget 衝突回避 + Grid 縮小 + Canvas 拡大 + Crop 機能

## 背景

ユーザー dev fb (2026-04-27):
> グリッドサイズでかいな。画面のスクロール無限とまでは行かなくてもある程度広くしないとウィジット配置しづらいね。
> ウィジットがある部分だけに画面を合わせるクロップ機能もいるよね。
> ウィジットだけど単純に重なるのやめてほしいかな。

現状:
- `WorkspaceWidgetGrid.svelte:54` gap=16, widgetW/H は親算出 (推定 200px 近辺、画面比較で過大)
- canvas 高さは `dynamicCols × maxRow` の自動算出、横は viewport 幅依存
- 重なり: `workspace.svelte.ts:244-247` で move 時自動回避 (findFreePosition fallback)、resize は `resize-delta.ts` の `clampResizeForOverlap` で「rubber-band 縮小」
  → ユーザー視点では「動かしても勝手に飛ぶ」「リサイズしても勝手に縮む」が「重なるのやめて」の本質

## 受け入れ条件

### 機能
- [ ] **Grid cell サイズ**: 現状の約 50% (例 widgetW: 200→112px, gap 16→12px)、最小 widget = 1 cell でも操作しやすいサイズ感
- [ ] **Canvas 拡大**: 横 = `dynamicCols × 1.5`, 縦 = `existing_max_y + 8` を最低保証 (常に空の cell が見える、配置余地)
- [ ] **Canvas 横スクロール**: workspace 領域に `overflow-auto` (これまで縦のみ)、horizontal scrollbar 表示
- [ ] **衝突プレビュー**: drag 中に重なる cell は赤色 invalid highlight、drop すると元位置に戻る (auto-jump 廃止)
- [ ] **resize 衝突**: rubber-band の代わりに「最大ここまで」で stop (現状 clampResizeForOverlap の挙動を変更: 重なり開始ステップで stop、超過分は無視)
- [ ] **Crop ボタン**: workspace toolbar に「Crop to widgets」ボタン (Lucide `Crop`)、押すと bounding box にスクロール + zoom (現状は scroll のみ実装、zoom は別 plan)

### 横展開チェック
- [ ] LibraryGrid に同様の cell 算出ロジックがあるか? あれば一貫性保つ
- [ ] `gap-4` (16px) が widget grid 以外で hardcode されているか grep

### SFDIPOT
- **F**unction: 配置 / 移動 / リサイズで意図しない自動移動が起きない
- **D**ata: cell サイズは CSS 変数 `--widget-w` `--widget-h` で集約済 (流用)
- **I**nterface: WorkspaceLayout で `cropToWidgets()` action 追加
- **P**latform: scroll は CSS 標準、Tauri WebView2 horizontal scrollbar 描画確認

### HICCUPPS
- [Image] Notion / Miro / Tldraw の無限 canvas 慣習
- [User] 「重なるのをやめて」を「衝突 = 操作拒否」に翻訳 (auto-rearrange は予測不能で UX 低下)
- [Consistency] Library カードの S/M/L サイズ感と相対バランス

## 実装ステップ

1. `widget-grid.ts` で cell サイズ計算を更新: widgetW = 112 (現状の半分目安、Codex 相談で調整)、gap = 12
2. `WorkspaceLayout.svelte` で canvas wrap に `overflow-auto`、`min-w-[150%]` で横拡大、`min-h-[(max_y+8)*cellH]` で縦余白
3. `workspace.svelte.ts:moveWidget` 改修: 重なる場合は **元の位置に戻す** (rollback)、findFreePosition は廃止 (drop 失敗を toast で軽く通知)
4. `resize-delta.ts:clampResizeForOverlap` 改修: rubber-band fallback 廃止、重なる手前 step で stop
5. `WorkspaceWidgetGrid.svelte`: drag 中の drop highlight に「重なる場合 = 赤」分岐追加
6. Workspace toolbar に Crop ボタン追加: `cropToWidgets()` で bounding box の左上に scroll
7. E2E: drag → 重なる cell に drop → 元位置 / resize → 重なる手前で stop / Crop ボタンで scroll

## 規約参照

- ux_standards.md (色・モーション)
- engineering-principles §6 (Function 観点)

## 参考

- `widget-grid.ts:clampWidget` (cell 算出)
- `pointer-drag.svelte.ts` (drag state)
