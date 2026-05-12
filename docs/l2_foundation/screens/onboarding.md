# Onboarding (セットアップウィザード)

初回起動時のみ表示する 3 step ウィザード。 即座に使える状態に到達させる。

route: `+page.svelte` 内で SetupWizard overlay (z-50 fixed)

---

## 何があるか

| 要素            | 内容                                |
| --------------- | ----------------------------------- |
| Step indicator  | 1/3 / 2/3 / 3/3 progress bar        |
| Step content    | 各 step の入力 UI                   |
| 「次へ」 button | step 進行、 最後の step は 「完了」 |

実装場所:

- `src/lib/components/setup/SetupWizard.svelte` (root、 z-50 overlay)
- `OnboardingTour.svelte` (完了後の library tour、 dismiss 可)

---

## Step フロー

### Step 1: ホットキーを設定

- 入力欄に default `Ctrl+Shift+Space`
- 「変更」 button で recording mode (キー押下で書き換え)
- 「次へ」 で step 2

### Step 2: 自動起動

- Windows 起動時に Arcagate を auto-start する toggle (default ON)
- 「次へ」 で step 3

### Step 3: 完了

- 「セットアップ完了」 message
- 「完了」 button で `cmd_mark_setup_complete` IPC → SetupWizard close → Library tab 表示

---

## 表示条件

- `cmd_is_setup_complete` が `false` の時のみ表示 (DB config table の `setup_complete` key)
- 完了後は `setup_complete=true` が DB に永続化、 次回起動時は表示しない
- DB reset (`%APPDATA%\com.arcagate.desktop\` wipe) で再表示

---

## こうあってほしい (L0 抜粋)

- 初回起動時のみ表示、 シンプルに
- ホットキー確認 → 自動起動 → 完了 の 3 step

---

## 関連 IPC

| command                   | 用途                              |
| ------------------------- | --------------------------------- |
| `cmd_is_setup_complete`   | wizard 表示判定                   |
| `cmd_mark_setup_complete` | wizard 完了で setup_complete=true |
| `cmd_set_hotkey`          | step 1 で hotkey 保存             |
| `cmd_set_autostart`       | step 2 で autostart 保存          |

---

## 制約 / Non-goals

- 高度な onboarding tour (Library tour / Workspace tour) は OnboardingTour で別 component、 dismiss 可
- account 作成や cloud login なし (local 完結)
- 「使い方ガイド」 PDF / video 等の embed なし
