export interface TagSuggestion {
	id: string;
	name: string;
}

/**
 * 入力テキストに対するタグ候補をフィルタする。
 * - prefix マッチを優先、その後 contains マッチ
 * - case-insensitive
 * - 既に選択中のタグは除外
 */
export function filterTagSuggestions(
	allTags: TagSuggestion[],
	query: string,
	selectedIds: ReadonlySet<string>,
	limit = 8,
): TagSuggestion[] {
	const q = query.trim().toLowerCase();
	const candidates = allTags.filter((t) => !selectedIds.has(t.id));
	if (!q) return candidates.slice(0, limit);

	const prefix: TagSuggestion[] = [];
	const contains: TagSuggestion[] = [];
	for (const t of candidates) {
		const lower = t.name.toLowerCase();
		if (lower.startsWith(q)) {
			prefix.push(t);
		} else if (lower.includes(q)) {
			contains.push(t);
		}
	}
	return [...prefix, ...contains].slice(0, limit);
}

/**
 * `query` が既存タグに完全一致するか判定。新規作成 candidate を出すか判定するため。
 */
export function isExistingTag(allTags: TagSuggestion[], query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return allTags.some((t) => t.name.toLowerCase() === q);
}
