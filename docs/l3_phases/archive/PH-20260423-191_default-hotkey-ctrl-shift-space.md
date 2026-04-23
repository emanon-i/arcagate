---
status: done
phase_id: PH-20260423-191
title: デフォルトホットキーを Ctrl+Shift+Space に変更
category: 改善
scope_files:
  - src-tauri/src/models/config.rs
  - src/lib/state/config.svelte.ts
  - src-tauri/src/services/config_service.rs
parallel_safe: true
depends_on: []
---

## 目的

現行デフォルトの `CmdOrCtrl+Space`（Windows では Ctrl+Space）は日本語 IME
ショートカットと衝突する。ユーザからの実機確認フィードバックで `Alt+Space` も
OS ショートカットと被ると報告があったため、衝突しにくい `Ctrl+Shift+Space` を
新デフォルトとして採用する。

## 変更方針

### デフォルト定数の置き換え

| ファイル                           | 変更前              | 変更後               |
| ---------------------------------- | ------------------- | -------------------- |
| `src-tauri/src/models/config.rs:8` | `"CmdOrCtrl+Space"` | `"Ctrl+Shift+Space"` |
| `src/lib/state/config.svelte.ts:3` | `'CmdOrCtrl+Space'` | `'Ctrl+Shift+Space'` |

### テスト更新

`src-tauri/src/services/config_service.rs` の
`test_get_hotkey_returns_default` アサーションを `"Ctrl+Shift+Space"` に更新。

### ドキュメント更新

`docs/dispatch-log.md` 内の `Alt+Space` 言及（手動確認チェックリスト）を
`Ctrl+Shift+Space` に一括置換。

## 移行方針（既存ユーザ）

- `get_or_default` は DB に値が存在しない場合のみデフォルトを返す
- DB に `Alt+Space` が保存されているユーザ（手動設定済み）は**値を保持**
- 新デフォルトへの移行は Settings > 一般 > ホットキーから手動変更

## 検証

- `cargo test` でデフォルト値テスト通過
- `pnpm biome check` でエラーなし
- `svelte-check` でエラーなし
