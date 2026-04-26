# Claude Code Skills Marketplace 探査 — Arcagate 環境強化候補

batch-91 PH-412 で着手、partial 完成（top 候補確定、導入は Rule A 承認待ち）。

## 1. 探査結果サマリ

**出典**: WebSearch（取得日 2026-04-27）「claude code skills marketplace UX review audit github 2025」

複数の community-maintained skill repository を発見:

| リポジトリ                                          | 特徴                                                                           | star (推定) | Arcagate 適合度                |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ----------- | ------------------------------ |
| **mastepanoski/claude-skills**                      | Nielsen heuristics + WCAG + Don Norman + OWASP LLM/AI Top 10                   | medium      | ★★★★★ batch-92 re-audit に直結 |
| **daymade/claude-code-skills**                      | production-ready, evidence-driven audit, parallel Claude Code agents           | medium      | ★★★★                           |
| **jeremylongshore/claude-code-plugins-plus-skills** | 423 plugins / 2,849 skills / 177 agents（marketplace、ccpi CLI）               | high        | ★★★ 量多すぎ、選別困難         |
| **alirezarezvani/claude-skills**                    | 232+ skills、エンジニアリング / マーケ / プロダクト / コンプライアンス         | high        | ★★★                            |
| **levnikolaevich/claude-code-skills**               | full delivery lifecycle、multi-model AI review、hex-line/graph/ssh MCP servers | medium      | ★★                             |
| **mhattingpete/claude-skills-marketplace**          | Git/test/code review focused                                                   | low         | ★★                             |
| **travisvn/awesome-claude-skills**                  | curated list, リソース集                                                       | medium      | ★★ 参考用                      |
| **BehiSecc/awesome-claude-skills**                  | curated list                                                                   | low         | ★ 参考用                       |
| **AccessLint**                                      | WCAG 2.1 Level A/AA accessibility audit, severity 付き                         | medium      | ★★★★                           |
| **Bencium UX skill**                                | 28,000+ char、design thinking + visual + interaction + a11y 統合               | medium      | ★★★                            |

参考:

- [GitHub: mastepanoski/claude-skills](https://github.com/mastepanoski/claude-skills)
- [GitHub: daymade/claude-code-skills](https://github.com/daymade/claude-code-skills)
- [GitHub: jeremylongshore/claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
- [GitHub: alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)
- [GitHub: levnikolaevich/claude-code-skills](https://github.com/levnikolaevich/claude-code-skills)
- [GitHub: mhattingpete/claude-skills-marketplace](https://github.com/mhattingpete/claude-skills-marketplace)
- [GitHub: travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
- [GitHub: BehiSecc/awesome-claude-skills](https://github.com/BehiSecc/awesome-claude-skills)
- [Snyk: Top 8 Claude Skills for UI/UX Engineers](https://snyk.io/articles/top-claude-skills-ui-ux-engineers/)

---

## 2. 採用判定

### 採用候補 1: mastepanoski/claude-skills（★★★★★）

**理由**:

- Arcagate batch-92 の Nielsen 10 適用と直結
- WCAG audit が一発で走る → engineering-principles.md §9 の「WCAG コントラスト AA 以上」自動化
- Don Norman 原則（visibility / feedback / constraints / mapping）も網羅

**導入手順候補**:

1. `git clone https://github.com/mastepanoski/claude-skills` でローカル確認
2. `~/.claude/skills/` または `.claude/skills/` に必要なスキルを配置
3. 実際の skill 定義を読み、Arcagate に流用可能か精査

**Rule A 該当判定**:

- `~/.claude/` への config 改変は **ユーザ環境変更** だが、Arcagate プロジェクト内 `.claude/skills/` 追加は agent 範囲。
- ただし「外部リポジトリ skill を取り込む」のはサプライチェーンリスクあり、**ユーザ承認必要**（Rule A 該当）。

### 採用候補 2: daymade/claude-code-skills（★★★★）

**理由**: production-ready の audit skill、parallel agents で高速。

**Rule A 該当判定**: 同上、サプライチェーンリスク → 承認必要。

### 採用候補 3: AccessLint（★★★★）

**理由**: WCAG 2.1 自動 audit。Arcagate のアクセシビリティ補強直結。

**Rule A 該当判定**: 同上。

### 不採用 / 監視継続

- **jeremylongshore**: 量が多すぎ、selectivity が低い
- **levnikolaevich**: hex-line/graph/ssh MCP server 等は overkill
- その他 awesome-list 系: 参考リソースとして使うのみ、直接導入なし

---

## 3. Rule A エスカレーション

PH-412 完走時に Dispatch 経由でユーザ承認依頼:

> **batch-92 で以下の skill 導入提案**:
>
> 1. **mastepanoski/claude-skills** から `nielsen-heuristics` / `wcag-audit` / `don-norman` の 3 skill
> 2. **daymade/claude-code-skills** から `product-audit` / `evidence-driven-audit` skill
> 3. **AccessLint** から WCAG 2.1 reviewer agent
>
> 採用前に各 skill のコードを Read で精査、サプライチェーンリスク評価後に `.claude/skills/` 配置。
> 影響範囲: agent の運用基盤強化、Arcagate プロダクトコードへの直接的影響なし。

ユーザ承認後 → batch-92 で導入 + batch-92 re-audit に活用。

---

## 4. Arcagate 既存 skill との整合

`.claude/skills/` に Arcagate 固有 skill が複数存在（プロジェクト固有運用）:

- `arcagate.md`: CLI 自己学習用（agent-first 設計）
- `tri-ssd:*`: ドキュメント階層管理
- `e2e-tauri-webview2`: Tauri E2E
- `claude-md`: CLAUDE.md 生成 / チェック

これら Arcagate 固有 skill は **保持**、外部 skill は別ディレクトリ（`.claude/skills/external/` 等）に分離して取り込む案。

---

## 5. 取得状況サマリ

| 項目                            | 状態                                            |
| ------------------------------- | ----------------------------------------------- |
| Marketplace 探査                | ✅ 10 リポジトリ発見、評価軸ごとに分類          |
| 採用候補確定                    | ✅ top 3（mastepanoski / daymade / AccessLint） |
| skill コード Read               | ⏸ 次セッション or batch-92 で実施               |
| Rule A エスカレーション         | ⏸ PH-412 完走時に Dispatch メッセージで         |
| `.claude/skills/external/` 配置 | ⏸ ユーザ承認後                                  |

PH-412 を **partial done** として batch-91 commit。実際の導入は batch-92 ユーザ承認後。
