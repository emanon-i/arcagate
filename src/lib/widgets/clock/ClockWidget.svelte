<script lang="ts">
/**
 * PH-issue-035 / 検収項目 #24-26: ClockWidget 抹本改修。
 *
 * - #24: widget 全体を活用、サイズに応じて表示密度を変える (空白を活かす)
 * - #25: 1×1 (compact) では時:分のみ、大きいときは秒 / 年月日 / TZ を段階的に表示
 * - #26: JST 既定 + タイムゾーン表示 (Intl.DateTimeFormat 経由)
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P11 装飾より対象 / P9 画面密度 / P3 主要 vs 補助
 * - docs/l1_requirements/ux_standards.md §6-1 Widget fluid sizing
 * - docs/l0_ideas/arcagate-visual-language.md「よく磨かれた工具」 (派手 NG、機能美)
 *
 * 表示階層 (container query):
 * - 1×1 (~120px wide): HH:MM 大型のみ
 * - @xs (~160px+):     + 秒 (config による)
 * - @sm (~280px+):     + 日付 (YYYY/MM/DD) + 曜日
 * - @md (~320px+):     + タイムゾーン名
 * - @lg (~480px+):     全部 + より大きいフォント
 */
import { Clock } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { CLOCK_WIDGET_DEFAULTS } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';

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

// PH-issue-035: timezone 経由でローカライズした時刻を Intl で取得
function partsForTz(date: Date, timezone: string) {
	try {
		const fmt = new Intl.DateTimeFormat('ja-JP', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			weekday: 'short',
			hour12: false,
		});
		const parts = fmt.formatToParts(date);
		const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
		return {
			year: get('year'),
			month: get('month'),
			day: get('day'),
			hour: get('hour'),
			minute: get('minute'),
			second: get('second'),
			weekday: get('weekday'),
		};
	} catch {
		// 不正な timezone 文字列 → ローカル fallback
		return partsForTz(date, Intl.DateTimeFormat().resolvedOptions().timeZone);
	}
}

let parts = $derived(partsForTz(now, config.timezone));

// timezone 短縮表記 (JST / EST / etc.)
let tzAbbr = $derived.by(() => {
	try {
		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: config.timezone,
			timeZoneName: 'short',
		});
		const tznPart = fmt.formatToParts(now).find((p) => p.type === 'timeZoneName');
		return tznPart?.value ?? config.timezone;
	} catch {
		return '';
	}
});

let display = $derived.by(() => {
	let h = Number(parts.hour);
	const m = parts.minute;
	const s = parts.second;
	const prefix = config.use_24h ? '' : h < 12 ? 'AM' : 'PM';
	if (!config.use_24h) {
		h = h % 12 || 12;
	}
	return {
		prefix,
		hour: String(h).padStart(2, '0'),
		minute: m,
		hm: `${String(h).padStart(2, '0')}:${m}`,
		seconds: s,
	};
});

let dateStr = $derived(`${parts.year}/${parts.month}/${parts.day}`);
let weekdayStr = $derived(`(${parts.weekday})`);

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={WIDGET_LABELS.clock} icon={Clock} {menuItems}>
	<!-- 検収 #16: container query を細分化、極小サイズでも崩れないように。
	     - 〜120px: HH と MM を 2 行に縦表示 (visually balanced compact mode)
	     - @xs (160px+): HH:MM 横、秒は隠す
	     - @sm (240px+): + 秒
	     - @md (320px+): + 日付・曜日
	     - @lg (480px+): + TZ 名 + 全体的に大きい
	     overflow-hidden で widget shell からはみ出さない (検収 #14, #16)。 -->
	<div
		class="@container relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
	>
		<!-- 縦表示 (極小): @xs 未満で表示。HH 改行 MM。 -->
		<div
			class="flex flex-col items-center gap-0 font-mono font-semibold tabular-nums leading-none text-[var(--ag-text-primary)] @xs:hidden"
		>
			<span class="text-3xl">{display.hour}</span>
			<span class="text-3xl">{display.minute}</span>
		</div>

		<!-- 横表示 (@xs+): HH:MM + 秒 -->
		<div
			class="hidden items-baseline gap-1 font-mono font-semibold tabular-nums text-[var(--ag-text-primary)] @xs:flex"
		>
			{#if !config.use_24h}
				<span class="text-xs text-[var(--ag-text-muted)] @md:text-base">
					{display.prefix}
				</span>
			{/if}
			<span
				class="text-4xl leading-none @sm:text-5xl @md:text-6xl @lg:text-7xl"
			>
				{display.hm}
			</span>
			{#if config.show_seconds}
				<span
					class="hidden text-base leading-none text-[var(--ag-text-secondary)] @sm:inline @md:text-2xl @lg:text-3xl"
				>:{display.seconds}</span>
			{/if}
		</div>

		<!-- 日付 + 曜日: @sm 以上で表示 -->
		{#if config.show_date || config.show_weekday}
			<div
				class="hidden items-center gap-1 truncate text-xs text-[var(--ag-text-muted)] @sm:flex @md:text-sm @lg:text-base"
			>
				{#if config.show_date}<span>{dateStr}</span>{/if}
				{#if config.show_weekday}<span>{weekdayStr}</span>{/if}
			</div>
		{/if}

		<!-- タイムゾーン: @md 以上で表示 -->
		{#if config.show_timezone && tzAbbr}
			<div
				class="mt-1 hidden truncate text-xs uppercase tracking-wider text-[var(--ag-text-faint)] @md:block @lg:text-sm"
			>
				{tzAbbr}
			</div>
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
