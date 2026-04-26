/**
 * ナビゲーション項目レジストリ。
 *
 * 同じ機能には同じアイコン + 同じラベルを画面間で使うため、ここで一元管理する。
 * 各画面（TitleBar / SettingsPanel カテゴリ / Sidebar 等）は本ファイルから参照し、
 * 個別に icon import + label 直書きをしない。
 *
 * **ラベル原則** (CLAUDE.md / desktop_ui_ux_agent_rules.md P4 補足):
 * - アイコン名（Star / Archive 等）はラベルに書かない
 * - ラベルは機能 / 状態 / アクション
 *
 * **言語ポリシー**: 本体タブが英語 (Library / Workspace / Settings / Palette) のため、
 * 設定タブも英語で統一。日本語にする場合はここを 1 箇所変更すれば全画面追従。
 */

import {
	Archive,
	Database,
	Info,
	LayoutDashboard,
	Palette,
	Search,
	Settings2,
} from '@lucide/svelte';
import type { Component } from 'svelte';

export interface NavItem {
	icon: Component;
	label: string;
	/** スクリーンリーダー / aria-label 用の機能説明（英訳しても自然なもの）*/
	ariaLabel?: string;
}

/** トップレベルナビ（TitleBar / メインタブ）*/
export const NAV_TOP = {
	library: { icon: Archive, label: 'Library' },
	workspace: { icon: LayoutDashboard, label: 'Workspace' },
	settings: { icon: Settings2, label: 'Settings' },
	palette: { icon: Search, label: 'Palette' },
} as const satisfies Record<string, NavItem>;

/** Settings 内カテゴリ */
export const NAV_SETTINGS = {
	general: { icon: Settings2, label: 'General' },
	workspace: { icon: LayoutDashboard, label: 'Workspace' },
	library: { icon: Archive, label: 'Library' },
	appearance: { icon: Palette, label: 'Appearance' },
	data: { icon: Database, label: 'Data' },
	about: { icon: Info, label: 'About' },
} as const satisfies Record<string, NavItem>;

export type NavTopId = keyof typeof NAV_TOP;
export type NavSettingsId = keyof typeof NAV_SETTINGS;
