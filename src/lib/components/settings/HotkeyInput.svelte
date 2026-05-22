<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

let {
	value,
	onChange,
}: {
	value: string;
	onChange: (hotkey: string) => void;
} = $props();

let recording = $state(false);
let inputEl = $state<HTMLInputElement | null>(null);

function startRecording() {
	recording = true;
	// 「変更」 button click 後はフォーカスが button に残り input の onkeydown が
	// 発火しない。 input に明示フォーカスして即座にキー入力を拾えるようにする。
	inputEl?.focus();
}

function cancelRecording() {
	recording = false;
}

function handleKeyDown(e: KeyboardEvent) {
	if (!recording) return;
	e.preventDefault();

	const parts: string[] = [];
	if (e.ctrlKey || e.metaKey) parts.push('CmdOrCtrl');
	if (e.altKey) parts.push('Alt');
	if (e.shiftKey) parts.push('Shift');

	const key = e.key;
	if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
		parts.push(key === ' ' ? 'Space' : key);
		onChange(parts.join('+'));
		recording = false;
	}
}

function handleBlur() {
	recording = false;
}
</script>

<!-- PH-widget-polish: input は recording 中 placeholder 表示 + cursor 明示、
     button hover transition + title hint で「変更 / キャンセル (Esc)」 -->
<div class="flex items-center gap-2">
  <input
    bind:this={inputEl}
    type="text"
    autocomplete="off"
    tabindex="0"
    class="w-48 cursor-default rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm font-mono text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none {recording
      ? 'border-[var(--ag-accent)] ring-2 ring-[var(--ag-accent)]/40 text-[var(--ag-text-faint)]'
      : ''}"
    readonly
    value={recording ? t('settings.hotkey.press_key') : value}
    onkeydown={handleKeyDown}
    onblur={handleBlur}
    aria-label={t('settings.hotkey.label')}
  />
  <Button
    type="button"
    variant={recording ? 'destructive' : 'outline'}
    size="sm"
    title={recording ? t('common.cancel') : t('settings.hotkey.change')}
    onclick={recording ? cancelRecording : startRecording}
  >
    {recording ? t('common.cancel') : t('common.change')}
  </Button>
</div>
