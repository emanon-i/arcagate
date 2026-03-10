<script lang="ts">
let {
	value,
	onInput,
	onKeyDown,
	placeholder = '検索...',
}: {
	value: string;
	onInput: (value: string) => void;
	onKeyDown: (e: KeyboardEvent) => void;
	placeholder?: string;
} = $props();
</script>

<input
  type="text"
  autocomplete="off"
  {value}
  {placeholder}
  class="w-full bg-transparent outline-none text-sm px-3 py-2"
  oninput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
  onkeydown={onKeyDown}
/>
