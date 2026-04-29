<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ProjectsSettings polish — 共通 Switch / clamp / placeholder 統一。
 * PH-issue-039 / 検収項目 #12, #13: 名称「フォルダ監視」+ Clear button 追加。
 */
import { X } from '@lucide/svelte';
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

// PH-issue-039 / 検収項目 #13: 監視対象フォルダの reset
function handleClearFolder() {
	config = { ...config, watched_folder: '' };
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
		placeholder="フォルダ監視"
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
		{#if watchedFolder}
			<!-- PH-issue-039 / 検収項目 #13: Clear button (ghost-icon、destructive hover) -->
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-destructive hover:bg-destructive/10 hover:text-destructive"
				onclick={handleClearFolder}
				aria-label="監視フォルダを解除"
			>
				<X class="h-3.5 w-3.5" />
			</Button>
		{/if}
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
