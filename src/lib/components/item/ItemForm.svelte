<script lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { untrack } from 'svelte';
import { Button } from '$lib/components/ui/button';
import { checkIsDirectory, extractItemIcon } from '$lib/ipc/items';
import type { CreateItemInput, Item, ItemType, UpdateItemInput } from '$lib/types/item';
import type { Tag } from '$lib/types/tag';
import { detectType } from '$lib/utils/detect-type';
import ItemFormBasic from './ItemFormBasic.svelte';
import ItemFormTags from './ItemFormTags.svelte';
import ItemFormTarget from './ItemFormTarget.svelte';

/**
 * ItemForm facade。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、347 LOC を facade + 3 sub に分割)
 *
 * 子 component:
 * - ItemFormBasic (label / icon / aliases — 識別系)
 * - ItemFormTarget (type mode / target / args + DropZone — 実行系)
 * - ItemFormTags (is_tracked + tags — メタデータ)
 */

type TypeMode = 'url' | 'local';

let {
	item,
	initialPaths,
	initialUrl,
	tags,
	onSubmit,
	onCancel,
	submitting = false,
}: {
	item?: Item;
	initialPaths?: string[];
	/** U-1: URL D&D で予め流し込む URL。 mount 時 1 回だけ処理、 title は自動取得 (best-effort)。 */
	initialUrl?: string;
	tags: Tag[];
	onSubmit: (input: CreateItemInput | UpdateItemInput) => void;
	onCancel: () => void;
	submitting?: boolean;
} = $props();

// J-2: URL/ローカル二択
let typeMode = $state<TypeMode>('local');
let itemType = $state<ItemType>('exe');
let label = $state('');
let target = $state('');
let args = $state('');
let workingDir = $state('');
let iconPath = $state('');
let aliasesText = $state('');
let selectedTagIds = $state<Set<string>>(new Set());
let initialPathsProcessed = $state(false);
let initialUrlProcessed = $state(false);

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
	selectedTagIds = new Set();
	initialPathsProcessed = false;
	initialUrlProcessed = false;
});

$effect(() => {
	if (initialPaths && initialPaths.length > 0 && !initialPathsProcessed) {
		initialPathsProcessed = true;
		void handleDrop(initialPaths);
	}
});

$effect(() => {
	if (initialUrl && !initialUrlProcessed) {
		initialUrlProcessed = true;
		void handleUrlDrop(initialUrl);
	}
});

/**
 * U-1 (2026-05-12): URL D&D で渡された URL を form に流し込む。
 * - typeMode = 'url' / itemType = 'url'
 * - target = url
 * - label 未入力なら `cmd_fetch_url_title` で best-effort 取得 (host fallback)
 */
async function handleUrlDrop(url: string): Promise<void> {
	typeMode = 'url';
	itemType = 'url';
	target = url;
	if (!label) {
		try {
			const title = await invoke<string>('cmd_fetch_url_title', { url });
			if (title) label = title;
		} catch {
			// best-effort、失敗時は label 空のまま (user が手動入力)
		}
	}
}

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

	// D-11 #11 / D-14 #14: ファイル追跡 checkbox 完全撤去。URL は filesystem watcher 対象外
	// なので false 固定、それ以外は true 固定 (既存挙動の default 動作と整合)。
	const finalTypeForTracked = item?.item_type ?? (typeMode === 'url' ? 'url' : itemType);
	const isTrackedFixed = finalTypeForTracked !== 'url';

	if (item) {
		const input: UpdateItemInput = {
			label: label || undefined,
			target: target || undefined,
			args: args || null,
			working_dir: workingDir || null,
			icon_path: iconPath || null,
			aliases,
			is_tracked: isTrackedFixed,
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
			is_tracked: isTrackedFixed,
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
	// F-4 (2026-05-08 user 検収): 編集モードでも type 切替を許可。target は reset され
	// user が再入力する前提 (新規 / 編集ともに同じ振る舞い)。旧仕様の `if (item) return` を撤廃。
	typeMode = mode;
	itemType = mode === 'url' ? 'url' : 'exe';
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
	if (!label) {
		const filename = path.split(/[\\/]/).pop() ?? '';
		label = filename.replace(/\.[^.]+$/, '');
	}
	if (detected === 'exe') {
		const extracted = await extractItemIcon(path).catch(() => null);
		if (extracted) iconPath = extracted;
	}
}

// G-6 (2026-05-09): 手動 icon 選択は CardOverrideDialog 内 ItemFormCardOverride に移植済。
// `iconPath` state は handleDrop で自動抽出 (drag .exe → extractItemIcon) と save 時の
// `icon_path: iconPath` を維持するため残す (新規作成時の自動 icon 取得経路)。
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
	<ItemFormTarget
		{typeMode}
		{itemType}
		bind:target
		bind:args
		isEdit={!!item}
		onTypeModeChange={handleTypeModeChange}
		onDrop={handleDrop}
	/>

	<ItemFormBasic
		bind:label
		bind:aliasesText
	/>

	<ItemFormTags
		{userTags}
		{selectedTagIds}
		onToggleTag={toggleTag}
	/>

	<!-- F-5 (2026-05-08 user 検収): E-3 で ItemForm に直接埋め込んだ ItemFormCardOverride
	     を撤去。代わりに detail panel から CardOverrideDialog で別 modal として開く方式に変更。 -->

	<div class="flex justify-end gap-2 pt-2">
		<Button type="button" variant="outline" onclick={onCancel} disabled={submitting}
			>キャンセル</Button
		>
		<Button type="submit" disabled={submitting}>
			{#if submitting}
				<span
					class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				></span>
				処理中...
			{:else}
				{item ? '更新' : '作成'}
			{/if}
		</Button>
	</div>
</form>
