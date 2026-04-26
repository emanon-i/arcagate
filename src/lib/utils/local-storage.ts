/**
 * localStorage の薄い helper。SSR / quota 例外を握り潰し、不正値で fallback に落とす。
 *
 * - loadJSON / saveJSON: object シリアライズ用（top-level merge）
 * - loadNumber / saveNumber: 数値 + 範囲チェック
 * - loadString / saveString: 単純文字列
 * - removeKey: cleanup 用
 */

/**
 * shape validator: parsed 値が有効か検証する optional コールバック。
 * false を返したら fallback に落とす。
 */
export type ShapeValidator<T> = (parsed: unknown) => parsed is Partial<T>;

export function loadJSON<T extends object>(
	key: string,
	fallback: T,
	validate?: ShapeValidator<T>,
): T {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as unknown;
		// 最低限: plain object であること
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return fallback;
		}
		// 任意の shape validator
		if (validate && !validate(parsed)) {
			return fallback;
		}
		return { ...fallback, ...(parsed as Partial<T>) } as T;
	} catch {
		return fallback;
	}
}

export function saveJSON<T>(key: string, value: T): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// SSR or quota exceeded
	}
}

export function loadNumber(key: string, fallback: number, min?: number, max?: number): number {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		const n = Number(raw);
		if (!Number.isFinite(n)) return fallback;
		if (min !== undefined && n < min) return fallback;
		if (max !== undefined && n > max) return fallback;
		return n;
	} catch {
		return fallback;
	}
}

export function saveNumber(key: string, value: number): void {
	try {
		localStorage.setItem(key, String(value));
	} catch {
		// ignore
	}
}

export function loadString(key: string, fallback: string): string {
	try {
		return localStorage.getItem(key) ?? fallback;
	} catch {
		return fallback;
	}
}

export function saveString(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// ignore
	}
}

export function loadBool(key: string, fallback: boolean): boolean {
	try {
		const raw = localStorage.getItem(key);
		if (raw === 'true') return true;
		if (raw === 'false') return false;
		return fallback;
	} catch {
		return fallback;
	}
}

export function saveBool(key: string, value: boolean): void {
	try {
		localStorage.setItem(key, String(value));
	} catch {
		// ignore
	}
}

export function removeKey(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		// ignore
	}
}
