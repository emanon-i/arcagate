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
import { itemStore } from '$lib/state/items.svelte';
import { workspaceHistory } from '$lib/state/workspace-history.svelte';
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

	/**
	 * PH-CF-100: `deleteItems` は **必須引数** (implicit default なし)。
	 * - true: workspace と widget + 紐付く item (他 workspace 非参照のみ) を 1 transaction で削除。
	 *   現状挙動 (E5 修正前) と同じ「workspace 消したらアイテムも消える」 を維持しつつ、
	 *   参照集合を `sys-ws-* tag ∪ widget config item_ids` の和集合に広げて孤立残留を解消。
	 * - false: workspace と widget だけ消し、 item は Library に残す。 PH-CF-300 で confirm
	 *   modal の選択肢として user に渡る。
	 *
	 * E4/E5 ghost item 経路: cascade 後に `itemStore.loadItems()` + sidebar count 再取得を
	 * 走らせ、 フロントのキャッシュ済 ghost item (DB から消えた item の参照) を解消する。
	 * 旧実装は refresh していなかったため、 削除済 item の設定を開いて `ItemNotFound` が
	 * 出ていた (Codex クロスチェック指摘の真因 #2)。
	 */
	async deleteWorkspace(id: string, deleteItems: boolean): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			await workspaceIpc.deleteWorkspace(id, deleteItems);
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
			// PH-CF-100 (Codex 指摘 #2): cascade DELETE で DB から消えた item を frontend
			// itemStore が stale キャッシュし続けると、 user がその ghost item の設定を開いた
			// 瞬間に backend `find_by_id` が `AppError::NotFound` を投げ「右下に赤いトースト」
			// (= E4 / E5 共通症状の 1 系統) になる。 削除挙動に関わらず常に refresh。
			await Promise.all([
				itemStore.loadItems(),
				itemStore.loadLibraryStats(),
				itemStore.loadTagWithCounts(),
			]);
		} catch (e) {
			this.error = getErrorMessage(e);
		} finally {
			this.loading = false;
		}
	}

	async selectWorkspace(id: string): Promise<void> {
		// 同 id の早期 return: 不要な loadWidgets / history clear を避ける。
		if (this.activeWorkspaceId === id) return;
		this.activeWorkspaceId = id;
		// PR-D Codex must-fix #2: cross-workspace undo/redo 混入を防ぐため、workspace 切替時に
		// history を clear する。HistoryEntry は元 workspace に紐づくため新 workspace で undo すると
		// 別 workspace の widget を変更する不整合が起きる。entry に workspaceId フィルタを入れるより、
		// 切替時 clear が単純で確実。
		workspaceHistory.clear();
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
