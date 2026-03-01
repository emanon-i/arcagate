<script lang="ts">
import { paletteStore } from '$lib/state/palette.svelte';
import ResultList from './ResultList.svelte';
import SearchInput from './SearchInput.svelte';

function handleKeyDown(e: KeyboardEvent) {
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		paletteStore.selectNext();
	}
	if (e.key === 'ArrowUp') {
		e.preventDefault();
		paletteStore.selectPrev();
	}
	if (e.key === 'Enter') {
		const entry = paletteStore.results[paletteStore.selectedIndex];
		if (entry) void paletteStore.launch(entry);
	}
	if (e.key === 'Escape') paletteStore.close();
}

function handleBackdropClick(e: MouseEvent) {
	if (e.target === e.currentTarget) paletteStore.close();
}
</script>

{#if paletteStore.isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="w-full max-w-xl overflow-hidden rounded-xl border bg-background shadow-2xl">
      <SearchInput
        value={paletteStore.query}
        onInput={(v) => paletteStore.search(v)}
        onKeyDown={handleKeyDown}
        placeholder="アプリ、URL、フォルダーを検索...  |  = 1+2*3  |  cb:  |  prefix:"
      />
      <ResultList
        items={paletteStore.results}
        selectedIndex={paletteStore.selectedIndex}
        onSelect={(entry) => paletteStore.launch(entry)}
      />
      {#if paletteStore.lastError}
        <p class="border-t px-3 py-2 text-xs text-destructive">{paletteStore.lastError}</p>
      {/if}
    </div>
  </div>
{/if}
