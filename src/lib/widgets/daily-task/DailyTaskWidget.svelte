<script lang="ts">
import { CheckSquare, ChevronDown, ChevronRight, Plus, X } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);
let newTaskInput = $state('');
// PH-issue-013: 完了タスクは折りたたみ default。component-level state で永続化なし
// (再起動で閉じた状態に戻るが「日次タスク」用途では問題なし、永続化したいなら config に昇格)。
let completedExpanded = $state(false);

interface Task {
	id: string;
	text: string;
	done: boolean;
}

interface DailyTaskConfig {
	tasks?: Task[];
	hideCompleted?: boolean;
	title?: string;
}

let config = $derived.by<DailyTaskConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as DailyTaskConfig;
	} catch {
		return {};
	}
});

// PH-issue-013: 未完了 / 完了で 2 セクションに分割。
// hideCompleted=true の旧 config は後方互換: 完了 section ごと非表示。
let pendingTasks = $derived((config.tasks ?? []).filter((t) => !t.done));
let completedTasks = $derived((config.tasks ?? []).filter((t) => t.done));
let showCompletedSection = $derived(!config.hideCompleted && completedTasks.length > 0);

async function persist(next: DailyTaskConfig) {
	if (!widget) return;
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
}

function addTask() {
	const text = newTaskInput.trim();
	if (!text) return;
	const id = crypto.randomUUID();
	const tasks = [...(config.tasks ?? []), { id, text, done: false }];
	void persist({ ...config, tasks });
	newTaskInput = '';
}

function toggleTask(id: string) {
	const tasks = (config.tasks ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t));
	void persist({ ...config, tasks });
}

function deleteTask(id: string) {
	const tasks = (config.tasks ?? []).filter((t) => t.id !== id);
	void persist({ ...config, tasks });
}

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);
</script>

<WidgetShell title={config.title || 'タスク'} icon={CheckSquare} {menuItems}>
	<!-- PH-widget-polish: input は text-sm に拡大 (text-xs は §4-4「12px 以下注意」)、
	     submit button は disabled 時 cursor-not-allowed + opacity 明示、
	     button に title「Enter で追加」hint、active:scale-[0.95] 触覚 feedback。 -->
	<form
		class="mb-2 flex items-center gap-1"
		onsubmit={(e) => {
			e.preventDefault();
			addTask();
		}}
	>
		<input
			type="text"
			class="min-w-0 flex-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:border-[var(--ag-accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
			placeholder="タスクを追加 (Enter)"
			autocomplete="off"
			bind:value={newTaskInput}
		/>
		<button
			type="submit"
			class="rounded bg-[var(--ag-accent-bg)] p-1.5 text-[var(--ag-accent-text)] transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.95] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--ag-accent-bg)]"
			aria-label="タスクを追加"
			title="追加 (Enter)"
			disabled={!newTaskInput.trim()}
		>
			<Plus class="h-3.5 w-3.5" />
		</button>
	</form>
	<!-- PH-issue-013: 未完了 (上、text-base font-medium) -->
	{#if pendingTasks.length === 0 && completedTasks.length === 0}
		<p class="text-xs text-[var(--ag-text-muted)]">タスクなし</p>
	{:else if pendingTasks.length === 0}
		<p class="text-xs text-[var(--ag-text-muted)]">未完了のタスクなし</p>
	{:else}
		<ul class="space-y-1">
			{#each pendingTasks as task (task.id)}
				<li class="group flex items-center gap-2 text-base">
					<input
						type="checkbox"
						class="h-4 w-4 shrink-0 cursor-pointer accent-[var(--ag-accent-text)]"
						checked={task.done}
						onchange={() => toggleTask(task.id)}
					/>
					<span class="min-w-0 flex-1 truncate font-medium text-[var(--ag-text-primary)]">
						{task.text}
					</span>
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
						aria-label="タスクを削除"
						onclick={() => deleteTask(task.id)}
					>
						<X class="h-4 w-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- PH-issue-013: 完了 section (下、折りたたみ default、text-sm + line-through) -->
	{#if showCompletedSection}
		<div class="mt-3 border-t border-[var(--ag-border)] pt-2">
			<button
				type="button"
				class="flex w-full items-center gap-1 text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] hover:text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] motion-reduce:transition-none"
				aria-expanded={completedExpanded}
				aria-controls="completed-tasks-list"
				onclick={() => (completedExpanded = !completedExpanded)}
			>
				{#if completedExpanded}
					<ChevronDown class="h-3 w-3 shrink-0" />
				{:else}
					<ChevronRight class="h-3 w-3 shrink-0" />
				{/if}
				<span>完了済 ({completedTasks.length})</span>
			</button>
			{#if completedExpanded}
				<ul id="completed-tasks-list" class="mt-1 space-y-1">
					{#each completedTasks as task (task.id)}
						<li class="group flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								class="h-3 w-3 shrink-0 cursor-pointer accent-[var(--ag-accent-text)]"
								checked={task.done}
								onchange={() => toggleTask(task.id)}
							/>
							<span
								class="min-w-0 flex-1 truncate text-[var(--ag-text-muted)] line-through"
							>
								{task.text}
							</span>
							<button
								type="button"
								class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
								aria-label="タスクを削除"
								onclick={() => deleteTask(task.id)}
							>
								<X class="h-3 w-3" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
