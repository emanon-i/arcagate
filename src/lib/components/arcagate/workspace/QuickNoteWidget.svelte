<script lang="ts">
import { StickyNote } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { updateWidgetConfig } from '$lib/ipc/workspace';
import { toastStore } from '$lib/state/toast.svelte';
import { QUICK_NOTE_DEFAULTS } from '$lib/types/widget-configs';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();

const MAX_CHARS = 500;

let config = $derived(parseWidgetConfig(widget?.config, QUICK_NOTE_DEFAULTS));
let noteText = $state('');
let saveTimer: ReturnType<typeof setTimeout> | null = null;

$effect(() => {
	noteText = config.note;
});

function handleInput(e: Event) {
	const val = (e.target as HTMLTextAreaElement).value;
	if (val.length > MAX_CHARS) return;
	noteText = val;
	if (saveTimer !== null) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		void saveNote();
	}, 500);
}

async function saveNote() {
	if (!widget) return;
	try {
		await updateWidgetConfig(widget.id, JSON.stringify({ note: noteText }));
	} catch (e: unknown) {
		toastStore.add(`メモの保存に失敗しました: ${String(e)}`, 'error');
	}
}
</script>

<WidgetShell title="Quick Note" icon={StickyNote} menuItems={[]}>
	<div class="flex flex-col gap-1">
		<textarea
			class="min-h-[80px] w-full resize-none rounded-lg bg-[var(--ag-surface-2)] p-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
			placeholder="メモを入力..."
			value={noteText}
			oninput={handleInput}
			maxlength={MAX_CHARS}
		></textarea>
		{#if noteText.length > MAX_CHARS - 50}
			<span class="text-right text-[10px] text-[var(--ag-text-muted)]">
				{noteText.length}/{MAX_CHARS}
			</span>
		{/if}
	</div>
</WidgetShell>
