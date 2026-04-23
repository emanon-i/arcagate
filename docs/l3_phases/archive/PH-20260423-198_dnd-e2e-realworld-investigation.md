---
status: done
phase_id: PH-20260423-198
title: D&D E2E 実機乖離調査 + simulateDragDrop 廃止
category: 調査・テスト修正
scope_files:
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: true
depends_on: []
---

## 問題

E2E テスト（`simulateDragDrop`）は green だが、実機で D&D が動かない。

## 根本原因

`simulateDragDrop` は `new DataTransfer()` を共有して合成 `DragEvent` を直接 dispatch する。

| 観点                            | 合成イベント (simulateDragDrop)                  | 実機 HTML5 D&D                              |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `dataTransfer.setData`          | 常に書込み可                                     | `dragstart` イベント中のみ                  |
| `dataTransfer.getData`          | 常に読込み可                                     | `drop` イベント中のみ                       |
| イベント経路                    | テスト対象要素に直接 dispatch                    | ブラウザの hit-test → 最前面要素から bubble |
| `preventDefault()` のタイミング | 無関係（browser は native D&D を起動していない） | `dragover` で同期 `preventDefault()` が必須 |

合成イベントは「JS ハンドラが実行されるか」のみを検証し、ブラウザの native drag
機構（hit-test・drop 許可判定・DataTransfer 保護モード）を一切通らない。

## 修正（batch-41 に含む）

- `simulateDragDrop` を削除
- `page.locator(...).dragTo(...)` に置き換え
  - Playwright の `dragTo` は Chromium の `Input.dispatchDragEvent` CDP を使用
  - CDP drag は native DragEvent を発火し、hit-test・DataTransfer 保護モードを含む実挙動を通る
  - WebView2 (Runtime 97+) は `Input.dispatchDragEvent` を実装済み

同時に WorkspaceWidgetGrid の drag handlers を `$effect` 間接登録から
`ondragover` / `ondrop` インライン属性へ移行（WebView2 での確実な登録を保証）。

## 検証状況

- sandbox 環境（WebView2 GUI なし）のため E2E を自動実行できなかった
- 静的解析（biome / svelte-check / cargo test）は全通過
- 実機検証はユーザに依頼
