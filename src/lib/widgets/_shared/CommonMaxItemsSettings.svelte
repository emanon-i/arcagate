<script lang="ts">
/**
 * PH-issue-026 (Issue 23): CommonMaxItemsSettings polish — clamp 統一 (1〜100)。
 */
import { t } from '$lib/i18n.svelte';

interface Props {
	config: { max_items?: number; sort_field?: 'default' | 'name' };
	/** sort_field を読まない widget (stats 等) では false にして並び順 select を隠す。 */
	showSort?: boolean;
}

let { config = $bindable(), showSort = true }: Props = $props();

let maxItems = $derived(config.max_items ?? 10);
let sortField = $derived<'default' | 'name'>(config.sort_field ?? 'default');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-max-items">{t('widgets.common.max_items_label')}</label>
	<input
		id="ws-max-items"
		type="number"
		min="1"
		max="100"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={maxItems}
		onchange={(e) => {
			config = {
				...config,
				max_items: Math.max(
					1,
					Math.min(100, Number((e.currentTarget as HTMLInputElement).value) || 10),
				),
			};
		}}
	/>
</div>

{#if showSort}
	<div class="space-y-1">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sort-field">{t('widgets.common.sort_field_label')}</label>
		<select
			id="ws-sort-field"
			class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
			value={sortField}
			onchange={(e) => {
				config = {
					...config,
					sort_field: (e.currentTarget as HTMLSelectElement).value as 'default' | 'name',
				};
			}}
		>
			<option value="default">{t('widgets.common.sort_default')}</option>
			<option value="name">{t('widgets.common.sort_name_az')}</option>
		</select>
	</div>
{/if}
