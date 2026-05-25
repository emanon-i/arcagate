/**
 * PH-CF-1200 ⑨ unit test:
 * launchItemWithCascade が card_override.opener_id → widgetDefaultOpenerId → item.default_app /
 * system default の順で resolve することを検証する。
 *
 * 右クリック「デフォルトアプリで開く」 (WidgetItemContextMenu.handleLaunchDefault) と
 * widget 内 click 経路 (ExeFolderWatchWidget.launchEntry / ItemWidget.handleLaunch /
 * ProjectsWidget.handleLaunch) が、 同じ helper (`launchItemWithCascade`) に同じ ctx を渡せば
 * 同じ opener / 同じ target で起動する契約を守ることが PH-CF-1200 ⑨ root cause 回避の鍵。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '$lib/types/item';

const launchItemMock = vi.fn();
const launchWithOpenerMock = vi.fn();

vi.mock('$lib/ipc/launch', () => ({
	launchItem: (...args: unknown[]) => launchItemMock(...args),
}));
vi.mock('$lib/ipc/opener', () => ({
	launchWithOpener: (...args: unknown[]) => launchWithOpenerMock(...args),
}));

const baseItem: Item = {
	id: 'item-1',
	item_type: 'exe',
	label: 'App',
	target: 'C:/games/app.exe',
	args: null,
	working_dir: null,
	icon_path: null,
	icon_type: null,
	aliases: [],
	sort_order: 0,
	is_enabled: true,
	is_tracked: true,
	default_app: null,
	card_override_json: null,
	source_widget_id: null,
	source_entry_key: null,
	created_at: '',
	updated_at: '',
};

describe('launchItemWithCascade (PH-CF-1200 ⑨)', () => {
	beforeEach(() => {
		launchItemMock.mockReset();
		launchWithOpenerMock.mockReset();
		launchItemMock.mockResolvedValue(undefined);
		launchWithOpenerMock.mockResolvedValue(undefined);
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('card_override.opener_id が最優先で widgetDefaultOpenerId を上書きする', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		const item: Item = {
			...baseItem,
			card_override_json: JSON.stringify({ opener_id: 'opener-card' }),
		};
		await launchItemWithCascade(item, { widgetDefaultOpenerId: 'opener-widget' });
		expect(launchWithOpenerMock).toHaveBeenCalledExactlyOnceWith('opener-card', item.target);
		expect(launchItemMock).not.toHaveBeenCalled();
	});

	it('card override 無し + widgetDefaultOpenerId 指定 → widget opener で起動 (click と右クリックが同経路)', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		await launchItemWithCascade(baseItem, { widgetDefaultOpenerId: 'opener-widget' });
		expect(launchWithOpenerMock).toHaveBeenCalledExactlyOnceWith('opener-widget', baseItem.target);
		expect(launchItemMock).not.toHaveBeenCalled();
	});

	it('ctx 未指定 (旧 WidgetItemContextMenu の bug 形) → system default に落ちる', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		await launchItemWithCascade(baseItem);
		expect(launchItemMock).toHaveBeenCalledExactlyOnceWith(baseItem.id);
		expect(launchWithOpenerMock).not.toHaveBeenCalled();
	});

	it('widgetDefaultOpenerId が null/undefined → system default に落ちる', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		await launchItemWithCascade(baseItem, { widgetDefaultOpenerId: null });
		expect(launchItemMock).toHaveBeenCalledExactlyOnceWith(baseItem.id);
		expect(launchWithOpenerMock).not.toHaveBeenCalled();
	});

	it('launchTargetWithCascade: widget opener 指定で raw path 起動', async () => {
		const { launchTargetWithCascade } = await import('./launch-cascade');
		await launchTargetWithCascade('C:/games/x.exe', { widgetDefaultOpenerId: 'opener-widget' });
		expect(launchWithOpenerMock).toHaveBeenCalledExactlyOnceWith('opener-widget', 'C:/games/x.exe');
	});

	it('launchTargetWithCascade: opener 未指定なら呼び側に fallback を委ねるため throw', async () => {
		const { launchTargetWithCascade } = await import('./launch-cascade');
		await expect(launchTargetWithCascade('C:/games/x.exe', {})).rejects.toThrow(/no opener/);
		expect(launchWithOpenerMock).not.toHaveBeenCalled();
	});
});
