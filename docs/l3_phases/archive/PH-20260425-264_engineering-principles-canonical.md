---
id: PH-20260425-264
status: done
batch: hotfix
type: 整理
---

# PH-264: engineering-principles.md canonical ドラフト全面置換

## 背景・目的

batch-57 で自律生成した `arcagate-engineering-principles.md` を、
ユーザー確定ドラフト（Dispatch canonical 版）で全面置換する。
品質バー定義・フロント/バックエンド分担・テスト設計・依存予算等を
正式な技術判断基準として確立する。

## 実装ステップ

### Step 1: 確定ドラフト受信（§1〜§2 受信済み、§3〜§10 受信待ち）

### Step 2: ファイル全体を Write で置換

### Step 3: dprint fmt + verify

## 受け入れ条件

- [x] `docs/l0_ideas/arcagate-engineering-principles.md` がユーザー確定ドラフトに置換される
- [x] `pnpm verify` 全通過
