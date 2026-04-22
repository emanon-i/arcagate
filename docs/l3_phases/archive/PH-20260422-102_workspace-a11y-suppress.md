---
id: PH-20260422-102
title: WorkspaceLayout a11y 警告抑制
status: done
batch: 22
priority: low
created: 2026-04-22
---

## 背景/目的

batch-21 (PH-098) で WorkspaceLayout.svelte に追加した `onclick` ハンドラが
svelte-check で 3件の WARNING を出している:

- L335: `a11y_click_events_have_key_events`（ウィジェットグリッド div）
- L345: `a11y_click_events_have_key_events` + `a11y_no_noninteractive_element_interactions`（ウィジェットコンテナ div）

これらは D&D UI の選択パターンとして意図的な実装であり、
`<!-- svelte-ignore ... -->` コメントで適切に抑制する。

## 実装内容

`WorkspaceLayout.svelte` の該当 `<!-- svelte-ignore a11y_no_static_element_interactions -->` コメントを
正しいルール名に差し替える:

```svelte
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
```

L335 のグリッド div（選択クリア用）と L345 のウィジェットコンテナ div（選択用）の 2箇所。

## 受け入れ条件

- [x] `pnpm check` で 0 WARNINGS になること
- [x] `pnpm verify` 全通過
