# Recipe: 無駄処理 audit (外部 AI tool 実行用)

> 本ファイルは **外部 AI tool (Codex CLI 等) に貼り付けて実行する recipe / prompt** である。
> Arcagate の Functional Spec (機能契約) と実装の乖離を棚卸しし、無駄処理 / 不要処理を発見する。
>
> 目的: Claude が確立した audit 手順を別ツールでも再現し、**別モデルによるクロスチェック**を行う。
> 同じ recipe を複数 tool に通すことで、片方が見落とした契約逸脱をもう片方が拾える。

---

## 1. 目的

- Arcagate の各 feature には **Functional Spec (機能契約)** があり、「やること」だけでなく
  **「やらないこと」「性能予算」「副作用」「依存」** を明文化している。
- 実装が spec の契約から逸脱すると、不要処理 / 性能事故 / dead code が混入する。
  実例: 2026-05-19 の Library freeze (#524) は「metadata 取得が非画像 file のハンドルを
  開いて Defender scan を誘発」という契約違反だった。
- この recipe は spec ⇄ 実装を機械的に突き合わせ、**契約外の処理を発見**する手順である。
- 対象 repo = Arcagate (Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite)。
- 想定 tool = Codex CLI (read-only mode)。他の AI tool でも手順は同一。

---

## 2. 入力 (audit 対象)

| 入力                                                               | 内容                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `docs/l2_foundation/features/`                                     | 全 feature の Functional Spec 群 (screens / widgets / backend / cross-cutting)。**契約の正本**。`README.md` に全体地図 |
| `src/`                                                             | frontend (SvelteKit / Svelte 5 runes)                                                                                  |
| `src-tauri/`                                                       | backend (Rust / Tauri commands / services / repositories)                                                              |
| `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` | **既存 audit 例**。発見項目 W-1〜W-8 の書式・粒度の参照雛形。再発見した場合は「既対処」注記を付ける                    |
| `scripts/audit-async-commands.sh`                                  | heavy I/O command の sync/async を機械検出する既存 lint。recipe 実行時はこれを補完する観点で見る                       |

---

## 3. 手順 (step by step / コピペ実行可)

1. **全 spec を読む**: `docs/l2_foundation/features/` 配下の `.md` を全件読む (README 含む)。
   spec は固定 7 セクション (目的 / やること / **やらないこと** / 性能予算 / 副作用 / 依存 / 既知の判断)。
2. **契約を抽出**: 各 spec から「やらないこと」「性能予算」「副作用」「依存」を箇条書きで列挙する。
   特に「やらないこと」は **禁止事項の一次ソース**。
3. **キーワード化**: 抽出した契約を grep 可能な語に落とす。例:
   - 「DB lock を握ったまま I/O しない」→ `lock(` `Mutex` `File::open` `fs::` `Command::`
   - 「per-card の $effect から個別 IPC を呼ばない」→ `$effect`と`invoke(` の同居
   - 「polling を持たない」→ `setInterval` `setTimeout`
   - 「色派生に JS fallback を持たない」→ `oklch` `hsl` `rgb` 変換関数
4. **違反を検索**: `grep` / ripgrep で候補を絞り、**該当ファイルを実際に Read** して文脈を確認する。
   grep ヒットだけで判定しない (false positive 排除)。dead code 判定は import / dynamic import /
   route mount / registry 登録 / 文字列 ID 参照の 5 経路すべてを確認する。
5. **表化**: 発見項目を以下の軸で整理する。
   - 重大度 (Critical / High / Medium / Low)
   - 無駄度 (確実に無駄 / 多分無駄 / 議論余地あり)
   - 関連 spec / 該当コード `path:line` / spec で禁止されてること / 現実装の挙動 / なぜ無駄か /
     推奨対処 / 工数感 (〜分 / 半日 / 1 日)
6. **出力**: `docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_<YYYY-MM-DD>.md` に
   §5 のフォーマットで書き出す (日付は audit 実行日)。
7. **summary 印字**: stdout に「発見 N 件 / Critical N・High N・Medium N・Low N / 推定削減効果」を
   簡潔に印字する。

---

## 4. 発見パターンのチェックリスト

W-x は既存 audit (`WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`) の発見例。**これらは #526 で対処済**
のため再発見したら「既対処」と注記する。同種の新規発見を以下の観点で探す。

| # | パターン                              | 既存例 / 探し方                                                                                                                                                                                       |
| - | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a | **DB lock 保持中の heavy I/O**        | W-1: `launch_item` が `Mutex<Connection>` lock 保持中に preflight stat + process spawn。`lock()` のスコープ内に `File::open` / `fs::` / `Command::` / `path.exists()` が無いか                        |
| b | **async でない command の heavy I/O** | W-2: filesystem walk / file open / process spawn / HTTP を行う `#[tauri::command]` が sync。`scripts/audit-async-commands.sh` が機械検出するが、lint 未カバーの間接 I/O (service 経由) も Read で確認 |
| c | **N+1 query / batch 漏れ**            | ループ内で 1 件ずつ SQL / IPC を発火。batch 版があるのに個別呼びしている経路                                                                                                                          |
| d | **起動時 eager fetch**                | アプリ起動時に lazy で良い重い処理 (全 item の icon 抽出 / 全フォルダ scan 等) を eager 実行                                                                                                          |
| e | **dead code**                         | W-5/6/7: 呼び出し元ゼロの command / wrapper / module。`#[allow(dead_code)]` 付きの放置 module                                                                                                         |
| f | **UI に出ているが no-op**             | W-4: Item widget の `sort_field: 'recent'` が選択可能だが manual と同一挙動。設定肢 / button が実体のない placeholder                                                                                 |
| g | **legacy fallback の残骸**            | W-8: 新 config に移行後も旧 key の fallback コードが残る。migration で一掃できるもの                                                                                                                  |
| h | **backdrop-filter 過剰**              | `backdrop-filter` / `filter: blur()` が必要以上の要素 (canvas 上の全 widget 等) に個別適用され GPU 負荷                                                                                               |
| i | **polling 過剰 / 不要 timer**         | spec で「polling を持たない」とされた widget の `setInterval`、または間隔が spec 下限を割る polling                                                                                                   |
| j | **localStorage / DB の冗長書き込み**  | 同じ値を毎 effect で書き戻す。no-op guard (same-check) の欠落                                                                                                                                         |
| k | **並列化漏れ**                        | 独立した複数の I/O を逐次実行。`Promise.all` / batch IPC / thread 並列で短縮できる箇所                                                                                                                |
| l | **pre-fetch / cache の浪費**          | 使われない先読み、cache hit するのに再計算・再取得している経路。動的派生 (`oklch(from …)` 等) の毎回再計算                                                                                            |

---

## 5. 報告フォーマット (出力雛形)

`docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_<YYYY-MM-DD>.md` を以下の構成で書く。

```markdown
# 無駄処理 audit (Functional Spec ベース)

> <実行日> 実施。<対象> を spec の「やらないこと」「性能予算」と突き合わせて棚卸し。

## サマリ

- spec 外 / 契約逸脱の発見: N 件
- うち Critical N / High N / Medium N / Low N
- 推定削減効果 (perf / コード行数 / 認知負荷)

### 検証して clean だった項目 (誤検知防止のため明記)

| 項目   | 結論                          |
| ------ | ----------------------------- |
| <観点> | <spec 準拠 / 修正済 等の根拠> |

## 発見項目

### W-N: <タイトル>

- 重大度: Critical / High / Medium / Low
- 無駄度: 確実に無駄 / 多分無駄 / 議論余地あり
- 関連 spec: docs/l2_foundation/features/<path>.md
- 該当コード: <path:line>
- spec で禁止されてること: 「...」
- 現実装が実際にやってること: 「...」
- なぜ無駄か: 「...」
- 推奨対処: 「...」
- 工数感: 〜分 / 半日 / 1 日
```

---

## 6. ルール (recipe 実行者向け)

- **実装変更をしない**。audit と report のみ。コード・spec を編集しない。
- **false positive を出さない**。grep ヒットだけで断定せず、必ず該当ファイルを Read して文脈を確認する。
  推測は「未確認」と明記する。
- 既存 audit の **W-1〜W-8 が再出現したら「既対処 (#526)」と注記**し、重複カウントしない。
- **発見ゼロでも report を出す**。「全 spec を突き合わせ、契約逸脱なし」と明記する
  (clean の事実も成果物)。
- 各発見は `path:line` を正確に。spec のどの行・どの契約に反するかを引用する。
- 重大度は「毎日使えるか (daily-use)」観点で判定する。UI を freeze させる / データを失う系は High 以上。

---

## 7. Codex CLI 実行例

本ファイルの §1〜§6 全文を prompt として外部 tool に渡す。Codex CLI の場合:

```bash
cd /path/to/arcagate

# 本 recipe doc をそのまま prompt として渡す (read-only mode で実装変更を防ぐ)
codex --read-only - < docs/l2_foundation/audit/RECIPE_wasteful_processing_audit.md
```

heredoc で追加指示を添えて渡す場合:

```bash
cd /path/to/arcagate

codex --read-only - <<'PROMPT'
以下の recipe に従って Arcagate の無駄処理 audit を実行せよ。
recipe 本体: docs/l2_foundation/audit/RECIPE_wasteful_processing_audit.md を読むこと。

- §3 の手順を step 1 から順に実行する
- §4 のチェックリスト全 12 パターンを走査する
- §5 のフォーマットで docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_<本日日付>.md に出力
- §6 のルールを厳守 (実装変更禁止 / false positive 禁止 / 既対処は注記)
- 完了後 stdout に発見件数の summary を印字
PROMPT
```

実行後、生成された `WASTEFUL_PROCESSING_AUDIT_<日付>.md` を Claude 側の audit 結果と
突き合わせ、片方のみが拾った項目をクロスチェックの成果として扱う。

---

## 関連

- Functional Spec 本体: [`../features/`](../features/) (`README.md` に全体地図)
- 既存 audit 例: [`./WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`](./WASTEFUL_PROCESSING_AUDIT_2026-05-19.md)
- 機械検出 lint: `scripts/audit-async-commands.sh` (heavy I/O command の sync/async)
- 失敗駆動メモリ: [`../lessons.md`](../lessons.md)
