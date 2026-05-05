---
id: PH-20260422-063
title: ipc/export.ts invoke 型パラメータ追加
status: done
batch: 12
---

## 目的

`export.ts` の `invoke` 呼び出しに `<void>` 型パラメータを付与し、他 IPC ファイルと一貫させる。

## 変更

- `invoke('cmd_export_json', ...)` → `invoke<void>('cmd_export_json', ...)`
- `invoke('cmd_import_json', ...)` → `invoke<void>('cmd_import_json', ...)`

## 受け入れ条件

- svelte-check / cargo test / tauri build 通過

## 検証

- pnpm verify 通過
