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

// menuItems = 1 個（「設定」即モーダル）に統一。
// 旧: 4 項目 DropdownMenu（秒/日付/曜日/12-24h トグル）→ CLAUDE.md「選択肢1個のメニューを挟むな」に従い
// 全ウィジェット共通の WidgetSettingsDialog へ統合。
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
	<!-- HOTFIX: container query で widget サイズに応じて responsive
		- 大きい: time large + date 表示
		- 小さい (< 200px): time medium + date 隠す
		- 極小 (< 140px): time small + date 隠す
		container-type: inline-size + cqw 単位で container 比例 -->
	<div
		class="clock-container flex h-full flex-col items-center justify-center gap-1 overflow-hidden"
	>
		<span
			class="clock-time font-mono font-semibold tabular-nums whitespace-nowrap text-[var(--ag-text-primary)]"
		>
			{timeStr}
		</span>
		{#if dateStr}
			<span
				class="clock-date text-ag-sm whitespace-nowrap text-[var(--ag-text-muted)]"
			>{dateStr}</span>
		{/if}
	</div>
</WidgetShell>

<style>
.clock-container {
	container-type: inline-size;
}
/* default (large widget): full size */
.clock-time {
	font-size: clamp(1rem, 12cqw, 1.875rem);
	line-height: 1.1;
}
.clock-date {
	font-size: clamp(0.625rem, 4cqw, 0.875rem);
}
/* very small: hide date */
@container (max-width: 140px) {
	.clock-date {
		display: none;
	}
}
</style>

{#if widget}
	<WidgetSettingsDialog
		{widget}
		open={settingsOpen}
		onClose={() => (settingsOpen = false)}
	/>
{/if}
