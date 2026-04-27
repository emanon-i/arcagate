<!--
	PH-499 batch-109: Library 共通 背景壁紙 設定 UI

	設定項目:
	- 画像 path (file dialog で選択 → app_data_dir/wallpapers/<uuid>.<ext> にコピー)
	- opacity (0.0 - 1.0)
	- blur (0 - 40px)

	解除: 「壁紙なし」ボタンで path = '' に戻す。

	Per-Workspace 上書きは follow-up plan で実装予定 (このバッチでは Library global のみ)。
-->
<script lang="ts">
import { ImagePlus, Trash2 } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { configStore } from '$lib/state/config.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { getErrorMessage } from '$lib/utils/format-error';

let wallpaper = $derived(configStore.wallpaper);

let busy = $state(false);

async function pickWallpaper() {
	const selected = await openDialog({
		multiple: false,
		title: '背景壁紙を選択',
		filters: [{ name: '画像', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
	});
	if (!selected || Array.isArray(selected)) return;
	busy = true;
	try {
		await configStore.saveWallpaperPath(selected);
		toastStore.add('壁紙を設定しました', 'success');
	} catch (e: unknown) {
		toastStore.add(`壁紙の設定に失敗しました: ${getErrorMessage(e)}`, 'error');
	} finally {
		busy = false;
	}
}

async function clearWallpaper() {
	busy = true;
	try {
		await configStore.saveWallpaperPath(null);
		toastStore.add('壁紙を解除しました', 'success');
	} catch (e: unknown) {
		toastStore.add(`壁紙の解除に失敗しました: ${getErrorMessage(e)}`, 'error');
	} finally {
		busy = false;
	}
}

let previewSrc = $derived(wallpaper.path ? convertFileSrc(wallpaper.path) : '');
</script>

<section class="space-y-3" data-testid="wallpaper-settings">
	<div>
		<p class="text-sm font-medium text-[var(--ag-text-primary)]">背景壁紙</p>
		<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
			Library と Workspace の共通背景画像 (Workspace 別の上書き設定は今後対応予定)。
		</p>
	</div>

	{#if wallpaper.path}
		<div
			class="overflow-hidden rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
			data-testid="wallpaper-preview"
		>
			<img
				src={previewSrc}
				alt="背景壁紙プレビュー"
				class="block h-32 w-full object-cover"
				style="opacity: {wallpaper.opacity}; filter: blur({wallpaper.blur}px);"
			/>
		</div>
	{:else}
		<div
			class="flex h-32 items-center justify-center rounded-md border border-dashed border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-xs text-[var(--ag-text-muted)]"
			data-testid="wallpaper-empty"
		>
			未設定
		</div>
	{/if}

	<div class="flex items-center gap-2">
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-colors hover:bg-[var(--ag-accent-active-bg)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			disabled={busy}
			data-testid="wallpaper-pick"
			onclick={() => void pickWallpaper()}
		>
			<ImagePlus class="h-3.5 w-3.5" />
			画像を選択
		</button>
		{#if wallpaper.path}
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md border border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				disabled={busy}
				data-testid="wallpaper-clear"
				onclick={() => void clearWallpaper()}
			>
				<Trash2 class="h-3.5 w-3.5" />
				壁紙なし
			</button>
		{/if}
	</div>

	<label class="flex items-center justify-between gap-3 text-sm">
		<span class="text-[var(--ag-text-secondary)]">不透明度</span>
		<input
			type="range"
			min={0}
			max={1}
			step={0.05}
			value={wallpaper.opacity}
			oninput={(e) => void configStore.saveWallpaperOpacity(Number((e.currentTarget as HTMLInputElement).value))}
			data-testid="wallpaper-opacity"
			class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
		/>
		<span class="w-12 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">
			{Math.round(wallpaper.opacity * 100)}%
		</span>
	</label>

	<label class="flex items-center justify-between gap-3 text-sm">
		<span class="text-[var(--ag-text-secondary)]">ぼかし</span>
		<input
			type="range"
			min={0}
			max={40}
			step={1}
			value={wallpaper.blur}
			oninput={(e) => void configStore.saveWallpaperBlur(Number((e.currentTarget as HTMLInputElement).value))}
			data-testid="wallpaper-blur"
			class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
		/>
		<span class="w-10 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">
			{wallpaper.blur}px
		</span>
	</label>
</section>
