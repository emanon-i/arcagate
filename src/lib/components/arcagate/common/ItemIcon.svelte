<script lang="ts">
import { Cpu, FolderOpen, Gamepad2, Globe, TerminalSquare } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Component } from 'svelte';

interface Props {
	iconPath: string | null | undefined;
	alt: string;
	itemType?: string;
	class?: string;
	style?: string;
	/**
	 * `<img loading>` 属性。 default `'lazy'` は Library 一覧で 100+ 件の icon が一斉に
	 * asset:// fetch されて直列処理で初期描画が固まる問題への対策 (117 item 計測で確認)。
	 * caller 側で off-screen 制御済等の場合は `'eager'` を指定可。
	 */
	loading?: 'lazy' | 'eager';
}

let {
	iconPath,
	alt,
	itemType,
	class: className = '',
	style = '',
	loading = 'lazy',
}: Props = $props();
let iconSrc = $derived(iconPath ? convertFileSrc(iconPath) : null);
let iconError = $state(false);

// アイコンパスが変わったらエラー状態をリセット
$effect(() => {
	iconPath;
	iconError = false;
});

const fallbackIconMap: Record<string, Component> = {
	exe: Gamepad2,
	url: Globe,
	script: TerminalSquare,
	folder: FolderOpen,
	command: Cpu,
};

let FallbackIcon = $derived(
	(itemType ? (fallbackIconMap[itemType] ?? Gamepad2) : Gamepad2) as Component,
);
</script>

{#if iconSrc && !iconError}
	<!--
	  loading="lazy": Library 一覧で全 card の icon が一斉に asset:// fetch される問題の対策
	  (asset protocol は request を直列処理、 117 item 計測で確認)。 viewport 近傍のみ fetch。
	  decoding="async": decode を critical path から外す。
	  {#key iconSrc}: iconSrc 変化時に <img> 要素ごと作り直す。 modal overlay 下で src を差し
	  替えた時に browser の composite layer / tile cache 連続性が原因となる paint stale を
	  構造的に排除し、 icon の即時反映 (Library 見た目設定 ②) を保証する。 LibraryView 側の
	  card 全体 {#key item.icon_path|...} 対症ハックは撤廃済。
	  機械検出: scripts/audit-appearance-state-mgmt.sh (F)、
	  仕様: docs/l2_foundation/features/screens/library.md §即時反映。
	-->
	{#key iconSrc}
		<img
			src={iconSrc}
			{alt}
			class={className}
			{style}
			{loading}
			decoding="async"
			onerror={() => {
				iconError = true;
			}}
		/>
	{/key}
{:else}
	<FallbackIcon class="{className} text-[var(--ag-text-muted)]" {style} />
{/if}
