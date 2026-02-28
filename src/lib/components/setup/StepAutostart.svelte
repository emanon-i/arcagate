<script lang="ts">
import AutostartToggle from '$lib/components/settings/AutostartToggle.svelte';
import { configStore } from '$lib/state/config.svelte';

let { onNext, onBack }: { onNext: () => void; onBack: () => void } = $props();
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">自動起動の設定</h2>
  <p class="text-sm text-muted-foreground mb-6">
    Windows 起動時に Arcagate を自動起動するか設定してください。
  </p>
  <AutostartToggle enabled={configStore.autostart} onChange={(v) => configStore.saveAutostart(v)} />
  <div class="mt-8 flex justify-between">
    <button
      type="button"
      class="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      onclick={onBack}
    >
      戻る
    </button>
    <button
      type="button"
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      onclick={onNext}
    >
      次へ
    </button>
  </div>
</div>
