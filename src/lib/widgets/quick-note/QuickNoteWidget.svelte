<script lang="ts">
import { Settings, StickyNote } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { QUICK_NOTE_DEFAULTS, type QuickNoteFontSize } from '$lib/types/widget-configs';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { formatIpcError } from '$lib/utils/ipc-error';
import { parseWidgetConfig } from '$lib/utils/widget-config';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();

const MAX_CHARS = 500;

const FONT_SIZE_CLASS: Record<QuickNoteFontSize, string> = {
	sm: 'text-xs',
	md: 'text-sm',
	lg: 'text-base',
};

let config = $derived(parseWidgetConfig(widget?.config, QUICK_NOTE_DEFAULTS));
let noteText = $state('');
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let settingsOpen = $state(false);

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
		await workspaceStore.updateWidgetConfig(
			widget.id,
			JSON.stringify({ ...config, note: noteText }),
		);
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'メモの保存' }, e), 'error');
	}
}

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					icon: Settings,
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);
</script>

<WidgetShell title={WIDGET_LABELS.quick_note} icon={StickyNote} {menuItems}>
	<div class="flex h-full flex-col gap-1">
		<textarea
			class="h-0 w-full flex-1 resize-none rounded-lg bg-[var(--ag-surface-2)] p-2 {FONT_SIZE_CLASS[config.font_size]} text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
			placeholder="メモを入力..."
			value={noteText}
			oninput={handleInput}
			maxlength={MAX_CHARS}
		></textarea>
		{#if noteText.length > MAX_CHARS - 50}
			<span class="shrink-0 text-right text-xs text-[var(--ag-text-muted)]">
				{noteText.length}/{MAX_CHARS}
			</span>
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
