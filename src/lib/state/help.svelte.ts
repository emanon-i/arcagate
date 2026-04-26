/**
 * In-app ヘルプの開閉状態管理 (PH-418 / Nielsen H10)
 */

let isOpen = $state(false);

export const helpStore = {
	get isOpen(): boolean {
		return isOpen;
	},
	open(): void {
		isOpen = true;
	},
	close(): void {
		isOpen = false;
	},
	toggle(): void {
		isOpen = !isOpen;
	},
};
