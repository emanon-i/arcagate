import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.svelte';

const baseProps = {
	open: true,
	title: 'テスト確認',
	description: '本当に実行しますか？',
	confirmLabel: '実行',
	onConfirm: vi.fn(),
	onCancel: vi.fn(),
};

describe('ConfirmDialog', () => {
	it('open=false のときは何もレンダリングしない', () => {
		const { queryByRole } = render(ConfirmDialog, { ...baseProps, open: false });
		expect(queryByRole('dialog')).toBeNull();
	});

	it('open=true のときは title / description / 両ボタンを表示する', () => {
		const { getByRole, getByText } = render(ConfirmDialog, baseProps);
		expect(getByRole('dialog')).toBeTruthy();
		expect(getByText('テスト確認')).toBeTruthy();
		expect(getByText('本当に実行しますか？')).toBeTruthy();
		expect(getByRole('button', { name: '実行' })).toBeTruthy();
		expect(getByRole('button', { name: 'キャンセル' })).toBeTruthy();
	});

	it('cancelLabel を指定すると左ボタンのテキストが変わる', () => {
		const { getByRole } = render(ConfirmDialog, { ...baseProps, cancelLabel: '編集に戻る' });
		expect(getByRole('button', { name: '編集に戻る' })).toBeTruthy();
	});

	it('確認ボタンクリックで onConfirm が呼ばれる', async () => {
		const onConfirm = vi.fn();
		const { getByRole } = render(ConfirmDialog, { ...baseProps, onConfirm });
		await fireEvent.click(getByRole('button', { name: '実行' }));
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it('キャンセルボタンクリックで onCancel が呼ばれる', async () => {
		const onCancel = vi.fn();
		const { getByRole } = render(ConfirmDialog, { ...baseProps, onCancel });
		await fireEvent.click(getByRole('button', { name: 'キャンセル' }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('overlay クリックで onCancel が呼ばれる', async () => {
		const onCancel = vi.fn();
		const { getByRole } = render(ConfirmDialog, { ...baseProps, onCancel });
		const overlay = getByRole('dialog');
		await fireEvent.click(overlay);
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('Escape キーで onCancel が呼ばれる', async () => {
		const onCancel = vi.fn();
		const { getByRole } = render(ConfirmDialog, { ...baseProps, onCancel });
		await fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('Enter キーで onConfirm が呼ばれる', async () => {
		const onConfirm = vi.fn();
		const { getByRole } = render(ConfirmDialog, { ...baseProps, onConfirm });
		await fireEvent.keyDown(getByRole('dialog'), { key: 'Enter' });
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it('confirmVariant=destructive で確認ボタンに赤色クラスが付く', () => {
		const { getByRole } = render(ConfirmDialog, { ...baseProps, confirmVariant: 'destructive' });
		const confirmBtn = getByRole('button', { name: '実行' });
		expect(confirmBtn.className).toContain('text-red-500');
	});
});
