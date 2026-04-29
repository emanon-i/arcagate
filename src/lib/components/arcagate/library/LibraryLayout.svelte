<script lang="ts">
import LibraryDetailPanel from './LibraryDetailPanel.svelte';
import LibraryMainArea from './LibraryMainArea.svelte';
import LibrarySidebar from './LibrarySidebar.svelte';

interface Props {
	onEditItem?: (id: string) => void;
	onAddItem?: () => void;
}

let { onEditItem, onAddItem }: Props = $props();

// 検収 #9: Library sidebar 展開状態 / activeTag を localStorage で永続化。
const SIDEBAR_KEY = 'arcagate.library.sidebar.expanded';
const TAG_KEY = 'arcagate.library.activeTag';
let sidebarExpanded = $state<boolean>(
	typeof window !== 'undefined' ? localStorage.getItem(SIDEBAR_KEY) === 'true' : false,
);
let selectedItemId: string | null = $state(null);
let activeTag: string | null = $state(
	typeof window !== 'undefined' ? localStorage.getItem(TAG_KEY) : null,
);

$effect(() => {
	if (typeof window !== 'undefined') {
		localStorage.setItem(SIDEBAR_KEY, String(sidebarExpanded));
		if (activeTag === null) {
			localStorage.removeItem(TAG_KEY);
		} else {
			localStorage.setItem(TAG_KEY, activeTag);
		}
	}
});

// 検収 #8: scroll 位置永続化。 mount 時に復元、scroll で保存 (debounce 200ms)。
const SCROLL_KEY = 'arcagate.library.mainScrollTop';
let mainScrollEl = $state<HTMLDivElement | null>(null);
let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;
$effect(() => {
	if (mainScrollEl && typeof window !== 'undefined') {
		const saved = Number(localStorage.getItem(SCROLL_KEY) ?? 0);
		queueMicrotask(() => {
			if (mainScrollEl && saved > 0) mainScrollEl.scrollTop = saved;
		});
	}
});
function onMainScroll() {
	if (typeof window === 'undefined' || !mainScrollEl) return;
	if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
	scrollSaveTimer = setTimeout(() => {
		if (mainScrollEl) localStorage.setItem(SCROLL_KEY, String(mainScrollEl.scrollTop));
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
