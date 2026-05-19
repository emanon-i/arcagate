# RECIPE: 無駄処理 audit (外部 AI ツール向け)

> このファイルは **外部 AI コーディングツール (Codex CLI / 他 coding agent) にそのまま貼り付けて実行できる
> 自己完結 prompt** である。Arcagate リポジトリに対し「Functional Spec の機能契約と実装の乖離 (= 無駄処理 /
> 契約逸脱)」を発見する audit を、Claude 以外のツールでもクロスチェックとして再実行できるようにする。
>
> 初回の audit は Claude 側で実施済 (PR #525 で機能 spec 新設 → PR #526 で W-1〜W-8 を fix)。
> 結果記録は `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`。
> 同じ手順を別ツールで走らせ、見落とし / 新規発生分を相互検証するのが本 recipe の目的。

---

## この audit は何か

- **目的**: 各 feature の Functional Spec (機能契約) と実装を突き合わせ、spec が「やらないこと」と
  宣言した処理を実装が行っていないか / 「性能予算」を逸脱していないか / dead code・no-op 機能・
  legacy 残骸が無いかを棚卸しする。
- **対象リポジトリ**: Arcagate — PC 上の起動元を集約する個人用ランチャー。
  Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite。
- **想定ツール**: Codex CLI を主に想定。Claude Code / 他 coding agent でも実行可。
  read-only モード (実装変更なし) で走らせること。
- **背景**: 2026-05-19 の Library freeze (#524) の真因は「機能契約が docs に無く、metadata 取得が
  非画像 file のハンドルを開いて Defender real-time scan を誘発しても、それが契約違反だと気づける
  規範が無かった」こと。各 feature の「やらないこと」を明文化した spec 群 (#525) を基準線として、
  実装の逸脱を機械的・網羅的に検出するのがこの audit である。

---

## 入力 (audit 実行者が読むもの)

| 入力 | パス | 用途 |
| ---- | ---- | ---- |
| 機能 spec 全件 | `docs/l2_foundation/features/` 配下の全 `.md` (screens / widgets / backend / cross-cutting、計 45 件前後) | 契約の正本。「やらないこと」「性能予算」「副作用」「依存」を抽出 |
| spec フォーマット説明 | `docs/l2_foundation/features/README.md` | 各 spec の 7 セクション構成。どこを読むべきかの地図 |
| frontend ソース | `src/` | spec 逸脱の検証対象 (Svelte / TS) |
| backend ソース | `src-tauri/` | spec 逸脱の検証対象 (Rust) |
| 既存 audit (雛形) | `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` | 報告フォーマットの実例。W-1〜W-8 の既対処項目一覧 (再発判定の基準) |
| 再発防止 lint | `scripts/audit-async-commands.sh` | W-2 型 (sync command の main thread block) の機械検出スクリプト。改善余地もチェック対象 |

---

## 手順 (step by step、コピペで実行可)

1. **全 spec を読む**
   `docs/l2_foundation/features/` 配下の全 `.md` を読み込む。先に `features/README.md` を読んで
   7 セクション構成 (目的 / やること / **やらないこと** / 性能予算 / 副作用 / 依存 / 既知の判断) を把握する。

2. **契約条項を抽出する**
   各 spec から「やらないこと」「性能予算」「副作用」「依存」の各項目を逐語で書き出す。
   特に「やらないこと」が事故防止の本丸。spec 自身が ⚠️ で課題認定している箇所も拾う。

3. **契約条項を検索キーワード化する**
   抽出した各条項を、grep で実装を当たれる具体キーワードに変換する。例:
   - 「非画像ファイルのハンドルを開かない」→ `File::open` / `fs::read` の周辺に拡張子判定があるか
   - 「DB lock を握ったまま filesystem I/O をしない」→ `.lock()` のスコープ内に `.exists()` / `spawn` / `File::open`
   - 「main thread blocking I/O 禁止 / 重い OS 呼び出しは spawn_blocking」→ `#[tauri::command]` の直後が
     `pub fn` (sync) か `pub async fn` か
   - 「per-card の `$effect` から個別 IPC を呼ばない」→ Svelte component 内の `$effect` + `invoke` 併存

4. **実装を網羅検索する**
   各キーワードを `src/` / `src-tauri/` 全体に grep / Read で当て、契約違反の有無を確認する。
   ヒットしたら必ず該当ファイルを Read して**前後の文脈まで読み、本当に違反かを確定**させる
   (grep 一致だけで違反断定しない — false positive 防止)。

5. **違反項目を表にまとめる**
   確定した違反を 1 件ずつ「重大度 / 工数 / 無駄度 / `path:line` / 推奨対処」で整理する。
   後述の[報告フォーマット](#報告フォーマット)に従う。

6. **結果ファイルを出力する**
   `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_<YYYY-MM-DD>.md` に書き出す
   (`<YYYY-MM-DD>` は実行日。既存 `WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` と命名整合)。
   既存ファイルは上書きしない — 新しい日付の別ファイルとして作る。

7. **サマリを stdout に印字する**
   発見件数 / 重大度内訳 / 既対処 (W-1〜W-8) の再発有無 / clean 確認項目数を標準出力に出す。

---

## 発見すべきパターン (チェックリスト)

初回 audit (W-1〜W-8) で実際に見つかった型と、同種で見落としやすい候補。各項目を spec の契約と
突き合わせて検証する。

### 初回 audit で確定した型 (W-1〜W-8)

| 型 | 内容 | 検索の当て方 |
| -- | ---- | ------------ |
| W-1 型 | **DB lock 保持中の heavy I/O** — `Mutex<Connection>` を握ったまま `.exists()` / process spawn / file open | `.lock()` のスコープを読み、スコープ内に FS I/O や `Command::spawn` が無いか |
| W-2 型 | **sync `#[tauri::command]` の main thread block** — filesystem walk / file open / process spawn / HTTP を行う command が `pub fn` (非 async) | `#[tauri::command]` の次行が `pub async fn` か `pub fn` か。後者で heavy I/O を含むなら違反。`scripts/audit-async-commands.sh` が機械検出するが、**この lint 自体の SYNC_ALLOWED が陳腐化していないか / 検出漏れの型が無いかもチェック対象** |
| W-3 型 | **cancel token の欠落** — spec が「cancel 可能」と契約する scan / walk に中断機構が無い | spec の「cancel 可能」記述に対し、実装側に `AtomicBool` / cancel state があるか。類似 command 間の非対称を探す |
| W-4 型 | **UI に出ているが no-op の機能** — 設定肢 / ボタンが存在するが選んでも何も変わらない | spec が ⚠️ で placeholder と認める項目。`<option>` / button に対応する実装分岐が実在するか |
| W-5/6/7 型 | **dead code** — 呼び出し元 0 の command / wrapper、`#[allow(dead_code)]` 付きモジュール | command / 関数名で全文検索し、定義以外の参照が 0 か。後述「dead code 5-path 検証」必須 |
| W-8 型 | **legacy code path / fallback 残骸** — 旧 config への後方互換 fallback が新規パスでは常に dead branch | `?? config.old_key ??` 等の fallback。現行 UI が old_key を書き込むか確認 |

### 同種で見落としやすい追加候補

- **N+1 query** — ループ内で 1 件ずつ DB query / IPC を発火 (batch 化されていない)
- **起動時 eager fetch で済むのに毎回 fetch** — 不変データを mount/再描画のたびに取得
- **backdrop-filter / GPU 重い CSS の過剰適用** — `backdrop-filter` / 大きな `box-shadow` / `filter` を
  widget body 単位で個別適用 (theme の共通クラスに集約すべき)
- **folder watch / polling の過剰間隔** — spec の下限を下回る `setInterval` / watch 間隔。
  polling 禁止 widget に `setInterval` が混入していないか
- **localStorage / DB の冗長書き込み** — 値が変わっていないのに毎回 write、debounce 無しの高頻度 write
- **同期処理の N 並列化漏れ** — 独立した I/O を直列ループで回している (並列化で短縮できる)
- **pre-fetch / cache の浪費** — 表示されない / 使われないデータの先読み、無効化されない肥大 cache
- **重複した型定義 / IPC wrapper** — 同一処理に対し単発版と batch 版が両方残り、単発版が dead

---

## 報告フォーマット

`docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` の構成をそのまま雛形とする。
出力ファイルは以下の構成にする:

```markdown
# 無駄処理 audit (Functional Spec ベース)

> <実行日> 実施。<ツール名> による <N> 回目 / クロスチェック audit。
> docs/l2_foundation/features/ 配下の全 spec を読み、「やらないこと」「性能予算」と
> 現実装を突き合わせて spec 外 / 不要処理を棚卸し。

## サマリ

- spec 外 / 契約逸脱の発見: N 件 (Critical x / High x / Medium x / Low x)
- 既対処 (#526 W-1〜W-8) の再発: あり / なし — あれば項目を明記
- 最重要は ...

### 検証して clean だった項目 (誤検知防止のため明記)

| 項目 | 結論 |
| ---- | ---- |
| ... | spec 準拠。... |

---

## 発見項目

### <ID>: <一行タイトル>

- **重大度: Critical / High / Medium / Low**
- **無駄度: 確実に無駄 / 多分無駄 / 議論余地あり**
- 関連 spec: `docs/l2_foundation/features/...`
- 該当コード: `src/.../foo.rs:NN-MM`
- spec で禁止されてること: <逐語引用 + どの spec のどの section か>
- 現実装が実際にやってること: <事実>
- なぜ無駄か: <根拠>
- 推奨対処: <具体策>
- 工数感: <〜N 時間 / 半日 / 1 日>
```

各フィールドの意味:

| フィールド | 内容 |
| ---------- | ---- |
| ID | `W-9`, `W-10` ... と W-8 の続き番号。再発なら元 ID を流用し「既対処」注記 |
| 重大度 | Critical (即 freeze / data 破損) / High / Medium / Low |
| 無駄度 | 「確実に無駄」「多分無駄」「議論余地あり」の 3 段階 |
| 関連 spec | 違反元の spec ファイルパス |
| 該当コード | `path:line` 形式。範囲なら `path:NN-MM` |
| spec で禁止 | spec 本文の逐語引用 (どの section かも明示) |
| 現実装 | コードが実際に行っていること (事実のみ) |
| なぜ無駄 | 性能 / 認知負荷 / コード量のどれをどう損なうか |
| 推奨対処 | 実装方針。選択肢が複数あるなら併記 |
| 工数感 | おおよその実装時間 |

### dead code 判定の 5-path 検証 (W-5/6/7 型で必須)

「呼び出し元 0」と判定する前に、以下 5 経路すべてを確認する (import grep だけでは不十分):

1. static import / `use` 文
2. dynamic import / 遅延ロード
3. route mount / Tauri invoke handler 登録
4. registry / widget 登録テーブル
5. 文字列識別子経由の参照 (`invoke("cmd_xxx")` の文字列リテラル等)

5 経路すべてで参照 0 を確認できて初めて dead code と断定する。

---

## ルール (recipe 実行者へ向けて)

- **実装変更は禁止**。この audit は調査と報告のみ。コードを書き換えない (read-only)。
- **false positive を出さない**。grep 一致だけで違反断定しない。必ず該当ファイルを読み、
  文脈まで確認して「確実に違反」と言い切れる項目だけを report に上げる。確証が持てない項目は
  「要確認」として別枠に書く (発見項目に混ぜない)。
- **既対処 W-1〜W-8 の扱い**。`WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` の W-1〜W-8 は #526 で
  対処済。同名・同型の項目が**また出てきたら必ず「既対処」と注記**し、(a) 対処が revert された
  真の再発なのか (b) recipe 実行者の誤検知なのかを判定して書く。判定がつかなければ「要確認」へ。
- **発見ゼロでも report する**。違反が 1 件も無くても出力ファイルを作り、「clean を確認した」
  ことと検証した項目一覧を残す。clean の確認も audit の成果である。
- **clean 項目も明記する**。「検証して clean だった項目」表を必ず埋める。何を見て問題なしと
  判断したかを残すことで、次回 audit の重複を減らし、誤検知の自己検証にもなる。

---

## Codex CLI 実行例

このファイル全体を prompt として Codex CLI に渡す。実コマンドのオプションは
[Codex CLI の公式ドキュメント](https://github.com/openai/codex)を参照 (バージョンで差があるため
推測で固定せず、以下は一般化したプレースホルダ形式):

```bash
# リポジトリのルートで実行する
cd <ARCAGATE_REPO_ROOT>

# read-only モード (実装変更不可) でこの recipe を prompt として渡す。
# <READ_ONLY_FLAG> は使用ツールのドキュメントで確認すること
#   (例: Codex CLI なら sandbox / approval を read-only 相当に設定)。
codex <READ_ONLY_FLAG> - <<'PROMPT'
あなたは Arcagate リポジトリの無駄処理 audit を実行する。
以下の recipe に厳密に従い、実装は一切変更せず、audit 結果ファイルとサマリのみを出力すること。

--- RECIPE ここから ---
(docs/l2_foundation/audit/RECIPE_wasteful_processing_audit.md の「この audit は何か」以降の全文を貼り付け)
--- RECIPE ここまで ---
PROMPT
```

Claude Code / 他 coding agent で実行する場合も同様に、この recipe 全文を最初の指示として渡し、
read-only (調査のみ) で走らせる。

---

## 関連

- 既存 audit (雛形 / 既対処 W-1〜W-8): `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`
- 機能 spec 全件: `docs/l2_foundation/features/` (フォーマット説明は `features/README.md`)
- 再発防止 lint: `scripts/audit-async-commands.sh` (W-2 型の機械検出)
- 失敗駆動メモリ: `docs/l2_foundation/lessons.md`
