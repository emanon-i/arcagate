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
	<!-- 4/30 user 検収: industrial / 工具 美学に再構築。
	     - **時刻は warm-text (amber)** ← 「磨かれた工具」signature color、視認性 + 機能美
	     - tabular-nums + font-mono で digit width 固定、跳ねない表示
	     - 副情報 (日付 / TZ) は muted、tracking-wide で hierarchical
	     - compact (極小) も「stack 縦並び」廃止、HH:MM 横で 2xl まで縮める
	     - widget shell からはみ出さない overflow-hidden 維持
	     段階表示 (container query):
	     - ~140px: HH:MM のみ (秒・日付・TZ 全て hidden)
	     - @xs (~180px+): + 秒 (config 有効時)
	     - @sm (~260px+): + 日付 (yyyy/mm/dd) + 曜日
	     - @md (~340px+): + TZ ラベル + フォント拡大
	     - @lg (~520px+): 最大化、機械式メーターのような威風
	     -->
	<div
		class="@container relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden px-2 py-1"
	>
		<!-- 主時刻: amber (warm) で industrial signature。
		     段階拡大: ~140 = 4xl, @xs = 5xl, @sm = 6xl, @md = 7xl, @lg = 8xl。
		     leading-none で行高 squash、tabular-nums で digit width 等幅 (跳ねない)。 -->
		<div
			class="flex items-baseline gap-1 font-mono font-medium tabular-nums leading-none"
			style="color: var(--ag-warm-text);"
		>
			{#if !config.use_24h}
				<span class="text-xs uppercase tracking-wider text-[var(--ag-text-muted)] @md:text-sm">
					{display.prefix}
				</span>
			{/if}
			<span class="text-4xl @xs:text-5xl @sm:text-6xl @md:text-7xl @lg:text-8xl">
				{display.hm}
			</span>
			{#if config.show_seconds}
				<span
					class="hidden text-xs uppercase tracking-wider tabular-nums text-[var(--ag-text-faint)] @xs:inline @md:text-sm"
				>
					{display.seconds}
				</span>
			{/if}
		</div>

		<!-- 区切り横線: @sm 以上で表示。工具スケールのような細線で hierarchy 明示。 -->
		{#if config.show_date || config.show_weekday || (config.show_timezone && tzAbbr)}
			<div
				class="hidden h-px w-12 bg-[var(--ag-border)] @sm:block @md:w-16 @lg:w-24"
				aria-hidden="true"
			></div>
		{/if}

		<!-- 副情報: 日付 + 曜日 + TZ を 1 行で。muted text、industrial 工具刻印のような tracking。 -->
		<div
			class="hidden flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs uppercase tracking-wider text-[var(--ag-text-muted)] @sm:flex @md:text-sm"
		>
			{#if config.show_date}
				<span class="tabular-nums">{dateStr}</span>
			{/if}
			{#if config.show_weekday}
				<span class="text-[var(--ag-text-faint)]">{weekdayStr}</span>
			{/if}
			{#if config.show_timezone && tzAbbr}
				<span class="hidden font-medium text-[var(--ag-warm-text)]/70 @md:inline">{tzAbbr}</span>
			{/if}
		</div>
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
