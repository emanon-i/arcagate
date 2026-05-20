<script lang="ts">
import { configStore } from '$lib/state/config.svelte';
import StepAutostart from './StepAutostart.svelte';
import StepComplete from './StepComplete.svelte';
import StepHotkey from './StepHotkey.svelte';

let step = $state(1);
</script>

{#if !configStore.setupComplete}
  <div data-testid="setup-wizard" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)]">
    <div class="w-full max-w-md rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-8 shadow-[var(--ag-shadow-dialog)]">
      <!-- ステップインジケーター -->
      <div class="mb-6 flex gap-2">
        {#each [1, 2, 3] as s}
          <div class="h-1 flex-1 rounded {s <= step ? 'bg-[var(--ag-accent)]' : 'bg-[var(--ag-surface-3)]'}"></div>
        {/each}
      </div>

      {#if step === 1}
        <StepHotkey onNext={() => (step = 2)} />
      {:else if step === 2}
        <StepAutostart onNext={() => (step = 3)} onBack={() => (step = 1)} />
      {:else}
        <StepComplete onFinish={() => {}} />
      {/if}
    </div>
  </div>
{/if}
