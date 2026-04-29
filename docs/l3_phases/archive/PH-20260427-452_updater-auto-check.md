---
id: PH-20260427-452
status: deferred
batch: 101
type: 改善
era: Distribution Era
---

# PH-452: Updater 自動チェック (起動時 + 24h 間隔)

## 問題

PH-446 (batch-100) で Updater UI 実装したが、手動「アップデート確認」ボタンのみ。
起動時 + 24h 間隔の自動チェックを追加し、新版があれば toast でユーザに通知。

## 改修

`src/lib/state/updater.svelte.ts` 新設:

- 起動時 1 回チェック (configStore.setupComplete 後)
- 24h 間隔の interval setup
- 利用可能なら toast「新バージョン v<X> が利用可能、Settings で適用してください」
- localStorage に lastChecked / lastDismissed 保存 (再 toast 抑制)

`+page.svelte` で updaterStore 起動。

## 受け入れ条件

- [ ] updater.svelte.ts 新設、check() 起動時 + interval 24h
- [ ] 利用可能 toast (1 日 1 回まで、dismiss 後は 24h 抑制)
- [ ] +page.svelte で起動
- [ ] vitest 1 ケース (interval ロジック)
- [ ] `pnpm verify` 全通過
