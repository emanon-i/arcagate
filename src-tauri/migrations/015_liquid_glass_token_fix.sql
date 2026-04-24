UPDATE themes
SET css_vars = json_patch(css_vars, '{"--ag-surface-page": "#0d1117"}')
WHERE id = 'theme-builtin-liquid-glass';
