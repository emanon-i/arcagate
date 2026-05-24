-- PH-CF-800 F1: built-in テーマを 6 本に再編成 (option A 確定、2026-05-23 user 承認)。
--
-- 系統 × Dark/Light の対で 3 系統 × 2 = 6 本 (HUD は組み込みから削除):
--   1. dark           = glass デフォルト Dark
--   2. light          = glass デフォルト Light
--   3. brutalist-dark = ブルータリスト Dark (NEW)
--   4. brutalist      = ブルータリスト Light
--   5. neumorph-dark  = ニューモーフ Dark (NEW)
--   6. neumorph       = ニューモーフ Light
--
-- 並び順 (`sort_order`): 系統内 Dark → Light を優先し、 dark=0 / light=1 /
-- brutalist-dark=2 / brutalist=3 / neumorph-dark=4 / neumorph=5。
-- aesthetic look は `arcagate-theme.css` の `[data-theme]` block で定義 (migration 035 と同方針)。
-- HUD 削除理由 (user 判断): 「印象が薄いので不要」。 HUD 選択中だった config は
-- `theme_mode='dark'` にフォールバック (migration 036 の system→dark fallback と同 pattern)。

-- 1. themes table に sort_order 列を追加 (default は NULL = custom theme 用、 builtin は 0..5)。
ALTER TABLE themes ADD COLUMN sort_order INTEGER;

-- 2. 既存 builtin (dark / light / brutalist / neumorph) の sort_order をセット。
UPDATE themes SET sort_order = 0 WHERE id = 'dark';
UPDATE themes SET sort_order = 1 WHERE id = 'light';
UPDATE themes SET sort_order = 3 WHERE id = 'brutalist';
UPDATE themes SET sort_order = 5 WHERE id = 'neumorph';

-- 3. Dark variant 2 本を新規追加 (look は arcagate-theme.css の [data-theme] block で定義、
--    css_vars は空 '{}' で良い — migration 035 と同方針)。 NEW: brutalist-dark / neumorph-dark。
INSERT OR IGNORE INTO themes (id, name, base_theme, css_vars, is_builtin, sort_order) VALUES
  ('brutalist-dark', 'Brutalist Dark', 'dark', '{}', 1, 2),
  ('neumorph-dark',  'Neumorph Dark',  'dark', '{}', 1, 4);

-- 4. HUD 選択中だった config を Dark に縮退 (themes 削除より先に、 参照を切る)。
UPDATE config SET value = 'dark'
 WHERE key = 'theme_mode' AND value = 'hud';

-- 5. HUD を builtin から削除 (DB 上の row を消去、 CSS / TS 側の参照は同 PR で除去)。
DELETE FROM themes WHERE id = 'hud';
