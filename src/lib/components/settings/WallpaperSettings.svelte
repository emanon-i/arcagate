<script lang="ts">
import { Image as ImageIcon, X } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { formatIpcError } from '$lib/utils/ipc-error';

let lib = $derived(workspaceStore.libraryWallpaper);
let activeWs = $derived(workspaceStore.activeWorkspace);

let loading = $state(false);

async function pickAndApplyLibrary() {
	const selected = await openDialog({
		multiple: false,
		title: 'Library 共通の背景画像を選択',
		filters: [
			{
				name: '画像',
				extensions: ['png', 'jpg', 'jpeg', 'webp'],
			},
		],
	});
	if (!selected || Array.isArray(selected)) return;
	loading = true;
	try {
		await workspaceStore.saveAndApplyLibraryWallpaper(selected);
		toastStore.add('Library 背景画像を更新しました', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '背景画像の保存' }, e), 'error');
	} finally {
		loading = false;
	}
}

async function clearLibrary() {
	loading = true;
	try {
		await workspaceStore.setLibraryWallpaper(null, lib.opacity, lib.blur);
		toastStore.add('Library 背景画像をクリアしました', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '背景画像のクリア' }, e), 'error');
	} finally {
		loading = false;
	}
}

async function changeLibraryOpacity(v: number) {
	await workspaceStore.setLibraryWallpaper(lib.path, v, lib.blur);
}
async function changeLibraryBlur(v: number) {
	await workspaceStore.setLibraryWallpaper(lib.path, lib.opacity, v);
}

async function pickAndApplyWorkspace() {
	if (!activeWs) return;
	const selected = await openDialog({
		multiple: false,
		title: `Workspace「${activeWs.name}」の背景画像を選択`,
		filters: [
			{
				name: '画像',
				extensions: ['png', 'jpg', 'jpeg', 'webp'],
			},
		],
	});
	if (!selected || Array.isArray(selected)) return;
	loading = true;
	try {
		await workspaceStore.saveAndApplyWorkspaceWallpaper(selected);
		toastStore.add('Workspace 背景画像を更新しました', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '背景画像の保存' }, e), 'error');
	} finally {
		loading = false;
	}
}

async function clearWorkspace() {
	if (!activeWs) return;
	loading = true;
	try {
		await workspaceStore.clearActiveWorkspaceWallpaper();
		toastStore.add('Workspace 背景画像をクリアしました (Library default に戻る)', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '背景画像のクリア' }, e), 'error');
	} finally {
		loading = false;
	}
}

async function changeWorkspaceOpacity(v: number) {
	if (!activeWs) return;
	await workspaceStore.setActiveWorkspaceWallpaper(
		activeWs.wallpaper_path,
		v,
		activeWs.wallpaper_blur,
	);
}
async function changeWorkspaceBlur(v: number) {
	if (!activeWs) return;
	await workspaceStore.setActiveWorkspaceWallpaper(
		activeWs.wallpaper_path,
		activeWs.wallpaper_opacity,
		v,
	);
}

let libThumbSrc = $derived(lib.path ? convertFileSrc(lib.path) : null);
let wsThumbSrc = $derived(
	activeWs?.wallpaper_path ? convertFileSrc(activeWs.wallpaper_path) : null,
);
</script>

<section class="space-y-6" data-testid="wallpaper-settings">
	<div>
		<h4 class="mb-2 text-sm font-medium text-[var(--ag-text-primary)]">背景画像 (Library default)</h4>
		<p class="mb-3 text-xs text-[var(--ag-text-muted)]">
			Library / Workspace 共通の default 背景。各 Workspace で個別 override 可能。
		</p>

		<div class="flex items-start gap-3">
			<div class="h-20 w-32 shrink-0 overflow-hidden rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)]">
				{#if libThumbSrc}
					<img src={libThumbSrc} alt="Library wallpaper preview" class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full items-center justify-center text-[var(--ag-text-faint)]">
						<ImageIcon class="h-6 w-6" />
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<button
					type="button"
					class="self-start rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] disabled:opacity-50"
					data-testid="wallpaper-library-pick"
					disabled={loading}
					onclick={() => void pickAndApplyLibrary()}
				>
					画像を選択...
				</button>
				{#if lib.path}
					<button
						type="button"
						class="inline-flex items-center gap-1 self-start rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:opacity-50"
						data-testid="wallpaper-library-clear"
						disabled={loading}
						onclick={() => void clearLibrary()}
					>
						<X class="h-3 w-3" />
						背景なしに戻す
					</button>
				{/if}
			</div>
		</div>

		<div class="mt-4 grid grid-cols-2 gap-3 text-xs">
			<label class="flex flex-col gap-1">
				<span class="text-[var(--ag-text-secondary)]">不透明度: {(lib.opacity * 100).toFixed(0)}%</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={lib.opacity}
					onchange={(e) => void changeLibraryOpacity(Number((e.currentTarget as HTMLInputElement).value))}
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[var(--ag-text-secondary)]">ぼかし: {lib.blur}px</span>
				<input
					type="range"
					min="0"
					max="40"
					step="1"
					value={lib.blur}
					onchange={(e) => void changeLibraryBlur(Number((e.currentTarget as HTMLInputElement).value))}
				/>
			</label>
		</div>
	</div>

	{#if activeWs}
		<div class="border-t border-[var(--ag-border)] pt-5">
			<h4 class="mb-2 text-sm font-medium text-[var(--ag-text-primary)]">
				このワークスペース: {activeWs.name}
			</h4>
			<p class="mb-3 text-xs text-[var(--ag-text-muted)]">
				未設定の Workspace は Library default を継承します。
			</p>

			<div class="flex items-start gap-3">
				<div class="h-20 w-32 shrink-0 overflow-hidden rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)]">
					{#if wsThumbSrc}
						<img
							src={wsThumbSrc}
							alt="Workspace wallpaper preview"
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="flex h-full flex-col items-center justify-center text-[var(--ag-text-faint)]">
							<ImageIcon class="h-5 w-5" />
							<span class="mt-1 text-[10px]">Library default</span>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<button
						type="button"
						class="self-start rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] transition-[background-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)] disabled:opacity-50"
						data-testid="wallpaper-workspace-pick"
						disabled={loading}
						onclick={() => void pickAndApplyWorkspace()}
					>
						画像を選択...
					</button>
					{#if activeWs.wallpaper_path}
						<button
							type="button"
							class="inline-flex items-center gap-1 self-start rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)] transition-colors hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:opacity-50"
							data-testid="wallpaper-workspace-clear"
							disabled={loading}
							onclick={() => void clearWorkspace()}
						>
							<X class="h-3 w-3" />
							Library default に戻す
						</button>
					{/if}
				</div>
			</div>

			{#if activeWs.wallpaper_path}
				<div class="mt-4 grid grid-cols-2 gap-3 text-xs">
					<label class="flex flex-col gap-1">
						<span class="text-[var(--ag-text-secondary)]">
							不透明度: {(activeWs.wallpaper_opacity * 100).toFixed(0)}%
						</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={activeWs.wallpaper_opacity}
							onchange={(e) => void changeWorkspaceOpacity(Number((e.currentTarget as HTMLInputElement).value))}
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-[var(--ag-text-secondary)]">ぼかし: {activeWs.wallpaper_blur}px</span>
						<input
							type="range"
							min="0"
							max="40"
							step="1"
							value={activeWs.wallpaper_blur}
							onchange={(e) => void changeWorkspaceBlur(Number((e.currentTarget as HTMLInputElement).value))}
						/>
					</label>
				</div>
			{/if}
		</div>
	{/if}
</section>
