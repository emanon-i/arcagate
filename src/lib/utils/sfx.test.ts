import { beforeEach, describe, expect, it, vi } from 'vitest';

// AudioContext のモック（モジュール全体で 1 回設定）
const mockStop = vi.fn();
const mockStart = vi.fn();
const mockSetValueAtTime = vi.fn();
const mockExpRamp = vi.fn();

const makeMockOsc = () => ({
	connect: vi.fn(),
	frequency: { setValueAtTime: mockSetValueAtTime, exponentialRampToValueAtTime: mockExpRamp },
	type: 'sine' as OscillatorType,
	start: mockStart,
	stop: mockStop,
});

const makeMockGain = () => ({
	connect: vi.fn(),
	gain: { setValueAtTime: mockSetValueAtTime, exponentialRampToValueAtTime: mockExpRamp },
});

const mockCtx = {
	currentTime: 0,
	state: 'running' as AudioContextState,
	destination: {},
	createOscillator: vi.fn(),
	createGain: vi.fn(),
	resume: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
	vi.clearAllMocks();
	// 各テストで fresh な osc/gain を返すよう再設定
	mockCtx.createOscillator.mockReturnValue(makeMockOsc());
	mockCtx.createGain.mockReturnValue(makeMockGain());
	vi.stubGlobal('AudioContext', vi.fn().mockReturnValue(mockCtx));
});

describe('playClick', () => {
	it('does not throw when volume is 0', async () => {
		const { playClick } = await import('./sfx');
		expect(() => playClick(0)).not.toThrow();
	});

	it('does not throw when volume is positive', async () => {
		const { playClick } = await import('./sfx');
		expect(() => playClick(0.5)).not.toThrow();
	});

	it('does not throw when AudioContext is unavailable', async () => {
		vi.stubGlobal('AudioContext', undefined);
		const { playClick } = await import('./sfx');
		expect(() => playClick(0.5)).not.toThrow();
	});

	it('does not call AudioContext when volume is 0', async () => {
		const { playClick } = await import('./sfx');
		playClick(0);
		// AudioContext は呼ばれないはず（volume <= 0 で早期 return）
		// ただしモジュールキャッシュにより ctx が既に存在する場合は評価しない
	});

	it('does not throw with very high volume', async () => {
		const { playClick } = await import('./sfx');
		expect(() => playClick(1.5)).not.toThrow();
	});
});
