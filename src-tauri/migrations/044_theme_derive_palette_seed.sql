-- PR #588 (audit `docs/l3_phases/audit/BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md` §5 + §B):
-- 6 builtin の `themes.css_vars` を **`derivePalette()` (utils/derive-palette.ts) 出力 +
-- 新 chain (`--ag-surface-tint-strength` / `--c-info`) 込み** で再 seed する。
--
-- 動機:
--   1. 派生 token を「primary + secondary + aesthetic + base から計算する純関数」 に統一する
--      (migration / CSS static block / ThemeEditor の 3 経路が `derivePalette()` 単一 source)。
--   2. semantic 軸を 4 つに拡張 (warn / error / success / **info**) し、 hue は canonical 固定 /
--      L・C は aesthetic × base で calibrate (audit §B.1 「dominant 領域に色気を載せる」 案 α の
--      代替実装 — neutral grey surface に primary hue を chain で 30% mix)。
--   3. `--ag-surface-tint-strength` を builtin ごとに seed (glass = 30% / brutalist & neumorph = 0%)
--      → glass dark/light の「中立グレー一色」 を解消、 brutalist / neumorph は世界観を温存。
--   4. migration 043 の clone-fidelity gate (`scripts/audit-builtin-theme-css-vars.sh`) を維持。
--      `--c-info` を必須 token に追加して新 chain の seed 漏れを fail-closed gate。
--
-- ユーザーデータの不可侵 (重要):
--   既存 user の **custom theme** (`is_builtin = 0`) は触らない。 必ず `is_builtin = 1` を述語に
--   含める (migration 043 と同じ guard)。
--
-- generator: `pnpm dlx tsx scripts/gen-mig-044.mts` で derivePalette を 6 builtin に流して JSON
-- を出力 → 本 migration に貼り付け。 derive 関数の TS unit test (derive-palette.test.ts) が
-- semantic 軸の canonical hue / chroma 帯 / lightness 順序を gate する。
--
-- forward-only: 本 migration は単方向。 builtin の css_vars のみ書き換える / 既存 custom は不可侵
-- なため rollback 不要。

-- 1. Dark (glass, dark)
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.17 0.013 260)","--c-fg":"oklch(0.96 0.004 250)","--c-glass-tint":"oklch(0.99 0.004 250)","--scrim":"oklch(0 0 0 / 0.6)","--scrim-dim":"oklch(0 0 0 / 0.2)","--surface-blur":"blur(16px) saturate(180%)","--surface-noise-opacity":"0.04","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-shadow-sm":"0 1px 3px oklch(0 0 0 / 0.3), 0 1px 2px oklch(0 0 0 / 0.2)","--ag-shadow-md":"0 4px 12px oklch(0 0 0 / 0.4), 0 2px 4px oklch(0 0 0 / 0.2)","--ag-shadow-lg":"0 8px 40px oklch(0 0 0 / 0.5), 0 4px 16px oklch(0 0 0 / 0.3)","--ag-shadow-dialog":"0 8px 32px oklch(0 0 0 / 0.5), 0 4px 12px oklch(0 0 0 / 0.3)","--ag-shadow-palette":"0 16px 48px oklch(0 0 0 / 0.6), 0 8px 16px oklch(0 0 0 / 0.4)","--ag-widget-shadow-hover":"var(--ag-shadow-md)","--ag-surface-tint":"linear-gradient(135deg, color-mix(in oklab, var(--c-glass-tint), transparent 96%) 0%, transparent 60%)","--ag-surface-tint-strength":"30%","--c-primary":"oklch(0.5 0.14 215)","--c-warn":"oklch(0.82 0.15 75)","--c-error":"oklch(0.68 0.17 25)","--c-success":"oklch(0.78 0.14 150)","--c-info":"oklch(0.75 0.14 230)"}'
 WHERE id = 'dark' AND is_builtin = 1;

-- 2. Light (glass, light)
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.985 0.003 250)","--c-fg":"oklch(0.22 0.02 260)","--c-glass-tint":"oklch(0.99 0.004 250)","--scrim":"oklch(0 0 0 / 0.45)","--scrim-dim":"oklch(1 0 0 / 0.25)","--surface-blur":"blur(8px) saturate(160%)","--surface-noise-opacity":"0","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-surface-tint-strength":"30%","--c-primary":"oklch(0.5 0.14 215)","--c-warn":"oklch(0.74 0.16 75)","--c-error":"oklch(0.58 0.2 25)","--c-success":"oklch(0.66 0.15 150)","--c-info":"oklch(0.58 0.16 230)"}'
 WHERE id = 'light' AND is_builtin = 1;

-- 3. Brutalist (brutalist, light) — single accent (primary == secondary)。
-- single-quote escape は SQL 文字列内 '' 形式 (migration 043 と同方針)。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.99 0 0)","--c-fg":"oklch(0.16 0 0)","--c-glass-tint":"oklch(1 0 0)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.06","--bg-pattern-color":"var(--c-fg)","--c-primary":"oklch(0.5 0.22 28)","--c-secondary":"oklch(0.5 0.22 28)","--c-warn":"oklch(0.62 0.18 75)","--c-error":"oklch(0.52 0.22 25)","--c-success":"oklch(0.55 0.16 150)","--c-info":"oklch(0.5 0.2 230)"}'
 WHERE id = 'brutalist' AND is_builtin = 1;

-- 4. Brutalist Dark (brutalist, dark) — single accent。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.14 0 0)","--c-fg":"oklch(0.96 0 0)","--c-glass-tint":"oklch(0.16 0 0)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.10","--bg-pattern-color":"var(--c-fg)","--c-primary":"oklch(0.5 0.2 28)","--c-secondary":"oklch(0.5 0.2 28)","--c-warn":"oklch(0.7 0.16 75)","--c-error":"oklch(0.58 0.2 25)","--c-success":"oklch(0.62 0.15 150)","--c-info":"oklch(0.6 0.18 230)"}'
 WHERE id = 'brutalist-dark' AND is_builtin = 1;

-- 5. Neumorph (neumorph, light) — pastel + dual shadow。 secondary は CSS rule の自動補色派生に任せる。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.93 0.012 270)","--c-fg":"oklch(0.34 0.02 270)","--c-glass-tint":"oklch(0.99 0.004 270)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.75)","--shadow-outer-dark":"5px 5px 14px oklch(0.55 0.03 270 / 0.35)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)","--c-primary":"oklch(0.5 0.1 280)","--c-warn":"oklch(0.72 0.11 75)","--c-error":"oklch(0.6 0.14 25)","--c-success":"oklch(0.66 0.1 150)","--c-info":"oklch(0.62 0.1 230)"}'
 WHERE id = 'neumorph' AND is_builtin = 1;

-- 6. Neumorph Dark (neumorph, dark)。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.22 0.012 270)","--c-fg":"oklch(0.92 0.01 270)","--c-glass-tint":"oklch(0.99 0.004 270)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.05)","--shadow-outer-dark":"5px 5px 14px oklch(0 0 0 / 0.55)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)","--c-primary":"oklch(0.5 0.1 280)","--c-warn":"oklch(0.8 0.13 75)","--c-error":"oklch(0.68 0.16 25)","--c-success":"oklch(0.74 0.13 150)","--c-info":"oklch(0.7 0.12 230)"}'
 WHERE id = 'neumorph-dark' AND is_builtin = 1;
