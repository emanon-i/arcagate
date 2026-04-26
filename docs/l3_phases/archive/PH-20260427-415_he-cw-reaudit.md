---
id: PH-20260427-415
status: done
batch: 92
type: 防衛
era: UX Audit Re-Validation
---

# PH-415: HE+CW 再監査（10 ケース × Nielsen 10 / severity 0-4）

## 問題

batch-90 の Use Case Audit は「コード read 中心、業界標準照合なし、信頼度 2/5」で macro 0 / micro 0 / medium 11 と判定したが、Codex Rule C で「公開水準ではない」と否定された。

batch-91 PH-410-414 で:

- Nielsen 10 Heuristics 業界標準収集（PH-410）
- Heuristic Evaluation + Cognitive Walkthrough 4 Steps 手法整理（PH-411）
- `_template/use-case-audit.md` 雛形作成（PH-414）

これで再監査の準備は完了 → 実施フェーズ。

## 改修

`docs/l1_requirements/use-cases.md` の **10 ケース全部** に `_template/use-case-audit.md` を適用:

### 対象 10 ケース

1. ゲーム起動（Steam / 同人 / 単体 exe）
2. 同人ライブラリ（一括 D&D + タグ付け）
3. プロジェクト開始（launch group / 関連起動）
4. 日次タスク（Workspace / Favorites）
5. フォルダ整理（watched_path / 自動取り込み）
6. クリップボード履歴呼び出し
7. メモ（QuickNote）
8. 検索（Palette）
9. 設定（テーマ / hotkey）
10. テーマ切替

### 各ケースで実施

- Nielsen 10 全項目に severity 0-4 または「該当なし」
- Cognitive Walkthrough 4 Steps（Q1 目標 / Q2 手段認知 / Q3 操作可能性 / Q4 フィードバック）を主要ステップ 3〜5 個に適用
- 業界比較表（Raycast / Alfred / Spotlight / ジャンル別 1 製品）
- 数値計測欄は「未計測」記入（PH-419 で実測）

### 出力先

- 集約版（一次成果物）→ `docs/l2_architecture/use-case-friction-v2.md`（旧 friction.md は v1 として残す）
  - 10 ケース全部の Nielsen 10 表 + CW 主要ステップ + 業界比較 + 摩擦サマリ
- 個別詳細（必要に応じて）→ `docs/l2_architecture/audit-2026-04-27/case-NN-*.md`
  - severity 3 以上が出たケースのみ深掘りファイルを起こす

### 結果のフォーマット

```markdown
| ケース    | severity 4 | severity 3 | severity 2 | severity 1 | 合計 |
| --------- | ---------- | ---------- | ---------- | ---------- | ---- |
| 1. ゲーム | X          | X          | X          | X          | X    |
| ...       |            |            |            |            |      |
```

## 解決理屈

- 業界標準ベースで「macro 0」を再検証 → 真の judgement に
- severity 0-4 で **計量可能** な摩擦リストになる
- batch-93 以降の PH 採番優先順位の根拠
- 「Polish Era 完走」を再判定する数値根拠

## メリット

- agent 単独 + コード read だけの batch-90 audit を、業界標準 + 構造化手法で **科学的に** 再判定
- Codex 指摘「公開水準ではない」に対する具体的な反証 / 是認の根拠
- 信頼度 2/5 → 4/5 を狙う

## デメリット

- 工数大（10 ケース × Nielsen 10 = 100 評価点 + CW 30+ ステップ）
- 主観評価入る部分はある（severity 判定は agent 主観 + Codex セカンドオピニオンで補完）
- 実機計測（PH-419）が伴わない場合、応答時間系の評価は推定値

## 受け入れ条件

- [ ] `docs/l2_architecture/use-case-friction-v2.md` 新設、10 ケース全部の Nielsen 10 表 + CW 主要ステップ + 業界比較 + 摩擦サマリ
- [ ] 旧 `use-case-friction.md` 冒頭に「v2 へ移行、本書は v1 として残置」明記
- [ ] 集約 severity 集計表（ケース × severity）を v2 末尾に記載
- [ ] severity 3 以上のケースは `audit-2026-04-27/case-NN-*.md` で個別深掘り（任意）
- [ ] severity 3 以上は次バッチ Plan 候補として dispatch-log に記録
- [ ] severity 4（catastrophic）が出た場合は Rule A エスカレーション
- [ ] Codex に集計表 + macro 判定再 review を投げる（Rule C）
- [ ] `pnpm verify` 全通過（docs only）

## SFDIPOT 観点

- **F**unction（機能）: 各ケースが期待通り完走するか
- **U**ser expectations（ユーザ期待）: 業界標準と合致するか（HICCUPPS Image オラクル）
- **T**ime（時間）: 各ステップの体感応答時間（推定 / 実測）
- **O**perations（運用）: 誤操作 / 復旧導線

参照: `docs/l3_phases/_template/use-case-audit.md` / `docs/l1_requirements/ux-research/industry-standards.md` / `cedec-papers.md`
