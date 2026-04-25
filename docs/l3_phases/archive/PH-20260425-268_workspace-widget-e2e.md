---
id: PH-20260425-268
status: done
batch: 62
type: 防衛
---

# PH-268: Workspace ウィジェット E2E 強化

## 背景・目的

batch-61 で追加した Item Widget（PH-262）・WidgetItemList ソート（PH-260）は
E2E テストが存在しない。Workspace ウィジェット操作の smoke テストを追加して
リグレッション防止を強化する。

## 調査: 既存カバレッジ

`workspace.spec.ts` には「ワークスペース作成が UI に表示されること @smoke」1 件のみ。
ウィジェット追加・削除・Item Widget 選択フローは未カバー。

## 追加テストケース

### `workspace-widget-item.spec.ts`（新規）

| テスト                                                 | tag    |
| ------------------------------------------------------ | ------ |
| Item Widget をワークスペースに追加できること           | @smoke |
| LibraryItemPicker でアイテムを選択できること           | —      |
| 選択済みアイテムをクリックで起動できること             | —      |
| 「アイテムを変更」メニューでアイテムを再選択できること | —      |

### `workspace-widget-list.spec.ts`（新規）

| テスト                                           | tag    |
| ------------------------------------------------ | ------ |
| Favorites ウィジェットにアイテムが表示されること | @smoke |
| WidgetItemList の検索でフィルタリングできること  | —      |
| WidgetSettingsDialog でソート順を変更できること  | —      |

## 実装ファイル

| ファイル                                  | 変更内容 |
| ----------------------------------------- | -------- |
| `tests/e2e/workspace-widget-item.spec.ts` | 新規     |
| `tests/e2e/workspace-widget-list.spec.ts` | 新規     |
| `tests/helpers/` 必要に応じてヘルパー追加 | 更新     |

## 受け入れ条件

- [ ] Item Widget 追加・選択・起動の E2E が通る
- [ ] Favorites ウィジェット表示の smoke テストが通る
- [ ] `pnpm test:e2e:smoke` 全通過
- [ ] `pnpm verify` 全通過
