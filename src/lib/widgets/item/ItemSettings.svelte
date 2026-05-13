<script lang="ts">
/**
 * 5/03 user 検収 (C) → 5/04 post-redo3 #6 で UX 整理。
 *
 * user fb 「追加アイテムがないとまたアイテムの設定画面がおかしい」:
 *   旧実装は「アイテム未選択」 placeholder + 別の場所に「アイテムを追加」 button + 並び順 select が
 *   全部並んでいて、empty 状態でも全 sections 表示。視認性が悪く「おかしい」と感じる。
 * 修正:
 *   - empty 時: prominent CTA「アイテムを追加」 button のみを表示 (placeholder + button 二重撤廃)
 *   - 並び順 select は 2 件以上のとき**だけ**表示 (1 件以下では並べる対象が無い)
 *   - 「アイテムを追加」 button は常時 visible だが、empty 時は CTA 兼ねる
 *
 * 5/03 仕様維持:
 *   - `item_ids[]` collection (legacy `item_id` 単一形式は migration 023 で削除済、A3 PR-H)
 *   - manual sort で ↑↓ ボタン表示、name 順では非表示
 *   - 全解除 button (1 件以上)
 */
import { Package, Plus, X } from '@lucide/svelte';
import { onMount } from 'svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import LibraryItemPicker from '$lib/components/arcagate/workspace/LibraryItemPicker.svelte';
import { Button } from '$lib/components/ui/button';
import type { Opener } from '$lib/ipc/opener';
import { itemStore } from '$lib/state/items.svelte';
import { openersStore } from '$lib/state/openers.svelte';
import type { Item } from '$lib/types/item';

interface Props {
	config: {
		item_ids?: string[];
		view_mode?: 'grid' | 'list';
		sort_field?: 'manual' | 'name' | 'recent';
		/** C-15 #19: Widget レベルの起動アプリ default。 */
		default_opener_id?: string | null;
	};
}

let { config = $bindable() }: Props = $props();

let pickerOpen = $state(false);

// C-15 #19: Opener 一覧 (widget default opener select 用)。
// audit 2026-05-13 G4: shared openersStore 経由で fetch (5 file 集約)。
// Codex Round 3 fix: error 時は best-effort で空 list 維持 (widget level UI で fatal 化しない)。
let openers = $state<Opener[]>([]);
onMount(() => {
	openersStore
		.load()
		.then((list) => {
			openers = list;
		})
		.catch(() => {
			// best-effort: opener fetch 失敗時は widget の opener select が出ないだけ、
			// OpenerSettings (CRUD 経路) で error UI を出すので個別 widget 設定では黙殺 OK。
		});
});

let itemIds = $derived.by<string[]>(() => config.item_ids ?? []);

let sortField = $derived<'manual' | 'name' | 'recent'>(config.sort_field ?? 'manual');

let pinnedItems = $derived.by<Item[]>(() =>
	itemIds
		.map((id) => itemStore.items.find((i) => i.id === id))
		.filter((i): i is Item => i !== undefined),
);

function selectMany(items: Item[]) {
	pickerOpen = false;
	if (items.length === 0) return;
	// 既存 item_ids に追加 (重複は除外)。
	const existing = new Set(itemIds);
	const next = [...itemIds];
	for (const it of items) {
		if (!existing.has(it.id)) next.push(it.id);
	}
	config = { ...config, item_ids: next };
}

function selectSingle(item: Item) {
	pickerOpen = false;
	const existing = new Set(itemIds);
	if (existing.has(item.id)) return;
	config = { ...config, item_ids: [...itemIds, item.id] };
}

function removeAt(index: number) {
	const next = [...itemIds];
	next.splice(index, 1);
	config = { ...config, item_ids: next };
}

function moveUp(index: number) {
	if (index <= 0) return;
	const next = [...itemIds];
	[next[index - 1], next[index]] = [next[index], next[index - 1]];
	config = { ...config, item_ids: next };
}

function moveDown(index: number) {
	if (index >= itemIds.length - 1) return;
	const next = [...itemIds];
	[next[index], next[index + 1]] = [next[index + 1], next[index]];
	config = { ...config, item_ids: next };
}

function clearAll() {
	config = { ...config, item_ids: [] };
}

function setSort(value: 'manual' | 'name' | 'recent') {
	config = { ...config, sort_field: value };
}
</script>

{#if pinnedItems.length === 0}
	<!-- empty 時: prominent CTA のみ。placeholder + 別 button の二重表示を撤廃。 -->
	<button
		type="button"
		class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-8 text-[var(--ag-text-muted)] transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-accent)] hover:bg-[var(--ag-accent-bg)]/50 hover:text-[var(--ag-accent-text)]"
		aria-label="アイテムを追加"
		onclick={() => (pickerOpen = true)}
	>
		<Package class="h-6 w-6" />
		<span class="text-sm font-medium">アイテムを追加</span>
		<span class="px-3 text-xs leading-relaxed text-[var(--ag-text-faint)]">
			ライブラリから 1 件以上のアイテムを選択
		</span>
	</button>
{:else}
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">
				紐付いたアイテム ({pinnedItems.length} 件)
			</p>
			<Button type="button" variant="outline" size="sm" onclick={clearAll}>
				<X class="h-3.5 w-3.5" />
				全解除
			</Button>
		</div>
		<ul class="space-y-1">
			{#each pinnedItems as item, index (item.id)}
				<li
					class="flex items-center gap-2 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1.5"
				>
					<ItemIcon
						iconPath={item.icon_path}
						itemType={item.item_type}
						alt="{item.label} icon"
						class="h-6 w-6 shrink-0 object-contain"
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-[var(--ag-text-primary)]">{item.label}</p>
						<p class="truncate font-mono text-xs text-[var(--ag-text-muted)]">{item.target}</p>
					</div>
					{#if sortField === 'manual' && pinnedItems.length > 1}
						<button
							type="button"
							class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:opacity-30"
							aria-label="{item.label} を上に移動"
							disabled={index === 0}
							onclick={() => moveUp(index)}
						>↑</button>
						<button
							type="button"
							class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] disabled:opacity-30"
							aria-label="{item.label} を下に移動"
							disabled={index === pinnedItems.length - 1}
							onclick={() => moveDown(index)}
						>↓</button>
					{/if}
					<button
						type="button"
						class="rounded p-0.5 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-error-border)] hover:bg-[var(--ag-error-bg)] hover:text-[var(--ag-error-text)]"
						aria-label="{item.label} を解除"
						onclick={() => removeAt(index)}
					>
						<X class="h-3.5 w-3.5" />
					</button>
				</li>
			{/each}
		</ul>
	</div>

	<div class="flex items-center gap-2">
		<Button type="button" variant="outline" size="sm" onclick={() => (pickerOpen = true)}>
			<Plus class="h-3.5 w-3.5" />
			さらに追加
		</Button>
	</div>

	<!-- 並び順 select は 2 件以上で意味がある -->
	{#if pinnedItems.length >= 2}
		<div class="space-y-1">
			<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-item-sort">並び順</label>
			<select
				id="ws-item-sort"
				class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
				value={sortField}
				onchange={(e) =>
					setSort((e.currentTarget as HTMLSelectElement).value as 'manual' | 'name' | 'recent')}
			>
				<option value="manual">手動 (↑↓ で並べ替え)</option>
				<option value="name">名前順 (昇順)</option>
				<option value="recent">最近起動した順 (将来対応)</option>
			</select>
		</div>
	{/if}

	<!-- C-15 #19: widget レベルの起動アプリ default (cascade で card override の下、system の上) -->
	<div class="space-y-1">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-item-default-opener">
			デフォルト起動アプリ
		</label>
		<select
			id="ws-item-default-opener"
			class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
			value={config.default_opener_id ?? ''}
			onchange={(e) => {
				const v = (e.currentTarget as HTMLSelectElement).value;
				config = { ...config, default_opener_id: v || null };
			}}
		>
			<option value="">既定 (system) / item.default_app に従う</option>
			{#each openers as op (op.id)}
				<option value={op.id}>{op.name}{op.is_builtin ? ' (組み込み)' : ''}</option>
			{/each}
		</select>
		<p class="text-xs text-[var(--ag-text-muted)]">
			この widget からの起動でこの Opener を使う。Library カード個別設定が指定されてればそちらが優先。
		</p>
	</div>
{/if}

{#if pickerOpen}
	<LibraryItemPicker
		multi={true}
		onSelect={selectSingle}
		onSelectMany={selectMany}
		onClose={() => (pickerOpen = false)}
	/>
{/if}
