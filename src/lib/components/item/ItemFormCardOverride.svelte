<script lang="ts">
import { open } from '@tauri-apps/plugin-dialog';
import { onMount } from 'svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { listOpeners, type Opener } from '$lib/ipc/opener';
import {
	configStore,
	type LibraryCardBackgroundConfig,
	type LibraryCardStyleConfig,
} from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
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
 * - "個別調整中" badge (override 有効時)
 * - "このカードだけ個別調整" / "グローバル設定に戻す" toggle button
 * - override 有効時のみ展開:
 *   - 起動アプリ Opener override select
 *   - 背景モード select (image / fill / none)
 *   - image 時: focalX / focalY slider
 *   - fill 時: fillBgColor / fillIconColor color picker
 *   - 共通: textColor / overlayEnabled / strokeEnabled / strokeColor
 * - リセット確認 ConfirmDialog (内蔵)
 *
 * 即時保存: itemStore.updateItem を直接呼ぶ (form の onSubmit と独立、instant feedback)。
 */

interface Props {
	item: Item;
}

let { item }: Props = $props();

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
		background: configStore.libraryCard.background,
		style: configStore.libraryCard.style,
	});
	void itemStore.updateItem(item.id, { card_override_json: current });
	toastStore.add('このカードだけ個別調整を開始しました', 'success');
}

function resetOverride(): void {
	resetConfirmOpen = false;
	void itemStore.updateItem(item.id, { card_override_json: null });
	toastStore.add('個別調整を解除しました', 'success');
}

// G-6 (2026-05-09 user 検収): ItemForm からアイコン編集を移植。
// アイコンはアイテム本体属性ではなく「カードの見た目」に属する整理。
// 現状は item.icon_path 単一 column (per-card override icon は future work)。
async function selectIcon(): Promise<void> {
	const selected = await open({
		multiple: false,
		filters: [{ name: 'アイコン画像', extensions: ['png', 'ico', 'jpg', 'jpeg', 'svg', 'webp'] }],
	});
	if (selected) {
		await itemStore.updateItem(item.id, { icon_path: selected as string });
		toastStore.add('アイコンを変更しました', 'success');
	}
}

async function clearIcon(): Promise<void> {
	await itemStore.updateItem(item.id, { icon_path: null });
	toastStore.add('アイコンを削除しました', 'info');
}
</script>

<!-- G-6 (2026-05-09 user 検収): icon 編集 UI を ItemForm から移植。
     override toggle の上 (常時 visible) に配置し、いつでも item.icon_path を変更可能。 -->
<div class="space-y-2">
	<span class="text-sm font-medium text-[var(--ag-text-primary)]">アイコン</span>
	<div class="flex items-center gap-3">
		<div
			class="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
		>
			{#if item.icon_path}
				<ItemIcon iconPath={item.icon_path} alt="アイコン" class="h-16 w-16 object-contain" />
			{:else}
				<span class="text-xs text-[var(--ag-text-muted)]">なし</span>
			{/if}
		</div>
		<button
			type="button"
			class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
			data-testid="card-override-icon-select"
			onclick={() => void selectIcon()}
		>
			アイコンを選択
		</button>
		{#if item.icon_path}
			<button
				type="button"
				class="text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:text-destructive"
				onclick={() => void clearIcon()}
			>
				削除
			</button>
		{/if}
	</div>
</div>

<div class="space-y-2 border-t border-[var(--ag-border)] pt-4">
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
				onclick={() => (resetConfirmOpen = true)}
			>
				グローバル設定に戻す
			</button>
		{:else}
			<button
				type="button"
				data-testid="card-override-enable"
				class="shrink-0 rounded-lg border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-accent-active-bg)]"
				aria-label="このカードだけ個別調整を有効化"
				onclick={enableOverride}
			>
				このカードだけ個別調整
			</button>
		{/if}
	</div>
	{#if item.card_override_json}
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
								mode: (e.currentTarget as HTMLSelectElement).value as 'image' | 'fill' | 'none',
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

<ConfirmDialog
	open={resetConfirmOpen}
	title="個別調整を解除しますか？"
	description="このカードの個別表示設定が失われ、Settings > Library のグローバル設定が適用されます。"
	confirmLabel="解除する"
	confirmVariant="destructive"
	onConfirm={resetOverride}
	onCancel={() => (resetConfirmOpen = false)}
/>
