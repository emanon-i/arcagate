<script lang="ts">
interface Props {
	config: { font_size?: 'sm' | 'md' | 'lg' };
}

let { config = $bindable() }: Props = $props();

let fontSize = $derived<'sm' | 'md' | 'lg'>(config.font_size ?? 'md');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-font-size">フォントサイズ</label>
	<select
		id="ws-font-size"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={fontSize}
		onchange={(e) => {
			config = {
				...config,
				font_size: (e.target as HTMLSelectElement).value as 'sm' | 'md' | 'lg',
			};
		}}
	>
		<option value="sm">小</option>
		<option value="md">中（デフォルト）</option>
		<option value="lg">大</option>
	</select>
</div>
