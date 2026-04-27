import { afterEach, describe, expect, it, vi } from 'vitest';

// @tauri-apps/plugin-updater を mock
vi.mock('@tauri-apps/plugin-updater', () => ({
	check: vi.fn(),
}));

vi.mock('./toast.svelte', () => ({
	toastStore: {
		get toasts() {
			return [] as unknown[];
		},
		add: vi.fn(),
		dismiss: vi.fn(),
	},
}));

afterEach(async () => {
	const mod = await import('./updater.svelte');
	mod.stopUpdaterAutoCheck();
	vi.clearAllMocks();
	if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
		localStorage.clear();
	}
});

describe('updater auto-check', () => {
	it('startUpdaterAutoCheck は idempotent (多重呼び出しで多重 setInterval しない)', async () => {
		const mod = await import('./updater.svelte');
		mod.stopUpdaterAutoCheck(); // reset

		const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

		mod.startUpdaterAutoCheck();
		mod.startUpdaterAutoCheck();
		mod.startUpdaterAutoCheck();

		// 初回のみ setInterval が走る、2 回目以降は no-op
		expect(setIntervalSpy).toHaveBeenCalledTimes(1);
		setIntervalSpy.mockRestore();
	});

	it('stopUpdaterAutoCheck で interval が解除される', async () => {
		const mod = await import('./updater.svelte');
		mod.stopUpdaterAutoCheck(); // reset

		mod.startUpdaterAutoCheck();
		const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
		mod.stopUpdaterAutoCheck();

		expect(clearIntervalSpy).toHaveBeenCalled();
		clearIntervalSpy.mockRestore();
	});
});
