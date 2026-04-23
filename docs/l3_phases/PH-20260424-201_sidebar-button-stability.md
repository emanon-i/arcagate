---
id: PH-20260424-201
title: WorkspaceSidebar ボタン幅安定化（改行・ガタつき防止）
status: wip
priority: low
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
---

## 背景

ユーザフィードバック: 「ウィンドウサイズでボタン幅・文字改行が変わる」（item #10）。
サイドバーヘッダーの「完了」「戻す」ボタンがウィンドウ幅によって改行する可能性。

## 変更内容

- ボタンに `whitespace-nowrap` を追加
- ヘッダー行を `flex-nowrap` に変更
- サイドバー 200px 幅で全要素が収まるよう余白を調整

## 受け入れ条件

- ウィンドウを最小まで縮小しても「完了」「戻す」ボタンが改行しない
