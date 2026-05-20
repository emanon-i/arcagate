# 個人データ漏れ audit (2026-05-20)

## 目的

repo (`<repo-root>` = 作業用 workspace drive 配下の本 repo) に push 済の内容に対し、 user 個人情報 / 実 user DB 由来データ / 実 item 名 / secret が漏れていないかを machine grep + 画像目視で全件 audit。 修正は提案のみ、 PR 化はしない。

## 検索範囲

- `docs/` / `src/` / `src-tauri/` / `tests/` / `scripts/` / `.github/` / `CLAUDE.md` / `README.md` / `INSTALL.md` / `PRIVACY.md` / `RELEASE.md` / `CHANGELOG.md` (repo root)
- `docs/pr-assets/` 配下の PNG 4 枚 (Read で目視)
- `docs/_assets/pr-card-override-refresh/` 配下の PNG 4 枚 (差分 audit、 後述)
- `src-tauri/icons/` 配下の app icon (audit 対象外 = 自前 brand)
- recent commit log 30 件 (body 含む) + 最近の PR description (#524 / #515 / #510 / #528 / #529 / #530)

## サマリ

- 発見項目: **8 件**
  - Critical (即修正推奨): **1** (L-1)
  - High (近日修正): **3** (L-2 / L-3 / L-4)
  - Medium (許容範囲だが整理推奨): **2** (L-5 / L-6)
  - Low / Informational: **2** (L-7 / L-8)
- repo 内に **実 user DB / 実 item 名 / API key / private key / personal email** は **発見ゼロ** (clean)。
- 漏れているのは全て「Windows username」 「個人 drive 上の絶対 path」 「実機ハード構成 (HDD 種別 / item 数)」 系のメタ情報。 配布 binary の binary 経路には残らないが、 GitHub repo として public 化する場合は問題になる。

---

## 発見項目

### L-1 (Critical): dev seed example に Windows username と個人 path を hardcode

- ファイル:
  - `src-tauri/examples/seed_dev.rs:27` (`C:/Users/<username>/AppData/Local/Programs/Microsoft VS Code/Code.exe`)
  - `src-tauri/examples/seed_dev.rs:99` (`<repo-root>` 相当の絶対 path)
  - `src-tauri/examples/seed_dev.rs:111` (`C:/Users/<username>/Downloads`)
  - `src-tauri/examples/seed_dev.rs:125` (`<workspace-drive>:/<workspace-root>/Projects`)
- 内容: `cargo run --example seed_dev` 用のダミーデータ投入スクリプトに、 user の Windows username と作業 drive (`<workspace-drive>:/<workspace-root>/Projects`) を直書き
- リスク: **public repo 化した瞬間に Windows username が露出**。 別マシンで動かす user / contributor は path を手書き edit する必要があり、 commit history に永久に user 名が残る。 当該 file は migration / build に必須でなく、 dev only。
- 推奨対処:
  - `std::env::var("USERPROFILE")` + `dirs::download_dir()` 等で動的解決に置換
  - target path 自体を generic placeholder (`<HOME>/Downloads` / `./examples-data/`) に変更
  - もしくは file 自体を `.gitignore` 入りの local-only 版に降格 (`seed_dev.rs.example` template + 実体は git ignore)
- 修正方針: 1 PR で全 4 line を env var 解決に置換 (rebase 簡単、 既存 dev workflow 影響なし)

### L-2 (High): CLAUDE.md に Windows username 直書き

- ファイル:
  - `CLAUDE.md:138` (memory 永続 path `C:\Users\<username>\.claude\projects\<repo-id-encoded>\memory\`)
  - `CLAUDE.md:146` (`C:\Users\<username>\.claude\skills\run-codex\SKILL.md`)
- 内容: agent 向け instruction 文書内で、 author 自身の Windows user folder を明示参照
- リスク: CLAUDE.md は repo root に commit 済 = public 化時に username 露出。 agent navigation のためには「`~/.claude/`」 「`$USERPROFILE/.claude/`」 「`<your-user>/.claude/`」 のような generic 形で十分機能する。
- 推奨対処: `$USERPROFILE\.claude\` / `~/.claude/` 表記に置換 (agent が path を resolve できる pattern)

### L-3 (High): `docs/l1_requirements/operations.md` に開発機の固有 drive path

- ファイル:
  - `docs/l1_requirements/operations.md:308-309` / `:312` / `:331` / `:349` (`<drive>:\secrets\arcagate\`)
  - `docs/l1_requirements/operations.md:323` (`<workspace-drive>:\<workspace-root>\Projects\` も agent 触れる前提)
  - `docs/l3_phases/_archive/release-readiness/audit-final-r10.md:122` (`pnpm tauri signer generate -w <drive>:\secrets\arcagate\arcagate.key`)
- 内容: signing 鍵保管場所として **個人 PC の固定 drive 構成 (`<drive>:\secrets\arcagate\`)** を doc に固定。 配布要件ではなく作業環境固有。
- リスク: 「私の signing key は `<drive>:\secrets\arcagate\` にある」 と公言しているのと等価。 鍵自体の盗難経路にはならないが、 attacker が social-engineering する際の手がかり (個人 username + drive 構成 + `secrets` folder 名 を組合せ可能)。
- 推奨対処: 「個人 PC の cloud 同期外フォルダ」 等の generic 記述に変更、 具体 path は repo 外 (memory file or local note) に retreat

### L-4 (High): 完了済 archive 内に個人 path / worktree id

- ファイル:
  - `docs/l3_phases/_archive/PH-20260422-003_watched-folder-verification.md:34` (`C:\Users\<username>\AppData\Local\Temp\...`)
  - `docs/l3_phases/_archive/PH-20260422-109_recent-widget-target-display.md:18` (`C:\Users\<username>\AppData\Roaming\...` 例文)
  - `docs/l3_phases/_archive/PH-20260427-453_auto-kick-verify.md:18` (`C:/Users/<username>/.claude/projects/<repo-id-encoded>/<sessionId>.jsonl`)
  - `docs/l3_phases/_archive/PH-20260427-463_auto-kick-verify.md:19` (個別 sessionId UUID 付きの transcript path)
  - `docs/l3_phases/_archive/PH-20260425-287_codex-review-library.md:41` (worktree path 直書き `<repo-root>/.claude/worktrees/<worktree-id>`)
  - `docs/l3_phases/_archive/PH-20260426-295_test-triage-ci-speed.md:89` (`<repo-root>/.git/config`)
- 内容: archive 入り済の歴史 doc に user-name + worktree UUID + session UUID が混在
- リスク: archive とはいえ commit 済 = git log で永久に残る。 individual session UUID は他の log と紐付ければ追跡可能性あり (claude code session 単位の挙動推定)。
- 推奨対処:
  - 一括 sed で 個人 home (`C:/Users/<actual-username>`) → `$USERPROFILE`、 個人 workspace 絶対 path → `<repo-root>` に generic 化
  - session UUID は単純削除 (archive doc から特定 session を辿る必要性なし)

### L-5 (Medium): PR #524 body と関連 doc に「実 user DB / 117 件の実 game / 実 disk = SMR HDD」 と書かれている

- ファイル:
  - PR #524 description (本文中、 GitHub 上、 close 済): 「`%APPDATA%\com.arcagate.desktop\arcagate.db` の **user 実 DB**」 「**E: の実 game 117 本**」 「実 disk = **2TB SMR HDD**」
  - `docs/l2_foundation/features/backend/metadata-service.md:19` / `:44`
  - `docs/l2_foundation/features/screens/library.md:32`
  - `docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md:68`
  - `src-tauri/src/services/metadata_service.rs:120-122` (コメント内 「SMR HDD 上の 117 exe」)
  - `src-tauri/src/services/item_service.rs:329` / `launch_service.rs:47` (`SMR HDD cold path` コメント)
  - `tests/e2e/library-perf.spec.ts:7-12,28,43,66,82,253-258` (`ITEM_COUNT = 117` benchmark fixture、 「user 実 exe」 言及)
- 内容: 計測根拠を述べる際に user の **実機構成 (drive 種別 / 件数 / item 種別 = game)** を技術コメントとして残している
- リスク:
  - 「117 本の game を E: に保管」 = user 個人の library 規模を露出
  - PR description はもう repo の commit body にも `(#524)` で merge commit 経由で焼き込まれている
  - 配布水準にしたい launcher として、 「作者は SMR HDD に 100+ game」 を明示する必要性なし。 計測理由は「低速 disk + Defender real-time scan の組合せで cold 19.5s」 と一般化すれば足りる
- 推奨対処:
  - 今後 commit する file の **コメント / doc**: 「SMR HDD 等の低速 disk」 「100+ item 環境」 に generic 化
  - 既存の `metadata_service.rs:120-122` / `item_service.rs:329` / `launch_service.rs:47` / `screens/library.md:32` / `backend/metadata-service.md` は次回 touch 時に書き換え (緊急 PR 不要)
  - PR description body は GitHub UI で edit 可能 (close 済でも) — 公開 repo にする場合は #524 を edit 推奨

### L-6 (Medium): L0 / L1 product positioning doc 内で user 嗜好を product 説明に流用

- ファイル:
  - `docs/l0_ideas/motivation.md:9` / `:41` (「Steam / DMM ゲーム / ブラウザゲーム / 同人 RPG / DLsite 等」)
  - `docs/l1_requirements/vision.md:7` (「Steam、 DMMゲーム、 ブラウザゲーム」)
- 内容: 製品が想定する起動元の例として商業プラットフォーム名を列挙
- リスク: product description として正当 (target audience を伝える) だが、 「作者が DMM / DLsite を使う」 と読まれる余地はある。 技術 doc としては不要、 「ストアごとに分散したライブラリ」 等の一般化で機能要件は表現可能
- 推奨対処: 今後の doc revision 時に「複数の game プラットフォーム」 「複数 launcher」 等の generic 表現に置換 (現時点で blocker ではない)

### L-7 (Low / Informational): generic test fixture / placeholder 文字列

- ファイル:
  - `src-tauri/src/repositories/watched_path_repository.rs:77,82` (`"C:/Users/test"`)
  - `src-tauri/src/utils/git.rs:119` (`test@test.com`)
  - `src-tauri/src/services/bookmark_service.rs:146` (`mailto:x@y.com` HTML fixture)
  - `src-tauri/src/repositories/tag_repository.rs:216` (`"secret"` tag fixture)
  - `src-tauri/src/repositories/item_repository.rs:614,639` (`"Secret App"` / `"Disabled Secret"` item fixture)
- 内容: いずれも test 用の generic placeholder
- リスク: なし。 個人情報ではない、 「secret」 「test」 等の symbolic 名
- 推奨対処: 不要 (false positive)

### L-8 (Low / Informational): app identifier `com.arcagate.desktop` の repo 内露出

- ファイル: `src-tauri/tauri.conf.json:5` / `INSTALL.md` / `PRIVACY.md` / `operations.md` / `screens/onboarding.md` / `tests/e2e/library-perf.spec.ts` 他多数 (18 箇所)
- 内容: app の bundle identifier
- リスク: なし。 公開予定 identifier、 設計仕様の一部
- 推奨対処: 不要 (false positive)

---

## clean だった項目 (audit pass)

- **実 user DB**: repo 内に `.db` / `.sqlite` / `.sqlite3` ファイル **0 件** (Glob で verify 済)
- **実 user item 名**: user の brand 名 / 実 item 名 / 作品名 (具体 list は手元 `scripts/.personal-data-patterns.local.txt` で管理、 本 doc に列挙せず) を grep — **全件 0 hit**
- **個人 email**: 実 user の個人 email (local-part + `@`、 完全表記は本 doc に書かず手元 local pattern file 側で管理) を grep — **0 hit**。 検出された email は `test@test.com` (git config 設定 stub) と `x@y.com` (HTML fixture) のみ、 いずれも generic
- **IP アドレス**: private network IP (192.168.* / 10.* / 172.16-31.*) — **0 hit**
- **API key / Bearer token / `sk-*` 形式の secret**: **0 hit**
- **private key 本体** (`BEGIN ... PRIVATE KEY` block): **0 hit**。 `password` / `secret` の hit は全て signing key 管理 doc / 構造体名 / test placeholder
- **pr-assets PNG 4 枚** (`docs/pr-assets/pr-widget-chrome-glass-token-sweep/01-04`):
  - 01-02: workspace 上タブ + sidebar widget palette (Library 系 / フォルダ監視 / メモ・タスク 等のアプリ UI ラベルのみ、 user item ゼロ件、 empty workspace canvas)
  - 03-04: QuickNote widget の textarea focus 表示 (空の textarea + 「メモを入力...」 placeholder のみ)
  - **全て clean** (= 個人 item / 個人テキスト / icon は映っていない)
- **`docs/_assets/pr-card-override-refresh/` PNG 4 枚**: 本 audit の追加対象として目視必要 (下記 follow-up)

---

## follow-up (本 audit では未着手)

- `docs/_assets/pr-card-override-refresh/01-modal-{before,after}.png` / `02-fullpage-{before,after}.png` の 4 枚を目視。 PR #534 で added、 Library card 設定モーダル + Library 一覧の screenshot のため **実 item の icon / 名前が写り込んでいる可能性が高い**。
- 本 audit の scope は repo 全 binary 含むが、 既に発見項目が L-1〜L-8 まで埋まったため別 PR / 別 audit で目視追記する想定。

---

## 修正方針 (overall)

| 項目                                       | 対処方式                                                            | git filter-repo 必要                                      | 緊急度 |
| ------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| L-1 (seed_dev.rs)                          | 通常 PR で env var 解決に置換                                       | No (将来 commit で OK)                                    | High   |
| L-2 (CLAUDE.md)                            | 通常 PR で `$USERPROFILE` 表記に                                    | No                                                        | High   |
| L-3 (operations.md `D:\secrets\arcagate\`) | 通常 PR で generic 化                                               | No                                                        | High   |
| L-4 (archive 内 個人 path)                 | 一括 sed PR、 archive のため revert risk 低                         | git log 経由の露出は残る (filter-repo 適用するか後で判断) | Medium |
| L-5 (実 game 117 言及)                     | 次回 touch 時 generic 化 + PR #524 description を GitHub UI で edit | No (歴史 commit には残る)                                 | Medium |
| L-6 (motivation / vision の DMM / DLsite)  | doc revision 時に generic 化                                        | No                                                        | Low    |
| L-7 / L-8                                  | 対処不要                                                            | —                                                         | —      |

**public 化前の sweep**: もし将来この repo を public にする場合、 L-1〜L-4 を **filter-repo で commit history ごと書き換え**してから push しないと user-name が永久に GitHub 検索可能になる。 内部 (private) 状態のままなら通常 PR で fix する方針で十分。

---

## 検証手順 (再現用)

```powershell
# 1. 個人 path
#    実 username / 実 workspace root の具体名は本 doc に書かず、 手元の
#    `scripts/.personal-data-patterns.local.txt` (gitignored) から手で grep query を組み立てる。
#    generic 構造 pattern (Windows user home / mac home / Linux home) は下記。
rg -n 'C:[\\/]Users[\\/][a-zA-Z0-9._-]+|/Users/[a-zA-Z0-9._-]+/|/home/[a-zA-Z0-9._-]+/' --hidden

# 2. user 実 item 名 (brand / 作品名)
#    具体 list は `scripts/.personal-data-patterns.local.txt` に置く (commit しない)。
#    grep 時はその local file から query を構成する。
rg -nif scripts/.personal-data-patterns.local.txt --hidden  # ※ ERE alternation 込みの local pattern を使用

# 3. email / IP / secret
rg -n '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' --hidden
rg -n '\b(?:192\.168|10\.\d{1,3}\.|172\.(?:1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}\b' --hidden
rg -ni 'sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|BEGIN.*PRIVATE KEY' --hidden

# 4. 実機構成漏れ
rg -n '2TB|SMR|低速.*HDD|HDD.*低速|実 disk|実 game|実 DB|117.*game|117.*本' --hidden

# 5. binary 検出
fd -e db -e sqlite -e sqlite3
```

---

## 規律 note

本 audit は **read-only**。 コード変更ゼロ、 audit doc のみ追加。 worktree path は `.claude/worktrees/recursing-hopper-d45216` (本 session 専用)、 main branch に rebase / merge する判断は user 委ねる。
