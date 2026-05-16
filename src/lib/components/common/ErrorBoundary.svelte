<script lang="ts">
import type { Snippet } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
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

let { children, fallbackTitle, fallbackDescription }: Props = $props();

let resolvedTitle = $derived(fallbackTitle ?? t('common.error_boundary_title'));
let resolvedDescription = $derived(fallbackDescription ?? t('common.error_boundary_description'));

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
			title={resolvedTitle}
			description={`${resolvedDescription}\n${error instanceof Error ? error.message : String(error)}`}
			retry={{ label: t('common.reload'), onClick: handleReload }}
			testId="error-boundary-fallback"
		/>
		<Button
			type="button"
			variant="link"
			size="sm"
			class="mx-auto mt-2 block"
			onclick={reset}
			data-testid="error-boundary-reset"
		>
			{t('common.retry_screen')}
		</Button>
	{/snippet}
</svelte:boundary>
