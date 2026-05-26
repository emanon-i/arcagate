-- F3 根治: 6 builtin の `themes.css_vars` を空 '{}' から **CSS [data-theme]/.dark/:root と
-- 等価の実値 JSON** に書き換える。 audit `docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md`
-- §推奨 A 案の根治実装。
--
-- 真因 (詳細は audit doc §2):
--   builtin の `css_vars` が空 '{}' で seed されており、 aesthetic は `arcagate-theme.css` の
--   `[data-theme='ID']` / `.dark` / `:root` block (CSS) が source of truth。 ただし
--   `cloneTheme(sourceId)` は `source.css_vars` をそのまま新 custom (`data-theme=<uuid>`) に
--   copy するため、 builtin を source にすると **空 cssVars が新 custom に伝播** し、
--   `[data-theme='<uuid>']` block は存在しないので CSS-side aesthetic が effect せず default
--   Dark / Light にフォールバックする (brutalist-dark をコピーしたら default Dark になる)。
--
-- 修正方針 (A 案):
--   builtin の `css_vars` を **CSS block と等価の実値 JSON** で seed する。 `cloneTheme` は
--   実装変更不要 — DB 値が実値になれば新 custom にも同じ token が inline 適用され、
--   `applyTheme()` (theme.svelte.ts:72-110) の既存経路で aesthetic が再現する。
--
-- ユーザーデータの不可侵 (重要):
--   既存 user の **custom theme** (`is_builtin = 0`) は触らない。 過去の壊れた cloneTheme で
--   `css_vars='{}'` のまま保存された custom (= default Dark 化けして見えるユーザー作成テーマ)
--   は本 migration の対象外。 ユーザーの編集成果物を不可逆に書き換えないため、 `is_builtin = 1`
--   を必ず述語に含める。
--
-- 静的 CSS ブロックの扱い:
--   `arcagate-theme.css` の `[data-theme='neumorph']` 等の block は **defense-in-depth として残す**。
--   理由は `[data-theme='brutalist']` / `[data-theme='brutalist-dark']` が `body::before` pseudo-element
--   で dotted grid 背景を描く rule を持ち、 これは CSS variable では表現できないため SSOT 統合
--   (CSS 削除) は不可。 DB seed と CSS の **主要 token** が一致していることは
--   `scripts/audit-builtin-theme-css-vars.sh` で機械検出する。
--
-- forward-only: 本 migration は単方向。 既存 custom には触らない / builtin の css_vars のみ
-- 書き換えるため rollback 不要。

-- 1. Dark (glass) — base_theme='dark', .dark class が effect する builtin。 .dark block の
-- LAYER 1 seeds + LAYER 2 primitives + shadow 群を seed。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.17 0.013 260)","--c-fg":"oklch(0.96 0.004 250)","--c-primary":"oklch(0.50 0.14 215)","--c-glass-tint":"oklch(0.99 0.004 250)","--c-warn":"oklch(0.82 0.15 80)","--c-error":"oklch(0.68 0.17 25)","--c-success":"oklch(0.78 0.14 155)","--scrim":"oklch(0 0 0 / 0.6)","--scrim-dim":"oklch(0 0 0 / 0.2)","--surface-blur":"blur(16px) saturate(180%)","--surface-noise-opacity":"0.04","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-shadow-sm":"0 1px 3px oklch(0 0 0 / 0.3), 0 1px 2px oklch(0 0 0 / 0.2)","--ag-shadow-md":"0 4px 12px oklch(0 0 0 / 0.4), 0 2px 4px oklch(0 0 0 / 0.2)","--ag-shadow-lg":"0 8px 40px oklch(0 0 0 / 0.5), 0 4px 16px oklch(0 0 0 / 0.3)","--ag-shadow-dialog":"0 8px 32px oklch(0 0 0 / 0.5), 0 4px 12px oklch(0 0 0 / 0.3)","--ag-shadow-palette":"0 16px 48px oklch(0 0 0 / 0.6), 0 8px 16px oklch(0 0 0 / 0.4)","--ag-widget-shadow-hover":"var(--ag-shadow-md)","--ag-surface-tint":"linear-gradient(135deg, color-mix(in oklab, var(--c-glass-tint), transparent 96%) 0%, transparent 60%)"}'
 WHERE id = 'dark' AND is_builtin = 1;

-- 2. Light (glass) — base_theme='light', :root LAYER 1 seeds + LAYER 2 primitives を seed
-- (`:root` 既定値と等価)。 clone path は light に関しては既に正しく動くが、 全 builtin で
-- 「css_vars が theme アイデンティティの完全表現」 という convention を統一するため seed。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.985 0.003 250)","--c-fg":"oklch(0.22 0.02 260)","--c-primary":"oklch(0.50 0.14 215)","--c-glass-tint":"oklch(0.99 0.004 250)","--c-warn":"oklch(0.74 0.16 75)","--c-error":"oklch(0.58 0.20 25)","--c-success":"oklch(0.66 0.15 150)","--scrim":"oklch(0 0 0 / 0.45)","--scrim-dim":"oklch(1 0 0 / 0.25)","--surface-blur":"blur(8px) saturate(160%)","--surface-noise-opacity":"0","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px"}'
 WHERE id = 'light' AND is_builtin = 1;

-- 3. Brutalist (light base) — :root + [data-theme='brutalist'] block の overrides を seed。
-- font-family-display の `'Cascadia Code', 'Consolas', ...` は SQL 文字列内で single quote を
-- '' で escape。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.99 0 0)","--c-fg":"oklch(0.16 0 0)","--c-primary":"oklch(0.50 0.22 28)","--c-secondary":"oklch(0.50 0.22 28)","--c-glass-tint":"oklch(1 0 0)","--c-warn":"oklch(0.62 0.18 75)","--c-error":"oklch(0.52 0.22 25)","--c-success":"oklch(0.55 0.16 150)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.06","--bg-pattern-color":"var(--c-fg)"}'
 WHERE id = 'brutalist' AND is_builtin = 1;

-- 4. Brutalist Dark — .dark + [data-theme='brutalist-dark'] block の overrides を seed。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.14 0 0)","--c-fg":"oklch(0.96 0 0)","--c-primary":"oklch(0.50 0.20 28)","--c-secondary":"oklch(0.50 0.20 28)","--c-glass-tint":"oklch(0.16 0 0)","--c-warn":"oklch(0.70 0.16 75)","--c-error":"oklch(0.58 0.20 25)","--c-success":"oklch(0.62 0.15 150)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.10","--bg-pattern-color":"var(--c-fg)"}'
 WHERE id = 'brutalist-dark' AND is_builtin = 1;

-- 5. Neumorph (light base) — :root + [data-theme='neumorph'] block の overrides を seed。
-- pastel solid + dual shadow、 blur 無し。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.93 0.012 270)","--c-fg":"oklch(0.34 0.02 270)","--c-primary":"oklch(0.50 0.10 280)","--c-glass-tint":"oklch(0.99 0.004 270)","--c-warn":"oklch(0.78 0.11 75)","--c-error":"oklch(0.64 0.14 25)","--c-success":"oklch(0.72 0.10 150)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.75)","--shadow-outer-dark":"5px 5px 14px oklch(0.55 0.03 270 / 0.35)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)"}'
 WHERE id = 'neumorph' AND is_builtin = 1;

-- 6. Neumorph Dark — .dark + [data-theme='neumorph-dark'] block の overrides を seed。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.22 0.012 270)","--c-fg":"oklch(0.92 0.01 270)","--c-primary":"oklch(0.50 0.10 280)","--c-glass-tint":"oklch(0.99 0.004 270)","--c-warn":"oklch(0.78 0.13 75)","--c-error":"oklch(0.64 0.16 25)","--c-success":"oklch(0.66 0.13 150)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.05)","--shadow-outer-dark":"5px 5px 14px oklch(0 0 0 / 0.55)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)"}'
 WHERE id = 'neumorph-dark' AND is_builtin = 1;
