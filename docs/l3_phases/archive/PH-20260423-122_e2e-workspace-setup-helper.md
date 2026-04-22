---
id: PH-20260423-122
title: E2E 共通ヘルパー setupWorkspaceWithWidget を tests/helpers/ に抽出
status: todo
batch: 26
priority: low
created: 2026-04-23
scope_files:
  - tests/helpers/workspace.ts
  - tests/e2e/widget-display.spec.ts
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: false
depends_on: []
---

## 背景/目的

`widget-display.spec.ts` にローカル定義されている `setupWorkspaceWithWidget()` と
`workspace-editing.spec.ts` の各テストが「ワークスペース作成→ウィジェット追加→reload→Workspace タブ選択」
というほぼ同一のセットアップを繰り返している。
`addWidget` ヘルパー（PH-117）に続き、共通化して DRY を徹底する。

## 実装内容

### `tests/helpers/workspace.ts` を新規作成

```typescript
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForAppReady } from './app-ready.js';
import { addWidget, createWorkspace, type Workspace } from './ipc.js';

export async function setupWorkspaceWithWidget(
  page: Page,
  workspaceName: string,
  widgetType: string,
): Promise<Workspace> {
  const workspace = await createWorkspace(page, workspaceName);
  await addWidget(page, workspace.id, widgetType);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await waitForAppReady(page);
  await page.getByRole('button', { name: 'Workspace' }).click();
  await expect(page.getByText(workspaceName)).toBeVisible();
  return workspace;
}
```

### 置き換え対象

- `widget-display.spec.ts`: ローカル `setupWorkspaceWithWidget` を削除し、helpers から import
- `workspace-editing.spec.ts`: 各テスト冒頭の共通セットアップを `setupWorkspaceWithWidget` に置き換え

## 注意事項

- `parallel_safe: false`: 複数ファイルを変更するため
- import 追加・削除も行うこと（biome 0 errors を維持）

## 受け入れ条件

- [ ] `tests/helpers/workspace.ts` が作成されていること
- [ ] `widget-display.spec.ts` がヘルパーを利用していること
- [ ] biome 0 errors
