# ディスパッチ運用マニュアル

> Claude デスクトップアプリのディスパッチ機能が Arcagate プロジェクトを自律的に
> 進めるための操作規約。各セッション開始時に**まずこの文書を読み込む**こと。

---

## 0. ディスパッチの基本動作

### セッション開始時の手順

1. 本ドキュメントと `CLAUDE.md` を読む（禁止事項・意図的な設計判断を把握）
2. `docs/l0_ideas/` / `docs/l1_requirements/` 配下を読む（concept / vision / ux_standards / engineering-principles）
3. `docs/dispatch-log.md` を読む（最新 30 行 + 手動確認依頼セクション + 実機確認結果）
4. `git fetch` → 作業ブランチの HEAD が最新か確認
5. `docs/l3_phases/` を一覧し、`status: wip` または `status: todo` の L3 Plan を **id 昇順** で列挙
6. 最も古い未着手 Plan を 1 つ選び §3 に従って実行する

### 終了条件

- 作業ログに「本日作業終了」と記録 + git push 済み状態で止まる
- §5「暴走ブレーキ」に該当した時点で即停止

---

## 1. 開発の流れ canonical

### バッチ全体

```
feature/batch-YYYYMMDD-N を main から切る
  ↓
5 Plan を順に実装（§2 参照）
  ↓
pnpm verify 全通過 → PR 1 本作成（base: main）
  ↓
CI 緑 → gh pr merge --rebase --delete-branch
```

- **1バッチ = 1PR**。squash merge 禁止（rebase-and-merge でコミット履歴を保持）
- ブランチ命名: `feature/batch-YYYYMMDD-N`（例: `feature/batch-20260424-57`）
- バッチ番号 N は連番（dispatch-log のバッチ履歴で最大値 + 1）

### Plan ごと

```
Plan 選択 → status: wip に更新
  ↓
実装（Edit / Write / Bash で直接進める。ExitPlanMode は使わない）
  ↓
pnpm verify 全通過
  ↓
/simplify で差分レビュー → 妥当な指摘を修正 → git commit
  ↓
受け入れ条件を検証（自動検証 → [x]、主観確認 → dispatch-log に積む）
  ↓
status: done に更新
```

### バッチ完走後

```
PR merge 完了
  ↓
L3 plan ファイルを docs/l3_phases/archive/ に移動 → commit → push
  ↓
dispatch-log に「batch-XX 完走」を記録
  ↓
/clear でコンテキストリフレッシュ（ユーザ UI 操作が必要なため、自律運用時は代替手順 ★ を参照）
  ↓
60 秒以内に次バッチの Plan 設計（改善 3 + 防衛 1 + 整理 1 の 5 Plan）を始める
```

★ 自律運用中（ユーザが PC 前にいない）の `/clear` 代替手順:
L0/L1（concept / vision / ux_standards / engineering-principles）+ dispatch-log を再読してからバッチ着手。
再読完了後 60 秒以内に次バッチ Plan 設計を開始する（idle 停止禁止）。

---

## 2. バッチ設計

### 1バッチ = 5 Plan 内訳

| 枠        | 分類              | 内容                               |
| --------- | ----------------- | ---------------------------------- |
| 改善 1〜3 | 機能改善・UX 磨き | 実機で体験できる変化を伴う         |
| 防衛      | 品質防衛          | テスト追加・リグレッション防止     |
| 整理      | 整理系            | ドキュメント・リファクタ・依存整理 |

- 1バッチ 5 Plan 内訳は固定（増減なし）
- Plan 在庫切れでは止まらない（§4d「Plan 自律作成の許可条件」参照）

### ブランチ戦略

- **main 起点**で feature ブランチを切る（develop は廃止済み・過去履歴のみ残存）
- `feature/batch-YYYYMMDD-N` → main への PR → rebase-and-merge
- ホットフィックスや調査用: `spike/<slug>` または `chore/<slug>`

### 保護ブランチ

- `main`: force push / 直 push は禁止。PR 経由 merge のみ

---

## 3. Plan 実行フロー

### 1. Plan 選択と引き当て

1. 選んだ Plan の `status` を `todo` → `wip` に更新（`chore: start PH-YYYYMMDD-NNN` コミット）
2. 「実装ステップ」を順に実行。**ExitPlanMode は使わない**（Edit / Write / Bash で直接進める）

### 2. 実装とコミット

- コミット粒度は**ステップ単位**（Plan 内の見出しごとに 1 commit が目安）
- コミットメッセージ形式: `<type>(batch-NN): <ja 要約>`
  - 例: `feat(batch-57): dispatch-operation.md canonical 化`
- **commit 前に `/simplify` でローカル差分をレビューする**:
  1. `pnpm verify` 全通過を確認
  2. `/simplify` を実行して diff を精査
  3. 妥当な指摘はその場で修正してから commit（同コミットに混ぜる推奨）
  4. 不要・スコープ外の指摘は dispatch-log に 1 行理由を記録してスキップ

### 3. 受け入れ条件の検証

受け入れ条件は **自動検証可** と **主観確認** の 2 種に分ける:

| 種別       | 判定方法                      | 記録先                                                   |
| ---------- | ----------------------------- | -------------------------------------------------------- |
| 自動検証可 | CI / pnpm verify / E2E テスト | Plan の `[x]`                                            |
| 主観確認   | 実機目視・使用感              | dispatch-log「手動確認依頼」セクション（非ブロッキング） |

- **実機検証は Playwright CDP 経由**で行う。`pnpm test:e2e` が通れば「直った」と言える
- 目視・スクショ確認が必要な項目は dispatch-log に積んで次回ユーザ確認時に消化
- 「コードを読んだだけで `[x]`」は禁止（lessons.md 参照）

### 4. 完了処理

1. Plan の `status: wip` → `status: done` に更新
2. バッチ全 Plan 完了後、`pnpm verify` 全通過を確認
3. `git push -u origin feature/batch-YYYYMMDD-N`
4. PR 1 本作成:

```bash
gh pr create --base main --title "feat(batch-NN): <バッチ主要テーマ> (PH-XXX〜YYY)" \
  --body "$(cat <<'EOF'
## Summary

- **PH-XXX**: <1行説明>
- **PH-YYY**: <1行説明>

## Test plan

- [x] `pnpm verify` 全通過
- [ ] 実機確認（主観確認項目は dispatch-log に記録済み）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

5. CI 緑 → `gh pr merge --rebase --delete-branch`
6. `git fetch origin && git reset --hard origin/main`（ローカルを最新 main に合わせる）
7. 全 Plan ドキュメントを一括アーカイブ:

```bash
for f in docs/l3_phases/PH-YYYYMMDD-N*.md; do
  mv "$f" docs/l3_phases/archive/
done
git add docs/l3_phases/
git commit -m "chore: batch-NN L3 plan アーカイブ"
git push
```

**アーカイブ時の注意**:

- `git mv` ではなく `mv` + `git add` で移動（MINGW でのパス変換干渉回避）
- 移動後に `git status` で deleted/created が正しく追跡されているか確認

---

## 4. コミットメッセージ規約

```
<type>(batch-NN): <ja 要約>
```

type は `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `style` から選ぶ。

---

## 4b. PC ロック中の運用ルール

PC がスリープ・ロック状態でも以下の条件で作業を継続する。

### 継続できる作業

- コード実装（ビルドが通れば完了とみなせる変更）
- E2E テストの追加・修正（CDP 経由で自動実行できるもの）
- ユニットテスト・smoke-test の追加
- ドキュメント整備（dispatch-operation.md / lessons.md / dispatch-log.md）
- リファクタリング・依存整理（ビジュアル変更なし）

### 停止する作業（解錠後まで保留）

- 受け入れ条件に「実機スクショ」「目視確認」が含まれる Plan の `done` 昇格
- コードインスペクション代替による `[x]` 付け

### ロック中 Plan の扱い

1. 実装は完了させてよい（コミット・PR まで可）
2. Plan の `status` は `wip` のまま維持
3. 主観確認項目は dispatch-log「手動確認依頼」セクションに積む

---

## 4c. 実機テスト実行の安全ルール

> 2026-04-22 インシデント（Playwright drag テスト中断で mouse.down() が残存→ Ctrl+Alt+Del まで復帰不能）を受けて制定。

### 前提: E2E / dev 起動の許可制

- **`pnpm test:e2e` / `pnpm tauri dev` は、ユーザが「走らせて OK」と明示した場合のみ実行**
- 自動バッチ進行中はこの許可制が適用される

### drag/drop・キーボードキャプチャを使う E2E テストの実行前告知

E2E テストに drag/drop・Ctrl+wheel・グローバルホットキーを含む spec ファイルが 1 本以上ある場合:

1. 実行前にユーザへ告知: 「X 分間、画面操作がブロックされる可能性があります」
2. ユーザの「OK」を受けてから実行
3. 実行後に `Get-Process arcagate,node` でプロセス残存を確認し、残存があれば即 Stop-Process

### Playwright テストの安全解放

drag/drop / hover / keyboard を使うテストには `page.mouse.up()` を afterEach/afterAll で確実に呼ぶ:

```typescript
test.afterEach(async ({ page }) => {
    await page.mouse.up().catch(() => {});
});
```

### タイムアウト強制終了

`pnpm test:e2e` は playwright.config.ts の `globalTimeout` で 5 分上限（300_000ms）を維持する。

### ハング時の即 kill 手順

```powershell
Get-Process arcagate -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-10) } | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'playwright|arcagate' } | Stop-Process -Force
```

---

## 4d. Plan 自律作成の許可条件

以下の状況ではディスパッチが自律的に Plan を作成してよい:

1. CI 待ち中で作業スロットが空いている
2. 実機確認中に新たな問題を発見した（その場で Plan 化）
3. 実機フィードバックで明確な粗が見つかった

**Plan 在庫切れで止まらない**: 在庫が 0 でも自律作成してよい（旧「2件以下で停止」ルール撤回済み）。

**作成ルール**:

- 1 回のセッションで最大 5 Plan まで（暴走防止）
- 既存 Plan と `scope_files` が重複する場合は統合を検討
- ユーザ確認は不要（dispatch-log に「自律作成: PH-YYYYMMDD-NNN」と記録する）
- Plan ID は既存の最大 ID + 1 から採番

---

## 5. 暴走ブレーキ（全 Plan 共通の停止条件）

以下のいずれかに該当したら、進行中の作業をその場で停止し、作業ログに停止理由を明記してディスパッチを終える。

1. `pnpm verify` が 2 回連続で失敗し、原因が特定できない
2. 同じ箇所を 3 回修正しても Plan の受け入れ条件を満たせない
3. CLAUDE.md の禁止事項に触れそうな修正を検討し始めた（`src/lib/components/ui/` 手動編集、ORM 導入、status: done の L1/L2 書き換え、`--no-verify` 使用など）
4. Plan 外のファイルを変更する必要が出てきた（スコープ拡張判断はユーザ）
5. git の index 破損・push 失敗・認証エラー等、自力で復旧できないエラー
6. CI が 2 回連続失敗した
7. 作業開始から連続 4 時間経過した

---

## 6. 作業ログと PR 本文テンプレート

### 作業ログ `docs/dispatch-log.md`

各 Plan 着手・完了・エラー時にここに追記（append-only。過去ログは書き換えない）:

```markdown
## YYYY-MM-DD [PH-YYYYMMDD-NNN] <start|step|done|stop>

- (step の場合) 何をしたか・結果
- (stop の場合) 停止理由・§5 のどの条件に該当か
- (done の場合) PR 番号・マージ SHA
```

### 手動確認依頼セクション

主観確認が必要な項目をここに積む（非ブロッキング。ユーザが次回確認時に消化）:

```markdown
## 手動確認依頼

- [ ] YYYY-MM-DD [PH-XXX] <確認してほしい内容>
```

---

## 7. 禁止事項（リマインダ）

- `src/lib/components/ui/` の手動編集（shadcn-svelte scaffold 出力）
- ORM 導入（rusqlite + 生 SQL 維持）
- `status: done` の L1/L2 書き換え
- pre-commit hook のバイパス（`--no-verify`）
- main ブランチへの **force push / 直 push**（PR 経由 merge は OK）
- ユーザの明示指示なしの config / settings.json / CLAUDE.md の改変
- 実機確認なしで受け入れ条件を `[x]` にマーク
- **`ExitPlanMode` の使用**（Edit / Write / Bash で直接実装を進める）
- **squash merge**（rebase-and-merge のみ、auto-merge 経路は squash 解禁・PH-435 例外）

以上に抵触する判断は**即停止**してログに残す。

> Plan 自律作成は §4d で条件付き許可。禁止事項から除外済み。

---

## 8. PR auto-merge 必須運用（PH-435 batch-95）

### 原則: push 後は必ず auto-merge 予約 + 1 回 CI 確認

```bash
git push -u origin <branch>
gh pr create ...
gh pr merge <#> --auto --squash    # 緑になったら自動 merge
gh pr checks <#>                   # 1 回確認 (failed なら即 fix)
```

### 判定ロジック (auto-kick agent と同期)

- **failed**: 即 fix (auto-kick 待たない、自分で push 直す)
- **pending**: 次バッチに進んで OK (auto-merge が引き取る)
- **success**: 既に auto-merge が予約済 → 次バッチに進む

### 「auto-merge してくれるから放置」は禁止

- 最低 1 回の `gh pr checks` 確認後に次バッチ着手
- failed のまま放置は最厳令違反 (idle 同等)

### branch protection (main)

- required status checks: `check / build / e2e / changes` (**strict=false**、batch-100 で OFF 化)
- 全 pass 必須 → auto-merge は緑になるまで待つ
- force push / deletion 禁止
- **strict=false の理由** (batch-100): squash merge 採用 + auto-merge を活用するため。
  strict=true だと BEHIND PR が auto-merge できず、main 進行中に PR 滞留する。
  squash で履歴は線形なので strict 不要。

### auto-merge 滞留の回避

複数 PR を並行 auto-merge 予約した際、main が進むと残 PR は BEHIND になる。
**strict=false なら BEHIND でも auto-merge OK** → 順次 main 反映される。
strict=true 時代は `gh pr update-branch --rebase` 連打が必要だった。

---

## 9. dispatch-queue.md 更新ルール（PH-435 batch-95）

`docs/dispatch-queue.md` を Active / Next Up / Completed の 3 区分で常時最新化:

- **着手時**: Active Batch 行を更新、Next Up から消す
- **完了時 (PR merge 後)**: Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
- **Next Up は常に 3 個以上維持** (在庫切れ防止)
- **Completed は最新 5 件のみ保持** (古い batch は dispatch-log)

在庫切れ時は §4d 自律作成で 5 plan 上限内で補充。

---

## 10. spawn-on-context-pressure（PH-435 batch-95）

### 発動条件

- assistant turn 数 ≥ 1800 (compaction 直前)
- または `<system-reminder>` で context budget 警告

### 発動時の手順

1. `memory/spawn_handoff.md` に snapshot:
   - 現在の active batch / branch / PR 番号
   - dispatch-queue.md の Active + Next Up 抜粋
   - 進行中の plan の status (wip / 残作業)
   - 最後に走らせた CI の状態
2. `mcp__dispatch__start_task` で「Arcagate dispatch resume N+1」を起こす
   - prompt: handoff 読んで queue 続行
3. 自セッションは「次世代起動済み、退場」で終了

### handoff フォーマット

```markdown
# spawn handoff (YYYY-MM-DD HH:MM)

## Active

- batch-XX (branch: feature/batch-XXXX, PR: #XXX, status: in-progress)
- last commit: <SHA> "<msg>"
- CI status: <success/pending/failed>

## In-progress plans

- PH-XXX: <wip steps>

## Next action

- <command or step>

## Queue

- 次バッチ候補: <list>
```

### auto-kick scheduled task との関係

- auto-kick は idle 検知 + kick (5 分以上活動なし / failed PR / checkpoint 発言で 「進め」 prompt 投下)
- spawn-on-pressure は context 限界対策 (1800 turn → 次世代に hand off)
- 両者併用で 24/7 自律運用
