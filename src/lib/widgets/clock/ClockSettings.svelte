<script lang="ts">
/**
 * PH-issue-035 / 検収項目 #24-26: ClockWidget 抹本改修に対応する Settings dialog。
 *
 * 旧設定 (秒 / 日付 / 曜日 / 24h) に加え:
 * - timezone: IANA TZ identifier (default 'Asia/Tokyo')
 * - show_timezone: TZ 名を widget に表示するか
 */
import Switch from '$lib/components/common/Switch.svelte';

interface Props {
	config: {
		show_seconds?: boolean;
		show_date?: boolean;
		show_weekday?: boolean;
		use_24h?: boolean;
		timezone?: string;
		show_timezone?: boolean;
	};
}

let { config = $bindable() }: Props = $props();

let showSeconds = $derived(config.show_seconds ?? true);
let showDate = $derived(config.show_date ?? true);
let showWeekday = $derived(config.show_weekday ?? true);
let use24h = $derived(config.use_24h ?? true);
let timezone = $derived(config.timezone ?? 'Asia/Tokyo');
let showTimezone = $derived(config.show_timezone ?? true);

// よく使う TZ 候補 (詳細指定したい人は input 直接編集)
const TZ_PRESETS: { value: string; label: string }[] = [
	{ value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
	{ value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
	{ value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
	{ value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
	{ value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
	{ value: 'UTC', label: 'UTC' },
];
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-clock-tz">タイムゾーン</label>
	<select
		id="ws-clock-tz"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={timezone}
		onchange={(e) => {
			config = { ...config, timezone: (e.currentTarget as HTMLSelectElement).value };
		}}
	>
		{#each TZ_PRESETS as tz (tz.value)}
			<option value={tz.value}>{tz.label}</option>
		{/each}
		{#if !TZ_PRESETS.some((t) => t.value === timezone)}
			<option value={timezone}>{timezone} (カスタム)</option>
		{/if}
	</select>
</div>

<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">タイムゾーン名を表示</span>
	<Switch
		checked={showTimezone}
		onChange={(v) => {
			config = { ...config, show_timezone: v };
		}}
		aria-label="タイムゾーン名を表示する"
	/>
</div>

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
