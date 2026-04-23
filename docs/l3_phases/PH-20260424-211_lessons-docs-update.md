---
id: PH-20260424-211
title: lessons.md 更新 + dispatch-log batch-47 完了記録
status: todo
priority: low
parallel_safe: true
scope_files:
  - docs/lessons.md
  - docs/dispatch-log.md
depends_on: []
---

## 目的

batch-43〜46 の実装で得られた知見を lessons.md に記録する。

## 記録候補

1. **WorkspaceHintBar のフローティング pill → 全幅バー移行**: `fixed bottom-0` + `w-full` で親の overflow 制約を回避
2. **SettingsPanel 2ペイン化**: カテゴリ状態は `let activeCategory` をトップレベルで管理、各セクションを `{#if}` で切り替え
3. **Tauri 組み込みテーマプリセット**: migration SQL で初期データ INSERT は `INSERT OR IGNORE` を使う
4. **グローバルホットキー常時フローティング**: `global_shortcut().register()` はアプリ起動時に一度だけ呼ぶ。`cmd_set_hotkey` でホットキー変更時は旧ホットキーを `unregister()` してから新登録

## 実装ステップ

### Step 1: lessons.md に上記知見を追記

### Step 2: dispatch-log.md に batch-47 完了エントリを追記

## 受け入れ条件

- [ ] lessons.md に 4 件の知見が追加されている
- [ ] `pnpm verify` 全通過（dprint fmt 含む）
