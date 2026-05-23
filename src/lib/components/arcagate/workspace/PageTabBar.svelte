<script lang="ts">
import { Image as ImageIcon, Pencil, Trash2, X } from '@lucide/svelte';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { t } from '$lib/i18n.svelte';
import { listWidgets } from '$lib/ipc/workspace';
import { workspaceStore } from '$lib/state/workspace.svelte';
import WorkspaceDeleteConfirmDialog from './WorkspaceDeleteConfirmDialog.svelte';

interface Props {
	onSelectWorkspace?: (id: string) => void;
	onRenameActive?: () => void;
	onEditWallpaper?: () => void;
}

let { onSelectWorkspace, onRenameActive, onEditWallpaper }: Props = $props();

let isAdding = $state(false);
let newName = $state('');

function startAdd() {
	isAdding = true;
	newName = '';
}

function commitAdd() {
	if (!isAdding) return;
	const name = newName.trim();
	if (name) {
		void workspaceStore.createWorkspace(name);
	}
	isAdding = false;
	newName = '';
}

function cancelAdd() {
	isAdding = false;
	newName = '';
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		e.preventDefault();
		commitAdd();
	} else if (e.key === 'Escape') {
		e.preventDefault();
		cancelAdd();
	}
}

// PH-CF-300 E3/E6 (2026-05-23): タブ削除を専用 modal に置換。
// 旧実装は `window.confirm` で OK/Cancel のみ → E6 のチェックボックス (item も削除) を出せない、
// × ボタンが widget チップに被さる極小ターゲットで誤クリックを誘発していた。
//
// 削除フロー:
// 1. × クリック or 右クリックメニュー「削除」 → openDeleteDialog
// 2. modal 表示中に widget 数を IPC で取得 (best-effort、 失敗時 0 表示)
// 3. user が checkbox で「item も Library から消す」 を opt-in (default OFF)
// 4. confirm で `deleteWorkspace(id, deleteItems)` を呼ぶ
let deleteTarget = $state<{ id: string; name: string } | null>(null);
let deleteTargetWidgetCount = $state(0);

async function loadWidgetCount(workspaceId: string): Promise<number> {
	// 削除対象 page の widget 数。 active workspace なら store から即取得。 非 active は IPC で取得。
	if (workspaceId === workspaceStore.activeWorkspaceId) {
		return workspaceStore.widgets.length;
	}
	try {
		const widgets = await listWidgets(workspaceId);
		return widgets.length;
	} catch {
		// best-effort: IPC 失敗時は 0 表示で続行 (modal 自体は出す)
		return 0;
	}
}

async function openDeleteDialog(id: string, name: string): Promise<void> {
	if (workspaceStore.workspaces.length <= 1) return;
	deleteTarget = { id, name };
	// modal 表示中に widget 数を非同期取得。 表示優先で「modal は即出し、 数値は後埋め」。
	deleteTargetWidgetCount = await loadWidgetCount(id);
}

function closeDeleteDialog(): void {
	deleteTarget = null;
	deleteTargetWidgetCount = 0;
}

function confirmDelete(deleteItems: boolean): void {
	const target = deleteTarget;
	closeDeleteDialog();
	if (!target) return;
	void workspaceStore.deleteWorkspace(target.id, deleteItems);
}

function handleDelete(id: string, name: string, ev: MouseEvent): void {
	ev.stopPropagation();
	void openDeleteDialog(id, name);
}

// 2026-05-17 user 検収: タブ右クリックの専用コンテキストメニュー (名前を変更 / 削除)。
let tabMenu = $state<{
	open: boolean;
	x: number;
	y: number;
	id: string;
	name: string;
	canDelete: boolean;
}>({ open: false, x: 0, y: 0, id: '', name: '', canDelete: false });

function openTabMenu(ev: MouseEvent, ws: { id: string; name: string }): void {
	ev.preventDefault();
	tabMenu = {
		open: true,
		x: ev.clientX,
		y: ev.clientY,
		id: ws.id,
		name: ws.name,
		canDelete: workspaceStore.workspaces.length > 1,
	};
}

function closeTabMenu(): void {
	tabMenu = { ...tabMenu, open: false };
}

function renameFromMenu(): void {
	const id = tabMenu.id;
	closeTabMenu();
	// selectWorkspace は activeWorkspaceId を同期的に更新するため、 続けて rename を開けば
	// 対象 workspace 名で dialog が開く。
	onSelectWorkspace?.(id);
	onRenameActive?.();
}

function deleteFromMenu(): void {
	const { id, name } = tabMenu;
	closeTabMenu();
	void openDeleteDialog(id, name);
}
</script>

<!-- ページタブ + 壁紙設定を 1 つの frosted glass pill に内包する (2026-05-19 user 指示)。
     pill 自体が ag-glass (半透明 + backdrop-blur + 控えめ border + soft shadow) で、
     canvas / 壁紙が pill 越しにうっすら透ける。 個別 button は solid surface を持たず、
     active/inactive は text-color + 軽い accent tint のみで区別する (pill の色は変えない)。
     旧 solid chip 直置き方式は「色が濃すぎる」 user 報告で撤回。 -->
<div class="ag-glass inline-flex flex-wrap items-center gap-1 rounded-full p-1.5">
	{#each workspaceStore.workspaces as ws (ws.id)}
		{@const isActive = ws.id === workspaceStore.activeWorkspaceId}
		{@const canDelete = workspaceStore.workspaces.length > 1}
		<div class="group relative inline-flex">
			<button
				type="button"
				class="rounded-full text-xs transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {canDelete
					? 'pl-3.5 pr-9 py-1.5'
					: 'px-3.5 py-1.5'} {isActive
					? 'bg-[var(--ag-accent-bg)] font-medium text-[var(--ag-accent-text)]'
					: 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]'}"
				onclick={() => onSelectWorkspace?.(ws.id)}
				ondblclick={isActive ? () => onRenameActive?.() : undefined}
				oncontextmenu={(e) => openTabMenu(e, ws)}
				data-testid="workspace-tab-{ws.id}"
			>
				{ws.name}
			</button>
			{#if canDelete}
				<!-- PH-CF-300 E3 (2026-05-23): hit area を拡大 (旧 p-0.5 = 16px → p-1.5 = 28px square)、
				     ボタンを 1.5px 右へ寄せて widget チップとの被りを避ける。 icon は視覚的に同サイズ
				     (h-3 w-3) のまま、 透明 padding でクリック判定だけ広げる。 -->
				<button
					type="button"
					class="absolute right-0.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full p-1.5 text-[var(--ag-text-muted)] opacity-0 transition-[opacity,color,background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none group-hover:opacity-100 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-error-text)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					aria-label={t('workspace.tab.delete_label', { name: ws.name })}
					title={t('common.delete')}
					onclick={(e) => handleDelete(ws.id, ws.name, e)}
					data-testid="workspace-tab-{ws.id}-delete"
				>
					<X class="h-3 w-3" />
				</button>
			{/if}
		</div>
	{/each}
	{#if isAdding}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			class="w-24 rounded-full border border-[var(--ag-accent-border)] bg-[var(--ag-surface-2)] px-3 py-1 text-xs text-[var(--ag-text-primary)] outline-none placeholder:text-[var(--ag-text-muted)]"
			placeholder={t('workspace.tab.name_placeholder')}
			autocomplete="off"
			bind:value={newName}
			onkeydown={handleKeydown}
			onblur={commitAdd}
			autofocus
		/>
	{:else}
		<!-- pill 内: solid surface 無し。 dashed border のみ「追加」 affordance として維持。 -->
		<button
			type="button"
			class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)] transition-[color,border-color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-accent-border)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			onclick={startAdd}
		>
			{t('workspace.tab.add_page')}
		</button>
	{/if}
	<!-- PH-issue-009 Phase B: 壁紙設定 (active workspace 用)。
	     ghost-icon、active workspace がある時のみ可視 -->
	{#if onEditWallpaper && workspaceStore.activeWorkspaceId}
		<button
			type="button"
			class="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-[var(--ag-text-muted)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label={t('workspace.wallpaper_set')}
			onclick={() => onEditWallpaper()}
		>
			<ImageIcon class="h-3.5 w-3.5" />
			{t('workspace.tab.wallpaper')}
		</button>
	{/if}
</div>

<ContextMenu open={tabMenu.open} x={tabMenu.x} y={tabMenu.y} onClose={closeTabMenu}>
	<button
		type="button"
		role="menuitem"
		class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:bg-[var(--ag-surface-3)] focus-visible:outline-none hover:bg-[var(--ag-surface-3)]"
		data-testid="tab-context-rename"
		onclick={renameFromMenu}
	>
		<Pencil class="h-3.5 w-3.5" />
		{t('context_menu.rename')}
	</button>
	{#if tabMenu.canDelete}
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-destructive focus-visible:bg-destructive/10 focus-visible:outline-none hover:bg-destructive/10"
			data-testid="tab-context-delete"
			onclick={deleteFromMenu}
		>
			<Trash2 class="h-3.5 w-3.5" />
			{t('common.delete')}
		</button>
	{/if}
</ContextMenu>

<!-- PH-CF-300: タブ削除専用 modal (E3 + E6)。 deleteTarget が null なら閉、 非 null で開。 -->
<WorkspaceDeleteConfirmDialog
	workspace={deleteTarget}
	widgetCount={deleteTargetWidgetCount}
	onConfirm={confirmDelete}
	onCancel={closeDeleteDialog}
/>
