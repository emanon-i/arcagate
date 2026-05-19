-- 038: カード見た目設定の表示モード (background.fit) 撤廃。
--
-- カード画像は常に全面 cover 表示で固定 (2026-05-20 user 指示、表示モード選択廃止)。
-- 既存 card_override_json の background から表示モード関連 key を除去する:
--   - fit          (#531 期: 'cover' | 'contain' | 'center')
--   - mode          (#513 期 legacy: 'icon' | 'image')
--   - focalX/focalY (#513 期 legacy: offset の旧名)
-- offsetX / offsetY / rotation は残す。
-- json_remove は存在しない path を no-op 扱いするため、 mixed-schema な既存 data でも安全。

UPDATE items
SET card_override_json = json_remove(
        card_override_json,
        '$.background.fit',
        '$.background.mode',
        '$.background.focalX',
        '$.background.focalY'
    )
WHERE card_override_json IS NOT NULL
  AND json_valid(card_override_json) = 1
  AND json_type(card_override_json, '$.background') = 'object';
