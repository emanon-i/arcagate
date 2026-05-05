<script lang="ts">
/**
 * 5/03 user 検収 (C): ItemWidget 全面再構築。
 *
 * 旧実装: `item_id` (単一) のみ、icon 1 個だけの大きな card → user fb「アイコン一つだけ出てなんなの？」
 *         「幅デカすぎ」「サイズ変えたら見切れる」「複数追加できるようにして」「縦に並べるのもいる」「並び替えもいる」。
 * 新実装:
 * - config に `item_ids: string[]` を追加 (collection)。legacy `item_id` も読んで [item_id] に変換、後方互換。
 * - view_mode: 'grid' | 'list' で切替 (toolbar の icon button)。
 * - sort_field: 'manual' | 'name' | 'recent' (settings dialog で選択)。
 * - container query で widget 幅に応じて grid 列数 / icon サイズ / 余白を自動調整 (見切れ解消)。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P3 主要 vs 補助 / P4 一貫性 / P9 画面密度
 * - docs/l1_requirements/ux_standards.md §6-1 Widget fluid sizing / §11 アイテムカード
 * - CLAUDE.md「同じ機能 = 同じ icon + 同じラベル」
 */
import { Grid3x3, LayoutList, Package, Plus } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { updateWidgetConfig } from '$lib/ipc/workspace';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget, onItemContext }: Props = $props();

let settingsOpen = $state(false);
let pickerOpen = $state(false);

interface ItemWidgetConfig {
	item_id?: string | null;
	item_ids?: string[];
	view_mode?: 'grid' | 'list';
	sort_field?: 'manual' | 'name' | 'recent';
}

let config = $derived.by<ItemWidgetConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as ItemWidgetConfig;
	} catch {
		return {};
	}
});

// legacy item_id → [item_id] 後方互換。新 collection は item_ids を優先、無ければ item_id 1 個。
let itemIds = $derived.by<string[]>(() => {
	if (config.item_ids && config.item_ids.length > 0) return config.item_ids;
	if (config.item_id) return [config.item_id];
	return [];
});

let viewMode = $derived<'grid' | 'list'>(config.view_mode ?? 'grid');
let sortField = $derived<'manual' | 'name' | 'recent'>(config.sort_field ?? 'manual');

let pinnedItems = $derived.by<Item[]>(() => {
	const list = itemIds
		.map((id) => itemStore.items.find((i) => i.id === id))
		.filter((i): i is Item => i !== undefined);
	if (sortField === 'name') {
		return [...list].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
	}
	// 'manual' / 'recent' は元順序維持 ('recent' は将来 launch_log と連携予定、未対応時は manual と同等)。
	return list;
});

async function persistConfig(next: ItemWidgetConfig) {
	if (!widget) return;
	try {
		await updateWidgetConfig(widget.id, JSON.stringify(next));
	} catch (e: unknown) {
		toastStore.add(`設定保存失敗: ${String(e)}`, 'error');
	}
}

async function setViewMode(mode: 'grid' | 'list') {
	await persistConfig({ ...config, view_mode: mode });
}

async function handleLaunch(item: Item) {
	void launchItem(item.id)
		.then(() => toastStore.add(`${item.label} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(item.label, e), 'error'));
}

// I2 fix: 空状態から「設定 dialog → 同じ button もう 1 回 → picker」 の 2 step UX を排除し、
// 空状態 click で picker を直接開いて 1 step で紐付けできるようにする。
async function pickerSelectMany(items: Item[]) {
	pickerOpen = false;
	if (items.length === 0 || !widget) return;
	const existing = new Set(itemIds);
	const next = [...itemIds];
	for (const it of items) if (!existing.has(it.id)) next.push(it.id);
	const nextConfig: ItemWidgetConfig = { ...config, item_ids: next, item_id: null };
	try {
		await updateWidgetConfig(widget.id, JSON.stringify(nextConfig));
		const added = items.length;
		toastStore.add(`${added} 件のアイテムを紐付けました`, 'success');
	} catch (e: unknown) {
		toastStore.add(`設定保存失敗: ${String(e)}`, 'error');
	}
}

async function pickerSelectSingle(item: Item) {
	pickerOpen = false;
	if (!widget) return;
	const existing = new Set(itemIds);
	if (existing.has(item.id)) return;
	const nextConfig: ItemWidgetConfig = {
		...config,
		item_ids: [...itemIds, item.id],
		item_id: null,
	};
	try {
		await updateWidgetConfig(widget.id, JSON.stringify(nextConfig));
		toastStore.add(`${item.label} を紐付けました`, 'success');
	} catch (e: unknown) {
		toastStore.add(`設定保存失敗: ${String(e)}`, 'error');
	}
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

let title = $derived(
	pinnedItems.length === 1 ? pinnedItems[0].label : (WIDGET_LABELS.item ?? 'アイテム'),
);
</script>

<WidgetShell {title} icon={Package} {menuItems}>
	{#if pinnedItems.length === 0}
		<!-- I2 fix: 空状態 click で picker を直接開く (旧: settings dialog → 同 button → picker の 2 step UX を排除)。 -->
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-6 text-[var(--ag-text-muted)] transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-accent)] hover:bg-[var(--ag-accent-bg)]/50 hover:text-[var(--ag-accent-text)]"
			aria-label="このウィジェットにアイテムを紐付け"
			onclick={() => (pickerOpen = true)}
		>
			<Plus class="h-6 w-6" />
			<span class="text-xs">アイテムを紐付け</span>
		</button>
	{:else}
		<!-- 5/03 user 検収 (C): toolbar に view-mode toggle (grid / list)。複数 item 時のみ。 -->
		{#if pinnedItems.length > 1}
			<div
				class="mb-2 flex shrink-0 items-center justify-end gap-1 border-b border-[var(--ag-border)] pb-1.5 text-xs"
			>
				<button
					type="button"
					class="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {viewMode ===
					'grid'
						? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
						: 'text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]'}"
					aria-label="グリッド表示"
					title="グリッド表示"
					onclick={() => void setViewMode('grid')}
				>
					<Grid3x3 class="h-3 w-3" />
				</button>
				<button
					type="button"
					class="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {viewMode ===
					'list'
						? 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)]'
						: 'text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]'}"
					aria-label="リスト表示"
					title="リスト表示"
					onclick={() => void setViewMode('list')}
				>
					<LayoutList class="h-3 w-3" />
				</button>
			</div>
		{/if}

		<div class="@container min-h-0 flex-1">
			{#if viewMode === 'list' || pinnedItems.length === 1}
				<!-- list 表示 (single も list 風にするとサイズ感が安定): row ごとに icon + label 横並び。 -->
				<ul class="flex flex-col gap-1">
					{#each pinnedItems as item (item.id)}
						<li class="min-w-0">
							<button
								type="button"
								class="flex w-full min-w-0 items-center gap-2 rounded-[var(--ag-radius-card)] border border-transparent px-2 py-1.5 text-left transition-[background-color,border-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-border)] hover:bg-[var(--ag-surface-3)]"
								aria-label="{item.label} を起動"
								title={item.label}
								onclick={() => void handleLaunch(item)}
								oncontextmenu={(e) => {
									if (onItemContext) {
										e.preventDefault();
										onItemContext(item.id, e);
									}
								}}
							>
								<div
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)]"
								>
									<ItemIcon
										iconPath={item.icon_path}
										itemType={item.item_type}
										alt="{item.label} icon"
										class="h-5 w-5 object-contain"
									/>
								</div>
								<span
									class="min-w-0 flex-1 truncate text-sm text-[var(--ag-text-primary)]"
								>{item.label}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<!-- grid 表示: container query で widget 幅に応じて 2/3/4 列に動的調整。-->
				<div class="grid grid-cols-2 gap-1.5 @sm:grid-cols-3 @md:grid-cols-4">
					{#each pinnedItems as item (item.id)}
						<button
							type="button"
							class="flex flex-col items-center gap-1 rounded-[var(--ag-radius-card)] border border-transparent p-1.5 text-center transition-[background-color,border-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-border)] hover:bg-[var(--ag-surface-3)]"
							aria-label="{item.label} を起動"
							title={item.label}
							onclick={() => void handleLaunch(item)}
							oncontextmenu={(e) => {
								if (onItemContext) {
									e.preventDefault();
									onItemContext(item.id, e);
								}
							}}
						>
							<div
								class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] @sm:h-11 @sm:w-11"
							>
								<ItemIcon
									iconPath={item.icon_path}
									itemType={item.item_type}
									alt="{item.label} icon"
									class="h-7 w-7 object-contain @sm:h-9 @sm:w-9"
								/>
							</div>
							<span
								class="line-clamp-2 w-full break-all text-xs text-[var(--ag-text-secondary)]"
							>{item.label}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}

{#if pickerOpen}
	<LibraryItemPicker
		multi={true}
		onSelect={pickerSelectSingle}
		onSelectMany={pickerSelectMany}
		onClose={() => (pickerOpen = false)}
	/>
{/if}
