/**
 * Item 起動の cascade resolve (C-15 #10 + #19 統合)。
 *
 * 優先順:
 * 1. card_override.opener_id (Library カード個別設定の Opener override、最優先)
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
 */

import { launchItem } from '$lib/ipc/launch';
import { launchWithOpener } from '$lib/ipc/opener';
import type { Item } from '$lib/types/item';
import { getCardOpenerId } from './card-override';

export interface CascadeContext {
	/** Widget settings の default_opener_id (caller widget の config で指定)。 */
	widgetDefaultOpenerId?: string | null;
}

export async function launchItemWithCascade(item: Item, ctx?: CascadeContext): Promise<void> {
	// 1. card_override.opener_id
	const cardOpener = getCardOpenerId(item);
	if (cardOpener) {
		await launchWithOpener(cardOpener, item.target);
		return;
	}
	// 2. widget.default_opener_id
	if (ctx?.widgetDefaultOpenerId) {
		await launchWithOpener(ctx.widgetDefaultOpenerId, item.target);
		return;
	}
	// 3. system default (item.default_app / launch_service)
	await launchItem(item.id);
}

/**
 * target path を直接受け取って launch (item 未登録 / raw path 起動用)。
 * cascade は widget レベルのみ、card override は item 必須なので適用不可。
 */
export async function launchTargetWithCascade(target: string, ctx?: CascadeContext): Promise<void> {
	if (ctx?.widgetDefaultOpenerId) {
		await launchWithOpener(ctx.widgetDefaultOpenerId, target);
		return;
	}
	throw new Error('launchTargetWithCascade: no opener specified, caller must fallback');
}
