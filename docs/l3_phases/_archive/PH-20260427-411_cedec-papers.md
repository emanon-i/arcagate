---
id: PH-20260427-411
status: partial
batch: 91
type: 改善
era: UX Research Sprint
---

# PH-411: CEDEC 講演 / 学術リサーチ調査

## 問題

PH-410 が業界 UX 標準（実用 guideline）の調査だったのに対し、本 plan は **学術 / 講演レベルの深い知見** を調査。
HCI / CHI 学会 / CEDEC 講演スライドには「なぜそれが UX として正しいか」の実証データがある。

## 改修

WebSearch / WebFetch で:

### CEDEC（日本ゲーム開発者カンファレンス）

- ゲームランチャー / コレクション UX 講演
- 「快適さ」「ストレスなさ」を定量化した発表
- アクセシビリティ系講演

### GDC（Game Developers Conference）

- UI/UX track の主要講演
- Indie game launcher / management UX
- "Quick action" / "Power user UX" 講演

### HCI / CHI 学会

- Command palette / quick launch interface 関連論文
- Hotkey / keyboard shortcut の認知負荷研究
- Fitt's law 系 + 関連

### ヒューリスティック評価手法

- **Nielsen 10 ヒューリスティック**（再掲、PH-410 と重複しない深堀り）
- **Cognitive walkthrough** 手法
- **Heuristic evaluation** プロセス
- 各手法を **Arcagate に適用する手順書** 化

### Game UI Database / fixedaxis

- 具体的事例の screenshot 集
- カテゴリ別パターン（Inventory / Pause Menu / Settings 等）
- Arcagate Workspace / Library に応用可能なパターン抽出

## 解決理屈

- 「経験則」ではなく「実証データ」で UX を語れる
- ヒューリスティック評価手順を文書化 → 次バッチ batch-92 で **機械的に適用可能**
- ゲーム業界事例 → ゲーム起動 / ライブラリ管理ユースケースの直接参考

## メリット

- 「Polish Era 完走」を実証データで主張可能
- Cognitive walkthrough を batch-92 で適用 → 信頼度 4-5/5 達成
- Arcagate 独自設計の正当化に学術根拠

## デメリット

- 学会論文 paywall 多い（DOI 経由で abstract までは取れる）
- 日本語資料（CEDEC）の英訳ネックなし、agent は読める
- 適用ハードル高い手法もある（時間との trade-off）

## 受け入れ条件

- [ ] `docs/l1_requirements/ux-research/cedec-papers.md` 新設
- [ ] CEDEC / GDC 主要講演 5 件以上の概要 + Arcagate への示唆
- [ ] HCI / CHI 学会 関連論文 3 件以上の abstract + 示唆
- [ ] Nielsen 10 / Cognitive walkthrough を Arcagate に適用する **チェックリスト** 化
- [ ] Game UI Database から 5 つ以上の参考パターン
- [ ] 全引用に出典 URL + 取得日
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **U**ser expectations（学術裏付け）: ユーザ期待の実証データ
- **P**urpose（プロダクト目的）: 学会パターンとプロダクト目的の整合
