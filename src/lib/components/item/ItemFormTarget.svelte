<script lang="ts">
import { File, Folder } from '@lucide/svelte';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import type { ItemType } from '$lib/types/item';
import DropZone from './DropZone.svelte';

/**
 * ItemForm の実行系フィールド (type mode / target / args + DropZone)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、target 抽出)
 *
 * - 編集 (isEdit=true) では type mode / DropZone を非表示
 * - 新規 / 編集ともに target は直接入力可 (E-4 で readonly 撤廃、2026-05-08)
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

// E-5 (2026-05-08 user 検収): native file/folder picker dialog (Tauri @tauri-apps/plugin-dialog).
// 直接入力 (E-4) / drag&drop と並行で picker UI を提供、UX 選択肢を増やす。
async function handlePickFile(): Promise<void> {
	const selected = await open({
		multiple: false,
		directory: false,
		filters: [
			{
				name: '実行ファイル / Script',
				extensions: ['exe', 'bat', 'cmd', 'ps1', 'sh', 'py', 'js'],
			},
			{ name: 'すべてのファイル', extensions: ['*'] },
		],
	});
	if (typeof selected === 'string') {
		target = selected;
	}
}

async function handlePickFolder(): Promise<void> {
	const selected = await open({ multiple: false, directory: true });
	if (typeof selected === 'string') {
		target = selected;
	}
}
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

<!-- E-4 (2026-05-08 user 検収): local path も直接入力可能化 (旧 readonly 撤廃)。
     drag&drop / 既存 picker (E-5 で追加予定) と並行可、user の手書き編集に対応。 -->
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
		<div class="flex items-stretch gap-2">
			<input
				id="item-target"
				type="text"
				autocomplete="off"
				class="flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
				bind:value={target}
				required
				placeholder="C:\path\to\file.exe または ドラッグ＆ドロップ"
			/>
			<!-- E-5: file picker buttons (Tauri native dialog)。直接入力 + drag&drop と並行。 -->
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="shrink-0"
				aria-label="ファイルを参照"
				title="ファイルを選択"
				onclick={() => void handlePickFile()}
			>
				<File class="h-3.5 w-3.5" />
				ファイル
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="shrink-0"
				aria-label="フォルダを参照"
				title="フォルダを選択"
				onclick={() => void handlePickFolder()}
			>
				<Folder class="h-3.5 w-3.5" />
				フォルダ
			</Button>
		</div>
		<p class="text-xs text-[var(--ag-text-muted)]">.exe / .bat / フォルダのパス。直接入力 / drag&drop / 参照ボタンのいずれも可</p>
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
