<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ClockSettings polish — 共通 Switch 採用で 4 toggle を統一。
 */
import Switch from '$lib/components/common/Switch.svelte';

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

<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">秒を表示</span>
	<Switch
		checked={showSeconds}
		onChange={(v) => {
			config = { ...config, show_seconds: v };
		}}
		aria-label="秒を表示する"
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">日付を表示</span>
	<Switch
		checked={showDate}
		onChange={(v) => {
			config = { ...config, show_date: v };
		}}
		aria-label="日付を表示する"
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">曜日を表示</span>
	<Switch
		checked={showWeekday}
		onChange={(v) => {
			config = { ...config, show_weekday: v };
		}}
		aria-label="曜日を表示する"
	/>
</div>
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">24 時間表示</span>
	<Switch
		checked={use24h}
		onChange={(v) => {
			config = { ...config, use_24h: v };
		}}
		aria-label="24 時間表示にする"
	/>
</div>
