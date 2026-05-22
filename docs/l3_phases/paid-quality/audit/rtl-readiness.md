# RTL (右から左) 対応レディネス調査

> **目的**: 将来の RTL (アラビア語 / ヘブライ語) layout 対応に向けた**事前調査のみ** (PH-PQ-700 T5)。
> 実装は本 phase スコープ外 — paid v1.x の任意 phase で実施。
> **手法**: sub-agent で `src` 配下を grep、 物理 / 論理プロパティ・方向性 icon・`dir` 設定を計数。
> **status**: 2026-05-22 (PH-PQ-700 T5)。

## 結論: RTL レディネスは低い (おおむね 10〜15%)

- 生 CSS の論理プロパティ採用: **0%** (物理 22 / 論理 0)。 ただし生 CSS の絶対数は少なく、
  layout の大半は Tailwind ユーティリティクラスで構成される。
- `<html dir>` を設定する機構が**未実装**、 `<html lang>` は `ja` ハードコード。
- bits-ui (shadcn-svelte) は内部で RTL を一部考慮するが、 アプリ独自コードはほぼ全面 LTR 前提。

## 1. CSS 物理 / 論理プロパティ

| 区分                                                    | 件数                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 物理プロパティ (生 CSS / inline style)                  | 22 件 / 5 file (`ContextMenu` `OnboardingTour` `WorkspaceGrid` `WorkspaceLayout` `widget-zoom.svelte.ts`) |
| 論理プロパティ (`*-inline-*` / `text-align:start\|end`) | 0 件                                                                                                      |

**注意**: 本計数は生 CSS のみ。 Arcagate の layout はほぼ Tailwind クラス (`ml-` `pr-` `left-`
`text-left` `rounded-l-*` `border-l` 等) で組まれ、 **RTL の主戦場は Tailwind 物理ユーティリティ**側に
ある。 Tailwind v4 は論理ユーティリティ (`ms-` `me-` `ps-` `pe-` `text-start` `inset-inline`) を
標準サポートし、 `dropdown-menu-sub-trigger.svelte` で `ms-auto` の採用実績が 1 件確認できた。

## 2. 方向性 icon (RTL でミラー必須)

| 機械的に移行可能 | `ArrowRight` (OnboardingTour 次へ) / `ChevronRight` (sub-menu / list / 折りたたみ) — `transform:scaleX(-1)` か icon 入替で対応 |
| 要再設計 | `PanelLeftClose` / `PanelLeftOpen` (WorkspaceSidebar / WorkspaceLayout) — icon 名に物理方向が埋まり、 サイドバー位置自体の論理化が必要 |
| 影響なし | `ArrowUp` / `ArrowDown` (sort 昇降) — 上下は RTL 非依存 |

## 3. `dir` / `lang`

- `src/app.html`: `<html lang="ja">` 固定、 `dir` 属性は未設定 (暗黙 LTR)。
- locale 切替 (`+layout.svelte` / `i18n.svelte.ts`) はあるが `document.documentElement.dir` /
  `lang` を更新する処理は**存在しない**。

## 4. 移行分類

### 機械的に移行可能 (mechanical)

- 方向性 icon の `transform:scaleX(-1)` ミラー / icon 入替。
- `in:fly` アニメの `x` 符号反転 (`OnboardingTour` / `ToastContainer`)。
- Tailwind 物理ユーティリティ → 論理ユーティリティの一括置換 (件数多いが機械的、 Tailwind v4 標準)。
- `WorkspaceGrid.svelte` の `padding-left` inline style → `padding-inline-start`。

### 移行不能 / 要再設計 (needs redesign)

- `app.html` の `lang="ja"` 固定 + `<html dir>` 動的更新機構の新設 (`i18n.svelte.ts` 改修)。 **RTL の土台**。
- フローティング UI の座標計算 (`OnboardingTour` / `ContextMenu` / `WorkspaceLayout` のドラッグゴースト)
  — `rect.left` / `clientX` 原点固定の算出を論理座標系へ書き換え。
- `scrollLeft` / `scrollTo({left})` 依存 (`widget-zoom.svelte.ts` / `WorkspaceGrid` 計 10 箇所)
  — RTL で `scrollLeft` の符号・原点が変わるため Workspace キャンバスのスクロール初期化を全面再検証。
- サイドバー固定 layout (`WorkspaceSidebar` / `WorkspaceLayout`) — 物理「左」固定、 RTL は右配置が慣例。
- `ContextMenu` / `OnboardingTour` の画面端クランプロジック (右端基準)。

## 5. 推奨着手順 (paid v1.x で実装する場合)

1. `app.html` + `i18n.svelte.ts` で `<html dir>` 動的化 (土台)。
2. Tailwind 物理 → 論理ユーティリティの一括置換 (最大ボリュームだが機械的)。
3. 方向性 icon のミラーリング。
4. フローティング UI 座標系・Workspace スクロールの再設計 (最難所、 要個別検証)。

→ RTL は **paid v1 では完了不要** (PH-PQ-700 「やらないこと」)。 本 doc を着手時の起点とする。
