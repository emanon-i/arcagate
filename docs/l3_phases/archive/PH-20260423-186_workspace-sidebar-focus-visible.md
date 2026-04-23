---
status: done
phase_id: PH-20260423-186
title: WorkspaceSidebar ボタン focus-visible + active:scale 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
parallel_safe: true
depends_on: []
---

## 目的

WorkspaceSidebar の操作ボタン（編集モード切替・確定・キャンセル）に focus-visible と active:scale が未設定。キーボードナビゲーションと押下フィードバックを統一する。

## 対象ボタン

`WorkspaceSidebar.svelte` の全ボタン:

- 「編集」トグルボタン（編集モード開始）
- 「確定」ボタン（編集モード確定）
- 「キャンセル」ボタン（編集モードキャンセル）
- ウィジェット追加ドラッグハンドルは対象外（button ではない）

## 変更仕様

各ボタンに追加:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

transition が `transition-colors` のみなら完全形に更新:

```
transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none
```

## 検証

- `pnpm biome check` でエラーなし
- svelte-check でエラーなし
