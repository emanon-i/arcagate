---
id: PH-20260422-096
title: WorkspaceLayout の Spec 参照コメント除去
status: wip
batch: 20
priority: low
created: 2026-04-22
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
---

## 背景/目的

`WorkspaceLayout.svelte` に残存する `// S-6-6:`, `// S-6-2:`, `// S-7-2:` などの
spec 参照コメントは実装が完了した今、コードの意味を説明しない冗長なコメントである。
CLAUDE.md の「コードが何をするか説明するコメントを書かない」原則に従い削除する。

## 修正内容

対象コメントを削除:

- `// S-6-6: Right-click detail panel` (line 42)
- `// S-6-6: Handle right-click on items in widgets` (line 110)
- `// S-6-2: Ctrl+wheel zoom handler` (line 115)
- `// S-7-2: Calculate grid position from drop coordinates` (line 131)
- `<!-- S-6-6: Right-click detail panel -->` (line 401 付近)

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] `S-[0-9]+-[0-9]+:` パターンが WorkspaceLayout.svelte に残存しないこと
