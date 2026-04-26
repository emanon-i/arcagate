---
id: PH-20260427-397
status: done
batch: 88
type: 改善
era: Polish Era
---

# PH-397: スプラッシュ / Loading 画面 + Loading/Error 状態統一

## 参照した規約

- `memory/arcagate_product_direction.md` Polish Era 候補: スプラッシュ / Loading 画面
- `engineering-principles.md` §9 「起動が速い」「ストレスがない」客観指標
- batch-86 PH-385 で空状態を整備、Loading / Error も同じレベルで統一する

## 横展開チェック実施済か

- 現状 Loading は各画面でハンドコード（`<span class="...animate-spin..."> + 読み込み中...`）
- Error 表示は toastStore 経由 + 一部 inline 表示が混在

## 仕様

### Loading 状態統一

`src/lib/components/common/LoadingState.svelte` を新設:

- spinner + 任意 description
- Library / Settings / Workspace の `loading` 表示を統一

### Error 状態統一

`src/lib/components/common/ErrorState.svelte` を新設:

- icon (`AlertTriangle`) + title + description + 任意 retry action
- 致命的エラー時の inline 表示用（toast は瞬間的、ErrorState は永続的 / blocking）

### スプラッシュ

Tauri windows 起動時の白フラッシュを抑える splash window を tauri.conf.json に追加するか、起動時の Spinner 表示を `+layout.svelte` で統一して即時 paint。

実機計測（PH-382 スクリプト）で 2 秒以内なら splash 不要、2 秒超なら splash 採用判断。本バッチでは計測 + 判断のみ、実装は次バッチ。

## 受け入れ条件

- [x] LoadingState.svelte 新設（spinner + description, role="status" aria-live="polite"）
- [x] ErrorState.svelte 新設（AlertTriangle icon + retry CTA, role="alert" aria-live="assertive"）
- [ ] 既存 Library / Settings の Loading 表示の統合は **batch-89 に持越**（差分肥大化を避ける）
- [ ] スプラッシュ採用判定は実機計測完走後 (batch-89+)
- [x] e2e リグレッション 0
- [x] `pnpm verify` 全通過

## 完了ノート（batch-88）

LoadingState / ErrorState コンポーネント新設まで。既存箇所への適用は batch-89 で。
スプラッシュは実機計測（PH-382 スクリプト）の結果次第で判断、本バッチでは見送り。

## SFDIPOT 観点

- **F**unction: Loading の即時表示で「壊れていない」を伝える
- **T**ime: 起動 2 秒目標との整合
