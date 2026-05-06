import { itemStore } from '$lib/state/items.svelte';

class WorkspaceContextMenuStore {
	open = $state(false);
	x = $state(0);
	y = $state(0);
	itemId = $state<string | null>(null);

	item = $derived.by(() =>
		this.itemId ? (itemStore.items.find((i) => i.id === this.itemId) ?? null) : null,
	);

	openMenu(id: string, ev?: MouseEvent) {
		this.itemId = id;
		this.x = ev?.clientX ?? 0;
		this.y = ev?.clientY ?? 0;
		this.open = true;
	}

	close() {
		this.open = false;
	}
}

export const workspaceContextMenuStore = new WorkspaceContextMenuStore();
