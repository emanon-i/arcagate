/**
 * audit F15 (2026-05-18): Command / Script アイテムの初回起動確認 store。
 *
 * backend (launch_service) は未確認の Command / Script 起動に対し AppError code
 * `launch.confirmation_required` を返す。 `$lib/ipc/launch` の `launchItem` がこれを
 * 捕捉し、 本 store 経由で確認ダイアログを表示する。 ユーザー承認後に backend へ
 * confirm を記録して再起動する。 cancel 時は何もしない。
 *
 * 全 launch 経路 (palette / Library / widget / cascade) は `launchItem` を共通経路と
 * するため、 確認 gate はこの 1 箇所で機能する。
 */
class ScriptConfirmStore {
	/** 表示中の確認要求。null = ダイアログ非表示。 */
	pending = $state<{ target: string } | null>(null);

	#resolve: ((confirmed: boolean) => void) | null = null;

	/**
	 * 確認ダイアログを表示し、 ユーザーの応答 (true=実行 / false=キャンセル) を待つ。
	 * 既に別の要求が表示中なら、 前の要求は cancel 扱いで解決する。
	 */
	request(target: string): Promise<boolean> {
		this.#resolve?.(false);
		this.pending = { target };
		return new Promise<boolean>((resolve) => {
			this.#resolve = resolve;
		});
	}

	/** ダイアログのボタン操作から呼ぶ。 待機中の Promise を解決しダイアログを閉じる。 */
	respond(confirmed: boolean): void {
		this.#resolve?.(confirmed);
		this.#resolve = null;
		this.pending = null;
	}
}

export const scriptConfirm = new ScriptConfirmStore();
