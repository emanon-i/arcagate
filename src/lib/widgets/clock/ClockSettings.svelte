<script lang="ts">
interface Props {
	config: {
		show_seconds?: boolean;
		show_date?: boolean;
		show_weekday?: boolean;
		use_24h?: boolean;
	};
}

let { config = $bindable() }: Props = $props();

let showSeconds = $derived(config.show_seconds ?? true);
let showDate = $derived(config.show_date ?? true);
let showWeekday = $derived(config.show_weekday ?? true);
let use24h = $derived(config.use_24h ?? true);
</script>

<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">秒を表示</span>
	<input
		type="checkbox"
		data-testid="clock-show-seconds"
		checked={showSeconds}
		onchange={(e) => {
			config = { ...config, show_seconds: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">日付を表示</span>
	<input
		type="checkbox"
		data-testid="clock-show-date"
		checked={showDate}
		onchange={(e) => {
			config = { ...config, show_date: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">曜日を表示</span>
	<input
		type="checkbox"
		data-testid="clock-show-weekday"
		checked={showWeekday}
		onchange={(e) => {
			config = { ...config, show_weekday: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
<label class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">24 時間表示</span>
	<input
		type="checkbox"
		data-testid="clock-use-24h"
		checked={use24h}
		onchange={(e) => {
			config = { ...config, use_24h: (e.currentTarget as HTMLInputElement).checked };
		}}
		class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
	/>
</label>
