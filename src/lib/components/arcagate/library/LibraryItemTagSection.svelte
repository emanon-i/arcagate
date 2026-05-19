<script lang="ts">
import { Plus, Search, X as XIcon } from '@lucide/svelte';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { t } from '$lib/i18n.svelte';
import type { Tag, TagWithCount } from '$lib/types/tag';
import { filterTagSuggestions, isExistingTag } from '$lib/utils/tag-suggest';

interface Props {
	itemTags: Tag[];
	availableTags: TagWithCount[];
	onAddTag: (tagId: string) => void;
	onRemoveTag: (tagId: string) => void;
	onCreateTag?: (name: string) => void;
	onEscapeWhenClosed?: () => void;
}

let { itemTags, availableTags, onAddTag, onRemoveTag, onCreateTag, onEscapeWhenClosed }: Props =
	$props();

let showTagSelect = $state(false);
let tagDropdownEl = $state<HTMLElement | null>(null);
let tagTriggerEl = $state<HTMLButtonElement | null>(null);
let focusedTagIndex = $state(-1);
let tagQuery = $state('');

// PH-355: 検索クエリでフィルタした候補リスト（純粋関数で suggest）
let filteredTags = $derived(
	filterTagSuggestions(
		availableTags.map((t) => ({ id: t.id, name: t.name })),
		tagQuery,
		new Set(itemTags.map((t) => t.id)),
		20,
	),
);

// F-9 (2026-05-08 user 検収): 新規 tag 作成 candidate を出す条件。
// query 非空 + 既存 (availableTags + itemTags) に完全一致名が無い + onCreateTag 提供あり。
let canCreateNew = $derived.by(() => {
	if (!onCreateTag) return false;
	const q = tagQuery.trim();
	if (!q) return false;
	const all = [
		...availableTags.map((t) => ({ id: t.id, name: t.name })),
		...itemTags.map((t) => ({ id: t.id, name: t.name })),
	];
	return !isExistingTag(all, q);
});

function closeTagDropdown() {
	showTagSelect = false;
	tagQuery = '';
	tagTriggerEl?.focus();
}

function handleCreateNew() {
	const q = tagQuery.trim();
	if (!q || !onCreateTag) return;
	onCreateTag(q);
	closeTagDropdown();
}

$effect(() => {
	if (showTagSelect) {
		focusedTagIndex = 0;
	} else {
		focusedTagIndex = -1;
	}
});

$effect(() => {
	if (showTagSelect && focusedTagIndex >= 0 && tagDropdownEl) {
		const buttons = tagDropdownEl.querySelectorAll<HTMLButtonElement>('button');
		buttons[focusedTagIndex]?.focus();
	}
});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			if (showTagSelect) {
				closeTagDropdown();
			} else {
				onEscapeWhenClosed?.();
			}
		}
	}}
	onpointerdown={(e) => {
		if (!showTagSelect) return;
		const target = e.target as Node;
		// trigger 上でのクリックは「閉じる→再オープン」の race を防ぐため除外
		if (tagDropdownEl?.contains(target) || tagTriggerEl?.contains(target)) return;
		closeTagDropdown();
	}}
/>

<div class="mt-4 space-y-2">
	<div class="text-xs font-medium text-[var(--ag-text-muted)]">{t('library.tags.heading')}</div>
	<div class="flex flex-wrap gap-1.5">
		{#each itemTags.filter((t) => !t.is_system) as tag (tag.id)}
			<!-- refactor (Chip 既存活用): tag chip を Chip.svelte (default tone) で render。
			     X icon button は children snippet 内 inline で描画。 -->
			<Chip tone="default">
				<span class="inline-flex items-center gap-1">
					{tag.name}
					<button
						type="button"
						class="ml-0.5 rounded-full p-0.5 text-[var(--ag-text-muted)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
						aria-label={t('library.tags.remove_aria', { name: tag.name })}
						onclick={() => onRemoveTag(tag.id)}
					>
						<XIcon class="h-3 w-3" />
					</button>
				</span>
			</Chip>
		{/each}
		{#if itemTags.filter((t) => !t.is_system).length === 0}
			<span class="text-xs text-[var(--ag-text-muted)]">{t('library.tags.empty')}</span>
		{/if}
	</div>
	<!-- F-9 (2026-05-08 user 検収): availableTags.length > 0 gating を撤去。
	     0 件の状態でも「+ タグを追加」 button を表示、入力 + Enter で初回 tag 作成可能。
	     onCreateTag prop 提供時のみ inline 新規作成を有効化。 -->
	<div class="relative">
		<button
			bind:this={tagTriggerEl}
			type="button"
			class="rounded-full border border-dashed border-[var(--ag-border)] px-2.5 py-1 text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
			onclick={() => (showTagSelect = !showTagSelect)}
		>
			{t('library.tags.add_button')}
		</button>
		{#if showTagSelect}
			<div bind:this={tagDropdownEl} class="ag-glass absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-[var(--ag-border)] p-1 shadow-[var(--ag-shadow-lg)]">
				<!-- PH-355: 検索 input。F-9: Enter で onCreateTag (新規作成 + 即 attach)。 -->
				<div class="mb-1 flex items-center gap-1 border-b border-[var(--ag-border)] px-2 py-1">
					<Search class="h-3 w-3 text-[var(--ag-text-muted)]" />
					<input
						type="text"
						class="min-w-0 flex-1 bg-transparent text-xs text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)] focus-visible:outline-none"
						placeholder={onCreateTag ? t('library.tags.search_create_placeholder') : t('library.tags.search_placeholder')}
						autocomplete="off"
						aria-label={onCreateTag ? t('library.tags.search_create_aria') : t('library.tags.search_aria')}
						bind:value={tagQuery}
						onkeydown={(e) => {
							if (e.key === 'ArrowDown') {
								e.preventDefault();
								focusedTagIndex = 0;
							} else if (e.key === 'Enter' && canCreateNew) {
								e.preventDefault();
								handleCreateNew();
							}
						}}
					/>
				</div>
				<div class="max-h-32 overflow-y-auto">
					{#if canCreateNew}
						<button
							type="button"
							class="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-xs text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]"
							aria-label={t('library.tags.create_aria', { name: tagQuery.trim() })}
							onclick={handleCreateNew}
						>
							<Plus class="h-3 w-3" />
							<span>{t('library.tags.create_label', { name: tagQuery.trim() })}</span>
						</button>
					{/if}
					{#if filteredTags.length === 0 && !canCreateNew}
						<div class="px-3 py-2 text-xs text-[var(--ag-text-muted)]">
							{tagQuery
								? t('library.tags.no_match')
								: onCreateTag
									? t('library.tags.create_hint')
									: t('library.tags.empty')}
						</div>
					{:else}
						{#each filteredTags as tag, i (tag.id)}
							<button
								type="button"
								class="block w-full rounded-md px-3 py-1.5 text-left text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]"
								tabindex={focusedTagIndex === i ? 0 : -1}
								aria-label={t('library.tags.add_aria', { name: tag.name })}
								onclick={() => { onAddTag(tag.id); closeTagDropdown(); }}
								onkeydown={(e) => {
									if (e.key === 'ArrowDown') {
										e.preventDefault();
										focusedTagIndex = Math.min(i + 1, filteredTags.length - 1);
									} else if (e.key === 'ArrowUp') {
										e.preventDefault();
										focusedTagIndex = Math.max(i - 1, 0);
									}
								}}
							>
								{tag.name}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
