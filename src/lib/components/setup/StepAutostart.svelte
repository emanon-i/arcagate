<script lang="ts">
import Switch from '$lib/components/common/Switch.svelte';
import { Button } from '$lib/components/ui/button';
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
  <!-- audit 2026-05-14 rank 11: raw <button> 2 件 を shadcn Button に migration。
       「戻る」 = secondary (variant=outline)、 「次へ」 = primary (variant=default)。
       rubric `docs/l2_foundation/button-usage.md` (a)/(b) 準拠。 -->
  <div class="mt-8 flex justify-between">
    <Button type="button" variant="outline" onclick={onBack}>戻る</Button>
    <Button type="button" variant="default" onclick={onNext}>次へ</Button>
  </div>
</div>
