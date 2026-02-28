<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { Category, CreateCategoryInput } from '$lib/types/category';

let {
	categories,
	onCreateCategory,
	onDeleteCategory,
}: {
	categories: Category[];
	onCreateCategory: (input: CreateCategoryInput) => void;
	onDeleteCategory: (id: string) => void;
} = $props();

let newName = $state('');

function handleCreate(e: Event) {
	e.preventDefault();
	const trimmed = newName.trim();
	if (!trimmed) return;
	onCreateCategory({ name: trimmed, prefix: null, icon: null });
	newName = '';
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-semibold">カテゴリ管理</h3>

  {#if categories.length > 0}
    <ul class="space-y-1">
      {#each categories as category (category.id)}
        <li class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span>{category.name}</span>
          <Button
            size="sm"
            variant="destructive"
            onclick={() => onDeleteCategory(category.id)}
          >
            削除
          </Button>
        </li>
      {:else}
        <!-- unreachable since guarded by length check -->
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-muted-foreground">カテゴリがありません</p>
  {/if}

  <form class="flex gap-2" onsubmit={handleCreate}>
    <input
      type="text"
      class="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
      bind:value={newName}
      placeholder="カテゴリ名"
      required
    />
    <Button type="submit" size="sm">追加</Button>
  </form>
</div>
