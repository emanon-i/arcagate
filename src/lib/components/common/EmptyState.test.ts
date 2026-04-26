import { Package } from '@lucide/svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
	it('icon + title + description を表示する', () => {
		const { getByText } = render(EmptyState, {
			icon: Package,
			title: 'アイテムがありません',
			description: '新規追加してください',
		});
		expect(getByText('アイテムがありません')).toBeTruthy();
		expect(getByText('新規追加してください')).toBeTruthy();
	});

	it('description 未指定でも title だけで表示できる', () => {
		const { getByText, queryByText } = render(EmptyState, {
			icon: Package,
			title: 'アイテムがありません',
		});
		expect(getByText('アイテムがありません')).toBeTruthy();
		expect(queryByText('新規追加してください')).toBeNull();
	});

	it('action 未指定時はボタンを表示しない', () => {
		const { queryByRole } = render(EmptyState, { icon: Package, title: 'なし' });
		expect(queryByRole('button')).toBeNull();
	});

	it('action 指定時はボタンを表示し、クリックで onClick が呼ばれる', async () => {
		const onClick = vi.fn();
		const { getByRole } = render(EmptyState, {
			icon: Package,
			title: 'なし',
			action: { label: '追加', onClick },
		});
		const btn = getByRole('button', { name: '追加' });
		expect(btn).toBeTruthy();
		await fireEvent.click(btn);
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('testId が data-testid 属性に反映される', () => {
		const { container } = render(EmptyState, {
			icon: Package,
			title: 'なし',
			testId: 'my-empty',
		});
		expect(container.querySelector('[data-testid="my-empty"]')).toBeTruthy();
	});

	// PH-424 / Codex Q5 #4: 複数 actions
	it('actions 複数指定時に全ボタンが表示される', () => {
		const onAdd = vi.fn();
		const onSettings = vi.fn();
		const onHelp = vi.fn();
		const { getByRole } = render(EmptyState, {
			icon: Package,
			title: 'なし',
			actions: [
				{ label: 'アイテムを追加', onClick: onAdd },
				{ label: '設定を開く', onClick: onSettings },
				{ label: 'ヘルプを見る', onClick: onHelp },
			],
		});
		expect(getByRole('button', { name: 'アイテムを追加' })).toBeTruthy();
		expect(getByRole('button', { name: '設定を開く' })).toBeTruthy();
		expect(getByRole('button', { name: 'ヘルプを見る' })).toBeTruthy();
	});

	it('actions の各クリックで対応する onClick が呼ばれる', async () => {
		const onAdd = vi.fn();
		const onSettings = vi.fn();
		const { getByRole } = render(EmptyState, {
			icon: Package,
			title: 'なし',
			actions: [
				{ label: 'アイテムを追加', onClick: onAdd },
				{ label: '設定を開く', onClick: onSettings },
			],
		});
		await fireEvent.click(getByRole('button', { name: '設定を開く' }));
		expect(onSettings).toHaveBeenCalledOnce();
		expect(onAdd).not.toHaveBeenCalled();
	});

	it('actions と action の両方未指定なら button 0 件 (後方互換)', () => {
		const { queryByRole } = render(EmptyState, {
			icon: Package,
			title: 'なし',
			actions: [],
		});
		expect(queryByRole('button')).toBeNull();
	});
});
