# DB self-recovery 設計再評価 audit (2026-05-27)

## 背景

2026-05-26 22:18 JST に user の DB が `arcagate.db.corrupted-1779801526` に隔離され、
117 items のうち約 13 items が事実上消えた (現行 DB は 104 items)。 user 提起:

1. **そもそも自動 recovery は製品として必要か?**
2. **個人フォルダ名 (`C:\Users\<個人名>\...`) が path に入るのも嫌**
   (marker file / log / UI に絶対 path を残すと個人名が混入する)。

実コード読みと現物 (隔離 DB + log) の verify から、 自動 recovery は **healthy DB を
silently destroy するリスクのほうが、 想定する corruption 救済の便益より大きい** と
判断するに足る証拠が出た。 本 doc で 4 設計選択肢を比較し、 1 案を推奨する。

## 1. 事実認定 (実コード + 現物 verify)

### 1.1 trigger 経路 (`src-tauri/src/db/mod.rs`)

```
initialize_with_recovery (line 43)
├ Step 1: Connection::open(path) 試行 + apply_pragmas + integrity_check (line 50-64)
│  │
│  └ Err / integrity NG → backup_corrupted_db → fresh_initialize  (line 66-78)
│
└ Step 2: 健全だった or 新規 → migration to_latest (line 81-98)
    │
    └ migration Err → backup_corrupted_db → fresh_initialize  (line 84-98)  ← ★ ここ
```

trigger は **3 種類**:

| trigger                     | 真の corruption?                   | 起こる現実シナリオ                                          |
| --------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| (a) `Connection::open` 失敗 | 大体真 (file system 破損)          | 物理 disk 故障、 file 削除中の race                         |
| (b) integrity_check != "ok" | 真 (page checksum 不一致 等)       | NTFS metadata 破損、 disk セクタエラー                      |
| (c) migration 失敗          | **ほぼ全部 false positive (重要)** | branch 切替で DB が code より先行、 transient lock、 syntax |

### 1.2 2026-05-26 quarantine 真因の確定

`%LOCALAPPDATA%\com.arcagate.desktop\logs\arcagate.log`:

```
[2026-05-26][13:18:46][arcagate_lib::db][WARN] DB backed up due to corruption
(reason='migration failed: rusqlite_migrate error:
MigrationDefinition(DatabaseTooFarAhead)'):
"<APPDATA>\\com.arcagate.desktop\\arcagate.db.corrupted-1779801526"
```

(時刻は UTC、 JST = +9 = 22:18:46。 隔離 file の mtime "May 26 20:02" は隔離直前の
最終書き込み — `fs::rename` で mtime 継承)。

隔離された DB を直接検査:

| 項目             | 結果                       | 解釈                         |
| ---------------- | -------------------------- | ---------------------------- |
| integrity_check  | **ok**                     | SQLite として完全に健全      |
| user_version     | 43                         | migration 43 まで適用済      |
| items テーブル   | 117 件 (現行 104 件と差13) | 実 user data 残存            |
| 全 16 table 存在 | スキーマ完全               | drop / truncate されていない |

→ **真の corruption ではなく、 migration version 44 (= `043` の次) が当時の code
runtime に存在せず `MigrationDefinition(DatabaseTooFarAhead)` を返した結果**、
「migration error = 破損」 とみなす実装が healthy DB を quarantine した。

具体的な発生シナリオ (log の前後関係から):

1. user が PR #589 / #590 系 (migration 044 含む) branch で起動 → DB v43 → v44 等へ進行
2. branch を **古いもの** に切り替えて再起動 (PR review / agent dev) → code が知る
   migration 上限は v43 → runtime が「DB は知らない v44 まで進んでる」 = `DatabaseTooFarAhead`
3. `to_latest()` が Err → `backup_corrupted_db` → fresh DB
4. user は branch を main に戻す → fresh DB に migration 045 / 046 を順に適用
5. log でも `[2026-05-26][15:55:24] migrated to version 43` 以降、 fresh から段階的に
   `44 → 45 → 46` と進行している

## 2. corruption 確率 と destroy リスクのトレードオフ

### 2.1 SQLite で実際に corruption が起きる頻度 (個人ツール想定)

SQLite 公式 [How To Corrupt An SQLite Database File](https://sqlite.org/howtocorrupt.html)
が挙げる corruption 経路と、 本 app での該当性:

| 経路                              | 該当性                               |
| --------------------------------- | ------------------------------------ |
| 複数 process が同 DB を同時 open  | △ (e2e + dev 同時起動の事故あり得る) |
| Memory mapped I/O のページ破損    | × (mmap 不使用)                      |
| SQLite version 差で WAL 不整合    | × (固定 rusqlite)                    |
| disk 故障 (bad sector / dying)    | △ (hardware fault)                   |
| OS crash 中の rename / fsync 不足 | △ (まれ)                             |
| クラウド sync (Dropbox 等) 介入   | × (app data dir は同期外)            |
| antivirus / backup の lock        | △ (Windows Defender 等)              |
| user が file を直接編集 / 移動    | △ (user 教育 issue)                  |

**現実の頻度**: SQLite + WAL + local SSD という構成では年単位で 1 回起きるかどうか。
本 app の利用ピーク 117 items を完全失った user の体験コストは大きい一方、 真の
corruption に遭遇する頻度はそれを正当化しない。

### 2.2 silent destroy 側のリスク (今回証明された)

migration error の中で **「真の corruption」ではないもの** が dominant に多い:

| migration error                | 真の corruption?             | 起こる頻度       |
| ------------------------------ | ---------------------------- | ---------------- |
| `DatabaseTooFarAhead`          | NO (downgrade / branch 切替) | dev では daily   |
| transient `database is locked` | NO (race)                    | まれ but 起こる  |
| migration SQL syntax error     | NO (作る側の bug)            | release 前に発覚 |
| migration SQL semantic 違反    | NO (作る側の bug)            | release 前に発覚 |
| schema constraint 違反         | NO (実 data の状態)          | data shape 依存  |

→ **migration error はそもそも quarantine 対象にすべきではない**。 真の corruption
判定に使うべきは `Connection::open 失敗` と `integrity_check != ok` の 2 つに絞るべき。

### 2.3 個人ツール (`docs/l0_ideas/motivation.md`) としての契約

本 app は **「PC 上に散在する起動元を 1 箇所に集約する個人用ランチャー / 配布水準を
狙う daily-use ツール」**。 user は launch_log / item_stats を毎日蓄積している。
silent destroy は契約違反級。

`CLAUDE.md` の最上位 critical rule:

- "DOM 存在 = 治った 判定 禁止" — silent recovery は user 検知不能の自動「修復」 で
  まさにこの種の禁忌に該当。

## 3. 個人情報 (path) の構造的伏字化

現状、 path は以下で生で露出する:

| 経路                                             | 露出範囲           |
| ------------------------------------------------ | ------------------ |
| log file (`arcagate.log`)                        | local disk 上のみ  |
| 隔離 file 名 `arcagate.db.corrupted-<ts>`        | local のみ         |
| 旧 native dialog 文 (撤去済 案)                  | UI = user 視認のみ |
| (前 PR の) marker file `db-recovery-notice.json` | local のみ         |
| (前 PR の) banner UI                             | UI = user 視認のみ |

「local only」 は技術的には個人情報 leak ではないが、 user が screenshot を共有 /
log を support に貼る / repo issue にコピペする 場面で混入する。 構造的な対策:

### 3.1 path 正規化 helper を 1 箇所に新設

```rust
// src-tauri/src/utils/path_redact.rs (案)
/// 「user 視認 / 共有可能なテキスト」 に出す path を `%APPDATA%\...` 表記に
/// 正規化する。 file system 操作には絶対に使わない (表示専用)。
pub fn redact_for_display(path: &Path) -> String {
    // 1. %APPDATA% (= Roaming) のプレフィックスを `%APPDATA%\` に置換
    // 2. %LOCALAPPDATA% も同様
    // 3. ホームを `~\` に置換 (Documents 等)
    // 4. fallback: file_name() だけ (個人情報なし)
}
```

これにより、 log / UI / marker file に出る path は機械可読 + 個人名なし表記になる。

### 3.2 log の sanitize は最小限で OK

log file は user の disk 上にしか出ない (= remote 送信なし)。 ただし troubleshoot
で user が log を agent / repo issue に貼ることを想定し、 上記 helper を log の
`WARN/ERROR` レイヤーで適用する。 INFO レイヤー (perf metric 等) は対象外。

### 3.3 隔離 file 名は `~/.recovery/<hash>` 形式へ

仮に隔離自体は残す案 (D) を取る場合、 隔離 file 名から user 名を構造的に排除する:

- 旧: `<APPDATA>\com.arcagate.desktop\arcagate.db.corrupted-1779801526`
  (user に見せる時に `C:\Users\<個人名>` が混入)
- 新: 表示時は **必ず `redact_for_display()` を経由** = `%APPDATA%\com.arcagate.desktop\arcagate.db.corrupted-1779801526`

実 file の置き場所は変わらない (file system 操作には絶対 path が必要)、 表示層
で正規化する。

## 4. 設計選択肢

### A. self-recovery 完全撤去

```rust
// initialize_with_recovery を撤去、 通常 initialize() に統一
// migration failure / integrity NG は Err として伝播
//   → tauri setup が Err を返す → panic_hook が dialog で原因表示 → user 自力対処
```

| 項目     | 評価                                                                     |
| -------- | ------------------------------------------------------------------------ |
| 利点     | silent destroy が完全消滅。 user が状況把握してから判断できる            |
| 利点     | コード量大幅減 (recovery / backup / dialog 経路まるごと無くなる)         |
| 利点     | 「DB は壊れない前提」 という SQLite の現実に整合                         |
| 欠点     | 真の corruption (極稀) 時に user が dialog 見て自力対処することになる    |
| 欠点     | dialog で「DB が破損しました、 backup から復元してください」 までは出る  |
| ロス     | user が手動 backup を取っていないと真の corruption で詰む — でも今と同じ |
| 個人情報 | 隔離 file 自体が生まれないので path 露出 surface も縮小                  |
| 実装規模 | 撤去 + dialog 文言 = 1日                                                 |

### B. self-recovery を opt-in モーダル化

```
DB 破損 / migration 失敗を検知:
  ↓
モーダル: 「修復試行 (= 隔離 + fresh DB) / cancel (= 起動拒否、 user 自力対処)」
```

| 項目     | 評価                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 利点     | silent destroy 消滅、 user 同意で destructive 動作                      |
| 利点     | 真の corruption 救済経路は残る                                          |
| 欠点     | UI 実装コスト中 (setup phase でモーダル出すための window 早期 spawn 等) |
| 欠点     | startup を blocking する重い決断を user に強いる (毎回かはともかく)     |
| 個人情報 | path 表示は redact_for_display() 経由 / 隔離は user 同意済              |
| 実装規模 | dialog UI + IPC + 起動 flow 改修 = 2-3日                                |

### C. false-positive trigger を直す (現方針の修正)

```rust
// migration error の中で「真の corruption ではない」 ものは Err として伝播し、
// 隔離しない。 真の corruption (open Err / integrity NG) だけ隔離。
//
// 具体的:
//   - integrity_check != ok  → 隔離継続 (真の corruption)
//   - Connection::open Err    → 隔離継続 (真の物理障害)
//   - migration to_latest Err →
//       └ DatabaseTooFarAhead → Err 伝播、 panic_hook で「DB が新しい code 用で
//                                 開けません、 新しい release で起動してください」 dialog
//       └ database is locked → retry 数回 → 失敗で Err 伝播
//       └ SQL Err            → Err 伝播 (作る側 bug、 release 前に発覚すべき)
```

| 項目     | 評価                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| 利点     | 「真の corruption」 だけが隔離対象になる (false positive 0)                        |
| 利点     | 既存の隔離経路を残しつつ silent destroy のリスク dramatic に低下                   |
| 欠点     | error 分類のホワイトリスト整備 + 維持コスト (rusqlite_migration の error 型に依存) |
| 欠点     | 真の corruption + integrity_check NG ケースの「自動 recovery」 は維持される        |
| 個人情報 | log / 隔離 file 名は redact 必要 (B/D と同等)                                      |
| 実装規模 | error 分類 + 各 path の dialog 文言 + integration test = 2日                       |

### D. 通知 UX (前 PR 案) に戻す + path 伏字化

| 項目     | 評価                                                                     |
| -------- | ------------------------------------------------------------------------ |
| 利点     | 既に branch にあった実装が活きる                                         |
| 欠点     | **silent destroy の根本 (= false positive で healthy DB を消す) は残る** |
| 欠点     | user の根本不満 (「そもそも自動 recovery は要るのか」) に応えない        |
| 個人情報 | `redact_for_display()` で UI / marker は正規化可能                       |
| 実装規模 | 既実装 + redact helper = 半日                                            |

## 5. 推奨

**C (false-positive trigger 修正) + A の精神 (silent destroy をやめる) のハイブリッド** を推奨:

1. **migration error は隔離対象から外す** (今回の真因を構造的に再発防止)
   - `DatabaseTooFarAhead` / lock / SQL error は全て panic_hook 経路で dialog 表示
   - dialog 文言は code path 別に分かれる (例: `DatabaseTooFarAhead` → 「DB が新しい
     code 用に進んでいます、 元 release / 新 release で起動してください」)
2. **真の corruption (integrity_check NG / open 失敗) も 「自動」 にはせず confirm
   モーダル** (= B の精神を残す)
   - 「DB integrity check が失敗しました。 backup を取って fresh DB で起動するか、
     一旦 cancel するか」 を選ばせる
   - これにより 「user 知らないうちに消えた」 が完全に消える
3. **path 表示は `redact_for_display()` 経由に統一** (個人情報 leak surface 縮小)
   - log / dialog / 仮に banner を残すならその UI 全て

実質: **A の「silent destroy 撤廃」 + B の「真 corruption だけ user 同意」 + C の
「migration error は corruption と扱わない」**。

### 副次的な作業

- `MEMORY.md` の lessons に「migration error を corruption と扱わない」 教訓を追加
- `db/mod.rs` の整理: trigger 分類を関数名で明確にする
  (`is_truly_corrupted()` / `is_migration_mismatch()` 等)
- 既存 unit test (`invalid_header_db_recovers` 等) は維持、 新規 test:
  `migration_too_far_ahead_does_not_quarantine` を追加

### 副次的な質問 (本 audit 後に確認したい点)

- 今回の隔離 DB (`arcagate.db.corrupted-1779801526`、 117 items) から
  **手動で 13 items を救出するか** (今回限り、 future の方針とは別件)
- launch_log / item_stats など差分のある table も含めて merge できそうか
  (workspaces は単数なので overwrite で済む)

## 6. 採用後のロードマップ (概算)

1. (推奨選択肢確定後) `db/mod.rs` を C 案ベースで書き換え (半日)
2. integrity NG 経路のみ「user 同意モーダル」 を入れる (1日)
3. `redact_for_display()` 新設 + 全 user 視認 path の経由化 (半日)
4. lesson 追記 + L2 contract doc 更新 (`docs/l2_foundation/lessons.md`、
   `docs/l2_foundation/features/cross-cutting/` の DB lifecycle doc) (半日)
5. user 検収 + 必要なら隔離 DB からの手動救出 (別件)
