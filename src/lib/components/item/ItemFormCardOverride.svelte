<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { t } from '$lib/i18n.svelte';
import {
	configStore,
	DEFAULT_CARD_BACKGROUND,
	type LibraryCardBackgroundConfig,
	type LibraryCardRotation,
	type LibraryCardStyleConfig,
} from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import {
	type CardOverrideJson,
	hasAppearanceOverride,
	parseCardOverride,
	serializeCardOverride,
} from '$lib/utils/card-override';
import { getErrorMessage } from '$lib/utils/format-error';

/**
 * カード見た目設定モーダルの編集 UI。
 *
 * 構成 (上から): アイコン → 画像の表示 (回転 + 位置) → ラベル設定。
 * 起動アプリ (Opener override) は「見た目」ではないため本モーダルから撤去、
 * Library カードの右クリックメニューへ移設した (card_override_json.opener_id は維持)。
 *
 * 画像の表示モード選択 (cover / contain / center) は撤廃。background override を持つ
 * カードは常に全面 cover 表示で、回転 (0/90/180/270°) と位置 (offsetX/Y) のみ調整する。
 *
 * 即時保存: itemStore.updateItem を直接呼ぶ (form の onSubmit と独立、instant feedback)。
 */

interface Props {
	item: Item;
}

let { item }: Props = $props();

let cardOverride = $derived(parseCardOverride(item.card_override_json));
// 「見た目設定中」 = background / style が在る状態。opener_id 単独では見た目扱いしない。
let appearanceActive = $derived(hasAppearanceOverride(item.card_override_json));

let bg = $derived({
	...DEFAULT_CARD_BACKGROUND,
	...(cardOverride?.background ?? {}),
});
let style = $derived({
	...configStore.libraryCard.style,
	...(cardOverride?.style ?? {}),
});

let resetConfirmOpen = $state(false);

const ROTATIONS: LibraryCardRotation[] = [0, 90, 180, 270];

// offset slider: drag 中は local draft で thumb / 数値ラベルを追従させ、persist は release
// (onchange) のみ。oninput ごとに updateItem を呼ぶと IPC 殺到 + 解決順逆転で「drag した
// 位置と違う値が確定する」不具合になる (#531)。実値は下の $effect が bg から同期する。
let offsetXDraft = $state(DEFAULT_CARD_BACKGROUND.offsetX);
let offsetYDraft = $state(DEFAULT_CARD_BACKGROUND.offsetY);
$effect(() => {
	offsetXDraft = bg.offsetX;
});
$effect(() => {
	offsetYDraft = bg.offsetY;
});

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
	await itemStore.updateItem(item.id, { card_override_json: serializeCardOverride(next) });
}

function enableOverride(): void {
	// opener_id は維持したまま background / style を初期値で付与する。
	const next = serializeCardOverride({
		...(cardOverride ?? {}),
		background: { ...DEFAULT_CARD_BACKGROUND },
		style: { ...configStore.libraryCard.style },
	});
	void itemStore.updateItem(item.id, { card_override_json: next });
	toastStore.add(t('toast.appearance_settings_started'), 'success');
}

function resetOverride(): void {
	// 見た目 (background / style) のみ解除、起動アプリ override は残す。
	resetConfirmOpen = false;
	const next = serializeCardOverride({ opener_id: cardOverride?.opener_id ?? null });
	void itemStore.updateItem(item.id, { card_override_json: next });
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
	if (!selected) return;
	try {
		// 生の picker path は asset protocol scope (`$APPDATA/icons/**`) 外で webview が
		// 描画できないため、`$APPDATA/icons/` へ copy した path を icon_path に保存する。
		const saved = await invoke<string>('cmd_save_icon_file', {
			sourcePath: selected as string,
		});
		await itemStore.updateItem(item.id, { icon_path: saved });
		toastStore.add(t('toast.icon_changed'), 'success');
	} catch (e) {
		toastStore.add(t('toast.icon_save_failed', { error: getErrorMessage(e) }), 'error');
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
				{#if appearanceActive}
					<span
						class="rounded-full bg-[var(--ag-accent-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ag-accent-text)]"
						data-testid="card-override-badge"
					>
						{t('item.appearance_settings.badge_active')}
					</span>
				{/if}
			</div>
			<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
				{appearanceActive
					? t('item.appearance_settings.desc_overriding')
					: t('item.appearance_settings.desc_global')}
			</p>
		</div>
		{#if appearanceActive}
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
	{#if appearanceActive}
		<!-- 画像の表示: 回転 (90° 刻み) + 位置 -->
		<div class="mt-3 space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<p class="text-xs font-semibold text-[var(--ag-text-secondary)]">{t('item.appearance_settings.section_image')}</p>
			<div class="space-y-1">
				<span class="text-xs font-medium text-[var(--ag-text-secondary)]">{t('item.appearance_settings.rotation_label')}</span>
				<div class="flex gap-1" role="group" aria-label={t('item.appearance_settings.rotation_label')}>
					{#each ROTATIONS as deg (deg)}
						<button
							type="button"
							data-testid="card-override-rotation-{deg}"
							aria-pressed={bg.rotation === deg}
							class="flex-1 rounded-md border px-2 py-1 text-sm tabular-nums transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {bg.rotation ===
							deg
								? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
								: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
							onclick={() => void patchOverride({ background: { rotation: deg } })}
						>
							{deg}°
						</button>
					{/each}
				</div>
			</div>
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-offset-x">{t('item.appearance_settings.offset_x_label')}</label>
					<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{offsetXDraft}%</span>
				</div>
				<input
					id="card-offset-x"
					type="range"
					min="0"
					max="100"
					step="5"
					value={offsetXDraft}
					data-testid="card-override-offset-x"
					oninput={(e) => (offsetXDraft = Number((e.currentTarget as HTMLInputElement).value))}
					onchange={(e) =>
						void patchOverride({
							background: { offsetX: Number((e.currentTarget as HTMLInputElement).value) },
						})}
					class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
				/>
			</div>
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="card-offset-y">{t('item.appearance_settings.offset_y_label')}</label>
					<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{offsetYDraft}%</span>
				</div>
				<input
					id="card-offset-y"
					type="range"
					min="0"
					max="100"
					step="5"
					value={offsetYDraft}
					data-testid="card-override-offset-y"
					oninput={(e) => (offsetYDraft = Number((e.currentTarget as HTMLInputElement).value))}
					onchange={(e) =>
						void patchOverride({
							background: { offsetY: Number((e.currentTarget as HTMLInputElement).value) },
						})}
					class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
				/>
			</div>
		</div>
		<!-- ラベル設定: 文字色 / オーバーレイ / 縁取り -->
		<div class="mt-3 space-y-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<p class="text-xs font-semibold text-[var(--ag-text-secondary)]">{t('item.appearance_settings.section_label')}</p>
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
