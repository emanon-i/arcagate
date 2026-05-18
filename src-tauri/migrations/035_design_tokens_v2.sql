-- Design tokens v2 — seed + 色彩学派生方式へ刷新、 built-in に aesthetic 3 本を追加。
--
-- migration 032 (consolidate) で built-in は Dark / Light 2 本 (id='dark'/'light') に
-- 集約済。 v2 では Dark / Light を seed 駆動 (look は arcagate-theme.css の :root/.dark
-- が定義) に戻すため css_vars override を空にし、 aesthetic theme 3 本
-- (Neumorph / Brutalist / HUD) を追加して built-in 5 本構成にする。
-- aesthetic theme の seeds + aesthetic primitives は CSS の [data-theme] block で定義
-- するため css_vars は空 {} で良い。 custom theme は従来どおり css_vars を保持。

-- 1. Dark / Light を seed 駆動へ — css_vars override を撤去
UPDATE themes SET css_vars = '{}' WHERE id IN ('dark', 'light');

-- 2. aesthetic theme 3 本を追加 (seeds + aesthetic は arcagate-theme.css の [data-theme] block)
INSERT OR IGNORE INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
  ('neumorph',  'Neumorph',  'light', '{}', 1),
  ('brutalist', 'Brutalist', 'light', '{}', 1),
  ('hud',       'HUD',       'dark',  '{}', 1);
