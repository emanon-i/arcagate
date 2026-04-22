import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

// テストは同一モジュールインスタンスを共有するため、
// setWidgetZoom の値が連続した場合でもガード条件を回避するよう
// 意図的に異なる値を順番に設定している
describe('configStore.setWidgetZoom', () => {
	it('10 の倍数はそのまま保存される', async () => {
		const { configStore } = await import('./config.svelte');
		// 初期値 DEFAULT_ZOOM=100 から変更
		configStore.setWidgetZoom(60);
		expect(configStore.widgetZoom).toBe(60);
	});

	it('50 未満の値は 50 にクランプされる', async () => {
		const { configStore } = await import('./config.svelte');
		// state=60 → round(1.4)*10=10 → max(50,10)=50
		configStore.setWidgetZoom(14);
		expect(configStore.widgetZoom).toBe(50);
	});

	it('200 超の値は 200 にクランプされる', async () => {
		const { configStore } = await import('./config.svelte');
		// state=50 → 200≠50
		configStore.setWidgetZoom(250);
		expect(configStore.widgetZoom).toBe(200);
	});

	it('端数は 10 単位に丸められる (74→70)', async () => {
		const { configStore } = await import('./config.svelte');
		// state=200 → round(7.4)*10=70
		configStore.setWidgetZoom(74);
		expect(configStore.widgetZoom).toBe(70);
	});

	it('端数は 10 単位に丸められる (55→60)', async () => {
		const { configStore } = await import('./config.svelte');
		// state=70 → round(5.5)*10=60
		configStore.setWidgetZoom(55);
		expect(configStore.widgetZoom).toBe(60);
	});

	it('境界値 50 はクランプされず 50 のまま', async () => {
		const { configStore } = await import('./config.svelte');
		// state=60 → 50≠60
		configStore.setWidgetZoom(50);
		expect(configStore.widgetZoom).toBe(50);
	});

	it('境界値 200 はクランプされず 200 のまま', async () => {
		const { configStore } = await import('./config.svelte');
		// state=50 → 200≠50
		configStore.setWidgetZoom(200);
		expect(configStore.widgetZoom).toBe(200);
	});
});
