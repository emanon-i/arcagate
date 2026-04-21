# ディスパッチ運用マニュアル

> Claude デスクトップアプリのディスパッチ機能が Arcagate プロジェクトを自律的に
> 進めるための操作規約。各セッション開始時に**まずこの文書を読み込む**こと。

---

## 0. ディスパッチの基本動作

### セッション開始時の手順

1. 本ドキュメントと `CLAUDE.md` を読む（禁止事項と意図的な設計判断を把握）
2. `git fetch` → 作業ブランチ `develop` の HEAD が最新か確認。`develop` が存在しない場合は §1 の初期化タスクを先に完了させること
3. `docs/l3_phases/` を一覧し、`status: wip` または `status: todo` の L3 Plan を**新しい順（phase_id の数値降順）にではなく、id 昇順＝古い順**で列挙
4. 最も古い未着手 Plan を 1 つ選び実行する（§2 参照）。並列実行する場合は §3 のファイル衝突ルールを守る
5. Plan 在庫が 2 件以下になったら**新規実装を止め**、§6 の停止通知をログに残して待機する

### 終了条件

- 作業ログに「本日作業終了」と記録 + git push 済み状態で止まる
- 下記 §5 の「暴走ブレーキ」に該当した時点で即停止

---

## 1. リポジトリ初期状態（初回のみ）

**現状**: `develop` ブランチが存在しない。`feature/ui-dx-refinement` に PH-20260311-002
（35件 UI 改修）が commit 済みで main にマージされていない。

**初期化**: Plan `PH-20260422-001_develop-branch-bootstrap` を最優先で実行すること。
完了するまで他 Plan は一切着手しない。

---

## 2. Plan 実行フロー（通常運用）

各 L3 Plan ドキュメントは以下の構造になっている:

```yaml
---
status: todo | wip | done
phase_id: PH-YYYYMMDD-NNN
title: ...
depends_on: [PH-...]
scope_files: [path/to/file, ...]  # 並列判定に使う
parallel_safe: true | false
---
```

### 1. Plan 選択と引き当て

1. 選んだ Plan の frontmatter `status` を `todo` → `wip` に更新（**この変更だけのコミット**を作る: `chore: start PH-YYYYMMDD-NNN`）
2. ブランチを切る: `git switch -c feature/ph-YYYYMMDD-NNN-<slug> develop`
3. Plan の「実装ステップ」を順に実行

### 2. 実装

- コミット粒度は**ステップ単位**（Plan 内の見出しごとに 1 commit が目安）
- コミットメッセージは `<type>(PH-YYYYMMDD-NNN): <要約>` 形式
  - 例: `feat(PH-20260422-002): Ctrl+scroll ウィジェットズームを永続化`
- 各コミット前に `pnpm verify` を通す。失敗したら修正してから commit

### 3. 検証

- Plan の「受け入れ条件」を**実機で確認**してから `[x]` を付ける（読むだけの `[x]` は禁止。lessons.md L177 参照）
- 検証エビデンスとして関連スクショを `tmp/screenshots/PH-YYYYMMDD-NNN/` に保存
- 必要に応じて E2E テスト追加: `tests/e2e/ph-YYYYMMDD-NNN.spec.ts`

### 4. 完了処理

1. Plan の frontmatter `status: wip` → `status: done` に更新
2. 最終 commit: `docs(PH-YYYYMMDD-NNN): 完了マーキング`
3. `git push -u origin feature/ph-YYYYMMDD-NNN-<slug>`
4. `gh pr create --base develop --title "[PH-YYYYMMDD-NNN] <title>" --body ...`
   - PR 本文テンプレートは §7 参照
5. PR の CI（GitHub Actions）を待つ: `gh pr checks --watch`
6. CI 緑 + conflicts なし → `gh pr merge --squash --delete-branch`
7. ローカルで `git switch develop && git pull`
8. Plan ドキュメントを `docs/l3_phases/archive/` に移動:
   `git mv docs/l3_phases/PH-YYYYMMDD-NNN_*.md docs/l3_phases/archive/`
   コミット: `chore(PH-YYYYMMDD-NNN): archive`
9. push して完了

**ユーザー確認は不要**（develop ブランチへのマージは自動化対象）。
ただし main への昇格は常にユーザが手動で行う。ディスパッチは main に触らない。

---

## 3. 並列実行ルール

### 並列化の可否判定

- 各 Plan の frontmatter に `parallel_safe: true | false` を設定
- `parallel_safe: true` かつ `scope_files` に重複がない Plan 同士は**並列実行してよい**
- `parallel_safe: false` の Plan は、他の Plan が走っていない時に単独で実行する

### 並列時の注意

- 同じ共通ファイル（例: `package.json`, `Cargo.toml`, `app.css`）を触る Plan は並列化しない
- `docs/l3_phases/` 内のファイル追加・削除は**どの Plan も触るので、並列 Plan は自分の Plan 文書以外を編集しない**
- 並列実行中に develop に他 Plan がマージされたら、自分のブランチに `git rebase develop` をかけてから CI 再実行

---

## 4. ブランチ戦略とコミット規約

### ブランチ命名

- develop 起点の機能ブランチ: `feature/ph-YYYYMMDD-NNN-<slug>`
- ホットフィックスや調査用: `spike/<slug>` または `chore/<slug>`

### 保護ブランチ

- `main`: ユーザ手動操作のみ。ディスパッチは触らない（push / PR 作成も不可）
- `develop`: ディスパッチが自動マージする。直接 push は禁止、必ず PR 経由

### コミットメッセージ規約

```
<type>(PH-YYYYMMDD-NNN): <ja 要約>

<本文は任意、Plan の参照箇所・判断根拠を残す>
```

type は `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` から選ぶ。

### PR マージ戦略

- 原則 squash merge（Plan 1 つ = PR 1 つ = コミット 1 つ に集約）
- CI が緑でない PR は絶対にマージしない
- コンフリクトが起きたら `git rebase develop` → CI 再実行 → マージ

---

## 5. 暴走ブレーキ（全 Plan 共通の停止条件）

以下のいずれかに該当したら、進行中の作業を**その場で停止**し、作業ログ（後述 §7）に
停止理由を明記してディスパッチを終える。ユーザが戻ってから判断する。

1. `pnpm verify` が 2 回連続で失敗し、原因が特定できない
2. 同じ箇所を 3 回修正しても Plan の受け入れ条件を満たせない
3. CLAUDE.md の禁止事項に触れそうな修正を検討し始めた（`src/lib/components/ui/` 手動編集、ORM 導入、status: done の L1/L2 書き換え、`--no-verify` 使用など）
4. Plan 外のファイルを変更する必要が出てきた（スコープ拡張判断はユーザ）
5. git の index 破損・push 失敗・認証エラー等、自力で復旧できないエラー
6. develop への PR が CI で 2 回連続失敗した
7. Plan 在庫が 2 件以下になった（§6）
8. 作業開始から連続 4 時間経過した（どこかで休む）

---

## 6. Plan 在庫切れの通知

`docs/l3_phases/` の `status: todo` が 2 件以下になったら:

1. `docs/dispatch-log.md` に「Plan 在庫切れにつき停止」と追記
2. 消化済み Plan の棚卸しサマリ（どの Plan で何が変わったか）を同ログに書く
3. 新規 Plan の候補となる「着手したい観点」のメモ（コード調査中に気づいた改善ネタ）があれば同ログに列挙
4. push して停止

ユーザが次セッションで新 Plan を作成する。**ディスパッチは自分で Plan を作成しない**
（仕様ブレを防ぐため）。

---

## 7. 作業ログと PR 本文テンプレート

### 作業ログ `docs/dispatch-log.md`

各 Plan 着手・完了・エラー時にここに追記（append-only。過去ログは書き換えない）:

```markdown
## YYYY-MM-DD HH:MM  [PH-YYYYMMDD-NNN]  <start|step|done|stop>

- (step の場合) 何をしたか・結果
- (stop の場合) 停止理由・§5 のどの条件に該当か
- (done の場合) PR 番号・マージ SHA
```

### PR 本文テンプレート

```markdown
## 対応 Plan
`docs/l3_phases/PH-YYYYMMDD-NNN_<slug>.md`

## 変更サマリ
- <主要変更点 1-3 行>

## 検証
- [x] `pnpm verify` 通過
- [x] `pnpm test:e2e` 通過
- [x] Plan 内受け入れ条件すべて [x]
- スクショ: `tmp/screenshots/PH-YYYYMMDD-NNN/`（ローカルのみ。PR には添付しない）

## 参照
- 親ドキュメント: docs/l1_requirements/vision.md / docs/l2_foundation/foundation.md
```

---

## 8. 禁止事項（リマインダ）

- `src/lib/components/ui/` の手動編集（shadcn-svelte scaffold 出力）
- ORM 導入（rusqlite + 生 SQL 維持）
- `status: done` の L1/L2 書き換え
- pre-commit hook のバイパス（`--no-verify`）
- main ブランチへの push / PR / force push
- ユーザの明示指示なしの config / settings.json / CLAUDE.md の改変
- 自分で新規 Plan を作成（§6 参照）

以上に抵触する判断は**即停止**してログに残す。
