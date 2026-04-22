import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

describe('hiddenStore', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.resetAllMocks();
	});

	it('toggleDirect() が isHiddenVisible を反転させること', async () => {
		const { hiddenStore } = await import('./hidden.svelte');
		const before = hiddenStore.isHiddenVisible;
		hiddenStore.toggleDirect();
		expect(hiddenStore.isHiddenVisible).toBe(!before);
	});

	it('toggleDirect() を 2 回呼ぶと元の値に戻ること', async () => {
		const { hiddenStore } = await import('./hidden.svelte');
		const original = hiddenStore.isHiddenVisible;
		hiddenStore.toggleDirect();
		hiddenStore.toggleDirect();
		expect(hiddenStore.isHiddenVisible).toBe(original);
	});

	it('loadHiddenCount() が IPC から取得したカウントを保存すること', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValueOnce(7);

		const { hiddenStore } = await import('./hidden.svelte');
		await hiddenStore.loadHiddenCount();

		expect(hiddenStore.hiddenCount).toBe(7);
	});

	it('loadHiddenCount() が IPC エラーを無視してカウントを維持すること', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC error'));

		const { hiddenStore } = await import('./hidden.svelte');
		const countBefore = hiddenStore.hiddenCount;
		await hiddenStore.loadHiddenCount();

		// エラー時はカウントが変わらない
		expect(hiddenStore.hiddenCount).toBe(countBefore);
	});
});
