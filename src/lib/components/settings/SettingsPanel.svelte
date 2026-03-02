<script lang="ts">
import { configStore } from '$lib/state/config.svelte';
import AutostartToggle from './AutostartToggle.svelte';
import ExportImport from './ExportImport.svelte';
import HotkeyInput from './HotkeyInput.svelte';
import WatchedPathsManager from './WatchedPathsManager.svelte';

$effect(() => {
	configStore.loadConfig();
});
</script>

<div class="space-y-6 p-4">
  <h2 class="text-lg font-semibold">設定</h2>

  {#if configStore.loading}
    <p class="text-sm text-muted-foreground">読み込み中...</p>
  {:else}
    <div class="space-y-4">
      <div class="space-y-2">
        <p class="text-sm font-medium">グローバルホットキー</p>
        <HotkeyInput
          value={configStore.hotkey}
          onChange={(newHotkey) => configStore.saveHotkey(newHotkey)}
        />
        <p class="text-xs text-muted-foreground">
          コマンドパレットを開くキーボードショートカット
        </p>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">自動起動</p>
        <AutostartToggle
          enabled={configStore.autostart}
          onChange={(enabled) => configStore.saveAutostart(enabled)}
        />
      </div>

      <div class="space-y-2">
        <ExportImport />
      </div>

      <div class="space-y-2">
        <WatchedPathsManager />
      </div>
    </div>
  {/if}

  {#if configStore.error}
    <p class="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {configStore.error}
    </p>
  {/if}
</div>
