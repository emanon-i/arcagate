---
id: PH-20260423-117
title: tests/helpers/ipc.ts に addWidget ヘルパー追加
status: done
batch: 25
priority: low
created: 2026-04-23
scope_files:
  - tests/helpers/ipc.ts
  - tests/e2e/workspace.spec.ts
  - tests/e2e/widget-display.spec.ts
parallel_safe: false
depends_on: []
---

## 背景/目的

`invoke(page, 'cmd_add_widget', { workspaceId, widgetType })` が
`workspace.spec.ts` と `widget-display.spec.ts` の両方に生のまま書かれており、DRY 違反。
他のヘルパー（`createWorkspace`, `deleteWorkspace` 等）と同じパターンで `addWidget` を追加する。

## 実装内容

### `tests/helpers/ipc.ts` に追加

```typescript
export async function addWidget(
  page: Page,
  workspaceId: string,
  widgetType: string,
): Promise<void> {
  return invoke<void>(page, 'cmd_add_widget', { workspaceId, widgetType });
}
```

### 呼び出し元を置換

- `workspace.spec.ts`: `invoke(page, 'cmd_add_widget', ...)` → `addWidget(page, ...)`
- `widget-display.spec.ts`: `invoke(page, 'cmd_add_widget', ...)` → `addWidget(page, ...)`

## 注意事項

- `parallel_safe: false`: 3 ファイルを変更するため
- import の追加・削除（`invoke` が不要になる場合は削除）も行うこと

## 受け入れ条件

- [ ] `tests/helpers/ipc.ts` に `addWidget` が追加されていること
- [ ] `workspace.spec.ts` が `addWidget` を使っていること
- [ ] `widget-display.spec.ts` が `addWidget` を使っていること
- [ ] biome 0 errors（import 整理含む）
