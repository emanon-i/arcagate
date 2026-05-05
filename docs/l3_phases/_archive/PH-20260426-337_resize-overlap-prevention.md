---
id: PH-20260426-337
status: todo
batch: 76
type: 改善
---

# PH-337: Resize 時の他ウィジェット重なり防止

## 横展開チェック実施済か

- batch-75 で 8 ハンドル resize 完成、ただし他ウィジェットへの overlap チェック未実装
- workspaceStore.moveWidget には isOverlapping / findFreePosition があるので同思想で resize にも

## 仕様

- `optimisticMoveAndResize` を呼ぶ前に「(x, y, w, h) が他ウィジェットと重なるか」をチェック
- 重なる場合は重ならない最大サイズに丸めて表示（rubber-band 動作）
- 既存の `clampWidget` 関数と統合
- resize-delta の computeResize 出力をそのまま使うのではなく、overlap-aware に弾く層を追加

## 受け入れ条件

- [ ] resize で他ウィジェットの上に被らない
- [ ] 重なりそうな方向は手前で止まる（オリジナル位置に戻らない）
- [ ] vitest: overlap 検出ロジックの純粋関数テスト 5 件
- [ ] `pnpm verify` 全通過
