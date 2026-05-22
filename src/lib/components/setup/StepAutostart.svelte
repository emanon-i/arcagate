<script lang="ts">
import Switch from '$lib/components/common/Switch.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';

// PH-PQ-200 T1: SetupWizard 最終 step。 onFinish で setup を完走させ、
// 直後に OnboardingTour が自動発火する。
let { onFinish, onBack }: { onFinish: () => void; onBack: () => void } = $props();
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
  <!-- 「戻る」 = secondary (variant=outline)、 「始める」 = primary (form complete action)。
       rubric `docs/l2_foundation/button-usage.md` (a)/(b) 準拠。 -->
  <div class="mt-8 flex justify-between">
    <Button type="button" variant="outline" onclick={onBack}>{t('common.back')}</Button>
    <Button type="button" variant="default" data-testid="setup-finish" onclick={onFinish}>
      {t('setup.complete.start_button')}
    </Button>
  </div>
</div>
