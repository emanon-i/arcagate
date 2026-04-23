---
id: PH-20260424-199
title: WorkspaceHintBar 再デザイン（視認性・存在感向上）
status: done
priority: medium
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceHintBar.svelte
---

## 背景

ユーザフィードバック: 「ヒントバーが小さくてダサい」。
現状は text-xs + py-1.5 の pill 形式で、編集モード時のヒントとして存在感が薄い。

## 変更内容

- pill → 横長バー（rounded-lg）に変更（bottom-0 固定 or bottom 5px）
- テキストサイズ text-xs → text-sm
- padding py-1.5 → py-2.5 px-6
- kbd スタイル強化（bg-[var(--ag-surface-4)] px-1.5 rounded）
- 選択中の場合は accent カラーの左ボーダーを追加

## 受け入れ条件

- 編集モードに入ると画面下部にヒントバーが見える
- キーショートカット（Esc/Enter/Del）が明確に読める
- 1件選択中は accent 強調が見える
