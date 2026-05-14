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
			{ name: 'ブックマーク (HTML)', extensions: ['html', 'htm'] },
			{ name: 'すべて', extensions: ['*'] },
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
		toastStore.add(`読み込み失敗: ${getErrorMessage(e)}`, 'error');
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
				? `${success} 件のブックマークをインポートしました`
				: `${success} 件成功 / ${failed} 件失敗`,
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
			ブックマークから取り込み
		</h4>
		<p class="text-xs text-[var(--ag-text-muted)]">
			ブラウザのブックマーク HTML (Chrome / Firefox / Edge のエクスポート形式) を選んで、
			URL をまとめて Library に登録できます。 取り込み時にタグを付与可能です。
		</p>
	</div>

	<Button type="button" variant="outline" size="sm" disabled={parsing} onclick={() => void pickAndParse()}>
		{#if parsing}
			<Loader2 class="h-4 w-4 animate-spin" />
			解析中...
		{:else}
			<Bookmark class="h-4 w-4" />
			ブックマーク HTML を選ぶ
		{/if}
	</Button>

	{#if parsed.length > 0}
		<div class="space-y-3 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<div class="flex items-center justify-between text-xs text-[var(--ag-text-secondary)]">
				<span>
					{parsed.length} 件中 <strong class="text-[var(--ag-text-primary)]">{selected.size}</strong> 件選択中
				</span>
				<div class="flex gap-1">
					<button type="button" class="rounded px-2 py-0.5 hover:bg-[var(--ag-surface-3)]" onclick={selectAll}>すべて</button>
					<button type="button" class="rounded px-2 py-0.5 hover:bg-[var(--ag-surface-3)]" onclick={selectNone}>解除</button>
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
							aria-label={`${bm.title} を選択`}
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
						取り込み時にタグを付与 (任意)
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
						インポート中...
					{:else}
						{selected.size} 件をインポート
					{/if}
				</Button>
			</div>
		</div>
	{/if}
</div>
