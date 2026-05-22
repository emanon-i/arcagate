<script lang="ts">
import { Image as ImageIcon, Settings } from '@lucide/svelte';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import ErrorState from '$lib/components/common/ErrorState.svelte';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
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
let displayName = $derived(
	config.path
		? (config.path.split(/[\\/]/).pop() ?? t('widgets.image_scrap.default_name'))
		: t('widgets.image_scrap.default_name'),
);

let imageError = $state(false);

$effect(() => {
	// path 変化で error state を reset (新 image の load 再試行)
	const _dep = config.path;
	void _dep;
	imageError = false;
});

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

// audit batch (2026-05-13) #1.4: ダブルクリックで画像を OS default app (写真ビューア等) で開く。
// source_path 優先 (元 file を開く)、 無ければ APPDATA copy を開く。
async function handleDblClick(): Promise<void> {
	const cfg = config as { path?: string; source_path?: string };
	const target = cfg.source_path ?? cfg.path;
	if (!target) return;
	try {
		await invoke('cmd_open_path', { path: target });
	} catch (e) {
		toastStore.add(t('toast.image_open_failed', { error: getErrorMessage(e) }), 'error');
	}
}
</script>

<!-- Fix A (2026-05-12): config.path を WidgetShell に渡し、 body 右クリック menu で
     「パスをコピー / Explorer で開く」 を有効化。 Library item 不在でも widget 内 path から取れる。 -->
<WidgetShell title={displayName} icon={ImageIcon} {menuItems} path={config.path}>
	{#if !config.path}
		<EmptyState
			icon={ImageIcon}
			title={t('widgets.image_scrap.empty_title')}
			description={t('widgets.image_scrap.empty_desc')}
			action={{
				label: t('widgets.settings.open_button'),
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="image-scrap-empty-state"
		/>
	{:else if imageError}
		<ErrorState
			title={t('widgets.image_scrap.load_error')}
			description={config.path}
			testId="image-scrap-error-state"
		/>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="flex h-full cursor-pointer items-center justify-center overflow-hidden"
			ondblclick={() => void handleDblClick()}
			title={t('widgets.dblclick_open_hint')}
		>
			<!-- svelte-ignore a11y_img_redundant_alt -->
			<img
				src={imageSrc}
				alt={t('widgets.image_scrap.img_alt', { name: displayName })}
				class="pointer-events-none max-h-full max-w-full object-contain"
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
