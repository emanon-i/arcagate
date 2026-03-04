<script lang="ts">
import { ExternalLink, Pin, Play, Settings2 } from '@lucide/svelte';
import ActionButton from '$lib/components/arcagate/common/ActionButton.svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { mockItems, selectedItemDetails } from '$lib/mock/arcagate/items';
import SensitiveControl from './SensitiveControl.svelte';

interface Props {
	selectedItemId: string | null;
}

let { selectedItemId }: Props = $props();

// TODO: アイテム取得を Service 経由で接続
let selectedItem = $derived(mockItems.find((i) => i.id === selectedItemId) ?? null);

const actions: { icon: typeof Play; label: string }[] = [
	{ icon: Play, label: '起動' },
	{ icon: Pin, label: 'Workspaceに追加' },
	{ icon: Settings2, label: '編集' },
	{ icon: ExternalLink, label: '関連URL' },
];
</script>

<aside class="border-l border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-5">
	{#if selectedItem}
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div>
				<div class="text-xs uppercase tracking-[0.18em] text-[var(--ag-text-faint)]">
					Selected item
				</div>
				<div class="mt-1 text-lg font-semibold text-[var(--ag-text-primary)]">
					{selectedItem.label}
				</div>
			</div>
			<span
				class="rounded-full border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-2.5 py-1 text-[11px] text-[var(--ag-accent-text)]"
			>
				{selectedItem.badge}
			</span>
		</div>

		<!-- Gradient preview -->
		<div class="h-40 rounded-[var(--ag-radius-widget)] bg-gradient-to-br {selectedItem.art}"></div>

		<!-- Detail rows -->
		<div class="mt-4 space-y-2 text-sm">
			{#each selectedItemDetails as [label, value]}
				<DetailRow {label} {value} />
			{/each}
		</div>

		<!-- Action buttons -->
		<div class="mt-4 grid grid-cols-2 gap-2">
			{#each actions as action}
				<ActionButton icon={action.icon} label={action.label} />
			{/each}
		</div>

		<!-- Tip -->
		<div class="mt-4">
			<Tip tipId="library-detail-workspace-tip">
				Workspace に追加しても複製は作られません。編集は Library 側で行います。
			</Tip>
		</div>

		<!-- Sensitive control -->
		<div class="mt-4">
			<SensitiveControl />
		</div>
	{:else}
		<!-- Placeholder -->
		<div class="flex h-full items-center justify-center">
			<p class="text-sm text-[var(--ag-text-muted)]">アイテムを選択してください</p>
		</div>
	{/if}
</aside>
