-- PH-290: items に card_override_json (per-card 背景・文字 override) カラム追加
-- NULL = global default を使う

ALTER TABLE items ADD COLUMN card_override_json TEXT;
