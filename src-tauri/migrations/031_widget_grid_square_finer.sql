-- K-10 part 2 (2026-05-16): widget grid を **square + 半分の granularity** に再構成。
--
-- 旧 BASE_W = 240, BASE_H = 135 (16:9 rect cells) は user 報告 K-10:
--   1. 「縦と横の移動量が違う」 = move/resize step ratio mismatch
--   2. 「1 段階細かく」 = grid granularity finer
-- を満たさないため、 BASE_W = BASE_H = 120 (square 1:1 + 半分 finer) に変更。
--
-- 既存 widget の cell 座標 (position_x, position_y, width, height) を **pixel 視覚
-- 位置/サイズを概ね保つように migration**:
--   - x_pixel(old) = position_x * 240、 y_pixel(old) = position_y * 135
--   - x_pixel(new) = new_x * 120 = old_x * 240  → new_x = old_x * 2
--   - y_pixel(new) = new_y * 120 = old_y * 135  → new_y = old_y * 9/8
--   - width / height も同様 (W は 2x、 H は 9/8x)
--
-- SQLite には ROUND() があるが integer 演算で `(n * 9 + 4) / 8` は round-half-up
-- 等価 (e.g., old_y=10 → (90+4)/8=11.75 → integer div=11、 = round(11.25)=11)。
-- 不整数 sub-pixel drift は最大 ±60px 程度 (旧 cellH 135 の半分以下) で実用上
-- 視覚的に許容、 user は migration 後に好みで再配置可能。
--
-- 適用 timing: 既存 user の Arcagate 起動時に 1 回 idempotent 実行 (migrations
-- runner 経由)。 ROLLBACK は app 旧版を install し直すか手で逆変換 (= x/2, y*8/9)。

UPDATE workspace_widgets
SET
    position_x = position_x * 2,
    width = width * 2,
    position_y = (position_y * 9 + 4) / 8,
    height = (height * 9 + 4) / 8;
