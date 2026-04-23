import type { WidgetType } from '$lib/types/workspace';

export type DragSource =
	| { kind: 'add'; widgetType: WidgetType }
	| { kind: 'move'; widgetId: string };

let active = $state<DragSource | null>(null);
let clientX = $state(0);
let clientY = $state(0);
let dropCell = $state<{ x: number; y: number } | null>(null);

export const pointerDrag = {
	get active() {
		return active;
	},
	get clientX() {
		return clientX;
	},
	get clientY() {
		return clientY;
	},
	get dropCell() {
		return dropCell;
	},

	start(source: DragSource, x: number, y: number) {
		active = source;
		clientX = x;
		clientY = y;
		dropCell = null;
	},

	move(x: number, y: number) {
		clientX = x;
		clientY = y;
	},

	setDropCell(cell: { x: number; y: number } | null) {
		dropCell = cell;
	},

	end() {
		active = null;
		dropCell = null;
	},
};
