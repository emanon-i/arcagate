export type LibraryStats = {
	totalItems: number;
	weeklyLaunches: number;
	trackedPaths: number;
	topUsed: string;
};

export const libraryStats: LibraryStats = {
	totalItems: 248,
	weeklyLaunches: 61,
	trackedPaths: 94,
	topUsed: 'Top 10',
};

export const statCards: { label: string; value: string | number }[] = [
	{ label: '総アイテム', value: 248 },
	{ label: '今週の起動', value: 61 },
	{ label: '追跡中パス', value: 94 },
	{ label: 'よく使う', value: 'Top 10' },
];
