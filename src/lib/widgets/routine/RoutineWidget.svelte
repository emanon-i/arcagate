<script lang="ts">
/**
 * PH-PQ-600 B: Routine widget。
 *
 * 複数の Library item を束ねて 1 クリックで一斉起動するマルチ起動 widget。
 * 例:「開発開始」routine = エディタ + ターミナル + チャット + 案件フォルダ を 1 ボタンで起動。
 *
 * 設計:
 * - 起動経路は既存 launch_service (cmd_launch_item / launchItem) を流用、新 launch 機構なし。
 * - item は登録済 Library item を id 参照。routine 専用の item 複製はせず、
 *   rename / 削除に追従する (itemStore 経由 read)。
 * - 1 件失敗しても残りの起動を止めない (per-item try/catch)。
 * - 削除済 (stale) item id は起動から skip し、UI に「削除済み」 badge で明示する。
 *
 * 引用元 guideline:
 * - docs/l3_phases/paid-quality/PH-PQ-600_widget-expansion.md §B Routine widget 実装規格
 * - CLAUDE.md「散在する起動元を 1 箇所に集約」core 価値
 */
import { Rocket } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { tPlural } from '$lib/utils/intl-formatter.svelte';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();

let settingsOpen = $state(false);
let launching = $state(false);

interface RoutineConfig {
	items?: string[];
	label?: string;
	launch_delay_ms?: number;
}

let config = $derived.by<RoutineConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as RoutineConfig;
	} catch {
		return {};
	}
});

let itemIds = $derived.by<string[]>(() => config.items ?? []);

/** config.label が空なら widget 既定名にフォールバック (ExeFolder 等と同 pattern)。 */
let routineLabel = $derived(
	config.label && config.label.trim().length > 0
		? config.label.trim()
		: t('widgets.routine.default_label'),
);

/** 1 routine entry: id と、解決できた Library item (削除済なら undefined)。 */
interface RoutineEntry {
	id: string;
	item: Item | undefined;
}

let entries = $derived.by<RoutineEntry[]>(() =>
	itemIds.map((id) => ({ id, item: itemStore.items.find((i) => i.id === id) })),
);

/** 起動対象 = 解決でき、かつ無効化されていない item。stale id はここに入らない。 */
let launchable = $derived.by<Item[]>(() =>
	entries.map((e) => e.item).filter((i): i is Item => i !== undefined && i.is_enabled),
);

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * routine の全 item を順に起動する。
 * - 1 件の失敗で残りを止めない (per-item try/catch)。
 * - launch_delay_ms が指定されていれば各起動の間に待機。
 * - 削除済 item は launchable に含まれないため自動的に skip される。
 */
async function launchAll(): Promise<void> {
	if (launching || launchable.length === 0) return;
	launching = true;
	const delay = Math.max(0, Math.min(config.launch_delay_ms ?? 0, 10_000));
	const total = launchable.length;
	let success = 0;
	let failed = 0;
	try {
		for (let i = 0; i < launchable.length; i++) {
			try {
				await launchItem(launchable[i].id);
				success++;
			} catch {
				failed++;
			}
			if (delay > 0 && i < launchable.length - 1) await sleep(delay);
		}
	} finally {
		launching = false;
	}
	toastStore.add(
		t('widgets.routine.launched_summary', { label: routineLabel, success, total }),
		failed > 0 ? 'info' : 'success',
	);
	if (failed > 0) {
		toastStore.add(
			tPlural('widgets.routine.launch_partial', failed, { label: routineLabel, failed }),
			'error',
		);
	}
}
</script>

<WidgetShell title={routineLabel} icon={Rocket} {menuItems}>
	{#if itemIds.length === 0}
		<EmptyState
			icon={Rocket}
			title={t('widgets.routine.empty_title')}
			description={t('widgets.routine.empty_desc')}
			action={{ label: t('widgets.routine.empty_action'), onClick: () => (settingsOpen = true) }}
			testId="routine-empty"
		/>
	{:else}
		<div class="flex h-full flex-col gap-2">
			<Button
				type="button"
				class="w-full shrink-0"
				disabled={launching || launchable.length === 0}
				aria-label={t('widgets.routine.launch_aria', { label: routineLabel })}
				data-testid="routine-launch-all"
				onclick={() => void launchAll()}
			>
				{#if launching}
					<span
						class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:hidden"
					></span>
					{t('widgets.routine.launching')}
				{:else}
					<Rocket class="h-3.5 w-3.5" />
					{t('widgets.routine.launch_button')}
				{/if}
			</Button>

			<p class="shrink-0 px-0.5 text-xs text-[var(--ag-text-muted)]">
				{tPlural('widgets.routine.item_count', launchable.length)}
			</p>

			{#if launchable.length === 0}
				<!-- 全件 stale: 起動対象が無い旨を明示 (button は disabled)。 -->
				<p class="px-0.5 text-xs text-[var(--ag-text-secondary)]">
					{t('widgets.routine.all_stale')}
				</p>
			{/if}

			<ul class="min-h-0 flex-1 space-y-1">
				{#each entries as entry (entry.id)}
					{#if entry.item}
						<li
							class="flex min-w-0 items-center gap-2 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1.5"
						>
							<div
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)]"
							>
								<ItemIcon
									iconPath={entry.item.icon_path}
									itemType={entry.item.item_type}
									alt="{entry.item.label} icon"
									class="h-5 w-5 object-contain"
								/>
							</div>
							<span
								class="min-w-0 flex-1 truncate text-sm text-[var(--ag-text-primary)]"
								title={entry.item.label}
							>{entry.item.label}</span>
						</li>
					{:else}
						<!-- stale: 削除済の item id。起動からは skip、UI には明示 (PH-PQ-600 B 受け入れ条件)。 -->
						<li
							class="flex min-w-0 items-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] px-2 py-1.5"
						>
							<div
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-[var(--ag-border)]"
							>
								<Rocket class="h-4 w-4 text-[var(--ag-text-faint)]" />
							</div>
							<span class="min-w-0 flex-1 truncate text-sm text-[var(--ag-text-muted)] line-through">
								{t('widgets.routine.stale_item')}
							</span>
							<span
								class="shrink-0 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-1.5 py-0.5 text-xs text-[var(--ag-text-muted)]"
							>
								{t('widgets.routine.stale_badge')}
							</span>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
