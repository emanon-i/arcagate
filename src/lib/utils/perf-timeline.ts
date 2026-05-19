/**
 * Library 遷移パイプライン observability。
 *
 * 「Library 画面を開いたとき何が・いつ・どれだけ起きているか」を step 単位の
 * 絶対 timestamp で記録する軽量 collector。perf.ts (DEV-gate された累積統計) とは
 * 別に、1 回の遷移を時系列で並べて「どの step に時間がかかったか」を見る用途。
 *
 * DEV 限定ではなく release でも常時 ON (`tl()` は配列 push 1 回のみ、上限あり)。
 * release で freeze を実機再現したとき DevTools console から拾えるようにするため。
 *
 * `window.__agTimeline__` から取得する:
 *   - `events`  : 記録済 step 配列 (step, t=performance.now(), thread, note)
 *   - `tl(step)`: step を push する (計測スクリプト等の外部からも呼べる)
 *   - `clear()` : 遷移計測の前に呼んで baseline をリセット
 *
 * 使い方 (実機 freeze 調査):
 *   1. DevTools console で `__agTimeline__.clear()`
 *   2. Library タブをクリック
 *   3. `console.table(__agTimeline__.events)` で step 別 timestamp を確認
 */

export interface TimelineEvent {
	step: string;
	t: number;
	thread: 'main' | 'bg';
	note?: string;
}

// 長時間 session でも leak しないよう上限を設ける (超過時は最古を破棄)。
// 1 回の遷移計測は十数 step なので実用上は十分。
const MAX_EVENTS = 2000;
const events: TimelineEvent[] = [];

/** timeline に step を 1 件記録する。 */
export function tl(step: string, opts?: { thread?: 'main' | 'bg'; note?: string }): void {
	if (typeof performance === 'undefined') return;
	if (events.length >= MAX_EVENTS) events.shift();
	events.push({
		step,
		t: performance.now(),
		thread: opts?.thread ?? 'main',
		note: opts?.note,
	});
}

if (typeof window !== 'undefined') {
	(window as unknown as { __agTimeline__: unknown }).__agTimeline__ = {
		events,
		tl,
		clear: () => {
			events.length = 0;
		},
	};
}
