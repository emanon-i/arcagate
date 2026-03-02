<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { Item } from '$lib/types/item';

let {
	items,
	onEdit,
	onDelete,
	missingPaths = new Set(),
}: {
	items: Item[];
	onEdit: (item: Item) => void;
	onDelete: (id: string) => void;
	missingPaths?: Set<string>;
} = $props();
</script>

<div class="w-full overflow-x-auto">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b text-left">
        <th class="px-4 py-2 font-medium">ラベル</th>
        <th class="px-4 py-2 font-medium">タイプ</th>
        <th class="px-4 py-2 font-medium">ターゲット</th>
        <th class="px-4 py-2 font-medium">有効</th>
        <th class="px-4 py-2 font-medium">操作</th>
      </tr>
    </thead>
    <tbody>
      {#each items as item (item.id)}
        <tr class="border-b hover:bg-muted/50 transition-colors">
          <td class="px-4 py-2">
            {item.label}
            {#if missingPaths.has(item.target)}
              <span class="ml-1 text-amber-500" title="パスが見つかりません">⚠</span>
            {/if}
          </td>
          <td class="px-4 py-2">
            <span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
              {item.item_type}
            </span>
          </td>
          <td class="px-4 py-2 max-w-xs truncate text-muted-foreground">{item.target}</td>
          <td class="px-4 py-2">
            {#if item.is_enabled}
              <span class="text-green-600 dark:text-green-400">有効</span>
            {:else}
              <span class="text-muted-foreground">無効</span>
            {/if}
          </td>
          <td class="px-4 py-2">
            <div class="flex gap-2">
              <Button size="sm" variant="outline" onclick={() => onEdit(item)}>編集</Button>
              <Button size="sm" variant="destructive" onclick={() => onDelete(item.id)}>削除</Button>
            </div>
          </td>
        </tr>
      {:else}
        <tr>
          <td class="px-4 py-8 text-center text-muted-foreground" colspan="5">
            アイテムがありません
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
