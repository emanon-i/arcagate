# Release Readiness Auto-checks

R3 gap-list の **未検証 / 部分的** 項目を自動検証スクリプトに rewrite した一覧 (R4-B)。
user 手動 checklist に依存せず、agent / CI が **再実行可能** であることが要件。

## scripts (`scripts/release-checks/`)

| script                    | scope                                                                | 自動化レベル                  | CI 統合                |
| ------------------------- | -------------------------------------------------------------------- | ----------------------------- | ---------------------- |
| `check-blocker-files.sh`  | I3 / I4: CHANGELOG / SUPPORT / PRIVACY / LICENSE / README support 節 | 完全                          | ✅ ci.yml              |
| `check-error-monitor.sh`  | C8 / B-2: Frontend silent fail 検知 install 確認                     | 完全                          | ✅ ci.yml              |
| `check-pubkey.sh`         | F3+F10 / B-1: tauri.conf.json updater pubkey PLACEHOLDER 検出        | 完全 (deferred 期間中は WARN) | ✅ ci.yml              |
| `measure-startup.ps1`     | D1 / D2: cold / warm 起動 P95 計測                                   | HW 依存 (release build 必要)  | run-all-runtime で実行 |
| `measure-memory-soak.ps1` | C2 / D5: idle メモリ + soak 増加検出                                 | HW 依存 (時間かかる)          | run-all-runtime で実行 |
| `generate-sbom.sh`        | F4: SBOM (npm + cargo cyclonedx)                                     | 完全                          | release.yml で実行     |
| `run-all-static.sh`       | 上記 static 系を一括実行                                             | 完全                          | local 検証用           |

## 実行方法

### static check (CI で必須化)

```bash
bash scripts/release-checks/run-all-static.sh
```

### runtime check (release build 必要、agent / user 手動)

```powershell
pnpm tauri build
pwsh scripts/release-checks/measure-startup.ps1 -Iterations 5
pwsh scripts/release-checks/measure-startup.ps1 -Iterations 5 -Cold
pwsh scripts/release-checks/measure-memory-soak.ps1 -Minutes 30
```

### release artifact (release.yml で実行)

```bash
bash scripts/release-checks/generate-sbom.sh sbom/
```

## 出力先

各 runtime measurement は `docs/l1_requirements/release-readiness/measurements/` に JSON で保存:

- `startup.json` (cold / warm 各別)
- `memory-idle-soak.json`

## 自動化困難な未検証項目 (R5+ 検討)

- **C7 DB 破損時 fallback**: バイナリ破壊 → recovery dialog 表示 を agent が検証する経路は実装可能だが UI dialog があるかは別途 R5 で確認
- **C3 1h heavy use soak**: 操作 fixture を Playwright で 1h 流す script は実装可能、CI 時間が長すぎるため runtime バッチ専用
- **F7 SmartScreen**: 未署名 installer の警告は仕様、release notes に明記済 (R4-A)
- **F8 uninstall flow**: MSI / NSIS の uninstaller は build に組み込み済、user 環境でのみ検証可能 (deferred)
- **G3 WCAG color contrast**: ax DevTools / Lighthouse は CI 自動化可能 (R5 で追加)
- **G5 screen reader**: NVDA / Narrator は手動限定、release notes 「部分対応」明記済

これらは **agent dev 環境で代用検証** できるものは R4-D で実機 run、user 環境固有のものは
`docs/l1_requirements/release-readiness/user-action-needed.md` (R4-C) に分離。
