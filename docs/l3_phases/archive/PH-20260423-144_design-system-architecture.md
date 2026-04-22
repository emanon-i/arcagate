---
id: PH-20260423-144
title: デザインシステム拡張設計文書作成（design_system_architecture.md）
status: done
batch: 31
priority: high
created: 2026-04-23
scope_files:
  - docs/l1_requirements/design_system_architecture.md
parallel_safe: true
depends_on: []
---

## 背景/目的

UI/デザインシステム大改修の第一段階として、現行の `--ag-*` トークン群を拡張する
アーキテクチャ設計を文書化する。実装バッチへの入力として機能させる。

## 成果物

`docs/l1_requirements/design_system_architecture.md` を作成。

内容:

1. 現行トークン体系の評価（`--ag-*` 群の現状と課題）
2. トークン階層設計（プリミティブレイヤ / 意味論レイヤ）
3. モーション設計言語（easing / duration / stagger 標準化）
4. 背景レイヤ設計（static / wallpaper / texture / noise / effect 合成モデル）
5. サウンド設計言語（採用イベント対応表・音量・ミュート制御）
6. テーマ切替アーキテクチャ（プリセット対応・将来のユーザテーマ）

## 受け入れ条件

- [x] `docs/l1_requirements/design_system_architecture.md` が存在すること
- [x] トークン拡張の設計方針が実装バッチで参照可能な粒度で記述されていること
- [x] `pnpm verify` 全通過
