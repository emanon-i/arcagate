<script lang="ts">
import { Grip, PanelLeftClose } from '@lucide/svelte';
import type { Component } from 'svelte';
import { pointerDrag } from '$lib/state/pointer-drag.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WidgetType } from '$lib/types/workspace';
import { widgetRegistry } from '$lib/widgets';
import { WIDGET_CATEGORIES, type WidgetMeta } from '$lib/widgets/_shared/types';

/**
 * PH-issue-002: 編集モード撤廃に伴い、Sidebar は常時 widget add panel として表示。
 * 旧 editMode toggle / 確定 / キャンセル button は廃止 (即時保存方針)。
 *
 * PH-issue-028 / 検収項目 #1: open/close toggle 復活。
 * close 時は sidebar を完全非表示、再表示は外部の toggle button (WorkspaceLayout) から。
 */

interface Props {
	onClose?: () => void;
	/**
	 * Codex r4 HIGH #1: viewport 幅から導出された responsive cols。
	 * keyboard 経路 (Enter/Space) と pointer 経路 (drag/click) の placement 判定を
	 * 一致させるため、Sidebar から workspaceStore.addWidget へ伝搬する。
	 * 未指定時は store 側 fallback (DEFAULT_GRID_COLS=4) で動作。
	 */
	dynamicCols?: number;
}

let { onClose, dynamicCols }: Props = $props();

/**
 * 4/30 user 検収: widget palette を **用途別グルーピング** で表示。
 * カテゴリ未指定の widget は末尾「その他」グループに集約。
 * 同 category 内は categoryOrder 昇順 → label 昇順。
 */
type AvailableWidget = {
	type: WidgetType;
	label: string;
	icon: Component;
	category: NonNullable<WidgetMeta['category']> | 'other';
	categoryOrder: number;
};
const availableWidgets: AvailableWidget[] = Object.entries(widgetRegistry)
	.filter(([, meta]) => meta?.addable)
	.map(([type, meta]) => ({
		type: type as WidgetType,
		label: meta?.label ?? type,
		icon: meta?.icon as Component,
		category: meta?.category ?? 'other',
		categoryOrder: meta?.categoryOrder ?? 999,
	}));

type GroupKey = AvailableWidget['category'];
const groupedWidgets: { key: GroupKey; label: string; items: AvailableWidget[] }[] = [
	...WIDGET_CATEGORIES.map((c) => ({
		key: c.key,
		label: c.label,
		items: availableWidgets
			.filter((w) => w.category === c.key)
			.sort((a, b) => a.categoryOrder - b.categoryOrder || a.label.localeCompare(b.label, 'ja')),
	})),
	{
		key: 'other' as const,
		label: 'その他',
		items: availableWidgets
			.filter((w) => w.category === 'other')
			.sort((a, b) => a.label.localeCompare(b.label, 'ja')),
	},
].filter((g) => g.items.length > 0);

/**
 * 検収 #6: pointerdown + onclick の二重発火で widget が 2 個追加されるバグ修正。
 * pointerdown だけで drag を開始し、ドロップ位置の有無で「クリック (= 空き位置に追加)」と
 * 「ドラッグ (= 指定セルに追加)」を判別する。click handler は撤廃。
 */
function startDrag(e: PointerEvent, widgetType: WidgetType) {
	e.preventDefault();
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	pointerDrag.start({ kind: 'add', widgetType }, e.clientX, e.clientY);
}

/**
 * Codex High #2 + 再 review #1: キーボード a11y。Enter / Space で widget を追加する経路を復活。
 * onclick を付けると mouse drag 後の click 合成で二重発火（前回の regression 元）するため、
 * onkeydown でキー判定して **直接** workspaceStore.addWidget を呼ぶ。
 * Space は preventDefault して click 合成を抑制（pointerdown 経路と分離）。
 * **`e.repeat` を必ず guard**：キー長押しで keydown が連射 → widget 大量追加される spam を防ぐ
 * (Codex 再 review High #1 指摘の regression)。
 *
 * Codex r4 HIGH #1: pointer 経路 (WorkspaceWidgetGrid) は dynamicCols を渡しているため、
 * keyboard 経路でも同じ cols を渡さないと cols>=5 の wide canvas で false "no space" を出す。
 * → dynamicCols を 3 番目の引数に伝搬し、placement bound を pointer 経路と一致させる。
 */
function keyboardAdd(e: KeyboardEvent, widgetType: WidgetType) {
	if (e.key !== 'Enter' && e.key !== ' ') return;
	if (e.repeat) return;
	e.preventDefault();
	void workspaceStore.addWidget(widgetType, undefined, dynamicCols);
}
</script>

<aside
	class="flex h-full w-[200px] flex-col border-r border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
>
	<div class="flex items-center justify-between border-b border-[var(--ag-border)] px-3 py-2">
		<span
			class="text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]"
		>
			ウィジェットを追加
		</span>
		{#if onClose}
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
				aria-label="ウィジェットパネルを閉じる"
				title="閉じる"
				onclick={onClose}
			>
				<PanelLeftClose class="h-4 w-4" />
			</button>
		{/if}
	</div>
	<!-- 4/30 user 検収: widget palette を用途別グルーピング (library / watch / memo / tool / info)。
	     「これ何順ですか？」 fb への回答 — グループ見出し + 同 group 内 categoryOrder 順。 -->
	<div class="space-y-3 overflow-y-auto p-3">
		{#each groupedWidgets as group (group.key)}
			<div class="space-y-1">
				<div
					class="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-faint)]"
				>
					{group.label}
				</div>
				{#each group.items as aw (aw.type)}
					{@const Icon = aw.icon}
					{@const isDragging =
						pointerDrag.active?.kind === 'add' && pointerDrag.active.widgetType === aw.type}
					<button
						type="button"
						class="group/add flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
						class:cursor-grab={!isDragging}
						class:cursor-grabbing={isDragging}
						class:opacity-50={isDragging}
						data-widget-type={aw.type}
						aria-label="{aw.label} を追加"
						title="クリック or Enter で追加 / ドラッグで配置"
						onpointerdown={(e) => startDrag(e, aw.type)}
						onkeydown={(e) => keyboardAdd(e, aw.type)}
					>
						<Grip
							class="h-3.5 w-3.5 shrink-0 text-[var(--ag-text-faint)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none group-hover/add:text-[var(--ag-text-muted)]"
						/>
						<Icon class="h-4 w-4 shrink-0" />
						<span class="min-w-0 flex-1 truncate text-left">{aw.label}</span>
					</button>
				{/each}
			</div>
		{/each}
	</div>
</aside>
