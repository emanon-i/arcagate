<script lang="ts">
/**
 * PH-issue-024 / 検収項目 #28: Workspace widget item の右クリック context menu。
 *
 * 機能:
 * - 「Open with …」: 全 opener (builtin + custom) を list、選択で即起動 (一時)
 * - 「default にする」 toggle: ON にして選択すると item.default_app に保存して以降の click も同 opener に
 * - 「設定」: Settings > Openers を開く誘導 (現状 toast で案内)
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P3 主要 vs 補助 / P5 OS 文脈
 * - docs/l1_requirements/ux_standards.md §11 Context menu
 */
import { Check, Settings2 } from '@lucide/svelte';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { updateItem } from '$lib/ipc/items';
import { launchWithOpener, listOpeners, type Opener } from '$lib/ipc/opener';
import { toastStore } from '$lib/state/toast.svelte';
import type { Item } from '$lib/types/item';
import { formatLaunchError } from '$lib/utils/launch-error';

interface Props {
	open: boolean;
	x: number;
	y: number;
	item: Item | null;
	onClose: () => void;
	/** item.default_app が更新された後に呼ばれる (UI 側で再読み込みするため)。 */
	onItemUpdated?: (updated: Item) => void;
}

let { open, x, y, item, onClose, onItemUpdated }: Props = $props();

let openers = $state<Opener[]>([]);
let setAsDefault = $state(false);
let loading = $state(false);

$effect(() => {
	if (!open) return;
	loading = true;
	void listOpeners()
		.then((list) => {
			openers = list;
		})
		.catch((e: unknown) => {
			toastStore.add(`Opener 一覧取得に失敗: ${String(e)}`, 'error');
		})
		.finally(() => {
			loading = false;
		});
});

// 現在の default opener id (item.default_app から legacy を normalize)
let currentDefaultId = $derived.by(() => {
	if (!item?.default_app) return 'builtin:explorer';
	const v = item.default_app;
	if (v.startsWith('builtin:') || v.startsWith('user:')) return v;
	// legacy 互換
	if (v === 'vscode') return 'builtin:vscode';
	if (v === 'terminal' || v === 'wt') return 'builtin:wt';
	if (v === 'powershell') return 'builtin:powershell';
	if (v === 'cmd') return 'builtin:cmd';
	if (v === 'explorer' || v === '') return 'builtin:explorer';
	// custom path はそのまま (legacy)、UI には選択肢で出ない
	return v;
});

async function handleSelect(opener: Opener) {
	if (!item) return;
	try {
		if (setAsDefault) {
			const updated = await updateItem(item.id, { default_app: opener.id });
			if (updated && onItemUpdated) onItemUpdated(updated);
			toastStore.add(`${item.label} の既定の Opener を ${opener.name} に設定しました`, 'success');
		}
		// 起動は default 設定の有無に関わらず実行
		await launchWithOpener(opener.id, item.target);
		toastStore.add(`${opener.name} で ${item.label} を起動しました`, 'success');
	} catch (e: unknown) {
		toastStore.add(formatLaunchError(item.label, e), 'error');
	} finally {
		onClose();
	}
}
</script>

<ContextMenu {open} {x} {y} {onClose}>
	{#if item}
		<div class="border-b border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]">
			<p class="truncate font-medium text-[var(--ag-text-secondary)]">{item.label}</p>
			<p class="truncate font-mono">{item.target}</p>
		</div>

		<p class="px-3 pb-1 pt-2 text-xs text-[var(--ag-text-muted)]">Open with…</p>
		{#if loading}
			<p class="px-3 py-2 text-xs text-[var(--ag-text-muted)]">読み込み中…</p>
		{:else}
			{#each openers as o (o.id)}
				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center justify-between gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
					data-testid="context-opener-{o.id}"
					onclick={() => void handleSelect(o)}
				>
					<span class="min-w-0 flex-1 truncate">{o.name}</span>
					<span class="shrink-0 text-xs text-[var(--ag-text-muted)]">
						{#if o.id === currentDefaultId}
							<Check class="inline h-3.5 w-3.5 text-[var(--ag-accent-text)]" aria-label="既定" />
						{:else if o.is_builtin}
							組み込み
						{/if}
					</span>
				</button>
			{/each}
		{/if}

		<div class="my-1 border-t border-[var(--ag-border)]"></div>
		<label
			class="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
		>
			<input type="checkbox" class="cursor-pointer" bind:checked={setAsDefault} />
			<span>既定にして開く</span>
		</label>

		<button
			type="button"
			role="menuitem"
			class="mt-1 flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
			onclick={() => {
				toastStore.add('Settings > ライブラリ > Openers から登録できます', 'info');
				onClose();
			}}
		>
			<Settings2 class="h-3.5 w-3.5" />
			Opener を登録 / 編集…
		</button>
	{/if}
</ContextMenu>
