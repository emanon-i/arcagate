import type { Theme } from '$lib/types/theme';
import type { Aesthetic } from './color';

/**
 * Theme から random pair 生成用 aesthetic を推定する。
 *
 * 動機 (DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27 §3 ⑫(b)): 旧 `ThemeEditor.randomize()` は
 * `randomSeedPair('glass', ...)` で aesthetic をハードコードしていたため、 brutalist /
 * neumorph base の theme で random しても glass レンジ (chroma 0.16–0.22 / l 0.58–0.7) の
 * 中庸色しか出ず、 aesthetic ごとの個性が消えていた。 本 helper は theme の id か css_vars
 * signature から aesthetic を推定し、 各 aesthetic 固有のレンジで random pair を生成させる。
 *
 * ## 判定ロジック
 *
 * 1. builtin id の prefix 一致: `brutalist*` / `neumorph*` で直接マップ。 `dark` / `light` は glass。
 * 2. custom theme (UUID id): `--ag-radius-lg` / `--surface-blur` の signature で推定。
 *    - radius=0px + blur=none → brutalist (rounded corners なし、 blur なし、 鮮烈)
 *    - radius>=20px + blur=none → neumorph (大角丸、 blur なし、 muted)
 *    - 上記以外 → glass (default、 ガラス調 / blur あり)
 *
 * css_vars が parse 不能 / signature 一致しない場合は glass で fallback (= 既存挙動の踏襲)。
 */
export function detectAesthetic(theme: Theme): Aesthetic {
	// 1. builtin id の prefix 一致 (theme.is_builtin に依存しないので custom が builtin id を
	//    名乗っても拾える、 安全側設計)。
	if (theme.id.startsWith('brutalist')) return 'brutalist';
	if (theme.id.startsWith('neumorph')) return 'neumorph';
	if (theme.id === 'dark' || theme.id === 'light') return 'glass';

	// 2. custom theme: css_vars signature 推定。
	try {
		const vars = JSON.parse(theme.css_vars) as Record<string, string>;
		const radius = vars['--ag-radius-lg']?.trim() ?? '';
		const blur = vars['--surface-blur']?.trim() ?? '';
		if (blur === 'none') {
			const radiusPx = Number.parseInt(radius, 10);
			if (radius === '0px') return 'brutalist';
			if (Number.isFinite(radiusPx) && radiusPx >= 20) return 'neumorph';
		}
	} catch {
		// invalid JSON は glass fallback
	}
	return 'glass';
}
