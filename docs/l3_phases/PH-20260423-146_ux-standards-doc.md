---
status: wip
phase_id: PH-20260423-146
title: "L1 UX 標準ドキュメント作成 (ux_standards.md)"
depends_on: []
scope_files:
  - docs/l1_requirements/ux_standards.md
parallel_safe: true
---

# PH-20260423-146: L1 UX 標準ドキュメント作成

## 目的

`docs/l1_requirements/ux_standards.md` を新規作成し、Arcagate の UX/デザイン目標を
測定可能な具体的条件で定義する。

既存の `ux_design_vision.md`（方向性）・`design_system_architecture.md`（構造設計）を
補完する「**検証可能な実装基準**」として機能させる。

## 実装ステップ

### Step 1: ux_standards.md 作成

`docs/l1_requirements/ux_standards.md` を以下の構成で 300〜500 行で作成:

1. 測定可能なパフォーマンスメトリクス
2. モーション標準（duration テーブル・easing テーブル・Reduced Motion・コード例）
3. 色・コントラスト標準（WCAG AA/AAA・カラートークン対応表・focus ring）
4. スペーシング・タイポグラフィ標準
5. インタラクションフィードバック標準
6. コンポーネント別「あるべき姿」
7. Do / Don't リスト
8. バッチ受け入れチェックリスト

## 受け入れ条件

- [ ] `docs/l1_requirements/ux_standards.md` が存在する
- [ ] 各セクションが具体的な数値・cubic-bezier 値・WCAG 基準を含む
- [ ] 抽象論ではなく検証可能な条件で書かれている
- [ ] `pnpm verify` 通過（dprint が新規 md を検証）
