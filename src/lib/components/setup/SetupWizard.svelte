<script lang="ts">
import { configStore } from '$lib/state/config.svelte';
import StepAutostart from './StepAutostart.svelte';
import StepComplete from './StepComplete.svelte';
import StepHotkey from './StepHotkey.svelte';

let step = $state(1);
</script>

{#if !configStore.setupComplete}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="w-full max-w-md rounded-xl bg-background p-8 shadow-2xl">
      <!-- ステップインジケーター -->
      <div class="mb-6 flex gap-2">
        {#each [1, 2, 3] as s}
          <div class="h-1 flex-1 rounded {s <= step ? 'bg-primary' : 'bg-muted'}"></div>
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
