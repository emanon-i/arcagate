import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

// jsdom では matchMedia が未定義のためスタブ（dark 優先）
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: query === '(prefers-color-scheme: dark)',
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe('themeStore.resolvedMode', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.resetAllMocks();
		// matchMedia を dark 優先に戻す
		vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
			matches: query === '(prefers-color-scheme: dark)',
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
	});

	it('"dark" モードは "dark" に解決される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValue(undefined);

		const { themeStore } = await import('./theme.svelte');
		await themeStore.setThemeMode('dark');
		expect(themeStore.resolvedMode).toBe('dark');
	});

	it('"light" モードは "light" に解決される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValue(undefined);

		const { themeStore } = await import('./theme.svelte');
		await themeStore.setThemeMode('light');
		expect(themeStore.resolvedMode).toBe('light');
	});

	it('"system" モードはシステム設定（dark）に解決される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValue(undefined);

		const { themeStore } = await import('./theme.svelte');
		await themeStore.setThemeMode('system');
		expect(themeStore.resolvedMode).toBe('dark');
	});

	it('"system" モードでシステムが light の場合 "light" に解決される', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValue(undefined);

		const { themeStore } = await import('./theme.svelte');

		// matchMedia を light 優先に切り替え
		vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
			matches: query !== '(prefers-color-scheme: dark)',
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		// $derived は activeMode の変化でのみ再評価されるため、
		// 一度 'dark' に変更してから 'system' に戻す
		await themeStore.setThemeMode('dark');
		await themeStore.setThemeMode('system');
		expect(themeStore.resolvedMode).toBe('light');
	});

	it('存在しないカスタム ID は "dark" にフォールバックする', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockResolvedValue(undefined);

		const { themeStore } = await import('./theme.svelte');
		// themes が空の状態でカスタム ID を設定
		await themeStore.setThemeMode('nonexistent-custom-id');
		expect(themeStore.resolvedMode).toBe('dark');
	});
});
