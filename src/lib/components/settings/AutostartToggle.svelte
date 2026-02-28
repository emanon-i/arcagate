<script lang="ts">
let {
	enabled,
	onChange,
}: {
	enabled: boolean;
	onChange: (enabled: boolean) => void;
} = $props();
</script>

<label class="flex cursor-pointer items-center gap-3">
  <input
    type="checkbox"
    class="h-4 w-4 rounded border accent-primary"
    checked={enabled}
    onchange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
  />
  <span class="text-sm">起動時に自動起動する</span>
</label>
