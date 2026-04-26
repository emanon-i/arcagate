import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ErrorState from './ErrorState.svelte';

describe('ErrorState', () => {
	it('title + description を表示する', () => {
		const { getByText } = render(ErrorState, {
			title: '失敗しました',
			description: '通信エラー',
		});
		expect(getByText('失敗しました')).toBeTruthy();
		expect(getByText('通信エラー')).toBeTruthy();
	});

	it('role="alert" + aria-live="assertive" を持つ', () => {
		const { getByRole } = render(ErrorState, { title: 'エラー' });
		const el = getByRole('alert');
		expect(el.getAttribute('aria-live')).toBe('assertive');
	});

	it('retry 未指定時はボタンを表示しない', () => {
		const { queryByRole } = render(ErrorState, { title: 'エラー' });
		expect(queryByRole('button')).toBeNull();
	});

	it('retry 指定時はボタンを表示し、クリックで onClick が呼ばれる', async () => {
		const onClick = vi.fn();
		const { getByRole } = render(ErrorState, {
			title: 'エラー',
			retry: { label: '再試行', onClick },
		});
		const btn = getByRole('button', { name: '再試行' });
		await fireEvent.click(btn);
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('testId が data-testid に反映される', () => {
		const { container } = render(ErrorState, { title: 'エラー', testId: 'my-error' });
		expect(container.querySelector('[data-testid="my-error"]')).toBeTruthy();
	});
});
