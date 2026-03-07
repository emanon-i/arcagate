<script lang="ts">
import { CircleDot, FolderKanban, GitBranch } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { launchItem } from '$lib/ipc/launch';
import { getFolderItems, getGitStatus } from '$lib/ipc/workspace';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';

const POLL_INTERVAL_MS = 30_000;

let folderItems = $state<Item[]>([]);
let gitStatuses = $state<Record<string, GitStatus>>({});

async function fetchGitStatuses(items: Item[]): Promise<void> {
	const entries: Record<string, GitStatus> = {};
	await Promise.all(
		items
			.filter((item) => item.item_type === 'folder')
			.map(async (item) => {
				try {
					entries[item.id] = await getGitStatus(item.target);
				} catch {
					// git なしフォルダはスキップ
				}
			}),
	);
	gitStatuses = entries;
}

$effect(() => {
	void getFolderItems().then((items) => {
		folderItems = items;
		void fetchGitStatuses(items);
	});
});

// 30秒ポーリング
$effect(() => {
	if (folderItems.length === 0) return;
	const timer = setInterval(() => {
		void fetchGitStatuses(folderItems);
	}, POLL_INTERVAL_MS);
	return () => clearInterval(timer);
});
</script>

<WidgetShell title="Projects & Git status" icon={GitBranch}>
	<div class="grid gap-3 md:grid-cols-3">
		{#each folderItems as item (item.id)}
			{@const gs = gitStatuses[item.id]}
			<button
				type="button"
				class="rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-4 text-left hover:bg-[var(--ag-surface-4)]"
				onclick={() => void launchItem(item.id)}
			>
				<div class="mb-2 flex items-center justify-between">
					<div class="text-sm font-semibold text-[var(--ag-text-primary)]">{item.label}</div>
					<FolderKanban class="h-4 w-4 text-[var(--ag-text-faint)]" />
				</div>
				<div class="truncate text-xs text-[var(--ag-text-muted)]">{item.target}</div>
				{#if gs}
					<div class="mt-2 flex items-center gap-2 text-xs text-[var(--ag-text-secondary)]">
						<GitBranch class="h-3.5 w-3.5" />
						<span class="truncate">{gs.branch}</span>
						{#if gs.has_changes}
							<span
								class="flex items-center gap-0.5 text-[var(--ag-warm-text)]"
								title="{gs.changed_count} 件の変更"
							>
								<CircleDot class="h-3 w-3" />
								{gs.changed_count}
							</span>
						{/if}
					</div>
				{/if}
			</button>
		{/each}
		{#if folderItems.length === 0}
			<div class="col-span-3 py-4 text-center text-xs text-[var(--ag-text-muted)]">
				フォルダ型アイテムがここに表示されます
			</div>
		{/if}
	</div>
</WidgetShell>
