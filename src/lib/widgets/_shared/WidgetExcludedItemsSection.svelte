<script lang="ts">
/**
 * PH-CF-500: 監視ウィジェットの設定 dialog に表示する 「除外したアイテム」 section。
 *
 * 役割:
 *  - 当該 widget の `widget_item_hides` (= scan で再登録しないよう除外された entry key) を一覧
 *  - 「復元」 click で `widget_item_hides_repository::remove` を呼び、 store を refresh
 *  - 復元後、 次の scan で当該 entry が widget に再登録される (PH-CF-100 reconcile が
 *    hide 解除を check するため自然に復活)
 *
 * 引用 guideline:
 *  - `docs/l2_foundation/features/widgets/_chrome-consistency.md` 「監視ウィジェットの復元 UI 契約」
 *  - `CLAUDE.md` `<critical-rule id="instant-feedback">` (復元 click 直後に行が消える)
 *
 * widget id は WidgetSettingsDialog が setContext した値を getContext で取得 (prop drilling 回避)。
 */
import { getContext, onMount } from 'svelte';
import { t } from '$lib/i18n.svelte';
import { widgetItemHidesStore } from '$lib/state/widget-item-hides.svelte';
import {
	WIDGET_SETTINGS_CTX,
	type WidgetSettingsContext,
} from '$lib/widgets/_shared/settings-context';

const ctx = getContext<WidgetSettingsContext | undefined>(WIDGET_SETTINGS_CTX);
const widgetId = $derived(ctx?.widgetId ?? null);

let loading = $state(false);
let loadError = $state<string | null>(null);

async function loadHides(): Promise<void> {
	if (!widgetId) return;
	loading = true;
	loadError = null;
	try {
		await widgetItemHidesStore.loadFor(widgetId);
	} catch (e: unknown) {
		loadError = e instanceof Error ? e.message : String(e);
	} finally {
		loading = false;
	}
}

onMount(() => {
	void loadHides();
});

// store cache は Map → Set。 widget_id 分の Set を derived で取り出す。
const hides = $derived.by(() => {
	if (!widgetId) return [] as string[];
	return [...widgetItemHidesStore.getHides(widgetId)];
});

async function restore(target: string): Promise<void> {
	if (!widgetId) return;
	try {
		await widgetItemHidesStore.remove(widgetId, target);
	} catch (e: unknown) {
		loadError = e instanceof Error ? e.message : String(e);
	}
}
</script>

<section
	class="space-y-2 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3"
	data-testid="widget-excluded-items-section"
>
	<header class="flex items-baseline justify-between gap-2">
		<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">
			{t('widgets.common.excluded_items_title')}
		</h4>
		<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{hides.length}</span>
	</header>
	<p class="text-xs text-[var(--ag-text-muted)]">{t('widgets.common.excluded_items_desc')}</p>
	{#if loadError}
		<p class="text-xs text-[var(--ag-error-text)]" data-testid="widget-excluded-items-error">
			{t('widgets.common.excluded_items_load_failed')}: {loadError}
		</p>
	{:else if loading}
		<p class="text-xs text-[var(--ag-text-muted)]">
			{t('widgets.common.excluded_items_loading')}
		</p>
	{:else if hides.length === 0}
		<p
			class="text-xs italic text-[var(--ag-text-muted)]"
			data-testid="widget-excluded-items-empty"
		>
			{t('widgets.common.excluded_items_empty')}
		</p>
	{:else}
		<ul class="space-y-1" data-testid="widget-excluded-items-list">
			{#each hides as target (target)}
				<li
					class="flex items-center gap-2 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1"
					data-testid="widget-excluded-items-row"
				>
					<span
						class="min-w-0 flex-1 truncate text-xs text-[var(--ag-text-primary)]"
						title={target}
					>
						{target}
					</span>
					<button
						type="button"
						class="shrink-0 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-4)] px-2 py-0.5 text-xs text-[var(--ag-text-primary)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						aria-label={t('widgets.common.excluded_items_restore_aria', { target })}
						onclick={() => void restore(target)}
						data-testid="widget-excluded-items-restore"
					>
						{t('widgets.common.excluded_items_restore_label')}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
