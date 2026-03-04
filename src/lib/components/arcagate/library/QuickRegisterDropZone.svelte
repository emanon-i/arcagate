<script lang="ts">
import { Plus } from '@lucide/svelte';
</script>

<!-- TODO: DropZone + cmd_create_item 接続 -->
<div
	class="rounded-[var(--ag-radius-widget)] border border-dashed border-[var(--ag-border-dashed)] bg-[var(--ag-surface-2)] p-4"
>
	<div class="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ag-text-primary)]">
		<Plus class="h-4 w-4" />
		クイック登録
	</div>
	<p class="text-xs leading-5 text-[var(--ag-text-muted)]">
		exe / url / folder / ps1 をドラッグ&ドロップで登録。アイコン取得・初期カテゴリ推定・別名候補を自動入力。
	</p>
</div>
