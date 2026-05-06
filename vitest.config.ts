import { defineConfig } from 'vitest/config';

/**
 * vitest config for T4 unit test phase (utility / state).
 *
 * 引用元 guideline: docs/l1_requirements/test-rebuild/index.md (T4 phase)
 *
 * - frontend pure utility (T4-1) は node 環境で十分
 * - state store (T4-2) は jsdom 環境を後で追加検討 (svelte rune 含む test 時)
 * - svelte component test は T1-T3 phase の playwright に任せる方針 (vitest では行わない)
 */
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		// pure function は node 環境で十分。jsdom は将来 state test 追加時に再評価。
		environment: 'node',
		// 並列実行 (default で OK、明示なし)
	},
});
