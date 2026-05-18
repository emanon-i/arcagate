-- OS テーマ追従モード ('system') を撤廃。
--
-- 撤廃理由: aesthetic theme (Neumorph / Brutalist / HUD) はそれぞれ 1 本のみで
-- Dark/Light ペアを持たない。'system' を残すと「HUD で system 選択時に Dark/Light
-- どちらが出るか」が定義不能になり矛盾するため、theme selector ごと撤去する。
--
-- 既存 user の config.theme_mode が 'system' を指していた場合は Dark へフォールバック。
UPDATE config SET value = 'dark'
 WHERE key = 'theme_mode' AND value = 'system';
