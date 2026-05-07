-- D-5 / D-6: Theme palette 差別化 + rename。
--
-- 1. 既存 builtin themes の rename (id 維持で user selection 失わず):
--    - theme-builtin-endfield: 'Endfield' → 'Cyan Steel'
--    - theme-builtin-ubuntu-frosted: 'Ubuntu Frosted' → 'Coral Wine'
--
-- 2. 既存 builtin themes の css_vars に accent-secondary / -tertiary 追加 (json_patch)
--
-- 3. 新 builtin themes 3 件 INSERT (Lime Forest / Magenta Plum / Lemon Sun)、
--    各 theme は独立色相 (primary/secondary/tertiary を全然違う hue で構成)。

-- 1. Cyan Steel (rename + 新 vars)
UPDATE themes
SET
    name = 'Cyan Steel',
    css_vars = json_patch(css_vars, json('{
        "--ag-accent-secondary": "#a78bfa",
        "--ag-accent-secondary-bg": "rgba(167,139,250,0.10)",
        "--ag-accent-secondary-border": "rgba(167,139,250,0.20)",
        "--ag-accent-tertiary": "#34d399",
        "--ag-accent-tertiary-bg": "rgba(52,211,153,0.10)",
        "--ag-accent-tertiary-border": "rgba(52,211,153,0.20)"
    }'))
WHERE id = 'theme-builtin-endfield';

-- 2. Coral Wine (rename + 新 vars、紫ベースに gold accent secondary / amber tertiary)
UPDATE themes
SET
    name = 'Coral Wine',
    css_vars = json_patch(css_vars, json('{
        "--ag-accent-secondary": "#fbbf24",
        "--ag-accent-secondary-bg": "rgba(251,191,36,0.10)",
        "--ag-accent-secondary-border": "rgba(251,191,36,0.20)",
        "--ag-accent-tertiary": "#f97316",
        "--ag-accent-tertiary-bg": "rgba(249,115,22,0.10)",
        "--ag-accent-tertiary-border": "rgba(249,115,22,0.20)"
    }'))
WHERE id = 'theme-builtin-ubuntu-frosted';

-- 3. Lime Forest (新 builtin、green primary + emerald secondary + amber tertiary)
INSERT OR IGNORE INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
    (
        'theme-builtin-lime-forest',
        'Lime Forest',
        'dark',
        '{
            "--ag-bg": "#0f1f12",
            "--ag-surface-1": "#152a18",
            "--ag-surface-2": "#1a341d",
            "--ag-surface-3": "#1f3e22",
            "--ag-surface-4": "#264827",
            "--ag-surface-opaque": "#152a18",
            "--ag-border": "#2e5a32",
            "--ag-accent": "#a3e635",
            "--ag-accent-text": "#a3e635",
            "--ag-accent-bg": "rgba(163,230,53,0.12)",
            "--ag-accent-border": "rgba(163,230,53,0.35)",
            "--ag-accent-secondary": "#10b981",
            "--ag-accent-secondary-bg": "rgba(16,185,129,0.12)",
            "--ag-accent-secondary-border": "rgba(16,185,129,0.35)",
            "--ag-accent-tertiary": "#fbbf24",
            "--ag-accent-tertiary-bg": "rgba(251,191,36,0.12)",
            "--ag-accent-tertiary-border": "rgba(251,191,36,0.35)",
            "--ag-text-primary": "#dceedc",
            "--ag-text-secondary": "#9bc09b",
            "--ag-text-muted": "#6a8c6c",
            "--ag-text-faint": "#456a48",
            "--ag-error-bg": "rgba(255,60,60,0.10)",
            "--ag-error-border": "rgba(255,60,60,0.30)",
            "--ag-error-text": "#ff6060"
        }',
        1
    );

-- 4. Magenta Plum (新 builtin、magenta primary + plum secondary + pink tertiary)
INSERT OR IGNORE INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
    (
        'theme-builtin-magenta-plum',
        'Magenta Plum',
        'dark',
        '{
            "--ag-bg": "#1a0e1f",
            "--ag-surface-1": "#221329",
            "--ag-surface-2": "#2a1834",
            "--ag-surface-3": "#321d3f",
            "--ag-surface-4": "#3c244c",
            "--ag-surface-opaque": "#221329",
            "--ag-border": "#4a3060",
            "--ag-accent": "#e879f9",
            "--ag-accent-text": "#e879f9",
            "--ag-accent-bg": "rgba(232,121,249,0.12)",
            "--ag-accent-border": "rgba(232,121,249,0.35)",
            "--ag-accent-secondary": "#a855f7",
            "--ag-accent-secondary-bg": "rgba(168,85,247,0.12)",
            "--ag-accent-secondary-border": "rgba(168,85,247,0.35)",
            "--ag-accent-tertiary": "#fb7185",
            "--ag-accent-tertiary-bg": "rgba(251,113,133,0.12)",
            "--ag-accent-tertiary-border": "rgba(251,113,133,0.35)",
            "--ag-text-primary": "#f0dcf0",
            "--ag-text-secondary": "#c0a0c0",
            "--ag-text-muted": "#8a6890",
            "--ag-text-faint": "#604870",
            "--ag-error-bg": "rgba(255,80,80,0.10)",
            "--ag-error-border": "rgba(255,80,80,0.30)",
            "--ag-error-text": "#ff7070"
        }',
        1
    );

-- 5. Lemon Sun (新 builtin、yellow primary + tangerine secondary + cherry tertiary)
INSERT OR IGNORE INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
    (
        'theme-builtin-lemon-sun',
        'Lemon Sun',
        'dark',
        '{
            "--ag-bg": "#1f1a0d",
            "--ag-surface-1": "#2a2412",
            "--ag-surface-2": "#332d18",
            "--ag-surface-3": "#3d361e",
            "--ag-surface-4": "#473f25",
            "--ag-surface-opaque": "#2a2412",
            "--ag-border": "#5a4f30",
            "--ag-accent": "#facc15",
            "--ag-accent-text": "#facc15",
            "--ag-accent-bg": "rgba(250,204,21,0.12)",
            "--ag-accent-border": "rgba(250,204,21,0.35)",
            "--ag-accent-secondary": "#fb923c",
            "--ag-accent-secondary-bg": "rgba(251,146,60,0.12)",
            "--ag-accent-secondary-border": "rgba(251,146,60,0.35)",
            "--ag-accent-tertiary": "#dc2626",
            "--ag-accent-tertiary-bg": "rgba(220,38,38,0.12)",
            "--ag-accent-tertiary-border": "rgba(220,38,38,0.35)",
            "--ag-text-primary": "#f0eada",
            "--ag-text-secondary": "#c0b890",
            "--ag-text-muted": "#8a8260",
            "--ag-text-faint": "#605840",
            "--ag-error-bg": "rgba(255,80,80,0.10)",
            "--ag-error-border": "rgba(255,80,80,0.30)",
            "--ag-error-text": "#ff7070"
        }',
        1
    );
