import { Cpu, Gamepad2, Globe, LayoutDashboard, Sparkles, TerminalSquare } from '@lucide/svelte';
import type { Component } from 'svelte';

export type MockItem = {
	id: string;
	label: string;
	target: string;
	item_type: string;
	category: string;
	tags: string[];
	aliases: string[];
	launch_count: number;
	last_launched: string;
	art: string;
	source: string;
	badge: string;
};

export type MockCategory = {
	label: string;
	icon: Component;
	count: number;
};

export type PaletteResult = {
	icon: Component;
	title: string;
	subtitle: string;
	meta: string;
	accent: string;
};

export const mockItems: MockItem[] = [
	{
		id: 'item-001',
		label: 'Blender 4.2',
		target: String.raw`D:\Apps\Blender42\blender.exe`,
		item_type: 'exe',
		category: '開発ツール',
		tags: ['3D', 'モデリング'],
		aliases: ['bl42', 'blender new'],
		launch_count: 128,
		last_launched: '2時間前',
		art: 'from-violet-600 via-fuchsia-600 to-indigo-700',
		source: 'Local',
		badge: 'Tracked',
	},
	{
		id: 'item-002',
		label: 'Claude Code',
		target: 'claude',
		item_type: 'script',
		category: 'スクリプト',
		tags: ['AI', 'CLI'],
		aliases: ['cla', 'code'],
		launch_count: 94,
		last_launched: '昨日',
		art: 'from-cyan-500 via-sky-500 to-blue-700',
		source: 'PowerShell',
		badge: 'Alias',
	},
	{
		id: 'item-003',
		label: 'Elden Ring',
		target: 'steam://rungameid/1245620',
		item_type: 'exe',
		category: 'ゲーム',
		tags: ['Steam', 'RPG'],
		aliases: [],
		launch_count: 57,
		last_launched: '3日前',
		art: 'from-orange-500 via-amber-500 to-red-700',
		source: 'Steam',
		badge: 'Hidden',
	},
	{
		id: 'item-004',
		label: 'Docs / Arcagate',
		target: 'https://docs.arcagate.dev',
		item_type: 'url',
		category: 'URL / Web',
		tags: ['ドキュメント'],
		aliases: [],
		launch_count: 41,
		last_launched: '1時間前',
		art: 'from-emerald-500 via-teal-500 to-cyan-700',
		source: 'URL',
		badge: 'Pinned',
	},
	{
		id: 'item-005',
		label: 'Blender 3.6',
		target: String.raw`D:\Apps\Blender36\blender.exe`,
		item_type: 'exe',
		category: '開発ツール',
		tags: ['3D', '旧バージョン'],
		aliases: [],
		launch_count: 22,
		last_launched: '先週',
		art: 'from-slate-600 via-slate-500 to-zinc-700',
		source: 'Local',
		badge: 'Versioned',
	},
	{
		id: 'item-006',
		label: 'AI Notes Sync',
		target: String.raw`D:\Scripts\ai_sync.py`,
		item_type: 'script',
		category: 'スクリプト',
		tags: ['Python', '同期'],
		aliases: [],
		launch_count: 12,
		last_launched: '先週',
		art: 'from-pink-500 via-rose-500 to-fuchsia-700',
		source: 'Python',
		badge: 'Pinned',
	},
];

export const mockCategories: MockCategory[] = [
	{ label: 'すべて', icon: LayoutDashboard, count: 248 },
	{ label: 'ゲーム', icon: Gamepad2, count: 86 },
	{ label: '開発ツール', icon: Cpu, count: 52 },
	{ label: 'スクリプト', icon: TerminalSquare, count: 39 },
	{ label: 'URL / Web', icon: Globe, count: 28 },
	{ label: 'フォルダ', icon: LayoutDashboard, count: 21 },
	{ label: 'デフォルト非表示', icon: Sparkles, count: 22 },
];

export const paletteResults: PaletteResult[] = [
	{
		icon: TerminalSquare,
		title: 'Claude Code',
		subtitle: 'Script \u00b7 PowerShell',
		meta: 'alias: cla',
		accent: 'from-cyan-500/30 to-sky-500/20',
	},
	{
		icon: Cpu,
		title: 'Blender 4.2',
		subtitle: 'Dev Tool \u00b7 Local EXE',
		meta: 'recently used',
		accent: 'from-violet-500/30 to-fuchsia-500/20',
	},
	{
		icon: Gamepad2,
		title: 'Elden Ring',
		subtitle: 'Steam \u00b7 Game',
		meta: 'frequent',
		accent: 'from-orange-500/30 to-amber-500/20',
	},
	{
		icon: LayoutDashboard,
		title: 'Open Workspace: Game Dev',
		subtitle: 'Workspace',
		meta: 'Ctrl+1',
		accent: 'from-emerald-500/30 to-teal-500/20',
	},
	{
		icon: Sparkles,
		title: 'calc 1920 / 120',
		subtitle: 'Built-in Command',
		meta: '= 16',
		accent: 'from-pink-500/30 to-rose-500/20',
	},
];

export const selectedItemDetails: [string, string][] = [
	['種別', 'Executable'],
	['ソース', String.raw`Local / D:\Apps\Blender42\blender.exe`],
	['別名', 'bl42, blender new'],
	['最終起動', '2026-03-03 09:12'],
	['起動回数', '128'],
	['追跡', 'ON（フォルダ移動時も追従）'],
];
