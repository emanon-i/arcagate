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
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      onclick={onNext}
    >
      次へ
    </button>
  </div>
</div>
