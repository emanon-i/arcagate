<script lang="ts">
import { Archive, EyeOff, LayoutDashboard, PanelLeft, Search, Settings2 } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import { onDestroy } from 'svelte';
import AppHeader from '$lib/components/arcagate/common/AppHeader.svelte';
import TitleAction from '$lib/components/arcagate/common/TitleAction.svelte';
import TitleBar from '$lib/components/arcagate/common/TitleBar.svelte';
import TitleTab from '$lib/components/arcagate/common/TitleTab.svelte';
import LibraryLayout from '$lib/components/arcagate/library/LibraryLayout.svelte';
import PaletteOverlay from '$lib/components/arcagate/palette/PaletteOverlay.svelte';
import WorkspaceLayout from '$lib/components/arcagate/workspace/WorkspaceLayout.svelte';
import ItemFormDialog from '$lib/components/item/ItemFormDialog.svelte';
import SetupWizard from '$lib/components/setup/SetupWizard.svelte';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';

type ActiveView = 'library' | 'workspace';

let activeView = $state<ActiveView>('library');
let paletteOpen = $state(false);
let editingItem = $state<Item | null>(null);
let showItemForm = $state(false);
let toasts = $state<{ id: number; path: string }[]>([]);
let nextToastId = 0;

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

// パス消失イベントリスナー
let unlistenPathNotFound: (() => void) | null = null;
listen<string>('item://path-not-found', (e) => {
	const id = nextToastId++;
	toasts = [...toasts, { id, path: e.payload }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, 5000);
}).then((fn) => {
	unlistenPathNotFound = fn;
});

onDestroy(() => {
	unlisten?.();
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
}

function handleFormClose() {
	showItemForm = false;
	editingItem = null;
}
</script>

<!-- オーバーレイ層 -->
<SetupWizard />
<PaletteOverlay bind:open={paletteOpen} />
<ItemFormDialog
	open={showItemForm}
	item={editingItem ?? undefined}
	categories={itemStore.categories}
	tags={itemStore.tags}
	onSubmit={handleFormSubmit}
	onClose={handleFormClose}
/>

<!-- トースト通知 -->
{#if toasts.length > 0}
	<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
		{#each toasts as toast (toast.id)}
			<div
				class="max-w-sm rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-md"
			>
				<span class="font-medium">パスが見つかりません</span>
				<p class="mt-1 truncate text-xs opacity-80">{toast.path}</p>
			</div>
		{/each}
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
