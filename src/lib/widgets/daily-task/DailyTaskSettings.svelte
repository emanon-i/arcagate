<script lang="ts">
/**
 * PH-issue-027 / 検収項目 #21 横展開: DailyTaskWidget 専用 Settings dialog content。
 *
 * 旧実装は CommonMaxItemsSettings (max_items + sort_field) を使っていたが、
 * DailyTaskConfig schema は `{ tasks, hideCompleted, title }` で max_items は無い。
 * 本 component で title + hideCompleted toggle に置換。
 */
import Switch from '$lib/components/common/Switch.svelte';

interface Props {
	config: {
		title?: string;
		hideCompleted?: boolean;
		tasks?: unknown[];
	};
}

let { config = $bindable() }: Props = $props();

let widgetTitle = $derived(config.title ?? '');
let hideCompleted = $derived(config.hideCompleted ?? false);
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-task-title">タイトル</label>
	<input
		id="ws-task-title"
		type="text"
		autocomplete="off"
		placeholder="タスク"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={widgetTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">完了タスクを非表示</span>
	<Switch
		checked={hideCompleted}
		onChange={(v) => {
			config = { ...config, hideCompleted: v };
		}}
		aria-label="完了タスクを非表示にする"
	/>
</div>
