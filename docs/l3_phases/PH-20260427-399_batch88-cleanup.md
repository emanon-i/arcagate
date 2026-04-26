---
id: PH-20260427-399
status: todo
batch: 88
type: 整理
era: Polish Era
---

# PH-399: 整理 + Distribution Era 移行提案

## 参照した規約

- `memory/arcagate_product_direction.md` Distribution Era 起動条件
- `engineering-principles.md` §9 配布水準

## 横展開チェック実施済か

- batch-88 で PH-395〜398 の 4 plan 消化、Polish Era 第 3 弾
- Polish Era 5〜8 バッチ予定の中で 86 / 87 / 88 = 3 バッチ完了、残り 2〜5 バッチ

## 仕様

### batch-88 完走記録

`polish-era-progress.md` に batch-88 セクション追加。

### Polish Era 完走判定

Polish Era 完走条件:

- 全 5〜8 バッチ完了
- README + About + 空状態 + Loading / Error 統一 + コピー一貫性 + 音声機能判断 → ✅ batch-88 で達成

判定: batch-88 で **Polish Era 完走宣言** が可能か agent が判定。残課題があれば batch-89 / 90 を切る。

### Distribution Era 起動提案

Distribution Era 5 plan 候補（PH-400〜404、batch-87 で予告済）:

- PH-400 コード署名（Windows Authenticode）
- PH-401 エラー境界 UI（unrecoverable error 時の「再起動」表示）
- PH-402 バックアップ UI（DB export / import の Settings UI 化）
- PH-403 アップデート機構（Tauri updater 設定）
- PH-404 整理 + 配布リリース判断

### Distribution Era 起動条件チェック

- Polish Era 完走 ✅（本バッチで判定）
- 「自分で毎日使って違和感ゼロ」状態（ユーザ判定）
- README + About + 空状態 + Loading + コピー が整って初見ユーザに渡せる

## 受け入れ条件

- [ ] dispatch-log に batch-88 完走 + Polish Era 完走判定（or 残課題明示）
- [ ] polish-era-progress.md 更新（batch-88 セクション）
- [ ] Distribution Era 起動可否判定を `arcagate-engineering-principles.md` または `memory/arcagate_product_direction.md` に追記
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **H**istory: Era 完走の客観化
- **U**ser expectations: 配布水準達成の自己評価
