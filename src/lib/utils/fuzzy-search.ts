/**
 * 軽量 fuzzy match (subsequence + 大小区別なし) (L2-C C4)。
 *
 * 外部 lib に依存せず、文字位置の subsequence マッチで 0-1 score を計算する。
 * - 0 = 一致無し / 0.x = 部分一致 (連続性 / prefix bonus 加味) / 1 = 完全一致
 * - matchAll で startsWith bonus + 連続マッチで bonus + 早期マッチ位置で bonus
 *
 * 用途: LibraryMainArea の filteredItems を score 順に並べ替え。
 */

/** needle が haystack の subsequence かつ大小区別なしで一致するか + simple score。 */
export function fuzzyScore(needle: string, haystack: string): number {
	if (needle.length === 0) return 1;
	const n = needle.toLowerCase();
	const h = haystack.toLowerCase();

	if (h === n) return 1;
	if (h.startsWith(n)) return 0.95;
	if (h.includes(n)) return 0.85;

	// subsequence match (順序維持で全文字を haystack に出せるか)
	let i = 0; // needle ptr
	let j = 0; // haystack ptr
	let consecutive = 0;
	let bonusSum = 0;
	while (i < n.length && j < h.length) {
		if (n[i] === h[j]) {
			consecutive++;
			// 連続マッチに対し 0.05 / step、word boundary 直後に 0.1 加点
			const isBoundary = j === 0 || /\s|[-_.]/.test(h[j - 1]);
			bonusSum += 0.05 * consecutive + (isBoundary ? 0.1 : 0);
			i++;
			j++;
		} else {
			consecutive = 0;
			j++;
		}
	}
	if (i < n.length) return 0; // 残り needle が存在 = 一致なし

	// 全文字 subsequence マッチ。base 0.5 + 短さ bonus (n/h ratio) + bonus
	const lengthRatio = n.length / h.length;
	const score = 0.5 + 0.3 * lengthRatio + Math.min(0.2, bonusSum);
	return Math.min(0.84, score); // includes より上にならないよう上限 0.84
}

/**
 * items を query に対しスコアリングし、score > 0 のみ降順で返す。
 * query が空なら原配列をそのまま返す (sort なし、caller の sortItems と直交)。
 *
 * scoreOf: item から検索対象文字列群を取り出す (label / target / aliases 横断、L2-C C6)。
 */
export function fuzzyFilter<T>(items: T[], query: string, scoreOf: (item: T) => string[]): T[] {
	const q = query.trim();
	if (q.length === 0) return items;
	type Scored = { item: T; score: number };
	const scored: Scored[] = [];
	for (const item of items) {
		const fields = scoreOf(item);
		let max = 0;
		for (const f of fields) {
			const s = fuzzyScore(q, f);
			if (s > max) max = s;
		}
		if (max > 0) scored.push({ item, score: max });
	}
	scored.sort((a, b) => b.score - a.score);
	return scored.map((s) => s.item);
}
