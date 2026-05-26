# Theme Derive Palette — 派生 token の規格 (PR #588 short design note)

DEV_REVIEW_R4 ⑫ 後半 + audit `BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md` §5 の design 案
を実装した結果の規格メモ。 詳細な事実分析は元 audit、 本書は **「何を 1 関数で計算し、
どう CSS chain と分担するか」 の規格** だけを書く。

## 結論 1 行

`derivePalette(primary, secondary?, aesthetic, baseTheme)` という純関数で **semantic 4 軸
(`--c-warn / --c-error / --c-success / --c-info`)** を aesthetic × base ごとに calibrate し、
残りの **surface tint / accent state / 補色** は CSS chain (`color-mix(in oklab, ...)` および
`oklch(from ...)`) が live で派生する 2 層構成。

## 責務の分担

| 層             | 担い手                        | token 例                                                                                                                                  | 動機                                                                                                                |
| -------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **literal**    | `derivePalette()` (TS 純関数) | `--c-primary` / `--c-secondary` / `--c-warn` / `--c-error` / `--c-success` / `--c-info`                                                   | CSS で書くと aesthetic × base の calibration table が動的に取れないため、 TS で calibrate して seed に焼く          |
| **structural** | migration 044 + CSS static    | `--c-bg` / `--c-fg` / `--c-glass-tint` / `--ag-radius-*` / `--surface-blur` / `--ag-shadow-*` / `--bg-pattern*` / `--font-family-display` | aesthetic identity の核 (radius / blur / pattern) は CSS chain では表現困難 (`body::before` 等) なため literal seed |
| **chain**      | CSS rule                      | `--ag-accent-*` / `--ag-surface-*` / `--ag-text-*` / `--interactive-*` / `--ag-surface-tint-mix`                                          | primary を変えたとき derived token も live で派生するため CSS rule で chain を温存 (PR #586 ⑪ と同じ哲学)           |

## derivePalette の規格

### Input

```ts
{ primary: Oklch, secondary?: Oklch | null, aesthetic: 'glass'|'neumorph'|'brutalist', baseTheme: 'dark'|'light' }
```

### Output (`DerivedPalette`)

| Token           | 規則                                                                           |
| --------------- | ------------------------------------------------------------------------------ |
| `--c-primary`   | input.primary を echo (形式は `formatOklch()` で `oklch(L C H)`)               |
| `--c-secondary` | input.secondary 明示なら echo、 未指定なら primary の補色 (h+180、 0-360 巻く) |
| `--c-warn`      | hue=75 固定、 l/c は `SEMANTIC_RANGES[aesthetic][baseTheme].warn`              |
| `--c-error`     | hue=25 固定、 同上                                                             |
| `--c-success`   | hue=150 固定、 同上                                                            |
| `--c-info`      | hue=230 固定、 同上 (PR #588 で新設)                                           |

### Calibration table 規格 (`SEMANTIC_RANGES`)

3 軸 × 2 base × 4 semantic の 24 セル。 採用基準:

- **brutalist > glass > neumorph** の chroma 帯順序 (鮮烈 > 中庸 > muted) が全 4 軸で成立
- **dark > light** の lightness 順序 (dark base は明色で視認性確保) が全 12 セルで成立

unit test (`derive-palette.test.ts`) で上記 2 不変量を fail-closed に gate。

## CSS chain で追加した「色気」 (audit §B.1)

中立グレー surface に primary hue を **30% 注入** する chain を新設:

```css
/* :root */
--ag-surface-tint-strength: 30%;
--ag-surface-tint-mix: color-mix(in oklab, var(--c-fg), var(--c-primary) var(--ag-surface-tint-strength));
--ag-surface-1: color-mix(in oklab, var(--c-bg), var(--ag-surface-tint-mix) 4%);
/* ...surface-2/3/4/page/opaque も同 chain */

/* glass dark/light は :root の 30% を継承 → 微 tinted */
/* brutalist / neumorph block で 0% に override → 既存の neutral surface 温存 */
```

これにより:

- **glass dark/light**: `--c-bg` 自体は変えずに surface (`--ag-surface-1..4`) だけが primary hue を持つ。 ThemeEditor で primary 変えると surface tint が live で連動 (e2e で verify)。
- **brutalist**: 純白 / 純黒 を維持 (`--ag-surface-tint-strength: 0%` で override)。
- **neumorph**: pastel 紫の muted 世界観を維持 (同上)。

## accent state chain の拡張

`--ag-accent-*` の chain に hover / focus 系を追加 (audit §B.2):

| Token                    | chain                                                    | 用途              |
| ------------------------ | -------------------------------------------------------- | ----------------- |
| `--ag-accent-hover`      | `color-mix(in oklab, var(--c-primary), var(--c-fg) 15%)` | button hover text |
| `--ag-accent-hover-bg`   | `color-mix(in oklab, var(--c-primary), transparent 76%)` | button hover fill |
| `--ag-accent-focus-ring` | `color-mix(in oklab, var(--c-primary), transparent 60%)` | focus ring        |

すべて `var(--c-primary)` 経由なので ThemeEditor で primary 変更時に live 反応する。

## migration / CSS / TS の SSOT 関係

```
TS:  derivePalette() / BUILTIN_PALETTE_SPECS  ← unit test で固定
       │
       ▼ (手動 codegen) scripts/gen-mig-044.mts で 6 builtin 出力
       │
       ▼ コピペ
SQL: src-tauri/migrations/044_theme_derive_palette_seed.sql (builtin 6 件のみ)
       │
       ▼ defense-in-depth (brutalist の body::before は CSS variable 不可)
CSS: src/lib/styles/arcagate-theme.css の :root / .dark / [data-theme=...] block
       │
       ▼ audit 機械検出
gate: scripts/audit-builtin-theme-css-vars.sh で必須 token + is_builtin=1 guard を gate
```

- TS test (`derive-palette.test.ts`) が derive 出力と migration 044 seed の literal byte 一致を gate
- Rust test (`db::migrations::tests::test_migration_044_*`) が DB に対する migration 効果を gate
- audit script が migration 044 の SQL に必須 token (`--c-info` / `--ag-surface-tint-strength` 等) が含まれることを gate

## user data invariant

migration 044 は `is_builtin = 1` 述語で **builtin 6 件のみ** UPDATE。 既存 user の
custom theme (`is_builtin = 0`) は不可侵 (Rust test で byte-identical verify)。

## 引用元

- audit `docs/l3_phases/audit/BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md` §1 / §3 / §5
- audit `docs/l3_phases/audit/DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27.md` §4 (案 α / β)
- PR #586 ⑪ chain 温存 (dirty トラッキング fix)
- migration 043 `THEME_CLONE_AESTHETIC_LOST_2026-05-26.md` 根治 → 044 で派生 token 拡張
