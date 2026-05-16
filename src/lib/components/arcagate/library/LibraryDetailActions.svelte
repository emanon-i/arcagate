<script lang="ts">
import { FolderOpen, Play, Settings2, Star, Trash2 } from '@lucide/svelte';
import ActionButton from '$lib/components/arcagate/common/ActionButton.svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import { t } from '$lib/i18n.svelte';
import type { Item } from '$lib/types/item';

/**
 * Library detail panel アクションエリア (起動 / 編集 / お気に入り / 削除 + default app picker)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、actions 抽出)
 *
 * - default app picker は folder type のみ表示
 * - all action は親 facade で IPC を呼ぶ (state mutation を facade に集約)
 */
interface Props {
	item: Item;
	isStarred: boolean;
	onLaunch: () => void;
	onEdit: () => void;
	onToggleStar: () => void;
	onDelete: () => void;
	onPickDefaultApp: () => void;
}

let { item, isStarred, onLaunch, onEdit, onToggleStar, onDelete, onPickDefaultApp }: Props =
	$props();
</script>

<!-- Default app for folders (S-3-7) -->
{#if item.item_type === 'folder'}
	<div class="mt-4 space-y-2 text-sm">
		<DetailRow
			label={t('library.detail.default_app')}
			value={item.default_app || t('library.detail.default_app_fallback')}
		/>
		<button
			type="button"
			class="flex items-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
			onclick={() => onPickDefaultApp()}
		>
			<FolderOpen class="h-3.5 w-3.5" />
			{t('library.detail.pick_exe')}
		</button>
	</div>
{/if}

<!-- Action buttons (E-6 fix 2026-05-08: 4-col grid で「お気に入り」label が truncate される
     ため 2x2 layout に変更。各 button cell 幅が倍増し label 完全表示。truncate は
     safety net として残置。 -->
<div class="mt-4 grid grid-cols-2 gap-2">
	<ActionButton icon={Play} label={t('library.detail.launch')} onclick={onLaunch} />
	<ActionButton icon={Settings2} label={t('common.edit')} onclick={onEdit} />
	<button
		type="button"
		aria-label={isStarred ? t('library.detail.star_remove') : t('library.detail.star_add')}
		data-testid="favorite-button"
		class="flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97]
			{isStarred
			? 'border-[var(--ag-accent)]/60 bg-[var(--ag-accent)]/15 text-[var(--ag-accent)] hover:bg-[var(--ag-accent)]/25'
			: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
		onclick={onToggleStar}
	>
		<Star class="h-4 w-4 shrink-0" fill={isStarred ? 'currentColor' : 'none'} />
		<span class="truncate whitespace-nowrap">{t('common.favorites')}</span>
	</button>
	<button
		type="button"
		class="flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-3 py-3 text-sm text-destructive transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] hover:bg-destructive/20"
		onclick={onDelete}
		data-testid="delete-item-button"
	>
		<Trash2 class="h-4 w-4 shrink-0" />
		<span class="truncate whitespace-nowrap">{t('common.delete')}</span>
	</button>
</div>
