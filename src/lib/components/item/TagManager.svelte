<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { CreateTagInput, Tag } from '$lib/types/tag';

let {
	tags,
	onCreateTag,
	onDeleteTag,
}: {
	tags: Tag[];
	onCreateTag: (input: CreateTagInput) => void;
	onDeleteTag: (id: string) => void;
} = $props();

let newName = $state('');
let newIsHidden = $state(false);

function handleCreate(e: Event) {
	e.preventDefault();
	const trimmed = newName.trim();
	if (!trimmed) return;
	onCreateTag({ name: trimmed, is_hidden: newIsHidden });
	newName = '';
	newIsHidden = false;
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-semibold">タグ管理</h3>

  {#if tags.length > 0}
    <ul class="space-y-1">
      {#each tags as tag (tag.id)}
        <li class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <div class="flex items-center gap-2">
            <span>{tag.name}</span>
            {#if tag.is_hidden}
              <span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">非表示</span>
            {/if}
          </div>
          <Button
            size="sm"
            variant="destructive"
            onclick={() => onDeleteTag(tag.id)}
          >
            削除
          </Button>
        </li>
      {:else}
        <!-- unreachable since guarded by length check -->
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-muted-foreground">タグがありません</p>
  {/if}

  <form class="space-y-2" onsubmit={handleCreate}>
    <div class="flex gap-2">
      <input
        type="text"
        autocomplete="off"
        class="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        bind:value={newName}
        placeholder="タグ名"
        required
      />
      <Button type="submit" size="sm">追加</Button>
    </div>
    <label class="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={newIsHidden} />
      非表示タグ
    </label>
  </form>
</div>
