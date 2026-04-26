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
	/** 編集モード Sidebar palette に表示するか（false なら API でのみ追加可能） */
	addable: boolean;
	/**
	 * 設定 UI を担当する Svelte コンポーネント（batch-84 PH-375 で追加）。
	 * `let { config = $bindable() }: { config: SpecificConfig } = $props()` を受け取り、
	 * 内部で config を mutate する。WidgetSettingsDialog から `bind:config` で mount される。
	 * 未定義の widget は Settings UI を表示しない（旧フォールバック「max_items + sort_field」は
	 * `_shared/CommonMaxItemsSettings.svelte` を明示登録した widget のみに適用）。
	 *
	 * 型は `Component<any, any, any>` で受け、widget ごとに具体型の Props を持たせる。
	 * registry が異なる Settings コンポーネントを 1 つの型で集約する都合上、これは避けられない。
	 */
	// biome-ignore lint/suspicious/noExplicitAny: widget ごとに異なる config 型を 1 つの WidgetMeta に集約する都合
	SettingsContent?: Component<any, any, any>;
}

/** widgets/<name>/index.ts の export 形式（auto-collect 用） */
export interface WidgetModule {
	widgetType: WidgetType;
	meta: WidgetMeta;
}
