import { describe, expect, it } from 'vitest';
import type { WidgetType } from '$lib/bindings/WidgetType';
import { WIDGET_LABELS } from '$lib/types/workspace';
import { widgetRegistry } from './index';

/**
 * 過去の DB 互換のため Rust enum / WIDGET_LABELS には残っているが、
 * フロント側 registry には登録されない deprecated widget。
 * Polish Era で完全削除候補。
 */
const DEPRECATED_WIDGETS: ReadonlySet<WidgetType> = new Set(['watched_folders']);

const allWidgetTypes = Object.keys(WIDGET_LABELS) as WidgetType[];
const activeWidgetTypes = allWidgetTypes.filter((t) => !DEPRECATED_WIDGETS.has(t));

describe('widgetRegistry', () => {
	it('active な全 WidgetType が registry に登録されている（バインディング欠落の検出）', () => {
		const registeredTypes = Object.keys(widgetRegistry).sort();
		const expectedTypes = [...activeWidgetTypes].sort();
		expect(registeredTypes).toEqual(expectedTypes);
	});

	it('deprecated widget は registry に未登録（消し忘れ防止）', () => {
		for (const type of DEPRECATED_WIDGETS) {
			expect(
				widgetRegistry[type],
				`deprecated widget '${type}' が registry に紛れ込んでいる`,
			).toBeUndefined();
		}
	});

	it('各 widget meta は Component / icon / label を持つ', () => {
		for (const type of activeWidgetTypes) {
			const meta = widgetRegistry[type];
			expect(meta, `widget '${type}' の meta が registry にない`).toBeDefined();
			expect(meta?.Component, `widget '${type}' に Component がない`).toBeDefined();
			expect(meta?.icon, `widget '${type}' に icon がない`).toBeDefined();
			expect(typeof meta?.label).toBe('string');
		}
	});

	it('label は WIDGET_LABELS と一致する（重複定義の検出）', () => {
		for (const type of activeWidgetTypes) {
			const meta = widgetRegistry[type];
			expect(meta?.label).toBe(WIDGET_LABELS[type]);
		}
	});

	it('全 active widget が SettingsContent を持つ（PH-375 で集約）', () => {
		for (const type of activeWidgetTypes) {
			const meta = widgetRegistry[type];
			expect(
				meta?.SettingsContent,
				`widget '${type}' に SettingsContent が登録されていない（widgets/${type}/index.ts で SettingsContent: ... を追加してください）`,
			).toBeDefined();
		}
	});

	it('addable は boolean', () => {
		for (const type of activeWidgetTypes) {
			const meta = widgetRegistry[type];
			expect(typeof meta?.addable).toBe('boolean');
		}
	});
});
