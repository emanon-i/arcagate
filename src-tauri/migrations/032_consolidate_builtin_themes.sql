-- #7: builtin テーマを Dark / Light の 2 本に集約。
--
-- 旧 builtin プリセット (空の Dark / Light、色違い 5 種: Cyan Steel / Coral Wine /
-- Lime Forest / Magenta Plum / Lemon Sun) と旧 glass テーマを整理し、glass 質感の
-- Dark / Light 2 本に統合する。theme 識別子は 'dark' / 'light'。
--
-- 既存 user の theme_mode (config) が削除対象 / 旧 ID を指していた場合は 'dark' /
-- 'light' に remap する。'system' (OS 追従) と custom theme は維持。
-- custom theme 機能 (clone / import / theme editor) の plumbing は残す。

-- 1. config.theme_mode の remap (themes 変更より先に、旧 ID 参照のまま実行)
UPDATE config SET value = 'dark'
 WHERE key = 'theme_mode'
   AND value IN (
       'theme-builtin-liquid-glass', 'theme-builtin-dark', 'theme-builtin-endfield',
       'theme-builtin-ubuntu-frosted', 'theme-builtin-lime-forest',
       'theme-builtin-magenta-plum', 'theme-builtin-lemon-sun'
   );

UPDATE config SET value = 'light'
 WHERE key = 'theme_mode' AND value = 'theme-builtin-light';

-- 2. 旧 builtin themes を削除 (空テーマ + 色プリセット)
DELETE FROM themes WHERE id IN (
    'theme-builtin-dark',
    'theme-builtin-light',
    'theme-builtin-endfield',
    'theme-builtin-ubuntu-frosted',
    'theme-builtin-lime-forest',
    'theme-builtin-magenta-plum',
    'theme-builtin-lemon-sun'
);

-- 3. 旧 glass テーマを Dark テーマ (id='dark') に転用 (css_vars / base_theme は流用)
UPDATE themes SET id = 'dark', name = 'Dark' WHERE id = 'theme-builtin-liquid-glass';

-- 4. Light テーマを追加 (Dark を tonally invert、backdrop blur / radius は同値)
INSERT OR IGNORE INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
    (
        'light',
        'Light',
        'light',
        '{
            "--ag-bg": "linear-gradient(135deg, #eef1f7 0%, #e2e8f3 50%, #eef1f7 100%)",
            "--ag-surface-page": "#eef1f7",
            "--ag-surface-0": "rgba(255,255,255,0.45)",
            "--ag-surface-1": "rgba(255,255,255,0.55)",
            "--ag-surface-2": "rgba(255,255,255,0.62)",
            "--ag-surface-3": "rgba(255,255,255,0.72)",
            "--ag-surface-4": "rgba(255,255,255,0.85)",
            "--ag-surface-opaque": "rgba(248,250,253,0.88)",
            "--ag-border": "rgba(15,23,42,0.12)",
            "--ag-border-hover": "rgba(15,23,42,0.24)",
            "--ag-border-dashed": "rgba(15,23,42,0.14)",
            "--ag-accent": "#2563eb",
            "--ag-accent-text": "#1d4ed8",
            "--ag-accent-bg": "rgba(37,99,235,0.10)",
            "--ag-accent-border": "rgba(37,99,235,0.32)",
            "--ag-accent-active-bg": "rgba(37,99,235,0.16)",
            "--ag-accent-active-border": "rgba(37,99,235,0.48)",
            "--ag-text-primary": "rgba(15,23,42,0.92)",
            "--ag-text-secondary": "rgba(15,23,42,0.64)",
            "--ag-text-muted": "rgba(15,23,42,0.46)",
            "--ag-text-faint": "rgba(15,23,42,0.32)",
            "--ag-error-bg": "rgba(220,38,38,0.10)",
            "--ag-error-border": "rgba(220,38,38,0.32)",
            "--ag-error-text": "#b91c1c",
            "--ag-shadow-sm": "0 2px 8px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.65)",
            "--ag-shadow-md": "0 4px 20px rgba(15,23,42,0.13), inset 0 1px 0 rgba(255,255,255,0.75)",
            "--ag-shadow-lg": "0 8px 40px rgba(15,23,42,0.17), inset 0 1px 0 rgba(255,255,255,0.85)",
            "--ag-shadow-dialog": "0 12px 60px rgba(15,23,42,0.20), 0 0 0 1px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
            "--ag-radius-card": "16px",
            "--ag-radius-widget": "20px",
            "--ag-backdrop": "blur(20px) saturate(180%)"
        }',
        1
    );
