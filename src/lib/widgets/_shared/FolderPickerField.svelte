<script lang="ts">
/**
 * 4/30 user 検収: フォルダ監視 / EXE フォルダ監視 の設定 UI を共通化。
 * 「監視フォルダ」picker + clear button + manual input を統一して、似た widget は
 * 似た UI で操作できるようにする (P4 一貫性 / P12 整合性)。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P4 一貫性 / P12 整合性
 * - docs/l1_requirements/ux_standards.md §6-3 設定 dialog のレイアウト
 */
import { X } from '@lucide/svelte';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';

interface Props {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	placeholder?: string;
	pickerTitle?: string;
	id?: string;
	/** input 直接編集を許可 (EXE フォルダ監視で使用)。false なら read-only display + picker のみ。 */
	allowManualInput?: boolean;
}

let {
	value,
	onChange,
	label = '監視フォルダ',
	placeholder = '例: D:\\Tools',
	pickerTitle = '監視するフォルダを選択',
	id = 'ws-watch-folder',
	allowManualInput = false,
}: Props = $props();

async function handlePick() {
	const selected = await open({ directory: true, multiple: false, title: pickerTitle });
	if (selected && !Array.isArray(selected)) onChange(selected);
}

function handleClear() {
	onChange('');
}
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for={id}>{label}</label>
	<div class="flex items-center gap-2">
		{#if allowManualInput}
			<input
				{id}
				type="text"
				autocomplete="off"
				{placeholder}
				class="min-w-0 flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
				{value}
				oninput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
			/>
		{:else}
			<div
				{id}
				class="min-w-0 flex-1 truncate rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-secondary)]"
				title={value}
			>
				{value || '未選択'}
			</div>
		{/if}
		<Button type="button" variant="outline" size="sm" onclick={handlePick}>選択</Button>
		{#if value}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-destructive hover:bg-destructive/10 hover:text-destructive"
				onclick={handleClear}
				aria-label="{label}を解除"
			>
				<X class="h-3.5 w-3.5" />
			</Button>
		{/if}
	</div>
</div>
