/**
 * In-app ヘルプコンテンツ (Nielsen H10 対応 / batch-92 PH-418)
 *
 * - グローバル: 全画面共通の主要ホットキー
 * - 画面別: 各画面 (Library / Workspace / Palette / Settings) の操作リファレンス
 * - i18n: description / title / tips は t() 経由で locale 追従
 */

import { t } from '$lib/i18n.svelte';

export interface HelpHotkey {
	keys: string;
	description: string;
}

export interface HelpScreenSection {
	id: string;
	title: string;
	hotkeys: HelpHotkey[];
	tips: string[];
}

export function getGlobalHotkeys(): HelpHotkey[] {
	return [
		{ keys: 'Ctrl+Shift+Space', description: t('help.global.open_palette') },
		{ keys: '?', description: t('help.global.toggle_help') },
		{ keys: 'Esc', description: t('help.global.close') },
	];
}

export function getScreens(): HelpScreenSection[] {
	return [
		{
			id: 'library',
			title: t('help.library.title'),
			hotkeys: [
				{ keys: '←/→', description: t('help.library.hotkey_move_card') },
				{ keys: t('help.library.hotkey_launch_key'), description: t('help.library.hotkey_launch') },
				{ keys: 'Delete', description: t('help.library.hotkey_delete') },
			],
			tips: [
				t('help.library.tip_dnd'),
				t('help.library.tip_auto_import'),
				t('help.library.tip_card_size'),
			],
		},
		{
			id: 'workspace',
			title: t('help.workspace.title'),
			hotkeys: [
				{
					keys: t('help.workspace.hotkey_edit_mode_key'),
					description: t('help.workspace.hotkey_edit_mode_desc'),
				},
				{
					keys: t('help.workspace.hotkey_right_click_key'),
					description: t('help.workspace.hotkey_right_click_desc'),
				},
				{
					keys: t('help.workspace.hotkey_double_click_key'),
					description: t('help.workspace.hotkey_double_click_desc'),
				},
			],
			tips: [
				t('help.workspace.tip_tabs'),
				t('help.workspace.tip_grid'),
				t('help.workspace.tip_widgets'),
			],
		},
		{
			id: 'palette',
			title: t('help.palette.title'),
			hotkeys: [
				{ keys: 'Ctrl+Shift+Space', description: t('help.palette.hotkey_open') },
				{ keys: '↑/↓', description: t('help.palette.hotkey_select') },
				{ keys: 'Enter', description: t('help.palette.hotkey_launch') },
				{ keys: 'Esc', description: t('help.palette.hotkey_close') },
			],
			tips: [
				t('help.palette.tip_tag_prefix'),
				t('help.palette.tip_calc_url'),
				t('help.palette.tip_clipboard'),
			],
		},
		{
			id: 'settings',
			title: t('help.settings.title'),
			hotkeys: [
				{
					keys: t('help.settings.hotkey_open_key'),
					description: t('help.settings.hotkey_open_desc'),
				},
				{ keys: 'Esc', description: t('help.settings.hotkey_close_desc') },
			],
			tips: [
				t('help.settings.tip_two_pane'),
				t('help.settings.tip_instant'),
				t('help.settings.tip_theme'),
			],
		},
	];
}
