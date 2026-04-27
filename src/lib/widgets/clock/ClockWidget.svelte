<script lang="ts">
import { Clock } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { CLOCK_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();

let settingsOpen = $state(false);
let now = $state(new Date());

$effect(() => {
	const id = setInterval(() => {
		now = new Date();
	}, 1000);
	return () => clearInterval(id);
});

let config = $derived(parseWidgetConfig(widget?.config, CLOCK_WIDGET_DEFAULTS));

// PH-506: prefix / core / seconds に分解してそれぞれ span に。
// XS (< 100px) では seconds を CSS で隠すことで HH:MM のみに自動降格できる。
let timeParts = $derived.by(() => {
	const h = config.use_24h ? now.getHours() : now.getHours() % 12 || 12;
	const m = String(now.getMinutes()).padStart(2, '0');
	const s = String(now.getSeconds()).padStart(2, '0');
	const prefix = config.use_24h ? '' : now.getHours() < 12 ? 'AM' : 'PM';
	return {
		prefix,
		core: `${String(h).padStart(2, '0')}:${m}`,
		seconds: config.show_seconds ? s : '',
	};
});

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

let dateStr = $derived.by(() => {
	const parts: string[] = [];
	if (config.show_date) {
		parts.push(
			`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
		);
	}
	if (config.show_weekday) {
		parts.push(`(${WEEKDAYS[now.getDay()]})`);
	}
	return parts.join(' ');
});

// SR 用 ARIA label (時刻全体を 1 行で読ませる)
let ariaTimeLabel = $derived.by(() => {
	const tp = timeParts;
	return [tp.prefix, tp.core, tp.seconds, dateStr].filter(Boolean).join(' ');
});

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);
</script>

<WidgetShell title={WIDGET_LABELS.clock} icon={Clock} {menuItems}>
	<!--
		PH-498 (hotfix) で responsive 化、PH-506 で polish:
		- L/M (>= 200px): time + date + weekday + (秒)
		- S (140-199px): time のみ、date 非表示
		- XS (< 100px): prefix (AM/PM) + seconds を CSS で hide → HH:MM のみ
		container-type: inline-size + cqw 単位で widget 幅に追従。
	-->
	<div
		class="clock-container flex h-full flex-col items-center justify-center gap-1 overflow-hidden"
		role="group"
		aria-label="現在時刻"
		aria-live="polite"
	>
		<span
			class="clock-time font-mono font-semibold tabular-nums whitespace-nowrap text-[var(--ag-text-primary)]"
			aria-label={ariaTimeLabel}
		>
			{#if timeParts.prefix}
				<span class="clock-prefix">{timeParts.prefix}&nbsp;</span>
			{/if}
			<span>{timeParts.core}</span>
			{#if timeParts.seconds}
				<span class="clock-seconds">:{timeParts.seconds}</span>
			{/if}
		</span>
		{#if dateStr}
			<span class="clock-date text-ag-sm whitespace-nowrap text-[var(--ag-text-muted)]">
				{dateStr}
			</span>
		{/if}
	</div>
</WidgetShell>

<style>
.clock-container {
	container-type: inline-size;
}
/* default (L / M): full size */
.clock-time {
	font-size: clamp(1rem, 12cqw, 1.875rem);
	line-height: 1.1;
}
.clock-date {
	font-size: clamp(0.625rem, 4cqw, 0.875rem);
}
/* S: hide date (date-only suppression) */
@container (max-width: 140px) {
	.clock-date {
		display: none;
	}
}
/* XS: hide seconds + prefix → HH:MM only */
@container (max-width: 100px) {
	.clock-seconds,
	.clock-prefix {
		display: none;
	}
}
</style>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
