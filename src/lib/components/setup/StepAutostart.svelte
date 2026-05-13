<script lang="ts">
import Switch from '$lib/components/common/Switch.svelte';
import { configStore } from '$lib/state/config.svelte';

let { onNext, onBack }: { onNext: () => void; onBack: () => void } = $props();
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">自動起動の設定</h2>
  <p class="text-sm text-muted-foreground mb-6">
    Windows 起動時に Arcagate を自動起動するか設定してください。
  </p>
  <Switch
    checked={configStore.autostart}
    onChange={(v) => configStore.saveAutostart(v)}
    aria-label={configStore.autostart ? '自動起動を無効にする' : '自動起動を有効にする'}
  />
  <div class="mt-8 flex justify-between">
    <button
      type="button"
      class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-4 py-2 text-sm font-medium text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
      onclick={onBack}
    >
      戻る
    </button>
    <button
      type="button"
      class="rounded-md bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:opacity-90"
      onclick={onNext}
    >
      次へ
    </button>
  </div>
</div>
