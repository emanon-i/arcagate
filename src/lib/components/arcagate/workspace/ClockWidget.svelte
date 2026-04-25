<script lang="ts">
import { Clock } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { updateWidgetConfig } from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { CLOCK_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();

let now = $state(new Date());

$effect(() => {
	const id = setInterval(() => {
		now = new Date();
	}, 1000);
	return () => clearInterval(id);
});

let config = $derived(parseWidgetConfig(widget?.config, CLOCK_WIDGET_DEFAULTS));

let timeStr = $derived.by(() => {
	const h = config.use_24h ? now.getHours() : now.getHours() % 12 || 12;
	const m = String(now.getMinutes()).padStart(2, '0');
	const s = String(now.getSeconds()).padStart(2, '0');
	const prefix = config.use_24h ? '' : now.getHours() < 12 ? 'AM ' : 'PM ';
	return `${prefix}${String(h).padStart(2, '0')}:${m}${config.show_seconds ? `:${s}` : ''}`;
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

async function toggleSetting(key: keyof typeof CLOCK_WIDGET_DEFAULTS) {
	if (!widget) return;
	const updated = { ...config, [key]: !config[key] };
	try {
		await updateWidgetConfig(widget.id, JSON.stringify(updated));
	} catch (e: unknown) {
		toastStore.add(`設定の保存に失敗しました: ${String(e)}`, 'error');
	}
}

let menuItems = $derived(
	widget
		? [
				{
					label: config.show_seconds ? '秒を非表示' : '秒を表示',
					onclick: () => {
						void toggleSetting('show_seconds');
					},
				},
				{
					label: config.show_date ? '日付を非表示' : '日付を表示',
					onclick: () => {
						void toggleSetting('show_date');
					},
				},
				{
					label: config.show_weekday ? '曜日を非表示' : '曜日を表示',
					onclick: () => {
						void toggleSetting('show_weekday');
					},
				},
				{
					label: config.use_24h ? '12時間表示に切替' : '24時間表示に切替',
					onclick: () => {
						void toggleSetting('use_24h');
					},
				},
			]
		: [],
);
</script>

<WidgetShell title="Clock" icon={Clock} {menuItems}>
	<div class="flex flex-col items-center justify-center gap-1 py-4">
		<span class="font-mono text-3xl font-semibold tabular-nums text-[var(--ag-text-primary)]">
			{timeStr}
		</span>
		{#if dateStr}
			<span class="text-sm text-[var(--ag-text-muted)]">{dateStr}</span>
		{/if}
	</div>
</WidgetShell>
