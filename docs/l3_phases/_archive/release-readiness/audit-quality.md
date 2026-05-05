# Release Readiness Audit — G a11y + H i18n + I docs + J test

**Predecessor**: [audit.md](./audit.md)

## G. アクセシビリティ

### G1. Keyboard 全機能到達 — **部分的**

- **根拠**: L2-B PR #286 で grid 矢印 / Enter / Esc / Space / Home/End / F3 / Delete / Ctrl+A / Ctrl+F / type-to-jump / `/` focus search を実装 (`src/lib/utils/grid-keyboard.ts` + `LibraryMainArea.svelte`)。Ctrl+Shift+Space global hotkey は CLAUDE.md 仕様。
- **gap**: Library 以外 (Workspace / Settings / Palette / Onboarding / Item form) の keyboard 完全到達は **未確認**。手動 keyboard 検収が J5 release-checklist で必要。

### G2. Focus ring 視認性 — **部分的**

- **根拠**: 全 interactive element で `focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]` が grep で広く採用 (Library / Workspace / Settings / widget)。L2-A PR #285 で Industrial Yellow ring 切替えの prefab 提供。
- **gap**: 全 element の **screenshot 撮影 + コントラスト計測** は未実施。WCAG 3:1 (UI components) を numeric で確認すべき。

### G3. Color contrast WCAG AA — **未検証**

- **根拠**: `ux_standards.md §3-1` に table で primary/secondary/muted/faint のコントラスト比 ≥ 4.5:1 / 4.2:1 設計あり、faint は AA ギリギリ (12px 以下禁止) も明記。
- **gap**: ax DevTools / Lighthouse での numerical check **未実施**。Industrial Yellow 適用部 (yellow on dark / on light) は計測必須。

### G4. aria-label / role 設定 — **PASS**

- **根拠**: `bash scripts/audit-labels.sh` `✔️ ラベル原則違反ゼロ`。lefthook で enforce、CI で再実行。

### G5. screen reader 対応 — **N/A (現 phase)**

- **根拠**: NVDA / Narrator 検証は agent では不可。release notes に「screen reader 部分対応」明記の前提。
- **gap**: release notes 草案で「screen reader 対応 = 部分的、L4 で改善」明記。

## H. i18n

### H1. 日本語 UI 完成度 — **PASS**

- **根拠**: `grep -rn "import|class=|aria-label" src/lib/components/` で構造的英語残存は機械検出範囲では無く、user-facing text は一貫して日本語 (CLAUDE.md 「`Always respond in 日本語`」 + ja-JP UI)。
- **gap**: 機械翻訳調 / 不自然日本語の **目視 audit** は未実施だが、PR #284-#292 を通して user 検収済 (一部 issue は user feedback で修正済)。

### H2. 英語 UI 切替え — **N/A (意図)**

- **根拠**: `grep -rn "locale\|i18n\|formatMessage" src/lib/`: 0 件。`configStore` に locale state なし、現 phase は日本語固定で意図的。
- **gap**: release notes に「日本語のみ、L4 で多言語対応予告」明記。

### H3. 日付 / 数値 formatter ローケール — **N/A (意図)**

- **根拠**: `grep -rn "Intl\.\|toLocaleString\|toLocaleDateString" src/lib/utils/` で 1 件 (library-sort.ts の `Intl.Collator('ja')`)。`formatBytes` / `formatShortDate` は固定 format。
- **gap**: H2 と同。

### H4. hard-code 文字列排除 — **N/A (意図)**

- **根拠**: 集約先 `labels.ts` 等の存在不要 (現 phase 日本語固定)。

## I. ドキュメント

### I1. README — **PASS**

- **根拠**: `README.md` 存在 (60 行 head 確認)、機能概要 / 動作環境 / インストール / 使い始める / 開発 / アーキテクチャ全節あり、`MIT License` badge、CI status badge。

### I2. install / setup ガイド — **部分的**

- **根拠**: README に install 節 ([Releases](https://github.com/emanon-i/arcagate/releases) から DL 手順)。
- **gap**: SmartScreen / Defender 警告対処の記載が無い (F7 と連動)。release notes / README に追加必要。

### I3. CHANGELOG — **FAIL**

- **根拠**: `ls CHANGELOG.md` → MISSING。
- **gap**: `CHANGELOG.md` を `Keep a Changelog` 形式で起こす必要。直近の MR / PR #284-#292 の差分を整理。

### I4. known issues / support 経路 — **FAIL**

- **根拠**: `ls docs/SUPPORT.md` → MISSING。`grep -rn "Support\|Issue\|サポート" README.md`: GitHub Issues link は CI badge 等に含まれるが support 専用節なし。
- **gap**: `docs/SUPPORT.md` 起こし or README に support 節追加。既知 bug 一覧 link を docs/lessons.md に置く方針も決める。

### I5. dev / contribute ガイド — **PASS**

- **根拠**: `CLAUDE.md` 存在 (project root)。`README.md` の「開発」 節で `pnpm tauri dev` / `pnpm verify` / `pnpm test:e2e` 手順記載、`docs/dispatch-operation.md` への link。

## J. テスト

### J1. unit test (vitest) カバレッジ — **部分的**

- **根拠**: `pnpm vitest run` 306 tests pass / 31 test files。`src/lib/utils/` (zoom-math / grid-keyboard / fuzzy-search / library-sort / format-meta etc) は test 厚い。
- **gap**: `pnpm vitest run --coverage` で % は未取得。L1-L3 で大量 test 追加したため線量は上がっているはずだが numerical 取得が必要。

### J2. Rust unit test カバレッジ — **部分的**

- **根拠**: `cargo test --lib` 256 tests pass、services 系ほぼ全部 test あり (item_service / metadata_service / config_service / launch_service 等)。
- **gap**: `cargo tarpaulin` / `cargo-llvm-cov` での numerical % 取得は未実施。

### J3. e2e カバレッジ (主要 flow) — **PASS**

- **根拠**: `tests/e2e/` に 28 spec、`@smoke` タグ 36 件。`.github/workflows/e2e.yml` で PR ごとに smoke 実行 (branch protection で必須 check、`gh api ... protection` 確認済)。

### J4. regression scenarios 文書化 — **未検証**

- **根拠**: `docs/lessons.md` に critical / high entries (verify pass = 治った 禁止 / Guideline doc 読まない / CSS token / 並行 PR / ClockWidget 4 回 fix / native select / pointerdown 二重発火) あり。
- **gap**: 各 critical / high entry が e2e or unit test に **対応関係を持つか** cross-reference 未実施。J5 release-checklist で要求。

### J5. 手動検証 checklist — **FAIL**

- **根拠**: `ls docs/release-checklist.md` → MISSING。
- **gap**: 本 audit の未検証項目を release 前に user が手動消化する checklist が必要。gap-list で blocker 化。

### J6. CI gate 設定 — **PASS**

- **根拠**: `gh api repos/.../branches/main/protection` で `required_status_checks: ["check","build","e2e","changes"]` 4 件すべて main への merge 必須。`allow_force_pushes: false` / `allow_deletions: false` も設定済。
