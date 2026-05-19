<script lang="ts">
import { open } from '@tauri-apps/plugin-dialog';
import { onMount } from 'svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { t } from '$lib/i18n.svelte';
import type { Opener } from '$lib/ipc/opener';
import {
	CARD_OVERRIDE_INITIAL_BACKGROUND,
	configStore,
	DEFAULT_CARD_BACKGROUND,
	type LibraryCardBackgroundConfig,
	type LibraryCardImageFit,
	type LibraryCardStyleConfig,
} from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { openersStore } from '$lib/state/openers.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { type CardOverrideJson, parseCardOverride } from '$lib/utils/card-override';

/**
 * E-3 (2026-05-07 user 検収): カード表示設定を detail panel から ItemForm modal へ移植。
 *
 * 旧: LibraryDetailMetadata の "カード表示" section に背景モード / focal / colors / overlay /
 *     stroke / Opener override を全部詰め込んでいて、panel 横幅圧迫 + UX 一貫性が低い
 *     (他項目はモーダル編集なのにカード表示だけ panel 内 inline 編集)。
 * 新: 編集モーダル (ItemFormDialog) の中の section として統合。 panel は preview + 詳細
 *     表示のみに簡素化、編集は全てモーダルで完結。
 *
 * 仕様 (LibraryDetailMetadata から移植):
 * - "見た目設定中" badge (override 有効時)
 * - "このカードだけ見た目設定" / "グローバル設定に戻す" toggle button
 * - override 有効時のみ展開:
 *   - 起動アプリ Opener override select
 *   - 画像の表示 select (cover / contain / center)
 *   - cover / contain 時: offsetX / offsetY slider
 *   - 共通: textColor / overlayEnabled / strokeEnabled / strokeColor
 * - リセット確認 ConfirmDialog (内蔵)
 *
 * 即時保存: itemStore.updateItem を直接呼ぶ (form の onSubmit と独立、instant feedback)。
 */

interface Props {
	item: Item;
}

let { item }: Props = $props();

// audit 2026-05-13 G4: shared openersStore 経由 fetch。
// Codex Round 3 fix: error 時は best-effort (空 list)。
let openers = $state<Opener[]>([]);
onMount(() => {
	openersStore
		.load()
		.then((list) => {
			openers = list;
		})
		.catch(() => {
			// best-effort: OpenerSettings 経路で error UI を出す。
		});
});

let cardOverride = $derived(parseCardOverride(item.card_override_json));
let currentOpenerId = $derived(cardOverride?.opener_id ?? '');

let bg = $derived({
	...DEFAULT_CARD_BACKGROUND,
	...(cardOverride?.background ?? {}),
});
let style = $derived({
	...configStore.libraryCard.style,
	...(cardOverride?.style ?? {}),
});

let resetConfirmOpen = $state(false);

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

function enableOverride(): void {
	const current = JSON.stringify({
		background: CARD_OVERRIDE_INITIAL_BACKGROUND,
		style: configStore.libraryCard.style,
	});
	void itemStore.updateItem(item.id, { card_override_json: current });
	toastStore.add(t('toast.appearance_settings_started'), 'success');
}

function resetOverride(): void {
	resetConfirmOpen = false;
	void itemStore.updateItem(item.id, { card_override_json: null });
	toastStore.add(t('toast.appearance_settings_cleared'), 'success');
}

// G-6 (2026-05-09 user 検収): ItemForm からアイコン編集を移植。
// アイコンはアイテム本体属性ではなく「カードの見た目」に属する整理。
// 現状は item.icon_path 単一 column (per-card override icon は future work)。
async function selectIcon(): Promise<void> {
	const selected = await open({
		multiple: false,
		filters: [
			{
				name: t('item.appearance_settings.filter_icon_image'),
				extensions: ['png', 'ico', 'jpg', 'jpeg', 'svg', 'webp'],
			},
		],
	});
	if (selected) {
		await itemStore.updateItem(item.id, { icon_path: selected as string });
		toastStore.add(t('toast.icon_changed'), 'success');
	}
}

async function clearIcon(): Promise<void> {
	await itemStore.updateItem(item.id, { icon_path: null });
	toastStore.add(t('toast.icon_removed'), 'info');
}
</script>

<!-- G-6 (2026-05-09 user 検収): icon 編集 UI を ItemForm から移植。
     override toggle の上 (常時 visible) に配置し、いつでも item.icon_path を変更可能。 -->
<div class="space-y-2">
	<span class="text-sm font-medium text-[var(--ag-text-primary)]">{t('item.appearance_settings.icon_label')}</span>
	<div class="flex items-center gap-3">
		<div
			class="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
		>
			{#if item.icon_path}
				<ItemIcon iconPath={item.icon_path} alt={t('item.appearance_settings.icon_label')} class="h-16 w-16 object-contain" />
			{:else}
				<span class="text-xs text-[var(--ag-text-muted)]">{t('item.appearance_settings.icon_none')}</span>
			{/if}
		</div>
		<button
			type="button"
			class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
			data-testid="card-override-icon-select"
			onclick={() => void selectIcon()}
		>
			{t('item.appearance_settings.icon_select')}
		</button>
		{#if item.icon_path}
			<button
				type="button"
				class="text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:text-destructive"
				onclick={() => void clearIcon()}
			>
				{t('common.delete')}
			</button>
		{/if}
	</div>
</div>

<div class="space-y-2 border-t border-[var(--ag-border)] pt-4">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<p class="text-sm font-medium text-[var(--ag-text-primary)]">{t('item.appearance_settings.card_display_label')}</p>
				{#if item.card_override_json}
					<span
						class="rounded-full bg-[var(--ag-accent-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ag-accent-text)]"
						data-testid="card-override-badge"
					>
						{t('item.appearance_settings.badge_active')}
					</span>
				{/if}
			</div>
			<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
				{item.card_override_json
					? t('item.appearance_settings.desc_overriding')
					: t('item.appearance_settings.desc_global')}
			</p>
		</div>
		{#if item.card_override_json}
			<button
				type="button"
				data-testid="card-override-reset"
				class="shrink-0 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
				aria-label={t('item.appearance_settings.reset_aria')}
				onclick={() => (resetConfirmOpen = true)}
			>
				{t('item.appearance_settings.reset_button')}
			</button>
		{:else}
			<button
				type="button"
				data-testid="card-override-enable"
				class="shrink-0 rounded-lg border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-accent-active-bg)]"
				aria-label={t('item.appearance_settings.enable_aria')}
				onclick={enableOverride}
			>
				{t('item.appearance_settings.enable_button')}
			</button>
		{/if}
	</div>
	{#if item.card_override_json}
		<div class="mt-3 space-y-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-opener">
				{t('item.appearance_settings.opener_label')}
			</label>
			<select
				id="card-opener"
				class="w-full rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				value={currentOpenerId}
				onchange={(e) => void setOpenerId((e.currentTarget as HTMLSelectElement).value)}
			>
				<option value="">{t('item.appearance_settings.opener_default')}</option>
				{#each openers as op (op.id)}
					<option value={op.id}>{op.name}{op.is_builtin ? ` (${t('item.appearance_settings.opener_builtin')})` : ''}</option>
				{/each}
			</select>
			<p class="text-xs text-[var(--ag-text-muted)]">
				{t('item.appearance_settings.opener_desc')}
			</p>
		</div>
		<div class="mt-3 space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<div class="space-y-1">
				<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-bg-fit">
					{t('item.appearance_settings.fit_label')}
				</label>
				<select
					id="card-bg-fit"
					class="w-full rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2 py-1 text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					data-testid="card-override-fit"
					value={bg.fit}
					onchange={(e) =>
						void patchOverride({
							background: {
								fit: (e.currentTarget as HTMLSelectElement).value as LibraryCardImageFit,
							},
						})}
				>
					<option value="cover">{t('item.appearance_settings.fit_cover')}</option>
					<option value="contain">{t('item.appearance_settings.fit_contain')}</option>
					<option value="center">{t('item.appearance_settings.fit_center')}</option>
				</select>
			</div>
			{#if bg.fit !== 'center'}
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-offset-x">{t('item.appearance_settings.offset_x_label')}</label>
						<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{bg.offsetX}%</span>
					</div>
					<input
						id="card-offset-x"
						type="range"
						min="0"
						max="100"
						step="5"
						value={bg.offsetX}
						data-testid="card-override-offset-x"
						oninput={(e) =>
							void patchOverride({
								background: { offsetX: Number((e.currentTarget as HTMLInputElement).value) },
							})}
						class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
					/>
				</div>
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-offset-y">{t('item.appearance_settings.offset_y_label')}</label>
						<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{bg.offsetY}%</span>
					</div>
					<input
						id="card-offset-y"
						type="range"
						min="0"
						max="100"
						step="5"
						value={bg.offsetY}
						data-testid="card-override-offset-y"
						oninput={(e) =>
							void patchOverride({
								background: { offsetY: Number((e.currentTarget as HTMLInputElement).value) },
							})}
						class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
					/>
				</div>
			{/if}
			<div class="space-y-1">
				<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-text-color">{t('item.appearance_settings.text_color_label')}</label>
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
				<span>{t('item.appearance_settings.overlay_label')}</span>
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
				<span>{t('item.appearance_settings.stroke_label')}</span>
			</label>
			{#if style.strokeEnabled}
				<div class="space-y-1">
					<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-stroke-color">{t('item.appearance_settings.stroke_color_label')}</label>
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

<ConfirmDialog
	open={resetConfirmOpen}
	title={t('item.appearance_settings.confirm_reset_title')}
	description={t('item.appearance_settings.confirm_reset_desc')}
	confirmLabel={t('item.appearance_settings.confirm_reset_button')}
	confirmVariant="destructive"
	onConfirm={resetOverride}
	onCancel={() => (resetConfirmOpen = false)}
/>
