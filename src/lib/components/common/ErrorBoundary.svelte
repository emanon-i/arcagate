<script lang="ts">
import type { Snippet } from 'svelte';
import ErrorState from './ErrorState.svelte';

// PH-425 / Codex Q4 推奨 #7: 横断耐障害性
// 子要素から throw される未補足エラーを catch し、ErrorState に置換 + console error 出力。
// (将来 cmd_log_frontend IPC 実装時に Rust 側へ転送追加)
//
// Svelte 5 の `<svelte:boundary>` を利用。

interface Props {
	children: Snippet;
	fallbackTitle?: string;
	fallbackDescription?: string;
}

let {
	children,
	fallbackTitle = '予期しないエラーが発生しました',
	fallbackDescription = '再読み込みすると復旧する場合があります。',
}: Props = $props();

function reportError(error: unknown) {
	console.error('[ErrorBoundary] caught', error);
}

function handleReload() {
	window.location.reload();
}
</script>

<svelte:boundary onerror={reportError}>
	{@render children()}

	{#snippet failed(error, reset)}
		<ErrorState
			title={fallbackTitle}
			description={`${fallbackDescription}\n${error instanceof Error ? error.message : String(error)}`}
			retry={{ label: '再読み込み', onClick: handleReload }}
			testId="error-boundary-fallback"
		/>
		<button
			type="button"
			class="mx-auto mt-2 block text-xs text-[var(--ag-text-muted)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:text-[var(--ag-text-primary)]"
			onclick={reset}
			data-testid="error-boundary-reset"
		>
			この画面で再試行
		</button>
	{/snippet}
</svelte:boundary>
