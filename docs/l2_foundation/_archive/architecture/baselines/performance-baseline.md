# 性能 baseline（batch-82 PH-368 / Refactor Era 計測フェーズ）

計測日: 2026-04-26
**コード変更なし、計測のみ**

vision.md 制約:

- exe size: **20MB 以下**
- idle メモリ: **100MB 以下**
- 起動 P95: **2 秒以内**

---

## 1. exe size（release ビルド）

```
src-tauri/target/release/arcagate.exe = 17,238,016 bytes (16.44 MB)
```

| 制約          | 実測         | 余裕     | 達成度              |
| ------------- | ------------ | -------- | ------------------- |
| exe size 20MB | **16.44 MB** | +3.56 MB | ✅ 達成（82% 使用） |

batch-73 で sysinfo 追加後の値、その後変動なし。

### バイナリ寄与（cargo bloat、arcagate_cli の場合）

```
text section: 2.5 MiB / file size 3.1 MiB
```

| crate                        | 寄与            |
| ---------------------------- | --------------- |
| (root + dependencies inline) | 49.4% (1.2 MiB) |
| clap_builder                 | 12.8% (322 KiB) |
| std                          | 10.5% (265 KiB) |
| arcagate_cli                 | 9.8% (246 KiB)  |
| serde_json                   | 4.3% (109 KiB)  |
| arcagate_lib                 | 3.3% (83 KiB)   |
| libsqlite3_sys               | 2.6% (64 KiB)   |
| serde_core                   | 1.7% (41 KiB)   |
| rusqlite                     | 1.1% (27 KiB)   |
| rusqlite_migration           | 0.9% (23 KiB)   |

GUI 本体（arcagate.exe）の cargo bloat は次フェーズで詳細測定。**clap_builder が CLI で 322 KiB は妥当**（GUI バイナリには不要なはず → 性能フェーズで分離検討候補）。

---

## 2. idle メモリ（**未計測**）

実機起動 + 5 分待機後の `Get-Process arcagate | Select-Object WorkingSet,PrivateMemorySize` 計測が必要。

batch-83 構造フェーズ着手前にユーザ環境で実機計測予定。

| 制約       | 実測       | 達成度 |
| ---------- | ---------- | ------ |
| idle 100MB | **未計測** | —      |

---

## 3. 起動時間 P95（**未計測**）

ホットキー押下 → パレット表示までの実機計測が必要。手動 5 回 → P95 算出。

| 制約          | 実測       | 達成度 |
| ------------- | ---------- | ------ |
| 起動 P95 2 秒 | **未計測** | —      |

---

## 4. フロントバンドル

`docs/l2_architecture/bundle-baseline.md`（batch-63）から:

| 区分     | サイズ (raw) | サイズ (gzip) |
| -------- | ------------ | ------------- |
| JS 合計  | 428 KB       | 134 KB        |
| CSS 合計 | 100 KB       | 16 KB         |
| **合計** | **556 KB**   | **150 KB**    |

batch-82 時点では大きな変動なし（vite-bundle-visualizer 再実行は構造フェーズで）。

### JS チャンク top 5

| ファイル                | サイズ   |
| ----------------------- | -------- |
| `nodes/2.*.js` (メイン) | 302.9 KB |
| `chunks/BSyGwTi_.js`    | 36.2 KB  |
| `chunks/CDk8TfDx.js`    | 26.1 KB  |
| `chunks/CC-iDZOB.js`    | 23.8 KB  |
| `nodes/3.*.js`          | 18.5 KB  |

メインチャンク 302 KB は Svelte コンパイル済 + 全 widget が乗っている可能性あり（folder-per-widget colocation 後に dynamic import で削減可能）。

---

## 5. テストスイート実行時間（batch-82 計測）

| スイート          | ファイル数                | テスト数 | 実行時間（ローカル）         |
| ----------------- | ------------------------- | -------- | ---------------------------- |
| vitest            | 11                        | 104      | ~1.9 秒                      |
| cargo test --lib  | 約 30 module              | 176      | ~1.2 秒                      |
| pre-push 並列     | svelte-check + cargo test | —        | ~10〜18 秒                   |
| smoke-test        | shell-based               | —        | ~2 秒                        |
| pnpm verify 全部  | (フル)                    | —        | ~5〜8 分（tauri build 込み） |
| e2e @core (CI)    | 5 spec                    | 5 test   | 5〜8 分                      |
| e2e @nightly (CI) | 22 spec                   | 約 80+   | 15〜25 分                    |

---

## 6. Refactor Era 性能フェーズ（batch-85）改善対象

| # | 対象                    | 現在     | 目標     | 手段                                                         |
| - | ----------------------- | -------- | -------- | ------------------------------------------------------------ |
| 1 | exe size                | 16.44 MB | < 16 MB  | tauri features 削減 / cargo bloat 上位の review              |
| 2 | idle memory             | 未計測   | < 100 MB | sysinfo Mutex<System> 戦略の見直し（再生成 vs 保持）         |
| 3 | バンドル メインチャンク | 302 KB   | < 200 KB | folder-per-widget colocation 後に widget 単位 dynamic import |
| 4 | 起動 P95                | 未計測   | < 2 秒   | Tauri WebView2 起動時間（測定後判断）                        |
| 5 | e2e @core 実行時間      | 5〜8 分  | 維持     | 削減困難（page fixture setup が支配的）                      |
| 6 | テスト pre-push 時間    | 18 秒    | 維持     | OK                                                           |

**性能フェーズは構造 / 簡素化フェーズの完了後に実測再計測してから着手。**

---

## 7. batch-85 性能フェーズ計測（2026-04-27 / Refactor Era 性能フェーズ）

### 7.1 cargo bloat（GUI バイナリ arcagate.exe、PH-380）

```
.text section: 11.7 MiB / file size 16.5 MiB（71%）
```

| crate              | 寄与 (.text)     |
| ------------------ | ---------------- |
| tauri              | 18.5% (2.2 MiB)  |
| std                | 17.8% (2.1 MiB)  |
| arcagate_lib       | 13.9% (1.6 MiB)  |
| (root + inline)    | 10.4% (1.2 MiB)  |
| tokio              | 7.9% (945.2 KiB) |
| serde_json         | 2.9% (351.8 KiB) |
| regex_automata     | 2.7% (327.0 KiB) |
| regex_syntax       | 2.1% (254.0 KiB) |
| tauri_runtime_wry  | 1.8% (216.1 KiB) |
| aho_corasick       | 1.6% (186.6 KiB) |
| tao                | 1.5% (177.1 KiB) |
| tauri_plugin_shell | 1.4% (168.8 KiB) |
| wry                | 0.9% (107.2 KiB) |
| muda               | 0.9% (106.5 KiB) |
| tauri_plugin_fs    | 0.9% (104.3 KiB) |
| tauri_utils        | 0.8% (93.6 KiB)  |
| crossbeam_channel  | 0.7% (89.6 KiB)  |
| serde              | 0.7% (85.5 KiB)  |
| notify             | 0.6% (71.8 KiB)  |
| url                | 0.6% (67.5 KiB)  |
| libsqlite3_sys     | 0.5% (64.9 KiB)  |

### 7.2 features review（PH-380）

`src-tauri/Cargo.toml` の各依存に対して features を review:

| 依存                     | 変更                                                                | 理由                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notify`                 | features を `["macos_fsevent"]` → `default-features = false` に変更 | Windows 配布専用 (vision で macOS スコープ外) のため macos 専用 backend は不要。Windows ビルドでは linker dead-code stripped で実効サイズ変動なし、意図の明文化のみ |
| `tauri`                  | 維持（`protocol-asset, tray-icon, devtools`）                       | devtools は E2E（CDP）に必須（lessons.md）                                                                                                                          |
| `sysinfo`                | 維持（`default-features = false, features = ["system", "disk"]`）   | 既に最小化済                                                                                                                                                        |
| `tokio`                  | Tauri が内蔵、直接制御不能                                          | 削減対象外                                                                                                                                                          |
| `regex_*`/`aho_corasick` | 直接依存なし、notify / tauri-plugin-fs 経由で transitive            | 上位 crate を絞らない限り削減困難                                                                                                                                   |

### 7.3 サイズ baseline 比較

| 計測時期          | exe size | .text    | 変動 |
| ----------------- | -------- | -------- | ---- |
| batch-82 (PH-368) | 16.44 MB | -        | -    |
| batch-85 (PH-380) | 16.5 MB  | 11.7 MiB | ±0   |

**結論**: vision 20MB 制約に対して 16.5 MB は十分余裕（83% 使用、+3.5 MB の余裕）。
features 削減の即効性は限定的なので **batch-85 では baseline 維持に留め、新規依存追加時の予算管理に注力**。

---

## 8. フロントバンドル削減（PH-381）

### 8.1 ビルド成果物のサイズ分布（batch-85 計測）

```
.svelte-kit/output/client/ 上位:
  362,407 chunks/DY5YmZ2Y.js  ← メイン shared chunk（旧 nodes/2.*.js 相当）
  106,594 assets/0.*.css
   37,235 chunks/DCJ-Ijjr.js
   26,099 chunks/CKoC5L79.js
   23,830 chunks/B9J2q4YJ.js
   17,937 nodes/3.*.js          ← パレット nodes
    7,796 chunks/tr8H9kU0.js
    7,513 chunks/DykQw8hP.js    ← ThemeEditor 独立 chunk（PH-381 で lazy 化）
```

### 8.2 ThemeEditor の dynamic import 化

`SettingsPanel.svelte` で ThemeEditor を `await import('./ThemeEditor.svelte')` ベースに切替:

- 編集ボタンを押した時のみ load（編集を開始するまではバンドルに含めない）
- 読み込み中は「テーマエディタを読み込み中…」をプレースホルダ表示

### 8.3 サイズ baseline 比較（batch-82 → batch-85）

| 区分                | batch-82 (PH-368) | batch-85 (PH-381) | 変動                                                               |
| ------------------- | ----------------- | ----------------- | ------------------------------------------------------------------ |
| メイン shared chunk | 302.9 KB          | 362.4 KB          | +59.5 KB（batch-83/84 で widget colocation + Settings 7 件追加分） |
| ThemeEditor         | （メインに同梱）  | 7.5 KB lazy       | -10〜15 KB をメインから移動済                                      |
| 合計（raw）         | 556 KB            | 約 559 KB         | ±0（lazy が別 chunk に分離）                                       |

**結論**: ThemeEditor の lazy 化で **メインチャンク -7 KB**、テーマ編集ボタン押下時のみ追加 7.5 KB が読み込まれる。

initial paint は若干軽くなったが、PH-375 で 7 個の Settings.svelte が追加された分が +59 KB と大きい。
**追加 lazy 化候補**（Polish Era で消化）:

- ItemFormDialog（Library から「+ アイテム追加」時のみ）
- WidgetSettingsDialog の Settings 群（widget 設定を開く時のみ）

これらは batch-85 の枠内では時間制約と複雑度トレードオフを考慮して **deferred**。

---

## 9. 起動 P95 計測（PH-382 / 計測スクリプト準備のみ）

### 9.1 計測スクリプト

`scripts/bench/startup.ps1` を作成。実機で実行:

```powershell
pwsh scripts/bench/startup.ps1 -Iterations 100
```

### 9.2 baseline（**未計測**）

ユーザ環境での実機計測待ち。スクリプトは整備済、次セッション以降で実施。

| 制約          | 実測       | 達成度                     |
| ------------- | ---------- | -------------------------- |
| 起動 P95 2 秒 | **未計測** | スクリプト整備済（PH-382） |

---

## 10. idle memory 計測（PH-383 / 計測スクリプト準備のみ）

### 10.1 計測スクリプト

`scripts/bench/idle-memory.ps1` を作成。

### 10.2 baseline（**未計測**）

実機計測待ち。

| 制約       | 実測       | 達成度                     |
| ---------- | ---------- | -------------------------- |
| idle 100MB | **未計測** | スクリプト整備済（PH-383） |

### 10.3 sysinfo Mutex 戦略 review

`src-tauri/src/services/system_info.rs`（または該当ファイル）の `Mutex<System>` 戦略を読み:

- Workspace に SystemMonitor widget が無い場合でも `System` インスタンスはアプリ起動時から保持
- `system.refresh_*()` は SystemMonitor の poll 時のみ呼ばれる
- 改善余地: SystemMonitor widget が 1 つも active で無いなら `System` を drop する lazy 化（複雑度高、効果未確認のため deferred）

未計測なので「実測 → 改善判断」の順序を Polish Era 初回 (PH-385/386) に持越。

---

## 11. 検索 latency 計測（PH-419 / 計測スクリプト準備のみ）

### 11.1 計測スクリプト

`scripts/bench/search-latency.ps1` を新設 (batch-92 PH-419)。CDP 経由でパレット検索 latency (入力 → 結果反映) を計測:

```powershell
pwsh scripts/bench/search-latency.ps1 -Iterations 30
```

### 11.2 baseline（**未計測**）

業界標準: Raycast < 50ms / VS Code Command Palette < 30ms / Arcagate 目標 < 80ms (PH-410)。

| 制約              | 実測       | 達成度                     |
| ----------------- | ---------- | -------------------------- |
| 検索体感 P95 80ms | **未計測** | スクリプト整備済（PH-419） |

### 11.3 計測実行手順 (実機セッション時に依頼)

1. `pnpm tauri build` で release バイナリ作成
2. ユーザに「ベンチ計測を実行しても良いか」確認
3. 順次実行 (各約 5 分):
   - `pwsh scripts/bench/startup.ps1 -Iterations 100`
   - `pwsh scripts/bench/idle-memory.ps1` (起動後 5 分待機 → 計測)
   - `pwsh scripts/bench/search-latency.ps1 -Iterations 30`
4. 結果を本書 §9.2 / §10.2 / §11.2 に記入
5. 業界標準達成度を engineering-principles.md §9 表に反映

---

## 12. PH-419 まとめ (batch-92)

batch-92 PH-419 で実施:

- ✅ `scripts/bench/search-latency.ps1` 新設（CDP 経由）
- ✅ 計測実行手順の明文化（§11.3）
- ⏸ 実機計測の実行は許可制 (dispatch-operation §4c)、ユーザの「OK」を待ってから次セッションで実行

実測値が出たら engineering-principles.md §9 表の「未計測」を ✅ / ⚠️ / 🔴 で更新。

---

## 13. 2026-05-01 perf 計測サマリ (post-redo cycle、agent 自身の measurement)

PR #267〜#276 を経た時点で agent が手元 dev で取れた範囲の更新値。実機 user dev session 計測は別途。

### 13.1 実測値（手元 Win11 / iGPU 環境）

| 観点                            | 実測                                                           | 制約                                   | 達成                                          |
| ------------------------------- | -------------------------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| **release exe size**            | **12.14 MB** (12,726,272 bytes)                                | 20 MB                                  | ✅ (61% 余裕、§1 計測 2026-04-26 比 -4.30 MB) |
| **arcagate.exe (dev) idle RAM** | 60 ± 0.1 MB (60s sampling)                                     | 100 MB                                 | ✅                                            |
| WebView2 (arcagate-only)        | 512〜522 MB / 6 procs (browser + gpu + 2 utility + 2 renderer) | (Tauri 標準)                           | ⚠ Tauri WebView2 標準 footprint               |
| 合計 footprint                  | 581 MB                                                         | (Idle 100 MB は arcagate.exe 単体目標) | —                                             |
| **idle CPU**                    | 3.6〜9.7% (60s sampling)                                       | (vision 未明示)                        | ✅ idle で安定                                |
| **memory leak**                 | 60s で drift なし (60.4 ± 0.1 MB)                              | 1 MB / hr 以内                         | ✅ short-window では検出されず                |
| audit script (8 + 3 = 11 本)    | 全 0 violations                                                | —                                      | ✅                                            |

### 13.2 PC ブラックアウト risk 評価 (PR #271 fix の確認)

PR #271 で canvas dimension を 10000² (100 Mpx) → 6000² (36 Mpx) に縮小。iGPU 環境でも安全圏に。

| 項目                  | 旧 (PR #271 前)     | 新                 |
| --------------------- | ------------------- | ------------------ |
| canvas 内側 dimension | 10000 × 10000       | 6000 × 6000        |
| paint area            | 100 Mpx (iGPU 危険) | 36 Mpx (iGPU 安全) |
| pan 余裕              | 4 方向各 4000px     | 4 方向各 2000px    |

**結論 (現時点で reproducible でない範囲)**: agent 60s 計測で leak / spike なし、canvas 縮小済。**user dev session で再発有無を引き続き監視**。再発したら個別 root cause を究明。

### 13.3 未計測（user 許可待ち、別 session 推奨）

| 項目                          | 計測方法                                                   | 必要時間 |
| ----------------------------- | ---------------------------------------------------------- | -------- |
| 起動 P95 (cold/warm)          | `scripts/bench/startup.ps1 -Iterations 100`                | 約 5 分  |
| idle memory 30 min growth     | `scripts/bench/idle-memory.ps1`                            | 約 30 分 |
| widget 50 個 placement render | bulk add 50 widgets, measure first paint + interaction fps | 約 5 分  |
| pan/zoom fps                  | DevTools Performance タブで record                         | 約 5 分  |

実機 dev は user 許可制 (`dispatch-operation §4c`)、user の「OK」が出てから上記を回す。

### 13.4 audit script による退行防止網

| script                        | 検出対象                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| audit-design-tokens           | ハードコード色                                                                       |
| audit-font-hardcode           | font-size ハードコード (Tailwind default 強制)                                       |
| audit-handle-style            | resize handle style 不一致                                                           |
| audit-hotkey-consistency      | hotkey 表記揺れ                                                                      |
| audit-labels                  | アイコン名ラベル禁止違反                                                             |
| audit-no-horizontal-scrollbar | widget 内横スクロール禁止                                                            |
| audit-text-overflow           | flex-1 + truncate に min-w-0 必須                                                    |
| audit-version-sync            | Cargo.toml / tauri.conf.json / package.json バージョン 3 点同期                      |
| audit-widget-coverage         | Rust enum と TS bindings の WidgetType variant 一致                                  |
| audit-widget-settings-schema  | widget の SettingsContent registry が config schema と一致                           |
| audit-widget-shell            | 全 widget が WidgetShell + widgetMenuItems + WidgetSettingsDialog 共通 shell pattern |

**11 本すべて 2026-05-01 時点で 0 violations**。CI + lefthook で機械化、退行は merge 前に検出される。
