// Web Audio API を使ったインライン SE（外部ファイル不要）
// クリック音: sine wave 800Hz→400Hz (20ms sweep) + decay 60ms, total ~80ms

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
	if (!ctx) {
		ctx = new AudioContext();
	}
	// suspended 状態（オートプレイポリシー）の場合は resume する
	if (ctx.state === 'suspended') {
		void ctx.resume();
	}
	return ctx;
}

export function playClick(volume: number): void {
	if (volume <= 0) return;

	try {
		const ac = getContext();
		const now = ac.currentTime;

		const osc = ac.createOscillator();
		const gain = ac.createGain();

		osc.connect(gain);
		gain.connect(ac.destination);

		osc.type = 'sine';
		osc.frequency.setValueAtTime(800, now);
		osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

		gain.gain.setValueAtTime(volume * 0.3, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

		osc.start(now);
		osc.stop(now + 0.08);
	} catch {
		// AudioContext が利用できない環境（テスト・SSR）では無視
	}
}
