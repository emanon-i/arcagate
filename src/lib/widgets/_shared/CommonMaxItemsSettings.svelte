<script lang="ts">
/**
 * PH-issue-026 (Issue 23): CommonMaxItemsSettings polish — clamp 統一 (1〜100)。
 * 4/30 user 検収 #12: native `<select>` を SelectField に置換 (Windows ダーク dropdown 読めない)。
 */
import SelectField from '$lib/components/common/SelectField.svelte';

interface Props {
	config: { max_items?: number; sort_field?: 'default' | 'name' };
}

let { config = $bindable() }: Props = $props();

let maxItems = $derived(config.max_items ?? 10);
let sortField = $derived<'default' | 'name'>(config.sort_field ?? 'default');

const SORT_OPTIONS: { value: 'default' | 'name'; label: string }[] = [
	{ value: 'default', label: 'デフォルト（IPC 順）' },
	{ value: 'name', label: '名前順（A-Z）' },
];
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-max-items">表示件数 (1〜100)</label>
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

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sort-field">並び順</label>
	<SelectField
		id="ws-sort-field"
		aria-label="並び順を選ぶ"
		value={sortField}
		options={SORT_OPTIONS}
		onChange={(v) => {
			config = { ...config, sort_field: v };
		}}
	/>
</div>
