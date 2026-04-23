<script lang="ts">
import { cubicOut } from 'svelte/easing';
import { fade, fly } from 'svelte/transition';

interface Props {
	editMode: boolean;
	selectedWidgetId: string | null;
}

let { editMode, selectedWidgetId }: Props = $props();

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
</script>

{#if editMode}
	<div
		class="pointer-events-none absolute bottom-0 left-0 right-0 z-20"
		in:fly={{ y: 12, duration: dNormal, easing: cubicOut }}
		out:fade={{ duration: dFast }}
	>
		<div
			class="flex items-center justify-center gap-5 border-t border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] px-6 py-2.5 text-sm text-[var(--ag-text-secondary)] shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
			class:border-l-2={selectedWidgetId}
			class:border-l-[var(--ag-accent)]={selectedWidgetId}
		>
			<span>
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono text-xs">Esc</kbd>
				<span class="ml-1">キャンセル</span>
			</span>
			<span class="text-[var(--ag-text-faint)]">·</span>
			<span>
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono text-xs">Enter</kbd>
				<span class="ml-1">確定</span>
			</span>
			<span class="text-[var(--ag-text-faint)]">·</span>
			<span>
				<kbd class="rounded bg-[var(--ag-surface-4)] px-1.5 py-0.5 font-mono text-xs">Del</kbd>
				<span class="ml-1">削除</span>
			</span>
			{#if selectedWidgetId}
				<span class="text-[var(--ag-text-faint)]">·</span>
				<span class="font-medium text-[var(--ag-accent)]">1件選択中</span>
			{/if}
		</div>
	</div>
{/if}
