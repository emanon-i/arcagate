<script lang="ts">
import { CheckSquare, Plus, X } from '@lucide/svelte';
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

// PH-488: 完了/未完了をツリー分割
let pendingTasks = $derived((config.tasks ?? []).filter((t) => !t.done));
let doneTasks = $derived((config.tasks ?? []).filter((t) => t.done));
// 完了 group の折りたたみ state (default 折りたたみ)
let doneOpen = $state(false);

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
	<form
		class="mb-2 flex items-center gap-1"
		onsubmit={(e) => {
			e.preventDefault();
			addTask();
		}}
	>
		<input
			type="text"
			class="min-w-0 flex-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-ag-xs text-[var(--ag-text-primary)] focus-visible:border-[var(--ag-accent)] focus-visible:outline-none"
			placeholder="タスクを追加..."
			autocomplete="off"
			bind:value={newTaskInput}
		/>
		<button
			type="submit"
			class="rounded bg-[var(--ag-accent-bg)] p-1 text-[var(--ag-accent-text)] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			aria-label="タスクを追加"
			disabled={!newTaskInput.trim()}
		>
			<Plus class="h-3 w-3" />
		</button>
	</form>
	<!-- PH-488: 未完了 + 完了済み の 2 group ツリー、文字 ag-xs → ag-sm -->
	{#if (config.tasks?.length ?? 0) === 0}
		<p class="text-ag-sm text-[var(--ag-text-muted)]">タスクなし</p>
	{:else}
		<!-- 未完了 group (default 展開) -->
		<div class="mb-2">
			<div
				class="mb-1 flex items-center gap-2 text-ag-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]"
			>
				<span>未完了</span>
				<span class="rounded-full bg-[var(--ag-surface-3)] px-1.5 text-[10px]">{pendingTasks.length}</span>
			</div>
			{#if pendingTasks.length === 0}
				<p class="pl-2 text-ag-xs text-[var(--ag-text-muted)]">未完了のタスクなし</p>
			{:else}
				<ul class="space-y-1">
					{#each pendingTasks as task (task.id)}
						<li class="group flex items-center gap-2 text-ag-sm">
							<input
								type="checkbox"
								class="h-4 w-4 shrink-0 cursor-pointer accent-[var(--ag-accent-text)]"
								checked={task.done}
								onchange={() => toggleTask(task.id)}
							/>
							<span class="min-w-0 flex-1 truncate text-[var(--ag-text-primary)]" title={task.text}>
								{task.text}
							</span>
							<button
								type="button"
								class="rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
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

		<!-- 完了済み group (default 折りたたみ) -->
		{#if doneTasks.length > 0}
			<div>
				<button
					type="button"
					class="mb-1 flex w-full items-center gap-2 text-ag-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)] transition-colors hover:text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					aria-expanded={doneOpen}
					onclick={() => (doneOpen = !doneOpen)}
				>
					<span>{doneOpen ? '▾' : '▸'}</span>
					<span>完了済み</span>
					<span class="rounded-full bg-[var(--ag-surface-3)] px-1.5 text-[10px] normal-case">{doneTasks.length}</span>
				</button>
				{#if doneOpen}
					<ul class="space-y-1">
						{#each doneTasks as task (task.id)}
							<li class="group flex items-center gap-2 text-ag-sm">
								<input
									type="checkbox"
									class="h-4 w-4 shrink-0 cursor-pointer accent-[var(--ag-accent-text)]"
									checked={task.done}
									onchange={() => toggleTask(task.id)}
								/>
								<span
									class="min-w-0 flex-1 truncate text-[var(--ag-text-muted)] line-through"
									title={task.text}
								>
									{task.text}
								</span>
								<button
									type="button"
									class="rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
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
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
