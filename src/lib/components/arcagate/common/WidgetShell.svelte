<script lang="ts">
import { MoreHorizontal } from '@lucide/svelte';
import type { Component, Snippet } from 'svelte';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { workspaceContextMenuStore } from '$lib/state/workspace-context-menu.svelte';

interface MenuItem {
	label: string;
	icon?: Component;
	onclick: () => void;
}

interface Props {
	title: string;
	icon: Component;
	menuItems?: MenuItem[];
	/** Fix A (2026-05-12): content-owning widget (ImageScrap / FilePreview 等) が
	 * 持つ file path。 指定時、 widget body 右クリック menu で「パスをコピー / Explorer で開く」
	 * が機能する (Library item 不在でも widget 内 path から取れる)。 */
	path?: string | null;
	children: Snippet;
}

let { title, icon: Icon, menuItems = [], path, children }: Props = $props();

// I-2: widget body 右 click → 共通 context menu (settings 経路を menuItems の 1 件目から拝借)。
// 「全 widget 共通の基本機能」 として WidgetShell 経由で 13 widget 全部に attach される。
// Fix A (2026-05-12): path が渡されたら menu に path も注入 (image / file widget で copy/explorer が出るように)。
function handleWidgetContextMenu(ev: MouseEvent): void {
	// item rows が個別 oncontextmenu で path + itemId を渡している場合は stopPropagation で
	// この handler に届かないため、widget-body 上の余白でのみ発火する想定。
	const settingsItem = menuItems[0];
	const onOpenSettings = settingsItem ? settingsItem.onclick : null;
	// settings callback も path も無ければ menu 開かない (= 表示する menu item が無い状態を回避)
	if (!onOpenSettings && !path) return;
	ev.preventDefault();
	workspaceContextMenuStore.openMenuFor({ path, onOpenSettings, ev });
}

// audit batch (2026-05-13) #11: header 縦幅縮小。 button padding を p-1.5 (6px) → p-1 (4px) に。
let btnClass =
	'rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- audit batch (2026-05-13) #11: container p-4 pt-5 → p-3、 mb-3 → mb-1.5、 icon box p-1.5 → p-1 で
     header 縦幅を ~16px 縮小。 PH-issue-015 の title truncate 構造は維持。 -->
<div
	class="widget-shell flex h-full flex-col rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-3 transition-[box-shadow,border-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-out)] motion-reduce:transition-none"
	oncontextmenu={handleWidgetContextMenu}
>
	<div class="mb-1.5 shrink-0 flex items-center justify-between gap-2">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<div class="shrink-0 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-1">
				<Icon class="h-3.5 w-3.5 text-[var(--ag-text-secondary)]" />
			</div>
			<!-- J-1 (2026-05-12 user 検収): widget title が他 UI と比べ大き過ぎ → text-sm (14px) → text-xs (12px) に縮小。
			     font-semibold + text-primary は維持 (header 内で識別性は確保)、icon / button は header 全体ではなく title のみ変更。 -->
			<div class="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ag-text-primary)]">{title}</div>
		</div>
		{#if menuItems.length === 1}
			{@const sole = menuItems[0]}
			{@const SoleIcon = sole.icon ?? MoreHorizontal}
			<button type="button" class={btnClass} aria-label={sole.label} onclick={sole.onclick}>
				<SoleIcon class="h-3.5 w-3.5" />
			</button>
		{:else if menuItems.length > 1}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class={btnClass} aria-label="{title} メニュー">
					<MoreHorizontal class="h-3.5 w-3.5" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					{#each menuItems as item}
						<DropdownMenu.Item onclick={item.onclick}>{item.label}</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</div>

	<!-- PH-issue-014: scroll-area inner のみ scrollbar-gutter: stable
	     (旧 PH-489 の root 全 stable 過剰反応を回避、scope を限定)。
	     PH-issue-012: overflow-x-hidden で横スクロール禁止
	     (text は truncate / line-clamp で吸収、横 scrollbar は noise)。
	     PH-issue-032 / 検収項目 #3: pr-1.5 で縦 scrollbar と content の間に呼吸 (6px)。
	     旧実装は scrollbar-gutter:stable で gutter を確保していたが、
	     content が scrollbar に直接接していて読みづらい (item label / chevron 等)。 -->
	<div class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1.5 [scrollbar-gutter:stable]">
		{@render children()}
	</div>
</div>

<style>
.widget-shell {
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
	background-image: var(--ag-surface-tint);
}

.widget-shell:hover {
	box-shadow: var(--ag-widget-shadow-hover), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
</style>
