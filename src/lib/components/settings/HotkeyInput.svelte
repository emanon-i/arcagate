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
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <input
    type="text"
    class="w-48 rounded-md border bg-background px-3 py-2 text-sm font-mono {recording
      ? 'border-primary ring-1 ring-primary'
      : ''}"
    readonly
    value={recording ? "キーを押してください..." : value}
    onkeydown={handleKeyDown}
    onblur={handleBlur}
    aria-label="ホットキー表示"
  />
  <button
    type="button"
    class="rounded-md border px-3 py-2 text-sm {recording
      ? 'border-destructive bg-destructive/10 text-destructive'
      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
    onclick={startRecording}
  >
    {recording ? "キャンセル" : "Record"}
  </button>
</div>
