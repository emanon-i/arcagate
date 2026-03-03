<script lang="ts">
import { WIDGET_LABELS, type WidgetType } from '$lib/types/workspace';

interface Props {
	open: boolean;
	onAdd: (type: WidgetType) => void;
	onClose: () => void;
}

let { open, onAdd, onClose }: Props = $props();

const widgets: { type: WidgetType; description: string }[] = [
	{ type: 'favorites', description: '起動頻度の高いアイテムを表示' },
	{ type: 'recent', description: '最近起動したアイテムを表示' },
	{ type: 'projects', description: 'フォルダ型アイテムを表示' },
	{ type: 'watched_folders', description: '監視中のフォルダを表示' },
];
</script>

{#if open}
	<!-- オーバーレイ -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-96 rounded-lg border bg-card p-6 shadow-lg">
			<h3 class="mb-4 text-base font-semibold">ウィジェットを追加</h3>
			<div class="flex flex-col gap-2">
				{#each widgets as w (w.type)}
					<button
						class="flex flex-col rounded-md border p-3 text-left hover:bg-accent"
						onclick={() => {
							onAdd(w.type);
							onClose();
						}}
					>
						<span class="font-medium">{WIDGET_LABELS[w.type]}</span>
						<span class="text-sm text-muted-foreground">{w.description}</span>
					</button>
				{/each}
			</div>
			<button
				class="mt-4 w-full rounded-md border px-4 py-2 text-sm hover:bg-accent"
				onclick={onClose}
			>
				キャンセル
			</button>
		</div>
	</div>
{/if}
