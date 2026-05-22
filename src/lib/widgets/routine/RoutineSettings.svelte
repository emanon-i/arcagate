<script lang="ts">
/**
 * PH-PQ-600 B: Routine widget の設定 UI。
 *
 * config { items: item_id[], label, launch_delay_ms? } を編集する。
 * WidgetSettingsDialog から bind:config で動的 mount される (全 widget 共通 Modal pattern)。
 *
 * item 管理 (追加 / 並び替え / 削除 / 全解除) は ItemSettings と同じ操作体系。
 * 削除済 item id は list 内で「削除済み」表示し、その場で外せるようにする。
 */
import { Plus, Rocket, X } from '@lucide/svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	config: {
		items?: string[];
		label?: string;
		launch_delay_ms?: number;
	};
}

let { config = $bindable() }: Props = $props();

let pickerOpen = $state(false);

let itemIds = $derived.by<string[]>(() => config.items ?? []);

interface RoutineEntry {
	id: string;
	item: Item | undefined;
}

let entries = $derived.by<RoutineEntry[]>(() =>
	itemIds.map((id) => ({ id, item: itemStore.items.find((i) => i.id === id) })),
);

function selectMany(items: Item[]) {
	pickerOpen = false;
	if (items.length === 0) return;
	const existing = new Set(itemIds);
	const next = [...itemIds];
	for (const it of items) {
		if (!existing.has(it.id)) next.push(it.id);
	}
	config = { ...config, items: next };
}

function selectSingle(item: Item) {
	pickerOpen = false;
	if (itemIds.includes(item.id)) return;
	config = { ...config, items: [...itemIds, item.id] };
}

function removeAt(index: number) {
	const next = [...itemIds];
	next.splice(index, 1);
	config = { ...config, items: next };
}

function moveUp(index: number) {
	if (index <= 0) return;
	const next = [...itemIds];
	[next[index - 1], next[index]] = [next[index], next[index - 1]];
	config = { ...config, items: next };
}

function moveDown(index: number) {
	if (index >= itemIds.length - 1) return;
	const next = [...itemIds];
	[next[index], next[index + 1]] = [next[index + 1], next[index]];
	config = { ...config, items: next };
}

function clearAll() {
	config = { ...config, items: [] };
}
</script>

<!-- ルーティン名 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-routine-label">
		{t('widgets.routine.label_label')}
	</label>
	<input
		id="ws-routine-label"
		type="text"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		placeholder={t('widgets.routine.label_placeholder')}
		value={config.label ?? ''}
		oninput={(e) => {
			config = { ...config, label: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<!-- 束ねるアイテム -->
<div class="space-y-1">
	<span class="text-sm font-medium text-[var(--ag-text-primary)]">
		{t('widgets.routine.item_count', { count: itemIds.length })}
	</span>
	{#if itemIds.length === 0}
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-8 text-[var(--ag-text-muted)] transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-accent)] hover:bg-[var(--ag-accent-bg)]/50 hover:text-[var(--ag-accent-text)]"
			aria-label={t('widgets.routine.add_items')}
			onclick={() => (pickerOpen = true)}
		>
			<Rocket class="h-6 w-6" />
			<span class="text-sm font-medium">{t('widgets.routine.add_items')}</span>
			<span class="px-3 text-xs leading-relaxed text-[var(--ag-text-faint)]">
				{t('widgets.routine.picker_hint')}
			</span>
		</button>
	{:else}
		<ul class="space-y-1">
			{#each entries as entry, index (entry.id)}
				<li
					class="flex items-center gap-2 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1.5"
					class:border-dashed={!entry.item}
				>
					{#if entry.item}
						<ItemIcon
							iconPath={entry.item.icon_path}
							itemType={entry.item.item_type}
							alt="{entry.item.label} icon"
							class="h-6 w-6 shrink-0 object-contain"
						/>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-[var(--ag-text-primary)]">
								{entry.item.label}
							</p>
							<p class="truncate font-mono text-xs text-[var(--ag-text-muted)]">
								{entry.item.target}
							</p>
						</div>
					{:else}
						<div
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-dashed border-[var(--ag-border)]"
						>
							<Rocket class="h-4 w-4 text-[var(--ag-text-faint)]" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm text-[var(--ag-text-muted)] line-through">
								{t('widgets.routine.stale_item')}
							</p>
							<p class="text-xs text-[var(--ag-text-faint)]">
								{t('widgets.routine.stale_badge')}
							</p>
						</div>
					{/if}
					{#if itemIds.length > 1}
						<button
							type="button"
							class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:opacity-30"
							aria-label={t('widgets.item.move_up', { label: entry.item?.label ?? t('widgets.routine.stale_item') })}
							disabled={index === 0}
							onclick={() => moveUp(index)}
						>↑</button>
						<button
							type="button"
							class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:opacity-30"
							aria-label={t('widgets.item.move_down', { label: entry.item?.label ?? t('widgets.routine.stale_item') })}
							disabled={index === itemIds.length - 1}
							onclick={() => moveDown(index)}
						>↓</button>
					{/if}
					<button
						type="button"
						class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-error-border)] hover:bg-[var(--ag-error-bg)] hover:text-[var(--ag-error-text)]"
						aria-label={t('widgets.item.remove', { label: entry.item?.label ?? t('widgets.routine.stale_item') })}
						onclick={() => removeAt(index)}
					>
						<X class="h-3.5 w-3.5" />
					</button>
				</li>
			{/each}
		</ul>
		<div class="flex items-center gap-2">
			<Button type="button" variant="outline" size="sm" onclick={() => (pickerOpen = true)}>
				<Plus class="h-3.5 w-3.5" />
				{t('widgets.item.add_more')}
			</Button>
			<Button type="button" variant="outline" size="sm" onclick={clearAll}>
				<X class="h-3.5 w-3.5" />
				{t('widgets.item.clear_all')}
			</Button>
		</div>
	{/if}
</div>

<!-- 起動間隔 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-routine-delay">
		{t('widgets.routine.delay_label')}
	</label>
	<input
		id="ws-routine-delay"
		type="number"
		min="0"
		max="10000"
		step="100"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={config.launch_delay_ms ?? 0}
		oninput={(e) => {
			const raw = Number((e.currentTarget as HTMLInputElement).value);
			const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(raw, 10_000)) : 0;
			config = { ...config, launch_delay_ms: clamped };
		}}
	/>
	<p class="text-xs text-[var(--ag-text-muted)]">{t('widgets.routine.delay_hint')}</p>
</div>

{#if pickerOpen}
	<LibraryItemPicker
		multi={true}
		onSelect={selectSingle}
		onSelectMany={selectMany}
		onClose={() => (pickerOpen = false)}
	/>
{/if}
