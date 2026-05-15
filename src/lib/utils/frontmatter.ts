/**
 * K-9 (2026-05-16): YAML frontmatter を「Obsidian Properties 風 key-value display」 に
 * 変換する軽量 parser。
 *
 * Obsidian の Properties UI は frontmatter の key-value を 1 行ずつ (key: value) で
 * 表示し、 multi-line value / nested object 等は無視 or 別表示 にする。 本 parser も
 * 同方針で「単純な scalar value のみ key-value で返す、 非対応行は無視」。
 *
 * 対応:
 *   - `key: value` → { key, value }
 *   - `key:` (empty value) → { key, value: '' }
 *   - 行頭 `#` (コメント) → skip
 *   - 空行 → skip
 *
 * 非対応 (= 空配列を返して呼出側で raw YAML fallback):
 *   - `key:\n  - item` 等の YAML array / nested object
 *   - `key: |` multi-line literal
 *   - 行内 quote ("foo" or 'foo') は **value からは strip しない** (Obsidian も
 *     quote を残して表示)
 *
 * 完全な YAML parser は scope 外 (yaml lib を入れるコストの方が大きい)、 user に
 * 見える 90% case を best-effort カバー、 残 10% は raw fallback で 不可視にしない。
 */

export interface FrontmatterPair {
	key: string;
	value: string;
}

const SIMPLE_KEY_VALUE_RE = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/;

export function parseFrontmatterPairs(raw: string): FrontmatterPair[] {
	if (!raw.trim()) return [];
	const lines = raw.split(/\r?\n/);
	const pairs: FrontmatterPair[] = [];
	let bailout = false;

	for (const lineRaw of lines) {
		const line = lineRaw.trim();
		if (!line || line.startsWith('#')) continue;
		const m = SIMPLE_KEY_VALUE_RE.exec(line);
		if (!m) {
			// 非対応行 (indent / array / nested 等) を見つけたら bail out 扱い、
			// 呼出側で raw YAML を fallback 表示させる。
			bailout = true;
			break;
		}
		const [, key, value] = m;
		if (!key) continue;
		pairs.push({ key, value: value.trim() });
	}
	return bailout ? [] : pairs;
}
