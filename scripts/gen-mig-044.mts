/**
 * One-shot generator: print the migration 044 / 045 builtin theme JSON.
 *
 * Run: `pnpm exec tsx scripts/gen-mig-044.mts`、 出力を migration SQL に貼り付ける。
 * Build chain には組み込まない (派生 output は手動で copy-paste して migration の immutable
 * 性を確保)。 derive 関数を変更したときに `derive-palette.test.ts` の `migration 044 同期 gate`
 * (vitest) が SQL との byte-for-byte 一致を検証するため、 手 paste 漏れは test fail で検出。
 *
 * 用途:
 *   - migration 044 (PR #588、 v1 lookup-table)
 *   - migration 045 (PR #589、 v2 methodology transform 式) ← 現在出力対象
 */
import {
	BUILTIN_PALETTE_SPECS,
	derivePalette,
} from '../src/lib/utils/derive-palette';

const STATIC: Record<string, Record<string, string>> = {
	dark: {
		'--c-bg': 'oklch(0.17 0.013 260)',
		'--c-fg': 'oklch(0.96 0.004 250)',
		'--c-glass-tint': 'oklch(0.99 0.004 250)',
		'--scrim': 'oklch(0 0 0 / 0.6)',
		'--scrim-dim': 'oklch(0 0 0 / 0.2)',
		'--surface-blur': 'blur(16px) saturate(180%)',
		'--surface-noise-opacity': '0.04',
		'--ag-radius-sm': '8px',
		'--ag-radius-md': '14px',
		'--ag-radius-lg': '22px',
		'--ag-shadow-sm': '0 1px 3px oklch(0 0 0 / 0.3), 0 1px 2px oklch(0 0 0 / 0.2)',
		'--ag-shadow-md': '0 4px 12px oklch(0 0 0 / 0.4), 0 2px 4px oklch(0 0 0 / 0.2)',
		'--ag-shadow-lg': '0 8px 40px oklch(0 0 0 / 0.5), 0 4px 16px oklch(0 0 0 / 0.3)',
		'--ag-shadow-dialog': '0 8px 32px oklch(0 0 0 / 0.5), 0 4px 12px oklch(0 0 0 / 0.3)',
		'--ag-shadow-palette': '0 16px 48px oklch(0 0 0 / 0.6), 0 8px 16px oklch(0 0 0 / 0.4)',
		'--ag-widget-shadow-hover': 'var(--ag-shadow-md)',
		'--ag-surface-tint':
			'linear-gradient(135deg, color-mix(in oklab, var(--c-glass-tint), transparent 96%) 0%, transparent 60%)',
		'--ag-surface-tint-strength': '30%',
	},
	light: {
		'--c-bg': 'oklch(0.985 0.003 250)',
		'--c-fg': 'oklch(0.22 0.02 260)',
		'--c-glass-tint': 'oklch(0.99 0.004 250)',
		'--scrim': 'oklch(0 0 0 / 0.45)',
		'--scrim-dim': 'oklch(1 0 0 / 0.25)',
		'--surface-blur': 'blur(8px) saturate(160%)',
		'--surface-noise-opacity': '0',
		'--ag-radius-sm': '8px',
		'--ag-radius-md': '14px',
		'--ag-radius-lg': '22px',
		'--ag-surface-tint-strength': '30%',
	},
	brutalist: {
		'--c-bg': 'oklch(0.99 0 0)',
		'--c-fg': 'oklch(0.16 0 0)',
		'--c-glass-tint': 'oklch(1 0 0)',
		'--ag-radius-sm': '0px',
		'--ag-radius-md': '0px',
		'--ag-radius-lg': '0px',
		'--surface-blur': 'none',
		'--surface-noise-opacity': '0',
		'--ag-backdrop': 'none',
		'--ag-border': 'var(--c-fg)',
		'--ag-border-hover': 'var(--c-fg)',
		'--ag-border-dashed': 'var(--c-fg)',
		'--surface-glass-regular': 'var(--c-bg)',
		'--surface-glass-clear': 'var(--c-bg)',
		'--ag-surface-opaque': 'var(--c-bg)',
		'--ag-surface-tint': 'none',
		'--ag-surface-tint-strength': '0%',
		'--ag-shadow-sm': 'none',
		'--ag-shadow-md': 'none',
		'--ag-shadow-lg': 'none',
		'--ag-shadow-dialog': '6px 6px 0 var(--c-fg)',
		'--ag-shadow-palette': '8px 8px 0 var(--c-fg)',
		'--ag-widget-shadow-hover': '4px 4px 0 var(--c-fg)',
		'--font-family-display': "'Cascadia Code', 'Consolas', ui-monospace, monospace",
		'--bg-pattern': 'dots',
		'--bg-pattern-opacity': '0.06',
		'--bg-pattern-color': 'var(--c-fg)',
	},
	'brutalist-dark': {
		'--c-bg': 'oklch(0.14 0 0)',
		'--c-fg': 'oklch(0.96 0 0)',
		'--c-glass-tint': 'oklch(0.16 0 0)',
		'--ag-radius-sm': '0px',
		'--ag-radius-md': '0px',
		'--ag-radius-lg': '0px',
		'--surface-blur': 'none',
		'--surface-noise-opacity': '0',
		'--ag-backdrop': 'none',
		'--ag-border': 'var(--c-fg)',
		'--ag-border-hover': 'var(--c-fg)',
		'--ag-border-dashed': 'var(--c-fg)',
		'--surface-glass-regular': 'var(--c-bg)',
		'--surface-glass-clear': 'var(--c-bg)',
		'--ag-surface-opaque': 'var(--c-bg)',
		'--ag-surface-tint': 'none',
		'--ag-surface-tint-strength': '0%',
		'--ag-shadow-sm': 'none',
		'--ag-shadow-md': 'none',
		'--ag-shadow-lg': 'none',
		'--ag-shadow-dialog': '6px 6px 0 var(--c-fg)',
		'--ag-shadow-palette': '8px 8px 0 var(--c-fg)',
		'--ag-widget-shadow-hover': '4px 4px 0 var(--c-fg)',
		'--font-family-display': "'Cascadia Code', 'Consolas', ui-monospace, monospace",
		'--bg-pattern': 'dots',
		'--bg-pattern-opacity': '0.10',
		'--bg-pattern-color': 'var(--c-fg)',
	},
	neumorph: {
		'--c-bg': 'oklch(0.93 0.012 270)',
		'--c-fg': 'oklch(0.34 0.02 270)',
		'--c-glass-tint': 'oklch(0.99 0.004 270)',
		'--ag-radius-sm': '12px',
		'--ag-radius-md': '18px',
		'--ag-radius-lg': '24px',
		'--surface-blur': 'none',
		'--surface-noise-opacity': '0',
		'--ag-backdrop': 'none',
		'--ag-surface-opaque': 'var(--c-bg)',
		'--surface-glass-regular': 'var(--c-bg)',
		'--surface-glass-clear': 'var(--c-bg)',
		'--ag-surface-tint': 'none',
		'--ag-surface-tint-strength': '0%',
		'--shadow-outer-light': '-5px -5px 12px oklch(1 0 0 / 0.75)',
		'--shadow-outer-dark': '5px 5px 14px oklch(0.55 0.03 270 / 0.35)',
		'--ag-shadow-sm': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-md': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-lg': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-dialog': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-palette': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-widget-shadow-hover':
			'var(--shadow-inner-dark), var(--shadow-inner-light)',
	},
	'neumorph-dark': {
		'--c-bg': 'oklch(0.22 0.012 270)',
		'--c-fg': 'oklch(0.92 0.01 270)',
		'--c-glass-tint': 'oklch(0.99 0.004 270)',
		'--ag-radius-sm': '12px',
		'--ag-radius-md': '18px',
		'--ag-radius-lg': '24px',
		'--surface-blur': 'none',
		'--surface-noise-opacity': '0',
		'--ag-backdrop': 'none',
		'--ag-surface-opaque': 'var(--c-bg)',
		'--surface-glass-regular': 'var(--c-bg)',
		'--surface-glass-clear': 'var(--c-bg)',
		'--ag-surface-tint': 'none',
		'--ag-surface-tint-strength': '0%',
		'--shadow-outer-light': '-5px -5px 12px oklch(1 0 0 / 0.05)',
		'--shadow-outer-dark': '5px 5px 14px oklch(0 0 0 / 0.55)',
		'--ag-shadow-sm': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-md': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-lg': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-dialog': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-shadow-palette': 'var(--shadow-outer-dark), var(--shadow-outer-light)',
		'--ag-widget-shadow-hover':
			'var(--shadow-inner-dark), var(--shadow-inner-light)',
	},
};

for (const spec of BUILTIN_PALETTE_SPECS) {
	const derived = derivePalette({
		primary: spec.primary,
		secondary: spec.secondary,
		aesthetic: spec.aesthetic,
		baseTheme: spec.baseTheme,
	});
	const merged: Record<string, string> = {
		...STATIC[spec.id],
		...derived,
	};
	if (spec.secondary === undefined) delete merged['--c-secondary'];
	console.log(`-- ${spec.id} (${spec.aesthetic}, ${spec.baseTheme})`);
	console.log(JSON.stringify(merged));
	console.log();
}
