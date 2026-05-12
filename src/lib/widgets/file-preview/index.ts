import { FileText } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import FilePreviewSettings from './FilePreviewSettings.svelte';
import Component from './FilePreviewWidget.svelte';

export const widgetType = 'file_preview' as const;

/**
 * U-6 (2026-05-12): screens-and-flows.md Workspace § 仕様
 *   「text ファイルをドラックアンドドロップで配置できてファイル名や文字数、サイズ、
 *    更新作成時間などのメタデータがわかり、 中身を見れる
 *    (Markdown 形式なら YAML フロントマターも表示)」
 *
 * 対応拡張子: md / txt / markdown / log / json / yaml / yml / toml / csv (D&D 検出側で限定)。
 */
export const meta: WidgetMeta = {
	Component,
	icon: FileText,
	label: 'ファイルプレビュー',
	defaultConfig: { path: '' },
	defaultSize: { w: 4, h: 5 },
	minViableSize: { w: 3, h: 3 },
	addable: true,
	category: 'memo',
	categoryOrder: 5,
	SettingsContent: FilePreviewSettings,
};
