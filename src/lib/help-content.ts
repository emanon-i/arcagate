/**
 * In-app ヘルプコンテンツ (Nielsen H10 対応 / batch-92 PH-418)
 *
 * - グローバル: 全画面共通の主要ホットキー
 * - 画面別: 各画面 (Library / Workspace / Palette / Settings) の操作リファレンス
 * - i18n 対応の余地: 現状日本語固定、将来 messages.json 化
 */

export interface HelpHotkey {
	keys: string;
	description: string;
}

export interface HelpScreenSection {
	id: string;
	title: string;
	hotkeys: HelpHotkey[];
	tips: string[];
}

export const GLOBAL_HOTKEYS: HelpHotkey[] = [
	{ keys: 'Ctrl+Shift+Space', description: 'コマンドパレットを開く' },
	{ keys: '?', description: 'ヘルプを開く / 閉じる' },
	{ keys: 'Esc', description: 'パレット / ダイアログを閉じる' },
];

export const SCREENS: HelpScreenSection[] = [
	{
		id: 'library',
		title: 'Library — アイテム管理',
		hotkeys: [
			{ keys: '←/→', description: 'カードを移動' },
			{ keys: 'Enter / ダブルクリック', description: '選択アイテムを起動' },
			{ keys: 'Delete', description: '選択アイテムを削除' },
		],
		tips: [
			'D&D でアプリ・フォルダを追加できます',
			'Settings → 取り込みフォルダで自動取り込み設定が可能です',
			'Library カードのサイズは Settings > Library で S/M/L 切替',
		],
	},
	{
		id: 'workspace',
		title: 'Workspace — シナリオ別ランチャーパッド',
		hotkeys: [
			{ keys: '編集モード切替', description: '右上のボタンでウィジェット追加 / 配置' },
			{ keys: '右クリック', description: 'ウィジェット設定メニュー' },
			{ keys: 'ダブルクリック', description: 'ウィジェット内アイテムを起動' },
		],
		tips: [
			'Workspace タブで複数構成を切替可能',
			'ウィジェットはグリッドで自由配置 / リサイズ',
			'Favorites / Recent / Stats / QuickNote 等から組み合わせて作る',
		],
	},
	{
		id: 'palette',
		title: 'Palette — コマンドパレット',
		hotkeys: [
			{ keys: 'Ctrl+Shift+Space', description: 'どこからでも開く（グローバル）' },
			{ keys: '↑/↓', description: '結果を選択' },
			{ keys: 'Enter', description: '実行 / 起動' },
			{ keys: 'Esc', description: '閉じる' },
		],
		tips: [
			'タグプレフィックス: 例 `g:` で「ゲーム」タグ内検索',
			'計算式や URL も入力可能（自動判定）',
			'クリップボード履歴も検索対象に出ます',
		],
	},
	{
		id: 'settings',
		title: 'Settings — 設定',
		hotkeys: [
			{ keys: 'Settings ボタン', description: '右下の歯車から開く' },
			{ keys: 'Esc', description: '閉じる' },
		],
		tips: [
			'2 ペイン UI: 左カテゴリ / 右設定項目',
			'設定変更は即時反映',
			'テーマは Appearance、組み込みは「コピー」してカスタマイズ',
		],
	},
];
