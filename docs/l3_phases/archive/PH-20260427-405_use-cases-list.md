---
id: PH-20260427-405
status: done
batch: 90
type: 改善
era: Polish Era / Use Case Audit
---

# PH-405: 想定ユーザケース 10 件記述（use-cases.md）

## 参照した規約

- ユーザ判断（2026-04-27）「Use Case Realignment」: 想定ケース walkthrough → 摩擦点 → 解消候補
- batch-90 は **純粋な調査 audit**、Rule A 不適用、軽微バグは即修正

## 仕様

`docs/l1_requirements/use-cases.md` を新設、想定ケース 10 件を記述:

1. ゲーム起動（Steam / 同人 / インストーラ起動）
2. 同人ゲームライブラリ（フォルダ群を Library に集約）
3. プロジェクト開始（IDE + ターミナル + ブラウザ起動）
4. 日次月次タスク（DailyTask widget 利用）
5. フォルダ整理（exe/ディレクトリ監視）
6. クリップボード再利用（ClipboardHistory widget）
7. メモ・アイデア（QuickNote widget）
8. ファイル検索（FileSearch widget + Library 検索）
9. 設定変更（Settings カテゴリ navigation）
10. テーマ切替（Appearance + ThemeEditor）

各ケースで:

- **目的**（1 行）
- **典型操作シーケンス**（番号付きステップ）
- **使う UI 要素**（widget / palette / Library / Settings 等）
- **想定される所要時間 / クリック数**

walkthrough（PH-406）の入力となる。

## 受け入れ条件

- [ ] use-cases.md 新設、10 ケース記述
- [ ] 各ケースに目的 / 操作シーケンス / UI 要素 / 想定時間
- [ ] `pnpm verify` 全通過
