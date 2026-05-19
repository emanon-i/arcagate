# Quick Note Widget (メモ)

> widgetType: `quick_note` / category: memo / 配置画面: [Workspace](../screens/workspace.md)

## 目的

widget 内に直接書ける簡易メモ。打った内容が自動保存され、保存状態を視覚化する。

## やること (必要処理)

- textarea への入力を debounce (500ms) して widget config に保存
- 保存状態 (idle / pending / saving / saved) を表示。saved は 2 秒で idle に戻る
- font_size (sm / md / lg) で文字サイズ切替

## やらないこと (禁止 / scope 外)

- file system にメモを書き出さない (config JSON にのみ保存)
- 入力ごとに同期 IPC を呼ばない (debounce で集約)
- markdown レンダリング / リッチテキストをしない (plain text)
- 複数 note や履歴を持たない (1 widget = 1 note)

## 性能予算

- debounce 500ms で IPC 頻度を 1-2 回/秒 に集約
- 描画・保存とも軽量 (数 KB の文字列)

## 副作用 (state 変化 / persistence)

- widget config (`note` text / `font_size`) を `workspace_widgets.config` JSON に保存

## 依存

- IPC: `cmd_update_widget_config` のみ
- config schema: `note: string` / `font_size: 'sm' | 'md' | 'lg'`
- backend: [Workspace Service](../backend/workspace-service.md)

## 既知の判断

- メモは workspace_widgets.config に格納。本文長が増えると IPC payload に乗るため大量テキスト用途は想定外 (< 10KB 目安)
