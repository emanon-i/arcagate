# Release Readiness Criteria — G a11y + H i18n + I docs + J test

**Predecessor**: [criteria.md](./criteria.md)

## G. アクセシビリティ

### G1. Keyboard 全機能到達

- **Verification**: マウスを使わず Tab / Shift+Tab / Enter / Esc / 矢印 / Ctrl+F / Ctrl+A / F2 / F3 / Del / hotkey で **全主要操作** (item 起動 / 編集 / 削除 / search / sort / filter clear / view 切替 / settings 開閉) を完遂
- **Pass criteria**: 全主要操作 (10 件以上) が keyboard のみで実施可能、行き止まり (focus が consume されない場所) ≤ 0
- **Tooling**: 手動 keyboard 検収 + Tab order 視覚確認 + e2e (`tests/e2e/widget-zoom.spec.ts` 等の keyboard part)

### G2. Focus ring 視認性

- **Verification**: 全 interactive element (button / input / card / chip / select) の `:focus-visible` 状態を screenshot
- **Pass criteria**: focus-visible で 2px 以上の outline / ring が表示、color contrast ≥ 3:1 (WCAG AA UI components)
- **Tooling**: dev で Tab → screenshot、`scripts/audit-design-tokens.sh` 経由で `focus-visible:ring-2` 採用確認

### G3. Color contrast WCAG AA

- **Verification**: 主要 text (label / value / muted) の background-color と text-color のコントラスト比を計測
- **Pass criteria**: 14px 以上 ≥ 4.5:1、18px 以上 / Bold 14px 以上 ≥ 3:1 (ux_standards.md §3-1)。Industrial Yellow on dark / on light の主要組み合わせを **全チェック**
- **Tooling**: ax DevTools / Lighthouse accessibility audit、結果 score ≥ 95 を audit.md に貼る

### G4. aria-label / role 設定

- **Verification**: `bash scripts/audit-labels.sh` (icon 名 → 機能ベース label への置換) を実行
- **Pass criteria**: audit 0 violations (既存 lefthook で enforced)
- **Tooling**: 既存 audit script を CI で再実行

### G5. screen reader 対応 (基礎)

- **Verification**: NVDA / Narrator で起動 → 主要 panel が announce される
- **Pass criteria**: window title / 主要 button / dialog header / toast が announce される (深い対応は L4 配布以降の継続改善)
- **Tooling**: 手動 NVDA / Narrator + 録音、難しければ **未検証として明示** (release blocker でない、release notes 「screen reader 部分対応」明記)

## H. i18n

### H1. 日本語 UI 完成度

- **Verification**: 全画面の text を読んで「機械翻訳調」「未翻訳英語」が混じっていないか確認
- **Pass criteria**: 全 UI text が自然な日本語、英語残存なし (item_type / 拡張子等の固有名詞は除外)
- **Tooling**: `grep -rn -P "[a-zA-Z]{8,}" src/lib/components/ src/lib/widgets/ | grep -v "import\|class=\|aria-label=\"[a-zA-Z]"` で英語残存検出 (false positive 多いので目視併用)

### H2. 英語 UI 切替え

- **Verification**: `configStore.locale` (existence 不明) で en に切替え → 全 UI が英語表示
- **Pass criteria**: en locale **未対応で OK** だが現 phase では **N/A**、release notes で「日本語のみ」明記、L4 で多言語対応 を予告
- **Tooling**: `grep -rn "locale\|i18n\|formatMessage" src/lib/`、未対応なら N/A 判定

### H3. 日付 / 数値 formatter ローケール

- **Verification**: `formatShortDate` / `formatBytes` 等の existing formatter が `Intl.*` 経由 + `'ja'` 固定
- **Pass criteria**: `'ja'` 固定でも UI 表記が自然 (例: 「2026/05/04」 / 「1.5 KB」)、L4 で動的切替えする予告
- **Tooling**: `grep -rn "Intl\.\|toLocaleString\|toLocaleDateString" src/lib/utils/`

### H4. hard-code 文字列排除 (lint レベル)

- **Verification**: i18n key が無くても全 hard-code 文字列を 1 箇所に集約しているか (例: `src/lib/constants/labels.ts`)
- **Pass criteria**: 集約は **未対応で OK** (現 phase は日本語固定で問題なし)、L4 多言語化時に集約タスク発生
- **Tooling**: 確認のみ、N/A 判定

## I. ドキュメント

### I1. README

- **Verification**: `README.md` が存在し、1) 機能概要 / 2) install 手順 / 3) build 手順 / 4) license が記載
- **Pass criteria**: 上記 4 項目が記載 + screenshot 1 枚以上
- **Tooling**: `cat README.md` 確認、4 項目の有無を audit.md に PASS/FAIL で記載

### I2. install / setup ガイド

- **Verification**: 新規 user が installer を DL → install → 初回起動で hotkey 設定までの flow が doc 化されている
- **Pass criteria**: README に install 節 (MSI / NSIS どちらかの手順 + Defender warning 対処)
- **Tooling**: README 内の install 節を audit.md に貼る

### I3. CHANGELOG

- **Verification**: `CHANGELOG.md` が semver / Keep a Changelog 形式で更新されている
- **Pass criteria**: 直近 3 release 以上分の entries、各 entry に Added / Changed / Fixed が分類
- **Tooling**: `cat CHANGELOG.md` 確認、無ければ FAIL

### I4. known issues / support 経路

- **Verification**: 既知 issue 一覧 + バグ報告先 (GitHub Issues / Discord / email) が doc 化
- **Pass criteria**: README or `docs/SUPPORT.md` に support 経路、`docs/lessons.md` 既知 bug の summary
- **Tooling**: `grep -rn "Support\|Issue\|サポート" README.md docs/`

### I5. dev / contribute ガイド

- **Verification**: `CLAUDE.md` 相当の dev guide が公開可能な形であるか (CLAUDE.md は public、agent 向け critical-rules も含む)
- **Pass criteria**: 新規 contributor が `pnpm tauri dev` で開発開始できる手順、コーディング規約
- **Tooling**: `CLAUDE.md` の publication 可否確認 (sensitive 情報チェック)

## J. テスト

### J1. unit test カバレッジ (R5-1 実測ベース)

- **Verification**: `pnpm vitest run --coverage --coverage.reporter=text --coverage.include='src/lib/utils/**' --coverage.include='src/lib/state/**'` で scoped coverage 生成
- **Pass criteria**:
  1. `src/lib/utils/**` 全体 Lines ≥ 80%
  2. 「business-critical state stores」 (mutation + IPC + cache 含む) のうち **5 stores 以上で Lines ≥ 80%**
     - 候補: metadata / library-history / error-monitor / items / workspace / library-sort / help
- **理由**: DOM-coupled state (workspace / theme / zoom / palette / pointer-drag) は unit test 不適、e2e 担保が現実的。当面は **test-friendly stores の厚み** を評価対象に
- **Tooling**: `pnpm vitest run --coverage` 出力を `measurements/vitest-coverage.md` に記録。CI gate 化は R6 で `vitest.config.ts` に threshold 組込み検討

### J2. Rust unit test カバレッジ

- **Verification**: `cargo tarpaulin` (or `cargo-llvm-cov`) で coverage 生成
- **Pass criteria**: `src-tauri/src/services/` ≥ 70%、全体 ≥ 50%
- **Tooling**: `cargo tarpaulin --out Json`、結果 % を audit.md に記載

### J3. e2e カバレッジ (主要 flow)

- **Verification**: `tests/e2e/*.spec.ts` を実行、全 spec を pass
- **Pass criteria**: @smoke タグ全件 pass、@nightly は release 前に確認
- **Tooling**: `pnpm test:e2e`、結果を audit.md に貼る

### J4. regression scenarios 文書化

- **Verification**: `docs/lessons.md` の 「再発したら大事故」 entries を release blocker 化
- **Pass criteria**: lessons.md severity=critical / high の項目が **必ず regression test に対応する e2e or unit を持つ** (もしくは持っていないなら gap-list に列挙)
- **Tooling**: lessons.md cross-reference + test grep

### J5. 手動検証 checklist

- **Verification**: `docs/release-checklist.md` (新規作成) に release 前手動検証 checklist
- **Pass criteria**: 全主要 flow + a11y + i18n + perf の手動 checklist が doc 化、release ごとに ✅ チェック
- **Tooling**: 新規 doc 作成、本 release-readiness audit 結果から逆引き

### J6. CI gate 設定

- **Verification**: GitHub Actions で 1) verify 全段 / 2) e2e @smoke / 3) build artifact / 4) audit-* scripts が PR で必須 check
- **Pass criteria**: branch protection で main への merge に上記 check 全 pass を要求
- **Tooling**: `.github/workflows/*.yml` 確認、branch protection 設定確認 (`gh api repos/:owner/:repo/branches/main/protection`)
