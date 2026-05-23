<script lang="ts">
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { t } from '$lib/i18n.svelte';

/**
 * WorkspaceDeleteConfirmDialog: page (タブ) 削除専用 confirm modal。
 *
 * PH-CF-300 (2026-05-23): タブ削除の `window.confirm` を撤去して E6 のチェックボックス
 * (「このページの item も Library から削除」) を載せるための専用 modal。 ConfirmDialog 経由で
 * `extraNote` (削除対象 widget 数) + `checkboxLabel` (item 連鎖削除のオプトイン) を出す。
 *
 * 削除確認モーダルは影響範囲を必ず文言で出す (PH-CF-300 §機能契約)。
 */
interface Props {
	/** open: workspace を 1 件指定 (null で閉) */
	workspace: { id: string; name: string } | null;
	/** 削除対象 page 内の widget 数 (caller が IPC で取得して渡す)。 */
	widgetCount: number;
	/** confirm 時 callback。 第 1 引数 = checkbox 状態 (true なら item も削除)。 */
	onConfirm: (deleteItems: boolean) => void;
	onCancel: () => void;
}

let { workspace, widgetCount, onConfirm, onCancel }: Props = $props();

// modal が開くたびに checkbox を OFF にリセット (破壊的操作は毎回オプトインから始める)。
let deleteItemsChecked = $state(false);
$effect(() => {
	if (workspace !== null) {
		deleteItemsChecked = false;
	}
});

const titleText = $derived(
	workspace ? t('workspace.tab.delete_dialog.title', { name: workspace.name }) : '',
);
const descText = $derived(t('workspace.tab.delete_dialog.desc'));
const extraNoteText = $derived(
	widgetCount > 0
		? t('workspace.tab.delete_dialog.widget_count', { count: widgetCount })
		: t('workspace.tab.delete_dialog.no_widgets'),
);
const checkboxLabelText = $derived(t('workspace.tab.delete_dialog.delete_items_checkbox'));

function handleConfirm(): void {
	const checked = deleteItemsChecked;
	onConfirm(checked);
}
</script>

<ConfirmDialog
	open={workspace !== null}
	title={titleText}
	description={descText}
	extraNote={extraNoteText}
	checkboxLabel={checkboxLabelText}
	bind:checkboxChecked={deleteItemsChecked}
	confirmLabel={t('common.delete')}
	confirmVariant="destructive"
	onConfirm={handleConfirm}
	{onCancel}
/>
