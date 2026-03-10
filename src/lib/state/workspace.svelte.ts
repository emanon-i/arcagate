import * as workspaceIpc from '$lib/ipc/workspace';
import type { WidgetType, Workspace, WorkspaceWidget } from '$lib/types/workspace';

let workspaces = $state<Workspace[]>([]);
let activeWorkspaceId = $state<string | null>(null);
let widgets = $state<WorkspaceWidget[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

async function loadWorkspaces(): Promise<void> {
	loading = true;
	error = null;
	try {
		workspaces = await workspaceIpc.listWorkspaces();
		if (workspaces.length > 0 && activeWorkspaceId === null) {
			activeWorkspaceId = workspaces[0].id;
			await loadWidgets(workspaces[0].id);
		}
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function createWorkspace(name: string): Promise<void> {
	loading = true;
	error = null;
	try {
		const ws = await workspaceIpc.createWorkspace(name);
		workspaces = [...workspaces, ws];
		activeWorkspaceId = ws.id;
		widgets = [];
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function updateWorkspace(id: string, name: string): Promise<void> {
	loading = true;
	error = null;
	try {
		const ws = await workspaceIpc.updateWorkspace(id, name);
		workspaces = workspaces.map((w) => (w.id === id ? ws : w));
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function deleteWorkspace(id: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await workspaceIpc.deleteWorkspace(id);
		workspaces = workspaces.filter((w) => w.id !== id);
		if (activeWorkspaceId === id) {
			activeWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;
			widgets = activeWorkspaceId ? await workspaceIpc.listWidgets(activeWorkspaceId) : [];
		}
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function selectWorkspace(id: string): Promise<void> {
	activeWorkspaceId = id;
	await loadWidgets(id);
}

async function loadWidgets(workspaceId: string): Promise<void> {
	loading = true;
	error = null;
	try {
		widgets = await workspaceIpc.listWidgets(workspaceId);
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function addWidget(widgetType: WidgetType): Promise<void> {
	if (!activeWorkspaceId) return;
	loading = true;
	error = null;
	try {
		const widget = await workspaceIpc.addWidget(activeWorkspaceId, widgetType);
		widgets = [...widgets, widget];
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function removeWidget(id: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await workspaceIpc.removeWidget(id);
		widgets = widgets.filter((w) => w.id !== id);
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function persistWidgetOrder(orderedWidgets: WorkspaceWidget[]): Promise<void> {
	try {
		await Promise.all(
			orderedWidgets.map((w, i) =>
				workspaceIpc.updateWidgetPosition(w.id, w.position_x, i, w.width, w.height),
			),
		);
		widgets = orderedWidgets.map((w, i) => ({ ...w, position_y: i }));
	} catch (e) {
		error = String(e);
	}
}

async function updateWidgetConfig(id: string, config: string | null): Promise<void> {
	try {
		error = null;
		const updated = await workspaceIpc.updateWidgetConfig(id, config);
		widgets = widgets.map((w) => (w.id === id ? updated : w));
	} catch (e) {
		error = String(e);
	}
}

async function resizeWidget(id: string, width: number, height: number): Promise<void> {
	const target = widgets.find((w) => w.id === id);
	if (!target) return;
	try {
		error = null;
		await workspaceIpc.updateWidgetPosition(
			id,
			target.position_x,
			target.position_y,
			width,
			height,
		);
		widgets = widgets.map((w) => (w.id === id ? { ...w, width, height } : w));
	} catch (e) {
		error = String(e);
	}
}

async function moveWidget(id: string, x: number, y: number): Promise<void> {
	const target = widgets.find((w) => w.id === id);
	if (!target) return;
	error = null;
	// 楽観的ローカル更新
	widgets = widgets.map((w) => (w.id === id ? { ...w, position_x: x, position_y: y } : w));
	try {
		await workspaceIpc.updateWidgetPosition(id, x, y, target.width, target.height);
	} catch (e) {
		error = String(e);
		// ロールバック
		widgets = widgets.map((w) =>
			w.id === id ? { ...w, position_x: target.position_x, position_y: target.position_y } : w,
		);
	}
}

function optimisticResize(id: string, width: number, height: number): void {
	widgets = widgets.map((w) => (w.id === id ? { ...w, width, height } : w));
}

export const workspaceStore = {
	get workspaces() {
		return workspaces;
	},
	get activeWorkspaceId() {
		return activeWorkspaceId;
	},
	get widgets() {
		return widgets;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	loadWorkspaces,
	createWorkspace,
	updateWorkspace,
	deleteWorkspace,
	selectWorkspace,
	addWidget,
	removeWidget,
	updateWidgetConfig,
	persistWidgetOrder,
	resizeWidget,
	moveWidget,
	optimisticResize,
};
