<script lang="ts">
import { configStore } from '$lib/state/config.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import AutostartToggle from './AutostartToggle.svelte';
import ExportImport from './ExportImport.svelte';
import HotkeyInput from './HotkeyInput.svelte';

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
        <p class="text-sm font-medium">ウィジェット拡大率</p>
        <div class="flex items-center gap-3">
          <input
            type="range"
            min="50"
            max="200"
            step="10"
            value={configStore.widgetZoom}
            oninput={(e) => configStore.setWidgetZoom(Number(e.currentTarget.value))}
            class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
          />
          <span class="w-12 text-right text-sm tabular-nums text-[var(--ag-text-secondary)]">
            {configStore.widgetZoom}%
          </span>
        </div>
        <p class="text-xs text-muted-foreground">
          ワークスペースのウィジェットサイズを調整します（Ctrl+ホイールでも操作可能）
        </p>
      </div>

      <div class="space-y-2">
        <ExportImport />
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">テーマ</p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border px-4 py-2 text-sm transition-colors {themeStore.activeMode === 'dark'
              ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
              : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
            onclick={() => void themeStore.setThemeMode('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            class="rounded-lg border px-4 py-2 text-sm transition-colors {themeStore.activeMode === 'light'
              ? 'border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
              : 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
            onclick={() => void themeStore.setThemeMode('light')}
          >
            Light
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if configStore.error}
    <p class="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {configStore.error}
    </p>
  {/if}
</div>
