# Changelog

All notable changes to Arcagate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Docs

- doc 整備・再編 (夜間バッチ) — **SSOT + 遅延ロードの 3 層構造**に再編:
  - **AGENTS.md = 全体地図 (Map/Router)** に (177→76 行)。中身を持たず、doc マップ + ルーティング表
    (タスク種別→正本) + 最低限のコマンド + 進め方要点だけに絞る。詳細規約は正本へ参照で導く
  - **各フォルダの `CLAUDE.md`** を新設 (`src-tauri/` `src/` `docs/`)。その領域の局所地図として
    作業時に遅延ロードされ、正本へリンクする (常時全ロードを回避)
  - コーディングルール・詳細規約を **`.claude/rules/`** へ移設 (正本)。**CLAUDE.md は `@AGENTS.md` 委譲のみ**。
    Claude Code の rules 仕様 (1 file=1 topic / 検証可能な箇条書き / `paths:` frontmatter で条件ロード) に準拠させ、
    旧 `engineering.md` を scope 別 3 file に分割: `backend.md` (`paths: src-tauri/**`) / `frontend.md` (`paths: src/**`) /
    `docs.md` (`paths: docs/**/*.md`)。`workflow.md` は全体規律として無条件ロード (paths 無し)
  - **SSOT 化**: perf 予算 (起動/Palette/item/メモリ/CPU/exe) の重複を `vision.md §UX 標準` に一本化し、
    l0 / vision §2.1・§4 / foundation §10 は数値を複製せず参照 (100↔120MB / 2↔2.5秒 の drift 解消)
  - stale・矛盾・感情表現の修正: widget 数 hardcode (12/14/15) → `src/lib/widgets/` 参照 (実数 16)、
    foundation §8 の古い docs ツリー、support の log path (`com.arcagate.desktop`)、operations の
    壊れた自己リンク・guideline 参照、INSTALL の 24h 自動チェックを実装済へ、lessons 見出しの感情語除去、
    再編で dangling 化した `CLAUDE.md <critical-rule>` 参照を `.claude/rules/` へ張り替え、
    全アクティブ doc の相対リンク切れ 0 を機械チェック
  - screens ↔ features/screens の役割分担を双方向バナーで明示 (削除・単一化は履歴保全のため見送り)
- V2 (パーソナル活動トラッカー) の spec-first 文書化: L0 動機 + L1 要件 (REQ-20260702-001〜006) + L2 仕様 (Activity Recorder / Activity Store / Activity Privilege Separation / Activity CLI / Activity 画面) を追加。芯 = 「ファイル/パス単位の操作ログを蓄積・集約し、後から path 経由で調査できる」低負荷パーソナル活動トラッカー。各信号の取得可否は user 実機で検証済み (2026-07-02: GetLastInputInfo / SMTC / USN queryjournal は非 admin 可、USN readjournal は admin 必須 = Error 5、ReadDirectoryChangesW fallback は非 admin 可)
- 改名候補 (Outpost / Runboard / Actarium) は全て NO-GO、Arcagate 継続で確定済 (operations.md)
- living doc (L0/L1/L2) の lean 化: 「現状のあるべき姿だけを簡潔に」を原則とし、本文中の経緯ナレーション (「除去済み」「廃止」「撤回済」「migration 0NN で廃止」「過去合意」等) を除去して現在形の規範・状態へ言い直した (前回の「履歴ごと本文に保持」方針を撤回)。効いているガードレール (token 経由必須 / 命名禁止等) は現在形で残置。除去した廃止事実は以下に集約しトレース可能に:
  - **Industrial Yellow / 蛍光イエロー direction**: 2026-05-07 撤回 (配布水準にそぐわず daily-use で疲れる)。anti-goal として motivation.md に現在形で残置
  - **builtin theme の変遷**: Cyan Steel / Coral Wine / Liquid Glass / HUD を廃止 (migration 032 / 041 相当、HUD は PH-CF-800 F1 で user 判断)。現行は glass / neumorph / brutalist × Dark/Light の 6 本。「Liquid Glass」表記は user 表示・内部実装とも不使用 (naming ban として継続)
  - **design token 方式の刷新** (2026-05-18): 旧「theme ごとに全 `--ag-*` 色を手列挙」方式 (migration 011〜024) を廃し、seed 8 値 + 色彩学的自動派生 + aesthetic 直交軸へ
  - **accent コントラスト**: 全 6 builtin の `--c-primary` を L≈0.50 帯へ調整し white-on-primary ≥ 4.5:1 を達成 (旧値は 1.3–4.0:1 で WCAG 違反、PH-CF-800 F2)。契約は cross-cutting/design-tokens.md に現在形で残置
  - **OS 追従 (system) テーマモード撤廃**: builtin は明示選択のみ
  - **MCP 連携廃止** → Agent-first CLI (`arcagate_cli` を Agent tool / Skill 経由で直呼び、PH-003-H)
  - **Workspace 編集モード toggle 廃止** → 常時編集可能 (モードレス、pointer-up / config 変更で即 IPC+DB)
  - **branch 起点 develop 廃止** → main 起点
  - **L2 feature docs の per-doc 経緯除去**: 各 spec の「旧実装は…だった (bug 説明)」型ナレーション・bugfix 日付・撤去済フィールド記録 (ClockWidget 廃止 / sort_field 'recent' / sticky-bar token / content-visibility 仮想化 / item_id→item_ids 統合 / widget max_items config 等)・doc merge provenance (旧 distribution/ 6 file 統合 / 旧 4 file 統合 / llms.txt 廃止) を本文から除去し現在形へ。schema の migration provenance と現行ガードレール (audit gate / 再導入禁止) は残置。個別事実は git log で追跡可能

## [0.1.1] — 2026-07-01

dev⇔packaged 検査で判明した packaged 固有の不具合を修正。

> **注意**: v0.1.0 は updater の不具合（updater capability 欠落で auto-update 不可）のため削除しました。v0.1.0 利用者は本 v0.1.1 を手動で再インストールしてください。

### Added

- single-instance: 2 個目の起動で既存ウィンドウを前面化し、複数インスタンスが同一 DB を開く競合を防止 (#10)

### Fixed

- 自動アップデータが capability 欠落 (`updater:default` 未付与) で動作しなかったのを修正 — auto-update が有効に (#9)
- Windows で git / アイコン抽出の背景プロセス実行時にコンソールウィンドウが点滅する問題を抑止 (CREATE_NO_WINDOW、背景 spawn を共通 factory に集約 + 再発防止 audit)

### Changed

- release ビルドから devtools (inspector) を除外 (debug ビルドでは従来どおり自動有効) (#6)

## [0.1.0] — 2026-06-26

初回 GitHub Release (Library overhaul L1-L3 + Workspace canvas rewrite Phase 1+1.1 完了)。

### Added

- Library overhaul: keyboard nav (grid 矢印 / Enter / Esc / Space / Home/End / F3 edit / Delete / Ctrl+A / Ctrl+F / type-to-jump) (#286 内包 → #287)
- Library delete undo (5s window) — `libraryHistory` store + `LibraryUndoSnackbar`
- Library sort dropdown (名前 / 追加日 / 最終更新 × 昇降順)、localStorage 永続化
- Library 検索強化: fuzzy match (subsequence + score 階層分離)、label / target / aliases 横断
- Library bulk operation の sticky top 化 + JSON 書き出し button (#291)
- Industrial Yellow design tokens (`--ag-il-*`)、`IndustrialPanel` / `IndustrialButton` prefab、StatCard smoke 適用 (#285)
- LoadingState を Industrial 化 (蛍光イエロー spinner + 斜線ハッチ) (#292)
- CSS-native virtualization (`content-visibility: auto`、200+ item で frame drop 抑止) (#290)
- Library item batch metadata IPC (`cmd_get_items_metadata_batch`、I3 root cause fix) (#284)
- Frontend 未補足エラー監視 (`error-monitor.svelte.ts`、`unhandledrejection` / `window.error` を toast 通知)

### Changed

- Workspace zoom anchor を cell-coord ratio で書き直し (Reset/Wheel/Fit が業界標準動作に統一) (#282 + #283)
- ItemWidget 空状態を 1 click で picker 直開き (旧 2 step UX 排除) (#284)
- `cmd_extract_item_icon` を `tauri::async_runtime::spawn_blocking` で非 block 化 (PowerShell icon 抽出による main thread 占有解消)
- Library mutation 後の sidebar 件数 stale を refresh helper で自動同期 (#284)
- LibraryCard の per-item `$effect` IPC を `metadataStore` 経由 batch + cache に書き換え (TTL 60s、in-flight dedup) (#284)
- ExeFolder / FileSearch の起動経路を `launchItem` に切替 (launch_log 記録漏れ解消) (#284)

### Fixed

- Workspace dead zone (左 / 上の壁) 解消 + Fit ボタン修正 + 配置範囲 12×64 拡張 (#279)
- post-checkup-redo3 で user 報告 5 件の critical bug を root cause で修正 (#278)
- iGPU PC ブラックアウト risk 解消 (canvas 10000×10000 → 6000×6000) (#271)
- Codex review high / medium 計 12 件 (#270 / #272 / #283 / #284 / #285 / #287)
- LibraryCard の「null × null」 表示 bug、ItemWidget 設定画面 empty state UX 整理 (#281)
- SnippetWidget inline 操作 (add / edit / delete を widget 上で完結) (#280)

### Removed

- ClockWidget を完全廃止 (4 回 fix 後 user 体感不改善のため、user 判断、 #274)

[Unreleased]: https://github.com/emanon-i/arcagate/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/emanon-i/arcagate/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/emanon-i/arcagate/releases/tag/v0.1.0
