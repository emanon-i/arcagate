import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('toastStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('add() appends a toast with correct type and message', async () => {
		const { toastStore } = await import('./toast.svelte');
		toastStore.add('Test message', 'success');
		expect(toastStore.toasts).toHaveLength(1);
		expect(toastStore.toasts[0].message).toBe('Test message');
		expect(toastStore.toasts[0].type).toBe('success');
	});

	it('add() defaults to info type', async () => {
		const { toastStore } = await import('./toast.svelte');
		toastStore.add('Info message');
		const toast = toastStore.toasts.find((t) => t.message === 'Info message');
		expect(toast?.type).toBe('info');
	});

	it('auto-removes toast after 3 seconds', async () => {
		const { toastStore } = await import('./toast.svelte');
		const initialCount = toastStore.toasts.length;
		toastStore.add('Temporary', 'error');
		expect(toastStore.toasts.length).toBe(initialCount + 1);
		vi.advanceTimersByTime(3000);
		expect(toastStore.toasts.find((t) => t.message === 'Temporary')).toBeUndefined();
	});

	it('dismiss() removes a specific toast', async () => {
		const { toastStore } = await import('./toast.svelte');
		toastStore.add('Keep', 'info');
		toastStore.add('Remove', 'error');
		const removeToast = toastStore.toasts.find((t) => t.message === 'Remove');
		expect(removeToast).toBeDefined();
		toastStore.dismiss(removeToast?.id as number);
		expect(toastStore.toasts.find((t) => t.message === 'Remove')).toBeUndefined();
		expect(toastStore.toasts.find((t) => t.message === 'Keep')).toBeDefined();
	});

	it('each toast gets a unique id', async () => {
		const { toastStore } = await import('./toast.svelte');
		toastStore.add('A', 'success');
		toastStore.add('B', 'error');
		const ids = toastStore.toasts.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('2999ms では自動削除されない（境界値）', async () => {
		const { toastStore } = await import('./toast.svelte');
		toastStore.add('境界値テスト', 'info');
		vi.advanceTimersByTime(2999);
		expect(toastStore.toasts.find((t) => t.message === '境界値テスト')).toBeDefined();
	});

	it('各トーストは独立したタイムアウトを持つ', async () => {
		const { toastStore } = await import('./toast.svelte');
		toastStore.add('先に追加', 'info');
		vi.advanceTimersByTime(1500);
		toastStore.add('後から追加', 'success');
		vi.advanceTimersByTime(1500);
		// 先のトースト: 3000ms 経過 → 削除
		// 後のトースト: 1500ms 経過 → まだ残る
		expect(toastStore.toasts.find((t) => t.message === '先に追加')).toBeUndefined();
		expect(toastStore.toasts.find((t) => t.message === '後から追加')).toBeDefined();
	});
});
