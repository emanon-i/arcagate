---
id: PH-20260427-425
status: todo
batch: 94
type: 改善
era: UX Audit Re-Validation Round 3
---

# PH-425: ErrorBoundary 横断耐障害性

## 問題

Codex Q4 推奨 #7: 未補足エラー / Promise reject が発生してもアプリ全体がクラッシュしないように。
Svelte 5 ではコンポーネント単位の error boundary がまだ正式機能でないため、最小限の wrapper で対応。

## 改修

- `src/lib/components/common/ErrorBoundary.svelte` 新設
  - children prop + try/catch 同等の振る舞い (Svelte 5 では `<svelte:boundary>` が available、これを使う)
- 全画面ルート (`+page.svelte`) を `<svelte:boundary>` でラップ
- failed 時は ErrorState (batch-87) を表示 + リロードボタン
- `cmd_log_frontend` 経由で Rust 側に詳細送信

## 受け入れ条件

- [ ] `ErrorBoundary.svelte` 新設 (svelte:boundary 利用)
- [ ] `+page.svelte` をラップ
- [ ] failed 状態で「予期しないエラーが発生しました」+ [再読み込み] ボタン
- [ ] cmd_log_frontend 連携で error 永続化
- [ ] ErrorBoundary.test.ts 2 ケース (正常 / failed)
- [ ] `pnpm verify` 全通過
