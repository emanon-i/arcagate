<script lang="ts">
import Switch from '$lib/components/common/Switch.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';

let { onNext, onBack }: { onNext: () => void; onBack: () => void } = $props();
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">{t('setup.autostart.title')}</h2>
  <p class="text-sm text-muted-foreground mb-6">
    {t('setup.autostart.description')}
  </p>
  <Switch
    checked={configStore.autostart}
    onChange={(v) => configStore.saveAutostart(v)}
    aria-label={configStore.autostart ? t('settings.general.autostart_aria_off') : t('settings.general.autostart_aria_on')}
  />
  <!-- audit 2026-05-14 rank 11: raw <button> 2 件 を shadcn Button に migration。
       「戻る」 = secondary (variant=outline)、 「次へ」 = primary (variant=default)。
       rubric `docs/l2_foundation/button-usage.md` (a)/(b) 準拠。 -->
  <div class="mt-8 flex justify-between">
    <Button type="button" variant="outline" onclick={onBack}>{t('common.back')}</Button>
    <Button type="button" variant="default" onclick={onNext}>{t('common.next')}</Button>
  </div>
</div>
