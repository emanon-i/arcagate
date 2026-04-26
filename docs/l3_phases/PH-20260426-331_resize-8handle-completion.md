---
id: PH-20260426-331
status: todo
batch: 75
type: 改善
---

# PH-331: Workspace 8 ハンドル resize 完成（n / w / nw / ne / sw）

## 横展開チェック実施済か

- batch-70 で e / s / se の 3 ハンドルは実装済、残り 5 つは optimisticMoveAndResize() API が無いため未実装
- `position_x` / `position_y` を変更する resize は単純な width/height 変更と異なる
- pointer-drag.svelte と grid-cell 計算が共通のロジックを持っているか確認

## 仕様

- `workspaceStore.optimisticMoveAndResize(id, x, y, w, h)` を追加（updateWidgetPosition の wrapper）
- WorkspaceWidgetGrid の handle dispatch を `dir: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'` 8 種対応
- 各 dir で start position + delta を grid step に丸めて (x, y, w, h) を計算
- cursor 別: ns-resize / ew-resize / nesw-resize / nwse-resize
- aria-label: 「上端を移動 / 左端を移動 / 左上角を移動」等、機能文言で

## 受け入れ条件

- [ ] 8 方向すべてのハンドルが clamp 内で動作（負の x / y にならない）
- [ ] cursor が dir に応じて変わる
- [ ] aria-label が機能文言（ラベル原則準拠）
- [ ] `pnpm verify` 全通過
