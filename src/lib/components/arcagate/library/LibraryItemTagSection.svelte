<script lang="ts">
import { X as XIcon } from '@lucide/svelte';
import type { Tag, TagWithCount } from '$lib/types/tag';

interface Props {
	itemTags: Tag[];
	availableTags: TagWithCount[];
	onAddTag: (tagId: string) => void;
	onRemoveTag: (tagId: string) => void;
	onEscapeWhenClosed?: () => void;
}

let { itemTags, availableTags, onAddTag, onRemoveTag, onEscapeWhenClosed }: Props = $props();

let showTagSelect = $state(false);
let tagDropdownEl = $state<HTMLElement | null>(null);
let tagTriggerEl = $state<HTMLButtonElement | null>(null);
let focusedTagIndex = $state(-1);

function closeTagDropdown() {
	showTagSelect = false;
	tagTriggerEl?.focus();
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
	<div class="text-xs font-medium text-[var(--ag-text-muted)]">タグ</div>
	<div class="flex flex-wrap gap-1.5">
		{#each itemTags.filter((t) => !t.is_system) as tag (tag.id)}
			<span class="inline-flex items-center gap-1 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2.5 py-1 text-xs text-[var(--ag-text-secondary)]">
				{tag.name}
				<button
					type="button"
					class="ml-0.5 rounded-full p-0.5 text-[var(--ag-text-muted)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
					aria-label="タグ {tag.name} を解除"
					onclick={() => onRemoveTag(tag.id)}
				>
					<XIcon class="h-3 w-3" />
				</button>
			</span>
		{/each}
		{#if itemTags.filter((t) => !t.is_system).length === 0}
			<span class="text-xs text-[var(--ag-text-muted)]">タグなし</span>
		{/if}
	</div>
	{#if availableTags.length > 0}
		<div class="relative">
			<button
				bind:this={tagTriggerEl}
				type="button"
				class="rounded-full border border-dashed border-[var(--ag-border)] px-2.5 py-1 text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
				onclick={() => (showTagSelect = !showTagSelect)}
			>
				+ タグを追加
			</button>
			{#if showTagSelect}
				<div bind:this={tagDropdownEl} class="absolute left-0 top-full z-10 mt-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-1 shadow-lg">
					{#each availableTags as tag, i (tag.id)}
						<button
							type="button"
							class="block w-full rounded-md px-3 py-1.5 text-left text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]"
							tabindex={focusedTagIndex === i ? 0 : -1}
							onclick={() => { onAddTag(tag.id); closeTagDropdown(); }}
							onkeydown={(e) => {
								if (e.key === 'ArrowDown') {
									e.preventDefault();
									focusedTagIndex = Math.min(i + 1, availableTags.length - 1);
								} else if (e.key === 'ArrowUp') {
									e.preventDefault();
									focusedTagIndex = Math.max(i - 1, 0);
								}
							}}
						>
							{tag.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
