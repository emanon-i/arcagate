<script lang="ts">
import { configStore } from '$lib/state/config.svelte';

let { onFinish }: { onFinish: () => void } = $props();

async function handleFinish() {
	await configStore.completeSetup();
	onFinish();
}
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">セットアップ完了</h2>
  <p class="text-sm text-muted-foreground mb-6">
    Arcagate の設定が完了しました。ホットキーでいつでも呼び出せます。
  </p>
  <div class="mt-8 flex justify-end">
    <button
      type="button"
      class="rounded-md bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:opacity-90"
      onclick={handleFinish}
    >
      始める
    </button>
  </div>
</div>
