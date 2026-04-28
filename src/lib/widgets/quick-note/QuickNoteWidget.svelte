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
// PH-widget-polish: save 状態を可視化 (P1 操作可視化、user に「保存されてる」安心感)。
// 'idle': 初期 / 'pending': debounce 中 / 'saving': IPC 中 / 'saved': 完了 (2 秒で idle へ)
let saveStatus = $state<'idle' | 'pending' | 'saving' | 'saved'>('idle');
let savedClearTimer: ReturnType<typeof setTimeout> | null = null;

$effect(() => {
	noteText = config.note;
});

function handleInput(e: Event) {
	const val = (e.target as HTMLTextAreaElement).value;
	if (val.length > MAX_CHARS) return;
	noteText = val;
	saveStatus = 'pending';
	if (saveTimer !== null) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		void saveNote();
	}, 500);
}

async function saveNote() {
	if (!widget) return;
	saveStatus = 'saving';
	try {
		await workspaceStore.updateWidgetConfig(
			widget.id,
			JSON.stringify({ ...config, note: noteText }),
		);
		saveStatus = 'saved';
		if (savedClearTimer !== null) clearTimeout(savedClearTimer);
		savedClearTimer = setTimeout(() => {
			saveStatus = 'idle';
		}, 2000);
	} catch (e: unknown) {
		saveStatus = 'idle';
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
		<!-- PH-widget-polish: 保存状態 + 文字数を 1 行に。
		     status は P1 操作可視化、文字数は MAX 50 字以内で表示 (近づいたら警告色)。 -->
		<div class="flex shrink-0 items-center justify-between gap-2 text-xs">
			<span
				class="text-[var(--ag-text-muted)]"
				class:text-[var(--ag-warm-text)]={saveStatus === 'pending' || saveStatus === 'saving'}
				class:text-[var(--ag-success-text)]={saveStatus === 'saved'}
				aria-live="polite"
			>
				{#if saveStatus === 'pending'}
					保存待機...
				{:else if saveStatus === 'saving'}
					保存中...
				{:else if saveStatus === 'saved'}
					✓ 保存済み
				{:else}&nbsp;{/if}
			</span>
			{#if noteText.length > MAX_CHARS - 50}
				<span
					class="tabular-nums"
					class:text-[var(--ag-text-muted)]={noteText.length < MAX_CHARS - 10}
					class:text-[var(--ag-warm-text)]={noteText.length >= MAX_CHARS - 10
						&& noteText.length < MAX_CHARS}
					class:text-[var(--ag-error-text)]={noteText.length >= MAX_CHARS}
				>
					{noteText.length}/{MAX_CHARS}
				</span>
			{/if}
		</div>
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
