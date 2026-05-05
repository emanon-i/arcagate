import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryEntry } from './workspace-history.svelte';

beforeEach(() => {
	vi.useFakeTimers({ now: new Date('2026-05-05T00:00:00Z') });
	vi.resetModules();
});

afterEach(() => {
	vi.useRealTimers();
});

const removeEntry = (widgetId: string): HistoryEntry => ({
	kind: 'remove',
	workspaceId: 'ws-1',
	widgetId,
	widgetType: 'favorites',
	rect: { x: 0, y: 0, w: 4, h: 4 },
	config: null,
});

const moveEntry = (widgetId: string): HistoryEntry => ({
	kind: 'move',
	widgetId,
	before: { x: 0, y: 0, w: 4, h: 4 },
	after: { x: 1, y: 1, w: 4, h: 4 },
});

describe('workspaceHistory pendingUndo (R8-3)', () => {
	it('records remove → pendingUndo を 5 秒間立てる', async () => {
		const { workspaceHistory } = await import('./workspace-history.svelte');
		expect(workspaceHistory.pendingUndo).toBeNull();
		workspaceHistory.record(removeEntry('w1'));
		expect(workspaceHistory.pendingUndo).not.toBeNull();
		expect(workspaceHistory.pendingUndo?.widgetType).toBe('favorites');
		expect(workspaceHistory.pendingUndo?.widgetLabel).toBe('お気に入り');

		vi.advanceTimersByTime(4_999);
		expect(workspaceHistory.pendingUndo).not.toBeNull();
		vi.advanceTimersByTime(1);
		expect(workspaceHistory.pendingUndo).toBeNull();
	});

	it('move / resize / config では pendingUndo を立てない', async () => {
		const { workspaceHistory } = await import('./workspace-history.svelte');
		workspaceHistory.record(moveEntry('w1'));
		expect(workspaceHistory.pendingUndo).toBeNull();
		workspaceHistory.record({
			kind: 'config',
			widgetId: 'w1',
			before: null,
			after: '{"key":"value"}',
		});
		expect(workspaceHistory.pendingUndo).toBeNull();
	});

	it('連続 remove で pending は最新 entry に上書き、TTL も extend', async () => {
		const { workspaceHistory } = await import('./workspace-history.svelte');
		workspaceHistory.record(removeEntry('w1'));
		const firstSeq = workspaceHistory.pendingUndo?.seq ?? -1;
		vi.advanceTimersByTime(2_000);
		workspaceHistory.record(removeEntry('w2'));
		const secondSeq = workspaceHistory.pendingUndo?.seq ?? -1;
		expect(secondSeq).toBeGreaterThan(firstSeq);
		// 1 件目の TTL が満了してもまだ残る (= 上書きされた最新 pending が生きている)
		vi.advanceTimersByTime(3_000);
		expect(workspaceHistory.pendingUndo).not.toBeNull();
		vi.advanceTimersByTime(2_000);
		expect(workspaceHistory.pendingUndo).toBeNull();
	});

	it('dismiss() で即座に消える', async () => {
		const { workspaceHistory } = await import('./workspace-history.svelte');
		workspaceHistory.record(removeEntry('w1'));
		expect(workspaceHistory.pendingUndo).not.toBeNull();
		workspaceHistory.dismiss();
		expect(workspaceHistory.pendingUndo).toBeNull();
	});

	it('clear() は pending も含めて全クリア', async () => {
		const { workspaceHistory } = await import('./workspace-history.svelte');
		workspaceHistory.record(removeEntry('w1'));
		workspaceHistory.record(moveEntry('w2'));
		expect(workspaceHistory.canUndo).toBe(true);
		expect(workspaceHistory.pendingUndo).not.toBeNull();
		workspaceHistory.clear();
		expect(workspaceHistory.canUndo).toBe(false);
		expect(workspaceHistory.pendingUndo).toBeNull();
	});
});
