# Release Readiness Gap List

**Predecessor**: [audit.md](./audit.md) + [audit-stability-perf.md](./audit-stability-perf.md) + [audit-error-distribution.md](./audit-error-distribution.md) + [audit-quality.md](./audit-quality.md)

audit で FAIL / 部分的 / 未検証 と判定された項目を **修正方針 + 工数 + 優先度** で整理。優先度は配布判定の影響度ベース:

- **blocker**: これが直らないと配布できない (security / 動作不能 / 法的)
- **should-have**: 配布できるが品質印象を落とす (docs 不足 / UI 未統一)
- **nice-to-have**: 後続 release で対応可能

## サマリ (修正規模)

| 優先度       | 件数 | 工数合計 | Phase                           |
| ------------ | ---- | -------- | ------------------------------- |
| blocker      | 5    | 6 h      | **R4 blocker fix** (即着手)     |
| should-have  | 9    | 14 h     | **R5 should-have** (R4 後)      |
| nice-to-have | 11   | 22 h     | **R6 polish** (release 後で OK) |

## 1. Blocker (R4 で fix、release 前に必須)

### B-1. F3+F10 updater pubkey 設定

- **gap**: `src-tauri/tauri.conf.json` の `bundle.updater.pubkey` が `PLACEHOLDER_REGENERATE_WITH_TAURI_SIGNER`、updater 動作不能 + signature 検証無効
- **修正**: `tauri signer generate` で keypair 生成 → pubkey を tauri.conf.json に commit、privatekey は GH Actions secret `TAURI_SIGNING_PRIVATE_KEY`、release.yml で `tauri signer sign` step を確認
- **工数**: 1 h (鍵生成 + commit + secret 設定 + 動作テスト)

### B-2. C8 frontend unhandledrejection / window.onerror

- **gap**: `grep -rn "unhandledrejection\|window\.onerror" src/`: 0 件、silent fail 経路あり
- **修正**: `src/lib/state/error-monitor.svelte.ts` (新規) で `window.addEventListener('unhandledrejection')` + `window.addEventListener('error')` を `+layout.svelte` mount 時に登録、ErrorState で表示 + 既存 telemetry 経路に流す
- **工数**: 2 h (実装 + unit + e2e)

### B-3. I3 CHANGELOG.md 起こす

- **gap**: `CHANGELOG.md` MISSING、release notes が build できない
- **修正**: `Keep a Changelog` 形式で作成、PR #284-#292 を v0.1.0 release に統合、`release.yml` 経由で release notes 生成
- **工数**: 1 h

### B-4. I4 SUPPORT.md / README support 節

- **gap**: support 経路 doc なし、user が bug 報告できない
- **修正**: `docs/SUPPORT.md` 起こし、GitHub Issues link + 既知 bug 一覧 link (lessons.md)、README に support 節追加
- **工数**: 1 h

### B-5. J5 release-checklist.md (本 audit の未検証項目を user 手動で消化)

- **gap**: 本 audit で未検証 19 件、user 手動 checklist が無いと release 判定不能
- **修正**: `docs/release-checklist.md` 起こし、本 audit の未検証 19 件 + 部分的の手動 verification を 1 item ずつチェックボックス化、release ごとに ✅
- **工数**: 1 h

## 2. Should-have (R5 で fix、release 前推奨)

### S-1. D1 cold 起動 P95 計測

- **gap**: 数値未取得、ux_standards.md §1 の ≤ 1500ms に対する **実測** が無い
- **修正**: `scripts/perf-measure-startup.ps1` 作成 → 5 回計測 → `audit.md` 補記、release notes に baseline 数値
- **工数**: 1 h

### S-2. D5 idle メモリ計測

- **gap**: ≤ 120MB の実測未取得
- **修正**: `tasklist` を起動 5 min 後に取得する script、user 手動実行
- **工数**: 0.5 h

### S-3. D7 Library 1000 items frame rate

- **gap**: 数値未取得、L3-A `content-visibility: auto` の効果実測がない
- **修正**: fixture script で 1000 item seed → CDP `Performance.metrics` で frame rate 取得 → audit 補記
- **工数**: 2 h

### S-4. B1 Industrial Yellow 全画面適用

- **gap**: 6 画面中 Library StatCard / LoadingState のみ。Workspace / Settings / Palette / Onboarding / Item form 未移行
- **修正**: 段階移行 PR (phase-l3-plan §1 D1 で言及)、Settings → Workspace → Palette → Onboarding → Item form の順で 1 PR ずつ
- **工数**: 6 h (5 component 群 × 1 h + 全画面 screenshot diff)

### S-5. B5 EmptyState / LoadingState / ErrorState 全画面採用

- **gap**: widget の独自 empty text 残存 (4 widget)、Industrial 化は LoadingState のみ
- **修正**: 各 widget の empty / loading / error を共通 component に書き換え、Industrial 風 (yellow + hatching) 適用
- **工数**: 2 h

### S-6. C4 IPC error 失敗時 UI freeze 0 検証

- **gap**: numeric 証明なし
- **修正**: e2e で IPC mock 失敗を仕込んで UI 応答測定、retry 経路の動作確認
- **工数**: 1.5 h

### S-7. F6 privacy policy / EULA doc + Settings link

- **gap**: 「プライバシー」 link が Settings に無い、policy doc 未起こし
- **修正**: `docs/PRIVACY.md` 起こし (telemetry default OFF / crash report default OFF / data 何処に保存 / 第三者送信先 = Sentry endpoint)、`PrivacySettings.svelte` に link 追加
- **工数**: 1 h

### S-8. G3 WCAG AA color contrast numeric 計測

- **gap**: ax / Lighthouse score 未取得、Industrial Yellow on dark 計測未
- **修正**: dev で ax DevTools / Lighthouse 走らせる、結果 score を audit 補記
- **工数**: 1 h

### S-9. J1+J2 coverage % 取得

- **gap**: vitest --coverage / cargo tarpaulin 未実行
- **修正**: 1 回実行 → audit 補記、CI に coverage step 追加検討
- **工数**: 1 h

## 3. Nice-to-have (R6 polish、release 後で OK)

### N-1 ~ N-11 (項目列挙)

- **N-1**: A1 全 12 widget 手動 dev 検収 (J5 checklist と重複だが widget 単位で記録) — 2 h
- **N-2**: A4 onboarding 完走 e2e (`tests/e2e/onboarding-*.spec.ts` 新規) — 2 h
- **N-3**: A5 palette P95 e2e + Performance API 計測 — 1 h
- **N-4**: A6 既知 bug 仕分け doc (`docs/known-issues-release.md`) — 0.5 h
- **N-5**: B2 widget 削除確認 1 step + 5 sec undo を全 widget 拡張 (現状 Library のみ) — 3 h
- **N-6**: C2 メモリリーク idle 30 min 自動化 script — 1 h
- **N-7**: C3 メモリリーク 1 h heavy 自動化 e2e + memory log — 2 h
- **N-8**: C6 down migration 文書化 + release notes 「forward only」明記 — 0.5 h
- **N-9**: C7 DB 破損時 fallback dialog 実装 (現状未確認、code path 追加) — 3 h
- **N-10**: F4 SBOM (`npm sbom` + `cargo cyclonedx`) を release.yml に組み込み — 2 h
- **N-11**: J4 lessons.md critical/high と test の cross-reference 表 — 1 h

## 4. Phase 提案

### Phase R4 — blocker fix (~6 h、1 PR or 5 PR 細分)

- B-1 updater pubkey
- B-2 unhandledrejection
- B-3 CHANGELOG
- B-4 SUPPORT
- B-5 release-checklist

### Phase R5 — should-have (~14 h)

- S-1 〜 S-9
- 1 PR 大きすぎるなら 3 PR 程度に分割 (perf 計測 / Industrial 全画面 / docs)

### Phase R6 — nice-to-have (~22 h)

- N-1 〜 N-11
- 配布後の継続改善で実施、必須でない

## 5. release 判定 (本 audit 時点)

**現状の release 可否**: ❌ **NOT READY** (blocker 5 件残)

R4 完了で:

- updater 動作可能
- silent fail 解消
- changelog / support / checklist が user に提示可能
- → blocker = 0、配布判定可能

R5 で品質印象が向上、R6 で長期改善。

## 6. 連続 mode 規律

- R4 を即着手 (本 gap-list ベースの fix PR)
- R4 → R5 → R6 順次、各 phase 完了で user 報告
- R4 完了報告は **release-ready milestone**、user の release 判定 trigger
