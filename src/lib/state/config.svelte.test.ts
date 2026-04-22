import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

describe('configStore.setWidgetZoom', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.resetAllMocks();
	});

	it('10 の倍数はそのまま保存される', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(60);
		expect(configStore.widgetZoom).toBe(60);
	});

	it('50 未満の値は 50 にクランプされる', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(14);
		expect(configStore.widgetZoom).toBe(50);
	});

	it('200 超の値は 200 にクランプされる', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(250);
		expect(configStore.widgetZoom).toBe(200);
	});

	it('端数は 10 単位に丸められる (74→70)', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(74);
		expect(configStore.widgetZoom).toBe(70);
	});

	it('端数は 10 単位に丸められる (55→60)', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(55);
		expect(configStore.widgetZoom).toBe(60);
	});

	it('境界値 50 はクランプされず 50 のまま', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(50);
		expect(configStore.widgetZoom).toBe(50);
	});

	it('境界値 200 はクランプされず 200 のまま', async () => {
		const { configStore } = await import('./config.svelte');
		configStore.setWidgetZoom(200);
		expect(configStore.widgetZoom).toBe(200);
	});
});

describe('configStore IPC', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.resetAllMocks();
	});

	it('loadConfig() で hotkey / autostart / setupComplete が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke)
			.mockResolvedValueOnce('Ctrl+K') // getHotkey
			.mockResolvedValueOnce(true) // getAutostart
			.mockResolvedValueOnce(true); // isSetupComplete

		const { configStore } = await import('./config.svelte');
		await configStore.loadConfig();

		expect(configStore.hotkey).toBe('Ctrl+K');
		expect(configStore.autostart).toBe(true);
		expect(configStore.setupComplete).toBe(true);
	});

	it('saveHotkey() で hotkey が更新される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValueOnce(undefined); // setHotkey

		const { configStore } = await import('./config.svelte');
		await configStore.saveHotkey('Ctrl+K');

		expect(configStore.hotkey).toBe('Ctrl+K');
	});

	it('saveAutostart() で autostart が更新される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValueOnce(undefined); // setAutostart

		const { configStore } = await import('./config.svelte');
		await configStore.saveAutostart(true);

		expect(configStore.autostart).toBe(true);
	});

	it('completeSetup() で setupComplete が true になる', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValueOnce(undefined); // markSetupComplete

		const { configStore } = await import('./config.svelte');
		await configStore.completeSetup();

		expect(configStore.setupComplete).toBe(true);
	});

	it('loadConfig() IPC エラー時に error state が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC failed'));

		const { configStore } = await import('./config.svelte');
		await configStore.loadConfig();

		expect(configStore.error).toContain('IPC failed');
	});

	it('saveHotkey() IPC エラー時に error state が設定される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('hotkey error'));

		const { configStore } = await import('./config.svelte');
		await configStore.saveHotkey('Ctrl+X');

		expect(configStore.error).toContain('hotkey error');
	});
});
