import { beforeEach, describe, expect, it, vi } from 'vitest';

// localStorage モック
const storage: Record<string, string> = {};
const localStorageMock = {
	getItem: (key: string) => storage[key] ?? null,
	setItem: (key: string, value: string) => {
		storage[key] = value;
	},
	removeItem: (key: string) => {
		delete storage[key];
	},
	clear: () => {
		for (const key in storage) delete storage[key];
	},
};

beforeEach(() => {
	localStorageMock.clear();
	vi.stubGlobal('localStorage', localStorageMock);
	// モジュールキャッシュをリセットして各テストが独立した state を持つ
	vi.resetModules();
});

describe('soundStore', () => {
	it('soundEnabled defaults to true when localStorage is empty', async () => {
		const { soundStore } = await import('./sound.svelte');
		expect(soundStore.soundEnabled).toBe(true);
	});

	it('soundVolume defaults to 0.4 when localStorage is empty', async () => {
		const { soundStore } = await import('./sound.svelte');
		expect(soundStore.soundVolume).toBeCloseTo(0.4);
	});

	it('setSoundEnabled persists to localStorage', async () => {
		const { soundStore } = await import('./sound.svelte');
		soundStore.setSoundEnabled(false);
		expect(soundStore.soundEnabled).toBe(false);
		expect(localStorageMock.getItem('sound-enabled')).toBe('false');
	});

	it('setSoundEnabled true restores from localStorage', async () => {
		localStorageMock.setItem('sound-enabled', 'false');
		const { soundStore } = await import('./sound.svelte');
		expect(soundStore.soundEnabled).toBe(false);
		soundStore.setSoundEnabled(true);
		expect(soundStore.soundEnabled).toBe(true);
	});

	it('setSoundVolume clamps to 0.0–1.0', async () => {
		const { soundStore } = await import('./sound.svelte');
		soundStore.setSoundVolume(1.5);
		expect(soundStore.soundVolume).toBe(1);
		soundStore.setSoundVolume(-0.5);
		expect(soundStore.soundVolume).toBe(0);
	});

	it('setSoundVolume persists to localStorage', async () => {
		const { soundStore } = await import('./sound.svelte');
		soundStore.setSoundVolume(0.7);
		expect(localStorageMock.getItem('sound-volume')).toBe('0.7');
	});

	it('reads soundEnabled from localStorage on init', async () => {
		localStorageMock.setItem('sound-enabled', 'false');
		const { soundStore } = await import('./sound.svelte');
		expect(soundStore.soundEnabled).toBe(false);
	});

	it('reads soundVolume from localStorage on init', async () => {
		localStorageMock.setItem('sound-volume', '0.6');
		const { soundStore } = await import('./sound.svelte');
		expect(soundStore.soundVolume).toBeCloseTo(0.6);
	});
});
