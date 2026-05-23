<script lang="ts">
import { Image as ImageIcon, Pencil, Trash2, X } from '@lucide/svelte';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { t } from '$lib/i18n.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';

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

// K-5 fix (2026-05-15): user 報告「workspace スロット (名前つけるとこ) 消せなかった」。
// 旧実装は workspace 削除 UI が一切無く、 user 作成 tab を消す方法がなかった。
// 修正: hover で × icon を表示、 click で confirm → deleteWorkspace。 1 件しか
// 残っていない場合 (= default だけ) は × を非表示にして「最後の workspace は消せない」
// 安全弁を備える (user 仕様: 「Home 等のデフォルト workspace は削除不可で OK」)。
function deleteWorkspace(id: string, name: string): void {
	if (workspaceStore.workspaces.length <= 1) return;
	// 2026-05-17 bug fix 連動: workspace 削除で widget 経由登録 item も Library から消えるため
	// confirm 文言でも明示する。
	// PH-CF-100: deleteItems=true で「タブ削除時に item も消す」 現状挙動を維持。
	// E6 (PH-CF-300) の confirm modal が user 選択 (アイテムを残す/消す) を受け取れるよう、
	// 引数経路だけここで bool 必須化しておく (PH-CF-300 でこの値が UI から渡る)。
	if (!window.confirm(t('workspace.tab.delete_confirm', { name }))) return;
	void workspaceStore.deleteWorkspace(id, true);
}

function handleDelete(id: string, name: string, ev: MouseEvent): void {
	ev.stopPropagation();
	deleteWorkspace(id, name);
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
	deleteWorkspace(id, name);
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
					? 'pl-3.5 pr-7 py-1.5'
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
				<!-- K-5: hover で × 表示。 active / inactive 問わず削除可、 confirm 経由。 -->
				<button
					type="button"
					class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--ag-text-muted)] opacity-0 transition-[opacity,color,background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none group-hover:opacity-100 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-error-text)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
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
