<script lang="ts">
/**
 * LoadingState — Industrial Yellow polish (L3-D D6)。
 *
 * spec: docs/l1_requirements/design/industrial-yellow-spec.md §5
 * - spinner: 蛍光イエロー border (旧 --ag-accent cyan から flip)
 * - hatching: skeleton 用 decorative texture を背景に薄く敷く
 * - 旧 --ag-text-muted は維持 (Industrial 専用 widget ではないため、Library 以外の widget でも
 *   違和感ない gray text を保つ)
 */
interface Props {
	description?: string;
	testId?: string;
}

let { description = '読み込み中...', testId }: Props = $props();
</script>

<div
	class="il-loading relative flex h-full w-full items-center justify-center gap-3 px-6 py-8 text-center"
	role="status"
	aria-live="polite"
	data-testid={testId}
>
	<span
		class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--ag-accent)] border-t-transparent motion-reduce:hidden"
	></span>
	<span class="text-sm text-[var(--ag-text-muted)]">{description}</span>
</div>

<style>
.il-loading::before {
	content: "";
	position: absolute;
	inset: 0;
	pointer-events: none;
	opacity: 0.3;
	background-image: repeating-linear-gradient(
		-45deg,
		rgba(5, 6, 5, 0.04) 0,
		rgba(5, 6, 5, 0.04) 4px,
		transparent 4px,
		transparent 8px
	);
}
</style>
