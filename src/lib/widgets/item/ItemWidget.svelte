<script lang="ts">
/**
 * 5/01 user 検収: ItemWidget を **共通 widget shell に乗せ直し**。
 *
 * 旧実装: 独自 `menuItems = [{label:'アイテムを変更', ...}]` で「設定」 menu 不在、
 *         空状態 button が `LibraryItemPicker` を直接開く → 他 widget と異なる挙動。
 *         ItemSettings.svelte は登録されていたが ItemWidget からは呼ばれず dead code。
 * 新実装: 他 widget (Projects / FileSearch / SystemMonitor 等) と同じ `widgetMenuItems`
 *         + `WidgetSettingsDialog` パターンに統一。空状態 button も Settings dialog を
 *         開く → ItemSettings 経由で picker 起動。LibraryItemPicker の直接使用を撤廃。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P4 一貫性 / P12 整合性
 * - CLAUDE.md「同じ機能 = 同じ icon + 同じラベル」
 */
import { Package, Plus } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { ITEM_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatLaunchError } from '$lib/utils/launch-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
	onItemContext?: (itemId: string, ev?: MouseEvent) => void;
}

let { widget, onItemContext }: Props = $props();

let settingsOpen = $state(false);

let itemId = $derived(parseWidgetConfig(widget?.config, ITEM_WIDGET_DEFAULTS).item_id);
let pinnedItem = $derived(itemId ? (itemStore.items.find((i) => i.id === itemId) ?? null) : null);

// 5/01 user 検収: 他 widget と同じ menuItems パターン (「設定」menu のみ、SettingsDialog 経由)。
let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={pinnedItem?.label ?? WIDGET_LABELS.item} icon={Package} {menuItems}>
	{#if pinnedItem}
		<button
			type="button"
			class="flex w-full flex-col items-center gap-3 rounded-[var(--ag-radius-card)] p-4 transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
			aria-label="{pinnedItem.label} を起動"
			title={pinnedItem.label}
			onclick={() => {
				void launchItem(pinnedItem!.id)
					.then(() => toastStore.add(`${pinnedItem!.label} を起動しました`, 'success'))
					.catch((e: unknown) => toastStore.add(formatLaunchError(pinnedItem!.label, e), 'error'));
			}}
			oncontextmenu={(e) => {
				if (onItemContext && pinnedItem) {
					e.preventDefault();
					onItemContext(pinnedItem.id, e);
				}
			}}
		>
			<div
				class="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)]"
			>
				<ItemIcon
					iconPath={pinnedItem.icon_path}
					itemType={pinnedItem.item_type}
					alt="{pinnedItem.label} icon"
					class="h-10 w-10 object-contain"
				/>
			</div>
			<span class="line-clamp-2 text-center text-sm font-medium text-[var(--ag-text-primary)]">
				{pinnedItem.label}
			</span>
		</button>
	{:else}
		<!-- 空状態: 設定 dialog を開いて ItemSettings 経由で picker 起動。
		     他 widget (Projects / ExeFolder) の EmptyState パターンと統一。 -->
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-8 text-[var(--ag-text-muted)] transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:border-[var(--ag-accent)] hover:bg-[var(--ag-accent-bg)]/50 hover:text-[var(--ag-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="このウィジェットにアイテムを紐付け"
			onclick={() => (settingsOpen = true)}
		>
			<Plus class="h-8 w-8" />
			<span class="text-xs">アイテムを紐付け</span>
		</button>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
