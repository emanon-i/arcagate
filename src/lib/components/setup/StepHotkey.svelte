<script lang="ts">
import HotkeyInput from '$lib/components/settings/HotkeyInput.svelte';
import { Button } from '$lib/components/ui/button';
import { configStore } from '$lib/state/config.svelte';

let { onNext }: { onNext: () => void } = $props();
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">ホットキーを設定</h2>
  <p class="text-sm text-muted-foreground mb-6">
    どこからでもアプリを呼び出すホットキーを設定してください。
  </p>
  <HotkeyInput value={configStore.hotkey} onChange={(v) => configStore.saveHotkey(v)} />
  <!-- audit 2026-05-14 rank 11: 「次へ」 = primary (form proceed action)。 -->
  <div class="mt-8 flex justify-end">
    <Button type="button" variant="default" onclick={onNext}>次へ</Button>
  </div>
</div>
