<script lang="ts">
import type { ItemType } from '$lib/types/item';
import DropZone from './DropZone.svelte';

/**
 * ItemForm の実行系フィールド (type mode / target / args + DropZone)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、target 抽出)
 *
 * - 編集 (isEdit=true) では type mode / DropZone を非表示、target は readonly
 * - 新規作成では DropZone + type toggle (URL/ローカル) + target 入力
 */
type TypeMode = 'url' | 'local';

interface Props {
	typeMode: TypeMode;
	itemType: ItemType;
	target: string;
	args: string;
	isEdit: boolean;
	onTypeModeChange: (mode: TypeMode) => void;
	onDrop: (paths: string[]) => void;
}

let {
	typeMode,
	itemType,
	target = $bindable(''),
	args = $bindable(''),
	isEdit,
	onTypeModeChange,
	onDrop,
}: Props = $props();
</script>

{#if !isEdit}
	<DropZone {onDrop} />
{/if}

<!-- J-2: タイプ → URL/ローカル二択トグル -->
<div class="space-y-1">
	<span class="text-sm font-medium text-[var(--ag-text-primary)]">タイプ</span>
	<div
		class="flex gap-1 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-1"
	>
		<button
			type="button"
			class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {typeMode ===
			'local'
				? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)] shadow-sm'
				: 'text-[var(--ag-text-muted)] hover:text-[var(--ag-text-secondary)]'}"
			disabled={isEdit}
			onclick={() => onTypeModeChange('local')}
		>
			ローカル
		</button>
		<button
			type="button"
			class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {typeMode ===
			'url'
				? 'bg-[var(--ag-surface-4)] text-[var(--ag-text-primary)] shadow-sm'
				: 'text-[var(--ag-text-muted)] hover:text-[var(--ag-text-secondary)]'}"
			disabled={isEdit}
			onclick={() => onTypeModeChange('url')}
		>
			URL
		</button>
	</div>
	{#if typeMode === 'local' && !isEdit}
		<p class="text-xs text-[var(--ag-text-muted)]">
			自動検出: {itemType}
		</p>
	{/if}
</div>

<!-- J-3: ターゲット readonly 化 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-target">
		{typeMode === 'url' ? 'URL' : 'ファイル / フォルダのパス'}
		<span class="text-destructive">*</span>
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
