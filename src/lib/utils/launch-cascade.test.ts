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
const invokeMock = vi.fn();

vi.mock('$lib/ipc/launch', () => ({
	launchItem: (...args: unknown[]) => launchItemMock(...args),
}));
vi.mock('$lib/ipc/opener', () => ({
	launchWithOpener: (...args: unknown[]) => launchWithOpenerMock(...args),
}));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: (...args: unknown[]) => invokeMock(...args),
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
		invokeMock.mockReset();
		launchItemMock.mockResolvedValue(undefined);
		launchWithOpenerMock.mockResolvedValue(undefined);
		invokeMock.mockResolvedValue(undefined);
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
		const r = await launchItemWithCascade(item, { widgetDefaultOpenerId: 'opener-widget' });
		expect(r.kind).toBe('launched');
		expect(launchWithOpenerMock).toHaveBeenCalledExactlyOnceWith('opener-card', item.target);
		expect(launchItemMock).not.toHaveBeenCalled();
	});

	it('card override 無し + widgetDefaultOpenerId 指定 → widget opener で起動 (click と右クリックが同経路)', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		const r = await launchItemWithCascade(baseItem, { widgetDefaultOpenerId: 'opener-widget' });
		expect(r.kind).toBe('launched');
		expect(launchWithOpenerMock).toHaveBeenCalledExactlyOnceWith('opener-widget', baseItem.target);
		expect(launchItemMock).not.toHaveBeenCalled();
	});

	it('ctx 未指定 (旧 WidgetItemContextMenu の bug 形) → system default に落ちる', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		const r = await launchItemWithCascade(baseItem);
		expect(r.kind).toBe('launched');
		expect(launchItemMock).toHaveBeenCalledExactlyOnceWith(baseItem.id);
		expect(launchWithOpenerMock).not.toHaveBeenCalled();
	});

	it('widgetDefaultOpenerId が null/undefined → system default に落ちる', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		const r = await launchItemWithCascade(baseItem, { widgetDefaultOpenerId: null });
		expect(r.kind).toBe('launched');
		expect(launchItemMock).toHaveBeenCalledExactlyOnceWith(baseItem.id);
		expect(launchWithOpenerMock).not.toHaveBeenCalled();
	});

	// PH-CF-1210 ⑨ (B 採用): opener_not_found + folder → Explorer フォールバック
	it('folder item + widget opener + opener_not_found → Explorer フォールバック (kind=fallback-explorer)', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		launchWithOpenerMock.mockRejectedValueOnce({
			code: 'launch.opener_not_found',
			message: 'Opener program not found in PATH: code',
		});
		const folderItem: Item = {
			...baseItem,
			item_type: 'folder',
			label: 'MyProject',
			target: 'D:/tmp/MyProject',
		};
		const r = await launchItemWithCascade(folderItem, { widgetDefaultOpenerId: 'opener-widget' });
		expect(r.kind).toBe('fallback-explorer');
		expect(r.fallbackFromOpenerId).toBe('opener-widget');
		expect(launchWithOpenerMock).toHaveBeenCalledExactlyOnceWith(
			'opener-widget',
			folderItem.target,
		);
		// invokeMock = `cmd_open_path` フォールバック呼出
		expect(invokeMock).toHaveBeenCalledExactlyOnceWith('cmd_open_path', {
			path: folderItem.target,
		});
	});

	it('folder item + card override + opener_not_found → Explorer フォールバック (card 経路でも fallback)', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		launchWithOpenerMock.mockRejectedValueOnce({
			code: 'launch.opener_not_found',
			message: 'Opener program not found in PATH: blender',
		});
		const folderItem: Item = {
			...baseItem,
			item_type: 'folder',
			label: 'Asset',
			target: 'D:/tmp/Asset',
			card_override_json: JSON.stringify({ opener_id: 'opener-card' }),
		};
		const r = await launchItemWithCascade(folderItem, { widgetDefaultOpenerId: 'opener-widget' });
		expect(r.kind).toBe('fallback-explorer');
		expect(r.fallbackFromOpenerId).toBe('opener-card');
		expect(invokeMock).toHaveBeenCalledExactlyOnceWith('cmd_open_path', {
			path: folderItem.target,
		});
	});

	it('exe item + widget opener + opener_not_found → fallback しない (throw する)', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		const err = {
			code: 'launch.opener_not_found',
			message: 'Opener program not found in PATH: foo',
		};
		launchWithOpenerMock.mockRejectedValueOnce(err);
		await expect(
			launchItemWithCascade(baseItem, { widgetDefaultOpenerId: 'opener-widget' }),
		).rejects.toEqual(err);
		expect(invokeMock).not.toHaveBeenCalled();
	});

	it('folder item + opener が opener_not_found 以外の error → fallback しない (throw する)', async () => {
		const { launchItemWithCascade } = await import('./launch-cascade');
		const err = {
			code: 'launch.failed',
			message: 'Some other failure',
		};
		launchWithOpenerMock.mockRejectedValueOnce(err);
		const folderItem: Item = { ...baseItem, item_type: 'folder', target: 'C:/x' };
		await expect(
			launchItemWithCascade(folderItem, { widgetDefaultOpenerId: 'opener-widget' }),
		).rejects.toEqual(err);
		expect(invokeMock).not.toHaveBeenCalled();
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
