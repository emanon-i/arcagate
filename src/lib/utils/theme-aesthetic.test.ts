import { describe, expect, it } from 'vitest';
import type { Theme } from '$lib/types/theme';
import { detectAesthetic } from './theme-aesthetic';

function makeTheme(overrides: Partial<Theme>): Theme {
	return {
		id: 'test',
		name: 'Test',
		base_theme: 'dark',
		css_vars: '{}',
		is_builtin: false,
		created_at: '',
		updated_at: '',
		...overrides,
	};
}

describe('detectAesthetic', () => {
	// --- builtin id prefix 一致 ---

	it('builtin dark を glass として判定', () => {
		expect(detectAesthetic(makeTheme({ id: 'dark', is_builtin: true }))).toBe('glass');
	});

	it('builtin light を glass として判定', () => {
		expect(detectAesthetic(makeTheme({ id: 'light', is_builtin: true }))).toBe('glass');
	});

	it('builtin brutalist を brutalist として判定', () => {
		expect(detectAesthetic(makeTheme({ id: 'brutalist', is_builtin: true }))).toBe('brutalist');
	});

	it('builtin brutalist-dark を brutalist として判定', () => {
		expect(detectAesthetic(makeTheme({ id: 'brutalist-dark', is_builtin: true }))).toBe(
			'brutalist',
		);
	});

	it('builtin neumorph を neumorph として判定', () => {
		expect(detectAesthetic(makeTheme({ id: 'neumorph', is_builtin: true }))).toBe('neumorph');
	});

	it('builtin neumorph-dark を neumorph として判定', () => {
		expect(detectAesthetic(makeTheme({ id: 'neumorph-dark', is_builtin: true }))).toBe('neumorph');
	});

	// --- custom theme: css_vars signature 推定 ---

	it('custom: radius=0px + blur=none → brutalist', () => {
		const cssVars = JSON.stringify({
			'--ag-radius-lg': '0px',
			'--surface-blur': 'none',
			'--c-primary': 'oklch(0.50 0.22 28)',
		});
		expect(
			detectAesthetic(makeTheme({ id: 'user:abc-123', is_builtin: false, css_vars: cssVars })),
		).toBe('brutalist');
	});

	it('custom: radius=24px + blur=none → neumorph', () => {
		const cssVars = JSON.stringify({
			'--ag-radius-lg': '24px',
			'--surface-blur': 'none',
			'--c-primary': 'oklch(0.50 0.10 280)',
		});
		expect(
			detectAesthetic(makeTheme({ id: 'user:abc-456', is_builtin: false, css_vars: cssVars })),
		).toBe('neumorph');
	});

	it('custom: radius=22px + blur=blur(...) → glass (default)', () => {
		const cssVars = JSON.stringify({
			'--ag-radius-lg': '22px',
			'--surface-blur': 'blur(16px) saturate(180%)',
			'--c-primary': 'oklch(0.50 0.14 215)',
		});
		expect(
			detectAesthetic(makeTheme({ id: 'user:abc-789', is_builtin: false, css_vars: cssVars })),
		).toBe('glass');
	});

	it('custom: signature 不明 → glass (default)', () => {
		const cssVars = JSON.stringify({
			'--c-primary': '#ff00ff',
		});
		expect(
			detectAesthetic(makeTheme({ id: 'user:custom', is_builtin: false, css_vars: cssVars })),
		).toBe('glass');
	});

	it('css_vars が invalid JSON → glass (fallback)', () => {
		expect(
			detectAesthetic(makeTheme({ id: 'user:broken', is_builtin: false, css_vars: 'not-json' })),
		).toBe('glass');
	});

	it('custom: radius=20px (境界値) + blur=none → neumorph', () => {
		const cssVars = JSON.stringify({
			'--ag-radius-lg': '20px',
			'--surface-blur': 'none',
		});
		expect(
			detectAesthetic(makeTheme({ id: 'user:edge', is_builtin: false, css_vars: cssVars })),
		).toBe('neumorph');
	});

	it('custom: radius=18px + blur=none → glass (neumorph 閾値未満)', () => {
		const cssVars = JSON.stringify({
			'--ag-radius-lg': '18px',
			'--surface-blur': 'none',
		});
		expect(
			detectAesthetic(makeTheme({ id: 'user:edge2', is_builtin: false, css_vars: cssVars })),
		).toBe('glass');
	});
});
