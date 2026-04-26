---
id: PH-20260427-410
status: todo
batch: 91
type: 改善
era: UX Research Sprint
---

# PH-410: 業界 UX 標準 + ゲーム業界事例 リサーチ

## 問題

batch-90 audit の信頼度が **2/5** だった理由:

- 競合ソフト未参照（Raycast / Flow Launcher / Listary / Playnite 一切触ってない）
- 数値ベンチマークなし（クリック数 / 起動時間 / レスポンス）
- 業界 UX 標準のヒューリスティック未適用（Nielsen 10 / WCAG / HCI 知見）

agent の「macro 0 / micro 0」判定が **記憶 + 直感ベース** で根拠が薄い。

## 改修

WebFetch / WebSearch を使って業界 UX 標準を体系的に調査:

### 一般 UX 標準

- **Nielsen Norman Group**: 10 Usability Heuristics + 関連記事
- **Material Design 3**: launcher / search / settings の guideline
- **Apple Human Interface Guidelines**: macOS Spotlight / Launchpad
- **GNOME Human Interface Guidelines**: GNOME Shell / Activities
- **Microsoft Fluent UI**: Windows search / Start menu

### コマンドパレット / ランチャー特化

- **Raycast** UX 公開資料 + UX blog
- **Alfred** Tips / power-user 慣行
- **VSCode Command Palette** UX 設計
- **macOS Spotlight** vs **Windows Search** 比較記事

### ゲーム業界 事例（ランチャー / ライブラリ UX）

- **Steam** ライブラリ / コレクション UX
- **Epic Games Launcher** UX
- **Playnite** カスタマイズ UX
- **GOG Galaxy** ライブラリ集約 UX
- **Game UI Database** (gameuidatabase.com) でカテゴリ別事例

### 数値ベンチマーク

業界標準値を `docs/l1_requirements/ux-research/industry-standards.md` に集約:

- ホットキー押下 → UI 応答までの **業界平均応答時間**（Raycast: ?ms / Spotlight: ?ms）
- 検索結果表示までの **平均ms**
- launcher 系の **起動時メモリ平均**
- クリック数（top タスク完了までの平均クリック数）
- ヒューリスティック適合率（Nielsen 10 のうち何項目以上満たすのが標準か）

## 解決理屈

- WebFetch で **一次資料引用** → Rule B（事実ベース）厳守
- 数値ベンチマーク → batch-90 の「2 秒以内」「1 操作以内」を **業界標準で裏付け**
- ヒューリスティックリスト → 次バッチ batch-92 の re-audit 基準

## メリット

- 「業界比較で適切」が客観的に主張可能
- 配布水準の客観評価（engineering-principles.md §9 強化）
- 数値で語れる → ユーザ判定の前段で agent が確度を出せる

## デメリット

- WebFetch の量が多くなる、時間消費
- 一部資料は paywall / 古い可能性
- 「業界標準と違う = 悪い」とは限らない（Arcagate 独自最適化の正当化が必要な場面）

## 受け入れ条件

- [ ] `docs/l1_requirements/ux-research/industry-standards.md` 新設
- [ ] Nielsen 10 / Material Design / HIG / Fluent の主要原則を引用 + Arcagate との適合度
- [ ] Raycast / Alfred / VSCode Command Palette の UX 概要 + Arcagate との比較
- [ ] Steam / Playnite / Epic / GOG のライブラリ UX 概要 + Arcagate との比較
- [ ] 数値ベンチマーク表（応答時間 / メモリ / クリック数）
- [ ] 全引用に出典 URL + 取得日記載
- [ ] `pnpm verify` 全通過（docs only）

## SFDIPOT 観点

- **I**mage（業界標準）: HICCUPPS の Image オラクル明示適用
- **C**omparable products（比較対象）: HICCUPPS の Comparable products オラクル明示適用
