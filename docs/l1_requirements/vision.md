# Arcagate ビジョン・要求ドキュメント

## 1. プロダクトの目的・背景

### 1.1 解決したい課題・ペイン

- アプリの起動元がバラバラ（Steam、DMMゲーム、ブラウザゲーム、各種ランチャー等）で一元管理できていない
- 同一アプリの複数バージョン（Blender 3.x / 4.x 等）の切り替えが煩雑
- PowerShellスクリプトやClaude Code起動などの定型操作に手数がかかる
- 既存のランチャー代替ツールは、モダンなUIでないか動作が重いか、開発ツールとゲームを同列に扱えない

### 1.2 想定ユーザー／ペルソナ

- 個人開発者（自分自身）
- ゲーム・開発ツール・スクリプトを日常的に多数使い分けている
- キーボード操作を好み、起動までの手数を最小化したい

### 1.3 ビジネス上のゴール

- 毎日開くアプリとして常駐させ、起動の手間を削減する
- 品質バーは**配布・販売に耐える水準**を狙う。現状は開発者自身が毎日使うツールとして磨き込み、将来的な配布・販売はオプションとして開いておく（GitHub public により公開状態）
- ゼロコスト運用を継続（OSS・無料サービスのみ。配布前提になるなら code signing 等の必要コストは別途検討）

## 2. 制約条件・前提

### 2.1 動作環境

| 項目             | 内容                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| プラットフォーム | Windows x86-64 優先（クロスプラットフォームは設計上意識するが対応しない） |
| 技術スタック     | Tauri + Svelte（UI）+ Rust（バックエンド）+ SQLite（ローカルDB）          |
| 常駐メモリ       | Idle時 Working Set 120MB以下                                              |
| 起動時間         | ホットキー押下からUI表示まで P95 2.5秒以内                                |
| バイナリサイズ   | インストーラーなし単体exe 20MB以下                                        |
| コスト           | ゼロコスト運用                                                            |

### 2.2 スコープ外

- クラウド同期（ローカル完結が原則）
- Linux / macOS ネイティブ対応
- ターミナルエミュレータ統合

## 3. 機能要求一覧

### アイテム登録・管理

- **ID**: REQ-20260226-001
- **優先度**: 高

任意の実行ファイル・URL・フォルダ・スクリプトを統一アイテムモデルで登録できる。ラベル・アイコン・カテゴリ・検索用別名を設定可能。exeのドラッグ&ドロップで即登録（アイコン自動取得付き）。

### コマンドパレット検索・起動

- **ID**: REQ-20260226-002
- **優先度**: 高

コマンドパレットから名前で検索・起動できる。「ホットキー → 名前入力 → Enter」が最速経路。

### システムトレイ常駐・ホットキー

- **ID**: REQ-20260226-003
- **優先度**: 高

システムトレイに常駐し、グローバルホットキーでどの画面からでもコマンドパレットを呼び出せる。Windows起動時の自動起動に対応。

### 起動ログ・ソート

- **ID**: REQ-20260226-004
- **優先度**: 高

起動回数・最終起動日時をSQLiteに記録し、頻度順・最近使った順で表示できる。

### データエクスポート/インポート

- **ID**: REQ-20260226-005
- **優先度**: 中

SQLiteデータ一式をエクスポート/インポートできる。

### セットアップウィザード

- **ID**: REQ-20260226-006
- **優先度**: 中

初回起動時のシンプルなセットアップウィザード。

### センシティブコンテンツの隠蔽

- **ID**: REQ-20260226-007
- **優先度**: 中

タグに「デフォルト非表示」フラグを設定でき、ホットキーまたはパスワードでトグル表示。

### コマンドパレット拡張（CLI・内蔵コマンド）

- **ID**: REQ-20260226-008
- **優先度**: 中

CLIからのアイテム操作、クリップボード履歴・スニペット・電卓の内蔵コマンド、カテゴリプレフィックスによる名前空間絞り込み。

### ファイルシステム監視・パス自動追跡

- **ID**: REQ-20260226-009
- **優先度**: 中

ファイルシステム監視による登録済みアイテムのパス変更自動追跡。

### ワークスペース

- **ID**: REQ-20260226-010
- **優先度**: 中

ユーザーが任意のページを作成しウィジェットを自由配置。よく使うもの・最近使ったもの・プロジェクト一覧・監視フォルダを内蔵ウィジェットとして提供。テーマ（ダーク・ライト・カスタムカラー）切り替え、シェイプ設定、テーマのインポート/エクスポート。Gitステータス表示。

### Agent-first CLI 連携

- **ID**: REQ-20260226-011
- **優先度**: 中

Claude Code / エージェントからは `arcagate_cli` を Agent tool / Skill 経由で直接呼び出す。MCP サーバーは持たない（CLI が単一の連携経路）。

### 活動ログ収集（V2・パーソナル活動トラッカー）

- **ID**: REQ-20260702-001
- **優先度**: 高（V2 core）

窓（前面プロセス名＋実行イメージパス＋タイトル）・実操作（放置 vs 能動）・再生メディア（曲/動画、アプリ横断）・**ファイル操作（作成/編集/削除/リネームを path 単位）** を標準で全部収集する。すべて完全ローカル保存、外部送信ゼロ。取得手法は実機検証で捕捉可能を確認済み（§活動トラッカー実現性）。

### ファイル操作ログ（Git を補完する活動記録）

- **ID**: REQ-20260702-002
- **優先度**: 高（V2 core・差別化の芯）

ファイルの作成/編集/削除/リネームを path 単位で記録し、後から「あの日どの path を触ったか」を遡れる。AI が生成・編集したファイルも Git 外の変更（未コミット・非 repo・素材/出力）も捕捉する。全ボリューム対象、完全ローカルゆえフル捕捉。

### 絶対的低負荷（一級の非機能要件）

- **ID**: REQ-20260702-003
- **優先度**: 高（V2 core・ゲート条件）

活動ログ収集は常駐しても CPU / IO / メモリ / 電力を食わない。イベント駆動または軽量ポーリングのみ。フルスキャン・ハッシュ差分・低レベルフック・常時カーネルトレースは採らない。ファイル操作は NTFS が既に書く USN Change Journal を読むだけ（per-file hash も全走査も不要）。「観測しているせいで重くなる」を禁止する。

### 権限分離セキュリティ（特権収集の隔離）

- **ID**: REQ-20260702-004
- **優先度**: 高（V2 core・security）

フル捕捉に必要な管理者権限は、「USN 等を**読むだけ・コード実行能力ゼロ**」の収集コンポーネントに閉じ込める。実行機能（既存 launcher = アプリ/スクリプト起動）は非特権のまま分離し、特権側を任意実行の踏み台＝攻撃面にしない。最小権限。信頼境界を doc に明記する（[Activity 権限分離](../l2_foundation/features/cross-cutting/activity-privilege-separation.md)）。

### 統合ビュー・活動ログ可視化画面

- **ID**: REQ-20260702-005
- **優先度**: 高（V2 core）

watcher 縦割り・信号サイロを否定し、時間軸で全信号を 1 つに合流させた統合データモデルの上に、Library / Workspace と並ぶ第 3 の画面「Activity」を新設する。「今日どこに時間が行ったか」を一目で（3 秒到達）。glass 質感・毎日眺めたくなる glanceable UI。ウィンドウバー中央の画面切替を 2 択（Library / Workspace）から 3 択トグルに拡張する。

### 活動データの抽出・export

- **ID**: REQ-20260702-006
- **優先度**: 高（V2 core・両輪の一方）

自分の活動データを UI と CLI（`arcagate_cli`）から自由に抜き出す。出力形式は CSV / JSON / 生イベント、加えて **期間指定の期間サマリ Markdown** を提供する。Markdown サマリは **デフォルト＋カスタムの 2 本立てのテンプレート機構**で組み立て、`{{変数}}` を差し込んでプレビューで確認できる（Obsidian Web Clipper 型）。テンプレートはコマンドで取得・設定・編集し、使える変数の一覧と意味もコマンドで引ける。期間指定＋filter（app / path / type）で部分抽出、「1 押しで数秒」の手軽さ。出力の貼り先は user の任意で、特定ツールを前提にしない（Obsidian vault はその一例）。CLI にクエリ/抽出/テンプレートサブコマンドを追加する（[Activity CLI](../l2_foundation/features/backend/activity-cli.md)）。

### 活動のカテゴリ分類（コマンドベース・外部 AI 駆動）

- **ID**: REQ-20260702-007
- **優先度**: 中（V2・両輪を活かす）

活動へのカテゴリ（タグ）分類を **コマンドベースで、何度でもやり直せる（冪等・再実行可能）** 形で提供する。分類はルールベース（matcher → category）で決定論的に再計算し、AI をアプリ内に組み込まない。代わりにデータとコマンドを外に開き、**未分類データを CLI で吐き、user 自身の AI（Claude / Codex 等）が分類してタグ付けコマンドを冪等に流し込める**導線を用意する（AI 非依存・外部 AI 駆動）。CLI に分類ルールの list / set / rm / apply / untagged サブコマンドを追加する（[Activity CLI](../l2_foundation/features/backend/activity-cli.md)）。

## 4. 非機能要求

| 項目               | 要求                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| 常駐メモリ         | Idle時 Working Set 120MB以下                                                |
| 起動レイテンシ     | ホットキー押下→UI表示 P95 2.5秒以内                                         |
| バイナリサイズ     | 単体exe 20MB以下                                                            |
| データ保存         | ローカル完結（SQLite）。活動ログも一切外部送信しない                        |
| 活動 recorder 負荷 | 稼働中の CPU 使用率増分 平均 1% 未満（イベント駆動 / 軽量 poll のみ）       |
| 活動 DB 肥大防止   | 時系列は retention + downsampling で上限内（生1日→1分平均1週→1時間平均1年） |

## 5. 参考・類似サービス

| ツール                                         | 参考にできる点                       | Arcagateの差別化                                     |
| ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| [Raycast](https://www.raycast.com/)            | プラグイン思想・クイックアクセスのUX | Windowsネイティブ・軽量・ワークスペース+ファイル管理 |
| [Flow Launcher](https://www.flowlauncher.com/) | プレフィックス操作・プラグイン構造   | モダンUI・ワークスペース概念                         |
| [Listary](https://www.listary.com/)            | ファイル検索統合・軽量設計           | ウィジェット/ワークスペース・無料                    |
| [Playnite](https://playnite.link/)             | プラグイン構造・ゲーム管理UI         | ゲーム+開発ツール+スクリプトの統合管理               |

**差別化の核**: ゲーム・開発ツール・スクリプト・URLを同一アイテムとして扱い、ワークスペースとCLIで拡張できる組み合わせを持つ競合がない。

---

# Part 2: Release Readiness Criteria

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

### A1. 主要 widget 動作（全 widget、現行 16 種）

- **Verification**: 各 widget を Workspace に追加 → 設定 → 主要操作（起動 / 削除 / config 編集）を実機 dev で実行
- **Pass**: 全 widget で crash 無し、各主要操作が 1 回で完了（現行の widget 集合は `src/lib/widgets/` が単一情報源）
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

### B2. Widget UX 常識遵守（全 widget × 5 項目）

- **Verification**: 各 widget で 5 項目 = 1) 削除確認 1 step + 5 sec undo / 2) 半透明 / ぼかし backdrop only / 3) label 機能・状態・アクション（icon 名禁止）/ 4) keyboard a11y（Tab / Enter / Esc）/ 5) resize で見切れ無し・設定即反映
- **Pass**: 全観測点（widget 数 × 5）で違反 0、または各違反に fix PR 紐付け
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

- **Pass**: P95 ≤ 3200ms（CI windows-latest 実測 baseline + 約 33% regression 帯）
- **Note**: この値は regression 検出器。 baseline は直近 10 run の cold P95 中央値 ≈ 2450ms。 user 実機 (SSD 専用ストレージ) ではこれより十分速い。

### D2. アプリ起動 P95 (warm)

- **Pass**: P95 ≤ 2800ms（CI windows-latest 実測 baseline + 約 33% regression 帯）
- **Note**: 同上（regression 検出器）、 baseline は直近 10 run の warm P95 中央値 ≈ 2100ms。

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

- **Pass**: README or `docs/l1_requirements/operations.md` に support 経路

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

---

# Part 3: UX Standards (numeric specs)

# Arcagate UX 標準

Arcagate 固有の数値仕様・実装規約。一般的な UX 原則（WCAG 数値等）は省略する。

---

## パフォーマンス目標値

| 指標             | 目標      |
| ---------------- | --------- |
| アプリ起動 P95   | ≤ 2,500ms |
| Palette 表示 P95 | ≤ 120ms   |
| アイテム起動 P95 | ≤ 200ms   |
| Idle メモリ      | ≤ 120MB   |
| Idle CPU         | ≤ 1%      |
| exe 単体サイズ   | ≤ 20MB    |

---

## モーション標準

### Duration トークン値

| トークン                | 値    | 用途                   |
| ----------------------- | ----- | ---------------------- |
| `--ag-duration-instant` | 80ms  | ドラッグフィードバック |
| `--ag-duration-fast`    | 120ms | ホバー・フォーカス     |
| `--ag-duration-normal`  | 200ms | パネル出現・ダイアログ |
| `--ag-duration-slow`    | 300ms | テーマ切替             |

### Easing トークン値

| トークン           | 値                                     | 用途                                   |
| ------------------ | -------------------------------------- | -------------------------------------- |
| `--ag-ease-in-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | ホバー・パネル・ダイアログ（統一基準） |
| `--ag-ease-out`    | `cubic-bezier(0.0, 0, 0.2, 1)`         | 要素の出現                             |
| `--ag-ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`           | 要素の消去                             |
| `--ag-ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)`    | ドロップ成功                           |

### コンポーネント別仕様

| コンポーネント     | 操作  | duration | easing      | 追加変化                  |
| ------------------ | ----- | -------- | ----------- | ------------------------- |
| Button             | hover | fast     | ease-out    | bg opacity +1 段階        |
| Button             | click | instant  | linear      | scale 0.97                |
| Card / List item   | hover | fast     | ease-out    | bg opacity +1 段階        |
| Dialog             | 出現  | normal   | ease-out    | scale 0.96→1 + fade       |
| Dialog             | 消去  | fast     | ease-in     | scale 1→0.96 + fade       |
| Toast              | 出現  | normal   | ease-out    | translateY -100%→0 + fade |
| Palette            | 出現  | normal   | ease-out    | scale 0.98→1 + fade       |
| D&D ドロップゾーン | over  | fast     | linear      | border-accent + glow      |
| D&D 成功           | drop  | fast     | ease-bounce | scale 1.02→1              |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --ag-duration-instant: 0ms;
    --ag-duration-fast: 0ms;
    --ag-duration-normal: 0ms;
    --ag-duration-slow: 0ms;
  }
}
```

全アニメーション要素に `motion-reduce:transition-none` を付与する。

---

## 状態別カラー差分ルール

| 状態     | 背景                      | ボーダー                    | テキスト            |
| -------- | ------------------------- | --------------------------- | ------------------- |
| default  | `surface-0` / `surface-1` | `--ag-border`               | `--ag-text-primary` |
| hover    | `surface-2` / `surface-3` | `--ag-border-hover`         | `--ag-text-primary` |
| focus    | `surface-2`               | `--ag-accent-border`        | `--ag-text-primary` |
| active   | `surface-4`               | `--ag-accent-border`        | `--ag-text-primary` |
| disabled | `surface-0`（変化なし）   | `--ag-border`               | `--ag-text-faint`   |
| selected | `accent-active-bg`        | `--ag-accent-active-border` | `--ag-accent-text`  |

---

## Widget 仕様

### Grid セルサイズ

- BASE_W = 240px / BASE_H = 135px（16:9、zoom 100%）
- zoom 範囲: 25〜200%
- 実装: `src/lib/state/widget-zoom.svelte.ts` + `src/lib/utils/zoom-math.ts`

### Zoom anchor（Figma / Obsidian 準拠）

- **Ctrl + wheel**: mouse cursor を anchor
- **Ctrl+0 / Reset**: viewport center を anchor、zoom のみ 100% に戻す
- **Ctrl+Shift+1 / Fit**: 全 widget BB 重心を viewport visual center に置く
- 計算式: `T1 = Sm − (Sm − T0) × (z1 / z0)`
- `clampZoom()` 一箇所のみ、scroll は `behavior: 'instant'`

### Widget ヘッダ layout

- 親 flex container に `min-w-0 flex-1`
- icon wrapper に `shrink-0`
- title `<div>` に `min-w-0 flex-1 truncate`
- 右側 menu button に `shrink-0`

### Widget list-row layout（ExeFolder / FileSearch / Snippet 等）

- row container に `min-w-0`
- icon: `shrink-0`（固定 16px）
- name: `min-w-0 flex-1 truncate`
- suffix（count chip 等）: `shrink-0`

### Widget config 変更時の state 取り扱い

`$effect` で config 派生の async 取得をする場合:

1. effect 開始時に派生 state を即時 clear（旧結果が残らないように）
2. `requestId`（カウンタ）を発行し、古いレスポンスを破棄

### Item 参照 widget の cascade

Widget が item_id を保持している場合、Library でアイテム削除時に Rust 側 (`workspace_repository::cascade_remove_item_from_widgets`) が全 widget config を scan して該当 ID を除去する。削除確認 dialog は `cmd_count_item_references(id)` で参照 widget 数を表示する。

---

## Workspace Canvas 仕様

### 3 階層構造（新機能追加時は必ずどの階層に属するか明示）

1. **背景（固定）** — wallpaper / 最背景 absolute layer。canvas の外側に配置。pan の影響を受けない
2. **Toolbar（固定）** — PageTabBar（上部）/ Undo toolbar（右下）/ HintBar（下部）。canvas の sibling として `relative z-XX shrink-0` で配置
3. **Content（scroll/pan）** — widget grid。canvas（overflow-auto）内の 5000×5000 infinite wrapper 内に配置。初期 scroll は (1900, 1900) 付近

**禁止:** wallpaper を canvas 内に置く（pan で動く）/ toolbar を canvas 内に置く（pan で消える）

### Workspace は常時編集可能

モードレス（編集モード toggle を持たない）。pointer-up / config 変更で即 IPC + DB 反映。誤操作回復は Undo/Redo。

### Overlap reject（全経路で適用）

| 経路             | 動作                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| panel click 追加 | `findFreePosition` で空き探索、null なら toast「空きスペースがありません」+ 追加せず |
| drag 追加        | `wouldOverlapAt(x, y)` overlap → toast + 追加せず                                    |
| 移動             | overlap → toast + 元位置維持                                                         |
| リサイズ         | `clampResizeForOverlap` で rubber-band                                               |

実装: `src/lib/utils/widget-grid.ts`

### Obsidian 入力マッピング

| 入力                            | 動作               |
| ------------------------------- | ------------------ |
| Ctrl + wheel                    | zoom               |
| Shift + wheel                   | 横 scroll          |
| 中ボタン drag / Space + 左 drag | 自由 pan           |
| Ctrl+0                          | zoom 100% リセット |
| Ctrl+Shift+1                    | Fit to content     |
| Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y  | Undo / Redo        |

### Undo/Redo system

- 種別: add / remove / move / resize / config（5 種）
- 50 件 ring buffer、undo 後の新 mutation で redo stack 破棄

### Widget 選択・削除 UI

- 選択 widget のみに selection ring (`ring-2 ring-[var(--ag-accent)]`) + drag bar + × button + 8 方向 resize handle を表示
- 非選択 widget には handle を一切表示しない（認知ノイズを避ける）

### Resize handle（8 方向、実装: `WidgetHandles.svelte`）

edge: 1.5px ストリップ（hover で半透明 accent）/ corner: 12×12 chip（hover で scale-125 + accent border）

---

## Button バリアント

| バリアント  | 背景             | テキスト              | ボーダー            |
| ----------- | ---------------- | --------------------- | ------------------- |
| primary     | `--ag-accent`    | `#090b10`（ダーク時） | なし                |
| secondary   | `--ag-surface-1` | `--ag-text-primary`   | `--ag-border`       |
| ghost       | transparent      | `--ag-text-secondary` | なし                |
| destructive | `--ag-error-bg`  | `--ag-error-text`     | `--ag-error-border` |

---

## Library カードサイズ

| サイズ | トークン        | 用途                                 |
| ------ | --------------- | ------------------------------------ |
| S      | `--ag-card-w-s` | コンパクト一覧                       |
| M      | `--ag-card-w-m` | 標準                                 |
| L      | `--ag-card-w-l` | サムネイル重視（ゲームライブラリ等） |

具体値は `src/lib/styles/arcagate-theme.css` の `--ag-card-w-*` 参照。

---

## デスクトップ UI 優先順位

実装前後のセルフレビューに使う。この順序で判断する:

1. **操作できること**
2. **結果が分かること**
3. **失敗しても立て直せること**
4. **意味が理解できること**
5. **一貫していて予測できること**
6. **素早く使えること**
7. **最後に見た目が整っていること**

見た目の洗練は 1〜6 を満たした後で意味を持つ。

### 実装後チェックリスト

- [ ] クリック直後に「何か起きた」と分かるか
- [ ] 完了時・エラー時に結果を読み取れるか
- [ ] 誤操作しても回復できるか（Undo / トースト / キャンセルがあるか）
- [ ] 主要操作が補助操作に埋もれていないか
- [ ] OS の慣習（右クリック、Esc、Enter、Tab、Ctrl+Z）を破っていないか
- [ ] キーボードだけで主要操作が完結するか
- [ ] 空状態・ローディング・エラー状態の表示があるか
- [ ] 装飾が操作対象を邪魔していないか（widget handle は選択時のみ表示）
- [ ] 設定変更が即時反映されているか（保存ボタン不要が原則）

### Arcagate 固有の注意点

**選択肢が 1 個のメニューを挟まない。** ボタン押下 = 即アクション。
**ラベルは機能/状態/アクションを書く。** アイコン名（「星」「三本線」）禁止。
**設定変えたら即見た目が変わる。** 遅延反映は欠陥。

---

# Part 4: Design System (tokens)

# Arcagate デザインシステム

Arcagate 固有のトークン体系・テーマ設計。実装ファイル: `src/lib/styles/arcagate-theme.css`。

> token システムは「seed 最小化 + 色彩学的自動派生 + aesthetic 直交軸」。
> **構造定義の正典は [`docs/l2_foundation/design-tokens.md`](../l2_foundation/design-tokens.md)**。 本節は overview。

---

## トークン階層

**3 層構造 (v2):**

1. **Color seeds (`--c-*`)**: theme が触る唯一の色入力 (bg / fg / primary / secondary / glass-tint / warn / error / success)。
2. **Aesthetic primitives**: 色と直交した素材感 (`--ag-radius-*` / `--surface-*` / `--shadow-*` / `--bg-pattern-*` / `--decoration-*` / `--font-family-*`)。 glass / neumorph / brutalist を表現。
3. **Semantic (`--ag-*`)**: コンポーネントが直接参照する派生層。 seed から `oklch(from …)` / `color-mix()` で runtime 計算。
4. **Bridge**: `--ag-*` を shadcn-svelte の `--background` / `--foreground` 等に写す変換層。`app.css` に定義。

---

## Semantic トークン一覧（`--ag-*`）

### Surface（7 段階）

```
surface-page  : ページ背景（最下層）
surface-0     : カード・パネルの基地（最も控えめなサーフェス）
surface-1     : ナビゲーション・サイドバー
surface-2     : インライン入力・ホバー状態
surface-3     : 選択・フォーカス状態
surface-4     : アクティブ・押下状態
surface-opaque: backdrop-filter が使えない環境用の不透明フォールバック
```

### Border（3 段階）

```
--ag-border       : 標準ボーダー
--ag-border-hover : ホバー時ボーダー
--ag-border-dashed: 破線（D&D ドロップゾーン等）
```

### Accent（cyan ベース）

```
--ag-accent              : アクセント色本体
--ag-accent-border       : アクセントボーダー
--ag-accent-bg           : アクセント背景
--ag-accent-text         : アクセントテキスト
--ag-accent-active-bg    : アクティブ状態背景
--ag-accent-active-border: アクティブ状態ボーダー
```

セカンダリ・ターシャリアクセントも同様の suffix 体系で存在（`-secondary*`, `-tertiary*`）。

### Tone（warm / success / error）

各 tone で `-border` / `-bg` / `-text` の 3 種類が定義されている。

### Text（4 段階）

```
--ag-text-primary   : 最高視認性（body text）
--ag-text-secondary : 補助テキスト
--ag-text-muted     : 注釈・プレースホルダー
--ag-text-faint     : 最低視認性（無効状態等）12px 以下での使用禁止
```

### Shadow（5 段階）

```
--ag-shadow-none
--ag-shadow-sm     : ホバーカード
--ag-shadow-md     : フロートメニュー
--ag-shadow-dialog : ダイアログ
--ag-shadow-palette: コマンドパレット
```

### Radius（8 段階）

```
--ag-radius-chip / button / input / card / widget / window / palette / keyhint
```

### Motion（Duration / Easing は ux-standards.md 参照）

### Card sizing

```
--ag-card-w-s / -m / -l
--ag-card-gap
```

### Background layers

```
--ag-backdrop : backdrop-filter 値（テーマごとに異なる）
```

---

## テーマアーキテクチャ

### テーマ種別 (built-in 6 本)

色を seed (`--c-*`) から色彩学的に派生し、 aesthetic (glass / neumorph / brutalist) を
色と直交した軸として表現する。 built-in は 3 系統 × Dark/Light の 6 本、 明示選択のみ
(OS 追従モードは持たない)。

```
BuiltinTheme（DB 保存、 seed + aesthetic は arcagate-theme.css 側で定義、 css_vars は空）
  ├── Dark           (dark  ベース / glass aesthetic)
  ├── Light          (light ベース / whisper aesthetic)
  ├── Brutalist Dark (dark  ベース / モノクロ + dotted grid + mono font + radius 0)
  ├── Brutalist      (light ベース / モノクロ + dotted grid + mono font + radius 0)
  ├── Neumorph Dark  (dark  ベース / 深 surface + dual shadow、 blur 無し)
  └── Neumorph       (light ベース / pastel solid + dual shadow、 blur 無し)

UserCustomTheme（DB 保存）
  └── ユーザが builtin を複製 / JSON import して seed (--c-primary / -secondary) を編集したテーマ
```

### 適用フロー

1. `applyTheme()` が `activeMode`（実テーマ ID）に対応するテーマを取得
2. 解決したテーマの `css_vars` JSON (custom theme の seed override) を `:root` に `el.style.setProperty()` で展開
3. `el.dataset.theme = <解決後 ID>` を設定 → `[data-theme="neumorph"]` 等の aesthetic theme は
   CSS 側で seed + aesthetic primitive を適用
4. semantic token (`--ag-*`) は seed から `oklch(from …)` / `color-mix()` で runtime 派生

### テーマエディタ（Settings > Appearance > ThemeEditor）

- v2: primary 必須 / secondary 任意の color picker + ランダム生成ボタンで seed を決める
- advanced で全 token (`--c-*` / `--ag-*`) の生値編集も可能、変更は即時 CSS var に反映 (live preview)
- ビルトインテーマは「コピーして編集」で UserCustomTheme として保存
- エクスポート: clipboard + JSON ファイル / インポート: JSON 貼り付け + ファイル選択

---

## 背景レイヤ合成モデル — ガラス面の物理積層

glass 面は `.ag-glass` クラスで pseudo-element により層を物理分離する (詳細 `design-tokens.md` §5):

```
直 child : 実 content                       (z 1 — noise より上、 文字鮮明)
::after  : 上端 highlight border             (z 0)
::before : noise grain (SVG fractalNoise)    (z 0)
base 要素: backdrop blur + 半透明 fill        (z auto)
```

noise / blur 強度は aesthetic primitive (`--surface-noise-opacity` / `--surface-blur`) で theme ごとに制御。

---

## color hardcode 禁止

コンポーネントで生 hex / `rgb()` / `rgba()` / `hsl()` / `oklch()` / token 未経由の box-shadow 生色を直接書かない。必ず `var(--ag-*)` / `var(--c-*)` 等の token を経由する。pre-commit `design-tokens` hook (`scripts/audit-design-tokens.sh`) で機械検出される。
