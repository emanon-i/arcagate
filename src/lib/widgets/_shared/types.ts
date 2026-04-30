import type { Component } from 'svelte';
import type { WidgetType } from '$lib/bindings/WidgetType';

/**
 * 1 つのウィジェットの全 metadata を 1 オブジェクトに集約する型。
 *
 * 各 widget は `src/lib/widgets/<name>/index.ts` で `widgetType` + `meta`
 * を export し、`src/lib/widgets/index.ts` の `import.meta.glob` で
 * auto-collect される。
 *
 * batch-83 PH-370 で導入。
 */
export interface WidgetMeta {
	/** ウィジェット本体の Svelte コンポーネント */
	Component: Component;
	/** Lucide アイコン（編集モード Sidebar / aria icon に使用） */
	icon: Component;
	/** 日本語ラベル（編集モード Sidebar / aria-label に使用） */
	label: string;
	/** デフォルト config（addWidget 時に widget.config の初期値として使用、JSON シリアライズ可能） */
	defaultConfig?: Record<string, unknown>;
	/**
	 * 検収 #7: widget タイプごとの推奨デフォルトサイズ (グリッドセル単位)。
	 * addWidget / addWidgetAt / bulkAddItemWidgets で使用。未指定時は 2x2。
	 * クリック追加時に widget が極小 (1x1 等) で出るのを防ぐ。
	 */
	defaultSize?: { w: number; h: number };
	/** 編集モード Sidebar palette に表示するか（false なら API でのみ追加可能） */
	addable: boolean;
	/**
	 * 4/30 user 検収: Sidebar palette を用途別にグルーピング。
	 * 表示順: library → watch → memo → tool → info。未指定は末尾。
	 */
	category?: 'library' | 'watch' | 'memo' | 'tool' | 'info';
	/** カテゴリ内での並び順 (小さいほど上)。同 category 同 order なら label 昇順。 */
	categoryOrder?: number;
	/** WidgetSettingsDialog から `bind:config` で動的 mount される設定 UI（batch-84 PH-375）。 */
	// biome-ignore lint/suspicious/noExplicitAny: widget ごとに異なる config 型を 1 つの WidgetMeta に集約する都合
	SettingsContent?: Component<any, any, any>;
}

/**
 * 4/30 user 検収: Sidebar palette のカテゴリラベル + 表示順序。
 * 「これ何順ですか？」 user fb に答えるための明示的グルーピング。
 */
export const WIDGET_CATEGORIES: Array<{ key: NonNullable<WidgetMeta['category']>; label: string }> =
	[
		{ key: 'library', label: 'ライブラリ系' },
		{ key: 'watch', label: 'フォルダ監視' },
		{ key: 'memo', label: 'メモ・タスク' },
		{ key: 'tool', label: 'ツール' },
		{ key: 'info', label: '情報・状態' },
	];

/** widgets/<name>/index.ts の export 形式（auto-collect 用） */
export interface WidgetModule {
	widgetType: WidgetType;
	meta: WidgetMeta;
}
