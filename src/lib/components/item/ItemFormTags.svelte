<script lang="ts">
import type { Tag } from '$lib/types/tag';

/**
 * ItemForm のメタデータフィールド (is_tracked + tags)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、tags 抽出)
 */
interface Props {
	userTags: Tag[];
	isTracked: boolean;
	selectedTagIds: Set<string>;
	onToggleTag: (id: string) => void;
}

let { userTags, isTracked = $bindable(true), selectedTagIds, onToggleTag }: Props = $props();
</script>

<!-- J-5: ファイル追跡チェックボックス -->
<div class="flex items-center gap-2">
	<input
		id="item-tracked"
		type="checkbox"
		class="h-4 w-4 rounded border-[var(--ag-border)]"
		bind:checked={isTracked}
	/>
	<label class="text-sm text-[var(--ag-text-secondary)]" for="item-tracked">
		ファイル変更を追跡する
	</label>
</div>

{#if userTags.length > 0}
	<div class="space-y-2">
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">タグ</p>
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
