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
	 * PH-CF-600 C2: img の lazy loading を call-site で制御できるようにする。
	 *
	 * default `'lazy'` は Library 一覧で 100+ 件の icon が一斉に asset:// fetch されて
	 * 直列処理で初期描画が固まる問題への対策 (旧コメント参照)。 ただし、 caller が
	 * `content-visibility: auto` 等の他の virtualization で off-screen 制御済の場合は
	 * `'eager'` を指定して image の paint を即時化できる (e.g. LibraryCard では
	 * content-visibility: auto + lazy が重なって icon 変更後 paint stale になる)。
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
	  loading="lazy": Library 一覧で全 card の icon が一斉に asset:// fetch される問題の対策。
	  asset protocol は request を直列処理するため、117 item で 117 件の icon request が
	  serialize し初期表示が固まる (117 item 計測で確認)。 lazy で viewport 近傍のみ fetch する。
	  decoding="async": decode を critical path から外す。
	-->
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
{:else}
	<FallbackIcon class="{className} text-[var(--ag-text-muted)]" {style} />
{/if}
