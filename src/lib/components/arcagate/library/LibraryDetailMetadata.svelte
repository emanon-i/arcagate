<script lang="ts">
import { Info } from '@lucide/svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { typeLabel } from '$lib/constants/item-type';
import { t } from '$lib/i18n.svelte';
import { DEFAULT_CARD_BACKGROUND } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';
import { cardRotationTransform, parseCardOverride } from '$lib/utils/card-override';

/**
 * Library detail panel メタデータセクション (preview + DetailRows + visibility)。
 *
 * E-3 (2026-05-07 user 検収): カード表示設定 section は ItemFormDialog の編集モーダルへ移植
 * (`ItemFormCardOverride.svelte`)。本 component は preview + 詳細表示 + 非表示 toggle のみに簡素化。
 *
 * E-7 (2026-05-07 user 検収): preview の表示を LibraryCard と統一する。
 */
interface Props {
	item: Item;
}

let { item }: Props = $props();

let cardOverride = $derived(parseCardOverride(item.card_override_json));

let bg = $derived({
	...DEFAULT_CARD_BACKGROUND,
	...(cardOverride?.background ?? {}),
});

// LibraryCard と同じ logic: override の background + icon_path で全面 cover 表示。
let isFullBleed = $derived(!!cardOverride?.background && !!item.icon_path);

// LibraryCard と同じ object-position + 90 度刻み回転。
let bgImageStyle = $derived.by(() => {
	const transform = cardRotationTransform(bg.rotation);
	return `object-position: ${bg.offsetX}% ${bg.offsetY}%;${
		transform ? ` transform: ${transform};` : ''
	}`;
});

// F-3 (2026-05-08 user 検収): 「ライブラリで非表示」 toggle の長文説明を info icon に
// 折り畳む。default 折畳 (showHideDescription=false)、icon click で expand。
let showHideDescription = $state(false);
</script>

<!-- preview を LibraryCard と同形式で render: override 有り = 全面 cover (offset / rotation
     反映)、override 無し = 共通 surface + 中央アイコン。aspect 4:3 で実カードと同形。 -->
<div
	class="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[var(--ag-radius-widget)] bg-[var(--ag-surface-3)]"
>
	{#if isFullBleed}
		<ItemIcon
			iconPath={item.icon_path}
			itemType={item.item_type}
			alt="{item.label} icon"
			class="absolute inset-0 h-full w-full object-cover"
			style={bgImageStyle}
		/>
	{:else}
		<ItemIcon
			iconPath={item.icon_path}
			itemType={item.item_type}
			alt="{item.label} icon"
			class="h-20 w-20 object-contain drop-shadow-sm"
		/>
	{/if}
</div>

<!-- Detail rows -->
<div class="mt-4 space-y-2 text-sm">
	<DetailRow label={t('library.detail.type_label')} value={typeLabel[item.item_type]} />
	<DetailRow label={t('library.detail.target_label')} value={item.target} />
	{#if item.aliases.length > 0}
		<DetailRow label={t('library.detail.alias_label')} value={item.aliases.join(', ')} />
	{/if}
	{#if item.args}
		<DetailRow label={t('library.detail.args_label')} value={item.args} />
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
			<label class="cursor-pointer" for="visibility-toggle-checkbox">{t('library.detail.hide_label')}</label>
			<button
				type="button"
				class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
				aria-label={t('library.detail.hide_desc_aria')}
				aria-expanded={showHideDescription}
				title={t('library.detail.hide_info_tooltip')}
				onclick={() => (showHideDescription = !showHideDescription)}
			>
				<Info class="h-3.5 w-3.5" />
			</button>
		</div>
		{#if showHideDescription}
			<p class="mt-1 text-xs text-[var(--ag-text-muted)]">
				{t('library.detail.hide_description')}
			</p>
		{/if}
	</div>
</div>
