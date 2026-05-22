<script lang="ts">
import { Boxes, Keyboard, LayoutDashboard } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

// PH-PQ-200 T1: SetupWizard 1 step 目。 「Arcagate は何か」 を短く価値伝達する。
// 読み飛ばし可 — 重い screenshot は同梱せず、 lucide アイコン + 1 行説明で軽量に。

let { onNext }: { onNext: () => void } = $props();

const points = [
	{ icon: Boxes, key: 'setup.welcome.point_collect' },
	{ icon: Keyboard, key: 'setup.welcome.point_launch' },
	{ icon: LayoutDashboard, key: 'setup.welcome.point_workspace' },
];
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">{t('setup.welcome.title')}</h2>
  <p class="text-sm text-muted-foreground mb-6">
    {t('setup.welcome.description')}
  </p>
  <ul class="mb-8 space-y-3">
    {#each points as point (point.key)}
      {@const Icon = point.icon}
      <li class="flex items-start gap-3">
        <div class="shrink-0 rounded-lg bg-[var(--ag-accent-bg)] p-2 text-[var(--ag-accent)]">
          <Icon class="h-4 w-4" />
        </div>
        <span class="text-sm text-[var(--ag-text-secondary)]">{t(point.key)}</span>
      </li>
    {/each}
  </ul>
  <!-- 「次へ」 = primary (form proceed action)。 -->
  <div class="flex justify-end">
    <Button type="button" variant="default" data-testid="setup-welcome-next" onclick={onNext}>
      {t('common.next')}
    </Button>
  </div>
</div>
