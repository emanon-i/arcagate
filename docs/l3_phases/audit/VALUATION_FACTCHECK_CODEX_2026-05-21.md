## 先に結論
このレポート、**方向性は一部当たっているが、数値・行番号・現状認識の精度が雑**です。  
特に `Security A` と「未実装/未整備」の断言は、現コードと食い違いが多く、**Grade インフレ気味**です。

## 重大な指摘（Severity順）
1. **`Security A` は過大評価。しかも根拠の一部が誤り。**  
`unsafe-inline` 禁止と書いているが、実際は `style-src 'unsafe-inline'` を許可。  
参照: [tauri.conf.json:46](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/tauri.conf.json:46)

2. **Updater 周りを「Critical 0」と言い切るのは無理。**  
`pubkey` はプレースホルダのまま。しかも CI 側は `IS_RELEASE_TAG=0` で警告止まり。  
参照: [tauri.conf.json:81](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/tauri.conf.json:81), [ci.yml:120](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/.github/workflows/ci.yml:120), [check-pubkey.sh:29](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/scripts/release-checks/check-pubkey.sh:29)

3. **「i18n EN 0%」は事実誤認。**  
`messages_en.json` が存在し、`i18n.svelte.ts` で `en` ロケールをロードしている。  
参照: [messages_en.json](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src/lib/i18n/messages_en.json), [i18n.svelte.ts:20](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src/lib/i18n.svelte.ts:20), [i18n.svelte.ts:34](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src/lib/i18n.svelte.ts:34)

4. **件数・LoC・行番号のズレが多い。**  
監査レポートとしては痛い。数字の信頼性が落ちる。

---

## 1) Grade の妥当性（辛口判定）
- アーキ `A`: **やや甘い**。レイヤ分離は良いが、巨大ファイルが残り、レポート側の数値精度も低い。`A-` が妥当。
- コード品質 `A-`: **甘い**。`item_service.rs` / `workspace-widgets.svelte.ts` が依然重い。`B+〜A-`。
- テスト `B+`: **だいたい妥当**。ただし実数はレポートより多い（Vitest/Playwright）。評価ロジックが雑。
- 安定性 `B+`: **妥当寄り**。soak 未計測は確かに弱点。
- セキュリティ `A`: **過大評価**。CSP主張に誤り、updater鍵 deferred、依存脆弱性監査未統合。`B+` 相当。
- ビルド配布 `B+`: **概ね妥当**。ただし workflow 行数など事実誤差多数。
- 成熟度 `B`: **妥当〜やや甘い**。実装密度は高いが、レポートが現状差分に追従できていない。

---

## 2) 数値ファクトチェック（LoC / テスト数 / ファイル数）

### 主な食い違い
| 項目 | レポート主張 | 実測 | 検証コマンド |
|---|---:|---:|---|
| Rust file | 80 | **82** | `rg --files src-tauri -g "*.rs" \| rg -c "."` |
| Svelte file | 600+ | **147** | `rg --files -g "*.svelte" \| rg -c "."` |
| docs file | 100+ | **635**（docs配下全ファイル） | `rg --files docs \| rg -c "."` |
| `item_service.rs` LoC | 1245 | **1110** | `Get-Content src-tauri/src/services/item_service.rs \| Measure-Object -Line` |
| `workspace-widgets.svelte.ts` LoC | 844 | **808** | `Get-Content src/lib/state/workspace-widgets.svelte.ts \| Measure-Object -Line` |
| `item_repository.rs` LoC | 690 | **602** | `Get-Content src-tauri/src/repositories/item_repository.rs \| Measure-Object -Line` |
| `LibraryMainArea.svelte` LoC | 436 | **406** | `Get-Content src/lib/components/arcagate/library/LibraryMainArea.svelte \| Measure-Object -Line` |
| `SystemMonitorWidget.svelte` LoC | 462 | **437** | `Get-Content src/lib/widgets/system-monitor/SystemMonitorWidget.svelte \| Measure-Object -Line` |

### テスト件数
| 項目 | レポート主張 | 実測 | 検証コマンド |
|---|---:|---:|---|
| Rust `#[test]` 件数 | 357 | **357**（一致） | `rg -n "#\\[test\\]" src-tauri -g "*.rs" \| rg -c "."` |
| Rust test file 数 | 44 | **42**（`#[test]`含有ファイル） | `rg -l "#\\[test\\]" src-tauri -g "*.rs" \| rg -c "."` |
| Vitest spec file | 9 | **9**（一致） | `rg --files src/lib -g "*.test.ts" \| rg -c "."` |
| Vitest case | 63 | **111**（`it(...)`行数） | `rg -n "^\\s*it\\(" src/lib -g "*.test.ts" \| rg -c "."` |
| Playwright spec file | 19+ | **10** | `rg --files tests/e2e -g "*.spec.ts" \| rg -c "."` |
| Playwright test case | 19+相当 | **35** | `rg -n "^test\\(" tests/e2e -g "*.spec.ts" \| rg -c "."` |

---

## 3) `unsafe` / TODO / unwrap / `allow(dead_code)` 検証

| 項目 | レポート主張 | 実測 | 検証コマンド |
|---|---:|---:|---|
| `unsafe` block | 0 | **0** | `rg -n "unsafe\\s*\\{" src-tauri/src -g "*.rs"` |
| TODO/FIXME/HACK/XXX | 0 | **0**（単語境界検索） | `rg -n "\\b(TODO|FIXME|HACK|XXX)\\b" src src-tauri tests scripts ...` |
| `unwrap/expect/panic` in `src-tauri/src` | 696 | **696**（一致） | `rg -n "\\.unwrap\\(|\\.expect\\(|panic!\\(" src-tauri/src -g "*.rs" \| rg -c "."` |
| 同 in `lib.rs` | 4 | **5** | `rg -n "\\.unwrap\\(|\\.expect\\(|panic!\\(" src-tauri/src/lib.rs` |
| `#[allow(dead_code)]` | 5 | **5**（件数一致） | `rg -n "allow\\(dead_code\\)" src src-tauri -g "*.rs" -g "*.ts" -g "*.svelte"` |

補足: `allow(dead_code)` の「1件は plugin_api」は誤り。`src-tauri/src/plugin_api` 自体が存在しない。  
検証: `rg --files src-tauri/src/plugin_api -g "*.rs"` → path not found。

---

## 4) セキュリティ主張の検証（Critical 0 は妥当か）
### 妥当だった点
- `unsafe` 0 は事実。
- `shell_words::split` による quoted args 対応は実装あり。  
参照: [launcher/mod.rs:75](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/src/launcher/mod.rs:75)
- path canonicalize + `starts_with` confinement は実装あり。  
参照: [script_runner_service.rs:154](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/src/services/script_runner_service.rs:154), [script_runner_service.rs:166](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/src/services/script_runner_service.rs:166)
- PowerShell single-quote escape (`'`→`''`) あり。  
参照: [icon.rs:13](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/src/utils/icon.rs:13)

### 過大・誤り
- 「`unsafe-inline`/`unsafe-eval` 禁止」は**誤り**。`unsafe-inline` は許可されている。  
参照: [tauri.conf.json:46](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/tauri.conf.json:46)
- updater 公開鍵未設定は実害あり（アップデート経路は deferred 扱い）。  
参照: [tauri.conf.json:81](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/tauri.conf.json:81), [check-pubkey.sh:29](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/scripts/release-checks/check-pubkey.sh:29)
- capabilities は「最小」とは言い切れない。`fs:allow-read/write`, `shell:allow-open`, `global-shortcut`, `autostart` まで許可。  
参照: [default.json](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/src-tauri/capabilities/default.json)

---

## 5) バリュエーション（$80-240K 等）の妥当性
これは**コードから検証不能な推定値**です。  
根拠が「工数仮定×時給仮定」で、売上推計も市場検証データなし。  
要するに、**数字に見える感想文**です。会計・事業評価としては証拠不足。

---

## 6) 比較主張（「同等規模OSSでほぼない」「cosignで一歩先」）
- リポジトリ内に客観比較データがないため、**検証不能**。
- 主張としてはあり得るが、監査レポートに書くなら比較対象の同一基準が必要。現状は断言過剰。

---

## 7) Critical 3項目（pubkey / SetupWizard e2e / soak）の優先度
- `pubkey`: **High〜Critical（配布方針次第）**。manual install中心なら Critical ではないが、auto-update前提なら Critical。
- SetupWizard e2e: **High**。`global-setup` で skipしているのは事実。  
参照: [global-setup.ts:108](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/tests/fixtures/global-setup.ts:108), [global-setup.ts:113](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/tests/fixtures/global-setup.ts:113)
- soak計測: **High**。release criteria に明記されているので優先度は妥当。  
参照: [vision.md:247](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/docs/l1_requirements/vision.md:247), [vision.md:253](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/docs/l1_requirements/vision.md:253)

**Critical漏れ**
- supply-chain 監査未統合（`cargo audit` / `pnpm audit` が CIに見当たらない）。
- ドキュメント整合性崩れ（telemetry「実装済み」記述と「未実装」記述が共存）。  
参照: [operations.md:638](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/docs/l1_requirements/operations.md:638), [PRIVACY.md:13](E:/Cella/Projects/arcagate/.claude/worktrees/upbeat-mclaren-8f3c55/PRIVACY.md:13)

---

## 8) レポートがスルーしている重要観点
1. 依存関係脆弱性スキャンの常時運用（CI統合）。
2. ドキュメントの内部矛盾（運用品質に直結）。
3. 市場売上推計のエビデンス欠如（DL数・MAU・継続率・転換率がゼロ）。

---

## 最も重い批判 TOP 3
1. **Security A の根拠が崩れている**（CSP断言ミス、updater鍵deferred、権限最小化の言い過ぎ）。
2. **数値監査として雑**（LoC・テスト数・行番号のズレ多数）。
3. **成熟度評価が古い差分を踏んでいない**（i18n EN 0% など明確な誤認）。

## 妥当だと認める点 TOP 3
1. Rust `#[test]` 357件、`unsafe` 0件は事実。
2. レイヤ分離（commands→services→repositories）とサービス集約は概ね良い。
3. `shell_words` / canonicalize confinement / quote escape など局所防御は実装されている。

---

実施制約: read-only 監査のため、`cargo test` や E2E の再実行による挙動確認までは行っていません。上記は静的実測（`rg`, `Measure-Object`, 設定ファイル読取）ベースです。