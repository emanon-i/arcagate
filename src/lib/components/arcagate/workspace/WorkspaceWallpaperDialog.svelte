<script lang="ts">
import { Image as ImageIcon, Trash2, Upload } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
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

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

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
			filters: [{ name: '画像', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
			title: '壁紙画像を選択',
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
		toastStore.add('壁紙を更新しました', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '壁紙の設定' }, e), 'error');
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
		toastStore.add(formatIpcError({ operation: '壁紙の透明度・ぼかし更新' }, e), 'error');
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
		toastStore.add('壁紙を解除しました', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '壁紙の解除' }, e), 'error');
	} finally {
		saving = false;
	}
}
</script>

{#if open && workspace}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="wallpaper-dialog-title"
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
	>
		<div
			class="w-full max-w-md rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)]"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			<h3
				id="wallpaper-dialog-title"
				class="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--ag-text-primary)]"
			>
				<ImageIcon class="h-5 w-5 text-[var(--ag-text-muted)]" />
				「{workspace.name}」の壁紙
			</h3>

			<!-- プレビュー -->
			<div
				class="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
			>
				{#if previewUrl}
					<img
						src={previewUrl}
						alt="壁紙プレビュー"
						class="h-full w-full object-cover motion-reduce:!filter-none"
						style="opacity: {opacityPct / 100}; filter: blur({blurPx}px);"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center text-xs text-[var(--ag-text-muted)]">
						壁紙未設定
					</div>
				{/if}
			</div>

			<!-- 透明度 slider -->
			<div class="mb-3">
				<div class="mb-1 flex items-center justify-between">
					<label for="wallpaper-opacity" class="text-sm text-[var(--ag-text-secondary)]">
						透明度
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
						ぼかし
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
					壁紙を解除
				</button>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						onclick={onClose}
					>
						閉じる
					</button>
					<button
						type="button"
						class="flex items-center gap-1.5 rounded-lg bg-[var(--ag-accent-bg)] px-3 py-2 text-sm text-[var(--ag-accent-text)] transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => void pickAndApply()}
						disabled={saving}
					>
						<Upload class="h-4 w-4" />
						{workspace.wallpaper_path ? '画像を変更' : '画像を選択'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
