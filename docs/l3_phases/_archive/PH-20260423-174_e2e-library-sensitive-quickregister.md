---
status: todo
phase_id: PH-20260423-174
title: "E2E: Library SensitiveControl + QuickRegisterDropZone テスト"
scope_files:
  - tests/e2e/library-detail.spec.ts
parallel_safe: true
depends_on: []
---

## 目的

SensitiveControl（プライベート表示トグル）と QuickRegisterDropZone（クリックでファイル選択）の
基本動作を E2E で検証する。

## 受け入れ条件

| # | 条件                                                                          |
| - | ----------------------------------------------------------------------------- |
| 1 | `Library プライベートトグル` describe ブロックを追加                          |
| 2 | プライベートボタンクリックで「プライベート ON/OFF」表示が切り替わることを検証 |
| 3 | 2 回クリックで元の状態に戻ることを検証                                        |
| 4 | `Library クイック登録エリア` describe ブロックを追加                          |
| 5 | クイック登録ボタンが表示されていること（visible check）                       |
| 6 | テスト後のプライベート状態をクリーンアップ（OFF に戻す）                      |

## 実装メモ

- SensitiveControl は `data-testid` がない可能性があるため `getByRole('button', { name: ... })` を使用
- QuickRegisterDropZone はファイルダイアログが開くためクリック後のダイアログ検証は行わない
- 新規テストファイル `tests/e2e/library-sidebar.spec.ts` に追加
