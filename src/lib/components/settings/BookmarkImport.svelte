<script lang="ts">
import { Bookmark, Loader2 } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { CreateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import { getErrorMessage } from '$lib/utils/format-error';

/**
 * U-2 (2026-05-12): screens-and-flows.md Library § 仕様
 *   「ブックマークのファイルを取り込んで一部選択または一括選択などでアイテムとして
 *    取り込める（取り込み時にタグも付与できる）」
 *
 * 流れ: ファイル選択 → backend `cmd_parse_bookmark_file` で URL リスト取得 →
 *       checkbox 一覧 + tag selector → 「インポート」 で bulk createItem。
 */

interface ParsedBookmark {
	url: string;
	title: string;
}

let parsing = $state(false);
let parsed = $state<ParsedBookmark[]>([]);
let selected = $state<Set<number>>(new Set());
let selectedTagIds = $state<Set<string>>(new Set());
let importing = $state(false);

let userTags = $derived(itemStore.tags.filter((t: Tag) => !t.is_system));

async function pickAndParse() {
	const path = await openDialog({
		multiple: false,
		filters: [
			{ name: t('settings.bookmark.filter_html'), extensions: ['html', 'htm'] },
			{ name: t('settings.bookmark.filter_all'), extensions: ['*'] },
		],
	});
	if (!path) return;
	parsing = true;
	try {
		const list = await invoke<ParsedBookmark[]>('cmd_parse_bookmark_file', { path });
		parsed = list;
		selected = new Set(list.map((_, i) => i)); // default 全選択
		if (list.length === 0) {
			toastStore.add(t('toast.url_not_found'), 'info');
		}
	} catch (e) {
		toastStore.add(t('toast.bookmark_read_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		parsing = false;
	}
}

function toggle(i: number): void {
	const next = new Set(selected);
	if (next.has(i)) next.delete(i);
	else next.add(i);
	selected = next;
}

function selectAll(): void {
	selected = new Set(parsed.map((_, i) => i));
}

function selectNone(): void {
	selected = new Set();
}

function toggleTag(id: string): void {
	const next = new Set(selectedTagIds);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	selectedTagIds = next;
}

async function performImport() {
	if (selected.size === 0) return;
	importing = true;
	const targets = [...selected].map((i) => parsed[i]).filter(Boolean);
	const tagIds = [...selectedTagIds];
	let success = 0;
	let failed = 0;
	try {
		for (const bm of targets) {
			const input: CreateItemInput = {
				item_type: 'url',
				label: bm.title,
				target: bm.url,
				args: null,
				working_dir: null,
				icon_path: null,
				aliases: [],
				tag_ids: tagIds,
				is_tracked: false,
			};
			try {
				await itemStore.createItem(input);
				success += 1;
			} catch {
				failed += 1;
			}
		}
		toastStore.add(
			failed === 0
				? t('settings.bookmark.import_success', { count: success })
				: t('settings.bookmark.import_partial', { success, failed }),
			failed === 0 ? 'success' : 'info',
		);
		// 全成功時のみ状態リセット (失敗あったら user が状況確認できるよう残す)
		if (failed === 0) {
			parsed = [];
			selected = new Set();
			selectedTagIds = new Set();
		}
	} finally {
		importing = false;
	}
}
</script>

<div class="space-y-4" data-testid="bookmark-import">
	<div>
		<h4 class="mb-1 text-sm font-medium text-[var(--ag-text-primary)]">
			{t('settings.bookmark.heading')}
		</h4>
		<p class="text-xs text-[var(--ag-text-muted)]">
			{t('settings.bookmark.desc')}
		</p>
	</div>

	<Button type="button" variant="outline" size="sm" disabled={parsing} onclick={() => void pickAndParse()}>
		{#if parsing}
			<Loader2 class="h-4 w-4 animate-spin" />
			{t('settings.bookmark.parsing')}
		{:else}
			<Bookmark class="h-4 w-4" />
			{t('settings.bookmark.pick_button')}
		{/if}
	</Button>

	{#if parsed.length > 0}
		<div class="space-y-3 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<div class="flex items-center justify-between text-xs text-[var(--ag-text-secondary)]">
				<span>
					{t('settings.bookmark.selection_status', { total: parsed.length, selected: selected.size })}
				</span>
				<div class="flex gap-1">
					<Button type="button" variant="ghost" size="sm" onclick={selectAll}>{t('settings.bookmark.select_all')}</Button>
					<Button type="button" variant="ghost" size="sm" onclick={selectNone}>{t('settings.bookmark.select_none')}</Button>
				</div>
			</div>

			<!-- 選択リスト (max-h で長文 scroll、 line-clamp 1 で URL/title 行) -->
			<ul class="max-h-64 overflow-y-auto space-y-1 [scrollbar-gutter:stable]" data-testid="bookmark-import-list">
				{#each parsed as bm, i (bm.url)}
					<li class="flex items-start gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--ag-surface-3)]">
						<input
							type="checkbox"
							class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--ag-accent-text)]"
							checked={selected.has(i)}
							onchange={() => toggle(i)}
							aria-label={t('settings.bookmark.item_select_aria', { title: bm.title })}
						/>
						<div class="min-w-0 flex-1">
							<div class="truncate font-medium text-[var(--ag-text-primary)]" title={bm.title}>{bm.title}</div>
							<div class="truncate text-[var(--ag-text-muted)]" title={bm.url}>{bm.url}</div>
						</div>
					</li>
				{/each}
			</ul>

			<!-- タグ付与 (任意、 user タグから複数選択可) -->
			{#if userTags.length > 0}
				<div>
					<div class="mb-1.5 text-xs font-medium text-[var(--ag-text-secondary)]">
						{t('settings.bookmark.tag_label')}
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each userTags as tag (tag.id)}
							<button
								type="button"
								class="rounded-full border px-2 py-0.5 text-xs transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none {selectedTagIds.has(tag.id)
									? 'border-[var(--ag-accent)] bg-[var(--ag-accent-bg)] text-[var(--ag-accent-text)]'
									: 'border-[var(--ag-border)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]'}"
								onclick={() => toggleTag(tag.id)}
							>
								{tag.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex justify-end">
				<Button
					type="button"
					variant="default"
					size="sm"
					disabled={selected.size === 0 || importing}
					onclick={() => void performImport()}
				>
					{#if importing}
						<Loader2 class="h-4 w-4 animate-spin" />
						{t('settings.bookmark.importing')}
					{:else}
						{t('settings.bookmark.import_button', { count: selected.size })}
					{/if}
				</Button>
			</div>
		</div>
	{/if}
</div>
