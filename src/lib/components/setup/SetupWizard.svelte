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
    <!-- PH-CF-1000 B1: フルスクリーンオーバーレイは TitleBar の drag region を覆い隠すため、
         オーバーレイ最上部に細い帯 (h-8、 透明) で `data-tauri-drag-region` を露出させ、
         ウィザード表示中も window を掴んで移動できるようにする (`features/cross-cutting/window-drag.md`
         §オーバーレイ window 操作契約)。 click-through を保つため scrim と同 z-index で
         配置せず、 overlay 内 top に absolute 配置する。 ボタン類には付けない (誤って
         drag が button 操作を吸わない)。 -->
    <div
      data-tauri-drag-region
      data-testid="overlay-drag-region"
      class="pointer-events-auto absolute inset-x-0 top-0 h-8"
      aria-hidden="true"
    ></div>
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
