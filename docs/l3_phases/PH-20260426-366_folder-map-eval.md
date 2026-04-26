---
id: PH-20260426-366
status: done
batch: 82
type: 改善
era: Refactor Era / 計測フェーズ
---

# PH-366: フォルダ構成 / モジュール境界 評価レポート

## 横展開チェック実施済か

- user 方針「読みやすさ + フォルダ構成 + アーキテクチャを性能と同格 / 優先」（feedback_refactor_era_priority.md）
- 「ファイル開いて 30 秒で何が書いてあるか分かる」を初見の人に対して保証する判定基準

## 仕様

`docs/l2_architecture/folder-map.md` を新規作成、以下を含める:

### 1. 現状フォルダ構成 Mermaid 図

- `src/` 直下と各サブディレクトリの責務を tree + 説明
- `src-tauri/src/` の commands / services / repositories / models / utils 層構造

### 2. モジュール境界の評価

- 各サブディレクトリが「初見で何のためのフォルダか分かるか」を評価（◯ / △ / ✕）
- 命名一貫性（同概念 = 同名）: ◯ / △ / ✕
- 責務分離（routes / components / state / api / utils）: ◯ / △ / ✕

### 3. 混乱箇所 top 10

- 現在の構造で「初見で迷う」箇所を列挙
- 例:
  - `src/lib/components/arcagate/workspace/` 配下に widget 本体 + Workspace shell + dialog が混在
  - `src/lib/state/` と `src/lib/store/` の使い分け不明（もしあれば）
  - `src/lib/utils/` の粒度差（一部は domain ロジック、一部は純粋数値計算）

### 4. 構造フェーズ（batch-83）への提案

- 改善方向: feature-based / colocation / 命名統一 / 責務分離
- 具体案 3〜5 件（例: widgets/ 集約、components/library と components/workspace の分離強化）

## 受け入れ条件

- [ ] folder-map.md 作成、Mermaid 図入り
- [ ] 評価表（フォルダごと ◯△✕）
- [ ] 混乱箇所 top 10 列挙
- [ ] 構造フェーズ提案 3〜5 件
- [ ] **コード変更なし**
- [ ] `pnpm verify` 全通過
