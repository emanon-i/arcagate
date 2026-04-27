# Codex Rule C 3 回目 — batch-96 PH-438

**実施日**: 2026-04-27
**前 2 回**: `codex-review.md` (batch-91 1 回目) / `codex-review-batch-92.md` (batch-92 後 2 回目)
**本回**: batch-95 dispatch infra + batch-96 進行中の評価。

## 結論

> **「Distribution Era 着手 OK、ただし公開可能品質は未達」**

Polish Era 完走宣言は **未達**。残作業の優先順は明確。

## 主要所見 (5 質問への回答)

### Q1: Codex Q5 全 8 件解消の妥当性

**結論**: 厳格判定では **7.5/8**。実装はほぼ到達、ただし #8 (e2e 原因別文言) は不十分。

- ✅ #1〜#7 は実装確認済み
- 🟡 #8: e2e は `File not found` 1 ケース中心、他 2 原因 (`launch.permission_denied` / `launch.not_executable`) は test.skip

**次のアクション**: launch.permission_denied / launch.not_executable の e2e を有効化、UI トースト文言まで検証。

### Q2: severity 3 残カバレッジ (許容ラインか)

**結論**: **まだ許容ライン未到達**。

- ✅ case 8 cancel (PH-420 done) — ただしテスト未充足
- ✅ case 6 clipboard 検索 (PH-437 done) — ただしテスト未充足
- 🟡 case 2 bulk tag (PH-436 wip→done で minimal scope) — 任意タグ選択 popover / Shift 範囲選択は別 plan へ

**次のアクション**: e2e + vitest を揃えてから許容ライン宣言。

### Q3: Polish Era 完走 / Distribution Era 着手可否

**結論**: **Distribution Era 「着手」は OK、「公開可能品質到達」は未達**。

- 配布運用の中核 (署名・Updater・SBOM) が未実装
- README にインストール導線あるが署名検証/更新/SBOM 説明不足

**次のアクション**: Polish 完走宣言は条件付き未達のまま、Distribution Era の基盤実装を先行。

### Q4: Distribution Era 優先順位

1. **Authenticode 署名** (Windows SmartScreen / UAC 体験に直結、最優先)
2. **Updater** (`tauri-plugin-updater`、署名前提で安全設計)
3. **SBOM** (供給網透明性、企業利用最低線)
4. **配布 README 整備** (上記が固まってから)

**次のアクション**: batch-97/98 で「署名付きリリースパイプライン」を先に固定、その後 updater + SBOM 統合。

### Q5: 見落とし (6 件)

1. **実装**: launch 原因別 e2e が未完 (#8 残)
2. **実装**: bulk tag は plan 要件未充足のまま wip → minimal scope に修正で done 化
3. **実装**: `cmd_cancel_file_search` の UI 側判定が文字列依存 (`String(e).includes('Cancelled')`) → errorCode 経由に
4. **運用**: `dispatch-queue.md` / `auto-kick` / `spawn_handoff` の実体が repo 内で確認できない (参照のみ)
   - **訂正**: PH-435 で全て新設済み、Codex は read-only sandbox で `memory/` を参照できなかったため見落とし
5. **運用**: `status: done` でも受け入れ条件未チェックの Plan がある (PH-437 旧文言指摘) → done 時に [x] 全付与 ルール厳格化
6. **配布**: updater / 署名 / SBOM 実装未着手 (=Distribution Era で着手予定)

**次のアクション**:

1. PH-436/437/438 の受け入れ条件と status を実態同期 (本 plan で done 化時に [x] 全付与)
2. launch error e2e を原因 3 種で UI 文言まで検証 (batch-97 候補)
3. Distribution 基盤 (署名 → updater → SBOM) を連続実装 (batch-97/98/99)

## batch-96 PH-439 (Polish Era 完走判定) への影響

**Codex 判定**: 「条件付き未達」。
**判断**: PH-439 status: deferred とし、Polish Era 完走宣言は **batch-97 完走 + 残テスト充足後** に再判定。
batch-97 は Distribution Era 着手 (Authenticode 優先) + 残テスト (e2e 原因別文言、vitest bulk tag) を組み込む。

## batch-97 候補 (Codex 推奨ベース)

- **改善 1 PH-441**: Authenticode 署名パイプライン (Distribution Era #1)
- **改善 2 PH-442**: tauri-plugin-updater 統合 (Distribution Era #2)
- **改善 3 PH-443**: launch error e2e 原因別文言検証 (Codex Q5 #1 残)
- **防衛 PH-444**: bulk tag e2e + vitest (Codex Q5 #2 残)
- **整理 PH-445**: cmd_cancel_file_search の errorCode 判定化 (Codex Q5 #3)
