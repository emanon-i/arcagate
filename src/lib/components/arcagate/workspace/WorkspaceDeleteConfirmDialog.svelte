<script lang="ts">
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';

interface Props {
	widgetId: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}

let { widgetId, onConfirm, onCancel }: Props = $props();
</script>

<ConfirmDialog
	open={widgetId !== null}
	title="ウィジェットを削除しますか？"
	description="この操作は元に戻せません。"
	confirmLabel="削除"
	confirmVariant="destructive"
	onConfirm={onConfirm}
	onCancel={onCancel}
/>
