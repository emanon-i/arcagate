import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastAdd = vi.fn<(message: string, type: 'error' | 'info' | 'success') => void>();

vi.mock('./toast.svelte', () => ({
	toastStore: { add: (m: string, t: 'error' | 'info' | 'success') => toastAdd(m, t) },
}));

beforeEach(async () => {
	vi.resetModules();
	toastAdd.mockReset();
	const mod = await import('./error-monitor.svelte');
	mod.uninstallErrorMonitor();
	mod.__resetForTest();
});

afterEach(async () => {
	const mod = await import('./error-monitor.svelte');
	mod.uninstallErrorMonitor();
});

describe('error-monitor', () => {
	it('install すると window 上に listener が attach される (Spy 経由で確認)', async () => {
		const addSpy = vi.spyOn(window, 'addEventListener');
		const { installErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		const events = addSpy.mock.calls.map((c) => c[0]);
		expect(events).toContain('unhandledrejection');
		expect(events).toContain('error');
	});

	it('install は idempotent (2 回呼んでも listener 重複 attach しない)', async () => {
		const addSpy = vi.spyOn(window, 'addEventListener');
		const { installErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		const callsAfter1st = addSpy.mock.calls.filter(
			(c) => c[0] === 'unhandledrejection' || c[0] === 'error',
		).length;
		installErrorMonitor();
		const callsAfter2nd = addSpy.mock.calls.filter(
			(c) => c[0] === 'unhandledrejection' || c[0] === 'error',
		).length;
		expect(callsAfter2nd).toBe(callsAfter1st);
	});

	it('uninstall で listener が detach される', async () => {
		const removeSpy = vi.spyOn(window, 'removeEventListener');
		const { installErrorMonitor, uninstallErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		uninstallErrorMonitor();
		const events = removeSpy.mock.calls.map((c) => c[0]);
		expect(events).toContain('unhandledrejection');
		expect(events).toContain('error');
	});

	it('window error event で toast が level=error で出る', async () => {
		const { installErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		window.dispatchEvent(new ErrorEvent('error', { message: 'boom!', error: new Error('boom!') }));
		expect(toastAdd).toHaveBeenCalledOnce();
		expect(toastAdd.mock.calls[0][0]).toContain('boom!');
		expect(toastAdd.mock.calls[0][1]).toBe('error');
	});

	it('同 error message 連発は toast 1 回まで (5s suppression)', async () => {
		const { installErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		window.dispatchEvent(new ErrorEvent('error', { message: 'boom!', error: new Error('boom!') }));
		window.dispatchEvent(new ErrorEvent('error', { message: 'boom!', error: new Error('boom!') }));
		window.dispatchEvent(new ErrorEvent('error', { message: 'boom!', error: new Error('boom!') }));
		expect(toastAdd).toHaveBeenCalledOnce();
	});

	it('別 message は別 toast', async () => {
		const { installErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		window.dispatchEvent(new ErrorEvent('error', { message: 'a', error: new Error('a') }));
		window.dispatchEvent(new ErrorEvent('error', { message: 'b', error: new Error('b') }));
		expect(toastAdd).toHaveBeenCalledTimes(2);
	});

	it('Error instance 以外の reason (string / object) も message に変換される', async () => {
		const { installErrorMonitor } = await import('./error-monitor.svelte');
		installErrorMonitor();
		const ev = new Event('unhandledrejection') as unknown as PromiseRejectionEvent;
		Object.defineProperty(ev, 'reason', { value: { code: 'X', detail: 'oops' } });
		window.dispatchEvent(ev);
		expect(toastAdd).toHaveBeenCalledOnce();
		expect(toastAdd.mock.calls[0][0]).toContain('oops');
	});
});
