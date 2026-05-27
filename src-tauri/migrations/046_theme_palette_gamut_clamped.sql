-- PR #590 (user 追加 spec: APCA + gamut clamp + 色弱 ΔE 機械検証): derivePalette が
-- gamut clamp を適用するようになったため、 builtin 6 の semantic 値を「sRGB gamut 内に
-- 収まる exact 値」 で再 seed する。
--
-- 045 (v2 methodology) は transform 式の出力をそのまま seed していたが、 brutalist の chroma 0.21
-- (1.5x scale) の一部 hue × lightness 組合せが sRGB gamut 外で、 browser の hard-clamp により
-- 微妙な hue shift を起こしていた (実測: brutalist light warn oklch(0.68 0.21 75) → gamut 内 0.14)。
-- 046 で gamut clamp 後の正確な値を seed することで:
--  - inline style と browser render の見た目が完全一致する
--  - clone した user custom も in-gamut から始まる (= ThemeEditor で primary 変更したときも safe)
--
-- # gamut clamp の効果 (045 → 046 の値変化)
--
-- 影響を受ける token (chroma が下がる):
--   - light glass info:        0.14   → 0.125  (青系 hue=230 が L=0.64 で chroma 0.14 限界超過)
--   - brutalist light warn:    0.21   → 0.14   (yellow hue=75 が L=0.68 で chroma 制限大)
--   - brutalist light success: 0.21   → 0.18   (green hue=150 が L=0.66 で chroma 制限)
--   - brutalist light info:    0.21   → 0.125  (blue hue=230 が L=0.64 で chroma 制限大)
--   - brutalist dark warn:     0.21   → 0.165  (yellow hue=75 が L=0.8 で chroma 制限)
--   - brutalist dark error:    0.21   → 0.17   (red hue=25 が L=0.72 で chroma 制限)
--   - brutalist dark info:     0.21   → 0.15   (blue hue=230 が L=0.76 で chroma 制限)
--
-- 影響を受けない token (元から in-gamut):
--   - glass dark の全 semantic (semL=0.72 + c=0.14): gamut 内
--   - brutalist dark success (semL=0.78, c=0.21, h=150): green は L=0.78 でも 0.21 が in-gamut
--   - neumorph 全 (c=0.084 で全 hue gamut 内)
--
-- # user の custom theme は不可侵 (045/044/043 と同じ contract)
--
-- `is_builtin = 1` guard で必ず限定。

-- 1. dark (glass, dark) — semantic 全て in-gamut で 045 と同値、 forward-only chain のため
--    冪等化のため再 UPDATE (= 045 が確実に最後に上書きする保証)。
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.17 0.013 260)","--c-fg":"oklch(0.96 0.004 250)","--c-glass-tint":"oklch(0.99 0.004 250)","--scrim":"oklch(0 0 0 / 0.6)","--scrim-dim":"oklch(0 0 0 / 0.2)","--surface-blur":"blur(16px) saturate(180%)","--surface-noise-opacity":"0.04","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-shadow-sm":"0 1px 3px oklch(0 0 0 / 0.3), 0 1px 2px oklch(0 0 0 / 0.2)","--ag-shadow-md":"0 4px 12px oklch(0 0 0 / 0.4), 0 2px 4px oklch(0 0 0 / 0.2)","--ag-shadow-lg":"0 8px 40px oklch(0 0 0 / 0.5), 0 4px 16px oklch(0 0 0 / 0.3)","--ag-shadow-dialog":"0 8px 32px oklch(0 0 0 / 0.5), 0 4px 12px oklch(0 0 0 / 0.3)","--ag-shadow-palette":"0 16px 48px oklch(0 0 0 / 0.6), 0 8px 16px oklch(0 0 0 / 0.4)","--ag-widget-shadow-hover":"var(--ag-shadow-md)","--ag-surface-tint":"linear-gradient(135deg, color-mix(in oklab, var(--c-glass-tint), transparent 96%) 0%, transparent 60%)","--ag-surface-tint-strength":"30%","--c-primary":"oklch(0.5 0.14 215)","--c-secondary":"oklch(0.5 0.14 5)","--c-warn":"oklch(0.8 0.14 75)","--c-error":"oklch(0.72 0.14 25)","--c-success":"oklch(0.78 0.14 150)","--c-info":"oklch(0.76 0.14 230)"}'
 WHERE id = 'dark' AND is_builtin = 1;

-- 2. light (glass, light) — info の chroma が 0.14 → 0.125 (gamut clamped)
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.985 0.003 250)","--c-fg":"oklch(0.22 0.02 260)","--c-glass-tint":"oklch(0.99 0.004 250)","--scrim":"oklch(0 0 0 / 0.45)","--scrim-dim":"oklch(1 0 0 / 0.25)","--surface-blur":"blur(8px) saturate(160%)","--surface-noise-opacity":"0","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-surface-tint-strength":"30%","--c-primary":"oklch(0.5 0.14 215)","--c-secondary":"oklch(0.5 0.14 5)","--c-warn":"oklch(0.68 0.14 75)","--c-error":"oklch(0.6 0.14 25)","--c-success":"oklch(0.66 0.14 150)","--c-info":"oklch(0.64 0.125 230)"}'
 WHERE id = 'light' AND is_builtin = 1;

-- 3. brutalist (light) — warn/success/info が gamut clamp で削られる、 error は 0.21 で gamut 内維持
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.99 0 0)","--c-fg":"oklch(0.16 0 0)","--c-glass-tint":"oklch(1 0 0)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.06","--bg-pattern-color":"var(--c-fg)","--c-primary":"oklch(0.5 0.22 28)","--c-secondary":"oklch(0.5 0.22 28)","--c-warn":"oklch(0.68 0.14 75)","--c-error":"oklch(0.6 0.21 25)","--c-success":"oklch(0.66 0.18 150)","--c-info":"oklch(0.64 0.125 230)"}'
 WHERE id = 'brutalist' AND is_builtin = 1;

-- 4. brutalist-dark — warn/error/info が gamut clamp で削られる、 success のみ 0.21 維持
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.14 0 0)","--c-fg":"oklch(0.96 0 0)","--c-glass-tint":"oklch(0.16 0 0)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.10","--bg-pattern-color":"var(--c-fg)","--c-primary":"oklch(0.5 0.2 28)","--c-secondary":"oklch(0.5 0.2 28)","--c-warn":"oklch(0.8 0.165 75)","--c-error":"oklch(0.72 0.17 25)","--c-success":"oklch(0.78 0.21 150)","--c-info":"oklch(0.76 0.15 230)"}'
 WHERE id = 'brutalist-dark' AND is_builtin = 1;

-- 5. neumorph (light) — 045 と同値 (c=0.084 は全 hue で gamut 内)、 forward-only 冪等化
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.93 0.012 270)","--c-fg":"oklch(0.34 0.02 270)","--c-glass-tint":"oklch(0.99 0.004 270)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.75)","--shadow-outer-dark":"5px 5px 14px oklch(0.55 0.03 270 / 0.35)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)","--c-primary":"oklch(0.5 0.1 280)","--c-secondary":"oklch(0.5 0.1 70)","--c-warn":"oklch(0.68 0.084 75)","--c-error":"oklch(0.6 0.084 25)","--c-success":"oklch(0.66 0.084 150)","--c-info":"oklch(0.64 0.084 230)"}'
 WHERE id = 'neumorph' AND is_builtin = 1;

-- 6. neumorph-dark — 045 と同値、 冪等化
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.22 0.012 270)","--c-fg":"oklch(0.92 0.01 270)","--c-glass-tint":"oklch(0.99 0.004 270)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.05)","--shadow-outer-dark":"5px 5px 14px oklch(0 0 0 / 0.55)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)","--c-primary":"oklch(0.5 0.1 280)","--c-secondary":"oklch(0.5 0.1 70)","--c-warn":"oklch(0.8 0.084 75)","--c-error":"oklch(0.72 0.084 25)","--c-success":"oklch(0.78 0.084 150)","--c-info":"oklch(0.76 0.084 230)"}'
 WHERE id = 'neumorph-dark' AND is_builtin = 1;
