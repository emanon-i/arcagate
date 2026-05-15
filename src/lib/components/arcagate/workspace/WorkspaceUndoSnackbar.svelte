<script lang="ts">
/**
 * R8-3: WorkspaceUndoSnackbar — widget delete 直後に「元に戻す」 button + 残り秒数を出す snackbar。
 *
 * LibraryUndoSnackbar と同型 UX (ux_standards.md §13 一貫性)。
 * workspaceHistory.pendingUndo が立っているときに fixed bottom-center で表示。
 *
 * - 「元に戻す」 click で workspaceStore.undo() (= popUndo + IPC 再 add)。
 * - 「閉じる」 で dismiss (history は維持、Ctrl+Z で取り戻し可能)。
 * - 5 秒後 (workspaceHistory 内 timer) 自動消失。
 *
 * Library との違い:
 * - Library: snackbar が唯一の undo 経路 → undo 失敗時 toast で報告
 * - Workspace: Ctrl+Z でも undo 可能、snackbar は補助 UI → 失敗時の toast は workspaceStore 側 error で処理
 */
import { Undo2, X } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

let secondsLeft = $state(0);
let intervalId: ReturnType<typeof setInterval> | null = null;

$effect(() => {
	const entry = workspaceHistory.pendingUndo;
	if (!entry) {
		secondsLeft = 0;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		return;
	}
	const update = () => {
		const ms = entry.expiresAt - Date.now();
		secondsLeft = Math.max(0, Math.ceil(ms / 1000));
	};
	update();
	intervalId = setInterval(update, 200);
	return () => {
		if (intervalId) clearInterval(intervalId);
		intervalId = null;
	};
});

async function handleUndo() {
	await workspaceStore.undo();
	// workspaceStore.undo() 内で dismiss 済 (失敗時も pending は cleared、ユーザは Ctrl+Z で再試行可能)
}
</script>

{#if workspaceHistory.pendingUndo}
	<div
		class="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
		role="status"
		aria-live="polite"
		in:fly={{ y: 16, duration: dNormal }}
		out:fade={{ duration: dFast }}
	>
		<div
			class="pointer-events-auto flex items-center gap-3 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] px-4 py-2.5 text-sm text-[var(--ag-text-primary)] shadow-[var(--ag-shadow-md)]"
			data-testid="workspace-undo-snackbar"
		>
			<span class="font-medium"
				>{t('workspace.undo_snackbar.deleted', {
					label: workspaceHistory.pendingUndo.widgetLabel,
				})}</span
			>
			<span class="text-xs text-[var(--ag-text-muted)]"
				>{t('workspace.undo_snackbar.seconds_remaining', { n: secondsLeft })}</span
			>
			<Button
				type="button"
				variant="outline"
				size="sm"
				data-testid="workspace-undo-button"
				aria-label={t('workspace.undo_snackbar.undo_button_label')}
				onclick={() => void handleUndo()}
			>
				<Undo2 class="h-3.5 w-3.5" />
				{t('workspace.tooltip.undo')}
			</Button>
			<button
				type="button"
				class="rounded-full p-0.5 text-[var(--ag-text-muted)] transition-opacity duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:text-[var(--ag-text-primary)]"
				aria-label={t('workspace.undo_snackbar.close')}
				onclick={() => workspaceHistory.dismiss()}
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>
{/if}
