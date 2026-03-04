export type MockWorkspace = {
	id: string;
	name: string;
};

export const mockWorkspaces: MockWorkspace[] = [
	{ id: 'ws-001', name: 'Today' },
	{ id: 'ws-002', name: 'Game Dev' },
	{ id: 'ws-003', name: 'Writing' },
	{ id: 'ws-004', name: 'AI Ops' },
];

export const favorites: string[] = [
	'Claude Code',
	'Blender 4.2',
	'Steam',
	'Arcagate Docs',
	'Obsidian Vault',
];

export const recentLaunches: [string, string][] = [
	['Claude Code', '3分前'],
	['Arcagate Docs', '25分前'],
	['Blender 4.2', '2時間前'],
	['PowerShell: clean build', '昨日'],
];

export const projectShortcuts: [string, string][] = [
	['Arcagate', 'main \u00b7 clean'],
	['VoiceReins', 'feat/mcp \u00b7 2 changes'],
	['Synfragia', 'docs \u00b7 ahead 1'],
];

export const watchFolders: [string, string][] = [
	[String.raw`D:\Games`, '新規EXEを検出したら候補化'],
	[String.raw`D:\DevTools`, 'バージョン違いを自動グループ化'],
	[String.raw`D:\Scripts`, 'ps1 / bat 更新を追跡'],
	['Downloads', '登録候補を一時トレイへ'],
];

export const quickActions: string[] = [
	'Open palette',
	'Import DB',
	'Export DB',
	'Theme edit',
	'Snippet',
	'Calculator',
];
