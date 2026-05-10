<script lang="ts">
import { X as XIcon } from '@lucide/svelte';
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import ItemFormCardOverride from '$lib/components/item/ItemFormCardOverride.svelte';
import type { Item } from '$lib/types/item';

/**
 * F-5 (2026-05-08 user 検収): カード個別設定 modal。
 *
 * 内部で `ItemFormCardOverride` を render、card_override 編集 UI 全部を modal 内に集約。
 * BaseDialog rewrite (Dialog wrapper unify Phase 2)。
 *
 * 開閉:
 * - LibraryDetailPanel から `<CardOverrideDialog open={...} item={...} onClose={...} />` で配置
 * - Escape / 背景クリック / × button で close
 *
 * scrollable: ItemFormCardOverride の中身が long なため `max-h-[85vh] overflow-y-auto` を付与
 * (boxClass 経由、anti-pattern §5 回避: BaseDialog に scrollable flag 追加せず 1 prop で吸収)。
 */
interface Props {
	open: boolean;
	item: Item;
	onClose: () => void;
}

let { open, item, onClose }: Props = $props();
</script>

<BaseDialog
	{open}
	{onClose}
	ariaLabelledby="card-override-dialog-title"
	size="lg"
	boxClass="max-h-[85vh] overflow-y-auto"
>
	<div class="mb-4 flex items-center justify-between gap-2">
		<h2
			id="card-override-dialog-title"
			class="text-lg font-semibold text-[var(--ag-text-primary)]"
		>
			カード個別設定
		</h2>
		<button
			type="button"
			class="rounded-lg p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
			aria-label="閉じる"
			onclick={onClose}
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>

	<ItemFormCardOverride {item} />
</BaseDialog>
