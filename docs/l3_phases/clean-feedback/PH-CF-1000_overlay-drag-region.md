---
id: PH-CF-1000
status: planning
batch: clean-feedback
type: バグ修正
era: Distribution Hardening
parent: README.md
---

# PH-CF-1000: オーバーレイの window drag region 横展開

## 元 user fb (検収項目)

- **B1**: 初回ウィザード中にウィンドウを移動できない → 移動可能に

## 問題

初回ウィザード (SetupWizard) を表示中、 ウィンドウをドラッグ移動できない。 調査の結果、 これは SetupWizard 単体の問題ではなく **`fixed inset-0` フルスクリーンオーバーレイが TitleBar の drag region を覆う** 共通パターンの一例。 SetupWizard は起動直後に必ず出るため最も目立つだけで、 同型のオーバーレイ全てで window を掴めない。

## 引用元 guideline doc

| Doc                                                 | Section                              | 採用判断への寄与                |
| --------------------------------------------------- | ------------------------------------ | ------------------------------- |
| `docs/l2_foundation/features/screens/onboarding.md` | SetupWizard                          | ウィザードの window 操作        |
| `docs/l0_ideas/motivation.md`                       | 利用形態                             | window 移動は OS アプリの最低線 |
| `CLAUDE.md`                                         | `<critical-rule id="lateral-sweep">` | 1 オーバーレイで終わらせず全件  |

## Fact 確認 (root cause)

ドラッグ可能領域 (`data-tauri-drag-region`) は `TitleBar.svelte:45-46, 58, 64` の `<header>` とその spacer div にのみ存在。

SetupWizard は `+page.svelte:392` で配置されるが、 メインレイアウト (`+page.svelte:463` の `<div class="flex h-screen flex-col">`、 TitleBar を含む) より DOM 上で前にある独立オーバーレイ。

`SetupWizard.svelte:22`:

```
<div data-testid="setup-wizard" class="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--scrim)]">
```

→ この `fixed inset-0 z-[60]` のフルスクリーンオーバーレイが TitleBar (`h-10` header、 z-index 指定なし = auto) を **完全に覆い隠す**。 オーバーレイにもウィザードカード (`SetupWizard.svelte:23`) にも `data-tauri-drag-region` が無い。 ウィザード表示中は drag region がスクリーン上のどこにも露出せず、 window を掴めない (TitleBar が消えるのではなく、 覆われて到達不能)。

### 横展開先 (同型オーバーレイ)

同じ「`fixed inset-0` で TitleBar を覆う」 パターン:

- `OnboardingTour` (`+page.svelte:393`)
- `HelpPanel` (`+page.svelte:394`)
- Settings ダイアログ (`+page.svelte:419-447`、 `fixed inset-0 z-50`)
- `ItemFormDialog` / `ThreeOptionDialog` / D&D オーバーレイ (`+page.svelte:453` 付近)

これらの表示中も同様に window を掴めない。

## スコープ

- SetupWizard を表示中も window をドラッグ移動できるようにする
- 同型の全フルスクリーンオーバーレイに横展開
- 再発を防ぐ audit script を追加

## やらないこと

- TitleBar 自体の再設計
- オーバーレイのモーダル挙動 (scrim / focus trap 等) の変更

## 具体タスク

1. **方式の決定**: 2 案から選ぶ —
   - 案 A: 各オーバーレイのヘッダー帯に `data-tauri-drag-region` 付きの細い領域を設ける (TitleBar と同方式)。 ボタン類には drag region を付けない
   - 案 B: TitleBar の z-index をオーバーレイより上に上げて常時露出させ、 オーバーレイが TitleBar 領域を avoid する
   - 推奨は **案 A** (オーバーレイごとに完結、 副作用が小さい)
2. **SetupWizard 修正**: `SetupWizard.svelte:23` のカード上部、 ステップインジケーター (`:25`) の上に `data-tauri-drag-region` 付きヘッダー帯を追加。 `-webkit-app-region` でなく Tauri の `data-tauri-drag-region` 属性で TitleBar と統一
3. **横展開**: OnboardingTour / HelpPanel / Settings ダイアログ / ItemFormDialog / ThreeOptionDialog に同じヘッダー drag region を適用
4. **audit script**: `fixed inset-0` のフルスクリーンオーバーレイコンポーネントが `data-tauri-drag-region` を含むことを検出する script を新設

## 受け入れ条件 (機械検出)

- [ ] e2e / 手動: SetupWizard 表示中にウィザードヘッダーをドラッグ → window が移動する
- [ ] e2e / 手動: OnboardingTour / HelpPanel / Settings ダイアログ表示中も window を移動できる
- [ ] audit script: `fixed inset-0` を持つオーバーレイコンポーネントに `data-tauri-drag-region` が存在する (0 violations)
- [ ] ボタン / インタラクティブ要素に `data-tauri-drag-region` が付いていない (誤って drag region がボタンを覆っていない)

## 機能契約の追記

`features/screens/onboarding.md` および `features/cross-cutting/` (新規 or `ipc-bridge.md` 付近):

> **オーバーレイ window 操作契約**: `fixed inset-0` のフルスクリーンオーバーレイ (SetupWizard / OnboardingTour / HelpPanel / Settings / Dialog 等) は、 表示中も window をドラッグ移動できるよう `data-tauri-drag-region` 付きのヘッダー領域を持つ。 drag region はヘッダー帯に限定し、 ボタン等のインタラクティブ要素には付けない。

機械検出: 上記 audit script を CI に追加し 0 violations を要求。

## 横展開

- §Fact 確認 の横展開先 5 種すべてに適用 (1 オーバーレイで終わらせない)
- 今後追加するフルスクリーンオーバーレイが audit script で自動的に検出される

## 工数感

| Task                      | 工数   |
| ------------------------- | ------ |
| SetupWizard 修正          | 0.5 日 |
| 横展開 (4-5 オーバーレイ) | 1 日   |
| audit script              | 0.5 日 |
| test / 実機確認           | 0.5 日 |

合計: 約 2-3 日。

## 依存・着手順

- **先行**: なし
- **後続**: なし

## 参照

- `src/lib/components/setup/SetupWizard.svelte:22-25`
- `src/lib/components/arcagate/common/TitleBar.svelte:45-46, 58, 64`
- `src/routes/+page.svelte:392-394, 419-447, 453, 463`
  </content>
