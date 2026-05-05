import type { Page } from '@playwright/test';
import { addWidget, createItem, createWorkspace, type Workspace } from './ipc.js';

/**
 * 並列バッチで N item を seed する (D7 用 1000 item fixture)。
 * cmd_create_item は単発 1〜2ms 程度のため 1000 件 sequential = 1〜2 秒だが、
 * 並列化で更に短縮。SQLite 単一 Connection + Mutex 構成のため degree-of-parallelism
 * を上げすぎても効果薄、batch=50 で十分。
 */
export async function seedItems(
	page: Page,
	count: number,
	prefix = 'perf',
	batchSize = 50,
): Promise<{ elapsedMs: number; created: number }> {
	const start = Date.now();
	let created = 0;
	for (let offset = 0; offset < count; offset += batchSize) {
		const end = Math.min(offset + batchSize, count);
		const tasks: Promise<unknown>[] = [];
		for (let i = offset; i < end; i++) {
			tasks.push(
				createItem(page, {
					item_type: 'url',
					label: `${prefix}-item-${i.toString().padStart(4, '0')}`,
					target: `https://example.com/${prefix}/${i}`,
					aliases: [],
					tag_ids: [],
				}),
			);
		}
		await Promise.all(tasks);
		created += end - offset;
	}
	return { elapsedMs: Date.now() - start, created };
}

/**
 * 1 workspace を作成し、N widget を配置する (D8 用 100 widget fixture)。
 * widget type は 'favorites' をデフォルト (= 軽量、外部 IO なし)。
 */
export async function seedWidgets(
	page: Page,
	workspaceName: string,
	count: number,
	widgetType = 'favorites',
): Promise<{ workspace: Workspace; elapsedMs: number; created: number }> {
	const workspace = await createWorkspace(page, workspaceName);
	const start = Date.now();
	for (let i = 0; i < count; i++) {
		await addWidget(page, workspace.id, widgetType);
	}
	return { workspace, elapsedMs: Date.now() - start, created: count };
}

/**
 * percentile (0-100) を samples から算出。空 array は -1 を返す。
 */
export function percentile(samples: number[], p: number): number {
	if (samples.length === 0) return -1;
	const sorted = [...samples].sort((a, b) => a - b);
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length * p) / 100) - 1));
	return sorted[idx];
}

export interface PerfStats {
	samples_ms: number[];
	min_ms: number;
	max_ms: number;
	mean_ms: number;
	p95_ms: number;
}

export function summarize(samples: number[]): PerfStats {
	if (samples.length === 0) {
		return { samples_ms: [], min_ms: -1, max_ms: -1, mean_ms: -1, p95_ms: -1 };
	}
	const sum = samples.reduce((a, b) => a + b, 0);
	return {
		samples_ms: samples,
		min_ms: Math.min(...samples),
		max_ms: Math.max(...samples),
		mean_ms: Math.round(sum / samples.length),
		p95_ms: percentile(samples, 95),
	};
}
