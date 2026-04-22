export function clampWidget(
	widget: { position_x: number; width: number },
	cols: number,
): { x: number; span: number } {
	const x = Math.min(widget.position_x, Math.max(0, cols - 1));
	const span = Math.max(1, Math.min(widget.width, cols - x));
	return { x, span };
}
