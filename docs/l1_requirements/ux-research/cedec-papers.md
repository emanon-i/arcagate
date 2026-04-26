# CEDEC / GDC / HCI 学術リサーチ — Arcagate UX 評価のための基盤

batch-91 PH-411 で着手、partial 完成。

## 1. ヒューリスティック評価手法

### Heuristic Evaluation (HE)

**出典**: [NN/g: How to Conduct a Heuristic Evaluation](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)

- 1990 年代 Nielsen & Molich が提唱
- **3〜5 名の UX 専門家**が独立にインターフェースを評価
- 確立されたヒューリスティック原則（10 Heuristics 等）に照らして問題点を列挙
- **重大度評価**（cosmetic / minor / major / catastrophic）を付ける
- 1 名だけの評価では問題の **35% しか検出できない**、3-5 名で 75-80% 検出

### Cognitive Walkthrough (CW)

**出典**: [GapsyStudio: Heuristic Evaluation vs Cognitive Walkthrough](https://gapsystudio.com/blog/cognitive-walkthrough-vs-heuristic-evaluation/)

- **学習可能性 (learnability)** にフォーカス
- 「初めて使うユーザ」視点で **タスク達成までの 4 ステップ** を逐次評価:
  1. ユーザはこの行動を取ろうとするか？
  2. ユーザは行動できる UI 要素に気付くか？
  3. ユーザは正しい行動を選択できるか？
  4. 行動結果がユーザに正しいフィードバックを返すか？
- 各ステップで「Yes / No + 理由」を記録

### HE vs CW の比較研究 (2025)

**出典**: [Springer: A Comparative Study of HE and CW (2025)](https://link.springer.com/article/10.1007/s13369-025-09980-4)

- HE: **83 issues** 検出（major problems に強い）
- CW: **58 issues** 検出（catastrophic problems に強い）
- **両方併用** で network カバー（agent + first-time user 両視点）

### Arcagate への適用

| 手法 | Arcagate batch-92 で適用                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| HE   | ✅ Nielsen 10 をチェックリスト化済（industry-standards.md §1）。agent が「3-5 名の UX 専門家」役を 1 つの session で複数視点で実施 |
| CW   | ✅ batch-90 の use-cases.md 10 ケースに対し 4 ステップ walkthrough を機械的に実施                                                  |

batch-92 で具体実施。batch-90 の audit を **HE + CW で再実行**することで信頼度 2/5 → 4/5 期待。

参考:

- [adamfard: Heuristic Evaluation: Eliminate 80% Usability Problems (2025)](https://adamfard.com/blog/heuristic-evaluation)
- [Onething Design: A Beginner's Guide to Heuristic Evaluation in UX](https://www.onething.design/post/heuristic-evaluation-in-ux)

---

## 2. GDC / CEDEC ゲーム業界 UX 講演

### David Lightbown

**出典**: [David Lightbown 個人サイト](https://davidlightbown.com/)

- GDC / CEDEC / SIGGRAPH 講演者、Ubisoft の UX エキスパート
- 著書: **「Designing the User Experience of Game Development Tools」** (CRC Press)
- ゲーム開発ツール / ランチャーの UX に特化、Arcagate と直接的な参照領域

**Arcagate への示唆**:

- ランチャー / 開発ツール特有の「power user UX」設計手法
- Workspace のシナリオ別ランチャーパッド設計と整合
- 詳細は書籍購入後 reference（次セッション以降）

### Celia Hodent (Epic Games UX)

**出典**: [Celia Hodent: Developing UX Practices at Epic Games](https://celiahodent.com/ux-practices-epic-games/)

- Epic Games の UX practice 構築リード
- UX testing methodology / heuristic evaluation の game industry 適用
- Fortnite UI 設計の知見

**Arcagate への示唆**:

- Game launcher の attention economy（一瞬で何ができるか分かる UI）
- Workspace のサムネイル + ラベル設計に整合

### GDC Vault: Bridging the Gap Between UX Principles and Game Design

**出典**: [GDC Vault](https://gdcvault.com/play/1025393/Bridging-the-Gap-Between-UX)

- UX 原則をゲームデザインに適用する手法
- HCI 研究と game design の橋渡し
- Arcagate のような「個人用ツール × ゲームライブラリ統合」の設計参考

### GDC 2026 UX Summit

**出典**: [GDC Festival of Gaming 2026](https://gdconf.com/)

- UX Community が 16 Summit Communities の 1 つとして継続
- 毎年 UX 専門 track で最新研究発表
- Arcagate Distribution Era 起動前に最新トレンド確認候補

参考:

- [GDC Festival of Gaming 公式](https://gdconf.com/)
- [GDC 2019 UI/UX talks 紹介](https://www.gamedeveloper.com/design/gdc-2019-offers-a-wealth-of-ui-ux-talks-to-help-you-build-better-games-)

---

## 3. CEDEC（CEDIL）

⏸ CEDEC（日本ゲーム開発者カンファレンス）の CEDIL（公式アーカイブ）は会員制・paywall。
次セッションで具体講演リサーチ可能。Arcagate は個人プロジェクトのため、CEDEC 直接参照は二次優先。

候補講演テーマ（要確認）:

- 「個人開発ゲームのライブラリ管理 UX」
- 「Steam workshop / mod UI 設計」
- 「日本市場向けランチャー UX」

---

## 4. HCI / CHI 学会

⏸ ACM Digital Library / arXiv からの論文検索は次セッション。

候補トピック:

- Command palette UX / quick launch interface
- Hotkey の認知負荷研究
- Fitts's law と launcher 配置
- Power user vs casual user の UX 設計trade-off

---

## 5. Arcagate batch-92 適用チェックリスト

### HE (Heuristic Evaluation)

Nielsen 10 を 10 ケースそれぞれで適用、各ケースに対し:

```
Case X (例: ゲーム起動):
  H1 Visibility: [Yes/No + 理由]
  H2 Match: ...
  H3 Control: ...
  ...
  H10 Help: ...
  Severity: cosmetic/minor/major/catastrophic
```

### CW (Cognitive Walkthrough)

各ケースに対し 4 ステップ：

```
Case X Step 1-N:
  Q1 ユーザはこの行動を取ろうとするか？
  Q2 UI 要素に気付くか？
  Q3 正しい行動を選択できるか？
  Q4 フィードバックは正しいか？
  Yes/No + 理由
```

### 数値計測（PH-402 deferred）

- 起動 P95: scripts/bench/startup.ps1 100 回
- idle memory: scripts/bench/idle-memory.ps1
- 結果を `industry-standards.md §5` の Arcagate 列に記入

---

## 取得状況サマリ

| 出典                          | 取得 | 備考                                 |
| ----------------------------- | ---- | ------------------------------------ |
| HE methodology (NN/g)         | ✅   | 適用手順確立                         |
| CW methodology (GapsyStudio)  | ✅   | 4 ステップ手法確立                   |
| HE vs CW 比較研究 (2025)      | ✅   | 両方併用が必要                       |
| GDC David Lightbown           | ✅   | 書籍参照候補（次セッション）         |
| GDC Celia Hodent (Epic Games) | ✅   | UX practice 概要                     |
| CEDEC / CEDIL                 | ⏸    | 会員制 paywall、次セッション         |
| HCI / CHI 論文                | ⏸    | ACM Digital Library 検索次セッション |

PH-411 を **partial done** として batch-91 commit。HE + CW チェックリストは batch-92 適用準備完了。
