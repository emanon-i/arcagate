<script lang="ts">
/**
 * LibraryUndoSnackbar — delete 直後に「元に戻す」 button + 残り秒数を出す snackbar。
 *
 * libraryHistory.pendingUndo が立っているときに fixed bottom-center で表示。
 * - 「元に戻す」 click で libraryHistory.undo() (成功で undo、失敗時 toast で報告)
 * - 「閉じる」 で dismiss
 * - 5 秒後 (libraryHistory 内 timer) 自動消失
 */
import { Undo2, X } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { libraryHistory } from '$lib/state/library-history.svelte';
import { toastStore } from '$lib/state/toast.svelte';

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

let secondsLeft = $state(0);
let intervalId: ReturnType<typeof setInterval> | null = null;

$effect(() => {
	const entry = libraryHistory.pendingUndo;
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
	const ok = await libraryHistory.undo();
	if (ok) {
		toastStore.add('削除を取り消しました', 'success');
	} else {
		toastStore.add('取り消しに失敗しました', 'error');
	}
}
</script>

{#if libraryHistory.pendingUndo}
	<div
		class="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
		role="status"
		aria-live="polite"
		in:fly={{ y: 16, duration: dNormal }}
		out:fade={{ duration: dFast }}
	>
		<div
			class="pointer-events-auto flex items-center gap-3 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] px-4 py-2.5 text-sm text-[var(--ag-text-primary)] shadow-[var(--ag-shadow-md)]"
			data-testid="library-undo-snackbar"
		>
			<span class="font-medium">「{libraryHistory.pendingUndo.itemSnapshot.label}」を削除しました</span>
			<span class="text-xs text-[var(--ag-text-muted)]">{secondsLeft}秒</span>
			<button
				type="button"
				class="flex items-center gap-1 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2.5 py-1 text-xs font-medium transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				data-testid="library-undo-button"
				aria-label="削除を取り消す"
				onclick={() => void handleUndo()}
			>
				<Undo2 class="h-3.5 w-3.5" />
				元に戻す
			</button>
			<button
				type="button"
				class="rounded-full p-0.5 text-[var(--ag-text-muted)] transition-opacity duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:text-[var(--ag-text-primary)]"
				aria-label="snackbar を閉じる"
				onclick={() => libraryHistory.dismiss()}
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>
{/if}
