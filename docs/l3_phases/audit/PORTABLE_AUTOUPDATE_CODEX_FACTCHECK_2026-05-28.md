# Portable + 自動更新 audit の Codex 独立 fact-check (2026-05-28)

`PORTABLE_AUTOUPDATE_ANALYSIS_2026-05-28.md` (Velopack 第 1 推奨) の主要 claim を、
**Codex CLI (`codex exec` + web_search 有効) に独立検証させた**結果。 Claude 側の WebFetch
結論を信用せず、 Codex が一次ソース (GitHub source / 公式 docs / crates.io / docs.rs) を
独自に引いて真偽判定したもの。 本 doc は **検証のみ**。 実装・doc 書き換えは行っていない。

実行: `codex-cli 0.132.0` / `model_reasoning_effort=high` / `tools.web_search=true` /
`--sandbox read-only`。 2 回実行 (8 claim 一括 + claim 4 の crate version 集中再検証)。

---

## 結論先出し

**Velopack 第 1 推奨は維持できる**。 8 claim 中 7 件が Codex 独立検証で「真 / 部分的に正しい」。

ただし **claim 4 (「`velopack` crate v1.0.1、 2026-05-26 release」) は事実誤認**。
crates.io 上の Rust crate は `1.0.1` ではなく `0.0.1589-ga2c5a97` (latest, 2026-04-14 publish)
という別 version scheme。 `1.0.1` は **GitHub の release tag** であり crate version ではない。
→ **推奨そのものは崩れない** (crate は実在・MIT・publish 済・維持されている) が、
audit doc の version 記述と「1.0 GA 直後」という framing は**訂正が必要**。

---

## A. claim ごとの判定表

| # | claim 要旨                                                                                                                | Codex 判定                          | 当方マーク                     |
| - | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| 1 | tauri-plugin-updater v2: `WindowsUpdaterType` は `Nsis`/`Msi` の 2 variant のみ、 zip in-place 上書き経路は source に無い | TRUE                                | ✓                              |
| 2 | VSCode portable 公式 doc に「the Windows ZIP archive does not support auto update」明記                                   | TRUE                                | ✓                              |
| 3 | Velopack は Squirrel.Windows → Clowd.Squirrel → Velopack の正統後継、 Caelan Sayler が継続維持                            | PARTIALLY-TRUE                      | △ 部分的に正しい               |
| 4 | **Velopack に Rust SDK = `velopack` crate v1.0.1、 MIT、 2026-05-26 release**                                             | **UNVERIFIABLE → 集中再検証で反証** | **✗ 反証 (version/date 部分)** |
| 5 | Velopack は portable target を公式 self-update 対応 (`MyAppId-Portable.zip` artifact)                                     | TRUE                                | ✓                              |
| 6 | Clowd.Squirrel は 2024-07-05 archived                                                                                     | TRUE                                | ✓                              |
| 7 | Velopack 製アプリは `C:\Program Files` 配下に置けない (admin 領域)                                                        | TRUE                                | ✓                              |
| 8 | Velopack のライセンスは MIT                                                                                               | TRUE                                | ✓                              |

---

## B. Codex 独立回答の要点引用

### claim 1 (✓ TRUE)

> `plugins/updater/src/updater.rs` on `v2`: `WindowsUpdaterType` has only `Nsis` and `Msi`
> variants. The Windows path extracts zip payloads to `.exe`/`.msi` and then runs installer
> flow (`ShellExecuteW`), not app-folder overwrite.
> NUANCE: There _is_ zip handling on Windows, but it is "zip containing installer," not
> in-place zip replacement of the installed app directory.

→ audit § A.2 の記述と一致。 Codex も v2 ブランチの実ファイルを開いて確認。

### claim 2 (✓ TRUE)

> VS Code portable docs explicitly say the Windows ZIP archive "does not support auto update."
> NUANCE: specifically about the ZIP portable install path, not MSI/System installs.

→ audit § C.1 の引用は正確。

### claim 3 (△ PARTIALLY-TRUE)

> Clowd repo says it is "forked from Squirrel/Squirrel.Windows," README says "This repository
> has moved" to Velopack. Velopack docs/blog identify Caelan Sayler as "Velopack Co-Founder".
> Velopack releases/changelog show ongoing `@caesay` maintenance activity.
> NUANCE: "Legitimate successor (正統後継)" is subjective wording; the lineage itself is
> directly documented.

→ 系譜・継続維持は一次ソースで裏付けあり。「正統後継」という言葉自体は主観表現、という指摘のみ。
実質的に audit の主張は成立。

### claim 4 (✗ 反証 — 集中再検証の結果)

1 回目: UNVERIFIABLE (docs.rs の rustdoc landing は `velopack-1.0.1` を表示する一方、
crates.io の crate page は `0.0.1298` / `0.0.1589 (2026-04-14)` 系を最新と表示し、 一次ソースが矛盾)。

2 回目 (crates.io 集中検証):

> 1. Latest crates.io version of `velopack`: **`0.0.1589-ga2c5a97`**.
> 2. Recent versions: `0.0.1589-ga2c5a97` (2026-04-14) / `0.0.1535-gb21da2a` (2026-03-22) /
>    `0.0.1521-gf115f70` (2026-03-17) / `0.0.1444-gc245055` (2026-02-26) / `0.0.1442-gfaff302` (2026-02-24)
> 3. crates.io に `1.0.1` という published version は **存在しない**。
> 4. GitHub には release tag **`1.0.1`** が存在 (2026-05-26)。
> 5. 結論: 「velopack Rust crate は 1.0.1、 2026-05-26 release」は crates.io 上**不正確**。
>    `1.0.1` は **GitHub release tag**。 Rust crate は別 scheme (`0.0.1589-ga2c5a97` 系、 最新 2026-04-14)。

→ **audit § D.1 / D.4 / G.1 の「`velopack` crate v1.0.1」「1.0 GA 直後」は誤り**。
crate version と GitHub release tag を取り違えている。 ただし crate の実在・MIT・publish 済・
継続維持 (claim 8 で MIT も確認) は事実なので、 **Rust SDK が使えるという根幹は揺るがない**。

### claim 5 (✓ TRUE)

> Packaging docs list `MyAppId-Portable.zip` and say it lets users "run and update your app
> without installing".
> NUANCE: This is an optional artifact, alongside installer and nupkg outputs.

→ audit § D.2 と一致。「portable + self-update を公式サポート」は成立。

### claim 6 (✓ TRUE)

> GitHub banner on Clowd.Squirrel says archived on **Jul 5, 2024**.

→ audit § E と一致。

### claim 7 (✓ TRUE)

> Velopack Windows docs state updater/installer currently do not support privileged dirs
> "such as `C:\Program Files`".
> NUANCE: Docs phrase this as a **current limitation** and say support is **planned later**.

→ audit § D.6 と一致。 なお「将来サポート予定」という nuance は audit に記載なし (追記候補)。
Arcagate は Program Files 配置を要求しないので影響なし。

### claim 8 (✓ TRUE)

> Velopack GitHub repo license is MIT. docs.rs rustdoc header for velopack also marks MIT.

→ audit § D.1 と一致。

---

## C. audit doc の結論への影響

| 観点                                                             | 影響                                                                                | 対応                                                                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Velopack を第 1 推奨とする結論                                   | **影響なし** (根拠 claim の大半が真)                                                | 維持                                                                                                                             |
| `velopack` crate の version 記述 (`v1.0.1`)                      | **誤り** — crate は `0.0.1589-ga2c5a97` (latest 2026-04-14)、 `1.0.1` は GitHub tag | § D.1 / D.4 / G.1 を訂正                                                                                                         |
| 「v1.0.1、 2026-05-26 リリース (2 日前)」「1.0 GA 直後」 framing | **誤り** — GitHub tag の日付を crate に誤適用                                       | 「GitHub release 1.0.1 (2026-05-26)。 crates.io 上の Rust crate は `0.0.xxxx-g<hash>` scheme で latest は 2026-04-14」と書き換え |
| crate の存在 / MIT / 維持状態                                    | 事実 (claim 8 + claim 3 で裏付け)                                                   | 維持                                                                                                                             |
| portable + self-update 公式サポート (claim 5)                    | 事実                                                                                | 維持                                                                                                                             |
| Program Files 不可 (claim 7)                                     | 事実、 ただし「将来サポート予定」nuance を追記推奨                                  | nuance 追記                                                                                                                      |
| tauri-plugin-updater v2 を避ける結論 (claim 1)                   | 事実                                                                                | 維持                                                                                                                             |

**補足の注意点 (Codex 検証で浮上した meta リスク)**: crate が `0.0.xxxx` pre-1.0 scheme の
ままという事実は、 audit が「1.0 GA 直後で production-ready」と評した印象とずれる。 GitHub の
製品 release は 1.x でも、 **Rust から使う crate API は依然 0.0.x (semver 上 unstable 扱い)** で
ある点は、 採用判断時に認識しておくべき (breaking change が minor で来る可能性)。

---

## D. 最終判定

**Velopack 第 1 推奨は維持可能。 ただし audit doc に 1 箇所の事実訂正が必要。**

- **維持**: 推奨の根幹 (portable + 公式 self-update / MIT / Rust SDK 実在 / Squirrel 系後継 /
  tauri-plugin-updater v2 は portable 非対応) は Codex 独立検証ですべて裏付けられた。
- **訂正必須 (claim 4)**: 「`velopack` crate v1.0.1、 2026-05-26 release」→
  正しくは「crates.io の Rust crate は `0.0.1589-ga2c5a97` (latest, 2026-04-14 publish)、
  `1.0.1` は GitHub release tag (2026-05-26)」。 crate は **pre-1.0 (0.0.x) semver** である旨を明記。
- **追記推奨 (claim 7)**: Program Files 非対応は「現状の制限で将来サポート予定」という公式 nuance。
- **撤回は不要**。

> 訂正は本 fact-check では実施していない (検証のみの依頼)。 audit doc § D.1 / D.4 / D.6 / G.1 の
> 該当行修正は別途。

---

## E. 検証メタ情報

- Codex 実行ログ: `E:\tmp\codex-factcheck\run.log` / `run2.log` (ephemeral session、 session file 非永続)
- 一括 prompt: `E:\tmp\codex-factcheck\prompt.txt` / 集中 prompt: `prompt2.txt`
- Codex が独自に引いた一次ソース (回答内引用):
  - `raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/updater/src/updater.rs`
  - `code.visualstudio.com/docs/editor/portable`
  - `github.com/clowd/Clowd.Squirrel` (archived banner)
  - `crates.io/crates/velopack/versions` / `docs.rs/crate/velopack/latest`
  - `github.com/velopack/velopack/releases` (tag 1.0.1)
  - `docs.velopack.io/packaging/overview` / `docs.velopack.io/packaging/operating-systems/windows`
  - `github.com/velopack/velopack` (MIT license)
