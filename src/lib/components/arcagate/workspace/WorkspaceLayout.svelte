<script lang="ts">
import { LayoutGrid, Maximize2, Redo2, RotateCcw as ResetIcon, Undo2 } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import LibraryDetailPanel from '$lib/components/arcagate/library/LibraryDetailPanel.svelte';
import { configStore } from '$lib/state/config.svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { useWidgetZoom } from '$lib/state/widget-zoom.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
import { widgetRegistry } from '$lib/widgets';
import PageTabBar from './PageTabBar.svelte';
import WorkspaceDeleteConfirmDialog from './WorkspaceDeleteConfirmDialog.svelte';
import WorkspaceHintBar from './WorkspaceHintBar.svelte';
import WorkspaceRenameDialog from './WorkspaceRenameDialog.svelte';
import WorkspaceSidebar from './WorkspaceSidebar.svelte';
import WorkspaceWidgetGrid from './WorkspaceWidgetGrid.svelte';

/**
 * PH-issue-002: Obsidian Canvas 完全実装。
 *
 * 引用元 guideline:
 * - docs/l1_requirements/ux_standards.md §13 Workspace Canvas 編集 UX
 * - docs/l1_requirements/ux_design_vision.md §2-3 モーション 3 原則
 * - docs/desktop_ui_ux_agent_rules.md P5 (OS / Obsidian 慣習) / P2 (Undo) / P10 (熟練者効率)
 * - CLAUDE.md「設定変えたら即見た目が変わる、遅延反映は欠陥」
 *
 * 編集モード撤廃 + 即時保存 + Undo/Redo + Obsidian 入力マッピング全装備:
 * - 通常 wheel: 縦 scroll (ブラウザ標準)
 * - Shift + wheel: 横 scroll (useWidgetZoom 内 handler)
 * - 中ボタン drag: 自由 pan
 * - Space + 左 drag: 自由 pan
 * - Ctrl + wheel: zoom (useWidgetZoom)
 * - Ctrl + 0: zoom 100% リセット
 * - Ctrl + Shift + 1: Fit to content
 * - Ctrl + Z: Undo
 * - Ctrl + Shift + Z / Ctrl + Y: Redo
 * - Delete / Backspace: 選択 widget 削除確認
 * - Esc: 選択解除
 */

interface Props {
	onEditItem?: (id: string) => void;
}

let { onEditItem }: Props = $props();

const zoom = useWidgetZoom(() => workspaceContainer);

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

let selectedWidgetId = $state<string | null>(null);
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

// 中ボタン drag / Space + 左 drag (PH-issue-002)
let panActive = $state(false);
let panSpacePressed = $state(false);
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

function isEditableTarget(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

$effect(() => {
	function onKeyDown(e: KeyboardEvent) {
		if (e.code !== 'Space') return;
		if (isEditableTarget(e.target)) return;
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
	if (!workspaceContainer) return;
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

// keyboard: Delete/Backspace (削除) / Esc (選択解除) / Ctrl+Z/Y/0/Shift+1
$effect(() => {
	function onKeyDown(e: KeyboardEvent) {
		if (isEditableTarget(e.target)) return;
		// Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
		if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			void workspaceStore.undo();
			return;
		}
		if (
			(e.ctrlKey || e.metaKey) &&
			((e.shiftKey && e.key.toLowerCase() === 'z') || (!e.shiftKey && e.key.toLowerCase() === 'y'))
		) {
			e.preventDefault();
			void workspaceStore.redo();
			return;
		}
		// Ctrl+0: zoom 100% reset
		if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '0') {
			e.preventDefault();
			zoom.resetZoom();
			return;
		}
		// Ctrl+Shift+1: Fit to content
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '!') {
			// Shift+1 で '!' になる ASCII 環境向け
			e.preventDefault();
			zoom.fitToContent(workspaceStore.widgets);
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
			e.preventDefault();
			zoom.fitToContent(workspaceStore.widgets);
			return;
		}
		// Esc: 選択解除
		if (e.key === 'Escape' && selectedWidgetId && !deleteConfirmId && !renameOpen) {
			e.preventDefault();
			selectedWidgetId = null;
			return;
		}
		// Delete/Backspace: 選択 widget 削除確認
		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (selectedWidgetId && !deleteConfirmId && !renameOpen) {
				e.preventDefault();
				deleteConfirmId = selectedWidgetId;
			}
		}
	}
	window.addEventListener('keydown', onKeyDown);
	return () => window.removeEventListener('keydown', onKeyDown);
});

// ウィジェットが占める最大列数
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

const widgetComponents = Object.fromEntries(
	Object.entries(widgetRegistry).map(([type, meta]) => [type, meta.Component]),
);

function handleItemContext(itemId: string) {
	contextItemId = itemId;
}

let maxRow = $derived(Math.max(3, ...workspaceStore.widgets.map((w) => w.position_y + w.height)));
</script>

<!-- Pointer drag ghost -->
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
	<WorkspaceHintBar editMode={true} {selectedWidgetId} />

	<WorkspaceSidebar />

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- PH-issue-009: per-workspace 背景壁紙レイヤー (active workspace に wallpaper_path がある場合のみ可視)。
	     dotted grid + gradient は CSS 通常背景、wallpaper はその上に absolute layer で重ねる。
	     opacity / blur は CSS 変数経由、Reduced Motion 時は blur=0 へ。 -->
	<div
		class="canvas-edit-mode relative min-w-0 flex-1 overflow-auto p-5 [scrollbar-gutter:stable]"
		style="--widget-w: {zoom.widgetW}px; --widget-h: {zoom.widgetH}px; background-image: radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px), linear-gradient(180deg,var(--ag-surface-0) 0%,var(--ag-surface-page) 100%); background-size: 24px 24px, 100% 100%;"
		data-zoom={configStore.widgetZoom}
		bind:this={workspaceContainer}
		onpointerdown={onCanvasPointerDown}
		onpointermove={onCanvasPointerMove}
		onpointerup={onCanvasPointerUp}
	>
		{#if workspaceStore.activeWorkspace?.wallpaper_path}
			{@const ws = workspaceStore.activeWorkspace}
			{@const wpUrl = convertFileSrc(ws.wallpaper_path ?? '')}
			<div
				class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat motion-reduce:!filter-none"
				style="background-image: url('{wpUrl}'); opacity: {ws.wallpaper_opacity}; filter: blur({ws.wallpaper_blur}px);"
				aria-hidden="true"
				data-testid="workspace-wallpaper"
			></div>
		{/if}
		<div class="mb-5">
			<PageTabBar onSelectWorkspace={handleSelectWorkspace} onRenameActive={() => (renameOpen = true)} />
		</div>

		<div class="flex gap-4">
			<div class="min-w-0 flex-1">
				{#if workspaceStore.widgets.length === 0}
					<!-- 空状態: widget 追加促し (sidebar が常時開いてるので追加可能) -->
					<div class="mt-12 flex flex-col items-center justify-center gap-2 text-center">
						<LayoutGrid class="h-12 w-12 text-[var(--ag-text-faint)]" />
						<p class="text-sm font-medium text-[var(--ag-text-secondary)]">
							ウィジェットを追加しましょう
						</p>
						<p class="max-w-md text-xs text-[var(--ag-text-muted)]">
							左のサイドバーから widget を選んでドラッグ、もしくはクリックで追加できます。
						</p>
					</div>
				{:else}
					<WorkspaceWidgetGrid
						{dynamicCols}
						{maxRow}
						widgetW={zoom.widgetW}
						widgetH={zoom.widgetH}
						{widgetComponents}
						{selectedWidgetId}
						{deleteConfirmId}
						editMode={true}
						onItemContext={handleItemContext}
						onSelectedWidgetIdChange={(id) => (selectedWidgetId = id)}
						onDeleteConfirmIdChange={(id) => (deleteConfirmId = id)}
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

	<!-- 右下 floating toolbar (Undo / Redo / zoom% / Reset / Fit) -->
	<div
		class="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 shadow-[var(--ag-shadow-md,0_4px_12px_rgba(0,0,0,0.15))]"
		data-testid="canvas-toolbar"
	>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="元に戻す"
			disabled={!workspaceHistory.canUndo}
			onclick={() => void workspaceStore.undo()}
		>
			<Undo2 class="h-4 w-4" />
		</button>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="やり直し"
			disabled={!workspaceHistory.canRedo}
			onclick={() => void workspaceStore.redo()}
		>
			<Redo2 class="h-4 w-4" />
		</button>

		<div class="mx-1 h-5 w-px bg-[var(--ag-border)]"></div>

		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="拡大率を 100% にリセット"
			onclick={() => zoom.resetZoom()}
		>
			<ResetIcon class="h-4 w-4" />
		</button>
		<span
			class="px-1 text-xs tabular-nums text-[var(--ag-text-muted)]"
			data-testid="zoom-percent"
		>
			{configStore.widgetZoom}%
		</span>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="全体を表示"
			onclick={() => zoom.fitToContent(workspaceStore.widgets)}
		>
			<Maximize2 class="h-4 w-4" />
		</button>
	</div>
</div>

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
