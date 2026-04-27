---
id: PH-20260427-473
title: Widget 衝突回避 + Grid 縮小 + Canvas 拡大 + Crop 機能
status: done
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

- [x] **Grid cell サイズ**: 320×180 → 160×100 (50% 縮小)、widget-zoom.svelte.ts BASE_W/H 更新、aspect 16:10 でハンドル + × button + move bar 余裕
- [x] **Canvas 拡大**: maxRow を `Math.max(8, max_y + 4)` で常に下方に 4 行余白を確保 (WorkspaceLayout.svelte)
- [x] **Canvas 横スクロール**: 既存 `overflow-auto` で対応 (WorkspaceLayout.svelte:326)
- [x] **衝突プレビュー**: drop highlight が「衝突 cell = 赤 destructive、空 cell = accent」分岐 (`workspaceStore.wouldOverlapAt` / `isCellOccupied` 新 helper 経由)
- [x] **moveWidget の auto-rearrange 廃止**: 重なる場合は **配置を拒否**、error toast、findFreePosition fallback 削除
- [x] **resize 衝突**: rubber-band fallback 廃止、`clampResizeForOverlap` を「重なる手前 step で stop」に変更 (lastSafe 戦略)
- [x] **Crop ボタン**: workspace 右下 floating (Lucide `Crop`)、bounding box の左上にスムーズスクロール (zoom は別 plan)

### 横展開チェック

- [x] LibraryGrid は cell サイズ独自管理 (LibraryCard itemSize)、widget grid と分離されており影響なし
- [x] `gap-4` (16px) hardcode は workspace 関連 4 箇所のみ (調整は将来 token 化で対応、PH-475 と整合)

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
