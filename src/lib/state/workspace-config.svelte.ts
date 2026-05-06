/**
 * PR-D: workspace.svelte.ts (666 LOC) を 3 sub-store に分割した config 担当。
 *
 * 担当範囲:
 * - workspace 一覧 (workspaces)
 * - active 選択 (activeWorkspaceId / activeWorkspace derived)
 * - workspace CRUD (load / create / update / delete / select / replace)
 *
 * 引用元 guideline:
 * - a3-frontend-shape.md §2.2 (sub-store 分割: config / widgets / history)
 * - A2 SV-1 (Class wrapper + singleton export pattern)
 * - A2 SV-3 ($state / $derived / $effect の正しい使い分け)
 *
 * widget CRUD は `workspace-widgets.svelte.ts` に分離。
 * undo/redo は `workspace-history.svelte.ts` (ring buffer) と
 * `workspace-widgets.svelte.ts` (apply 経路) で完結する。
 */

import * as workspaceIpc from '$lib/ipc/workspace';
import { workspaceWidgets } from '$lib/state/workspace-widgets.svelte';
import type { Workspace } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { removeKey } from '$lib/utils/local-storage';

class WorkspaceConfig {
	workspaces = $state<Workspace[]>([]);
	activeWorkspaceId = $state<string | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	activeWorkspace = $derived(this.workspaces.find((w) => w.id === this.activeWorkspaceId) ?? null);

	async loadWorkspaces(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			this.workspaces = await workspaceIpc.listWorkspaces();
			// 初回起動時 (workspaces 0 件) は空 Home workspace を auto-create。default widget seed は無し
			// (検収 #3: user が並べる)。
			if (this.workspaces.length === 0) {
				const ws = await workspaceIpc.createWorkspace('Home');
				this.workspaces = [ws];
				this.activeWorkspaceId = ws.id;
				workspaceWidgets.setWidgets([]);
				return;
			}
			if (this.activeWorkspaceId === null) {
				this.activeWorkspaceId = this.workspaces[0].id;
				await workspaceWidgets.loadWidgets(this.workspaces[0].id);
			}
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async createWorkspace(name: string): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			const ws = await workspaceIpc.createWorkspace(name);
			this.workspaces = [...this.workspaces, ws];
			this.activeWorkspaceId = ws.id;
			workspaceWidgets.setWidgets([]);
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async updateWorkspace(id: string, name: string): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			const ws = await workspaceIpc.updateWorkspace(id, name);
			this.workspaces = this.workspaces.map((w) => (w.id === id ? ws : w));
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async deleteWorkspace(id: string): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			await workspaceIpc.deleteWorkspace(id);
			this.workspaces = this.workspaces.filter((w) => w.id !== id);
			if (this.activeWorkspaceId === id) {
				this.activeWorkspaceId = this.workspaces.length > 0 ? this.workspaces[0].id : null;
				if (this.activeWorkspaceId) {
					workspaceWidgets.setWidgets(await workspaceIpc.listWidgets(this.activeWorkspaceId));
				} else {
					workspaceWidgets.setWidgets([]);
				}
			}
			// PR #268 Codex review #10: workspace 削除時に per-workspace pan key を localStorage から
			// GC して quota 圧迫を防ぐ。既存 helper 経由で SecurityError も握り潰す。
			removeKey(`arcagate.workspace.pan.${id}`);
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async selectWorkspace(id: string): Promise<void> {
		this.activeWorkspaceId = id;
		await workspaceWidgets.loadWidgets(id);
	}

	/**
	 * PH-issue-009 Phase B: store の workspaces 配列内で 1 件だけ in-place replace。
	 * IPC で更新後の Workspace を反映するために使用 (壁紙変更時に即時 canvas 反映)。
	 */
	replaceWorkspace(updated: Workspace): void {
		this.workspaces = this.workspaces.map((w) => (w.id === updated.id ? updated : w));
	}
}

export const workspaceConfig = new WorkspaceConfig();
