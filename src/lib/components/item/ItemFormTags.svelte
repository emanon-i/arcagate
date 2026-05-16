<script lang="ts">
import { t } from '$lib/i18n.svelte';
import type { Tag } from '$lib/types/tag';

/**
 * ItemForm の tag 選択フィールド。
 *
 * D-11 #11 / D-14 #14: ファイル追跡 checkbox は完全撤去。URL は filesystem watcher 対象外、
 * URL 以外は default 追跡 ON で固定 (ItemForm 側で is_tracked を type 別に決定)。
 */
interface Props {
	userTags: Tag[];
	selectedTagIds: Set<string>;
	onToggleTag: (id: string) => void;
}

let { userTags, selectedTagIds, onToggleTag }: Props = $props();
</script>

{#if userTags.length > 0}
	<div class="space-y-2">
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('item.form.tags_label')}</p>
		<div class="flex flex-wrap gap-2">
			{#each userTags as tag (tag.id)}
				<label
					class="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--ag-text-secondary)]"
				>
					<input
						type="checkbox"
						checked={selectedTagIds.has(tag.id)}
						onchange={() => onToggleTag(tag.id)}
					/>
					{tag.name}
				</label>
			{/each}
		</div>
	</div>
{/if}
