監査を実施し、`§4` の 12 パターンを `spec ⇄ 実装` で照合した結果、**新規の契約逸脱は 0 件**でした。  
また、既存例 `W-1〜W-8` はコード上でも **対処済み（#526）** を確認しました。

ただし、この実行環境は `read-only` のため、指定の report ファイルへの書き込みはポリシーで拒否されました（`Set-Content` が blocked）。  
そのため、以下をそのまま `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` の内容として提示します。

```markdown
# 無駄処理 audit (Functional Spec ベース)

> 2026-05-19 実施。`docs/l2_foundation/features/` の機能契約（特に「やらないこと」「性能予算」「副作用」「依存」）と `src/`, `src-tauri/` 実装を突き合わせて棚卸し。

## サマリ

- spec 外 / 契約逸脱の発見: 0 件
- うち Critical 0 / High 0 / Medium 0 / Low 0
- 推定削減効果: 新規対応不要（既存是正の維持確認）

### 検証して clean だった項目 (誤検知防止のため明記)

| 項目 | 結論 |
| ---- | ---- |
| W-1系: DB lock 保持中 heavy I/O | `src-tauri/src/services/launch_service.rs` で lock スコープ分離済み（preflight/spawn は lock 外） |
| W-2系: heavy I/O command の sync 実行 | 主要 command は `async + spawn_blocking` 化済み（例: `file_search_commands.rs`, `exe_scanner_commands.rs`, `script_commands.rs`, `file_preview_commands.rs`, `url_commands.rs`, `launch_commands.rs`） |
| W-3系: Exe scan cancel 不在 | `cmd_cancel_exe_scan` と `ExeScanState` 実装済み (`src-tauri/src/commands/exe_scanner_commands.rs`, `src-tauri/src/services/file_search_state.rs`) |
| W-4系: Item sort recent no-op | `ItemSettings.svelte` / `ItemWidget.svelte` の `sort_field` は `manual | name` のみ（`recent` 露出なし） |
| W-5/6/7系 dead code | `cmd_git_status` / `cmd_get_item_metadata` / `plugin_api` は現行コードに残存なし（コメント言及のみ） |
| W-8系 legacy chart fallback | System Monitor の旧 `chart_type` fallback 撤去済み（per-metric key のみ） |
| backdrop-filter 過剰 | `src/lib/styles/arcagate-theme.css` の限定箇所のみで、widget 全面適用なし |
| polling 過剰 | spec 下限を満たす clamp 実装（例: clipboard `>=500ms`, system-monitor `>=500ms`, projects `>=10s`） |
| per-card 個別 metadata IPC | `metadataStore` の batch/cached 経路に集約、LibraryCard 側の個別 IPC 撤去済み |

## 発見項目

新規発見なし（0件）。
```

stdout 用サマリ:
- **発見 0 件 / Critical 0・High 0・Medium 0・Low 0 / 推定削減効果: 新規対応不要（既存是正の維持確認）**