実施結果です。`read-only` サンドボックスのため、指定先ファイルへの書き出しはできませんでした。\
そのため、以下をそのまま `docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` に保存してください。

```markdown
# 無駄処理 audit (Functional Spec ベース)

> 2026-05-19 実施。Arcagate を Functional Spec の「やらないこと」「性能予算」と突き合わせて棚卸し。

## サマリ

- spec 外 / 契約逸脱の発見: 2 件
- うち Critical 0 / High 1 / Medium 0 / Low 1
- 推定削減効果:
  - perf: Projects 初回登録時の DB lock 競合による待ち時間を削減
  - 認知負荷: poll 最小値契約の実行時保証を明確化

### 検証して clean だった項目 (誤検知防止のため明記)

| 項目                              | 結論                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-1〜W-8 (既存 audit)             | 対処済を確認。`cmd_scan_exe_folders` async 化+cancel、`cmd_read_file_preview` async 化、Item sort no-op除去、legacy chart fallback除去済。重複カウントなし（既対処 #526） |
| polling 禁止 widget の timer 混入 | Favorites/Recent/Stats/Item で `setInterval` 混入なし                                                                                                                     |
| backdrop-filter 過剰適用          | `src/lib/styles/arcagate-theme.css` の限定クラスのみ                                                                                                                      |
| per-card metadata 個別IPC         | batch/store 経路に統一済、単発 command 復活なし                                                                                                                           |

## 発見項目

### W-9: `auto_register_folder_items` が DB lock 保持中にフォルダ走査を実行

- 重大度: High
- 無駄度: 確実に無駄
- 関連 spec: `docs/l2_foundation/features/cross-cutting/persistence.md`
- 該当コード: `src-tauri/src/services/item_service.rs:316`, `:328`, `:333`, `:335`, `:336`
- spec で禁止されてること: 「重い処理を `Mutex<Connection>` を握ったまま実行しない (lock 解放後に I/O)」
- 現実装が実際にやってること: `auto_register_folder_items` で `db.0.lock()` 取得後、`std::fs::read_dir` と各 entry の `path.is_dir()` をループ処理している
- なぜ無駄か: 監視フォルダが大きいほど lock 保持時間が伸び、同時刻の他 DB 操作（検索・表示更新・設定保存）を待たせる
- 推奨対処: 先に FS 走査で候補 path を集め、DB lock は「既存判定/insert/tag付与」区間だけに縮小
- 工数感: 半日

### W-10: Projects の poll 間隔が実行時 clamp されず、契約下限を破る設定値をそのまま使用可能

- 重大度: Low
- 無駄度: 多分無駄
- 関連 spec: `docs/l2_foundation/features/widgets/projects.md`
- 該当コード: `src/lib/widgets/projects/ProjectsWidget.svelte:226`, `:227` / 参考 `src/lib/widgets/projects/ProjectsSettings.svelte:89`
- spec で禁止されてること: 「poll 間隔を短くしすぎない (最小 10 秒)」
- 現実装が実際にやってること: Settings では clamp しているが、実行側は `config.git_poll_interval_sec * 1000` をそのまま `setInterval` に渡す
- なぜ無駄か: import/手編集/旧データで 10 秒未満が入ると過剰 polling になり、不要な IPC/CPU 負荷を招く
- 推奨対処: 実行側でも `Math.max(10, Math.min(600, ...))` で最終 clamp し、契約を二重化
- 工数感: 〜30分
```

stdout 用 summary:

- 発見 2 件 / Critical 0・High 1・Medium 0・Low 1 / 推定削減効果: DB lock 競合時間削減 + 過剰 polling 抑止

補足:

- 指示どおり実装変更は未実施です。
- ファイル書き出しのみ、環境制約（read-only）で未実行です。
