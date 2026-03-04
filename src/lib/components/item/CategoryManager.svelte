<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { Category, CreateCategoryInput } from '$lib/types/category';

let {
	categories,
	onCreateCategory,
	onUpdateCategory,
	onDeleteCategory,
}: {
	categories: Category[];
	onCreateCategory: (input: CreateCategoryInput) => void;
	onUpdateCategory: (id: string, name: string, prefix: string | null) => void;
	onDeleteCategory: (id: string) => void;
} = $props();

let newName = $state('');
let newPrefix = $state('');

// インライン編集状態
let editingId = $state<string | null>(null);
let editName = $state('');
let editPrefix = $state('');

function handleCreate(e: Event) {
	e.preventDefault();
	const trimmed = newName.trim();
	if (!trimmed) return;
	onCreateCategory({ name: trimmed, prefix: newPrefix.trim() || null, icon: null });
	newName = '';
	newPrefix = '';
}

function startEdit(category: Category) {
	editingId = category.id;
	editName = category.name;
	editPrefix = category.prefix ?? '';
}

function cancelEdit() {
	editingId = null;
	editName = '';
	editPrefix = '';
}

function handleUpdate(e: Event) {
	e.preventDefault();
	if (!editingId) return;
	const trimmedName = editName.trim();
	if (!trimmedName) return;
	onUpdateCategory(editingId, trimmedName, editPrefix.trim() || null);
	cancelEdit();
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-semibold">カテゴリ管理</h3>

  {#if categories.length > 0}
    <ul class="space-y-1">
      {#each categories as category (category.id)}
        {#if editingId === category.id}
          <li class="rounded-md border px-3 py-2">
            <form class="space-y-2" onsubmit={handleUpdate}>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                  bind:value={editName}
                  placeholder="カテゴリ名"
                  required
                />
                <input
                  type="text"
                  class="w-20 rounded-md border bg-background px-2 py-1 text-sm font-mono"
                  bind:value={editPrefix}
                  placeholder="prefix"
                  maxlength="10"
                />
              </div>
              <div class="flex gap-2">
                <Button type="submit" size="sm">保存</Button>
                <Button type="button" size="sm" variant="outline" onclick={cancelEdit}>
                  キャンセル
                </Button>
              </div>
            </form>
          </li>
        {:else}
          <li class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div class="flex items-center gap-2">
              <span>{category.name}</span>
              {#if category.prefix}
                <span class="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono font-medium text-secondary-foreground">
                  {category.prefix}:
                </span>
              {/if}
            </div>
            <div class="flex gap-1">
              <Button size="sm" variant="outline" onclick={() => startEdit(category)}>
                編集
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onclick={() => onDeleteCategory(category.id)}
              >
                削除
              </Button>
            </div>
          </li>
        {/if}
      {:else}
        <!-- unreachable since guarded by length check -->
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-muted-foreground">カテゴリがありません</p>
  {/if}

  <form class="space-y-2" onsubmit={handleCreate}>
    <div class="flex gap-2">
      <input
        type="text"
        class="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        bind:value={newName}
        placeholder="カテゴリ名"
        required
      />
      <input
        type="text"
        class="w-24 rounded-md border bg-background px-3 py-2 text-sm font-mono"
        bind:value={newPrefix}
        placeholder="prefix"
        maxlength="10"
      />
      <Button type="submit" size="sm">追加</Button>
    </div>
  </form>
</div>
