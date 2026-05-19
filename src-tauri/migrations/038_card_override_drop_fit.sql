-- 038: カード見た目設定モーダル刷新 (2026-05-20 user 指示)。
--
-- 画像表示モード (background.fit) selector を撤廃 → 画像は常に全面 cover 固定。
-- あわせて 90 度刻み回転 (background.rotation) field を追加する。
--
-- 既存 card_override_json (TEXT, JSON 文字列) の background から撤廃 field
-- (fit / 旧 mode / focalX / focalY) を除去し、rotation を 0 で初期化することで
-- 既存値を「全面 cover 固定」へ強制移行する。
-- background を持たない override (style / opener のみ) は対象外。

-- 1. 撤廃 field を除去 (存在しない path は json_remove が黙って無視する)
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

-- 2. rotation 未設定の background に 0 (無回転) を付与
UPDATE items
SET card_override_json = json_set(card_override_json, '$.background.rotation', 0)
WHERE card_override_json IS NOT NULL
  AND json_valid(card_override_json) = 1
  AND json_type(card_override_json, '$.background') = 'object'
  AND json_extract(card_override_json, '$.background.rotation') IS NULL;
