-- PR #589 (DEV_REVIEW_R4 ⑫後半 user 追加 spec): derivePalette を v2 methodology-explicit に
-- 再設計し、 builtin 6 を新 transform 式の出力で再 seed する。
--
-- # なぜ migration 044 を残して 045 を足すか
--
-- 044 は既に main にマージ済 (commit 503d1924) で user の DB にも適用されている。 SQLite
-- migration は forward-only / immutable contract のため、 044 のファイル内容を改変するのは
-- 厳禁。 045 で UPDATE を上書きする (= 044 の seed 後に再 seed)。 user の custom theme は
-- 044 と同じく `is_builtin = 1` guard で不可侵。
--
-- # 何が変わったか (v1 → v2)
--
-- v1 (migration 044): 18 個の magic number (3 aesthetic × 2 base × 3 semantic) を lookup 表で持つ。
-- 「なぜこの値か」 が表だけ見ても辿れず、 user が「ここ少し変えたい」 と思っても根拠を読めなかった。
--
-- v2 (本 migration): **transform 式 4 軸 + 3 定数** で全派生値を導出 (`src/lib/utils/derive-palette.ts`):
--
--   1. AESTHETIC_CHROMA_SCALE: glass=1.0 / brutalist=1.5 / neumorph=0.6 (2.5x 幅)
--      根拠: aesthetic の知覚的個性を chroma 倍率 1 軸に集約。
--      glass = sophisticated baseline、 brutalist = +50% rich vivid manifesto、 neumorph = -40% pastel restraint。
--
--   2. SEMANTIC_BASE_CHROMA = 0.14 (aesthetic scale が掛かる前の anchor)
--      根拠: brutalist (×1.5 = 0.21) が signal-color 帯、 neumorph (×0.6 = 0.084) が pastel 帯に
--      落ちる。 0.21 は sRGB gamut 内に収まる安全範囲。
--
--   3. SEMANTIC_BASE_LIGHTNESS: light=0.60 / dark=0.72 (差 0.12 = OKLCh 1 perceptual step)
--      根拠: dark base は明るい semantic が必要 (黒背景上の視認確保)、 light base は暗い semantic。
--
--   4. SEMANTIC_DELTA_L: error=0, info=+0.04, success=+0.06, warn=+0.08
--      根拠: 同 L のまま全 semantic を並べると 4 軸が見分けにくいため、 hue だけでなく L にも幅を持たせる。
--      error は red の自然な signal 性に任せて L 中心、 warn は yellow の「明るい注意」 を担う。
--
--   5. SECONDARY_SHIFT_DEG = 150° (split-complementary)
--      根拠: 純補色 (180°) は warm/cool 極端で「ぶつかる」 dyad を作りやすい。 split-complementary
--      は調和を保ちつつ十分な hue 距離。 builtin の glass (青 H215) → H5 (warm 寄り)、 neumorph
--      (紫 H280) → H70 (yellow 寄り) で warm balance な universal harmonic pair を作る。
--
--   6. WCAG ensureAaAgainstWhite: user picker で「白っぽすぎる primary」 を選んだ場合、 L を 0.02
--      step で下げて 4.5:1 を確保する (hue / chroma は保つ = user の意図する色相は壊さない)。
--      既存 builtin (L=0.5) は元から AA を満たすので no-op。
--
-- # transform 式の出力 (6 builtin)
--
--   全 builtin: --c-primary echo + --c-secondary (auto split-complementary except brutalist が single)
--   - glass (scale=1.0, c=0.14):
--     - dark: warn 0.8/0.14/75, error 0.72/0.14/25, success 0.78/0.14/150, info 0.76/0.14/230
--     - light: warn 0.68/0.14/75, error 0.6/0.14/25, success 0.66/0.14/150, info 0.64/0.14/230
--   - brutalist (scale=1.5, c=0.21):
--     - dark: warn 0.8/0.21/75, error 0.72/0.21/25, success 0.78/0.21/150, info 0.76/0.21/230
--     - light: warn 0.68/0.21/75, error 0.6/0.21/25, success 0.66/0.21/150, info 0.64/0.21/230
--   - neumorph (scale=0.6, c=0.084):
--     - dark: warn 0.8/0.084/75, error 0.72/0.084/25, success 0.78/0.084/150, info 0.76/0.084/230
--     - light: warn 0.68/0.084/75, error 0.6/0.084/25, success 0.66/0.084/150, info 0.64/0.084/230
--
-- # 同期 gate
--
-- `src/lib/utils/derive-palette.test.ts` 内の `migration 044 同期 gate` describe block が
-- MIG_044_LITERALS (= 本 migration 045 で seed する値) と derivePalette() 出力の byte-for-byte
-- 一致を vitest で機械検出する (= derive 関数を変えたら SQL も追従しないと test fail)。
--
-- # ユーザーデータの不可侵
--
-- `is_builtin = 1` guard で user の custom theme には触らない (044 と同じ contract)。

-- 1. dark (glass, dark) — v2 methodology
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.17 0.013 260)","--c-fg":"oklch(0.96 0.004 250)","--c-glass-tint":"oklch(0.99 0.004 250)","--scrim":"oklch(0 0 0 / 0.6)","--scrim-dim":"oklch(0 0 0 / 0.2)","--surface-blur":"blur(16px) saturate(180%)","--surface-noise-opacity":"0.04","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-shadow-sm":"0 1px 3px oklch(0 0 0 / 0.3), 0 1px 2px oklch(0 0 0 / 0.2)","--ag-shadow-md":"0 4px 12px oklch(0 0 0 / 0.4), 0 2px 4px oklch(0 0 0 / 0.2)","--ag-shadow-lg":"0 8px 40px oklch(0 0 0 / 0.5), 0 4px 16px oklch(0 0 0 / 0.3)","--ag-shadow-dialog":"0 8px 32px oklch(0 0 0 / 0.5), 0 4px 12px oklch(0 0 0 / 0.3)","--ag-shadow-palette":"0 16px 48px oklch(0 0 0 / 0.6), 0 8px 16px oklch(0 0 0 / 0.4)","--ag-widget-shadow-hover":"var(--ag-shadow-md)","--ag-surface-tint":"linear-gradient(135deg, color-mix(in oklab, var(--c-glass-tint), transparent 96%) 0%, transparent 60%)","--ag-surface-tint-strength":"30%","--c-primary":"oklch(0.5 0.14 215)","--c-secondary":"oklch(0.5 0.14 5)","--c-warn":"oklch(0.8 0.14 75)","--c-error":"oklch(0.72 0.14 25)","--c-success":"oklch(0.78 0.14 150)","--c-info":"oklch(0.76 0.14 230)"}'
 WHERE id = 'dark' AND is_builtin = 1;

-- 2. light (glass, light) — v2 methodology
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.985 0.003 250)","--c-fg":"oklch(0.22 0.02 260)","--c-glass-tint":"oklch(0.99 0.004 250)","--scrim":"oklch(0 0 0 / 0.45)","--scrim-dim":"oklch(1 0 0 / 0.25)","--surface-blur":"blur(8px) saturate(160%)","--surface-noise-opacity":"0","--ag-radius-sm":"8px","--ag-radius-md":"14px","--ag-radius-lg":"22px","--ag-surface-tint-strength":"30%","--c-primary":"oklch(0.5 0.14 215)","--c-secondary":"oklch(0.5 0.14 5)","--c-warn":"oklch(0.68 0.14 75)","--c-error":"oklch(0.6 0.14 25)","--c-success":"oklch(0.66 0.14 150)","--c-info":"oklch(0.64 0.14 230)"}'
 WHERE id = 'light' AND is_builtin = 1;

-- 3. brutalist (light) — single accent (secondary = primary、 user design intent)、 v2 methodology
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.99 0 0)","--c-fg":"oklch(0.16 0 0)","--c-glass-tint":"oklch(1 0 0)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.06","--bg-pattern-color":"var(--c-fg)","--c-primary":"oklch(0.5 0.22 28)","--c-secondary":"oklch(0.5 0.22 28)","--c-warn":"oklch(0.68 0.21 75)","--c-error":"oklch(0.6 0.21 25)","--c-success":"oklch(0.66 0.21 150)","--c-info":"oklch(0.64 0.21 230)"}'
 WHERE id = 'brutalist' AND is_builtin = 1;

-- 4. brutalist-dark — single accent、 v2 methodology
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.14 0 0)","--c-fg":"oklch(0.96 0 0)","--c-glass-tint":"oklch(0.16 0 0)","--ag-radius-sm":"0px","--ag-radius-md":"0px","--ag-radius-lg":"0px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-border":"var(--c-fg)","--ag-border-hover":"var(--c-fg)","--ag-border-dashed":"var(--c-fg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-opaque":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--ag-shadow-sm":"none","--ag-shadow-md":"none","--ag-shadow-lg":"none","--ag-shadow-dialog":"6px 6px 0 var(--c-fg)","--ag-shadow-palette":"8px 8px 0 var(--c-fg)","--ag-widget-shadow-hover":"4px 4px 0 var(--c-fg)","--font-family-display":"''Cascadia Code'', ''Consolas'', ui-monospace, monospace","--bg-pattern":"dots","--bg-pattern-opacity":"0.10","--bg-pattern-color":"var(--c-fg)","--c-primary":"oklch(0.5 0.2 28)","--c-secondary":"oklch(0.5 0.2 28)","--c-warn":"oklch(0.8 0.21 75)","--c-error":"oklch(0.72 0.21 25)","--c-success":"oklch(0.78 0.21 150)","--c-info":"oklch(0.76 0.21 230)"}'
 WHERE id = 'brutalist-dark' AND is_builtin = 1;

-- 5. neumorph (light) — secondary = auto split-complementary (h+150° = 70°)、 v2 methodology
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.93 0.012 270)","--c-fg":"oklch(0.34 0.02 270)","--c-glass-tint":"oklch(0.99 0.004 270)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.75)","--shadow-outer-dark":"5px 5px 14px oklch(0.55 0.03 270 / 0.35)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)","--c-primary":"oklch(0.5 0.1 280)","--c-secondary":"oklch(0.5 0.1 70)","--c-warn":"oklch(0.68 0.084 75)","--c-error":"oklch(0.6 0.084 25)","--c-success":"oklch(0.66 0.084 150)","--c-info":"oklch(0.64 0.084 230)"}'
 WHERE id = 'neumorph' AND is_builtin = 1;

-- 6. neumorph-dark — secondary = auto split-complementary、 v2 methodology
UPDATE themes SET css_vars = '{"--c-bg":"oklch(0.22 0.012 270)","--c-fg":"oklch(0.92 0.01 270)","--c-glass-tint":"oklch(0.99 0.004 270)","--ag-radius-sm":"12px","--ag-radius-md":"18px","--ag-radius-lg":"24px","--surface-blur":"none","--surface-noise-opacity":"0","--ag-backdrop":"none","--ag-surface-opaque":"var(--c-bg)","--surface-glass-regular":"var(--c-bg)","--surface-glass-clear":"var(--c-bg)","--ag-surface-tint":"none","--ag-surface-tint-strength":"0%","--shadow-outer-light":"-5px -5px 12px oklch(1 0 0 / 0.05)","--shadow-outer-dark":"5px 5px 14px oklch(0 0 0 / 0.55)","--ag-shadow-sm":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-md":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-lg":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-dialog":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-shadow-palette":"var(--shadow-outer-dark), var(--shadow-outer-light)","--ag-widget-shadow-hover":"var(--shadow-inner-dark), var(--shadow-inner-light)","--c-primary":"oklch(0.5 0.1 280)","--c-secondary":"oklch(0.5 0.1 70)","--c-warn":"oklch(0.8 0.084 75)","--c-error":"oklch(0.72 0.084 25)","--c-success":"oklch(0.78 0.084 150)","--c-info":"oklch(0.76 0.084 230)"}'
 WHERE id = 'neumorph-dark' AND is_builtin = 1;
