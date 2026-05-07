<script lang="ts">
import { onMount } from 'svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { listOpeners, type Opener } from '$lib/ipc/opener';
import {
	configStore,
	type LibraryCardBackgroundConfig,
	type LibraryCardStyleConfig,
} from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import type { Item } from '$lib/types/item';
import { type CardOverrideJson, parseCardOverride } from '$lib/utils/card-override';

/**
 * Library detail panel メタデータセクション (gradient preview + DetailRows + visibility + card override)。
 *
 * C-15 #10 + #19:
 * - per-card override に opener_id field (起動アプリ override、最優先 cascade)
 * - placeholder UI を実 UI に置換 (背景モード / focal / colors / overlay / stroke 編集可)
 */
interface Props {
	item: Item;
	onCardOverrideEnable: () => void;
	onCardOverrideResetRequest: () => void;
}

let { item, onCardOverrideEnable, onCardOverrideResetRequest }: Props = $props();

// Opener 一覧 (per-card opener override の select 用)。mount 時 1 回 fetch。
let openers = $state<Opener[]>([]);
onMount(() => {
	void listOpeners()
		.then((list) => {
			openers = list;
		})
		.catch(() => {
			// best-effort
		});
});

let cardOverride = $derived(parseCardOverride(item.card_override_json));
let currentOpenerId = $derived(cardOverride?.opener_id ?? '');

let bg = $derived({
	...configStore.libraryCard.background,
	...(cardOverride?.background ?? {}),
});
let style = $derived({
	...configStore.libraryCard.style,
	...(cardOverride?.style ?? {}),
});

// E-7 (2026-05-07 user 検収): preview の表示を LibraryCard と統一する。
// LibraryCard と同じ resolvedMode logic で image / fill / none を分岐。
let resolvedMode = $derived(bg.mode === 'image' && !item.icon_path ? 'fill' : bg.mode);

async function setOpenerId(value: string): Promise<void> {
	const next: CardOverrideJson = { ...(cardOverride ?? {}), opener_id: value || null };
	await itemStore.updateItem(item.id, { card_override_json: JSON.stringify(next) });
}

async function patchOverride(patch: {
	background?: Partial<LibraryCardBackgroundConfig>;
	style?: Partial<LibraryCardStyleConfig>;
}): Promise<void> {
	const current = cardOverride ?? {};
	const next: CardOverrideJson = {
		...current,
		background: { ...(current.background ?? {}), ...(patch.background ?? {}) },
		style: { ...(current.style ?? {}), ...(patch.style ?? {}) },
	};
	await itemStore.updateItem(item.id, { card_override_json: JSON.stringify(next) });
}
</script>

<!-- E-7 fix (2026-05-07 user 検収): preview を LibraryCard と同形式で render。
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

<!-- Visibility toggle (PH-291) -->
<label class="mt-4 flex items-start gap-2 text-sm text-[var(--ag-text-secondary)]">
	<input
		type="checkbox"
		class="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
		data-testid="visibility-toggle"
		checked={!item.is_enabled}
		onchange={(e) =>
			void itemStore.updateItem(item.id, {
				is_enabled: !(e.currentTarget as HTMLInputElement).checked,
			})}
	/>
	<span class="flex-1">
		<span class="block">ライブラリで非表示</span>
		<span class="mt-0.5 block text-xs text-[var(--ag-text-muted)]">
			非表示にすると <strong>検索（パレット / Library 一覧）</strong> と <strong>ウィジェット</strong> から外れます。データは残るため、再度表示に戻すことも可能です。
		</span>
	</span>
</label>

<!-- PH-290 + PH-297 + PH-340: per-card 設定 -->
<div class="mt-4 space-y-2 border-t border-[var(--ag-border)] pt-4">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<p class="text-sm font-medium text-[var(--ag-text-primary)]">カード表示</p>
				{#if item.card_override_json}
					<span
						class="rounded-full bg-[var(--ag-accent-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ag-accent-text)]"
						data-testid="card-override-badge"
					>
						個別調整中
					</span>
				{/if}
			</div>
			<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
				{item.card_override_json
					? 'このカードのみグローバル設定とは独立した表示が適用されています。'
					: 'Settings > Library のグローバル設定が適用されています。'}
			</p>
		</div>
		{#if item.card_override_json}
			<button
				type="button"
				data-testid="card-override-reset"
				class="shrink-0 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				aria-label="個別調整を解除してグローバル設定に戻す"
				onclick={() => onCardOverrideResetRequest()}
			>
				グローバル設定に戻す
			</button>
		{:else}
			<button
				type="button"
				data-testid="card-override-enable"
				class="shrink-0 rounded-lg border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-accent-active-bg)]"
				aria-label="このカードだけ個別調整を有効化"
				onclick={() => onCardOverrideEnable()}
			>
				このカードだけ個別調整
			</button>
		{/if}
	</div>
	{#if item.card_override_json}
		<!-- C-15 #10 + #19: 起動アプリ Opener override (cascade で最優先)。 -->
		<div class="mt-3 space-y-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-opener">
				起動アプリ (Opener override)
			</label>
			<select
				id="card-opener"
				class="w-full rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				value={currentOpenerId}
				onchange={(e) => void setOpenerId((e.currentTarget as HTMLSelectElement).value)}
			>
				<option value="">既定 (system) / item.default_app に従う</option>
				{#each openers as op (op.id)}
					<option value={op.id}>{op.name}{op.is_builtin ? ' (組み込み)' : ''}</option>
				{/each}
			</select>
			<p class="text-xs text-[var(--ag-text-muted)]">
				このカードのみ指定 Opener で起動。Library / Workspace 両方の click 起動に効く。
			</p>
		</div>
		<!-- C-15 #10: per-card override 編集 UI (主要項目)。 -->
		<div class="mt-3 space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<div class="space-y-1">
				<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-bg-mode">
					背景モード
				</label>
				<select
					id="card-bg-mode"
					class="w-full rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					value={bg.mode}
					onchange={(e) =>
						void patchOverride({
							background: {
								mode: (e.currentTarget as HTMLSelectElement).value as
									| 'image'
									| 'fill'
									| 'none',
							},
						})}
				>
					<option value="image">画像 (アイコンを全面表示)</option>
					<option value="fill">塗りつぶし (背景色 + 中央アイコン)</option>
					<option value="none">なし (グラデーション)</option>
				</select>
			</div>
			{#if bg.mode === 'image'}
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-focal-x">画像位置 X</label>
						<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{bg.focalX}%</span>
					</div>
					<input
						id="card-focal-x"
						type="range"
						min="0"
						max="100"
						step="5"
						value={bg.focalX}
						oninput={(e) =>
							void patchOverride({
								background: { focalX: Number((e.currentTarget as HTMLInputElement).value) },
							})}
						class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
					/>
				</div>
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-focal-y">画像位置 Y</label>
						<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{bg.focalY}%</span>
					</div>
					<input
						id="card-focal-y"
						type="range"
						min="0"
						max="100"
						step="5"
						value={bg.focalY}
						oninput={(e) =>
							void patchOverride({
								background: { focalY: Number((e.currentTarget as HTMLInputElement).value) },
							})}
						class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
					/>
				</div>
			{:else if bg.mode === 'fill'}
				<div class="space-y-1">
					<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-fill-bg">背景色</label>
					<input
						id="card-fill-bg"
						type="color"
						class="h-8 w-full cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
						value={bg.fillBgColor}
						onchange={(e) =>
							void patchOverride({
								background: { fillBgColor: (e.currentTarget as HTMLInputElement).value },
							})}
					/>
				</div>
				<div class="space-y-1">
					<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-fill-icon">アイコン色</label>
					<input
						id="card-fill-icon"
						type="color"
						class="h-8 w-full cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
						value={bg.fillIconColor}
						onchange={(e) =>
							void patchOverride({
								background: { fillIconColor: (e.currentTarget as HTMLInputElement).value },
							})}
					/>
				</div>
			{/if}
			<div class="space-y-1">
				<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-text-color">ラベル文字色</label>
				<input
					id="card-text-color"
					type="color"
					class="h-8 w-full cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
					value={style.textColor}
					onchange={(e) =>
						void patchOverride({
							style: { textColor: (e.currentTarget as HTMLInputElement).value },
						})}
				/>
			</div>
			<label class="flex cursor-pointer items-center gap-2 text-xs text-[var(--ag-text-secondary)]">
				<input
					type="checkbox"
					class="h-3.5 w-3.5 cursor-pointer accent-[var(--ag-accent)]"
					checked={style.overlayEnabled}
					onchange={(e) =>
						void patchOverride({
							style: { overlayEnabled: (e.currentTarget as HTMLInputElement).checked },
						})}
				/>
				<span>下部にグラデーションオーバーレイを表示</span>
			</label>
			<label class="flex cursor-pointer items-center gap-2 text-xs text-[var(--ag-text-secondary)]">
				<input
					type="checkbox"
					class="h-3.5 w-3.5 cursor-pointer accent-[var(--ag-accent)]"
					checked={style.strokeEnabled}
					onchange={(e) =>
						void patchOverride({
							style: { strokeEnabled: (e.currentTarget as HTMLInputElement).checked },
						})}
				/>
				<span>ラベル文字に縁取りを付ける</span>
			</label>
			{#if style.strokeEnabled}
				<div class="space-y-1">
					<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-stroke-color">縁取り色</label>
					<input
						id="card-stroke-color"
						type="color"
						class="h-8 w-full cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
						value={style.strokeColor}
						onchange={(e) =>
							void patchOverride({
								style: { strokeColor: (e.currentTarget as HTMLInputElement).value },
							})}
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>
