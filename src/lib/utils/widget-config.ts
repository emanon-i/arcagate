/**
 * ウィジェット設定 JSON をパースし、デフォルト値とマージして返す。
 * パース失敗時はデフォルトをそのまま返す。
 */
export function parseWidgetConfig<T extends object>(
	raw: string | null | undefined,
	defaults: T,
): T {
	if (!raw) return defaults;
	try {
		const parsed = JSON.parse(raw) as Partial<T>;
		return { ...defaults, ...parsed };
	} catch {
		return defaults;
	}
}
