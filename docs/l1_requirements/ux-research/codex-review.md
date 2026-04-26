# Codex セカンドオピニオン — Arcagate UX 業界標準照合

batch-91 PH-413 で実施。run-codex skill で Codex CLI 0.125 に依頼（model_reasoning_effort=medium）。

実施日: 2026-04-27 / 入力: use-cases.md / use-case-friction.md / industry-standards.md / cedec-papers.md

## Q1: macro friction = 0 判定の妥当性

**結論**: ❌ **未証明**（妥当ではない）

**根拠**:

1. 主要 macro 指標が未計測（起動 P95 / idle memory）— `performance-baseline.md:49,61`
2. Nielsen #9（エラー復旧）赤判定— launch 失敗時の復旧導線不足
3. Nielsen #10（ヘルプ/ドキュメント）赤判定— in-app ヘルプ不足
4. 競合比較根拠が「未計測/TBD」多数で macro=0 を裏付ける材料不足

**batch-92 アクション**:

> macro=0 を凍結し、10 ユースケースを HE+CW で再監査しつつ、起動 P95 / 検索応答 / idle メモリの実測を先に埋める（判定は実測後）。

## Q2: 見落とし候補（5+ 件）

**結論**: 5 件以上の見落とし発見

**根拠と blind spots**:

1. **ホットキー表記不整合**: `Ctrl+Space` (README) vs `Alt + Space` (PaletteOverlay) → 一貫性違反 ✅ **本セッションで修正済**（README + PaletteOverlay + industry-standards 全て `Ctrl+Shift+Space` に統一）
2. **workspace ストアの stale response ガードなし**: 高速切替で上書き競合リスク — `state/workspace.svelte.ts:112,117`
3. **palette 検索も request 競合ガードなし**: 古い結果反映リスク — `state/palette.svelte.ts:92`
4. **デザイントークン逸脱**: ハードコード色 / 150ms 直書きが標準逸脱 — `TitleBar.svelte:89` / `WorkspaceSidebar.svelte:49` / `arcagate-theme.css:289`
5. **Windows 配布実機条件未監査**: DPI 125/150% / IME 入力 / マルチモニタ / UAC/SmartScreen / AV 干渉 → コード read だけでは出ない実機盲点

**batch-92 アクション**:

> 実機 UX 監査チェックリストに「整合性」「非同期競合」「Windows 配布実機条件」を追加し、ケース別に再テスト。

## Q3: 数値ベンチマーク competitive 判定

**結論**: 🟡 **混合**（exe size + vitest は OK、体感応答は未証明）

**根拠**:

- exe 16.5 MB は競争力あり（vision 20MB 制約内）
- 検索/ホットキー応答は未計測、150ms debounce が体感下限を押し上げる
- 120/200ms モーション自体は標準範囲（Material 3 内）
- 競争力は「検索応答」で決まる（Raycast <50ms / Alfred ms 単位）

**batch-92 アクション（優先順位）**:

1. 起動 P95 / 検索応答 P95 / idle メモリを実測、競合比較表を埋める
2. 検索を `cancel + latest-only` に変更し、固定 150ms を可変化（50-120ms）
3. 体感最速経路（hotkey → query → enter）を専用ベンチ化して CI 回帰監視

## Q4: 4 画面構成（Library / Workspace / Palette / Settings）再設計

**結論**: ✅ **Yes、軽量再設計が必要**（全面作り直しではない）

**根拠**: 競合の主戦場は「単一入口（コマンド中心）」。Arcagate は 4 画面が同列ナビになっており、文脈切替コストが高い。— `nav-items.ts:36`

**batch-92 改修案 3 件（Rule A 該当、ユーザ承認待ち）**:

1. **Palette-first 化**: 起点を常に Palette に寄せ、Library/Workspace/Settings はコマンド遷移
2. **Quick Settings 導入**: 日常設定は Palette から即変更、詳細のみ Settings へ
3. **Task モード表示**: 「Launch / Organize / Configure」で導線再編（画面名中心 → 目的中心）

## Q5: Polish Era 完走宣言の妥当性

**結論**: ❌ **No**（境界線の手前、現時点で「公開可能」とは言えない）

**根拠**:

- 重大ヒューリスティック違反（#9/#10）を自認済み
- macro 性能の実測空欄が残る
- 既存監査自体が「信頼度 2/5」前提で再監査予定

**batch-92 残作業（優先順位）**:

1. HE + CW 再監査完了（severity 付き、10 ケース）
2. エラー復旧導線（原因説明 / 再試行 / 代替手段）と in-app ヘルプ最小実装
3. 実測ベースで hotkey/search 体感性能を競合水準へ寄せる
4. 一貫性バグ（ホットキー表示・トークン逸脱）を一括修正 — **ホットキー部分は本 batch で修正済**

> 上記を満たして初めて「公開可能」判定が現実的。

---

## 採用 / 却下

| Codex 提案                  | agent 判定                          | 対応                                                                         |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Q2-1 ホットキー不整合       | ✅ 採用、batch-91 で **即修正完了** | README / PaletteOverlay / industry-standards.md を `Ctrl+Shift+Space` に統一 |
| Q2-2 workspace stale ガード | ✅ 採用、batch-92 plan 化           | PH-415 候補                                                                  |
| Q2-3 palette 検索競合ガード | ✅ 採用、batch-92 plan 化           | PH-415 候補（同上）                                                          |
| Q2-4 デザイントークン逸脱   | ✅ 採用、batch-92 plan 化           | PH-416 候補                                                                  |
| Q2-5 Windows 配布実機条件   | ✅ 採用、Distribution Era 入り口    | PH-420 系前段                                                                |
| Q3 検索 cancel+latest only  | ✅ 採用、batch-92 plan 化           | PH-415 と同時                                                                |
| Q4-1 Palette-first 化       | 🟡 ユーザ承認待ち（Rule A 該当）    | batch-92 で提案 → 承認後                                                     |
| Q4-2 Quick Settings         | 🟡 同上                             | batch-92 で提案                                                              |
| Q4-3 Task モード            | 🟡 同上                             | batch-92 で提案                                                              |
| Q5 残作業全般               | ✅ 採用、batch-92 入力              | HE+CW 再監査 / 実測 / エラー復旧 / トークン修正                              |

## Polish Era 完走宣言の取消

batch-90 PH-409 で「Polish Era 完走可能」と宣言したが、**Codex 指摘により取消**。

修正後の状態:

- batch-86〜90 は「Polish Era partial」と再定義
- **Polish Era 完走判定は batch-92 HE+CW 再監査 + 実測完了後**
- 現在は「**Polish Era 進行中（境界線手前）**」

memory `arcagate_product_direction.md` 次セッションで更新予定。
