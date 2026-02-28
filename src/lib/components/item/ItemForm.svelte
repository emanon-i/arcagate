<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { extractItemIcon } from '$lib/ipc/items';
import type { Category } from '$lib/types/category';
import type { CreateItemInput, Item, ItemType, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import DropZone from './DropZone.svelte';

let {
	item,
	categories,
	tags,
	onSubmit,
	onCancel,
}: {
	item?: Item;
	categories: Category[];
	tags: Tag[];
	onSubmit: (input: CreateItemInput | UpdateItemInput) => void;
	onCancel: () => void;
} = $props();

const itemTypes: ItemType[] = ['exe', 'url', 'folder', 'script', 'command'];

let itemType = $state<ItemType>('exe');
let label = $state('');
let target = $state('');
let args = $state('');
let workingDir = $state('');
let iconPath = $state('');
let aliasesText = $state('');
let selectedCategoryIds = $state<Set<string>>(new Set());
let selectedTagIds = $state<Set<string>>(new Set());

// Sync form fields when the item prop changes (e.g. switching from create to edit)
$effect(() => {
	itemType = item?.item_type ?? 'exe';
	label = item?.label ?? '';
	target = item?.target ?? '';
	args = item?.args ?? '';
	workingDir = item?.working_dir ?? '';
	iconPath = item?.icon_path ?? '';
	aliasesText = item?.aliases.join(', ') ?? '';
	selectedCategoryIds = new Set();
	selectedTagIds = new Set();
});

function handleSubmit(e: Event) {
	e.preventDefault();
	const aliases = aliasesText
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	if (item) {
		const input: UpdateItemInput = {
			label: label || undefined,
			target: target || undefined,
			args: args || null,
			working_dir: workingDir || null,
			icon_path: iconPath || null,
			aliases,
			category_ids: Array.from(selectedCategoryIds),
			tag_ids: Array.from(selectedTagIds),
		};
		onSubmit(input);
	} else {
		const input: CreateItemInput = {
			item_type: itemType,
			label,
			target,
			args: args || null,
			working_dir: workingDir || null,
			icon_path: iconPath || null,
			aliases,
			category_ids: Array.from(selectedCategoryIds),
			tag_ids: Array.from(selectedTagIds),
		};
		onSubmit(input);
	}
}

function toggleCategory(id: string) {
	const next = new Set(selectedCategoryIds);
	if (next.has(id)) {
		next.delete(id);
	} else {
		next.add(id);
	}
	selectedCategoryIds = next;
}

function toggleTag(id: string) {
	const next = new Set(selectedTagIds);
	if (next.has(id)) {
		next.delete(id);
	} else {
		next.add(id);
	}
	selectedTagIds = next;
}

function detectType(path: string): ItemType {
	const lower = path.toLowerCase();
	if (lower.endsWith('.exe')) return 'exe';
	if (lower.endsWith('.ps1') || lower.endsWith('.bat') || lower.endsWith('.cmd')) return 'script';
	return 'exe';
}

async function handleDrop(paths: string[]) {
	const path = paths[0];
	if (!path) return;
	const detected = detectType(path);
	itemType = detected;
	target = path;
	if (!label) {
		const filename = path.split(/[\\/]/).pop() ?? '';
		label = filename.replace(/\.[^.]+$/, '');
	}
	if (detected === 'exe') {
		const extracted = await extractItemIcon(path).catch(() => null);
		if (extracted) iconPath = extracted;
	}
}
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
  {#if !item}
    <DropZone onDrop={handleDrop} />
  {/if}

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-type">タイプ</label>
    <select
      id="item-type"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={itemType}
      disabled={!!item}
    >
      {#each itemTypes as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-label">ラベル <span class="text-destructive">*</span></label>
    <input
      id="item-label"
      type="text"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={label}
      required
      placeholder="表示名"
    />
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-target">ターゲット <span class="text-destructive">*</span></label>
    <input
      id="item-target"
      type="text"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={target}
      required
      placeholder="実行ファイルのパス、URL など"
    />
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-args">引数</label>
    <input
      id="item-args"
      type="text"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={args}
      placeholder="--flag value"
    />
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-working-dir">作業ディレクトリ</label>
    <input
      id="item-working-dir"
      type="text"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={workingDir}
      placeholder="C:\path\to\dir"
    />
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-icon-path">アイコンパス</label>
    <input
      id="item-icon-path"
      type="text"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={iconPath}
      placeholder="C:\path\to\icon.ico"
    />
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium" for="item-aliases">エイリアス（カンマ区切り）</label>
    <input
      id="item-aliases"
      type="text"
      class="w-full rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={aliasesText}
      placeholder="alias1, alias2"
    />
  </div>

  {#if categories.length > 0}
    <div class="space-y-2">
      <p class="text-sm font-medium">カテゴリ</p>
      <div class="flex flex-wrap gap-2">
        {#each categories as category (category.id)}
          <label class="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={selectedCategoryIds.has(category.id)}
              onchange={() => toggleCategory(category.id)}
            />
            {category.name}
          </label>
        {/each}
      </div>
    </div>
  {/if}

  {#if tags.length > 0}
    <div class="space-y-2">
      <p class="text-sm font-medium">タグ</p>
      <div class="flex flex-wrap gap-2">
        {#each tags as tag (tag.id)}
          <label class="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={selectedTagIds.has(tag.id)}
              onchange={() => toggleTag(tag.id)}
            />
            {tag.name}
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <div class="flex justify-end gap-2 pt-2">
    <Button type="button" variant="outline" onclick={onCancel}>キャンセル</Button>
    <Button type="submit">{item ? "更新" : "作成"}</Button>
  </div>
</form>
