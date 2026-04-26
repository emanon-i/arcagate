---
id: PH-20260427-427
status: todo
batch: 94
type: 改善
era: UX Audit Re-Validation Round 3
---

# PH-427: OnboardingTour (Codex Q5 #3)

## 問題

batch-92 PH-418 plan に書かれていたが scope 縮小で未実装。Codex Q5 #3 で再指摘。
SetupWizard とは役割分離: SetupWizard = 初回 DB 初期化、OnboardingTour = 主要操作の学習。

## 改修

- `src/lib/components/setup/OnboardingTour.svelte` 新設
- 初回起動 (setup_complete && !onboarding_complete) で 1 回だけ表示
- 3 ステップ:
  1. 「Ctrl+Shift+Space でパレットを開けます」(キャプチャ + 矢印)
  2. 「? キーでいつでもヘルプ」
  3. 「Settings から見た目を変更可能」
- スキップボタン + 「もう表示しない」設定 (config テーブルに `onboarding_complete` キー)
- 既存マイグレーション or runtime DEFAULT で対応

## 受け入れ条件

- [ ] OnboardingTour.svelte 新設 (3 ステップ、aria-modal)
- [ ] config に `onboarding_complete` キー追加 (runtime upsert で OK)
- [ ] cmd_get_onboarding_complete / cmd_set_onboarding_complete IPC
- [ ] +page.svelte で setup 完了直後にマウント
- [ ] OnboardingTour.test.ts 3 ケース (表示 / スキップ / 完了)
- [ ] `pnpm verify` 全通過
