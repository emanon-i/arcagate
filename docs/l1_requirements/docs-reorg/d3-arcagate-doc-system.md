# D3: Arcagate doc system 設計

**Status**: 2026-05-06 D2 後、D4 plan / D5 実行のインプット
**Method**: D1 痛み + D2 ベストプラクティス → Arcagate 1 person + agent 規模で **実装可能な具体形** を決定

## 1. 設計原則 (Arcagate 固有)

| 原則                                    | 由来                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| **1 person + agent 規模**               | RFC pattern の committee / FCP 文化は不要、ADR + Diátaxis + 独自 plan folder で十分 |
| **agent が読み書き / 検索しやすい**     | LLM-friendly: kebab-case / flat-ish / canonical signaling / frontmatter ≤ 8 fields  |
| **200 行 / file 制約**                  | user 指示、CLAUDE.md context auto-load 上限への配慮                                 |
| **CLAUDE.md は薄い index**              | 200 行制約、頻繁更新する live spec は外に逃がして link                              |
| **short-life : long-life = 7:3**        | D1 観測、短命 doc 専用 folder (`plans/`) を first-class 化                          |
| **archive は明示移動 + git 履歴で代替** | "古いものは消して OK、git に残るから" (user 指示)                                   |

## 2. doc type の正式定義 (5 種)

| type                              | 寿命  | 場所           | 例                                                                                           |
| --------------------------------- | ----- | -------------- | -------------------------------------------------------------------------------------------- |
| **vision** (Diátaxis Explanation) | long  | `docs/vision/` | プロダクト方針 / 哲学 / 設計原則                                                             |
| **spec** (Diátaxis Reference)     | long  | `docs/spec/`   | UI 標準 / token / API / criteria / ファイル仕様                                              |
| **guide** (Diátaxis How-to)       | long  | `docs/guide/`  | user / dev 向け手順書 (pubkey / cosign / MS Store / etc.)                                    |
| **adr** (decision)                | long  | `docs/adr/`    | 採用決定 + 経緯 (1 file 1 decision、append-only)                                             |
| **plan** (短命)                   | short | `docs/plans/`  | audit / investigation / phase plan / dispatch、status:active が live、status:done で archive |

Diátaxis "Tutorials" (learning) は Arcagate 範囲外 (tutorial を書く対象 user が居ない、guide で十分)。

## 3. ディレクトリ階層 (flat-ish 2 階層)

```
docs/
├── llms.txt                    ← root index (canonical doc list、agent が一発取得)
├── README.md                   ← human reader 用 entrypoint
├── vision/
│   ├── product.md              ← 旧 vision.md
│   ├── engineering-principles.md ← 旧 l0_ideas/arcagate-engineering-principles.md
│   ├── visual-language.md      ← 旧 l0_ideas/arcagate-visual-language.md
│   └── concept.md              ← 旧 l0_ideas/arcagate-concept.md
├── spec/
│   ├── ux-standards.md         ← 旧 l1_requirements/ux_standards.md (要分割、879 行)
│   ├── design-system.md        ← 旧 l1_requirements/design_system_architecture.md
│   ├── industrial-yellow.md    ← 旧 l1_requirements/design/industrial-yellow-spec.md
│   ├── desktop-ui-rules.md     ← 旧 desktop_ui_ux_agent_rules.md (要分割、537 行)
│   ├── release-criteria.md     ← 旧 release-readiness/criteria*.md 4 件統合
│   └── widget-add-checklist.md ← 旧 widget-add-checklist.md
├── guide/
│   ├── pubkey-procedure.md     ← 旧 distribution/pubkey-procedure.md
│   ├── cosign-verification.md  ← 旧 distribution/cosign-verification.md
│   ├── microsoft-store.md      ← 旧 distribution/microsoft-store.md
│   ├── distribution-rollback.md ← 旧 distribution-rollback-sop.md
│   ├── dispatch-rules.md       ← 旧 dispatch-operation.md
│   └── support.md              ← 旧 SUPPORT.md
├── adr/
│   ├── 0001-tauri-v2-svelte5.md          ← 既存決定の retro ADR 化
│   ├── 0002-mutex-connection-no-pool.md  ← 既存決定 retro
│   ├── 0003-no-orm-rusqlite.md           ← 既存決定 retro
│   ├── 0004-forward-only-migrations.md   ← 既存決定 retro
│   ├── 0005-tier1-tier2-signing.md       ← R10 で確定 (minisign + cosign)
│   └── (NNNN-name.md、kebab-case、append-only)
├── plans/
│   ├── active/
│   │   └── docs-reorg/         ← D1〜D5 (本 phase、完了で archive へ)
│   ├── archive/                ← status:done plan の最終置き場 (旧 l3_phases/archive/ + docs/archive/ 統合)
│   └── README.md               ← active/archive の運用ルール
├── lessons.md                  ← live、git 履歴で歴史追える、archive 不要
└── memory/                     ← 既存 (CLAUDE.md auto-load 用 user メモリ、本 reorg 範囲外)
```

**廃止する旧階層**:

- `l0_ideas/` → `vision/`
- `l1_requirements/` (sub-dir 全部) → `spec/` / `guide/` / `plans/`
- `l2_architecture/` / `l2_foundation/` → `spec/` (live のみ) + `plans/archive/` (snapshot 系)
- `l3_phases/` → `plans/`
- `archive/` (top-level) → `plans/archive/`
- `release-readiness/` → `spec/release-criteria.md` (live) + `plans/archive/release-readiness-rN/` (audit-final-rN history)

## 4. 命名規則

| 種別           | pattern                                                        | 例                                                     |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| **通常 doc**   | kebab-case 名詞 / 動詞句                                       | `pubkey-procedure.md` / `engineering-principles.md`    |
| **ADR**        | `NNNN-kebab-case-decision.md` (4 桁、issue 番号と紐付かず連番) | `0001-tauri-v2-svelte5.md`                             |
| **plans**      | `<phase>-<topic>.md` or kebab-case                             | `docs-reorg/d1-current-state.md` (本書)                |
| **archive 内** | 元 path + ファイル名保持 (探索性優先)                          | `plans/archive/release-readiness-r6/audit-final-r6.md` |

**禁止**:

- snake_case (`ux_standards.md` → `ux-standards.md`)
- 大文字混在 (`SUPPORT.md` → `support.md`)
- 日付 prefix (`PH-20260226-001_*.md` 形式)、retain-by-content の妨げ
- ファイル名 abbrev (`fsv.md` 等、agent が topic から推測不能)

## 5. Frontmatter schema (≤ 8 fields)

```yaml
---
type: vision | spec | guide | adr | plan
status: live | active | done | superseded | deprecated  # 任意 (vision/spec は省略可、adr/plan は必須)
created: 2026-05-06
updated: 2026-05-06  # 任意
supersedes: 0003-old-decision  # 任意 (ADR で前 decision を上書きする場合)
superseded-by: 0005-new-decision  # 任意 (古い ADR が新しい ADR で置換された場合)
---
```

**vision / spec / guide / lessons は frontmatter 省略可** (頻繁書き換えしない / type は path で自明)。
**ADR と plan は frontmatter 必須**。

## 6. Lifecycle / status 遷移

### ADR

```
(write new file)
→ status: active
→ ┬→ status: superseded (新 ADR が supersedes で参照)
   └→ status: deprecated (撤回、新 ADR なし)
```

ADR 自体は **削除しない** (append-only、git 履歴ではなく live ファイルとして残す、過去 decision は agent context として価値あり)。

### plans

```
docs/plans/active/<topic>/*.md   ← 着手中
       ↓ 完了
docs/plans/archive/<topic>/*.md  ← status: done に変更 + 移動
       ↓ 価値消失
(削除)                            ← 不要なら git 履歴に逃がして削除
```

判断基準:

- **archive 移動**: phase / cycle が完了し、reference 価値が残る (例: `release-readiness-r6/audit-final-r6.md`)
- **削除**: 完全に superseded され reference 価値ゼロ (例: 中間草案 / 重複 doc)

## 7. CLAUDE.md との接続

CLAUDE.md は **薄い index に保つ** (200 行制約、context auto-load 配慮)。新構造での CLAUDE.md 「いつ何を読むか」 table:

```markdown
| 状況                      | 読む doc                                                    |
| ------------------------- | ----------------------------------------------------------- |
| プロダクト方針            | docs/vision/product.md                                      |
| 設計判断 / FE-BE 分担     | docs/vision/engineering-principles.md                       |
| UI / 視覚 / レイアウト    | docs/spec/ux-standards.md / docs/spec/desktop-ui-rules.md   |
| テーマ / トークン         | docs/spec/design-system.md / docs/spec/industrial-yellow.md |
| バッチ / 進行ルール       | docs/guide/dispatch-rules.md                                |
| 過去の失敗                | docs/lessons.md                                             |
| 過去の重要決定            | docs/adr/ (連番)                                            |
| 着手中 plan               | docs/plans/active/                                          |
| 完了 plan / audit history | docs/plans/archive/                                         |
| 全体 index (LLM 用)       | docs/llms.txt                                               |
```

→ §8-12 (llms.txt / 200 行対応 / 削除運用 / 検証 / D4 引継ぎ) は [d3-implementation-details.md](./d3-implementation-details.md) を参照 (200 行制約のため分割)。
