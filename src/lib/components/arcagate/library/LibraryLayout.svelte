<script lang="ts">
import { convertFileSrc } from '@tauri-apps/api/core';
import { onMount } from 'svelte';
import { libraryWallpaperStore } from '$lib/state/library-wallpaper.svelte';
import {
	loadBool,
	loadNumber,
	loadString,
	removeKey,
	saveBool,
	saveNumber,
	saveString,
} from '$lib/utils/local-storage';
import { tl } from '$lib/utils/perf-timeline';
import LibraryDetailPanel from './LibraryDetailPanel.svelte';
import LibraryMainArea from './LibraryMainArea.svelte';
import LibrarySidebar from './LibrarySidebar.svelte';

interface Props {
	onEditItem?: (id: string) => void;
	onAddItem?: () => void;
}

let { onEditItem, onAddItem }: Props = $props();

tl('LibraryLayout: instantiate');
onMount(() => {
	tl('LibraryLayout: mounted (DOM tree ready)');
	// PH-CF-700 C8: 初回 mount 時に backend からグローバル壁紙設定を取得し store に格納する。
	// best-effort: 失敗時は default (path=null) のまま壁紙レイヤーが描画されない (背景は theme
	// の `--ag-surface-0` が見える)。 再起動後も値が永続される (config table 経由)。
	void libraryWallpaperStore.load();
});

let libraryWallpaper = $derived(libraryWallpaperStore.wallpaper);
let libraryWallpaperUrl = $derived(
	libraryWallpaper.path ? convertFileSrc(libraryWallpaper.path) : '',
);

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

// PH-CF-700 C8: 背景壁紙レイヤーを置くため、 ルート grid を `relative` にする。
// 既存 `bg-[var(--ag-surface-0)]` は壁紙未設定時の fallback 背景として維持。
const base = 'relative flex h-full flex-col md:grid md:grid-rows-[1fr] bg-[var(--ag-surface-0)]';

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
	<!-- PH-CF-700 C8: ライブラリ画面のグローバル壁紙レイヤー。 WorkspaceGrid の wallpaper layer
	     (`features/backend/wallpaper-service.md` §壁紙格納先契約) と同型: `pointer-events-none`
	     + `z-0` + `bg-cover` + `bg-center` + 動的 `background-image` / `opacity` / `filter: blur`。
	     `motion-reduce:!filter-none` で reduce-motion 時は blur を無効化。 sidebar / main /
	     detail panel はこのレイヤーより前面 (default z-index = auto > 0) で描画される。 -->
	{#if libraryWallpaperUrl}
		<div
			class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat motion-reduce:!filter-none"
			style="background-image: url('{libraryWallpaperUrl}'); opacity: {libraryWallpaper.opacity}; filter: blur({libraryWallpaper.blur}px);"
			aria-hidden="true"
			data-testid="library-wallpaper"
		></div>
	{/if}
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
		<LibraryMainArea
			{activeTag}
			onSelectItem={(id: string | null) => (selectedItemId = id)}
			{onAddItem}
			{onEditItem}
		/>
	</div>
	{#if selectedItemId}
		<div class="hidden min-h-0 overflow-y-auto [scrollbar-gutter:stable] lg:block" data-testid="library-detail-wrapper">
			<LibraryDetailPanel {selectedItemId} {onEditItem} onClose={() => (selectedItemId = null)} />
		</div>
	{/if}
</div>
