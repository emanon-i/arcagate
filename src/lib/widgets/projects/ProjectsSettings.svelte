<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ProjectsSettings polish — 共通 Switch / clamp / placeholder 統一。
 */
import { open } from '@tauri-apps/plugin-dialog';
import Switch from '$lib/components/common/Switch.svelte';
import { Button } from '$lib/components/ui/button';

interface Props {
	config: {
		max_items?: number;
		git_poll_interval_sec?: number;
		title?: string;
		description?: string;
		watched_folder?: string;
		auto_add?: boolean;
	};
}

let { config = $bindable() }: Props = $props();

let maxItems = $derived(config.max_items ?? 10);
let gitPollInterval = $derived(config.git_poll_interval_sec ?? 60);
let wsTitle = $derived(config.title ?? '');
let wsDescription = $derived(config.description ?? '');
let watchedFolder = $derived(config.watched_folder ?? '');
let autoAdd = $derived(config.auto_add ?? false);

async function handlePickFolder() {
	const selected = await open({
		directory: true,
		multiple: false,
		title: '監視対象フォルダを選択',
	});
	if (!selected || Array.isArray(selected)) return;
	config = { ...config, watched_folder: selected };
}
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-max-items">表示件数 (1〜100)</label>
	<input
		id="ws-max-items"
		type="number"
		min="1"
		max="100"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={maxItems}
		onchange={(e) => {
			config = {
				...config,
				max_items: Math.max(
					1,
					Math.min(100, Number((e.currentTarget as HTMLInputElement).value) || 10),
				),
			};
		}}
	/>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-git-poll">Git ポーリング間隔（秒、10〜600）</label>
	<input
		id="ws-git-poll"
		type="number"
		min="10"
		max="600"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={gitPollInterval}
		onchange={(e) => {
			config = {
				...config,
				git_poll_interval_sec: Math.max(
					10,
					Math.min(600, Number((e.currentTarget as HTMLInputElement).value) || 60),
				),
			};
		}}
	/>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-title">タイトル</label>
	<input
		id="ws-title"
		type="text"
		autocomplete="off"
		placeholder="ウォッチフォルダー"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={wsTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-description">説明 (任意)</label>
	<input
		id="ws-description"
		type="text"
		autocomplete="off"
		placeholder="このウィジェットの目的"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={wsDescription}
		oninput={(e) => {
			config = { ...config, description: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="space-y-1">
	<span class="text-sm font-medium text-[var(--ag-text-primary)]">監視対象フォルダ</span>
	<div class="flex items-center gap-2">
		<div
			class="min-w-0 flex-1 truncate rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-secondary)]"
		>
			{watchedFolder || '未選択'}
		</div>
		<Button type="button" variant="outline" size="sm" onclick={handlePickFolder}>選択</Button>
	</div>
</div>

<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">配下フォルダの自動追加</span>
	<Switch
		checked={autoAdd}
		onChange={(v) => {
			config = { ...config, auto_add: v };
		}}
		aria-label="配下フォルダを自動的に追加する"
	/>
</div>
