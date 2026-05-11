<script lang="ts">
import { Image as ImageIcon, ImageOff, Settings } from '@lucide/svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';

/**
 * U-5: 画像スクラップ widget。
 *
 * - config.path: 表示する画像の絶対 path
 * - convertFileSrc で asset:// URL に変換、 webview から読み込める形式に
 * - object-contain で aspect 維持、 widget 全面で表示
 * - path 未設定なら EmptyState (設定で path を指定する誘導)
 */
interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

const DEFAULTS = { path: '' };

let config = $derived(parseWidgetConfig(widget?.config, DEFAULTS));

let imageSrc = $derived(config.path ? convertFileSrc(config.path) : '');
let displayName = $derived(config.path ? (config.path.split(/[\\/]/).pop() ?? '画像') : '画像');

let imageError = $state(false);

$effect(() => {
	// path 変化で error state を reset (新 image の load 再試行)
	const _dep = config.path;
	void _dep;
	imageError = false;
});

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={displayName} icon={ImageIcon} {menuItems}>
	{#if !config.path}
		<EmptyState
			icon={ImageIcon}
			title="画像を設定してください"
			description="設定モーダルで画像ファイルを選ぶか、 画像ファイルを Workspace にドラッグ&ドロップしてください。"
			action={{
				label: '設定を開く',
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="image-scrap-empty-state"
		/>
	{:else if imageError}
		<div class="flex h-full flex-col items-center justify-center gap-2 text-xs text-[var(--ag-text-muted)]">
			<ImageOff class="h-8 w-8" />
			<div>画像を読み込めません</div>
			<div class="truncate max-w-full px-4 text-[var(--ag-text-faint)]" title={config.path}>{config.path}</div>
		</div>
	{:else}
		<div class="flex h-full items-center justify-center overflow-hidden">
			<!-- svelte-ignore a11y_img_redundant_alt -->
			<img
				src={imageSrc}
				alt={`${displayName} 画像`}
				class="max-h-full max-w-full object-contain"
				onerror={() => (imageError = true)}
				data-testid="image-scrap-img"
			/>
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog
		{widget}
		open={settingsOpen}
		onClose={() => {
			settingsOpen = false;
		}}
	/>
{/if}
