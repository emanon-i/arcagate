import { countHiddenItems } from '$lib/ipc/items';

let isHiddenVisible = $state(false);
let hiddenCount = $state(0);

function toggleDirect(): void {
	isHiddenVisible = !isHiddenVisible;
}

async function loadHiddenCount(): Promise<void> {
	try {
		hiddenCount = await countHiddenItems();
	} catch {
		// ignore – count is non-critical
	}
}

export const hiddenStore = {
	get isHiddenVisible() {
		return isHiddenVisible;
	},
	get hiddenCount() {
		return hiddenCount;
	},
	toggleDirect,
	loadHiddenCount,
};
