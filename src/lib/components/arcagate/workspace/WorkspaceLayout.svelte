<script lang="ts">
import { Crop, LayoutGrid } from '@lucide/svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import * as workspaceIpc from '$lib/ipc/workspace';
import { configStore } from '$lib/state/config.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
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

function startEdit() {
	editMode = true;
	selectedWidgetId = null;
	editSnapshot = workspaceStore.widgets.map((w) => ({
		id: w.id,
		x: w.position_x,
		y: w.position_y,
		w: w.width,
		h: w.height,
	}));
}

function confirmEdit() {
	editMode = false;
	selectedWidgetId = null;
	editSnapshot = [];
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

function cancelEdit() {
	if (hasUnsavedChanges()) {
		cancelConfirmOpen = true;
		return;
	}
	editMode = false;
	selectedWidgetId = null;
	void doRestoreSnapshot();
}

function confirmCancel() {
	cancelConfirmOpen = false;
	editMode = false;
	selectedWidgetId = null;
	void doRestoreSnapshot();
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

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="min-w-0 flex-1 overflow-auto [scrollbar-gutter:stable] p-5 {editMode ? 'canvas-edit-mode' : ''}"
		style="--widget-w: {zoom.widgetW}px; --widget-h: {zoom.widgetH}px; background-image: {editMode
			? 'radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px), linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%)'
			: 'linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%)'}; background-size: {editMode
			? '24px 24px, 100% 100%'
			: '100% 100%'};"
		data-zoom={configStore.widgetZoom}
		bind:this={workspaceContainer}
		onpointerdown={onCanvasPointerDown}
		onpointermove={onCanvasPointerMove}
		onpointerup={onCanvasPointerUp}
	>
		<div class="mb-5" class:pointer-events-none={editMode} class:opacity-50={editMode}>
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
