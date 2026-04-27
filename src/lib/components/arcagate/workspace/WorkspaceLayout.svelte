<script lang="ts">
import { Crop, LayoutGrid, Pencil } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import * as workspaceIpc from '$lib/ipc/workspace';
import { configStore } from '$lib/state/config.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import { clampWidget } from '$lib/utils/widget-grid';
import { widgetRegistry } from '$lib/widgets';
import PageTabBar from './PageTabBar.svelte';
import WorkspaceDeleteConfirmDialog from './WorkspaceDeleteConfirmDialog.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
import WorkspaceRenameDialog from './WorkspaceRenameDialog.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

const zoom = useWidgetZoom(() => workspaceContainer);

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

type WidgetSnapshot = { id: string; x: number; y: number; w: number; h: number };

let editMode = $state(false);
let selectedWidgetId = $state<string | null>(null);
let editSnapshot = $state<WidgetSnapshot[]>([]);
let renameOpen = $state(false);
let deleteConfirmId = $state<string | null>(null);
let contextItemId = $state<string | null>(null);
let workspaceContainer = $state<HTMLDivElement | null>(null);
let containerWidth = $state(0);

// PH-499: 現在の workspace の壁紙を asset URL に変換 (Tauri asset protocol)
const wallpaperUrl = $derived(() => {
	const ws = workspaceStore.activeWorkspace;
	if (!ws?.wallpaper_path) return null;
	try {
		return convertFileSrc(ws.wallpaper_path);
	} catch {
		return null;
	}
});

$effect(() => {
	const el = workspaceContainer;
	if (!el) return;
	containerWidth = el.clientWidth;
	const ro = new ResizeObserver((entries) => {
		for (const entry of entries) {
			containerWidth = entry.contentRect.width;
		}
	});
	ro.observe(el);
	return () => ro.disconnect();
});

// PH-305 Canvas パン: 中ボタン drag / Space + 左 drag
let panActive = $state(false);
let panSpacePressed = $state(false);
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

$effect(() => {
	function onKeyDown(e: KeyboardEvent) {
		if (e.code !== 'Space') return;
		const target = e.target as HTMLElement | null;
		if (
			target?.tagName === 'INPUT' ||
			target?.tagName === 'TEXTAREA' ||
			target?.isContentEditable
		) {
			return;
		}
		if (!editMode) return;
		e.preventDefault();
		panSpacePressed = true;
		if (workspaceContainer && !panActive) {
			workspaceContainer.style.cursor = 'grab';
		}
	}
	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
			panSpacePressed = false;
			if (workspaceContainer && !panActive) {
				workspaceContainer.style.cursor = '';
			}
		}
	}
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	return () => {
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
	};
});

function onCanvasPointerDown(e: PointerEvent) {
	if (!editMode || !workspaceContainer) return;
	const isMiddle = e.button === 1;
	const isSpaceLeft = e.button === 0 && panSpacePressed;
	if (!isMiddle && !isSpaceLeft) return;
	e.preventDefault();
	panActive = true;
	panStart = {
		x: e.clientX,
		y: e.clientY,
		scrollLeft: workspaceContainer.scrollLeft,
		scrollTop: workspaceContainer.scrollTop,
	};
	workspaceContainer.setPointerCapture(e.pointerId);
	workspaceContainer.style.cursor = 'grabbing';
}

function onCanvasPointerMove(e: PointerEvent) {
	if (!panActive || !workspaceContainer) return;
	workspaceContainer.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
	workspaceContainer.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
}

function onCanvasPointerUp(e: PointerEvent) {
	if (!panActive || !workspaceContainer) return;
	panActive = false;
	workspaceContainer.releasePointerCapture(e.pointerId);
	workspaceContainer.style.cursor = panSpacePressed ? 'grab' : '';
}

// PH-307 Del キーで選択中ウィジェット削除（編集モード時のみ）
$effect(() => {
	function onKeyDown(e: KeyboardEvent) {
		if (!editMode) return;
		if (e.key !== 'Delete' && e.key !== 'Backspace') return;
		const target = e.target as HTMLElement | null;
		if (
			target?.tagName === 'INPUT' ||
			target?.tagName === 'TEXTAREA' ||
			target?.isContentEditable
		) {
			return;
		}
		if (selectedWidgetId) {
			deleteConfirmId = selectedWidgetId;
		}
	}
	window.addEventListener('keydown', onKeyDown);
	return () => window.removeEventListener('keydown', onKeyDown);
});

// PH-477: Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) で widget 操作 undo/redo
$effect(() => {
	async function reload() {
		if (workspaceStore.activeWorkspaceId) {
			await workspaceStore.loadWidgets(workspaceStore.activeWorkspaceId);
		}
	}
	function onKeyDown(e: KeyboardEvent) {
		if (!editMode) return;
		const target = e.target as HTMLElement | null;
		if (
			target?.tagName === 'INPUT' ||
			target?.tagName === 'TEXTAREA' ||
			target?.isContentEditable
		) {
			return;
		}
		const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
		const isRedo =
			(e.ctrlKey || e.metaKey) &&
			((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y');
		if (isUndo) {
			e.preventDefault();
			void workspaceHistory.undo(reload);
		} else if (isRedo) {
			e.preventDefault();
			void workspaceHistory.redo(reload);
		}
	}
	window.addEventListener('keydown', onKeyDown);
	return () => window.removeEventListener('keydown', onKeyDown);
});

// ウィジェットが占める最大列数（ウィンドウが狭くなっても下回らせない）
let minGridCols = $derived(
	workspaceStore.widgets.length > 0
		? Math.max(1, ...workspaceStore.widgets.map((w) => w.position_x + w.width))
		: 1,
);

let dynamicCols = $derived(
	containerWidth > 0 && zoom.widgetW > 0
		? Math.max(minGridCols, Math.floor(containerWidth / zoom.widgetW))
		: Math.max(minGridCols, 4),
);

let currentWorkspaceName = $derived(
	workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId)?.name ?? '',
);

function handleSelectWorkspace(id: string) {
	void workspaceStore.selectWorkspace(id);
}

function confirmRename(name: string) {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (ws && name.trim() && name !== ws.name) {
		void workspaceStore.updateWorkspace(ws.id, name.trim());
	}
	renameOpen = false;
}

// PH-478: edit session の race condition 防止フラグ
// (start ↔ cancel/confirm の async 跨ぎで snapshot が混ざる問題を排除)
let editTransitioning = $state(false);

async function startEdit() {
	if (editTransitioning) return;
	editTransitioning = true;
	try {
		// PH-478: 前 session の cleanup が終わるまで sync 化、最新 widgets 取得
		if (workspaceStore.activeWorkspaceId) {
			await workspaceStore.loadWidgets(workspaceStore.activeWorkspaceId);
		}
		// PH-477+478: history clear で過去 session の undo を断ち切る (再編集で前 draft 残らない)
		workspaceHistory.clear();
		editMode = true;
		selectedWidgetId = null;
		editSnapshot = workspaceStore.widgets.map((w) => ({
			id: w.id,
			x: w.position_x,
			y: w.position_y,
			w: w.width,
			h: w.height,
		}));
	} finally {
		editTransitioning = false;
	}
}

function confirmEdit() {
	editMode = false;
	selectedWidgetId = null;
	editSnapshot = [];
	// PH-478: confirm 後も history は session 跨ぎで残さない (clarity 優先)
	workspaceHistory.clear();
}

function hasUnsavedChanges(): boolean {
	if (editSnapshot.length === 0) return false;
	const snapshotIds = new Set(editSnapshot.map((s) => s.id));
	const liveIds = new Set(workspaceStore.widgets.map((w) => w.id));
	if (snapshotIds.size !== liveIds.size) return true;
	for (const id of snapshotIds) {
		if (!liveIds.has(id)) return true;
	}
	for (const snap of editSnapshot) {
		const live = workspaceStore.widgets.find((w) => w.id === snap.id);
		if (!live) return true;
		if (
			live.position_x !== snap.x ||
			live.position_y !== snap.y ||
			live.width !== snap.w ||
			live.height !== snap.h
		) {
			return true;
		}
	}
	return false;
}

let cancelConfirmOpen = $state(false);

async function cancelEdit() {
	if (editTransitioning) return;
	if (hasUnsavedChanges()) {
		cancelConfirmOpen = true;
		return;
	}
	editTransitioning = true;
	try {
		editMode = false;
		selectedWidgetId = null;
		await doRestoreSnapshot();
		workspaceHistory.clear(); // PH-478: cancel 後の history を消去
	} finally {
		editTransitioning = false;
	}
}

async function confirmCancel() {
	if (editTransitioning) return;
	cancelConfirmOpen = false;
	editTransitioning = true;
	try {
		editMode = false;
		selectedWidgetId = null;
		await doRestoreSnapshot();
		workspaceHistory.clear();
	} finally {
		editTransitioning = false;
	}
}

function dismissCancel() {
	cancelConfirmOpen = false;
}

async function doRestoreSnapshot() {
	const snapshot = editSnapshot;
	editSnapshot = [];
	const snapshotIds = new Set(snapshot.map((s) => s.id));
	// 編集中に追加されたウィジェットを削除
	for (const w of workspaceStore.widgets) {
		if (!snapshotIds.has(w.id)) {
			await workspaceIpc.removeWidget(w.id);
		}
	}
	// 元の位置・サイズに戻す
	for (const snap of snapshot) {
		await workspaceIpc.updateWidgetPosition(snap.id, snap.x, snap.y, snap.w, snap.h);
	}
	if (workspaceStore.activeWorkspaceId) {
		void workspaceStore.loadWidgets(workspaceStore.activeWorkspaceId);
	}
}

// widget components は widgetRegistry から派生（batch-83 PH-370）
const widgetComponents = Object.fromEntries(
	Object.entries(widgetRegistry).map(([type, meta]) => [type, meta.Component]),
);

function handleItemContext(itemId: string) {
	contextItemId = itemId;
}

// PH-473: 配置余地確保のため最低 maxRow を 8 に拡張、widgets が増えても +4 行の余白を保つ
let maxRow = $derived(
	Math.max(8, ...workspaceStore.widgets.map((w) => w.position_y + w.height + 4)),
);

// PH-473: bounding box にスクロール (Crop ボタン用)
function cropToWidgets() {
	const el = workspaceContainer;
	const ws = workspaceStore.widgets;
	if (!el || ws.length === 0) return;
	const cellW = zoom.widgetW + 16;
	const cellH = zoom.widgetH + 16;
	const minX = Math.min(...ws.map((w) => w.position_x));
	const minY = Math.min(...ws.map((w) => w.position_y));
	el.scrollTo({
		left: Math.max(0, minX * cellW - 24),
		top: Math.max(0, minY * cellH - 24),
		behavior: 'smooth',
	});
}
</script>

<svelte:window
	onkeydown={(e) => {
		if (!editMode) return;
		if (e.key === 'Escape') {
			if (deleteConfirmId) {
				// 削除確認ダイアログが開いている場合はダイアログを閉じる（cancelEdit はしない）
				deleteConfirmId = null;
			} else if (!renameOpen) {
				cancelEdit();
			}
			// renameOpen の場合はダイアログ内 autofocus input が ESC を処理
		} else if (e.key === 'Enter' && !deleteConfirmId && !renameOpen) {
			e.preventDefault();
			confirmEdit();
		}
		if (
			(e.key === 'Delete' || e.key === 'Backspace') &&
			selectedWidgetId &&
			!deleteConfirmId &&
			!renameOpen
		) {
			e.preventDefault();
			deleteConfirmId = selectedWidgetId;
		}
	}}
/>

<!-- Pointer drag ghost (follows cursor while dragging sidebar widget or moving widget) -->
{#if pointerDrag.active}
	<div
		class="pointer-events-none fixed z-[999] flex items-center justify-center rounded-lg opacity-80 shadow-lg"
		style="
			background: var(--ag-accent);
			width: 72px;
			height: 36px;
			left: {pointerDrag.clientX - 36}px;
			top: {pointerDrag.clientY - 18}px;
			transform: scale({pointerDrag.dropCell ? 1.08 : 1});
			transition: transform 80ms ease;
		"
	></div>
{/if}

<div class="relative flex h-full">
	<WorkspaceHintBar {editMode} {selectedWidgetId} />

	<WorkspaceSidebar
		{editMode}
		onToggleEdit={startEdit}
		onConfirmEdit={confirmEdit}
		onCancelEdit={cancelEdit}
	/>

	<!-- PH-496: ウィジット切替ボタン (編集モード切替) を左上に固定
		user fb 2026-04-28: 「ウィジットの切り替えのボタン。これ左上に固定にしてね」
		編集モード非時のみ表示、編集モード時は sidebar 内の確定/キャンセルが取って代わる -->
	{#if !editMode}
		<button
			type="button"
			class="absolute left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] text-[var(--ag-text-secondary)] shadow-md transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2"
			aria-label="ウィジェット編集モード"
			onclick={startEdit}
		>
			<Pencil class="h-4 w-4" />
		</button>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- PH-494 MVP: Obsidian Canvas 風 (dotted grid 背景 + 表示領域拡大)
		編集モード時:
		- padding 縮小 (p-5 → p-2) で表示領域拡大
		- dotted grid 背景を 16px 間隔 + より目立つ rgba(0,0,0,.18) で Obsidian 風に
		次 wave (PH-494 polish): Ctrl+wheel zoom / free pan / 右下 toolbar / workspace 単位 persist -->
	<div
		class="relative min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable] {editMode
			? 'p-2 canvas-edit-mode'
			: 'p-5'}"
		style="--widget-w: {zoom.widgetW}px; --widget-h: {zoom.widgetH}px; background-image: {editMode
			? 'radial-gradient(circle, rgba(120,120,120,0.28) 1.2px, transparent 1.4px), linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%)'
			: 'linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%)'}; background-size: {editMode
			? '16px 16px, 100% 100%'
			: '100% 100%'};"
		data-zoom={configStore.widgetZoom}
		bind:this={workspaceContainer}
		onpointerdown={onCanvasPointerDown}
		onpointermove={onCanvasPointerMove}
		onpointerup={onCanvasPointerUp}
	>
		{#if wallpaperUrl()}
			{@const ws = workspaceStore.activeWorkspace}
			<!-- PH-499: workspace 壁紙レイヤー (gradient より上、コンテンツより下) -->
			<div
				class="pointer-events-none absolute inset-0 bg-cover bg-center motion-reduce:!filter-none"
				style="z-index: 0; background-image: url('{wallpaperUrl()}'); opacity: {ws?.wallpaper_opacity ?? 1}; filter: blur({ws?.wallpaper_blur ?? 0}px);"
				data-testid="workspace-wallpaper-layer"
			></div>
		{/if}
		<div class="relative z-10 mb-5" class:pointer-events-none={editMode} class:opacity-50={editMode}>
			<PageTabBar onSelectWorkspace={handleSelectWorkspace} onRenameActive={() => (renameOpen = true)} />
		</div>

		{#if !editMode}
			<div class="mb-4">
				<Tip tone="accent" tipId="workspace-home-tip">
					このページはホームです。よく使うものをまとめて配置できます。
				</Tip>
			</div>
		{/if}

		<div class="flex gap-4">
			<div class="min-w-0 flex-1">
				{#if editMode}
					<div class="mb-4">
						<Tip tone="accent" tipId="workspace-edit-guide">
							クリックで選択、上端のバーで移動、四隅のハンドルでリサイズ、× で削除。
						</Tip>
					</div>

					<WorkspaceWidgetGrid
						{dynamicCols}
						{maxRow}
						widgetW={zoom.widgetW}
						widgetH={zoom.widgetH}
						{widgetComponents}
						{selectedWidgetId}
						{deleteConfirmId}
						{editMode}
						onItemContext={handleItemContext}
						onSelectedWidgetIdChange={(id) => (selectedWidgetId = id)}
						onDeleteConfirmIdChange={(id) => (deleteConfirmId = id)}
					/>
				{:else if workspaceStore.widgets.length > 0}
					<div
						style="display: grid; grid-template-columns: repeat({dynamicCols}, var(--widget-w)); grid-auto-rows: var(--widget-h); gap: 16px;"
					>
						{#each workspaceStore.widgets as widget (widget.id)}
							{@const WidgetComp =
								widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
							{@const clamped = clampWidget(widget, dynamicCols)}
							{#if WidgetComp}
								<div
									style="grid-column: {clamped.x + 1} / span {clamped.span}; grid-row: {widget.position_y +
										1} / span {widget.height};"
								>
									<WidgetComp {widget} onItemContext={handleItemContext} />
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<EmptyState
						icon={LayoutGrid}
						title="ウィジェットを追加しましょう"
						description="編集モードに入って『+』からよく使うものを並べてください"
						action={{ label: "編集モード開始", onClick: startEdit }}
						testId="workspace-empty-state"
					/>
				{/if}
			</div>

			{#if contextItemId}
				<div class="w-80 shrink-0">
					<LibraryDetailPanel
						selectedItemId={contextItemId}
						{onEditItem}
						onClose={() => (contextItemId = null)}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- PH-473: Crop to widgets ボタン (workspace 右下 floating, 編集モード時のみ) -->
{#if workspaceStore.widgets.length > 0}
	<button
		type="button"
		class="absolute bottom-6 right-6 z-30 flex h-10 items-center gap-2 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface)] px-4 text-sm text-[var(--ag-text-secondary)] shadow-md transition-colors hover:bg-[var(--ag-surface-3)]"
		aria-label="ウィジェットに合わせてスクロール"
		onclick={cropToWidgets}
	>
		<Crop class="h-4 w-4" />
		<span>表示を合わせる</span>
	</button>
{/if}

<WorkspaceDeleteConfirmDialog
	widgetId={deleteConfirmId}
	onConfirm={() => {
		if (deleteConfirmId) void workspaceStore.removeWidget(deleteConfirmId);
		deleteConfirmId = null;
	}}
	onCancel={() => (deleteConfirmId = null)}
/>

<WorkspaceRenameDialog
	open={renameOpen}
	currentName={currentWorkspaceName}
	onConfirm={confirmRename}
	onCancel={() => (renameOpen = false)}
/>

<ConfirmDialog
	open={cancelConfirmOpen}
	title="編集を破棄しますか？"
	description="未確定の変更があります。破棄するとレイアウト変更は失われます。"
	confirmLabel="破棄する"
	cancelLabel="編集に戻る"
	confirmVariant="destructive"
	onConfirm={confirmCancel}
	onCancel={dismissCancel}
/>
