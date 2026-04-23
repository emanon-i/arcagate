<script lang="ts">
let {
	value,
	onChange,
}: {
	value: string;
	onChange: (hotkey: string) => void;
} = $props();

let recording = $state(false);

function startRecording() {
	recording = true;
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

<div class="flex items-center gap-2">
  <input
    type="text"
    autocomplete="off"
    tabindex="0"
    class="w-48 rounded-md border bg-background px-3 py-2 text-sm font-mono {recording
      ? 'border-[var(--ag-accent)] ring-1 ring-[var(--ag-accent)]'
      : ''}"
    readonly
    value={recording ? "キーを押してください..." : value}
    onkeydown={handleKeyDown}
    onblur={handleBlur}
    aria-label="ホットキー表示"
  />
  <button
    type="button"
    class="rounded-md border px-3 py-2 text-sm transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {recording
      ? 'border-destructive bg-destructive/10 text-destructive'
      : 'bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-4)]'}"
    onclick={startRecording}
  >
    {recording ? "キャンセル" : "変更"}
  </button>
</div>
