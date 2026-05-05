# axe-core a11y baseline (R8-2 G3 WCAG numeric、R10-B で Phase 2 gate ON)

`audit-final-r7.md` で **G3 WCAG numeric** が部分的だった件を、Playwright + `@axe-core/playwright` で
nightly 自動計測する仕組みを R8-2 で確立。

## 計測対象画面

| 画面          | 経路                          |
| ------------- | ----------------------------- |
| **Library**   | サイドバー「Library」ボタン   |
| **Workspace** | サイドバー「Workspace」ボタン |
| **Settings**  | サイドバー「設定」ボタン      |
| **Palette**   | `Ctrl+Shift+Space`            |

## WCAG タグ

`wcag2a` / `wcag2aa` / `wcag21a` / `wcag21aa` の rule set を有効化。
target Level = **WCAG 2.1 Level AA** (G3 criteria 上の Level)。

## Gate 戦略 (段階的 squeeze)

| Phase            | gate 条件                                    | 状態                                                             |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| **1 (R8-2)**     | informational のみ (warning log + JSON 出力) | 完了                                                             |
| **2 (R10-B 本)** | **critical = 0 hard gate** (default ON)      | **本 PR で切替**                                                 |
| **3 (将来)**     | critical + serious = 0                       | `ARCAGATE_AXE_GATE_STRICT=1` で opt-in、CI 既定化で Phase 3 完了 |
| **4 (G3 PASS)**  | moderate/minor も threshold                  | audit-final で G3 PASS 化                                        |

R10-B Phase 2 移行のため事前 fix:

- `app.html` lang `en` → `ja` (UI が JP 固定なので valid-lang)
- `LibraryMainArea.svelte` `<main>` → `<section role="region" aria-label="ライブラリ">` (外側 +page.svelte に既に main があり nested main は axe critical)

## 実行方法

| 場面         | コマンド                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| 開発 (local) | `pnpm test:e2e:smoke` のついでに `a11y-axe.spec.ts` も走る (`@a11y` tag) |
| PR CI        | `pnpm test:e2e` の中で実行、informational pass                           |
| nightly CI   | `e2e-nightly.yml` の通常 E2E suite 実行 → artifact 30 日保持             |
| 結果確認     | artifact `axe-violations-nightly` (30 日)                                |
| Gate ON      | env `ARCAGATE_AXE_GATE=1` を設定して `pnpm test:e2e`                     |

## 出力

`docs/l1_requirements/release-readiness/measurements/axe-violations.json`

```jsonc
{
  "measured_at": "2026-05-05T...",
  "summaries": [
    {
      "url": "Library",
      "totalViolations": 3,
      "byImpact": { "critical": 0, "serious": 1, "moderate": 2, "minor": 0 },
      "violations": [
        { "id": "color-contrast", "impact": "serious", "help": "...", "nodes": 4 }
      ]
    }
  ]
}
```

## 設計判断

### shadcn-svelte (`src/lib/components/ui/`) の既存違反

`CLAUDE.md` で手動編集禁止 (scaffold)。違反検出された場合は upstream への報告 / wrapper 側の対応で
回避する。`src/lib/components/ui/` 内部 violations は audit から除外できないため、件数に含まれる。

### Phase 1 で gate しない理由

axe ルール (color-contrast / nested-interactive / aria-* 等) は実装と密結合のため、
事前に baseline を取らずに hard gate にすると現存違反で CI が即座に詰まる。
R7-4 i18n baseline と同じ「測定 → 修正 → gate 化」の段階方針。

## 次の改善 (R9+ 候補)

- baseline JSON を git 管理し、`pnpm test:e2e:axe-diff` で前回比 regression 検出
- 画面別の violation history graph (markdown table 自動生成)
