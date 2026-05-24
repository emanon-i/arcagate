<script lang="ts">
import { HelpCircle, X } from '@lucide/svelte';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { onDestroy, onMount, tick } from 'svelte';
import TitleAction from '$lib/components/arcagate/common/TitleAction.svelte';
import TitleBar from '$lib/components/arcagate/common/TitleBar.svelte';
import TitleTab from '$lib/components/arcagate/common/TitleTab.svelte';
import ToastContainer from '$lib/components/arcagate/common/ToastContainer.svelte';
import LibraryLayout from '$lib/components/arcagate/library/LibraryLayout.svelte';
import WorkspaceLayout from '$lib/components/arcagate/workspace/WorkspaceLayout.svelte';
import ErrorBoundary from '$lib/components/common/ErrorBoundary.svelte';
import ThreeOptionDialog from '$lib/components/common/ThreeOptionDialog.svelte';
import HelpPanel from '$lib/components/help/HelpPanel.svelte';
import ItemFormDialog from '$lib/components/item/ItemFormDialog.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import OnboardingTour from '$lib/components/setup/OnboardingTour.svelte';
import SetupWizard from '$lib/components/setup/SetupWizard.svelte';
import { t } from '$lib/i18n.svelte';
import { NAV_TOP } from '$lib/nav-items';
import { configStore } from '$lib/state/config.svelte';
import { helpStore } from '$lib/state/help.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { startUpdaterAutoCheck } from '$lib/state/updater.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { workspaceDropCoords } from '$lib/state/workspace-drop-coords.svelte';
import { workspaceSelection } from '$lib/state/workspace-selection.svelte';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';
import { getErrorMessage } from '$lib/utils/format-error';
import { loadString, saveString } from '$lib/utils/local-storage';
import { markStartupFe } from '$lib/utils/perf';

type ActiveView = 'library' | 'workspace';

// activeView は localStorage で永続化 (safe helper 経由で quota / SecurityError 握り潰し)。
const VIEW_KEY = 'arcagate.app.activeView';
const initialView = loadString(VIEW_KEY, 'library');
let activeView = $state<ActiveView>(initialView === 'workspace' ? 'workspace' : 'library');
$effect(() => {
	saveString(VIEW_KEY, activeView);
});
let editingItem = $state<Item | null>(null);
let showItemForm = $state(false);
let droppedPaths = $state<string[] | undefined>(undefined);
// U-1: URL D&D で WebView に drop されたとき設定。 ItemFormDialog の initialUrl に流す。
let droppedUrl = $state<string | undefined>(undefined);
let isDraggingOver = $state(false);
let showSettings = $state(false);

// PH-CF-900 A1: +page.svelte mount = root component (LibraryLayout / WorkspaceLayout) を
// render する起動段階の起点。 `onMount` は SvelteKit の初回 hydration 後に走るため、
// layout_mount → page_mount の gap が 「Svelte が page tree を mount するまでの時間」 になる。
onMount(() => {
	markStartupFe('page_mount');
	// 起動時 IPC バッチが完了したタイミング (= 初回 paint 直前) を計測。 `Promise.all` で
	// 全 fetch が settle してから 1 micro-task 待ち、 DOM 反映が走った後に mark を打つ。
	Promise.allSettled([
		configStore.loadConfig(),
		itemStore.loadItems(),
		itemStore.loadTags(),
		itemStore.loadLibraryStats(),
		themeStore.loadTheme(),
	])
		.then(() => tick())
		.then(() => markStartupFe('init_ipc_done'));
	// main paint は requestAnimationFrame 2 段で「次フレームが commit された時点」 を取る
	// (LibraryLayout の初回 paint と一致するよう、 layout/paint の確定を待つ)。
	requestAnimationFrame(() => {
		requestAnimationFrame(() => markStartupFe('main_paint'));
	});
});

// 初期化 (旧 `$effect` を残し、 svelte の reactive 再評価で起動時 IPC が走る経路は維持)。
// `onMount` の `Promise.allSettled` は計測目的のみで、 実際の load 動作は store 側で
// idempotent (重複 fetch は no-op or 結果上書きの best-effort) のため計測 fetch と
// 共存する。 旧 effect を消すと SSR 経路 / HMR で抜けるケースがあるため保持。
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

// PH-PQ-200 T6: Settings →「セットアップを再実行」 で setupComplete が false に戻ったら
// Settings dialog を閉じ、 SetupWizard overlay を確実に前面へ出す。
$effect(() => {
	if (!configStore.setupComplete && showSettings) showSettings = false;
});

// Updater 自動チェック (起動時 + 24h)
$effect(() => {
	startUpdaterAutoCheck();
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
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
const TEXT_EXTS = ['md', 'txt', 'markdown', 'log', 'json', 'yaml', 'yml', 'toml', 'csv'];

function pickExtension(path: string): string | undefined {
	const m = path.match(/\.([^./\\]+)$/);
	return m ? m[1].toLowerCase() : undefined;
}

// Fix B (2026-05-12): D&D 重複検出 3 択 dialog 用 state。
// 同一 source ファイルを D&D した時に existing widget を focus できるよう source path を比較。
let dupDialogOpen = $state(false);
let dupDialogTitle = $state('');
let dupDialogMessage = $state('');
let dupExistingWidgetId = $state<string | null>(null);
let dupPendingAction = $state<(() => Promise<void>) | null>(null);

function focusExistingWidget(widgetId: string): void {
	// workspace-selection で widget を選択状態にする (highlight + scroll target)。
	// 完全な viewport scroll は Ctrl+Shift+1 で実行可能と toast で案内。
	workspaceSelection.setSingle(widgetId);
	toastStore.add(t('toast.widget_existed_selected'), 'info');
}

/**
 * Fix B: active workspace 内の同 widget type で source path が一致する widget を返す。
 * - image_scrap: config.source_path (新規追加 field) で比較
 * - file_preview: config.path 直接比較
 */
function findExistingMatch(
	widgetType: 'image_scrap' | 'file_preview',
	sourcePath: string,
): { id: string; type: string } | null {
	const widgets = workspaceStore.widgets;
	for (const w of widgets) {
		if (w.widget_type !== widgetType) continue;
		if (!w.config) continue;
		try {
			const cfg = JSON.parse(w.config) as { path?: string; source_path?: string };
			const cmp = widgetType === 'image_scrap' ? cfg.source_path : cfg.path;
			if (cmp === sourcePath) return { id: w.id, type: w.widget_type };
		} catch {
			// invalid JSON skip
		}
	}
	return null;
}

/**
 * PH-CF-200: OS ファイルドロップ → workspace widget 配置の共通 opts を構築する。
 *
 * `tauri://drag-drop` payload の `position: PhysicalPosition` を受け取り、
 * - drop zone 内の座標なら → そこを `dropCell` に
 * - drop zone 外 (sidebar 上等) なら → `dropCell` 不明、 `viewportCenterCell` に fallback
 * - 非同期処理中のタブ切替を防ぐため、 caller が drop 開始時に snapshot した `workspaceId` を渡す
 *   (drop handler が `tauri://drag-drop` 受信直後に pinned workspace を読み出して保持しておく)
 */
function buildDropOpts(
	position: { x: number; y: number } | null,
	workspaceId: string | undefined,
): {
	dropCell: { x: number; y: number } | null;
	viewportCenterCell: { x: number; y: number } | null;
	cols: number | undefined;
	workspaceId: string | undefined;
} {
	const dropCell = position ? workspaceDropCoords.cellFromPhysicalPosition(position) : null;
	const viewportCenterCell = workspaceDropCoords.getViewportCenterCell();
	const cols = workspaceDropCoords.dynamicCols || undefined;
	return { dropCell, viewportCenterCell, cols, workspaceId };
}

async function addImageScrapWidget(
	sourcePath: string,
	position: { x: number; y: number } | null,
	workspaceId: string | undefined,
): Promise<void> {
	const { invoke } = await import('@tauri-apps/api/core');
	const opts = buildDropOpts(position, workspaceId);
	// 画像 file の copy が時間を食う可能性あり (大画像 / cold disk) — addWidget の前に await。
	// workspaceId は caller (drop handler / dup dialog callback) が snapshot 済なので、
	// await 中にタブ切替されても opts は変わらない。
	const saved = await invoke<string>('cmd_save_image_scrap', { sourcePath });
	await workspaceStore.addWidget('image_scrap', opts);
	// 直近で追加した widget を見つけて config を更新する。 タブ切替で widgets 配列が別 workspace
	// のものに差し替わっているケースを考慮し、 pin した workspace と active が一致する時のみ
	// フロント state から最新 widget を探す (一致しない場合は IPC `cmd_list_widgets` で取得しない:
	// 復元は次回そちらのタブに切り替えた時の `loadWidgets` に委ねる)。
	if (opts.workspaceId && opts.workspaceId === workspaceStore.activeWorkspaceId) {
		const widgets = workspaceStore.widgets;
		const last = widgets[widgets.length - 1];
		if (last && last.widget_type === 'image_scrap') {
			await workspaceStore.updateWidgetConfig(
				last.id,
				JSON.stringify({ path: saved, source_path: sourcePath }),
			);
		}
	}
	toastStore.add(t('toast.image_widget_placed'), 'success');
}

async function addFilePreviewWidget(
	path: string,
	position: { x: number; y: number } | null,
	workspaceId: string | undefined,
): Promise<void> {
	const opts = buildDropOpts(position, workspaceId);
	await workspaceStore.addWidget('file_preview', opts);
	if (opts.workspaceId && opts.workspaceId === workspaceStore.activeWorkspaceId) {
		const widgets = workspaceStore.widgets;
		const last = widgets[widgets.length - 1];
		if (last && last.widget_type === 'file_preview') {
			await workspaceStore.updateWidgetConfig(last.id, JSON.stringify({ path }));
		}
	}
	toastStore.add(t('toast.file_preview_widget_placed'), 'success');
}

// PH-CF-200: Tauri v2.11 の `DragDropEvent` payload は `position: PhysicalPosition` を持つ
// (旧 +page.svelte:272 コメントの「座標を持たない」 は API 進化前の前提で誤り、 修正済)。
// `position` は device pixel なので `workspaceDropCoords.cellFromPhysicalPosition` 内で DPR 除算。
// 配置先 workspace の pin は `tauri://drag-enter` で snapshot、 drop / leave で clear する。
let unlistenDragDrop: (() => void) | null = null;
listen<{ paths: string[]; position: { x: number; y: number } }>(
	'tauri://drag-drop',
	async (event) => {
		isDraggingOver = false;
		const paths = event.payload.paths ?? [];
		const position = event.payload.position ?? null;
		// drop 処理は pin した workspace に対して行う (非同期 cmd_save_image_scrap 等の await 中に
		// user がタブ切替しても、 widget はドロップ開始時の workspace に配置される)。
		const dropWorkspaceId =
			workspaceDropCoords.pinnedWorkspaceId ?? workspaceStore.activeWorkspaceId;
		// 終了処理は早期に: pin を解除しないと次のドロップで stale pin になる。
		workspaceDropCoords.clearPin();
		if (paths.length === 0) return;

		// U-5 / U-6 (2026-05-12): Workspace タブで画像 / テキストファイルを D&D された場合、
		// 対応する widget を生成。 残りは Library tab に従来通り。
		// Fix B (2026-05-12): 同一 source の widget が既に存在するなら 3 択 dialog で
		// focus 既存 / 別 widget として追加 / キャンセル を user に選ばせる。
		// PH-CF-200: 「workspace タブで dropped か」 は **ドロップ開始時の workspace に何か pin
		// されているか** で判定。 activeView は user が drop 中にタブ切替したら変わってしまうが、
		// pinned workspace は workspaces tab (= activeView=workspace) でしか pin されない。
		if (activeView === 'workspace' || dropWorkspaceId) {
			const path = paths[0];
			const ext = pickExtension(path);
			const pinnedWs = dropWorkspaceId ?? undefined;
			if (ext && IMAGE_EXTS.includes(ext)) {
				const existing = findExistingMatch('image_scrap', path);
				if (existing) {
					dupDialogTitle = t('dialog.dup_image_title');
					dupDialogMessage = t('dialog.dup_image_message');
					dupExistingWidgetId = existing.id;
					dupPendingAction = () => addImageScrapWidget(path, position, pinnedWs);
					dupDialogOpen = true;
					return;
				}
				try {
					await addImageScrapWidget(path, position, pinnedWs);
				} catch (e) {
					toastStore.add(t('toast.placement_failed', { error: getErrorMessage(e) }), 'error');
				}
				return;
			}
			if (ext && TEXT_EXTS.includes(ext)) {
				const existing = findExistingMatch('file_preview', path);
				if (existing) {
					dupDialogTitle = t('dialog.dup_file_title');
					dupDialogMessage = t('dialog.dup_file_message');
					dupExistingWidgetId = existing.id;
					dupPendingAction = () => addFilePreviewWidget(path, position, pinnedWs);
					dupDialogOpen = true;
					return;
				}
				try {
					await addFilePreviewWidget(path, position, pinnedWs);
				} catch (e) {
					toastStore.add(
						t('toast.preview_placement_failed', { error: getErrorMessage(e) }),
						'error',
					);
				}
				return;
			}
			// それ以外の file は Workspace では扱わない (Library タブに行ってもらう)
			if (activeView === 'workspace') return;
			// dropWorkspaceId だけ pin されていて activeView=library のケースは下の library 経路へ。
		}

		if (activeView === 'library' && !showItemForm && paths.length > 0) {
			droppedPaths = paths;
			editingItem = null;
			showItemForm = true;
		}
	},
).then((fn) => {
	unlistenDragDrop = fn;
});

// PH-CF-200: drag-enter で「現在 active な workspace id」 を pin。 これにより非同期 drop 処理中に
// user がタブを切り替えても、 widget はドロップ開始時の workspace に配置される (Codex review)。
// activeView=workspace 時にだけ pin する (library タブで drag-enter しても pin 不要)。
let unlistenDragEnter: (() => void) | null = null;
listen<{ paths: string[]; position: { x: number; y: number } }>('tauri://drag-enter', () => {
	if (activeView !== 'workspace') return;
	const wsId = workspaceStore.activeWorkspaceId;
	if (wsId) workspaceDropCoords.pin(wsId);
}).then((fn) => {
	unlistenDragEnter = fn;
});

function handleDupPrimary(): void {
	// default action: 既存 widget を選択
	if (dupExistingWidgetId) focusExistingWidget(dupExistingWidgetId);
	dupDialogOpen = false;
	dupPendingAction = null;
	dupExistingWidgetId = null;
}

async function handleDupSecondary(): Promise<void> {
	// 別 widget として追加
	const action = dupPendingAction;
	dupDialogOpen = false;
	dupPendingAction = null;
	dupExistingWidgetId = null;
	if (action) {
		try {
			await action();
		} catch (e) {
			toastStore.add(t('toast.widget_add_failed', { error: getErrorMessage(e) }), 'error');
		}
	}
}

function handleDupCancel(): void {
	dupDialogOpen = false;
	dupPendingAction = null;
	dupExistingWidgetId = null;
}

let unlistenDragOver: (() => void) | null = null;
listen('tauri://drag-over', () => {
	if ((activeView === 'library' && !showItemForm) || activeView === 'workspace') {
		isDraggingOver = true;
	}
}).then((fn) => {
	unlistenDragOver = fn;
});

let unlistenDragLeave: (() => void) | null = null;
listen('tauri://drag-leave', () => {
	isDraggingOver = false;
	// PH-CF-200: drag-leave で pin を解除 (user が canvas 外で release した場合の clean up)。
	// drag-drop が後続する場合はそちらが先に pin を読み取り消費するので、 leave 由来 clear が
	// drop 由来 clear を override しても問題ない (どちらも null になるだけ)。
	workspaceDropCoords.clearPin();
}).then((fn) => {
	unlistenDragLeave = fn;
});

// U-1 (2026-05-12): Web ブラウザ等から URL を D&D した時の handler。
// Tauri の `tauri://drag-drop` は OS file の paths + position (PhysicalPosition) を運ぶが、
// URL D&D (text/uri-list / text/plain) は webview の HTML5 drop event 経由でしか取れない。
// window-level の `drop` で text/uri-list を捕捉して ItemFormDialog を URL prefill で開く。
function extractUrlFromDataTransfer(dt: DataTransfer | null): string | null {
	if (!dt) return null;
	// text/uri-list は 1 行 1 URL、 comment 行 (#〜) を除外して最初の URL を採用
	const uriList = dt.getData('text/uri-list');
	if (uriList) {
		const first = uriList
			.split(/\r?\n/)
			.map((l) => l.trim())
			.find((l) => l && !l.startsWith('#') && /^https?:\/\//i.test(l));
		if (first) return first;
	}
	// fallback: text/plain が URL 形式なら採用
	const plain = dt.getData('text/plain').trim();
	if (/^https?:\/\//i.test(plain)) return plain;
	return null;
}

function handleHtmlDrop(e: DragEvent) {
	// 既に file D&D 処理中 / form 開いてる場合は skip
	if (showItemForm || activeView !== 'library') return;
	const url = extractUrlFromDataTransfer(e.dataTransfer);
	if (!url) return; // file drop は Tauri 側で別途処理
	e.preventDefault();
	e.stopPropagation();
	isDraggingOver = false;
	droppedUrl = url;
	droppedPaths = undefined;
	editingItem = null;
	showItemForm = true;
}

function handleHtmlDragOver(e: DragEvent) {
	if (activeView !== 'library' || showItemForm) return;
	// URL D&D の場合のみ preventDefault して drop を有効化
	const types = e.dataTransfer?.types;
	if (!types) return;
	if (types.includes('text/uri-list') || types.includes('text/plain')) {
		e.preventDefault();
	}
}

$effect(() => {
	window.addEventListener('drop', handleHtmlDrop);
	window.addEventListener('dragover', handleHtmlDragOver);
	return () => {
		window.removeEventListener('drop', handleHtmlDrop);
		window.removeEventListener('dragover', handleHtmlDragOver);
	};
});

// パス消失イベントリスナー
let unlistenPathNotFound: (() => void) | null = null;
listen<string>('item://path-not-found', (e) => {
	toastStore.add(t('toast.path_not_found', { path: String(e.payload) }), 'error');
}).then((fn) => {
	unlistenPathNotFound = fn;
});

onDestroy(() => {
	unlistenDragDrop?.();
	unlistenDragOver?.();
	unlistenDragLeave?.();
	unlistenDragEnter?.();
	unlistenPathNotFound?.();
});

// グローバルキーボードハンドラ: `?` でヘルプ開閉 (input フォーカス中は無視)
function handleGlobalKey(e: KeyboardEvent) {
	// Escape: Settings dialog を閉じる (refactor/escape-key-fix で統合)。
	// modal div の onkeydown は trigger button から focus が移動しないため発火しない
	// → window listener で root-cause fix。
	if (e.key === 'Escape' && showSettings) {
		showSettings = false;
		return;
	}
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
		toastStore.add(t('toast.item_updated'), 'success');
	} else {
		await itemStore.createItem(input as CreateItemInput);
		toastStore.add(t('toast.item_created'), 'success');
	}
	showItemForm = false;
	editingItem = null;
	droppedPaths = undefined;
	droppedUrl = undefined;
}

function handleFormClose() {
	showItemForm = false;
	editingItem = null;
	droppedPaths = undefined;
	droppedUrl = undefined;
}
</script>

<svelte:window on:keydown={handleGlobalKey} />

<!-- オーバーレイ層 -->
<SetupWizard />
<OnboardingTour />
<HelpPanel />
<ItemFormDialog
	open={showItemForm}
	item={editingItem ?? undefined}
	initialPaths={droppedPaths}
	initialUrl={droppedUrl}
	tags={itemStore.tags}
	onSubmit={handleFormSubmit}
	onClose={handleFormClose}
/>

<!-- Fix B (2026-05-12): image-scrap / file-preview の同一ファイル D&D 重複検出 dialog。
     既存 widget が見つかったとき 「既存を選択 / 別 widget として追加 / キャンセル」 の 3 択。 -->
<ThreeOptionDialog
	open={dupDialogOpen}
	title={dupDialogTitle}
	message={dupDialogMessage}
	primaryLabel={t('dialog.dup_select_existing')}
	onPrimary={handleDupPrimary}
	secondaryLabel={t('dialog.dup_add_new')}
	onSecondary={() => void handleDupSecondary()}
	onClose={handleDupCancel}
/>

<!-- Settings ダイアログ -->
{#if showSettings}
	<!-- Escape: 上記 handleGlobalKey で root-cause fix (refactor/escape-key-fix)。 -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)]"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showSettings = false; }}
	>
		<div class="ag-glass relative flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] shadow-[var(--ag-shadow-dialog)]">
			<div class="flex shrink-0 items-center justify-between border-b border-[var(--ag-border)] px-5 py-3">
				<h2 class="text-base font-semibold text-[var(--ag-text-primary)]">{t('nav.settings')}</h2>
				<button
					type="button"
					class="rounded-lg p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)]"
					aria-label={t('dialog.settings_close_aria')}
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
	<div class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[var(--scrim)]">
		<div class="rounded-lg border-2 border-dashed border-[var(--ag-accent)] bg-[var(--ag-surface-1)] px-8 py-6 text-center shadow-[var(--ag-shadow-md)]">
			<p class="text-lg font-medium text-[var(--ag-text-primary)]">{t('common.drop_to_register')}</p>
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
				label={t('nav.help')}
				onclick={() => helpStore.open()}
			/>
			<TitleAction
				icon={NAV_TOP.palette.icon}
				label={NAV_TOP.palette.label}
				tone="accent"
				dataTour="palette"
				onclick={openFloatingPalette}
			/>
		{/snippet}
		{#snippet centerSlot()}
			<div class="flex items-center gap-2">
				<TitleTab
					icon={NAV_TOP.library.icon}
					label={NAV_TOP.library.label}
					active={activeView === "library"}
					dataTour="library"
					onclick={() => (activeView = "library")}
				/>
				<TitleTab
					icon={NAV_TOP.workspace.icon}
					label={NAV_TOP.workspace.label}
					active={activeView === "workspace"}
					dataTour="workspace"
					onclick={() => (activeView = "workspace")}
				/>
			</div>
		{/snippet}
	</TitleBar>

	<!-- メインコンテンツ (ErrorBoundary で横断耐障害性) -->
	<main class="min-h-0 flex-1 overflow-hidden">
		<ErrorBoundary>
			{#snippet children()}
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
			{/snippet}
		</ErrorBoundary>
	</main>
</div>
