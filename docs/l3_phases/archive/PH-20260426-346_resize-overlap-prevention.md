---
id: PH-20260426-346
status: done
batch: 78
type: 改善
---

# PH-346: Resize 時の他ウィジェット重なり防止（batch-76 PH-337 持越）

## 横展開チェック実施済か

- batch-75 で 8 ハンドル resize 完成、ただし他ウィジェットへの overlap チェック未実装
- workspaceStore.moveWidget には isOverlapping / findFreePosition があるので同思想で resize にも

## 仕様

- `resize-delta.ts` に `clampResizeForOverlap` 純粋関数追加
- 提案 rect が他ウィジェットと重なれば、重ならない最大サイズに 1 step 単位で縮める
- WorkspaceWidgetGrid の resize handler で computeResize 後に clampResizeForOverlap を通す
- vitest 5 件以上で挙動確認

## 受け入れ条件

- [ ] resize で他ウィジェットの上に被らない
- [ ] 重なる方向は手前で止まる（オリジナル位置に戻らない rubber-band 動作）
- [ ] vitest 5 件以上 pass
- [ ] `pnpm verify` 全通過
