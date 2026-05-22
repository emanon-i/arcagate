<script lang="ts">
import { t } from '$lib/i18n.svelte';
import { configStore } from '$lib/state/config.svelte';
import StepAutostart from './StepAutostart.svelte';
import StepHotkey from './StepHotkey.svelte';
import StepWelcome from './StepWelcome.svelte';

// PH-PQ-200 T1: 初回フロー全体を最長 30 秒に収める 3 step 構成。
//   1. ようこそ + 価値伝達 (読み飛ばし可)
//   2. ホットキー設定 (必須・即決)
//   3. 自動起動トグル → 完走で OnboardingTour へ
// z-index は Settings dialog (z-50) より上 — Settings の「再実行」 から開いても確実に前面。
const TOTAL_STEPS = 3;
let step = $state(1);

async function finish(): Promise<void> {
	await configStore.completeSetup();
}
</script>

{#if !configStore.setupComplete}
  <div data-testid="setup-wizard" class="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--scrim)]">
    <div class="w-full max-w-md rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-8 shadow-[var(--ag-shadow-dialog)]">
      <!-- ステップインジケーター -->
      <div class="mb-6 flex gap-2" aria-hidden="true">
        {#each [1, 2, 3] as s (s)}
          <div class="h-1 flex-1 rounded {s <= step ? 'bg-[var(--ag-accent)]' : 'bg-[var(--ag-surface-3)]'}"></div>
        {/each}
      </div>

      {#if step === 1}
        <StepWelcome onNext={() => (step = 2)} />
      {:else if step === 2}
        <StepHotkey onNext={() => (step = 3)} onBack={() => (step = 1)} />
      {:else}
        <StepAutostart onFinish={() => void finish()} onBack={() => (step = 2)} />
      {/if}

      <p class="mt-6 text-center text-xs text-[var(--ag-text-muted)]">
        {t('setup.step_progress', { current: step, total: TOTAL_STEPS })}
      </p>
    </div>
  </div>
{/if}
