<script lang="ts">
import { listen } from '@tauri-apps/api/event';
import { onDestroy } from 'svelte';
import CategoryManager from '$lib/components/item/CategoryManager.svelte';
import ItemFormDialog from '$lib/components/item/ItemFormDialog.svelte';
import ItemList from '$lib/components/item/ItemList.svelte';
import CommandPalette from '$lib/components/palette/CommandPalette.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SetupWizard from '$lib/components/setup/SetupWizard.svelte';
import { Button } from '$lib/components/ui/button';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { paletteStore } from '$lib/state/palette.svelte';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';

type Tab = 'items' | 'categories' | 'settings';

let activeTab = $state<Tab>('items');
let editingItem = $state<Item | null>(null);
let showItemForm = $state(false);

// 初期化
$effect(() => {
	void configStore.loadConfig();
	void itemStore.loadItems();
	void itemStore.loadCategories();
	void itemStore.loadTags();
});

// ホットキーイベントリスナー
let unlisten: (() => void) | null = null;
listen('hotkey-triggered', () => paletteStore.open()).then((fn) => {
	unlisten = fn;
});
onDestroy(() => unlisten?.());

function handleEdit(item: Item) {
	editingItem = item;
	showItemForm = true;
}

function handleDelete(id: string) {
	void itemStore.deleteItem(id);
}

function handleAddNew() {
	editingItem = null;
	showItemForm = true;
}

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
<CommandPalette />
<ItemFormDialog
	open={showItemForm}
	item={editingItem ?? undefined}
	categories={itemStore.categories}
	tags={itemStore.tags}
	onSubmit={handleFormSubmit}
	onClose={handleFormClose}
/>

<!-- メインレイアウト -->
<div class="flex h-screen flex-col">
	<!-- ヘッダー -->
	<header class="flex items-center justify-between border-b px-6 py-3">
		<h1 class="text-lg font-bold">Arcagate</h1>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={() => paletteStore.open()}>
				検索
			</Button>
			<Button
				variant={activeTab === 'items' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'items')}
			>
				アイテム
			</Button>
			<Button
				variant={activeTab === 'categories' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'categories')}
			>
				カテゴリ
			</Button>
			<Button
				variant={activeTab === 'settings' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'settings')}
			>
				設定
			</Button>
		</div>
	</header>

	<!-- メインコンテンツ -->
	<main class="flex-1 overflow-auto p-6">
		{#if activeTab === 'items'}
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-base font-semibold">アイテム一覧</h2>
				<Button size="sm" onclick={handleAddNew}>＋ 追加</Button>
			</div>
			{#if itemStore.loading}
				<p class="text-muted-foreground text-sm">読み込み中...</p>
			{:else if itemStore.error}
				<p class="text-sm text-destructive">{itemStore.error}</p>
			{:else}
				<ItemList items={itemStore.items} onEdit={handleEdit} onDelete={handleDelete} />
			{/if}
		{:else if activeTab === 'categories'}
			<CategoryManager
				categories={itemStore.categories}
				onCreateCategory={(input) => itemStore.createCategory(input)}
				onUpdateCategory={(id, name, prefix) => itemStore.updateCategory(id, name, prefix)}
				onDeleteCategory={(id) => itemStore.deleteCategory(id)}
			/>
		{:else}
			<SettingsPanel />
		{/if}
	</main>
</div>
