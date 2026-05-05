---
id: PH-20260427-456
status: todo
batch: 103
type: 改善
era: Distribution Era Hardening
---

# PH-456: Updater 自動チェック (起動時 + 24h 間隔)

## 問題

PH-446 (batch-100) で Updater UI 実装したが、手動「アップデート確認」ボタンのみ。
PH-452 (batch-101) で plan 化、deferred のまま → 本 plan で実装。

## 改修

`src/lib/state/updater.svelte.ts` 新設:

- 起動時 1 回チェック (configStore.setupComplete 後)
- 24h 間隔の interval setup
- 利用可能なら toast「新バージョン v<X> が利用可能、Settings で適用してください」(1 日 1 回まで)
- localStorage に `lastCheckedAt` / `lastDismissedVersion` 保存

`+page.svelte` で updaterStore 起動。

## 受け入れ条件

- [ ] updater.svelte.ts 新設、起動時 + 24h interval
- [ ] 利用可能 toast (重複抑制)
- [ ] +page.svelte で起動
- [ ] vitest 1 ケース (interval ロジック / 重複抑制)
- [ ] `pnpm verify` 全通過
