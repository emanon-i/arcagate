# UX 標準 Part 6 — §14-15 / 参照 / Research

[ux-standards.md](./ux-standards.md) Window translucency / Wallpaper / 参照リンク / UX Research 統合。

## 14. Window Translucency 規格 (PH-issue-008)

- main window: `tauri.conf.json` の `windowEffects.effects: ["mica"]` で Windows 11 Mica を default 適用
- Windows 11 → Mica effective、Win10 / 他 OS → no-op (Tauri が backend で safe skip)
- `html / body` は `background: transparent`、app root container (surface-0 系) で塗る → Mica は外周 / round corner / 影部分にのみ漏れる
- runtime IPC 切替 (Mica / Acrylic / 不透明) は別 plan、現状は Mica default 1 値のみ

## 15. Wallpaper 規格 (PH-issue-009)

- per-workspace 壁紙: `workspaces.wallpaper_path TEXT` (DB 保存、`<app_data_dir>/wallpapers/<uuid>.<ext>`)
- 画像形式: png / jpg / jpeg / webp (ext で validation、それ以外は `cmd_save_wallpaper_file` で reject)
- opacity 0.0..1.0 (default 0.6)、blur 0..40px (default 0)、両方 service 側で clamp
- WorkspaceLayout の `absolute inset-0` 層に `background-image: url(convertFileSrc(path))` を適用、widget content より下 (z-0)
- `motion-reduce:!filter-none` で Reduced Motion 時 blur 無効化 (P11 / Reduced Motion 標準)
- asset protocol scope: `tauri.conf.json` `assetProtocol.scope` に `$APPDATA/wallpapers/**` 追加
- Library 共通 default は別 plan (本 PR は per-workspace のみ実装)

---

## 参照

- `docs/l1_requirements/ux_design_vision.md` — UX ビジョン・ゲーム UI 原則
- `docs/l1_requirements/design_system_architecture.md` — トークン階層・技術設計
- `docs/l0_ideas/arcagate-visual-language.md` — ムードボード・視覚方向性
- `docs/desktop_ui_ux_agent_rules.md` — エージェント向け UX 実装原則

---

## UX Research 統合（batch-91 PH-414）

`docs/l1_requirements/ux-research/` 配下に業界標準リサーチを集約。本セクションは要約 + 参照導線。

### Nielsen 10 Heuristics（適用必須）

詳細: [`ux-research/industry-standards.md §1`](ux-research/industry-standards.md)

各 PR / 機能追加で以下 10 項目を自問:

1. Visibility of System Status（フィードバック適切性）
2. Match Between System and Real World（用語整合）
3. User Control and Freedom（緊急脱出 / undo）
4. Consistency and Standards（業界慣行整合）
5. Error Prevention（事前防止）
6. Recognition Rather than Recall（視認可能）
7. Flexibility and Efficiency of Use（power user / casual 両立）
8. Aesthetic and Minimalist Design（不要排除）
9. Help Users Recognize, Diagnose, Recover from Errors（エラー復旧導線）
10. Help and Documentation（in-app ヘルプ）

batch-92 で 10 ユーザケース × 10 ヒューリスティック = 100 マスチェックリストで HE 実施予定。

### 数値ベンチマーク（業界標準）

詳細: [`ux-research/industry-standards.md §5`](ux-research/industry-standards.md)

| 指標                          | Arcagate 目標 | 業界標準                                                     |
| ----------------------------- | ------------- | ------------------------------------------------------------ |
| ホットキー → パレット表示 P95 | < 100ms       | Spotlight: 即時 / Raycast: ~100ms                            |
| 検索結果表示 P95              | < 80ms        | Raycast: <50ms / Alfred: ms 単位                             |
| アニメーション duration       | 100-500ms     | Material 3: トグル 100ms / ボタン 300-500ms / 一般 400-500ms |
| idle メモリ                   | < 100MB       | Raycast: ~80MB / Alfred: 軽量                                |
| exe size                      | < 20MB        | Tauri 系 10-50MB                                             |

実測は `scripts/bench/startup.ps1` / `scripts/bench/idle-memory.ps1` で取得（PH-402 deferred）。

### Heuristic Evaluation + Cognitive Walkthrough 適用

詳細: [`ux-research/cedec-papers.md`](ux-research/cedec-papers.md)

- HE: agent が 3-5 視点で各 UI を評価、Nielsen 10 に照合 + severity 付け
- CW: 「初めて使うユーザ」視点で 4 ステップを逐次確認

両手法併用で「catastrophic + major」issue を網羅（2025 比較研究）。

### Codex セカンドオピニオン（Rule C）

詳細: [`ux-research/codex-review.md`](ux-research/codex-review.md)

大型決定 / 設計案には `run-codex` skill で Codex に相談、結果を採用 / 却下を理由付きで記録。

### batch-92 適用フロー

1. 起動 P95 / idle memory 実測
2. 10 ケース × HE + CW 再監査（信頼度 4/5 目標）
3. Codex 指摘の micro/medium 修正
4. macro 再設計提案（Rule A、ユーザ承認後）
