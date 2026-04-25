---
id: PH-20260425-289
status: todo
batch: 66
type: 整理
---

# PH-289: localStorage helper 抽出 + 既存 persist 統合

## 参照した規約

- `arcagate-engineering-principles.md` §7 リファクタ発動条件: Duplicate code
- batch-65 simplify レビューの MEDIUM Code Reuse-1 指摘

## 背景・目的

同一の try/catch + JSON.parse / setItem パターンが 4 箇所以上に重複:

- `src/lib/state/config.svelte.ts`: widget-zoom (loadZoomFromStorage / setWidgetZoom 内 try)
- `src/lib/state/config.svelte.ts`: arcagate-library-card (loadLibraryCardFromStorage / persistLibraryCard)
- `src/lib/state/sound.svelte.ts`: ?
- `src/lib/components/Tip.svelte`: ?

## 仕様

### 新規 utility

`src/lib/utils/local-storage.ts`:

```typescript
export function loadJSON<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<T>;
		// shallow merge with fallback (top-level only)
		return { ...fallback, ...parsed } as T;
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
		if (Number.isNaN(n)) return fallback;
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
```

### 置換対象

- `loadZoomFromStorage` → `loadNumber('widget-zoom', 100, 50, 200)`
- `loadLibraryCardFromStorage` → `loadJSON('arcagate-library-card', DEFAULT_LIBRARY_CARD)`
- `persistLibraryCard` → `saveJSON('arcagate-library-card', libraryCard)`
- 他 `sound.svelte.ts` 等で同パターンあれば一括置換

### libraryCard の deep merge 注意

`loadJSON` の shallow merge では `libraryCard.background` が undefined だと spread で上書きされ default が消える。`libraryCard` のような nested 構造には専用 loader を残す or `loadJSON` を deep merge 拡張。

→ 本 Plan では shallow merge ベースとし、libraryCard 用に inline で nested merge を継続（loadJSON は flat 用途）。

## 受け入れ条件

- [ ] `src/lib/utils/local-storage.ts` が新規追加
- [ ] widget-zoom / 他フラット persist が `loadNumber` / `saveNumber` 経由
- [ ] vitest で utility の 4 関数を unit test（fallback / 範囲外 / SSR / quota）
- [ ] 置換後に既存 E2E が緑
- [ ] `pnpm verify` 全通過

## 自己検証

- localStorage を delete + reload で fallback が効く
- 範囲外 / 不正 JSON で fallback に落ちる
- 既存 widget-zoom / library-card が正常動作
