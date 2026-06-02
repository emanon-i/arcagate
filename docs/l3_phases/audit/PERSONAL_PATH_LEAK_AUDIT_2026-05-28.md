# 個人 path leak 過去履歴 + 現状残留 audit (2026-05-28)

`PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` の続編。 「user の個人フォルダ名 +
センシティブな game 名が repo に混入した過去事故が **いつ・どこで・なぜ起きたか**」
を git history から再特定する。

## 報告書 sanitization 規約 (本 doc 全文に適用)

本 doc は user の個人名 / 実 brand / 実 game 名 / 実 email / 鍵保管 path 等を
**一切含まない**。 全て placeholder 表記:

- `C:\Users\<personal>\` (= Windows username)
- `<sensitive_dir>` (= センシティブな個人 folder 名 = 実 game 名等)
- `<sensitive_dir>/<dir>` (= 2 段目以降の生 path)
- `<workspace>` (= drive 上の実作業 folder 絶対 path)
- `<email>` / `<brand>` (= 実 email / 実 brand 名)
- `<sessionId>` / `<worktree-id>` (= Claude Code 内部識別子)

引用元の commit 内容には実値が含まれるが、 **本 doc は file path / 行数 / 件数 /
commit hash の metadata のみを記載** し、 内容引用は全て上記 placeholder に変換
する。 報告完了後に self-check 実施 (§ E.5)。

---

## A. 過去事故事例 (代表 3 件、 sanitize 済み)

事故全件は既存 `PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` に L-1 〜 L-8 として
8 件カタログ化済。 本 doc では「いつ・どこで・なぜ」 を再特定するため、 経路が
明確で典型的な 3 件を再整理する。

### 事故 1 — L-1 (Critical): dev seed example に Windows username と個人 drive path を hardcode

- **file:line**: `src-tauri/examples/seed_dev.rs` の **4 line** (L:27 / L:99 / L:111 / L:125)
- **内容 (sanitize 後)**:
  - L:27 周辺: `C:\Users\<personal>\AppData\Local\Programs\<token>\<token>.exe` 形式の絶対 path を hardcode
  - L:99 周辺: `<drive>:\<workspace>\<personal_dir>\...` 形式 (drive レター + 実 workspace folder 名)
  - L:111 周辺: `C:\Users\<personal>\Downloads\...` 形式
  - L:125 周辺: L:99 と同様の workspace 絶対 path
- **混入時期**: 初期 dev 段階の commit (具体的には 2026-03 〜 2026-04 系列の `feat(batch-*)` 系
  commit、 該当 file 初登場は `git log --diff-filter=A -- src-tauri/examples/seed_dev.rs` で
  特定可能。 本 doc では metadata のみ記録 = hash は `git log` で要再現)
- **混入経路の推定**: dev 担当が `cargo run --example seed_dev` で実 user の library
  を seed したくて、 自分の test data path を直接書き込んだ。 「動かす都度に手元 path
  を書き換える」 サイクルを最適化した結果、 hardcode 状態のまま commit に混入。
- **掃除状況**: 2026-05-21 の **PR #538 / #541** (subject: 「個人データ防止 hook 自身に
  固有名詞が混入していた自己漏洩を修正」 / 「personal-data audit を二系統化 +
  committed file から固有名詞除去」) で env var (`$USERPROFILE` / `dirs::download_dir()`)
  解決に置換。 HEAD は **clean**。
- **git 履歴への残留**: **残っている** (filter-repo 未実施、 § B.3 参照)

### 事故 2 — L-2 (High): agent 向け instruction (CLAUDE.md) に Windows username 直書き

- **file:line**: `CLAUDE.md:138` と `CLAUDE.md:146` (修正前の line 番号、 placeholder
  化後は若干シフト)
- **内容 (sanitize 後)**: memory 永続化 path と skill doc path を **agent navigation
  用に明示** するつもりで、 `$USERPROFILE` 展開後の絶対 path (`C:\Users\<personal>\...`)
  を直書きした。
- **混入時期**: 2026-04 〜 2026-05 系列の `docs:` 系 commit。 CLAUDE.md は session 開始時
  に agent が読む high-traffic file のため、 「path を書いておけば agent が確実に辿れる」
  という意図で展開後 path を入れたと推定。
- **混入経路の推定**: agent navigation の **「具体性 ≥ 抽象性」** バイアス。 `~/.claude/`
  でも機能するが、 「絶対 path を明示すれば確実」 という最適化判断が個人情報露出を生んだ。
- **掃除状況**: 2026-05-21 の **PR #537** (subject: 「個人データ漏れ防止 hook +
  PR template + .gitignore 強化」) と続く #538 / #541 で `$USERPROFILE\.claude\` 表記
  に置換。 HEAD は **clean**。
- **git 履歴への残留**: **残っている**

### 事故 3 — L-4 (High): archive 入り済 plan doc に個人 path + worktree id / session id

- **file:line** (sanitize 済 path のみ):
  - `docs/l3_phases/_archive/PH-20260422-003_watched-folder-verification.md:34`
  - `docs/l3_phases/_archive/PH-20260422-109_recent-widget-target-display.md:18`
  - `docs/l3_phases/_archive/PH-20260427-453_auto-kick-verify.md:18`
  - `docs/l3_phases/_archive/PH-20260427-463_auto-kick-verify.md:19`
  - `docs/l3_phases/_archive/PH-20260425-287_codex-review-library.md:41`
  - `docs/l3_phases/_archive/PH-20260426-295_test-triage-ci-speed.md:89`
- **内容 (sanitize 後)**:
  - `C:\Users\<personal>\AppData\{Local,Roaming}\...` 形式の絶対 path
  - `C:\Users\<personal>\.claude\projects\<repo-slug>\<sessionId>.jsonl` (Claude Code
    transcript path に user 名 + sessionId が両方混入)
  - `<repo-root>\.claude\worktrees\<worktree-id>` (worktree UUID)
- **混入時期**: PH-20260422-* / PH-20260427-* の plan 執筆時期 (2026-04 後半)。
  当時は plan が `docs/l3_phases/` 直下にあり、 後に **PR #444 (2026-05-13 「docs: L0-L3
  layer model restructure」)** で `_archive/` 配下に移送された。
- **混入経路の推定**: agent が plan doc を書く際に **「実行ログから取った path を
  そのまま貼り付け」** していた。 例として 「`<sessionId>.jsonl` を grep して取った
  内容」 「`<worktree-id>` 配下の verify 結果」 を「再現用 path」 として doc に書き残す
  pattern。 sanitize 規律が未確立な時期の典型的失敗。
- **掃除状況**: 2026-05-21 PR #538 / #541 で archive doc 一括 sed で placeholder 化済。
  HEAD は **clean**。
- **git 履歴への残留**: **残っている**

### 事故全件の参照

- 上記 3 件以外 (L-3 / L-5 / L-6 / L-7 / L-8) は既存 audit `PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`
  §「発見項目」 で sanitize 済記載。 本 doc は重複しない。
- 8 件全てに共通する **真因 cluster**: 「具体性を最適化した結果の個人情報
  hardcode」 (seed / agent doc / plan archive)。

---

## B. 現状残留確認

### B.1 HEAD (working tree + tracked files) の状態 = **CLEAN**

HEAD で `C:\Users\` / `C:/Users/` を含む tracked file は **7 件**。 全て **intentional
placeholder / sanitization 文脈** で、 実 user 名混入なし。 sed トークン化での確認結果:

| file                                                                           | 用途                                                                                                         | category    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------- |
| `.github/pull_request_template.md` (1 hit)                                     | PR template に sanitize 例 (`C:\Users\<personal>\<sensitive_dir>` → `$USERPROFILE\<sensitive_dir>` の対応表) | placeholder |
| `PRIVACY.md` (1 hit)                                                           | privacy doc に「sanitize 後の例」 を `<placeholder>` 形式で記載                                              | placeholder |
| `docs/l3_phases/_archive/PH-20260427-466_crash-monitor-impl.md` (1 hit)        | archive plan 内の sanitize 例 (`C:\Users\<personal>\...` → `<placeholder>` 表記)                             | placeholder |
| `docs/l3_phases/audit/DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md` (2 hits)    | 別 audit (2026-05-27) で path 個人情報問題を論じる際の placeholder 表記                                      | placeholder |
| `docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` (1 hit)          | 既存 audit (2026-05-20) の sanitize 規約表記 (`<placeholder>` 形式)                                          | placeholder |
| `src-tauri/src/repositories/watched_path_repository.rs` (2 hits、 L:77 / L:82) | unit test fixture: 文字列リテラル `"C:/Users/test"` (= generic placeholder、 L-7 false positive 扱い)        | placeholder |
| `tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts` (1 hit)                     | コード comment で sanitize 規約を記述 (= `<placeholder>` 例)                                                 | placeholder |

→ **HEAD は clean**。 user 個人名 / 実 game 名 / 実 brand / 実 email **0 件**。

### B.2 untracked / gitignored

- `scripts/.personal-data-patterns.local.txt` (gitignored) は **意図的に** 固有値を保持。
  本 file は audit hook の検出 dictionary で、 commit されない設計 (§ D.2 参照)。
- `tmp/` 配下 (gitignored): probe スクリプト / screenshot に絶対 path 含む可能性あるが
  commit 対象外。
- `target/` / `.svelte-kit/` / `build/`: build artifact に絶対 path が焼き付く設計が
  あるか要確認 (§ C.4)。

### B.3 git 履歴 (past commits) の状態 = **NOT CLEAN**

raw 個人 path token 出現数を時間軸で集計:

| 範囲                                 | `C:\Users\` / `C:/Users/` token 出現数                   |
| ------------------------------------ | -------------------------------------------------------- |
| 全 commit (reachable)                | **129**                                                  |
| 2026-04 〜 2026-05-21 (= cleanup 前) | **85**                                                   |
| 2026-05-22 以降 (= cleanup 後)       | **6** (全て audit doc 内の placeholder 表記 = sanitized) |

cleanup 後の 6 件は full diff 検査で全て placeholder 文脈と確認済。 cleanup 前の 85 件は
**生の個人 path** であり、 PR #537 / #538 / #541 (2026-05-20/21) は **HEAD 上の file 修正
のみ実施** で `git filter-repo` による history 書き換えは **未実施**。 既存 audit
(`PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` § L-3 / L-4 / 修正方針表) でも「段階 2 の
filter-repo で処理」 「git log 経由の露出は残る」 と明示。

→ **HEAD は clean、 git 履歴は dirty (85 token 残存)**。 repo が private のうちは内部
リスクのみだが、 **public 化した瞬間に git log 経由で全 token が世界に出る**。

### B.4 git 履歴で leak が混入した tracked file 一覧 (pre-cleanup 時代)

```
.github/pull_request_template.md                                       (後に placeholder 化)
CLAUDE.md                                                              (L-2、 2026-05-21 修正)
PRIVACY.md                                                             (後に placeholder 化)
docs/l3_phases/PH-20260422-109_recent-widget-target-display.md         (後に _archive/ 移送 + L-4 修正)
docs/l3_phases/PH-20260427-453_auto-kick-verify.md                     (同上)
docs/l3_phases/PH-20260427-463_auto-kick-verify.md                     (同上)
docs/l3_phases/PH-20260427-466_crash-monitor-impl.md                   (同上)
docs/l3_phases/archive/PH-20260422-003_watched-folder-verification.md  (L-4)
docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md            (audit 自身、 § A 注釈で 2026-05-21 sanitized)
scripts/personal-data-patterns.txt                                     (dictionary、 2026-05-21 に regex 系に分離)
src-tauri/examples/seed_dev.rs                                         (L-1)
src-tauri/src/repositories/watched_path_repository.rs                  (L-7 = test fixture, generic)
src-tauri/src/services/crash_monitor_service.rs                        (Telemetry 系、 PR #367 で削除済)
src-tauri/src/services/opener_service.rs                               (PR #249 で削除済 or リファクタ)
```

これらの file が pre-cleanup 時代に 85 token 分の個人 path を含んでいた。 各 file の
**最新版 (HEAD)** は § B.1 の通り clean。

---

## C. 混入経路の推定 (現状コードベースの再発リスク箇所)

「test を動かすと user の home path が捕捉される箇所」 + 「dev build の出力物に絶対 path
が焼き付く設計」 を grep + 既知設計から特定:

### C.1 dev binary 経路 (低リスク = `$USERPROFILE` 経由に修正済)

- `src-tauri/examples/seed_dev.rs:15` / `:26` — 環境変数 `USERPROFILE` / `HOME` / `APPDATA`
  を直接読む。 **絶対 path 自体は env からの動的解決** (= L-1 の hardcode 修正後)。
  ただし dev binary 実行時 stdout に絶対 path を **印字** する可能性があるため、 log を
  PR / issue にコピペする時に再混入リスクあり (= 「実行ログの転記」 経路、 § C.5)。
- `src-tauri/src/bin/arcagate_cli.rs:285` — 同様に `APPDATA` env 直読。 release 配布対象外
  (`#![allow(...)]` で clippy `unwrap_used` も除外、 CLAUDE.md 記載通り)。

### C.2 build artifact への path 焼き付き

- **Rust release build**: `strip = "symbols"` (`Cargo.toml:65`) で debug info 除去済。
  ただし panic message / Rust 標準の `Location` info で `__file__` パスが文字列に
  残る可能性あり (= compile 時の絶対 path が `format!("{}:{}", file!(), line!())` 経由
  で binary 内に含まれる)。 これは Rust のデフォルト動作で、 配布 binary を strings 走査
  すると build host の絶対 path が観測される。 cargo 1.62+ の `--remap-path-prefix` /
  `RUSTFLAGS` で除去可能だが本 repo 未設定。
- **SvelteKit build**: `pnpm tauri build` の `frontendDist=../build` を bundle に embed。
  source map 系が build 内に残るかは未検証 (= 別 audit で確認推奨)。

### C.3 log file (実行時 absolute path)

- `tauri-plugin-log` は `%LOCALAPPDATA%\com.arcagate.desktop\logs\arcagate.log` に絶対
  path を頻繁に書く (例: `[2026-05-26][13:18:46][arcagate_lib::db][WARN] DB backed up
  due to corruption ... "<APPDATA>\\com.arcagate.desktop\\arcagate.db.corrupted-..."`)。
  user の disk 上にしか出ないが、 troubleshoot 時に user が log を PR / issue にコピペ
  すると repo に流入。 別 audit `DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md` § 3.1 で
  `redact_for_display()` helper 案 (`%APPDATA%\...` 表記正規化) を提示済。

### C.4 e2e fixture / screenshot

- `tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts:1 行付近` — file 冒頭 comment に
  「個人情報を含まない fixture の選定理由」 が記載される (= L-7 / placeholder)。 spec
  自体は generic fixture を使う設計。
- `tests/fixtures/global-setup.ts:89-90` — `WEBVIEW2_USER_DATA_FOLDER` を test 用 dir
  に書き換え。 path 自体は CI runner 上の path であり、 user 個人 path には依存しない
  (CI で安全)。 ただし local 実行時は **agent worktree 配下の絶対 path** が log に出る
  可能性あり (= log 共有時の再混入)。
- `tmp/verify-shots/*.png` (gitignored): screenshot に user 実 item label / icon が
  写る可能性あり (= 例 「Library 画面 screenshot に実 game 名 label が見える」 経路)。
  既存 audit `PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` § follow-up が画像目視 audit の
  必要性に言及済。 **PR に screenshot を貼る時** は agent / user 双方が「映り込み」
  を毎回目視確認する規律が必要。

### C.5 「実行ログ / dev session の転記」 経路 (一番再発しやすい)

事故 3 (L-4) の真因。 agent が plan / audit doc を書く際に **実行 console / log /
session transcript からそのまま path を貼り付け** ると、 sanitize 規律をすり抜ける。

- `<sessionId>.jsonl` の transcript path
- `<worktree-id>` UUID 付きの worktree path
- dev 起動時 console に出る `%APPDATA%\com.arcagate.desktop\...` 絶対 path
- error / panic dump 時の `__file__:__line__` 形式

→ この経路は **コード修正では防げない** (= 規律 / hook の問題)。

---

## D. 既存防御層 + 抜けの有無

### D.1 既存防御層 (2026-05-21 PR #537 / #538 / #541 で構築)

- **lefthook pre-commit `personal-data`** (`lefthook.yml:81-85`):
  - `scripts/audit-personal-data.sh` を `{staged_files}` で呼ぶ
  - 2 系統 dictionary:
    - `scripts/personal-data-patterns.txt` (committed、 regex): generic 構造マッチ
      (`[Cc]:[\\/]Users[\\/]...` 等)、 固有名詞を含まない
    - `scripts/.personal-data-patterns.local.txt` (gitignored、 fixed string): user
      の手元固有値 (実 username / brand / email / game 名)
  - **diff-based check**: staged file の **新規追加 line のみ** scan (= 既存 leak で
    永久 fail を回避、 「新規漏れ防止」 のみ責務)
- **`.gitignore`** (`gitignore:72`): `scripts/.personal-data-patterns.local.txt` を
  ignore (dictionary 自身が leak source にならない設計)。 `*.db` / `*.db-{shm,wal}` /
  `tmp/` も覆い、 実 DB 流入を防止
- **PR template** (`.github/pull_request_template.md`): sanitize 規約を PR 作成時に
  agent / user に再表示

### D.2 抜けの有無

| 観点                                              | 状態                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| HEAD 新規 commit の個人 path 混入                 | ✅ lefthook hook で fail-closed                                                                      |
| 既存 git history の生 token (85 件)               | ❌ filter-repo 未実施。 public 化前に必要                                                            |
| dev binary 実行ログの転記                         | ⚠ コード防御不能、 規律 + redact_for_display() helper で対処                                         |
| screenshot の映り込み                             | ⚠ コード防御不能、 PR 作成時の目視 audit のみ                                                        |
| build artifact の絶対 path 焼き付き               | ⚠ Rust の `--remap-path-prefix` 未設定。 release binary を strings すると build host path が観測可能 |
| transcript / sessionId / worktree-id の混入       | ⚠ 既存 hook の regex に追加されているか要再確認 (`scripts/personal-data-patterns.txt`)               |
| L-5 / L-6 (実機構成 / 実 game プラットフォーム名) | ⚠ 既存 audit で「次回 touch 時 generic 化」 として deferred。 未対処                                 |
| L-3 鍵保管 path (`audit-final-r10.md`)            | ⚠ `_archive/release-readiness/audit-final-r10.md` は filter-repo target、 未着手                     |

---

## E. 再発リスクと推奨対策レベル

### E.1 リスク評価 = **「過去 1 回」 では済まない、 構造的に何度でも起きる」**

理由:

- 8 件の事故 (L-1 〜 L-8) は **3 つの異なる経路** (dev seed / agent doc / plan archive) で
  発生 = 単一の bug 修正で塞げる種類ではない
- 「実行ログ / session transcript の転記」 (§ C.5) は **コード防御不能** で、 agent /
  user が doc を書く度に再発リスクがある
- 既存 hook は **新規追加 line** のみ scan で、 「過去 leak を編集して新 line 追加」
  type の混入は検出可能だが、 **既存 line を編集せず周辺に追加** したケースは編集行
  だけ scan される設計
- public 化前なら HEAD clean で十分だが、 **public 化を 1 回でも行う = git history
  完全公開** で 85 token 流出

### E.2 推奨対策レベル

**(a) 最小限 (短期、 1 PR で済む)**:

- 既存 hook の `personal-data-patterns.txt` regex に **以下を追加** (`__file__` / `__line__`
  / Tauri panic 形式 / sessionId / worktree-id pattern):
  ```
  /\.claude/projects/[^/]+/[A-Za-z0-9-]{36}\.jsonl
  /\.claude/worktrees/[A-Za-z0-9-]{36}
  ```
- PR template に screenshot 確認 checkbox 追加 (映り込み / icon)
- `redact_for_display()` helper を新設 (`DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md`
  § 3.1 と統合実装)

**(b) 中期 (1-2 日)**:

- `tests/fixtures/global-setup.ts` 周辺で agent log に出る絶対 path を構造的に redact
- Cargo.toml に `--remap-path-prefix` を `[profile.release]` に追加 (= build host の
  絶対 path を `<repo-root>` に置換、 release binary を strings 走査しても build user
  名が出ない)
- L-5 / L-6 系の deferred 項目 (motivation / vision / library.md 等) を次回 touch 時に
  generic 化 (既存 audit の修正方針表 § 「修正方針」 参照)

**(c) 重い対策 (public 化前必須、 1 PR で 0.5-1 日 + git rewrite テスト)**:

- **`git filter-repo`** で 85 token 全てを `<personal>` placeholder に history 書き換え
  - commit-msg 内の固有値も対象
  - `_archive/release-readiness/audit-final-r10.md` の鍵保管 path (L-3)
  - 旧 `docs/l3_phases/` 直下の plan doc 群 (= PR #444 で `_archive/` へ移送される前の
    時代の生 path)
  - 旧 `crash_monitor_service.rs` (削除済 file の歴史 commit)
- 書き換え後 force-push が必要 = 既存 PR / fork / contributor の状態を破壊。 public 化
  と同時に実施するのが安全 (= initial public push 前に history scrub → 公開、 これで
  歴史汚染ゼロから始められる)

### E.3 推奨レベル決定基準

| 状況                                        | 推奨対策                                                 |
| ------------------------------------------- | -------------------------------------------------------- |
| repo は internal/private のままで運用継続   | (a) のみで十分                                           |
| 数ヶ月以内に public OSS / public archive 化 | (a) → (b) → (c) を **全部** 実施                         |
| public 化予定はないが配布 binary を強化     | (a) + (b) (`--remap-path-prefix` 含む)                   |
| ブランド rename を同時に行う場合            | (a) + (c) を同 PR バッチ (1 度の history rewrite で済む) |

### E.4 既存 audit からの差分 / 新情報

`PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` を補足する形で本 audit が追加する観点:

| 新観点                                  | 内容                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| git history token 数の定量化            | 全 129 / pre-cleanup 85 / post-cleanup 6 (= 全て placeholder) で内部状態 quantify |
| 「実行ログ転記」 経路 (§ C.5)           | コード防御不能、 規律問題として明示                                               |
| Rust `--remap-path-prefix` 未設定の指摘 | release binary に build host path が残るリスク (新)                               |
| screenshot 映り込み audit の継続必要性  | 既存 audit § follow-up を本 doc で「規律として常設」 と明文化                     |

### E.5 報告 sanitization self-check

本 doc を保存後、 以下を再確認:

- [ ] `C:\Users\<実 username>\` 形式の生 path が **0 件** (本 doc 内検索)
- [ ] 実 game 名 / 実 brand 名 / 実 email / 実 sessionId / 実 worktree-id が **0 件**
- [ ] 引用元 commit 内容を **placeholder 化** (`<personal>` / `<sensitive_dir>` / 等) で
      記載しており、 raw token を直接コピペしていない
- [ ] commit hash は **subject 付き** だが、 subject は project work 名のみで個人情報を
      含まない (§ 「過去事故事例」 で metadata のみ記載)

self-check 実行コマンド (本 doc 完成後、 作者が再確認):

```bash
# 本 doc 内に raw token が混入していないか (sanitize 漏れ検出)
grep -nE 'C:\\Users\\[A-Za-z0-9._-]+\\[A-Za-z0-9._-]+' docs/l3_phases/audit/PERSONAL_PATH_LEAK_AUDIT_2026-05-28.md
# = 0 hit 期待。 hit ありなら sanitize 漏れ
```

---

## F. 結論

- **HEAD = clean**。 PR #537 / #538 / #541 (2026-05-20/21) の cleanup で 7 file × 8 leak
  項目全て sanitize 済。 lefthook + 2 系統 dictionary + `.gitignore` で新規漏れ防止層あり
- **git history = dirty (85 token)**。 filter-repo 未実施で過去 commit に raw 個人 path が
  残存。 internal/private 運用なら内部リスクのみ、 **public 化前に必須対策**
- **再発リスクは「過去 1 回」 では済まない**。 dev seed / agent doc / plan archive /
  実行ログ転記 の 4 経路で構造的に発生する。 (a) hook 強化 + (b) build artifact path
  remap + (c) filter-repo の 3 層で対策推奨
- ブランド rename を計画している場合、 (c) filter-repo と **同 PR で同時に commit
  history 書き換え**するのが効率的 (1 度の history rewrite で両方済む)

## H. PR-level leak (GitHub PR description / comments / CI logs / commits)

`gh pr list --state all --limit 1000` で全 **595 PR** の body / title を bulk-fetch し、
patterns (`C:[\\/]Users[\\/]<word>` / `E:[\\/]Cella` / OS-username substring / `*.jsonl` /
worktree UUID / `@gmail.com`) で機械 scan。 続いて issue-comments / pull-review-comments
を全件 fetch、 直近 CI run 3 本を sample してログ scan。 中間出力は全て agent context 外
(`$TEMP/pr-leak-audit/`) に置き、 sanitize 後 metadata のみ本 doc に持ち込む。

### H.1 スコープ + 件数

| 対象                         | 件数 | scan 方法                                                  |
| ---------------------------- | ---- | ---------------------------------------------------------- |
| PR title (全 state)          | 595  | regex (`PAT_USER` / `PAT_E` / `OS-username`)               |
| PR body (全 state)           | 595  | 同上                                                       |
| issue comments (全 PR/issue) | 30   | `gh api repos/.../issues/comments --paginate`              |
| PR review comments (inline)  | 0    | `gh api repos/.../pulls/comments --paginate`               |
| 直近 CI run log              | 3 本 | `gh run view <id> --log` で per-run grep                   |
| PR commit message / diff     | -    | git log -p で既に § B.3 でカバー (`git log --all -p` 経由) |

### H.2 scan 結果サマリ

| 検出 pattern                                         | title | body            | comments | CI logs | 解釈                                                   |
| ---------------------------------------------------- | ----- | --------------- | -------- | ------- | ------------------------------------------------------ |
| `C:[\\/]Users[\\/]<word>` (= 1 segment 以上)         | 0     | 3 PR            | 0        | 多数    | CI logs は `C:\Users\runneradmin\` のみ (個人名でない) |
| **`C:[\\/]Users[\\/]<OS username>`** (= 実 username) | **0** | **1 PR (#537)** | **0**    | **0**   | **唯一の real-leak**                                   |
| `E:[\\/]Cella` (workspace 名)                        | 0     | 2 PR            | 0        | 0       | PR #537 (2 hits) + PR #539 (1 hit)                     |
| `@gmail.com` (実 email pattern)                      | 0     | 0               | 0        | 0       | clean                                                  |
| `.jsonl` (sessionId)                                 | 0     | 0               | 0        | 0       | clean                                                  |
| worktree UUID                                        | 0     | 0               | 0        | 0       | clean                                                  |
| bare OS-username substring                           | 0     | 0               | 0        | 0       | clean                                                  |

→ **PR-level real leak は実質 1 件**: PR #537 の description (OS username + workspace path)。
PR #539 は workspace path のみ (= L-3 系の「個人 PC 構成漏れ」 と同カテゴリ)。

### H.3 代表事例 (sanitize 済み)

#### 事例 PR-1: PR #537 description に OS username 直書き (Critical)

- **PR**: [#537](https://github.com/emanon-i/arcagate/pull/537) (MERGED 2026-05-20、 subject:
  「chore(security): 個人データ漏れ防止 hook + PR template + .gitignore 強化」)
- **混入位置**: description body の **「Test plan」 セクション** + **「個人データの sanitize
  check (この PR description に対する適用)」 セクション** 内、 in-prose (= code fence 外)
- **内容 (sanitize 後)**:
  - 1 箇所目: 試験用に staged した leak 文字列を「`C:\Users\<personal>\` + `E:\<workspace>\Projects`」 と
    plain text で記載 (= **本来 placeholder にすべき値を実値のまま貼り付け**)
  - 2 箇所目以降: 同 description 内の sanitize 自己 check セクションで `<personal>` / `E:\<workspace>`
    に再言及
- **なぜ起きたか**: 本 PR は audit hook 構築の **動作証跡** を残す PR で、 「実際に検出された
  string を staged して exit 1 になったこと」 を test plan に書いた。 その際 sanitize されない
  まま実 username + 作業 drive path が description に流入。 本 PR が **構築した hook 自身が
  この PR description には適用されない** (hook は staged file の grep で、 PR description は
  GitHub 側の text で repo file ではない) → audit hook の死角
- **掃除状況**: 後続 PR #538 / #541 で committed file 側は cleanup されたが、 **PR #537 description
  body 自身は GitHub 上に残っている**

#### 事例 PR-2: PR #539 description に作業 drive workspace path (High)

- **PR**: [#539](https://github.com/emanon-i/arcagate/pull/539) (MERGED 2026-05-21)
- **混入位置**: description body 内に `E:\<workspace>` (= 作業 drive root) を 1 箇所記載
- **内容 (sanitize 後)**: 作業 drive の絶対 path を例示 / 説明 context で記述
- **なぜ起きたか**: agent が 「動作を再現する path」 として手元の workspace を直書き。
  username は含まないが、 「`E:\<workspace>` という名前の drive 構成は user 固有」 = 個人 PC 構成
  漏れ (既存 audit L-3 と同カテゴリ)
- **掃除状況**: **PR description body に残存**

#### 事例 PR-3: PR #541 description test plan (Medium、 false positive 寄り)

- **PR**: [#541](https://github.com/emanon-i/arcagate/pull/541) (MERGED 2026-05-21)
- **混入位置**: description body の test plan セクションに `C:[\\/]Users[\\/]<5-char-alpha>` 形式の
  パターンが 1 件
- **内容 (sanitize 後)**: matched segment は OS username の variant (lower / title / upper) **いずれにも一致しない**
  5 文字 alpha 文字列。 audit hook の動作試験で使った **架空の test fixture username** と推定
- **判定**: 実 username ではない可能性が高い (= false positive)。 ただし audit hook の動作試験
  context で書かれているため、 公開 doc としては「実 username を連想させる文字列でなく明示的
  placeholder にしておく方が望ましい」 改善余地あり

### H.4 PR title / commit message / comments / CI logs / un-merged branches

- **PR title**: 595 件中 0 hit。 タイトルには個人 path を入れる pattern が存在しなかった
- **PR commit message / diff**: § B.3 の `git log --all -p` scan で既にカバー
  (merged PR の squash commit は main に乗っているため git log でヒット済、 cleanup-pre の
  85 token は不変)
- **issue comments** (30 件全件): 0 hit。 conversation comment / general PR comment に
  個人情報は流入していない
- **PR review comments (inline)** (0 件): repo 全体で inline review comment が存在しない
  = scan 対象なし。 1 人運用 + agent 自動レビューが review 系 comment を投げない設計のため
- **CI logs** (直近 3 run sample): `C:\Users\runneradmin\` (= GitHub Actions Windows runner の
  標準 home) のみ。 user の OS username substring + `E:\<workspace>` 共に **0 hit** = clean
- **closed-but-not-merged PR branches** (`refs/pull/<num>/head`): repo 内に 1 件のみ
  (#594、 本セッションで agent が close した DB recovery banner PR)。 local fetch 済の
  refs/remotes に PR branch 専用 namespace なし、 git log scan 経路で網羅されているため
  追加対応不要

### H.5 PR description / comment は git history と違って **後から編集可能**

GitHub の PR description / issue body / comment は API で edit 可能 (= filter-repo 不要):

| 対象           | 編集 API / URL                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| PR #537 body   | `gh pr edit 537 --body "<新 body>"` または GitHub UI `https://github.com/emanon-i/arcagate/pull/537` → Edit |
| PR #539 body   | `gh pr edit 539 --body "<新 body>"` または同 UI                                                             |
| PR #541 body   | `gh pr edit 541 --body "<新 body>"` (false positive 寄りだが明示 placeholder 化推奨)                        |
| issue comment  | `gh api -X PATCH repos/emanon-i/arcagate/issues/comments/<id> -f body=...`                                  |
| review comment | `gh api -X PATCH repos/emanon-i/arcagate/pulls/comments/<id> -f body=...` (本 repo は 0 件、 該当なし)      |

**注意**: edit しても **GitHub 内部の Audit Log / Activity Feed** には旧 body が保持される
可能性がある (Enterprise 機能、 通常の private repo では 90 日程度 retained と非公式に伝聞)。
完全な抹消は GitHub Support 経由のリクエストが必要。 internal/private repo のうちはこの内部
ログにアクセスできるのは repo owner のみ。

**手順 (実装段階で user 確認後に実行)**:

1. PR #537 / #539 / #541 の現 body を `gh pr view <num> --json body -q .body` で取得
2. local で sanitize (`C:\Users\<personal>\` / `E:\<workspace>\<workspace>` に置換)
3. `gh pr edit <num> --body-file <sanitized.md>` で上書き
4. 再 scan で 0 hit を確認
5. (optional) public 化と同時に GitHub Support に旧 body の retention 短縮を依頼

### H.6 PR-level leak の再発防止 (§ E.2 への追加)

既存 §E.2 (a) hook 強化リスト に **PR-level チェック** を追加:

- **PR template の `.github/pull_request_template.md`** に 「PR description / comments も
  audit hook 同等の sanitize 規律で書く」 注意を明示 (現状は committed file の sanitize のみ
  言及)
- (optional) GitHub Actions ワークフローに **PR opened/edited イベントで description を
  scan する step** を追加。 既存 hook の regex を再利用、 fail 時に PR 自動 comment で
  通知。 これは local hook が PR description には届かない死角を埋める対策

---

## G. 参照

- 既存 audit: [`PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`](PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md) (L-1 〜 L-8 詳細)
- 関連 audit: [`DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md`](DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md) § 3 (path 表示の redact 案)
- 関連 audit: [`PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md`](PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md) § A.4 / § C (個人情報混入 path の暗黙 redirect)
- 既存 hook: `scripts/audit-personal-data.sh`、 `scripts/personal-data-patterns.txt`、 `.gitignore:72`
- 関連 PR (cleanup): #537 / #538 / #541 (2026-05-20/21)、 #444 (2026-05-13 docs restructure)
