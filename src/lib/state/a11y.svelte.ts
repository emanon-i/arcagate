/**
 * Accessibility トグル state (design tokens v2 §E)。
 *
 * 3 つの a11y 設定を <html> の data-* 属性として反映する。
 * arcagate-theme.css の `:root[data-reduce-transparency]` 等が aesthetic token を
 * 上書きする。 PC ローカルの a11y 設定のため localStorage に永続化する
 * (theme mode cache と同様、 DB / IPC を介さず即時同期反映)。
 */

const STORAGE_KEY = 'arcagate.a11y';

export type A11yFlag = 'reduceTransparency' | 'increaseContrast' | 'reduceMotion';

const ATTR: Record<A11yFlag, string> = {
	reduceTransparency: 'data-reduce-transparency',
	increaseContrast: 'data-increase-contrast',
	reduceMotion: 'data-reduce-motion',
};

function readStored(): Record<A11yFlag, boolean> {
	const fallback = { reduceTransparency: false, increaseContrast: false, reduceMotion: false };
	if (typeof window === 'undefined') return fallback;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<Record<A11yFlag, boolean>>;
		return {
			reduceTransparency: parsed.reduceTransparency === true,
			increaseContrast: parsed.increaseContrast === true,
			reduceMotion: parsed.reduceMotion === true,
		};
	} catch {
		return fallback;
	}
}

let flags = $state<Record<A11yFlag, boolean>>(readStored());

function apply(): void {
	if (typeof document === 'undefined') return;
	const el = document.documentElement;
	for (const flag of Object.keys(ATTR) as A11yFlag[]) {
		if (flags[flag]) {
			el.setAttribute(ATTR[flag], '');
		} else {
			el.removeAttribute(ATTR[flag]);
		}
	}
}

function persist(): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
	} catch {
		// quota / SecurityError は黙殺
	}
}

function setFlag(flag: A11yFlag, value: boolean): void {
	flags = { ...flags, [flag]: value };
	apply();
	persist();
}

// module load 時に保存済 a11y 設定を即時適用 (theme と同じく初回 paint 前)。
if (typeof document !== 'undefined') {
	apply();
}

export const a11yStore = {
	get reduceTransparency() {
		return flags.reduceTransparency;
	},
	get increaseContrast() {
		return flags.increaseContrast;
	},
	get reduceMotion() {
		return flags.reduceMotion;
	},
	setFlag,
};
