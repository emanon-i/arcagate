<script lang="ts">
import HotkeyInput from '$lib/components/settings/HotkeyInput.svelte';
import { configStore } from '$lib/state/config.svelte';

let { onNext }: { onNext: () => void } = $props();
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">ホットキーを設定</h2>
  <p class="text-sm text-muted-foreground mb-6">
    どこからでもアプリを呼び出すホットキーを設定してください。
  </p>
  <HotkeyInput value={configStore.hotkey} onChange={(v) => configStore.saveHotkey(v)} />
  <div class="mt-8 flex justify-end">
    <button
      type="button"
      class="rounded-md bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:opacity-90"
      onclick={onNext}
    >
      次へ
    </button>
  </div>
</div>
