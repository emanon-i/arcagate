/**
 * Item 起動の cascade resolve (C-15 #10 + #19 統合)。
 *
 * 優先順:
 * 1. card_override.opener_id (Library カード見た目設定の Opener override、最優先)
 * 2. widget.default_opener_id (Widget settings、ItemWidget / ExeFolder 等で指定)
 * 3. item.default_app / system default 経由 (cmd_launch_item の既存 cascade)
 *
 * 呼び元:
 * - Library card click / dblclick の launch
 * - Workspace ItemWidget click / dblclick の launch (widget.config.default_opener_id を渡す)
 * - ExeFolderWatchWidget の exe entry launch (widget.config.default_opener_id を渡す)
 *
 * 注意:
 * - 1 / 2 が指定された場合、cmd_launch_with_opener 経由で OS 起動
 * - どちらも未指定なら cmd_launch_item に delegate (item.default_app / launch_service の
 *   既存 resolve に乗る)
 *
 * PH-CF-1210 ⑨ (B 採用): opener program が PATH に解決できない (= backend が
 * `launch.opener_not_found` を返す) で **アイテムが folder** のときは、 Explorer で開く
 * フォールバックを実行する。 user が click した folder が確実に開く (opener が壊れていても
 * 「ダブルクリック = 何かが起きる」 を維持) のが daily-use として欠かせないため。 caller には
 * `CascadeResult` で fallback 状況を返し、 必要なら warn toast を出せる。
 */

import { invoke } from '@tauri-apps/api/core';
import { launchItem } from '$lib/ipc/launch';
import { launchWithOpener } from '$lib/ipc/opener';
import type { Item } from '$lib/types/item';
import { getCardOpenerId } from './card-override';

export interface CascadeContext {
	/** Widget settings の default_opener_id (caller widget の config で指定)。 */
	widgetDefaultOpenerId?: string | null;
}

/**
 * cascade の実行結果。 fallback 経路を通った場合は caller (widget handler) が ui に通知できる
 * よう mode を持たせる。 通常成功は `kind: 'launched'`、 folder + opener_not_found による
 * Explorer フォールバックは `kind: 'fallback-explorer'`。
 */
export interface CascadeResult {
	kind: 'launched' | 'fallback-explorer';
	/** fallback の場合に caller の info toast に表示する元 opener id (decorative)。 */
	fallbackFromOpenerId?: string;
}

function isOpenerNotFoundError(e: unknown): boolean {
	if (typeof e !== 'object' || e === null) return false;
	const code = (e as { code?: unknown }).code;
	return code === 'launch.opener_not_found';
}

/** folder item を Explorer で開く (= `cmd_open_path` の `launch_folder` 経由)。 */
async function openInExplorer(target: string): Promise<void> {
	await invoke<void>('cmd_open_path', { path: target });
}

export async function launchItemWithCascade(
	item: Item,
	ctx?: CascadeContext,
): Promise<CascadeResult> {
	// 1. card_override.opener_id
	const cardOpener = getCardOpenerId(item);
	if (cardOpener) {
		try {
			await launchWithOpener(cardOpener, item.target);
			return { kind: 'launched' };
		} catch (e: unknown) {
			if (isOpenerNotFoundError(e) && item.item_type === 'folder') {
				await openInExplorer(item.target);
				return { kind: 'fallback-explorer', fallbackFromOpenerId: cardOpener };
			}
			throw e;
		}
	}
	// 2. widget.default_opener_id
	if (ctx?.widgetDefaultOpenerId) {
		try {
			await launchWithOpener(ctx.widgetDefaultOpenerId, item.target);
			return { kind: 'launched' };
		} catch (e: unknown) {
			if (isOpenerNotFoundError(e) && item.item_type === 'folder') {
				await openInExplorer(item.target);
				return {
					kind: 'fallback-explorer',
					fallbackFromOpenerId: ctx.widgetDefaultOpenerId,
				};
			}
			throw e;
		}
	}
	// 3. system default (item.default_app / launch_service)
	await launchItem(item.id);
	return { kind: 'launched' };
}

/**
 * target path を直接受け取って launch (item 未登録 / raw path 起動用)。
 * cascade は widget レベルのみ、card override は item 必須なので適用不可。
 *
 * PH-CF-1210 ⑨: opener が解決できない folder は本 helper の caller (ExeFolderWatchWidget の
 * launchEntry) で raw path を持っていないので、 ここでの自動 Explorer フォールバックは scope 外。
 * caller (= ExeFolder 等) が必要なら自分で fallback してください (ExeFolder の場合は素直に
 * `cmd_open_path` に流すのが既存挙動)。
 */
export async function launchTargetWithCascade(target: string, ctx?: CascadeContext): Promise<void> {
	if (ctx?.widgetDefaultOpenerId) {
		await launchWithOpener(ctx.widgetDefaultOpenerId, target);
		return;
	}
	throw new Error('launchTargetWithCascade: no opener specified, caller must fallback');
}
