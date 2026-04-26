import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LoadingState from './LoadingState.svelte';

describe('LoadingState', () => {
	it('default description「読み込み中...」を表示する', () => {
		const { getByText } = render(LoadingState);
		expect(getByText('読み込み中...')).toBeTruthy();
	});

	it('description prop で文言を上書きできる', () => {
		const { getByText } = render(LoadingState, { description: 'テーマを読み込み中' });
		expect(getByText('テーマを読み込み中')).toBeTruthy();
	});

	it('aria-live="polite" / role="status" を持つ', () => {
		const { getByRole } = render(LoadingState);
		const el = getByRole('status');
		expect(el.getAttribute('aria-live')).toBe('polite');
	});

	it('testId が data-testid に反映される', () => {
		const { container } = render(LoadingState, { testId: 'my-loading' });
		expect(container.querySelector('[data-testid="my-loading"]')).toBeTruthy();
	});
});
