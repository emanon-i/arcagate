<script lang="ts">
import { Info } from '@lucide/svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';
import { parseCardOverride } from '$lib/utils/card-override';

/**
 * Library detail panel メタデータセクション (preview + DetailRows + visibility)。
 *
 * E-3 (2026-05-07 user 検収): カード表示設定 section は ItemFormDialog の編集モーダルへ移植
 * (`ItemFormCardOverride.svelte`)。本 component は preview + 詳細表示 + 非表示 toggle のみに簡素化。
 *
 * E-7 (2026-05-07 user 検収): preview の表示を LibraryCard と統一する (image / fill / none で分岐)。
 */
interface Props {
	item: Item;
}

let { item }: Props = $props();

let cardOverride = $derived(parseCardOverride(item.card_override_json));

let bg = $derived({
	...configStore.libraryCard.background,
	...(cardOverride?.background ?? {}),
});

// E-7: LibraryCard と同じ resolvedMode logic で image / fill / none を分岐。
let resolvedMode = $derived(bg.mode === 'image' && !item.icon_path ? 'fill' : bg.mode);

// F-3 (2026-05-08 user 検収): 「ライブラリで非表示」 toggle の長文説明を info icon に
// 折り畳む。default 折畳 (showHideDescription=false)、icon click で expand。
let showHideDescription = $state(false);
</script>

<!-- E-7 (2026-05-07 user 検収): preview を LibraryCard と同形式で render。
     image mode は icon を全面 cover (focal 反映)、fill は色 + 中央 icon、none は gradient + icon。
     LibraryCard 内 logic と同等、card_override 反映で見た目統一。 -->
<div
	class="relative flex h-40 items-center justify-center overflow-hidden rounded-[var(--ag-radius-widget)] {resolvedMode ===
	'none'
		? `bg-gradient-to-br ${artMap[item.item_type]}`
		: ''}"
>
	{#if resolvedMode === 'image' && item.icon_path}
		<ItemIcon
			iconPath={item.icon_path}
			itemType={item.item_type}
			alt="{item.label} icon"
			class="absolute inset-0 h-full w-full object-cover"
			style="object-position: {bg.focalX}% {bg.focalY}%;"
		/>
	{:else if resolvedMode === 'fill'}
		<div
			class="absolute inset-0 flex items-center justify-center"
			style="background: {bg.fillBgColor};"
		>
			<ItemIcon
				iconPath={undefined}
				itemType={item.item_type}
				alt="{item.label} icon"
				class="h-20 w-20 object-contain drop-shadow-lg"
				style="color: {bg.fillIconColor};"
			/>
		</div>
	{:else}
		<ItemIcon
			iconPath={undefined}
			itemType={item.item_type}
			alt="{item.label} icon"
			class="h-20 w-20 object-contain drop-shadow-sm"
		/>
	{/if}
</div>

<!-- Detail rows -->
<div class="mt-4 space-y-2 text-sm">
	<DetailRow label="種別" value={typeLabel[item.item_type]} />
	<DetailRow label="ターゲット" value={item.target} />
	{#if item.aliases.length > 0}
		<DetailRow label="別名" value={item.aliases.join(', ')} />
	{/if}
	{#if item.args}
		<DetailRow label="引数" value={item.args} />
	{/if}
</div>

<!-- Visibility toggle (PH-291)。F-3 (2026-05-08): 説明文を info icon (click で expand) に折り畳み。 -->
<div class="mt-4 flex items-start gap-2 text-sm text-[var(--ag-text-secondary)]">
	<input
		type="checkbox"
		class="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
		data-testid="visibility-toggle"
		id="visibility-toggle-checkbox"
		checked={!item.is_enabled}
		onchange={(e) =>
			void itemStore.updateItem(item.id, {
				is_enabled: !(e.currentTarget as HTMLInputElement).checked,
			})}
	/>
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-1.5">
			<label class="cursor-pointer" for="visibility-toggle-checkbox">ライブラリで非表示</label>
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
				aria-label="非表示の説明"
				aria-expanded={showHideDescription}
				title="クリックで詳細表示"
				onclick={() => (showHideDescription = !showHideDescription)}
			>
				<Info class="h-3.5 w-3.5" />
			</button>
		</div>
		{#if showHideDescription}
			<p class="mt-1 text-xs text-[var(--ag-text-muted)]">
				非表示にすると <strong>検索（パレット / Library 一覧）</strong> と <strong>ウィジェット</strong> から外れます。データは残るため、再度表示に戻すことも可能です。
			</p>
		{/if}
	</div>
</div>
