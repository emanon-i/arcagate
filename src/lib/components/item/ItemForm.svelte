<script lang="ts">
import { open } from '@tauri-apps/plugin-dialog';
import { untrack } from 'svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import { Button } from '$lib/components/ui/button';
import { checkIsDirectory, extractItemIcon } from '$lib/ipc/items';
import type { CreateItemInput, Item, ItemType, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import { detectType } from '$lib/utils/detect-type';
import DropZone from './DropZone.svelte';

let {
	item,
	initialPaths,
	tags,
	onSubmit,
	onCancel,
	submitting = false,
}: {
	item?: Item;
	initialPaths?: string[];
	tags: Tag[];
	onSubmit: (input: CreateItemInput | UpdateItemInput) => void;
	onCancel: () => void;
	submitting?: boolean;
} = $props();

// J-2: URL/ローカル二択
type TypeMode = 'url' | 'local';
let typeMode = $state<TypeMode>('local');
let itemType = $state<ItemType>('exe');
let label = $state('');
let target = $state('');
let args = $state('');
let workingDir = $state('');
let iconPath = $state('');
let aliasesText = $state('');
let isTracked = $state(true);
let selectedTagIds = $state<Set<string>>(new Set());
let initialPathsProcessed = $state(false);

let userTags = $derived(tags.filter((t) => !t.is_system));

$effect(() => {
	const mode = item?.item_type === 'url' ? 'url' : 'local';
	typeMode = mode;
	itemType = item?.item_type ?? 'exe';
	label = item?.label ?? '';
	target = item?.target ?? '';
	args = item?.args ?? '';
	workingDir = item?.working_dir ?? '';
	iconPath = item?.icon_path ?? '';
	aliasesText = item?.aliases.join(', ') ?? '';
	isTracked = item?.is_tracked ?? true;
	selectedTagIds = new Set();
	initialPathsProcessed = false;
});

$effect(() => {
	if (initialPaths && initialPaths.length > 0 && !initialPathsProcessed) {
		initialPathsProcessed = true;
		void handleDrop(initialPaths);
	}
});

// ターゲット入力時の自動タイプ判定（URL モード + 新規作成時のみ）
$effect(() => {
	const currentTarget = target;
	untrack(() => {
		if (typeMode === 'url' && !item && currentTarget.trim()) {
			itemType = 'url';
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
			is_tracked: isTracked,
			tag_ids: Array.from(selectedTagIds),
		};
		onSubmit(input);
	} else {
		const finalType = typeMode === 'url' ? ('url' as ItemType) : itemType;
		const input: CreateItemInput = {
			item_type: finalType,
			label,
			target,
			args: args || null,
			working_dir: workingDir || null,
			icon_path: iconPath || null,
			aliases,
			tag_ids: Array.from(selectedTagIds),
			is_tracked: isTracked,
		};
		onSubmit(input);
	}
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

function handleTypeModeChange(mode: TypeMode) {
	if (item) return;
	typeMode = mode;
	if (mode === 'url') {
		itemType = 'url';
		isTracked = false;
	} else {
		itemType = 'exe';
		isTracked = true;
	}
	target = '';
}

async function handleDrop(paths: string[]) {
	const path = paths[0];
	if (!path) return;
	typeMode = 'local';
	let detected = detectType(path);
	if (detected === 'exe') {
		const isDir = await checkIsDirectory(path).catch(() => false);
		if (isDir) detected = 'folder';
	}
	itemType = detected;
	target = path;
	isTracked = true;
	if (!label) {
		const filename = path.split(/[\\/]/).pop() ?? '';
		label = filename.replace(/\.[^.]+$/, '');
	}
	if (detected === 'exe') {
		const extracted = await extractItemIcon(path).catch(() => null);
		if (extracted) iconPath = extracted;
	}
}

async function handleSelectIcon() {
	const selected = await open({
		multiple: false,
		filters: [{ name: 'アイコン画像', extensions: ['png', 'ico', 'jpg', 'jpeg', 'svg', 'webp'] }],
	});
	if (selected) {
		iconPath = selected;
	}
}
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
  {#if !item}
    <DropZone onDrop={handleDrop} />
  {/if}

  <!-- J-2: タイプ → URL/ローカル二択トグル -->
  <div class="space-y-1">
    <span class="text-sm font-medium text-[var(--ag-text-primary)]">タイプ</span>
    <div class="flex gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-1">
      <button
        type="button"
        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {typeMode === 'local'
          ? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)] shadow-sm'
          : 'text-[var(--ag-text-muted)] hover:text-[var(--ag-text-secondary)]'}"
        disabled={!!item}
        onclick={() => handleTypeModeChange('local')}
      >
        ローカル
      </button>
      <button
        type="button"
        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {typeMode === 'url'
          ? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)] shadow-sm'
          : 'text-[var(--ag-text-muted)] hover:text-[var(--ag-text-secondary)]'}"
        disabled={!!item}
        onclick={() => handleTypeModeChange('url')}
      >
        URL
      </button>
    </div>
    {#if typeMode === 'local' && !item}
      <p class="text-xs text-[var(--ag-text-muted)]">
        自動検出: {itemType}
      </p>
    {/if}
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-label">ラベル <span class="text-destructive">*</span></label>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id="item-label"
      type="text"
      autocomplete="off"
      class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
      bind:value={label}
      required
      autofocus
      placeholder="表示名"
    />
  </div>

  <!-- J-3: ターゲット readonly 化 -->
  <div class="space-y-1">
    <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-target">
      {typeMode === 'url' ? 'URL' : 'ファイル / フォルダのパス'} <span class="text-destructive">*</span>
    </label>
    {#if typeMode === 'url'}
      <input
        id="item-target"
        type="url"
        autocomplete="off"
        class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
        bind:value={target}
        required
        placeholder="https://example.com"
      />
      <p class="text-xs text-[var(--ag-text-muted)]">ブラウザで開く URL を入力</p>
    {:else}
      <input
        id="item-target"
        type="text"
        autocomplete="off"
        class="w-full cursor-default rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] placeholder:text-[var(--ag-text-muted)]"
        value={target}
        readonly
        required
        placeholder="ドラッグ＆ドロップ または 下のボタンで選択"
      />
      <p class="text-xs text-[var(--ag-text-muted)]">.exe / .bat / フォルダのパス（直接入力不可）</p>
    {/if}
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-args">引数</label>
    <input
      id="item-args"
      type="text"
      autocomplete="off"
      class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
      bind:value={args}
      placeholder="--flag value"
    />
  </div>

  <!-- J-6: アイコン画像プレビュー -->
  <div class="space-y-1">
    <span class="text-sm font-medium text-[var(--ag-text-primary)]">アイコン</span>
    <div class="flex items-center gap-3">
      <div class="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)]">
        {#if iconPath}
          <ItemIcon iconPath={iconPath} alt="アイコン" class="h-16 w-16 object-contain" />
        {:else}
          <span class="text-xs text-[var(--ag-text-muted)]">なし</span>
        {/if}
      </div>
      <button
        type="button"
        class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
        onclick={handleSelectIcon}
      >
        アイコンを選択
      </button>
      {#if iconPath}
        <button
          type="button"
          class="text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:text-destructive"
          onclick={() => { iconPath = ''; }}
        >
          削除
        </button>
      {/if}
    </div>
  </div>

  <div class="space-y-1">
    <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-aliases">エイリアス（カンマ区切り）</label>
    <input
      id="item-aliases"
      type="text"
      autocomplete="off"
      class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
      bind:value={aliasesText}
      placeholder="alias1, alias2"
    />
  </div>

  <!-- J-5: ファイル追跡チェックボックス -->
  <div class="flex items-center gap-2">
    <input
      id="item-tracked"
      type="checkbox"
      class="h-4 w-4 rounded border-[var(--ag-border)]"
      bind:checked={isTracked}
    />
    <label class="text-sm text-[var(--ag-text-secondary)]" for="item-tracked">
      ファイル変更を追跡する
    </label>
  </div>

  {#if userTags.length > 0}
    <div class="space-y-2">
      <p class="text-sm font-medium text-[var(--ag-text-primary)]">タグ</p>
      <div class="flex flex-wrap gap-2">
        {#each userTags as tag (tag.id)}
          <label class="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--ag-text-secondary)]">
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
    <Button type="button" variant="outline" onclick={onCancel} disabled={submitting}>キャンセル</Button>
    <Button type="submit" disabled={submitting}>
      {#if submitting}
        <span class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
        処理中...
      {:else}
        {item ? "更新" : "作成"}
      {/if}
    </Button>
  </div>
</form>
