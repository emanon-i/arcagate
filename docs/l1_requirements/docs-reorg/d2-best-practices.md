# D2: ドキュメント体系 best practice (web research)

**Status**: 2026-05-06 D1 後、D3 の設計判断インプット
**Method**: agent web fetch、出典 link は最終 §6 に集約

## 1. Diátaxis (4 modes、現代の de facto standard)

**出典**: https://diataxis.fr/ / https://diataxis.fr/start-here/

> "Diátaxis identifies four distinct needs, and four corresponding forms of documentation - tutorials, how-to guides, technical reference and explanation."

### 4 モード

| mode          | 軸                     | 目的                                 |
| ------------- | ---------------------- | ------------------------------------ |
| Tutorials     | learning-oriented      | 初心者を導く授業                     |
| How-to guides | work-oriented          | 既に分かってる user の作業ゴール達成 |
| Reference     | information-oriented   | 事実の網羅、構造は対象システムに従う |
| Explanation   | understanding-oriented | 「なぜそうなのか」 の理解            |

### 規模 / 構造

- ファイル / ディレクトリ命名は **規定なし** ("It doesn't impose implementation constraints")
- lifecycle / status は **規定なし** (内容のモード分類のみ)
- 規模適合: small から large まで agnostic、incremental 採用可 ("you can do just one thing, right now")

### LLM agent 適性

- 強み: モード分類が機械的、agent が page 内容から quadrant を判別可能
- 弱み: 短命 doc (plan / audit / investigation) や「決定の経緯」 は対象外、Diátaxis 単体ではカバー不能

### 最大 pitfall

> "Crossing or blurring the boundaries described in the map is at the heart of a vast number of problems in documentation."

## 2. ADR (Architecture Decision Records、Nygard 2011)

**出典**: https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions / https://adr.github.io/ / https://github.com/joelparkerhenderson/architecture-decision-record

### 構造 (Nygard 原典)

> "An architecture decision record is a short text file in a format similar to an Alexandrian pattern... We will keep ADRs in the project repository under doc/arch/adr-NNN.md"

各 ADR の section:

1. **Title** (短い名詞句)
2. **Context** (背景)
3. **Decision** (採用)
4. **Status** (Proposed / Accepted / Deprecated / Superseded)
5. **Consequences** (帰結)

### Naming (2 流派)

- Nygard: `adr-NNN.md` (連番)
- JPH: kebab-case 動詞句、例 `choose-database.md` / `format-timestamps.md`

### Lifecycle (Nygard)

```
Proposed → Accepted → (Deprecated | Superseded by ADR-MMM)
```

**append-only**、決定を後から書き換えない。撤回時は新 ADR で supersede。

### LLM 適性

- 強み: 1 file = 1 decision、stable header (Status/Context/Decision/Consequences) を agent が確実に parse、supersede graph を agent が辿れる
- 弱み: 短命 doc / how-to / reference は ADR の範囲外

### 最大 pitfall (Nygard)

> "If the project accumulates too many decisions accepted without understanding, then the development team becomes afraid to change anything."

## 3. RFC / DEP (proposal pattern、Rust / PEP / Go)

**出典**: https://github.com/rust-lang/rfcs / https://peps.python.org/pep-0001/ / https://github.com/golang/proposal

### lifecycle と命名

| 系          | path                       | naming                    | status enum                                                                                    |
| ----------- | -------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| Rust RFC    | `text/NNNN-name.md`        | PR 番号 NNNN + kebab-case | Draft → Accepted (merged) → Active → Final / Postponed / Closed                                |
| Python PEP  | `peps/pep-NNNN.rst`        | Editor 採番、reST         | Draft / Active / Accepted / Provisional / Deferred / Rejected / Withdrawn / Final / Superseded |
| Go proposal | `design/NNNN-shortname.md` | issue 番号 NNNN           | Incoming → Active → Likely Accept/Decline → Accepted/Declined / Hold                           |

### header (PEP 1 例)

`PEP:` `Title:` `Author:` `Discussions-To:` `Status:` `Type:` `Created:` `Post-History:` (+ optional `Replaces:` / `Superseded-By:`)

### 1 person + agent 適性

- Rust の "FCP / sub-team / committee" 文化は **不要** (review 相手 = agent + 自分のみ)
- 最小 viable RFC: id / title / status / created / supersedes + body skeleton (Context / Goals / Design / Alternatives / Open questions)
- Go の **issue 番号採番** trick は solo 開発で安価 (PR 後採番の Rust 方式は再番号付け必要で煩雑)

## 4. GitLab handbook (single source of truth、規模特化)

**出典**: https://handbook.gitlab.com/handbook/about/ / https://handbook.gitlab.com/handbook/handbook-usage/

### 中核原則

- handbook-first communication: 書く → link、chat で再説明しない
- 階層 hierarchical、semantic path (`/handbook/company/culture/all-remote/`)、4-5 階層深いことも
- self-contained article 1 page、links が構造を担う

### スケール適合

- thousands of pages を controlled vocabulary + 専任 style guide + link-check infra で運用
- 1 person だと cost/benefit 逆転、deep nesting で agent が辿れずに迷う

### 抽出可能な smallest practice

> "write it down before saying it" — flat `docs/` 1 page per topic、URL link 経由参照

Arcagate の `docs/lessons.md` / `memory/MEMORY.md` 既に同パターン。

## 5. LLM-friendly documentation (Mintlify / llms.txt / Anthropic)

**出典**: https://llmstxt.org / https://code.claude.com/llms.txt / Mintlify guide / industrialempathy.com Google design docs

### 具体推奨

| 観点                | 推奨                                                                                                | 出典                     |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| file size           | **200-800 行 / file** で 1 トピック (極端な分割も巨大化も agent に有害)                             | agent inference (本研究) |
| frontmatter         | YAML、**stable + 短く ≤ 8 fields** (id / title / status / created / updated / supersedes / type 等) | Mintlify / PEP 1         |
| cross-link 密度     | **本文 60-100 行に 1 outbound link** + 末尾 "related" list                                          | agent inference          |
| 階層                | **flat-ish、2 階層まで** (`docs/<area>/<topic>.md`)                                                 | agent inference          |
| 命名                | **kebab-case で agent が topic から推測可能な名詞** (`feedback-self-verification.md`、NG: `fsv.md`) | agent inference          |
| canonical signaling | `status:` enum + `superseded-by:` pointer + root index (`llms.txt` H1 + file list)                  | llmstxt.org / PEP 1      |
| format              | Markdown > HTML/XML (token 効率)、H1=page / H2=section、heading skip 禁止                           | Mintlify / Webex         |
| 例示                | example を **削るな** (LLM 高価値 token)                                                            | Mintlify                 |
| 引用                | 規則は **paraphrase ではなく原文 quote** (agent は正確 string match)                                | Anthropic 慣行           |
| collapse 禁止       | tabs / details は LLM ingest に skip される                                                         | Mintlify                 |

### llms.txt convention

- root に `llms.txt` (H1 タイトル + 1 line summary + bulleted file list)
- 一括 ingest 用 `llms-full.txt` を別途
- Anthropic 公式 (code.claude.com/llms.txt) も採用、Claude Code 等 LLM 製品の de facto standard

## 6. 比較サマリ + Arcagate へのインプット

| 用途                              | 最適                                                                                   | 適用度                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 短命 plan / investigation / audit | **どの system も明示的に扱わない** → 独自 `plans/` or `audits/` folder + 日付 + status | Arcagate D1 で発見した 7:3 short-life 比に対応必須                                                     |
| 長命 design decision              | **ADR (Nygard)** がベスト fit、1 file 1 decision、append-only、supersede graph         | Arcagate の `lessons.md` / `industrial-yellow-spec` を ADR 化候補                                      |
| step-by-step user guide           | **Diátaxis Tutorials / How-to guides**                                                 | `pubkey-procedure.md` / `cosign-verification.md` / `microsoft-store.md` (R10 で書いた手順書) は How-to |
| API / config reference            | **Diátaxis Reference**                                                                 | `criteria.md` / `criteria-*.md` / `dispatch-operation.md` 等                                           |
| 「なぜ」 conceptual               | **Diátaxis Explanation**                                                               | `vision.md` / `arcagate-engineering-principles.md` / `arcagate-concept.md`                             |
| RFC / 提案 (大規模 review 必要)   | RFC pattern (Rust/PEP/Go)                                                              | **1 person 開発では overkill**、ADR で代替十分                                                         |

### Arcagate に持ち込む推奨

1. **ベース = Diátaxis 4 mode** (page-level 分類)
2. **+ ADR (1 file 1 decision、`adr/NNN-name.md` or `decisions/NNN-name.md`)** で長命 decision 管理
3. **+ 独自 `plans/` (短命 plan / audit / investigation の専用 folder、status: active / done で lifecycle)** ← 最大欠損領域
4. **+ root `llms.txt`** で agent が canonical doc list を一発取得
5. **frontmatter 最小限** (≤ 8 fields)、kebab-case、200-800 行 / file
6. **超巨大 doc (3628 / 932 / 879 / 834 行)** は分割 or archive (D1 で痛み 6 として記録済)

D3 ではこれら 6 点を Arcagate に**実装可能な具体形**まで落とす。各 directory layout / frontmatter schema / lifecycle 状態遷移 / CLAUDE.md 接続 / 既存 doc の new-system へのマッピング、まで決定する。

## 7. 出典 (web fetch 経由で確認)

- Diátaxis: https://diataxis.fr/ / https://diataxis.fr/start-here/
- Divio (Diátaxis 前身): https://documentation.divio.com/
- ADR Nygard 原典: https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- ADR org: https://adr.github.io/
- ADR JPH: https://github.com/joelparkerhenderson/architecture-decision-record
- Rust RFC: https://github.com/rust-lang/rfcs
- Python PEP 1: https://peps.python.org/pep-0001/
- Go proposal: https://github.com/golang/proposal
- GitLab handbook: https://handbook.gitlab.com/handbook/about/
- llms.txt convention: https://llmstxt.org / https://code.claude.com/llms.txt
- Mintlify LLM-friendly guide: https://mintlify.com/library/structure-documentation-AI-human-readers
- Google design docs at scale: https://industrialempathy.com/posts/design-docs-at-google/
