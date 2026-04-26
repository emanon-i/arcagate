<script lang="ts">
import { Eye, EyeOff, HelpCircle, X } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { onDestroy } from 'svelte';
import TitleAction from '$lib/components/arcagate/common/TitleAction.svelte';
import TitleBar from '$lib/components/arcagate/common/TitleBar.svelte';
import TitleTab from '$lib/components/arcagate/common/TitleTab.svelte';
import ToastContainer from '$lib/components/arcagate/common/ToastContainer.svelte';
import LibraryLayout from '$lib/components/arcagate/library/LibraryLayout.svelte';
import WorkspaceLayout from '$lib/components/arcagate/workspace/WorkspaceLayout.svelte';
import HelpPanel from '$lib/components/help/HelpPanel.svelte';
import ItemFormDialog from '$lib/components/item/ItemFormDialog.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SetupWizard from '$lib/components/setup/SetupWizard.svelte';
import { NAV_TOP } from '$lib/nav-items';
import { configStore } from '$lib/state/config.svelte';
import { helpStore } from '$lib/state/help.svelte';
import { hiddenStore } from '$lib/state/hidden.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';

type ActiveView = 'library' | 'workspace';

let activeView = $state<ActiveView>('library');
let editingItem = $state<Item | null>(null);
let showItemForm = $state(false);
let droppedPaths = $state<string[] | undefined>(undefined);
let isDraggingOver = $state(false);
let showSettings = $state(false);

// 初期化
$effect(() => {
	void configStore.loadConfig();
	void itemStore.loadItems();
	void itemStore.loadTags();
	void itemStore.loadLibraryStats();
});

// テーマ初期化（themeStore から読み込み）
$effect(() => {
	void themeStore.loadTheme();
});

// Store エラー → トースト自動連携
let prevItemError: string | null = null;
let prevWorkspaceError: string | null = null;
$effect(() => {
	const err = itemStore.error;
	if (err && err !== prevItemError) {
		toastStore.add(err, 'error');
	}
	prevItemError = err;
});
$effect(() => {
	const err = workspaceStore.error;
	if (err && err !== prevWorkspaceError) {
		toastStore.add(err, 'error');
	}
	prevWorkspaceError = err;
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
	unlistenDragDrop?.();
	unlistenDragOver?.();
	unlistenDragLeave?.();
	unlistenPathNotFound?.();
});

// グローバルキーボードハンドラ: `?` でヘルプ開閉 (input フォーカス中は無視)
function handleGlobalKey(e: KeyboardEvent) {
	if (e.key !== '?') return;
	const target = e.target as HTMLElement | null;
	if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
		return;
	}
	e.preventDefault();
	helpStore.toggle();
}

async function openFloatingPalette() {
	const palette = await WebviewWindow.getByLabel('palette');
	if (palette) {
		await palette.show();
		await palette.setFocus();
		await palette.emit('palette-open', null);
	}
}

async function handleFormSubmit(input: CreateItemInput | UpdateItemInput) {
	if (editingItem) {
		await itemStore.updateItem(editingItem.id, input as UpdateItemInput);
		toastStore.add('アイテムを更新しました', 'success');
	} else {
		await itemStore.createItem(input as CreateItemInput);
		toastStore.add('アイテムを作成しました', 'success');
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

<svelte:window on:keydown={handleGlobalKey} />

<!-- オーバーレイ層 -->
<SetupWizard />
<HelpPanel />
<ItemFormDialog
	open={showItemForm}
	item={editingItem ?? undefined}
	initialPaths={droppedPaths}
	tags={itemStore.tags}
	onSubmit={handleFormSubmit}
	onClose={handleFormClose}
/>

<!-- Settings ダイアログ -->
{#if showSettings}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showSettings = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') showSettings = false; }}
	>
		<div class="relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] shadow-[var(--ag-shadow-dialog)]">
			<div class="flex shrink-0 items-center justify-between border-b border-[var(--ag-border)] px-5 py-3">
				<h2 class="text-base font-semibold text-[var(--ag-text-primary)]">設定</h2>
				<button
					type="button"
					class="rounded-lg p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)]"
					aria-label="設定を閉じる"
					onclick={() => (showSettings = false)}
				>
					<X class="h-4 w-4" />
				</button>
			</div>
			<div class="min-h-0 flex-1 overflow-hidden">
				<SettingsPanel />
			</div>
		</div>
	</div>
{/if}

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
	<TitleBar>
		{#snippet leftSlot()}
			<TitleAction
				icon={NAV_TOP.settings.icon}
				label={NAV_TOP.settings.label}
				onclick={() => (showSettings = true)}
			/>
			<TitleAction
				icon={HelpCircle}
				label="ヘルプ"
				onclick={() => helpStore.open()}
			/>
			<TitleAction
				icon={hiddenStore.isHiddenVisible ? Eye : EyeOff}
				label={hiddenStore.isHiddenVisible ? '非表示アイテム: 表示' : '非表示アイテム: 非表示'}
				tone={hiddenStore.isHiddenVisible ? 'warm' : 'default'}
				onclick={() => hiddenStore.toggleDirect()}
			/>
			<TitleAction
				icon={NAV_TOP.palette.icon}
				label={NAV_TOP.palette.label}
				tone="accent"
				onclick={openFloatingPalette}
			/>
		{/snippet}
		{#snippet centerSlot()}
			<div class="flex items-center gap-2">
				<TitleTab
					icon={NAV_TOP.library.icon}
					label={NAV_TOP.library.label}
					active={activeView === "library"}
					onclick={() => (activeView = "library")}
				/>
				<TitleTab
					icon={NAV_TOP.workspace.icon}
					label={NAV_TOP.workspace.label}
					active={activeView === "workspace"}
					onclick={() => (activeView = "workspace")}
				/>
			</div>
		{/snippet}
	</TitleBar>

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
			<WorkspaceLayout
					onEditItem={(id) => {
						editingItem = itemStore.items.find((i) => i.id === id) ?? null;
						showItemForm = true;
					}}
				/>
		{/if}
	</main>
</div>
