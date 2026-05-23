/**
 * PH-CF-500: WidgetSettingsDialog → SettingsContent → 内部 component への widget 情報
 * 受け渡し用の Svelte context key と型。
 *
 * 各 widget の SettingsContent (13 種) の Props 型に widgetId を増やすと prop drilling が
 * 大きくなるため、 WidgetSettingsDialog 側で context に store して、 必要な内部 component
 * (例: WidgetExcludedItemsSection) のみ `getContext(WIDGET_SETTINGS_CTX)` で取り出す。
 */

import type { WidgetType } from '$lib/types/workspace';

/** Settings dialog 内で参照可能な widget meta。 widget 自身の参照 (id / type) のみを保持。 */
export interface WidgetSettingsContext {
	readonly widgetId: string;
	readonly widgetType: WidgetType;
}

export const WIDGET_SETTINGS_CTX = Symbol('arcagate.widget-settings-context');
