/**
 * Widget レジストリ単一情報源（batch-83 PH-370）。
 *
 * 各 `src/lib/widgets/<name>/index.ts` から widgetType + meta を auto-collect し、
 * `widgetRegistry: Record<WidgetType, WidgetMeta>` を構築。
 *
 * 使用箇所:
 * - WorkspaceLayout: widgetRegistry[type].Component で動的 mount
 * - WorkspaceSidebar: addable === true の widget を palette に列挙
 * - WidgetSettingsDialog (PH-371): widgetRegistry[type].SettingsContent を動的 mount
 */
import type { WidgetType } from '$lib/bindings/WidgetType';
import type { WidgetMeta, WidgetModule } from './_shared/types';

const modules = import.meta.glob<WidgetModule>('./*/index.ts', { eager: true });

export const widgetRegistry = Object.fromEntries(
	Object.values(modules).map((m) => [m.widgetType, m.meta]),
) as Partial<Record<WidgetType, WidgetMeta>>;

/**
 * batch-83 で段階的移行中のため `Partial`。全 14 widget が移動完了したら
 * `Record<WidgetType, WidgetMeta>` に昇格する（型レベルで完全網羅を強制）。
 */
