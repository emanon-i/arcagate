<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
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
import { type CardOverrideJson, parseCardOverride } from '$lib/utils/card-override';
import { getErrorMessage } from '$lib/utils/format-error';

/**
 * カード見た目設定 modal の編集 UI。
 *
 * 起動の前提: 本 component は per-card override が **有効**な item に対してのみ描画される
 * (LibraryDetailPanel の checkbox = ON / 歯車 button が enable の時のみ歯車押下で modal を開く)。
 * Reset (= global default に戻す) は右サイドバーの checkbox を OFF にして実現するため、
 * 本 modal 内には reset 経路を持たない (2026-05-20 user 指示)。
 *
 * section 構成 (2026-05-20 user 指示):
 * 1. 画像 — picker + 90 度刻み回転 + 横位置 / 縦位置 (旧「アイコン」 + 「画像の表示」 を統合)
 * 2. ラベル設定 — textColor / overlayEnabled / strokeEnabled / strokeColor
 *
 * spacing で section を区切り、 罫線 / 内側 box 枠は持たない (glass デザインの subtle 階層に整合)。
 *
 * 即時保存:
 * - button / checkbox / color picker: onchange で itemStore.updateItem (即 IPC + persist)
 * - slider (横位置 / 縦位置): oninput で itemStore.applyOptimisticUpdate (in-memory のみ、
 *   LibraryCard 本体 / 各 preview を同 store 経由で live 反映)、 release 時 onchange で
 *   itemStore.updateItem を 1 回 IPC して persist。 drag 中 IPC 殺到による race condition
 *   (「drag した位置と違う値が確定する」) を回避しつつ live preview を達成。
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
let style = $derived({
	...configStore.libraryCard.style,
	...(cardOverride?.style ?? {}),
});

const ROTATIONS: readonly LibraryCardRotation[] = [0, 90, 180, 270];

function buildPatchJson(patch: {
	background?: Partial<LibraryCardBackgroundConfig>;
	style?: Partial<LibraryCardStyleConfig>;
}): string {
	const current = cardOverride ?? {};
	const next: CardOverrideJson = {
		...current,
		background: { ...(current.background ?? {}), ...(patch.background ?? {}) },
		style: { ...(current.style ?? {}), ...(patch.style ?? {}) },
	};
	return JSON.stringify(next);
}

/** in-memory のみ反映 (drag 中の live preview 用)。 */
function optimisticPatch(patch: {
	background?: Partial<LibraryCardBackgroundConfig>;
	style?: Partial<LibraryCardStyleConfig>;
}): void {
	itemStore.applyOptimisticUpdate(item.id, { card_override_json: buildPatchJson(patch) });
}

/** IPC + persist。 button / checkbox / slider release 時 (onchange) で呼ぶ。 */
async function patchOverride(patch: {
	background?: Partial<LibraryCardBackgroundConfig>;
	style?: Partial<LibraryCardStyleConfig>;
}): Promise<void> {
	await itemStore.updateItem(item.id, { card_override_json: buildPatchJson(patch) });
}

async function selectImage(): Promise<void> {
	const selected = await open({
		multiple: false,
		filters: [
			{
				name: t('item.appearance_settings.filter_image'),
				extensions: ['png', 'ico', 'jpg', 'jpeg', 'svg', 'webp'],
			},
		],
	});
	if (!selected) return;
	try {
		// 生の picker path は asset protocol scope (`$APPDATA/icons/**`) 外で webview が
		// 描画できないため、 `$APPDATA/icons/` へ copy した path を icon_path に保存する。
		const saved = await invoke<string>('cmd_save_icon_file', {
			sourcePath: selected as string,
		});
		await itemStore.updateItem(item.id, { icon_path: saved });
		toastStore.add(t('toast.icon_changed'), 'success');
	} catch (e) {
		toastStore.add(t('toast.icon_save_failed', { error: getErrorMessage(e) }), 'error');
	}
}

async function clearImage(): Promise<void> {
	await itemStore.updateItem(item.id, { icon_path: null });
	toastStore.add(t('toast.icon_removed'), 'info');
}
</script>

<div class="space-y-5">
	<!-- 画像 section: picker + 回転 + 位置 (旧「アイコン」 + 「画像の表示」 を統合) -->
	<div class="space-y-3">
		<p class="text-sm font-semibold text-[var(--ag-text-primary)]">
			{t('item.appearance_settings.image_section_label')}
		</p>
		<div class="flex items-center gap-3">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
			>
				{#if item.icon_path}
					<ItemIcon iconPath={item.icon_path} alt={t('item.appearance_settings.image_section_label')} class="h-16 w-16 object-contain" />
				{:else}
					<span class="text-xs text-[var(--ag-text-muted)]">{t('item.appearance_settings.image_none')}</span>
				{/if}
			</div>
			<button
				type="button"
				class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
				data-testid="card-override-image-select"
				onclick={() => void selectImage()}
			>
				{t('item.appearance_settings.image_select')}
			</button>
			{#if item.icon_path}
				<button
					type="button"
					class="text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:text-destructive"
					onclick={() => void clearImage()}
				>
					{t('common.delete')}
				</button>
			{/if}
		</div>

		<div class="space-y-1">
			<span class="text-xs font-medium text-[var(--ag-text-secondary)]">
				{t('item.appearance_settings.rotation_label')}
			</span>
			<div
				class="flex gap-1"
				role="group"
				aria-label={t('item.appearance_settings.rotation_label')}
				data-testid="card-override-rotation"
			>
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
						{t('item.appearance_settings.rotation_deg', { deg })}
					</button>
				{/each}
			</div>
		</div>

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
					optimisticPatch({
						background: { offsetX: Number((e.currentTarget as HTMLInputElement).value) },
					})}
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
					optimisticPatch({
						background: { offsetY: Number((e.currentTarget as HTMLInputElement).value) },
					})}
				onchange={(e) =>
					void patchOverride({
						background: { offsetY: Number((e.currentTarget as HTMLInputElement).value) },
					})}
				class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent)]"
			/>
		</div>
	</div>

	<!-- ラベル設定 section -->
	<div class="space-y-3">
		<p class="text-sm font-semibold text-[var(--ag-text-primary)]">
			{t('item.appearance_settings.label_section_label')}
		</p>
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
</div>
