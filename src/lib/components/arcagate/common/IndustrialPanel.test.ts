import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import IndustrialPanel from './IndustrialPanel.svelte';

describe('IndustrialPanel', () => {
	it('default は border + paper bg + 通常の padding', () => {
		const { container } = render(IndustrialPanel);
		const panel = container.querySelector('.il-panel');
		expect(panel).toBeTruthy();
		// padding 適用 (flush=false) はインナー div が p-4 を持つ
		expect(container.querySelector('.p-4')).toBeTruthy();
	});

	it('flush=true で内側 padding を切る', () => {
		const { container } = render(IndustrialPanel, { flush: true });
		// p-4 が無い
		expect(container.querySelector('.p-4')).toBeNull();
	});

	it('bracket=true で il-bracket-corner class が付く', () => {
		const { container } = render(IndustrialPanel, { bracket: true });
		expect(container.querySelector('.il-bracket-corner')).toBeTruthy();
	});

	// bracketYellow の style 反映は JSDOM が custom property を style 属性から
	// strip するため unit では検証困難。実機 CDP screenshot で目視 (A4 verify 段階)。

	it('hatching=true で hatching div を出す', () => {
		const { container } = render(IndustrialPanel, { hatching: true });
		expect(container.querySelector('.il-hatching')).toBeTruthy();
	});

	it('hatching=false で hatching div を出さない', () => {
		const { container } = render(IndustrialPanel);
		expect(container.querySelector('.il-hatching')).toBeNull();
	});
});
