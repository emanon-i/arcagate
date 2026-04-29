<script lang="ts">
import {
	loadBool,
	loadNumber,
	loadString,
	removeKey,
	saveBool,
	saveNumber,
	saveString,
} from '$lib/utils/local-storage';
import LibraryDetailPanel from './LibraryDetailPanel.svelte';
import LibraryMainArea from './LibraryMainArea.svelte';
import LibrarySidebar from './LibrarySidebar.svelte';

interface Props {
	onEditItem?: (id: string) => void;
	onAddItem?: () => void;
}

let { onEditItem, onAddItem }: Props = $props();

// 検収 #9 + Codex Low #8: Library sidebar 展開状態 / activeTag を safe helper 経由で永続化。
const SIDEBAR_KEY = 'arcagate.library.sidebar.expanded';
const TAG_KEY = 'arcagate.library.activeTag';
let sidebarExpanded = $state<boolean>(loadBool(SIDEBAR_KEY, false));
let selectedItemId: string | null = $state(null);
let activeTag: string | null = $state(loadString(TAG_KEY, '') || null);

$effect(() => {
	saveBool(SIDEBAR_KEY, sidebarExpanded);
	if (activeTag === null) removeKey(TAG_KEY);
	else saveString(TAG_KEY, activeTag);
});

// 検収 #8 + Codex Low #8: scroll 位置永続化（mount 復元 + 200ms debounce 保存）。safe helper 経由。
const SCROLL_KEY = 'arcagate.library.mainScrollTop';
let mainScrollEl = $state<HTMLDivElement | null>(null);
let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;
$effect(() => {
	if (!mainScrollEl) return;
	const saved = loadNumber(SCROLL_KEY, 0, 0);
	queueMicrotask(() => {
		if (mainScrollEl && saved > 0) mainScrollEl.scrollTop = saved;
	});
});
function onMainScroll() {
	if (!mainScrollEl) return;
	if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
	scrollSaveTimer = setTimeout(() => {
		if (mainScrollEl) saveNumber(SCROLL_KEY, mainScrollEl.scrollTop);
	}, 200);
}

function handleTagSelect(tagId: string | null) {
	if (!sidebarExpanded) {
		sidebarExpanded = true;
		activeTag = tagId;
	} else if (activeTag === tagId) {
		sidebarExpanded = false;
	} else {
		activeTag = tagId;
	}
}

const base = 'flex h-full flex-col md:grid md:grid-rows-[1fr] bg-[var(--ag-surface-0)]';

let gridClass = $derived.by(() => {
	if (sidebarExpanded && selectedItemId) {
		return `${base} md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)_340px]`;
	}
	if (sidebarExpanded) {
		return `${base} md:grid-cols-[200px_minmax(0,1fr)]`;
	}
	if (selectedItemId) {
		return `${base} md:grid-cols-[48px_minmax(0,1fr)] lg:grid-cols-[48px_minmax(0,1fr)_340px]`;
	}
	return `${base} md:grid-cols-[48px_minmax(0,1fr)]`;
});
</script>

<div class={gridClass}>
	<div class="hidden min-h-0 overflow-y-auto [scrollbar-gutter:stable] md:block" data-testid="library-sidebar-wrapper">
		<LibrarySidebar expanded={sidebarExpanded} {activeTag} onSelectTag={handleTagSelect} />
	</div>
	<!-- 検収 #8: Library main の scroll 位置を localStorage で永続化。Workspace 戻りで「違う場所」に
	     戻る不具合の対策 (Obsidian / IDE 標準の挙動)。 -->
	<div
		class="min-h-0 overflow-y-auto [scrollbar-gutter:stable]"
		data-testid="library-main-wrapper"
		bind:this={mainScrollEl}
		onscroll={onMainScroll}
	>
		<LibraryMainArea {activeTag} onSelectItem={(id: string | null) => (selectedItemId = id)} {onAddItem} />
	</div>
	{#if selectedItemId}
		<div class="hidden min-h-0 overflow-y-auto [scrollbar-gutter:stable] lg:block" data-testid="library-detail-wrapper">
			<LibraryDetailPanel {selectedItemId} {onEditItem} onClose={() => (selectedItemId = null)} />
		</div>
	{/if}
</div>
