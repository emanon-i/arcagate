<script lang="ts">
import { X as XIcon } from '@lucide/svelte';
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import ItemFormCardOverride from '$lib/components/item/ItemFormCardOverride.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import type { Item } from '$lib/types/item';

/**
 * カード見た目設定 modal。 内部で `ItemFormCardOverride` を render、 card_override 編集 UI を modal 内に集約。
 *
 * 開閉:
 * - LibraryDetailPanel から `<CardOverrideDialog open={...} item={...} onClose={...} />` で配置
 * - Escape / 背景クリック / × button で close
 *
 * scroll 構造 (2026-05-20 user 指摘):
 *   `!p-0 flex flex-col max-h-[85vh]` で BaseDialog の outer padding を解除し、 header を
 *   shrink-0 + content を flex-1 overflow-y-auto に分離。 scrollbar は inner content にのみ付き、
 *   header (タイトル + 閉じる) は常時 visible。 旧 boxClass `overflow-y-auto` 単独だと
 *   header 含む outer frame 全体に scrollbar が伸びていた。
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
	boxClass="!p-0 flex flex-col max-h-[85vh]"
>
	<div class="flex shrink-0 items-center justify-between gap-2 px-6 py-4">
		<h2
			id="card-override-dialog-title"
			class="text-lg font-semibold text-[var(--ag-text-primary)]"
		>
			{t('library.appearance_settings.title')}
		</h2>
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={t('common.close')}
			onclick={onClose}
		>
			<XIcon class="h-4 w-4" />
		</Button>
	</div>

	<div class="flex-1 overflow-y-auto px-6 pb-6">
		<ItemFormCardOverride {item} />
	</div>
</BaseDialog>
