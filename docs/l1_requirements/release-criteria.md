# Release Readiness Criteria

**Date**: 2026-05-04
**Scope**: Arcagate を「配布できる完成度」として判定する根拠ベースの基準。各項目で Verification method / Pass criteria / Tooling を必須化、主観判定（「動くはず」「悪くない」）は禁止。

## 0. 弱い根拠 NG リスト（再発防止）

- 「Codex が PASS と言った」→ ソースの review であって動作保証ではない
- 「DOM 上は問題ない」→ DOM 存在 ≠ 治った（CLAUDE.md `<critical-rule id="dom-not-fixed">`）
- 「pnpm verify pass」→ 体感品質の保証ではない（lessons.md C-1）
- 「動くはず」「多分大丈夫」→ 主観禁止
- 「悪くない」「大体良い」→ 数値 or 状態 or 視覚証拠を出す

## 判定区分

- **PASS**: 数値 / 状態 / 視覚証拠を伴う合格
- **FAIL**: 不合格 + 再現手順 + 影響範囲
- **部分的**: 合格と不合格が混在
- **N/A**: 適用外

---

## A. 機能完成度

### A1. 主要 widget 動作 (12 種)

- **Verification**: 各 widget を Workspace に追加 → 設定 → 主要操作（起動 / 削除 / config 編集）を実機 dev で実行
- **Pass**: 12 widget 全てで crash 無し、各主要操作が 1 回で完了
- **Tooling**: 手動 dev 検収 + dev console error log 確認 + e2e

### A2. Library 主要 flow

- **Verification**: 1) item 追加（D&D + URL paste + 手動入力）/ 2) 起動 / 3) 編集 / 4) 削除 + undo / 5) 検索 / 6) sort / 7) bulk 選択 / 8) tag CRUD
- **Pass**: 8 flow すべて crash 無し + 即時反映（instant-feedback rule）
- **Tooling**: 手動 dev 検収 + e2e

### A3. Workspace 主要 flow

- **Verification**: 1) workspace 作成 / 2) widget 追加 / 3) 配置（move / resize）/ 4) zoom（Reset / Wheel / Fit）/ 5) wallpaper 設定 / 6) workspace 切替え / 7) 削除 + undo
- **Pass**: 7 flow すべて crash 無し + dev console に panic / unhandled rejection 出ない
- **Tooling**: 手動 dev 検収 + e2e

### A4. Settings + Onboarding flow

- **Verification**: 初回起動 → onboarding 完走 → Settings 全 tab 開閉 + 各設定変更（theme / hotkey / autostart / library card / kill switch）+ reload で永続化確認
- **Pass**: onboarding skip / 完走 両 path で crash 無し、設定変更が即時 + reload 後も保持
- **Tooling**: 手動 dev 検収

### A5. Palette + 起動 hotkey

- **Verification**: Ctrl+Shift+Space で palette 表示 / 検索 / Enter で launch、palette を閉じても再 hotkey で再表示
- **Pass**: palette 表示 P95 ≤ 120ms、launch P95 ≤ 200ms
- **Tooling**: 手動 stopwatch + CDP perf timeline

### A6. 既知 bug 許容範囲

- **Verification**: `docs/lessons.md` の既知 bug を全件確認、release-blocker / blocker でないを仕分け
- **Pass**: blocker = 0、blocker でない既知 bug は changelog に明記

---

## B. UI 一貫性

### B1. デザイントークン適用率（全画面）

- **Verification**: 全画面で screenshot 取得 → color hardcode・token 逸脱がないか確認
- **Pass**: `scripts/audit-design-tokens.sh` が 0 violations
- **Tooling**: CDP screenshot + 目視評価 + design-tokens lefthook

### B2. Widget UX 常識遵守 (12 widget × 5 項目)

- **Verification**: 各 widget で 5 項目 = 1) 削除確認 1 step + 5 sec undo / 2) 半透明 / ぼかし backdrop only / 3) label 機能・状態・アクション（icon 名禁止）/ 4) keyboard a11y（Tab / Enter / Esc）/ 5) resize で見切れ無し・設定即反映
- **Pass**: 60 観測点で違反 0、または各違反に fix PR 紐付け
- **Tooling**: audit scripts + 手動 widget exercise

### B3. token 一貫性

- **Verification**: `scripts/audit-design-tokens.sh` + `audit-font-hardcode.sh` + `audit-text-overflow.sh` の 3 audit 実行
- **Pass**: 3 audit すべて 0 violations
- **Tooling**: lefthook step を CI で再実行

### B4. radius / shadow / spacing token 一貫性

- **Verification**: 主要 component を screenshot → ux_standards.md と照合
- **Pass**: `--ag-radius-*` / `--ag-shadow-*` token のみ採用、ad-hoc px 値 ≤ 5 件（allow-list 化）

### B5. empty / loading / error 状態の design 統一

- **Verification**: 各画面の empty / loading / error 状態を意図的に発生させ screenshot 取得
- **Pass**: 全画面で `EmptyState` / `LoadingState` / `ErrorState` 共通 component 採用

---

## C. 安定性

### C1. 起動 → 終了 flow crash 無し

- **Verification**: dev / release build を 5 回連続で起動 → 各画面を一巡 → 終了
- **Pass**: 5/5 回で crash / panic 0
- **Tooling**: 手動起動 + log 確認

### C2. メモリリーク (idle 30 min)

- **Verification**: 起動 → 無操作 30 min → RSS を 0 / 5 / 15 / 30 min に記録
- **Pass**: 30 min 後の RSS 増加 ≤ +10MB
- **Tooling**: user 手動検証（agent 単独 30 min 待機は context 浪費）

### C3. メモリリーク (1h heavy use)

- **Verification**: Library scroll / sort / filter / workspace 切替 / widget 追加削除 / palette open/close を 1h 繰り返し
- **Pass**: 1h 後の RSS 増加 ≤ +50MB
- **Tooling**: user 手動検証

### C4. IPC error / timeout の graceful degradation

- **Verification**: DB を意図的に lock → 操作で IPC error → UI が crash せず ErrorState / Toast で報告
- **Pass**: DB 操作 IPC 失敗しても UI freeze 0、retry で復旧
- **Tooling**: dev で DB ファイルを別 process で open → 手動操作 + screenshot

### C5. DB migration forward

- **Verification**: 旧 DB fixture で起動 → migration apply → 全 schema が最新
- **Pass**: `migrations().to_latest()` が `Ok(())`、`cargo test db::migrations` が pass

### C6. DB migration rollback

- **Pass**: forward only でも明示なら PASS（release notes に明記）

### C7. DB 破損時の fallback

- **Verification**: `arcagate.db` を破壊 → 起動 → recovery 経路を提示
- **Pass**: SQLite open error で panic せず、user に recovery 選択肢を提示 or crash report を残す

### C8. unhandled rejection / panic 検知

- **Pass**: panic_hook + `unhandledrejection` ハンドラが registered で、log に残る（silent fail しない）

---

## D. パフォーマンス

### D1. アプリ起動 P95 (cold)

- **Pass**: P95 ≤ 1500ms（低スペック PC でも ≤ 2500ms）

### D2. アプリ起動 P95 (warm)

- **Pass**: P95 ≤ 1000ms

### D3. パレット表示 P95

- **Pass**: P95 ≤ 120ms（ux-standards.md §1）

### D4. アイテム起動 P95

- **Pass**: P95 ≤ 200ms（Arcagate 側の処理だけ計測）

### D5. idle メモリ

- **Pass**: ≤ 120MB

### D6. idle CPU

- **Pass**: ≤ 1%（常時アニメーション / poll が無いこと）

### D7. Library 1000 items でフリーズ無し

- **Pass**: scroll 60fps 維持（≥ 50fps）、sort / filter 操作応答 ≤ 200ms

### D8. Workspace 100 widget でフリーズ無し

- **Pass**: 操作応答 ≤ 200ms、frame rate ≥ 50fps

### D9. 主要 IPC 応答時間 P95

- **Pass**: 各 IPC P95 ≤ 100ms（1000 batch metadata は ≤ 500ms）

---

## E. エラー処理

### E1. panic / unhandled rejection ユーザー表示

- **Pass**: panic 時に「予期しないエラーが発生しました、再起動してください」dialog が出る（silent crash 禁止）

### E2. crash recovery

- **Pass**: workspace / library カード永続化が DB に書かれており、再起動で同 state

### E3. 設定ファイル破損時 restore

- **Pass**: 破損検知 → default 値で起動 + user 通知、または backup から復元

### E4. AppError serialize 構造

- **Pass**: `{ code, message }` 構造で serialize、TS 側が structured 判定（string contains 禁止）

### E5. updater error handling

- **Pass**: updater 失敗時に user 操作を妨げない（silent retry + log + 通知）、main app の起動を block しない

### E6. log rotation

- **Pass**: log file が 5MB 超えたら rotate、7 世代保持

---

## F. 配布要件

### F1. MSI / NSIS installer build

- **Pass**: `src-tauri/target/release/bundle/msi/*.msi` + `nsis/*.exe` の 2 ファイルが生成

### F2. code signing

- **Pass**: GH Releases（signing なし）で OK だが release notes に「未署名のため SmartScreen 警告が出る」明記

### F3. updater 設定

- **Pass**: updater pubkey が設定、endpoint が GH Releases を指す、update check が起動時 + 手動 trigger で動く

### F4. SBOM 生成

- **Pass**: npm + cargo 両方の SBOM が生成され、release artifact に同梱

### F5. crash reporting / telemetry / kill-switch

- **Pass**: kill switch IPC 動作 / telemetry opt-in default OFF / crash report opt-in default OFF

### F6. privacy / license / EULA

- **Pass**: README / installer / Settings のいずれかで privacy policy / license が user に提示される

### F7. installer 実行で AV / SmartScreen 警告

- **Pass**: 警告が出るのは仕様（未署名）、release notes に明記 + 「実行する」で続行可能

### F8. uninstall flow

- **Pass**: uninstall で binary 削除 + Start menu shortcut 削除、user data（Library / workspace）は**残す**

### F9. release artifact 整合

- **Pass**: artifact に sha256 checksum 同梱、SBOM 同梱、changelog 含む release notes

### F10. autoupdate 経路の安全性

- **Pass**: signature 検証 enabled、pubkey が tauri.conf.json に設定済み

---

## G. アクセシビリティ

### G1. Keyboard 全機能到達

- **Pass**: 全主要操作（10 件以上）が keyboard のみで実施可能、focus が consume されない行き止まり ≤ 0

### G2. Focus ring 視認性

- **Pass**: focus-visible で 2px 以上の outline / ring が表示

### G3. Color contrast WCAG AA

- **Pass**: 14px 以上 ≥ 4.5:1、18px 以上 / Bold 14px 以上 ≥ 3:1

### G4. aria-label / role 設定

- **Pass**: `audit-labels.sh` 0 violations

### G5. screen reader 対応（基礎）

- **Pass**: window title / 主要 button / dialog header / toast が announce される。深い対応は将来フェーズ継続改善

---

## H. i18n

### H1. 日本語 UI 完成度

- **Pass**: 全 UI text が自然な日本語、英語残存なし（固有名詞は除外）

### H2. 英語 UI 切替え

- **Pass**: 現 phase は **N/A**、release notes で「日本語のみ」明記

### H3. 日付 / 数値 formatter ローケール

- **Pass**: `'ja'` 固定で UI 表記が自然

---

## I. ドキュメント

### I1. README

- **Pass**: 機能概要 / install 手順 / build 手順 / license が記載 + screenshot 1 枚以上

### I2. install / setup ガイド

- **Pass**: README に install 節（MSI / NSIS 手順 + Defender warning 対処）

### I3. CHANGELOG

- **Pass**: 直近 3 release 以上分の entries、Added / Changed / Fixed が分類

### I4. known issues / support 経路

- **Pass**: README or `docs/l1_requirements/distribution/support.md` に support 経路

### I5. dev / contribute ガイド

- **Pass**: 新規 contributor が `pnpm tauri dev` で開発開始できる手順

---

## J. テスト

### J1. unit test カバレッジ

- **Pass**: src/lib/utils 系で line coverage ≥ 80%、全体 ≥ 50%

### J2. Rust unit test カバレッジ

- **Pass**: `src-tauri/src/services/` ≥ 70%、全体 ≥ 50%

### J3. e2e カバレッジ

- **Pass**: @smoke タグ全件 pass

### J4. regression scenarios 文書化

- **Pass**: lessons.md severity=critical の項目が e2e or unit に対応する

### J5. 手動検証 checklist

- **Pass**: 全主要 flow + a11y + i18n + perf の手動 checklist が doc 化

### J6. CI gate 設定

- **Pass**: branch protection で main への merge に verify 全段 pass を要求
