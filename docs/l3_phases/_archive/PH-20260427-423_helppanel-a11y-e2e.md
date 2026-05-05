---
id: PH-20260427-423
status: done
batch: 93
type: 防衛
era: UX Audit Re-Validation Round 2
---

# PH-423: HelpPanel focus trap + e2e 原因別文言検証

## 問題

batch-92 Codex Rule C 再 review:

- **Q5 #7**: HelpPanel に focus trap と初期フォーカス復帰が無い (a11y 不備)
  - 開いてもキーボードフォーカスが背景要素に残る
  - Esc / 閉じた時に開いた要素に戻らない
  - WCAG 2.4.3 (Focus Order) 違反候補
- **Q5 #8**: e2e がトースト「表示有無」だけで「原因別文言」を検証していない
  - launch エラー文言が「ファイルが見つかりません」と出るかは確認なし
  - 文言変更時に regression が見つけにくい

## 改修

### HelpPanel a11y (Q5 #7)

`src/lib/components/help/HelpPanel.svelte`:

1. **初期フォーカス**: 開いた瞬間、close ボタンに `focus()`
2. **focus trap**: Tab / Shift+Tab で panel 内のフォーカス可能要素を循環
   - 候補ライブラリ: 自前実装 (依存予算節約) — `tabindex` で取得 + first / last 検出
3. **閉じた時のフォーカス復帰**: helpStore.open() 時に `previousActiveElement` を保存、close() 時に `.focus()`
4. **aria-modal="true"** (既存) + tabindex="-1" でフォーカス可能 (既存)
5. **HelpPanel.test.ts 追加ケース**: 初期フォーカス / Tab 循環 / 閉じた後の復帰

### e2e 原因別文言検証 (Q5 #8)

`tests/e2e/launch-error.spec.ts` (新設):

1. **launch 失敗 (path 不在) → 「ファイルが見つかりません」文言検証**
   - DB に存在しない path を持つ item を CDP 経由で create
   - launchItem 呼び出し
   - toast に 「が見つかりません」「パスが移動 / 削除」が含まれること
2. **launch 失敗 (拡張子なし) → 「実行可能ファイルではありません」文言検証**
3. **HelpPanel 開閉 + Esc → focus 復帰検証**

## 解決理屈

- Codex Q5 #7 #8 の同時解消、a11y は配布水準 (engineering-principles §9 H10/WCAG) 必須
- e2e で文言を assert すると将来 i18n 化時に翻訳漏れも検出可能
- HelpPanel の focus trap は WCAG 2.4 + Nielsen H3 (User control) の前提

## メリット

- WCAG 2.4.3 (Focus Order) 準拠
- 文言変更時の regression を CI で検出
- 将来 i18n 化への土台

## デメリット

- e2e launch error テスト = CDP 経由 item create が必要 (cmd_create_item) → 既存パターン流用可
- focus trap 自前実装はエッジケース複雑 (隠れた要素 / shadow DOM)、最小実装に留める

## 受け入れ条件

- [ ] HelpPanel に初期フォーカス (close ボタン) + 開く前の active 要素を保存 → 閉じた時復帰
- [ ] focus trap (Tab / Shift+Tab で panel 内循環) 自前実装
- [ ] HelpPanel.test.ts に a11y ケース 3 件追加
- [ ] tests/e2e/launch-error.spec.ts 新設、原因別文言検証 2 ケース + HelpPanel focus 復帰 1 ケース
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **U**ser expectations (アクセシビリティ): WCAG 2.4 / Nielsen H3
- **F**unction (機能): launch エラー UX の regression 防止
- **O**perations (運用): a11y 自動検証

参照: Codex review-batch-92.md Q5 #7 / #8 / WCAG 2.4.3
