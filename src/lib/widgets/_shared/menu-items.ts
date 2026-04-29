/**
 * PH-issue-041 / 検収項目 #23: 共通 menuItem helpers。
 *
 * 旧実装は 10 widget が同一の `label: '設定'` を独自定義 → 共通化されていない (P4 一貫性違反)。
 * 本 helper で「Settings dialog を開く」menu item を 1 箇所に集約。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P4 一貫性 / P12 整合性
 * - CLAUDE.md「同じ機能 = 同じ icon + 同じラベル」
 */
import { Settings } from '@lucide/svelte';
import type { Component } from 'svelte';

interface MenuItem {
	label: string;
	icon?: Component;
	onclick: () => void;
}

/** widget の Settings dialog を開く共通 menu item。 */
export function settingsMenuItem(onOpen: () => void): MenuItem {
	return {
		label: '設定',
		icon: Settings,
		onclick: onOpen,
	};
}

/** widget が attached でない場合は空配列、あれば settings menu のみ。 */
export function widgetMenuItems(
	widget: { id: string } | undefined,
	onOpenSettings: () => void,
): MenuItem[] {
	if (!widget) return [];
	return [settingsMenuItem(onOpenSettings)];
}
