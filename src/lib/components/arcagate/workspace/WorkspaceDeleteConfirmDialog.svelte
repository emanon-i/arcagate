<script lang="ts">
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { t } from '$lib/i18n.svelte';

interface Props {
	widgetId: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}

let { widgetId, onConfirm, onCancel }: Props = $props();
</script>

<ConfirmDialog
	open={widgetId !== null}
	title={t('workspace.delete_confirm.title')}
	description={t('workspace.delete_confirm.desc')}
	confirmLabel={t('common.delete')}
	confirmVariant="destructive"
	onConfirm={onConfirm}
	onCancel={onCancel}
/>
