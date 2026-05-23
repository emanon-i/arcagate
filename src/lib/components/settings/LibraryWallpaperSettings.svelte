<script lang="ts">
import { Image as ImageIcon, Trash2, Upload } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { onMount } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { saveWallpaperFile } from '$lib/ipc/workspace';
import { libraryWallpaperStore } from '$lib/state/library-wallpaper.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { formatIpcError } from '$lib/utils/ipc-error';

/**
 * PH-CF-700 C8: ライブラリ画面のグローバル壁紙設定 UI (Settings → Library pane に mount)。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-700_library-ux-wallpaper.md` §C8 UI
 * - `docs/l2_foundation/features/backend/wallpaper-service.md` §壁紙格納先契約
 * - `docs/l1_requirements/ux_standards.md` §15 Wallpaper 規格 (file picker / slider 範囲)
 *
 * 構造 (`WorkspaceWallpaperDialog` と同型):
 * - file picker: png / jpg / jpeg / webp 限定 (Tauri dialog filter)
 * - opacity slider: 0..100 (UI) / 0..1 (DB) で 100 倍 mapping、 default 60
 * - blur slider: 0..40 (px)、 default 0
 * - クリアボタン (壁紙解除) + プレビュー
 *
 * 状態管理:
 * - `libraryWallpaperStore` を購読し、 mutation 後の clamp 済 response を store に書き戻す。
 * - mount 時に `load()` で backend から最新値を取得 (LibraryLayout でも load しているが
 *   Settings → Library pane が初回開かれた場合に備え重複呼び出し OK = best-effort)。
 */

let opacityPct = $state(60);
let blurPx = $state(0);
let saving = $state(false);

onMount(() => {
	void libraryWallpaperStore.load().then(() => {
		const wp = libraryWallpaperStore.wallpaper;
		opacityPct = Math.round((wp.opacity ?? 0.6) * 100);
		blurPx = wp.blur ?? 0;
	});
});

let wallpaper = $derived(libraryWallpaperStore.wallpaper);
let previewUrl = $derived(wallpaper.path ? convertFileSrc(wallpaper.path) : '');

async function pickAndApply(): Promise<void> {
	saving = true;
	try {
		const selected = await openDialog({
			multiple: false,
			directory: false,
			filters: [
				{
					name: t('workspace.wallpaper.image_filter'),
					extensions: ['png', 'jpg', 'jpeg', 'webp'],
				},
			],
			title: t('settings.library_wallpaper.pick_title'),
		});
		if (!selected || Array.isArray(selected)) {
			saving = false;
			return;
		}
		const savedPath = await saveWallpaperFile(selected as string);
		await libraryWallpaperStore.apply({
			path: savedPath,
			opacity: opacityPct / 100,
			blur: blurPx,
		});
		toastStore.add(t('toast.wallpaper_updated'), 'success');
	} catch (e: unknown) {
		toastStore.add(
			formatIpcError({ operation: t('settings.library_wallpaper.op_set') }, e),
			'error',
		);
	} finally {
		saving = false;
	}
}

async function applySliderChange(): Promise<void> {
	try {
		await libraryWallpaperStore.apply({
			path: wallpaper.path,
			opacity: opacityPct / 100,
			blur: blurPx,
		});
	} catch (e: unknown) {
		toastStore.add(
			formatIpcError({ operation: t('settings.library_wallpaper.op_adjust') }, e),
			'error',
		);
	}
}

async function clearWallpaper(): Promise<void> {
	saving = true;
	try {
		await libraryWallpaperStore.apply({
			path: null,
			opacity: opacityPct / 100,
			blur: blurPx,
		});
		toastStore.add(t('toast.wallpaper_cleared'), 'success');
	} catch (e: unknown) {
		toastStore.add(
			formatIpcError({ operation: t('settings.library_wallpaper.op_clear') }, e),
			'error',
		);
	} finally {
		saving = false;
	}
}
</script>

<section class="space-y-3" data-testid="settings-library-wallpaper">
	<h4 class="flex items-center gap-2 text-sm font-medium text-[var(--ag-text-primary)]">
		<ImageIcon class="h-4 w-4 text-[var(--ag-text-muted)]" />
		{t('settings.library_wallpaper.heading')}
	</h4>
	<p class="text-xs text-[var(--ag-text-muted)]">
		{t('settings.library_wallpaper.description')}
	</p>

	<!-- プレビュー (WorkspaceWallpaperDialog と同 16/9 aspect) -->
	<div
		class="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
		data-testid="settings-library-wallpaper-preview"
	>
		{#if previewUrl}
			<img
				src={previewUrl}
				alt={t('settings.library_wallpaper.preview_alt')}
				class="h-full w-full object-cover motion-reduce:!filter-none"
				style="opacity: {opacityPct / 100}; filter: blur({blurPx}px);"
			/>
		{:else}
			<div
				class="flex h-full w-full items-center justify-center text-xs text-[var(--ag-text-muted)]"
			>
				{t('settings.library_wallpaper.none')}
			</div>
		{/if}
	</div>

	<!-- 透明度 slider -->
	<div>
		<div class="mb-1 flex items-center justify-between">
			<label for="library-wallpaper-opacity" class="text-sm text-[var(--ag-text-secondary)]">
				{t('workspace.wallpaper.opacity')}
			</label>
			<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{opacityPct}%</span>
		</div>
		<input
			id="library-wallpaper-opacity"
			type="range"
			min="0"
			max="100"
			step="5"
			bind:value={opacityPct}
			onchange={() => void applySliderChange()}
			class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
			disabled={!wallpaper.path}
			data-testid="settings-library-wallpaper-opacity"
		/>
	</div>

	<!-- ぼかし slider -->
	<div>
		<div class="mb-1 flex items-center justify-between">
			<label for="library-wallpaper-blur" class="text-sm text-[var(--ag-text-secondary)]">
				{t('workspace.wallpaper.blur')}
			</label>
			<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{blurPx}px</span>
		</div>
		<input
			id="library-wallpaper-blur"
			type="range"
			min="0"
			max="40"
			step="1"
			bind:value={blurPx}
			onchange={() => void applySliderChange()}
			class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
			disabled={!wallpaper.path}
			data-testid="settings-library-wallpaper-blur"
		/>
	</div>

	<!-- アクション -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<Button
			type="button"
			variant="destructive"
			size="sm"
			onclick={() => void clearWallpaper()}
			disabled={!wallpaper.path || saving}
			data-testid="settings-library-wallpaper-clear"
		>
			<Trash2 class="h-4 w-4" />
			{t('workspace.wallpaper.clear_button')}
		</Button>
		<Button
			type="button"
			size="sm"
			onclick={() => void pickAndApply()}
			disabled={saving}
			data-testid="settings-library-wallpaper-pick"
		>
			<Upload class="h-4 w-4" />
			{wallpaper.path
				? t('workspace.wallpaper.change_button')
				: t('workspace.wallpaper.pick_button')}
		</Button>
	</div>
</section>
