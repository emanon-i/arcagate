<script lang="ts">
import { open } from '@tauri-apps/plugin-dialog';
import { onMount } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { addWatchedPath, getWatchedPaths, removeWatchedPath } from '$lib/ipc/watched_paths';
import type { WatchedPath } from '$lib/types/watched_path';

let watchedPaths = $state<WatchedPath[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);
let newLabel = $state('');

onMount(() => {
	void loadPaths();
});

async function loadPaths() {
	loading = true;
	error = null;
	try {
		watchedPaths = await getWatchedPaths();
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function handleAddByDialog() {
	try {
		const selected = await open({ directory: true, multiple: false, title: '監視フォルダを選択' });
		if (!selected || Array.isArray(selected)) return;
		const label = newLabel.trim() || null;
		await addWatchedPath(selected, label);
		newLabel = '';
		await loadPaths();
	} catch (e) {
		error = String(e);
	}
}

async function handleRemove(id: string) {
	try {
		await removeWatchedPath(id);
		await loadPaths();
	} catch (e) {
		error = String(e);
	}
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-medium">監視フォルダ</h3>
  <p class="text-xs text-muted-foreground">
    登録済み exe のパス変更を自動追跡します。対象フォルダを追加してください。
  </p>

  <div class="flex gap-2">
    <input
      type="text"
      autocomplete="off"
      bind:value={newLabel}
      placeholder="ラベル（任意）"
      class="h-8 flex-1 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    />
    <Button size="sm" onclick={handleAddByDialog}>フォルダを選択して追加</Button>
  </div>

  {#if loading}
    <p class="text-sm text-muted-foreground">読み込み中...</p>
  {:else if watchedPaths.length === 0}
    <p class="text-sm text-muted-foreground">監視フォルダが登録されていません</p>
  {:else}
    <ul class="space-y-1">
      {#each watchedPaths as wp (wp.id)}
        <li class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <div class="min-w-0 flex-1 truncate">
            {#if wp.label}
              <span class="font-medium">{wp.label} — </span>
            {/if}
            <span class="text-muted-foreground">{wp.path}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            class="ml-2 shrink-0 text-destructive hover:text-destructive"
            onclick={() => handleRemove(wp.id)}
          >
            削除
          </Button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if error}
    <p class="text-sm text-destructive">{error}</p>
  {/if}
</div>
