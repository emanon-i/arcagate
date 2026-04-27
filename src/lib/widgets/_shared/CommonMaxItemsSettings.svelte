<script lang="ts">
interface Props {
	config: { max_items?: number; sort_field?: 'default' | 'name' };
}

let { config = $bindable() }: Props = $props();

let maxItems = $derived(config.max_items ?? 10);
let sortField = $derived<'default' | 'name'>(config.sort_field ?? 'default');
</script>

<div class="space-y-1">
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-max-items">表示件数</label>
	<input
		id="ws-max-items"
		type="number"
		min="1"
		max="100"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
		value={maxItems}
		onchange={(e) => {
			config = {
				...config,
				max_items: Number.parseInt((e.target as HTMLInputElement).value) || 10,
			};
		}}
	/>
</div>

<div class="space-y-1">
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-sort-field">並び順</label>
	<select
		id="ws-sort-field"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
		value={sortField}
		onchange={(e) => {
			config = {
				...config,
				sort_field: (e.target as HTMLSelectElement).value as 'default' | 'name',
			};
		}}
	>
		<option value="default">デフォルト（IPC 順）</option>
		<option value="name">名前順（A-Z）</option>
	</select>
</div>
