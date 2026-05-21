---
id: PH-PQ-300
status: planning
batch: paid-quality
type: 改善
era: Polish
parent: README.md
---

# PH-PQ-300: 仕上げ — 全画面 fresh-eye craft sweep + WCAG 2.2 AA 本気対応

## 問題

直近 30 commit のうち **fix 17 件** (Codex 値踏み実測) は、 product が「polish フェーズの真ん中」 に居ることを示す典型。 既往 craft fix は局所 reactive、 「**全画面を fresh な目で 1 回通す**」 sweep がされていない。

paid product と無料 launcher の最大の差は「**通しで触っても綻びが見えない**」 = craft の総量。 機能数ではなく「全画面が同じトーン」 「すべてに loading / empty / error 状態がある」 「キーボードだけで完結する」 「screen reader でも使える」 ことの総和。

### craft の数値ベンチ (vision.md ⇄ 実装)

| 軸                     | release-criteria 目標                     | 現状 (fact 確認)                                     | gap                                              |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| EmptyState 適用        | B5 「全画面で EmptyState 共通 component」 | 27 件適用済 (claim)                                  | spot check 必要                                  |
| design-tokens hardcode | B3 audit 0 violations                     | `scripts/audit-design-tokens.sh` 0 violation (claim) | 全画面 sweep 未                                  |
| hotkey 一貫性          | B2 全 widget で keyboard a11y             | 75% (Esc/Enter/Ctrl+Z ◎、 ↑↓ ad-hoc)                 | 残 25% sweep 必要                                |
| WCAG AA                | G3 contrast / G4 aria-label               | 90% (axe Phase 2 gate ON、 claim)                    | **自動 axe 検証が tests 内 0 件、 検証手段なし** |
| keyboard 完走          | G1 全主要 10 件 keyboard のみ             | 検証手段なし                                         | manual checklist 未作成                          |
| screen reader          | G5 NVDA / Narrator                        | 「将来 phase」 と寄せている                          | 実機検証なし                                     |

aria 属性は付いているが (`grep -c aria-` で fact 確認: ExeFolderWatchWidget 11 / WidgetHandles 10 / Settings 7 / ...)、 **axe 等の自動検証で「規格 pass」 と言い切れない**。 ここが paid product の足切り条件 (EAA / Section 508 / ADA / 日本のアクセシビリティ努力義務)。

### Web 業界基準 (2025-2026)

- WCAG 2.2 は 2023-10 リリース、 **2025 年から ADA / Section 508 / EAA の事実上の標準** ([AllAccessible WCAG 2.2 Guide](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025) / [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/))
- 新規 criteria 2.4.11 Focus Appearance (AA) は **3:1 contrast + 最小面積** の数値要件 ([TestParty 2.4.11 Guide](https://testparty.ai/blog/wcag-focus-appearance-minimum))
- Slack 等大手は `@axe-core` を CI に組み込み regression を gate ([Slack Engineering Automated A11y](https://slack.engineering/automated-accessibility-testing-at-slack/))
- axe-core は WCAG issue の **57% を自動検出** (Deque 公式) — manual review 不要にはならないが「最初の防壁」 として有効

## スコープ

1. **全画面 craft audit checklist** (5 screen × 17 widget × N 観測軸 = 観測点リスト)
2. **EmptyState / LoadingState / ErrorState の 3 軸統一 sweep**
3. **アニメーション / 余白 / 文言 / hotkey の一貫性 sweep**
4. **WCAG 2.2 AA への準拠**: `@axe-core/playwright` を CI 統合、 違反 0 を gate
5. **完全キーボード経路の verify**: manual checklist + e2e (keyboard 操作のみで主要 10 件完走)
6. **screen reader 動作確認**: NVDA + Windows Narrator で主要 flow を agent dev 実機検証

## やらないこと

- WCAG AAA (font sub-pixel / contrast 7:1) は範囲外、 AA で止める
- 多言語キーボード layout (US / JIS 以外) 対応は別 phase
- visual redesign / Industrial Yellow 系の色路線変更 (撤回確定済、 `memory/feedback_industrial_yellow_revoked.md`)
- 既存 design tokens の再定義 (使い方の見直しのみ、 token 体系自体は触らない)

## 具体タスク

### T1. 全画面 craft audit checklist

`docs/l3_phases/paid-quality/audit/craft-checklist.md` を新規作成 (本 plan の sub-doc)。 5 screen × 17 widget = **85 観測点** にそれぞれ:

| 軸 (各観測点で評価)     | 評価方法                                   |
| ----------------------- | ------------------------------------------ |
| EmptyState 適用         | 空状態を意図的に作って screenshot          |
| LoadingState 適用       | slow network 模擬で screenshot             |
| ErrorState 適用         | IPC error 模擬で screenshot                |
| アニメーション duration | `--ag-motion-*` token 適用率               |
| 余白                    | `--ag-spacing-*` token 適用率              |
| 文言                    | label-content rule (`label-audit.sh`) pass |
| hotkey 一貫性           | Esc / Enter / ↑↓ / Tab / Ctrl+Z            |
| focus visible           | 2px outline + 3:1 contrast (WCAG 2.4.11)   |
| aria-label              | audit-labels.sh pass                       |
| color contrast          | axe-core で 4.5:1 (text) / 3:1 (UI)        |

評価は agent dev (CDP attach) で 1 観測点 5 分 × 85 = ~7 時間。 sub-agent 並列化で実 1.5 時間に圧縮可。

### T2. EmptyState / LoadingState / ErrorState 統一 sweep

既存共通 component (foundation 既存):

- `src/lib/components/common/EmptyState.svelte` (existing)
- LoadingState / ErrorState は共通 component の存在を fact 確認 (検索)

各 screen / widget で:

1. **EmptyState**: data が無い時に必ず EmptyState を使う。 ad-hoc 「何もありません」 div を全廃
2. **LoadingState**: IPC 待ち中に skeleton or spinner 統一、 ad-hoc `loading...` 文字列を全廃
3. **ErrorState**: IPC error 時に必ず ErrorState component を使う、 toast だけで終わらせない

実行は audit 結果 (T1) を元に file:line リストを抽出 → 各 file edit。

### T3. アニメーション / 余白 / hotkey 一貫性 sweep

- **アニメーション**: `--ag-motion-duration-*` / `--ag-motion-easing-*` token (foundation §design-tokens) のみ使用。 hardcode `transition: 0.3s` 等を grep して撲滅
- **余白**: `--ag-spacing-*` token のみ。 hardcode `px-3 py-2` の Tailwind 直書きを semantic class へ移行 (許容 list 化、 ad-hoc 数値は 5 件以下 allow)
- **hotkey**: 「↑↓ ad-hoc 残」 (値踏みレポート指摘) を全件 fix:
  - LibraryView / WorkspaceLayout / FileSearch / PaletteResultRow の ↑↓ ハンドリング統一
  - `audit-hotkey-consistency.sh` (`scripts/` 既存) を全画面適用
- **文言**: label-content rule (CLAUDE.md `<critical-rule id="label-content">`) で 「アイコン名」 を「機能 + 状態」 へ。 既存 audit script `audit-labels.sh` を全 component 適用

### T4. `@axe-core/playwright` 統合 (WCAG 2.2 AA)

新規 依存: `@axe-core/playwright` (npm install)

新規 spec: `tests/e2e/a11y.spec.ts` (新規 file)

各 screen で:

```ts
import AxeBuilder from '@axe-core/playwright';

test('Library screen WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/library');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

対象 screen:

- Library (空 / 100 item / 1000 item の 3 state)
- Workspace (空 / 1 widget / template 適用後の 3 state)
- Palette (open / typing / empty result の 3 state)
- Settings (各 pane × 6)
- SetupWizard (各 step × 5)

= **計 17 spec**。 既存 spec 群 (10 件) と並列、 e2e workflow に統合。

axe-core の `wcag22aa` tag は WCAG 2.2 AA を含む (axe-core 4.10+)。 違反は file:line 単位で詳細レポート、 CI で 0 violations を gate。

[参考実装パターン: DEV Community Axe audit](https://dev.to/jacobandrewsky/accessibility-audits-with-playwright-axe-and-github-actions-2504)

### T5. WCAG 2.4.11 Focus Appearance (新規 criteria)

WCAG 2.2 で新規追加された 「Focus Appearance Minimum (AA)」 要件:

- focus indicator は **3:1 contrast** vs adjacent colors
- focus indicator は **2px 以上の area** (minimum) または 1px solid + 2px shadow
- focus indicator は要素の外周をすべて囲む (部分囲み NG)

実装 sweep:

- `src/app.css` の `:focus-visible` 共通 style を 2px outline + 適切な offset へ
- shadcn-svelte 既定 (`src/lib/components/ui/`) の focus ring を全て確認
- 全 component で `:focus-visible` を上書きしているところを grep → 統一
- axe-core (T4) で自動検証

### T6. 完全キーボード経路 verify

`docs/l3_phases/paid-quality/audit/keyboard-path-checklist.md` を新規作成。 主要 flow を keyboard のみで完走できることを agent dev で実測:

| Flow                                 | 起点             | 終点              | keyboard 経路                     |
| ------------------------------------ | ---------------- | ----------------- | --------------------------------- |
| F1. Palette → 検索 → launch          | Ctrl+Shift+Space | item launch       | hotkey → type → Enter             |
| F2. Library item 追加 (URL)          | Ctrl+L → new     | Library に表示    | hotkey → 'n' → fill → Tab → Enter |
| F3. Library item 削除 + undo         | item focus       | undone toast 確認 | ↓→Delete→Ctrl+Z                   |
| F4. Workspace 切替                   | hotkey           | grid 表示         | Ctrl+1, Ctrl+2, ...               |
| F5. Workspace widget 追加            | + button         | widget mount      | hotkey → 'a' → ↓→ Enter           |
| F6. Settings 開閉 + 全 pane navigate | Ctrl+,           | reload で永続化   | Tab で全 input 到達確認           |
| F7. SetupWizard 完走                 | 初回起動         | tour 完了         | 全 step Tab + Enter               |
| F8. Palette: arrow nav + Enter       | open             | launch            | ↑↓ で result 移動                 |
| F9. Library 大量選択 (Shift)         | first item       | bulk action       | Space で選択 → Shift+↓→Delete     |
| F10. Workspace zoom Reset/Fit        | grid focus       | zoom level 確認   | Ctrl+0 / Ctrl+9                   |

各 flow を e2e spec で機械 verify: `tests/e2e/keyboard-paths.spec.ts` 新規。

### T7. screen reader 実機検証 (NVDA / Narrator)

paid product としては SR 「**主要 flow が読まれる**」 の最低水準 (`vision.md` G5)。

agent dev (Windows 11 Pro 11.0) + NVDA (open source) + Windows Narrator (built-in) で:

- 起動時に「Arcagate アプリ、 メインウィンドウ」 が announce される
- Palette 開閉が role="dialog" + aria-label で announce される
- Library card に focus すると「<label> アイテム、 タイプ <type>」 が announce される
- Workspace widget が「<type> widget」 として announce される
- Toast が `role="status"` または `role="alert"` で announce される
- Settings 各 input が label associated で announce される

agent が CDP 経由で screen reader audio をテスト不可なので、 観察記録は agent dev manual checklist + screen capture (画面録画でなく a11y tree screenshot)。 違反は WAI-ARIA Authoring Practices ([W3C ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)) の patterns に合わせて修正。

検証は `docs/l3_phases/paid-quality/audit/screen-reader-checklist.md` に記録。

## 受け入れ条件

- [ ] T1 craft-checklist.md に 85 観測点を記入、 各観測点が pass / fail / fix-PR 紐付き
- [ ] T2-T3 sweep 後、 既存 audit script 全件 0 violations 維持 (`audit-design-tokens.sh` / `audit-labels.sh` / `audit-hotkey-consistency.sh` / `audit-text-overflow.sh` / `audit-i18n-hardcode.sh` / `audit-keyboard-traps.sh` 等)
- [ ] T4 axe spec 17 件すべて violations 0、 CI gate で違反 = fail
- [ ] T5 focus-visible が `:focus-visible` 適用 100% で 3:1 contrast + 2px area
- [ ] T6 keyboard-paths.spec.ts 10 flow すべて pass
- [ ] T7 screen-reader-checklist.md に NVDA + Narrator 双方の announce 記録、 違反 0
- [ ] `pnpm verify` 全段 pass、 nightly soak (PQ-100 T5) も pass 継続

## 工数感

| Task                                   | 工数         | 依存        |
| -------------------------------------- | ------------ | ----------- |
| T1 craft audit checklist (85 観測点)   | 1 週間       | PQ-100 完了 |
| T2 EmptyState/Loading/Error sweep      | 3-4 日       | T1          |
| T3 animation/spacing/hotkey/文言 sweep | 4-5 日       | T1          |
| T4 axe-core 17 spec                    | 3-4 日       | — (並行可)  |
| T5 focus appearance sweep              | 1-2 日       | T4          |
| T6 keyboard-paths.spec 10 flow         | 2-3 日       | T3 完了後   |
| T7 SR 実機検証                         | 2-3 日       | T6 完了後   |
| 合計                                   | **3-4 週間** |             |

## 依存・着手順

1. **先行**: PQ-100 (panic 駆逐) — panic-clean な base で craft sweep
2. **並行可**: PQ-700 i18n (i18n の sweep と craft の文言 sweep は overlap、 同時に走らせると 1.5 倍速)
3. **後続**: PQ-400 速さ phase で virtualization 導入時に再度 axe spec 走らせる (regression なきこと)

## 横展開チェック

- `_template/use-case-audit.md` (HE + CW 雛形) を 85 観測点の 5 件以上に適用、 既存テンプレが現状でも有効か確認 → 不適合あれば template 改訂
- a11y CI gate が 「PR で違反 = block」 を保証 (process 化、 PQ-300 完了後の regression 防止)
- T7 SR 検証は **海外 paid market 必須**、 ja-only release では skip 可だが EN release (PQ-700) 必須

## 参照

- WCAG 2.2: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) / [AllAccessible Complete Guide 2025](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025) / [AudioEye WCAG 2.2 Explained](https://www.audioeye.com/post/wcag-22/)
- Focus Appearance: [TestParty 2.4.11 Guide](https://testparty.ai/blog/wcag-focus-appearance-minimum) / [TestParty 2.4.7 Focus Visible](https://testparty.ai/blog/wcag-2-4-7-focus-visible-2025-guide)
- Keyboard a11y: [TestParty Keyboard A11y Complete WCAG Guide](https://testparty.ai/blog/keyboard-accessibility-guide) / [UXPin WCAG 2.1.1 Keyboard](https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/)
- axe-core CI: [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) / [Slack Automated A11y](https://slack.engineering/automated-accessibility-testing-at-slack/) / [DEV Community A11y audits](https://dev.to/jacobandrewsky/accessibility-audits-with-playwright-axe-and-github-actions-2504)
- WAI-ARIA Authoring Practices: [W3C ARIA APG](https://www.w3.org/WAI/ARIA/apg/)
- 既存 audit script: `scripts/audit-*.sh` (17 種、 fact 確認済)
- 値踏み: [PRODUCT_VALUATION §3 craft polish gap](../../../.claude/worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md) / [Codex §3 §7](../../../.claude/worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md)
