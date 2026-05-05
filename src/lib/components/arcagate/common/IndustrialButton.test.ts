import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import IndustrialButton from './IndustrialButton.svelte';

describe('IndustrialButton', () => {
	it('default は variant=secondary / size=md / type=button', () => {
		const { getByRole } = render(IndustrialButton);
		const btn = getByRole('button');
		expect(btn.getAttribute('data-variant')).toBe('secondary');
		expect(btn.getAttribute('type')).toBe('button');
		expect(btn.className).toContain('h-9');
	});

	it('variant=primary を data-variant に反映', () => {
		const { getByRole } = render(IndustrialButton, { variant: 'primary' });
		expect(getByRole('button').getAttribute('data-variant')).toBe('primary');
	});

	it('size=sm で sm 用 h-7 class を当てる', () => {
		const { getByRole } = render(IndustrialButton, { size: 'sm' });
		expect(getByRole('button').className).toContain('h-7');
	});

	it('aria-label が反映される', () => {
		const { getByRole } = render(IndustrialButton, {
			'aria-label': 'アイテムを紐付け',
		});
		expect(getByRole('button', { name: 'アイテムを紐付け' })).toBeTruthy();
	});

	it('disabled prop で disabled 属性が立つ', () => {
		const { getByRole } = render(IndustrialButton, { disabled: true });
		const btn = getByRole('button') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it('onclick が click で発火する', async () => {
		const onclick = vi.fn();
		const { getByRole } = render(IndustrialButton, { onclick });
		await fireEvent.click(getByRole('button'));
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('type=submit を反映', () => {
		const { getByRole } = render(IndustrialButton, { type: 'submit' });
		expect(getByRole('button').getAttribute('type')).toBe('submit');
	});
});
