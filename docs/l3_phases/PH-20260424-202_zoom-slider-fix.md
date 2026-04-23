---
id: PH-20260424-202
title: ウィジェットズームスライダー動作確認と修正
status: wip
priority: high
parallel_safe: true
scope_files:
  - src/lib/state/config.svelte.ts
  - src/lib/components/settings/SettingsPanel.svelte
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
---

## 背景

ユーザフィードバック: 「ウィジット拡大率スライダーを変えても変化しない」（item #15）。
実装はあるが実機で動作しない可能性。

## 調査・修正内容

実装確認:

- `configStore.setWidgetZoom` → `widgetZoom = clamped` で $state 更新
- `WorkspaceLayout` の `widgetW/H` は `$derived(BASE_W * zoom/100)` で計算
- CSS 変数 `--widget-w/h` でグリッドに伝播

潜在的問題: Settings が別ルート/ダイアログで開いている場合、モジュール singleton が共有されているか確認。
修正: 問題があれば `configStore.setWidgetZoom` の呼び出しを確認。なければ実装として問題なし。

## 受け入れ条件

- SettingsPanel のスライダーを動かすとリアルタイムでウィジェットサイズが変わる
- ページリロード後も設定値が保持される
