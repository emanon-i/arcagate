<script lang="ts">
import { X as XIcon } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import { typeLabel } from '$lib/constants/item-type';
import type { Item } from '$lib/types/item';

/**
 * Library detail panel ヘッダー (title + type badge + more menu + close button)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、header 抽出)
 */
interface Props {
	item: Item;
	moreMenuItems: { label: string; onclick: () => void }[];
	onClose?: () => void;
}

let { item, moreMenuItems, onClose }: Props = $props();
</script>

<div class="mb-4 flex items-center justify-between gap-2">
	<div class="min-w-0 flex-1">
		<div
			class="truncate text-lg font-semibold text-[var(--ag-text-primary)]"
			title={item.label}
		>
			{item.label}
		</div>
	</div>
	<div class="flex shrink-0 items-center gap-2">
		<!-- refactor (Chip 既存活用): type badge を Chip.svelte (accent tone) で render。 -->
		<Chip tone="accent">{typeLabel[item.item_type]}</Chip>
		<MoreMenu items={moreMenuItems} ariaLabel="アイテム操作メニュー" />
		<button
			type="button"
			class="rounded-lg p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
			aria-label="パネルを閉じる"
			onclick={() => onClose?.()}
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>
</div>
