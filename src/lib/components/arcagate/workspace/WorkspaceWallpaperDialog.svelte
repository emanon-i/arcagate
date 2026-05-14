<script lang="ts">
import { Image as ImageIcon, Trash2, Upload } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import { t } from '$lib/i18n.svelte';
import { saveWallpaperFile, setWorkspaceWallpaper } from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { Workspace } from '$lib/types/workspace';
import { formatIpcError } from '$lib/utils/ipc-error';

/**
 * PH-issue-009 Phase B: per-workspace 壁紙設定 dialog。
 *
 * 引用元 guideline:
 * - docs/l1_requirements/ux_standards.md §15 Wallpaper 規格
 * - docs/desktop_ui_ux_agent_rules.md P3 主要操作 / P11 装飾より対象
 * - docs/l0_ideas/arcagate-visual-language.md (Frosted Glass / 過度に派手 NG)
 *
 * 構造:
 * - file picker: png/jpg/jpeg/webp 限定 (Tauri dialog filter)
 * - opacity slider: 0..100 (UI) / 0..1 (DB) で 100 倍 mapping、default 60
 * - blur slider: 0..40 (px)、default 0
 * - クリアボタン (壁紙解除) + プレビュー
 *
 * Phase A の cmd_save_wallpaper_file → cmd_set_workspace_wallpaper を呼ぶ。
 */
interface Props {
	open: boolean;
	workspace: Workspace | null;
	onClose: () => void;
}

let { open, workspace, onClose }: Props = $props();

let opacityPct = $state(60);
let blurPx = $state(0);
let saving = $state(false);

// BaseDialog rewrite (Dialog wrapper unify Phase 2)。
// transition / Escape / backdrop / box style は BaseDialog 担当。
// 本 component は $effect on open (値読み込み) と form-less UI を keep。

// dialog 開いた瞬間に現在 workspace の値を読み込む。
$effect(() => {
	if (open && workspace) {
		opacityPct = Math.round((workspace.wallpaper_opacity ?? 0.6) * 100);
		blurPx = workspace.wallpaper_blur ?? 0;
	}
});

let previewUrl = $derived(
	workspace?.wallpaper_path ? convertFileSrc(workspace.wallpaper_path) : '',
);

async function pickAndApply() {
	if (!workspace) return;
	saving = true;
	try {
		const selected = await openDialog({
			multiple: false,
			directory: false,
			filters: [
				{ name: t('workspace.wallpaper.image_filter'), extensions: ['png', 'jpg', 'jpeg', 'webp'] },
			],
			title: t('workspace.wallpaper.pick_title'),
		});
		if (!selected || Array.isArray(selected)) {
			saving = false;
			return;
		}
		const savedPath = await saveWallpaperFile(selected as string);
		const updated = await setWorkspaceWallpaper({
			workspace_id: workspace.id,
			path: savedPath,
			opacity: opacityPct / 100,
			blur: blurPx,
		});
		// store の workspaces 配列を更新 (active workspace の派生 state 反映)
		workspaceStore.replaceWorkspace(updated);
		toastStore.add(t('toast.wallpaper_updated'), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('workspace.wallpaper.op_set') }, e), 'error');
	} finally {
		saving = false;
	}
}

async function applySliderChange() {
	if (!workspace) return;
	try {
		const updated = await setWorkspaceWallpaper({
			workspace_id: workspace.id,
			path: workspace.wallpaper_path,
			opacity: opacityPct / 100,
			blur: blurPx,
		});
		workspaceStore.replaceWorkspace(updated);
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('workspace.wallpaper.op_adjust') }, e), 'error');
	}
}

async function clearWallpaper() {
	if (!workspace) return;
	saving = true;
	try {
		const updated = await setWorkspaceWallpaper({
			workspace_id: workspace.id,
			path: null,
			opacity: opacityPct / 100,
			blur: blurPx,
		});
		workspaceStore.replaceWorkspace(updated);
		toastStore.add(t('toast.wallpaper_cleared'), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('workspace.wallpaper.op_clear') }, e), 'error');
	} finally {
		saving = false;
	}
}
</script>

<BaseDialog
	open={open && !!workspace}
	{onClose}
	ariaLabelledby="wallpaper-dialog-title"
	size="md"
>
	{#if workspace}
		<h3
			id="wallpaper-dialog-title"
			class="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--ag-text-primary)]"
		>
			<ImageIcon class="h-5 w-5 text-[var(--ag-text-muted)]" />
			{t('workspace.wallpaper.title', { name: workspace.name })}
		</h3>

			<!-- プレビュー -->
			<div
				class="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
			>
				{#if previewUrl}
					<img
						src={previewUrl}
						alt={t('workspace.wallpaper.preview_alt')}
						class="h-full w-full object-cover motion-reduce:!filter-none"
						style="opacity: {opacityPct / 100}; filter: blur({blurPx}px);"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center text-xs text-[var(--ag-text-muted)]">
						{t('workspace.wallpaper.none')}
					</div>
				{/if}
			</div>

			<!-- 透明度 slider -->
			<div class="mb-3">
				<div class="mb-1 flex items-center justify-between">
					<label for="wallpaper-opacity" class="text-sm text-[var(--ag-text-secondary)]">
						{t('workspace.wallpaper.opacity')}
					</label>
					<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{opacityPct}%</span>
				</div>
				<input
					id="wallpaper-opacity"
					type="range"
					min="0"
					max="100"
					step="5"
					bind:value={opacityPct}
					onchange={() => void applySliderChange()}
					class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
					disabled={!workspace.wallpaper_path}
				/>
			</div>

			<!-- ぼかし slider -->
			<div class="mb-4">
				<div class="mb-1 flex items-center justify-between">
					<label for="wallpaper-blur" class="text-sm text-[var(--ag-text-secondary)]">
						{t('workspace.wallpaper.blur')}
					</label>
					<span class="text-xs tabular-nums text-[var(--ag-text-muted)]">{blurPx}px</span>
				</div>
				<input
					id="wallpaper-blur"
					type="range"
					min="0"
					max="40"
					step="1"
					bind:value={blurPx}
					onchange={() => void applySliderChange()}
					class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
					disabled={!workspace.wallpaper_path}
				/>
			</div>

			<!-- アクション -->
			<div class="flex flex-wrap items-center justify-between gap-2">
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => void clearWallpaper()}
					disabled={!workspace.wallpaper_path || saving}
				>
					<Trash2 class="h-4 w-4" />
					{t('workspace.wallpaper.clear_button')}
				</button>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						onclick={onClose}
					>
						{t('common.close')}
					</button>
					<button
						type="button"
						class="flex items-center gap-1.5 rounded-lg bg-[var(--ag-accent-bg)] px-3 py-2 text-sm text-[var(--ag-accent-text)] transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => void pickAndApply()}
						disabled={saving}
					>
						<Upload class="h-4 w-4" />
						{workspace.wallpaper_path
							? t('workspace.wallpaper.change_button')
							: t('workspace.wallpaper.pick_button')}
					</button>
				</div>
			</div>
	{/if}
</BaseDialog>
