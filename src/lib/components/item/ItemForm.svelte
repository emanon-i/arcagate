<script lang="ts">
import { untrack } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { checkIsDirectory, extractItemIcon } from '$lib/ipc/items';
import type { Category } from '$lib/types/category';
import type { CreateItemInput, Item, ItemType, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import { detectType } from '$lib/utils/detect-type';
import DropZone from './DropZone.svelte';

let {
	item,
	initialPaths,
	categories,
	tags,
	onSubmit,
	onCancel,
}: {
	item?: Item;
	initialPaths?: string[];
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
let userOverrideType = $state(false);
let initialPathsProcessed = $state(false);

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
	userOverrideType = false;
	initialPathsProcessed = false;
});

// D&D 経由で initialPaths が渡されたら handleDrop を実行
$effect(() => {
	if (initialPaths && initialPaths.length > 0 && !initialPathsProcessed) {
		initialPathsProcessed = true;
		void handleDrop(initialPaths);
	}
});

// ターゲット入力時の自動タイプ判定（新規作成時のみ）
$effect(() => {
	const currentTarget = target;
	untrack(() => {
		if (!userOverrideType && !item && currentTarget.trim()) {
			itemType = detectType(currentTarget);
		}
	});
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

function handleTypeChange(e: Event) {
	const select = e.target as HTMLSelectElement;
	itemType = select.value as ItemType;
	userOverrideType = true;
}

async function handleDrop(paths: string[]) {
	const path = paths[0];
	if (!path) return;
	userOverrideType = false;
	let detected = detectType(path);
	// detectType が 'exe' を返した場合、実際にはディレクトリかもしれない
	if (detected === 'exe') {
		const isDir = await checkIsDirectory(path).catch(() => false);
		if (isDir) detected = 'folder';
	}
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
      value={itemType}
      onchange={handleTypeChange}
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
