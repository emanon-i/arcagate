/**
 * PH-479: store mutation + reload を 1 ペアにする helper。
 * 呼び忘れ防止 (toggleStar 後に loadTagWithCounts を呼び忘れて
 * sidebar count が画面切替まで stale だった事例の再発防止)。
 *
 * 使用例:
 * ```ts
 * async function toggleStar(id: string, starred: boolean) {
 *   return withReload(
 *     async () => {
 *       const updated = await itemsIpc.toggleStar(id, starred);
 *       items = items.map((item) => (item.id === id ? { ...updated } : { ...item }));
 *       return updated;
 *     },
 *     loadTagWithCounts,
 *     loadLibraryStats,
 *   );
 * }
 * ```
 *
 * - action: 主要 mutation (IPC + 自 store 更新)
 * - reloads: 依存 store / 集約データの reload を可変長で渡す
 * - エラー時: action throw で reload は走らない (cleanup なし)
 *   reload の個別失敗は catch して無視 (best-effort、UX を止めない)
 */
export async function withReload<T>(
	action: () => Promise<T>,
	...reloads: Array<() => Promise<unknown>>
): Promise<T> {
	const result = await action();
	await Promise.all(reloads.map((fn) => fn().catch(() => undefined)));
	return result;
}
