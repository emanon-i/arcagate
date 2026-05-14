<script lang="ts">
import { Button } from '$lib/components/ui/button';
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
  <!-- audit 2026-05-14 rank 11: 「始める」 = primary (form complete action)、 rubric (a) primary 準拠。 -->
  <div class="mt-8 flex justify-end">
    <Button type="button" variant="default" onclick={handleFinish}>始める</Button>
  </div>
</div>
