import { Image } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ImageScrapSettings from './ImageScrapSettings.svelte';
import Component from './ImageScrapWidget.svelte';

export const widgetType = 'image_scrap' as const;

/**
 * U-5 (2026-05-12): screens-and-flows.md Workspace § 仕様
 *   「画像をドラックアンドドロップで配置できてスクラップできる
 *    (ウィジェットとして画像表示し、アイテムにも登録)」
 *
 * D&D 経由で workspace に追加されるのが主用途、 sidebar palette からも追加可能。
 */
export const meta: WidgetMeta = {
	Component,
	icon: Image,
	label: '画像',
	defaultConfig: { path: '' },
	defaultSize: { w: 2, h: 2 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'memo',
	categoryOrder: 4,
	SettingsContent: ImageScrapSettings,
};
