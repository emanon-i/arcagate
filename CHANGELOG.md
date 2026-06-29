# Changelog

All notable changes to Arcagate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/emanon-i/arcagate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/emanon-i/arcagate/releases/tag/v0.1.0
