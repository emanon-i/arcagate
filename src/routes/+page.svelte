<script lang="ts">
import { Archive, EyeOff, LayoutDashboard, PanelLeft, Search, Settings2 } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import { onDestroy } from 'svelte';
import AppHeader from '$lib/components/arcagate/common/AppHeader.svelte';
import TitleAction from '$lib/components/arcagate/common/TitleAction.svelte';
import TitleBar from '$lib/components/arcagate/common/TitleBar.svelte';
import TitleTab from '$lib/components/arcagate/common/TitleTab.svelte';
import ToastContainer from '$lib/components/arcagate/common/ToastContainer.svelte';
import LibraryLayout from '$lib/components/arcagate/library/LibraryLayout.svelte';
import PaletteOverlay from '$lib/components/arcagate/palette/PaletteOverlay.svelte';
import WorkspaceLayout from '$lib/components/arcagate/workspace/WorkspaceLayout.svelte';
import ItemFormDialog from '$lib/components/item/ItemFormDialog.svelte';
import SetupWizard from '$lib/components/setup/SetupWizard.svelte';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';

type ActiveView = 'library' | 'workspace';

let activeView = $state<ActiveView>('library');
let paletteOpen = $state(false);
let editingItem = $state<Item | null>(null);
let showItemForm = $state(false);
let droppedPaths = $state<string[] | undefined>(undefined);
let isDraggingOver = $state(false);

// 初期化
$effect(() => {
	void configStore.loadConfig();
	void itemStore.loadItems();
	void itemStore.loadCategories();
	void itemStore.loadTags();
	void itemStore.loadLibraryStats();
});

// テーマ初期化（themeStore から読み込み）
$effect(() => {
	void themeStore.loadTheme();
});

// ホットキーイベントリスナー
let unlisten: (() => void) | null = null;
listen('hotkey-triggered', () => {
	paletteOpen = true;
}).then((fn) => {
	unlisten = fn;
});

// D&D: Library タブ & フォーム未表示のときだけ ItemFormDialog を開く
let unlistenDragDrop: (() => void) | null = null;
listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
	isDraggingOver = false;
	if (activeView === 'library' && !showItemForm && event.payload.paths?.length > 0) {
		droppedPaths = event.payload.paths;
		editingItem = null;
		showItemForm = true;
	}
}).then((fn) => {
	unlistenDragDrop = fn;
});

let unlistenDragOver: (() => void) | null = null;
listen('tauri://drag-over', () => {
	if (activeView === 'library' && !showItemForm) isDraggingOver = true;
}).then((fn) => {
	unlistenDragOver = fn;
});

let unlistenDragLeave: (() => void) | null = null;
listen('tauri://drag-leave', () => {
	isDraggingOver = false;
}).then((fn) => {
	unlistenDragLeave = fn;
});

// パス消失イベントリスナー
let unlistenPathNotFound: (() => void) | null = null;
listen<string>('item://path-not-found', (e) => {
	toastStore.add(`パスが見つかりません: ${e.payload}`, 'error');
}).then((fn) => {
	unlistenPathNotFound = fn;
});

onDestroy(() => {
	unlisten?.();
	unlistenDragDrop?.();
	unlistenDragOver?.();
	unlistenDragLeave?.();
	unlistenPathNotFound?.();
});

function handleFormSubmit(input: CreateItemInput | UpdateItemInput) {
	if (editingItem) {
		void itemStore.updateItem(editingItem.id, input as UpdateItemInput);
	} else {
		void itemStore.createItem(input as CreateItemInput);
	}
	showItemForm = false;
	editingItem = null;
	droppedPaths = undefined;
}

function handleFormClose() {
	showItemForm = false;
	editingItem = null;
	droppedPaths = undefined;
}
</script>

<!-- オーバーレイ層 -->
<SetupWizard />
<PaletteOverlay bind:open={paletteOpen} />
<ItemFormDialog
	open={showItemForm}
	item={editingItem ?? undefined}
	initialPaths={droppedPaths}
	categories={itemStore.categories}
	tags={itemStore.tags}
	onSubmit={handleFormSubmit}
	onClose={handleFormClose}
/>

<!-- トースト通知 -->
<ToastContainer />

<!-- D&D オーバーレイ -->
{#if isDraggingOver}
	<div class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/30">
		<div class="rounded-lg border-2 border-dashed border-[var(--ag-accent)] bg-[var(--ag-surface-1)]/90 px-8 py-6 text-center shadow-lg">
			<p class="text-lg font-medium text-[var(--ag-text-primary)]">ここにドロップして登録</p>
			<p class="mt-1 text-sm text-[var(--ag-text-muted)]">exe / url / folder / script</p>
		</div>
	</div>
{/if}

<!-- メインレイアウト -->
<div class="flex h-screen flex-col bg-[var(--ag-surface-0)]">
	<TitleBar />
	<!-- カスタムヘッダーバー -->
	<AppHeader>
		{#snippet centerSlot()}
			<div class="flex items-center gap-2">
				<TitleTab
					icon={Archive}
					label="Library"
					active={activeView === "library"}
					onclick={() => (activeView = "library")}
				/>
				<TitleTab
					icon={LayoutDashboard}
					label="Workspace"
					active={activeView === "workspace"}
					onclick={() => (activeView = "workspace")}
				/>
			</div>
		{/snippet}
		{#snippet rightSlot()}
			<TitleAction icon={Search} label="Palette" tone="accent" onclick={() => (paletteOpen = true)} />
			{#if activeView === "library"}
				<TitleAction icon={PanelLeft} label="Sidebar" />
				<TitleAction icon={EyeOff} label="Hidden off" tone="warm" />
			{:else}
				<TitleAction icon={EyeOff} label="Safe mode" tone="warm" />
			{/if}
			<!-- TODO: Settings 導線 U-05 で配置先決定 -->
			<TitleAction icon={Settings2} label="Settings" />
		{/snippet}
	</AppHeader>

	<!-- メインコンテンツ -->
	<main class="min-h-0 flex-1 overflow-hidden">
		{#if activeView === "library"}
			<LibraryLayout
				onEditItem={(id) => {
					editingItem = itemStore.items.find((i) => i.id === id) ?? null;
					showItemForm = true;
				}}
				onAddItem={() => {
					editingItem = null;
					showItemForm = true;
				}}
			/>
		{:else}
			<WorkspaceLayout />
		{/if}
	</main>
</div>
