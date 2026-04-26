---
id: PH-20260427-389
status: done
batch: 86
type: 整理
era: Polish Era
---

# PH-389: 整理 + Polish Era 進捗 + 次バッチ提案

## 参照した規約

- `docs/dispatch-operation.md` §3.4 完了処理
- 各バッチの整理枠で次バッチ提案を行う運用

## 仕様

### Polish Era 進捗記録

`docs/l2_architecture/refactoring-opportunities.md` または別 `docs/l2_architecture/polish-era-progress.md` を新設し、Polish Era の bath-86 / 87 / ... 進捗表を記録:

| バッチ   | テーマ                                   | 主要成果                                                       |
| -------- | ---------------------------------------- | -------------------------------------------------------------- |
| batch-86 | 視覚的完成度 1（empty / about / README） | 空状態 / About ダイアログ / ツールチップ統一 / README 磨き込み |

### batch-87 候補

memory `arcagate_product_direction.md` の Polish Era 候補からピック:

- **PH-390** スプラッシュ / Loading 画面（起動時の体感速度向上）
- **PH-391** マーケティング寄りコピー統一（言い回し全画面 review）
- **PH-392** Loading / Error 状態の全画面統一（empty に続く第 2 弾）
- **PH-393** PH-376 deferred 消化（Refactor Era 持越し / Settings/utils 配置整理）
- **PH-394** 整理 + Polish Era 進捗

### 音声機能 最終判断

memory `feedback_audio_freeze.md` で「Polish Era で最終判断」とされている音声機能の削除可否を batch-87 or 88 で判定する。

## 受け入れ条件

- [x] dispatch-log への batch-86 完走追記は archive PR で実施
- [x] `docs/l2_architecture/polish-era-progress.md` 新設（Polish Era 進捗ドキュメント）
- [x] batch-87 5 plan 候補（PH-390〜394）を polish-era-progress.md に記載
- [x] `pnpm verify` 全通過

## SFDIPOT 観点

- **S**tructure: ドキュメント整合性
- **H**istory: 過去バッチとの比較で進捗を客観化
