// WidgetType は src-tauri の Rust enum から ts-rs で自動生成（batch-79 PH-352）

import type { WidgetType } from '$lib/bindings/WidgetType';
import { t } from '$lib/i18n.svelte';

export type { WidgetType };

/**
 * K-1 (2026-05-15): widget 表示名を i18n 化。 旧 `WIDGET_LABELS` static map は
 * locale 切替時に reactivity が無く EN locale でも JP 表示が残る regression が
 * あった (user 報告)。 `widgetLabel(type)` を呼び出す形式に統一、 t() を経由して
 * 現在 locale に追従。 `WIDGET_LABELS` は backward-compat の readonly Proxy として
 * 残置 (新規 callsite は `widgetLabel()` を使う)。
 */
export function widgetLabel(type: WidgetType): string {
	// K-1 follow-up (2026-05-16): i18n key path は `widgets.widget_label.*` (messages JSON 構造に合わせ)。
	// 旧 path `workspace.widget_label.*` は messages JSON に存在しないため t() fallback でキー文字列が
	// 返り、 widget 名表示が壊れていた (e2e #498 dialog-pin が `hasText: 'の設定'` で失敗した root cause)。
	return t(`widgets.widget_label.${type}`);
}

/**
 * Backward-compat: 旧 callsite が `WIDGET_LABELS[type]` で参照していたものに対応。
 * 各 access 毎に t() を呼ぶので locale 切替に追従する。
 *
 * 新規実装では `widgetLabel(type)` を直接使用すること。
 */
export const WIDGET_LABELS: Record<WidgetType, string> = new Proxy(
	{} as Record<WidgetType, string>,
	{
		get(_target, prop: string) {
			return widgetLabel(prop as WidgetType);
		},
	},
);

export interface Workspace {
	id: string;
	name: string;
	sort_order: number;
	// PH-issue-009: per-workspace 背景画像。null は壁紙未設定。
	wallpaper_path: string | null;
	wallpaper_opacity: number; // 0.0..1.0, default 0.6
	wallpaper_blur: number; // 0..40 (px), default 0
	created_at: string;
	updated_at: string;
}

export interface UpdateWorkspaceWallpaperInput {
	workspace_id: string;
	path: string | null;
	opacity: number;
	blur: number;
}

/**
 * PH-CF-700 C8: Library 画面のグローバル壁紙設定。 workspace 壁紙と shape は同型だが
 * workspace_id を持たない。 config table の library_wallpaper_* キーに格納される。
 */
export interface LibraryWallpaper {
	path: string | null;
	opacity: number; // 0.0..1.0, default 0.6
	blur: number; // 0..40 (px), default 0
}

export interface UpdateLibraryWallpaperInput {
	path: string | null;
	opacity: number;
	blur: number;
}

export interface WorkspaceWidget {
	id: string;
	workspace_id: string;
	widget_type: WidgetType;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	config: string | null;
	created_at: string;
	updated_at: string;
}
