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
		class="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
		in:fly={{ y: 8, duration: dNormal, easing: cubicOut }}
		out:fade={{ duration: dFast }}
	>
		<div
			class="flex items-center gap-3 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)]/95 px-4 py-1.5 text-xs text-[var(--ag-text-muted)] shadow-[var(--ag-shadow-dialog)] backdrop-blur-sm"
		>
			<span><kbd class="font-mono">Esc</kbd> 終了</span>
			<span class="opacity-30">|</span>
			<span><kbd class="font-mono">Enter</kbd> 確定</span>
			<span class="opacity-30">|</span>
			<span><kbd class="font-mono">Del</kbd> 削除</span>
			{#if selectedWidgetId}
				<span class="opacity-30">|</span>
				<span class="text-[var(--ag-accent)]">1件選択中</span>
			{/if}
		</div>
	</div>
{/if}
