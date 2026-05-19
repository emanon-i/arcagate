# Setup Wizard / Onboarding

> Functional Spec。機能契約のみ記載。詳細な機能カタログは [`../../screens/onboarding.md`](../../screens/onboarding.md)。

## 目的

初回起動時のみ表示する 3 step ウィザード。即座に使える状態へ最短到達させる。

## やること (必要処理)

- `cmd_is_setup_complete` が false の時のみ z-50 overlay で表示
- step 1: ホットキー設定 (default `Ctrl+Shift+Space`、recording mode で変更可)
- step 2: Windows autostart toggle (default ON)
- step 3: 完了 → `cmd_mark_setup_complete` → wizard close → Library 表示
- 完了後に OnboardingTour (Library tour) を別 component で表示、dismiss 可

## やらないこと (禁止 / scope 外)

- 高度な多画面 onboarding tour を wizard に含めない (OnboardingTour で別管理)
- account 作成 / cloud login をしない (local 完結)
- 使い方ガイドの PDF / video embed をしない
- 初回以外で表示しない (DB reset 時のみ再表示)
- step を 3 個から増やさない (毎日使えるかの観点で最小構成)

## 性能予算

- 起動 latency に上乗せしない (表示判定は config 1 read のみ)

## 副作用 (state 変化 / persistence)

- `config` テーブルの `setup_complete` key を true に永続化
- step 1/2 で hotkey / autostart 設定を即保存 (backend)
- onboarding tour 完了 flag (`cmd_mark_onboarding_complete`)

## 依存

- IPC: `cmd_is_setup_complete` / `cmd_mark_setup_complete` / `cmd_mark_onboarding_complete` / `cmd_set_hotkey` / `cmd_set_autostart`
- backend: [Config Service](../backend/config-service.md)
- 依存される: なし (起動時 overlay)

## 既知の判断

- 表示判定は DB の `setup_complete` key。`%APPDATA%\com.arcagate.desktop\` を wipe すると再表示
