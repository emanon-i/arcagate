<script lang="ts">
import { Pencil, Trash2, X } from '@lucide/svelte';
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType, WorkspaceWidget } from '$lib/types/workspace';
import FavoritesWidget from './FavoritesWidget.svelte';
import PageTabBar from './PageTabBar.svelte';
import ProjectsWidget from './ProjectsWidget.svelte';
import RecentLaunchesWidget from './RecentLaunchesWidget.svelte';
import WorkspaceEditorSidebar from './WorkspaceEditorSidebar.svelte';

const GRID_COLS = 4;
const MAX_SPAN = 4;

$effect(() => {
	void workspaceStore.loadWorkspaces();
});

let editMode = $state(false);
let dragOverCell = $state<{ x: number; y: number } | null>(null);
let resizingWidget = $state<string | null>(null);
let movingWidget = $state<string | null>(null);
let renameOpen = $state(false);
let renameValue = $state('');

function handleSelectWorkspace(id: string) {
	void workspaceStore.selectWorkspace(id);
}

function handleAddWidget(type: WidgetType) {
	void workspaceStore.addWidget(type);
}

function handleRenameWorkspace() {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (!ws) return;
	renameValue = ws.name;
	renameOpen = true;
}

function confirmRename() {
	const ws = workspaceStore.workspaces.find((w) => w.id === workspaceStore.activeWorkspaceId);
	if (ws && renameValue.trim() && renameValue !== ws.name) {
		void workspaceStore.updateWorkspace(ws.id, renameValue.trim());
	}
	renameOpen = false;
}

const workspaceMenuItems = [
	{ label: 'Favorites 追加', onclick: () => handleAddWidget('favorites') },
	{ label: 'Recent 追加', onclick: () => handleAddWidget('recent') },
	{ label: 'Projects 追加', onclick: () => handleAddWidget('projects') },
	{ label: '名前変更', onclick: handleRenameWorkspace },
];

const widgetComponents = {
	favorites: FavoritesWidget,
	recent: RecentLaunchesWidget,
	projects: ProjectsWidget,
} as const;

function handleDragOver(e: DragEvent, x: number, y: number) {
	e.preventDefault();
	dragOverCell = { x, y };
}

function handleDrop(e: DragEvent, x: number, y: number) {
	e.preventDefault();
	dragOverCell = null;
	const widgetType = e.dataTransfer?.getData('widget-type') as WidgetType | undefined;
	const moveId = e.dataTransfer?.getData('widget-move-id');

	if (moveId) {
		// L-5: 移動（store 経由で楽観更新 + 1回の IPC）
		void workspaceStore.moveWidget(moveId, x, y);
	} else if (widgetType && widgetType in widgetComponents) {
		// L-2: 新規追加
		void handleAddWidget(widgetType);
	}
	movingWidget = null;
}

function handleResizeStart(e: MouseEvent, widgetId: string) {
	e.preventDefault();
	resizingWidget = widgetId;
	const startX = e.clientX;
	const startY = e.clientY;
	const widget = workspaceStore.widgets.find((w) => w.id === widgetId);
	if (!widget) return;
	const startW = widget.width;
	const startH = widget.height;
	let rafId = 0;

	function onMove(ev: MouseEvent) {
		if (rafId) return; // rAF throttle: skip until previous frame renders
		rafId = requestAnimationFrame(() => {
			rafId = 0;
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;
			const cellSize = 200; // approximate
			const newW = Math.max(1, Math.min(MAX_SPAN, startW + Math.round(dx / cellSize)));
			const newH = Math.max(1, Math.min(MAX_SPAN, startH + Math.round(dy / cellSize)));
			workspaceStore.optimisticResize(widgetId, newW, newH);
		});
	}

	function onUp() {
		if (rafId) cancelAnimationFrame(rafId);
		resizingWidget = null;
		const w = workspaceStore.widgets.find((ww) => ww.id === widgetId);
		if (w) {
			void workspaceStore.resizeWidget(widgetId, w.width, w.height);
		}
		document.removeEventListener('mousemove', onMove);
		document.removeEventListener('mouseup', onUp);
	}

	document.addEventListener('mousemove', onMove);
	document.addEventListener('mouseup', onUp);
}

function handleWidgetDragStart(e: DragEvent, widgetId: string) {
	e.dataTransfer?.setData('widget-move-id', widgetId);
	movingWidget = widgetId;
}

// Compute grid rows needed
let maxRow = $derived(Math.max(3, ...workspaceStore.widgets.map((w) => w.position_y + w.height)));
</script>

<div class="bg-[linear-gradient(180deg,var(--ag-surface-0)_0%,var(--ag-surface-page)_100%)] p-5">
	<div class="mb-5 flex items-center gap-2">
		<div class="flex-1">
			<PageTabBar onSelectWorkspace={handleSelectWorkspace} />
		</div>
		<button
			type="button"
			class="rounded-lg border border-[var(--ag-border)] p-2 text-[var(--ag-text-muted)] transition-colors {editMode
				? 'bg-[var(--ag-accent)] text-white'
				: 'bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-4)]'}"
			aria-label={editMode ? '編集モード終了' : '編集モード'}
			onclick={() => { editMode = !editMode; }}
		>
			{#if editMode}
				<X class="h-4 w-4" />
			{:else}
				<Pencil class="h-4 w-4" />
			{/if}
		</button>
		<MoreMenu items={workspaceMenuItems} ariaLabel="ワークスペース操作メニュー" />
	</div>

	{#if !editMode}
		<div class="mb-4">
			<Tip tone="accent" tipId="workspace-home-tip">
				このページはホームです。よく使うものをまとめて配置できます。
			</Tip>
		</div>
	{/if}

	{#if editMode}
		<!-- 編集モード操作ガイド -->
		<div class="mb-4">
			<Tip tone="accent" tipId="workspace-edit-guide">
				ドラッグ&ドロップでウィジェットを移動、右下のハンドルでリサイズ、ゴミ箱アイコンで削除できます。
			</Tip>
		</div>

		<!-- L-1: Edit mode with sidebar -->
		<div class="flex gap-4">
			<WorkspaceEditorSidebar widgets={workspaceStore.widgets} onDragStart={() => {}} />

			<!-- L-3: Grid with overlay -->
			<div class="relative flex-1">
				<!-- Grid lines overlay -->
				<div
					class="pointer-events-none absolute inset-0 z-0"
					style="display: grid; grid-template-columns: repeat({GRID_COLS}, 1fr); grid-template-rows: repeat({maxRow}, minmax(120px, auto));"
				>
					{#each Array(GRID_COLS * maxRow) as _, i}
						<div class="border border-dashed border-[var(--ag-border)]/30"></div>
					{/each}
				</div>

				<!-- Widget grid -->
				<div
					class="relative z-10"
					style="display: grid; grid-template-columns: repeat({GRID_COLS}, 1fr); grid-auto-rows: minmax(120px, auto); gap: 16px;"
				>
					{#each workspaceStore.widgets as widget (widget.id)}
						{@const WidgetComp = widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
						{#if WidgetComp}
							<div
								class="relative"
								role="group"
								aria-label={widget.widget_type}
								style="grid-column: {widget.position_x + 1} / span {Math.min(widget.width, GRID_COLS - widget.position_x)}; grid-row: {widget.position_y + 1} / span {widget.height};"
								draggable="true"
								ondragstart={(e) => handleWidgetDragStart(e, widget.id)}
							>
								<WidgetComp {widget} />
								<!-- 削除ボタン -->
								<button
									type="button"
									class="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-white hover:bg-destructive"
									aria-label="ウィジェットを削除"
									onclick={() => void workspaceStore.removeWidget(widget.id)}
								>
									<Trash2 class="h-3 w-3" />
								</button>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<!-- L-4: Resize handle -->
								<div
									class="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm bg-[var(--ag-accent)]/30 hover:bg-[var(--ag-accent)]/60"
									aria-label="リサイズ"
									onmousedown={(e) => handleResizeStart(e, widget.id)}
								></div>
							</div>
						{/if}
					{/each}

					<!-- Drop zones for empty cells -->
					{#each Array(maxRow) as _, y}
						{#each Array(GRID_COLS) as _, x}
							{@const occupied = workspaceStore.widgets.some(
								(w) => x >= w.position_x && x < w.position_x + w.width && y >= w.position_y && y < w.position_y + w.height,
							)}
							{#if !occupied}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="rounded-lg border-2 border-dashed transition-colors {dragOverCell?.x === x && dragOverCell?.y === y
										? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/10'
										: 'border-transparent'}"
									style="grid-column: {x + 1}; grid-row: {y + 1};"
									ondragover={(e) => handleDragOver(e, x, y)}
									ondragleave={() => { dragOverCell = null; }}
									ondrop={(e) => handleDrop(e, x, y)}
								></div>
							{/if}
						{/each}
					{/each}
				</div>
			</div>
		</div>
	{:else if workspaceStore.widgets.length > 0}
		<!-- Normal view: CSS Grid layout -->
		<div
			style="display: grid; grid-template-columns: repeat({GRID_COLS}, 1fr); grid-auto-rows: minmax(120px, auto); gap: 16px;"
		>
			{#each workspaceStore.widgets as widget (widget.id)}
				{@const WidgetComp = widgetComponents[widget.widget_type as keyof typeof widgetComponents]}
				{#if WidgetComp}
					<div
						style="grid-column: {widget.position_x + 1} / span {Math.min(widget.width, GRID_COLS - widget.position_x)}; grid-row: {widget.position_y + 1} / span {widget.height};"
					>
						<WidgetComp {widget} />
					</div>
				{/if}
			{/each}
		</div>
	{:else if workspaceStore.workspaces.length === 0}
		<div class="flex items-center justify-center py-20">
			<p class="text-sm text-[var(--ag-text-muted)]">ワークスペースがまだありません</p>
		</div>
	{:else}
		<!-- Default layout when no widgets are configured -->
		<div class="grid gap-4 lg:grid-cols-12">
			<div class="space-y-4 lg:col-span-4">
				<FavoritesWidget />
			</div>
			<div class="space-y-4 lg:col-span-8">
				<RecentLaunchesWidget />
				<ProjectsWidget />
			</div>
		</div>
	{/if}
</div>

<!-- ワークスペース名変更ダイアログ -->
{#if renameOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) renameOpen = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') renameOpen = false; }}
	>
		<div class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]">
			<h3 class="mb-4 text-lg font-semibold text-[var(--ag-text-primary)]">ワークスペース名を変更</h3>
			<form onsubmit={(e) => { e.preventDefault(); confirmRename(); }}>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					type="text"
					class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
					bind:value={renameValue}
					placeholder="ワークスペース名"
					autofocus
				/>
				<div class="mt-4 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
						onclick={() => (renameOpen = false)}
					>
						キャンセル
					</button>
					<button
						type="submit"
						class="rounded-lg bg-[var(--ag-accent)] px-4 py-2 text-sm text-white hover:opacity-90"
					>
						変更
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
