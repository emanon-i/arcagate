/**
 * Item 起動の cascade resolve (C-15 #10 + #19 統合)。
 *
 * 優先順:
 * 1. card_override.opener_id (Library カード個別設定の Opener override、最優先)
 * 2. (将来) widget config.default_opener (Widget settings、別 PR で実装予定)
 * 3. item.default_app / system default 経由 (cmd_launch_item の既存 cascade)
 *
 * 呼び元:
 * - Library card click / dblclick の launch
 * - Workspace ItemWidget click / dblclick の launch
 *
 * 注意:
 * - 1 が指定された場合、cmd_launch_with_opener 経由で OS 起動 (launch_log は Opener 側で記録)
 * - 1 が未指定なら cmd_launch_item に delegate (item.default_app / launch_service の既存
 *   resolve に乗る)
 */

import { launchItem } from '$lib/ipc/launch';
import { launchWithOpener } from '$lib/ipc/opener';
import type { Item } from '$lib/types/item';
import { getCardOpenerId } from './card-override';

export async function launchItemWithCascade(item: Item): Promise<void> {
	const openerId = getCardOpenerId(item);
	if (openerId) {
		await launchWithOpener(openerId, item.target);
		return;
	}
	await launchItem(item.id);
}
