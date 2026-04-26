---
id: PH-20260427-394
status: done
batch: 87
type: 整理
era: Polish Era
---

# PH-394: 整理 + 音声機能最終判断 + Distribution Era 起動提案

## 参照した規約

- `~/.claude/projects/E--Cella-Projects-arcagate/memory/feedback_audio_freeze.md` 音声機能凍結、Polish Era で最終判断
- `docs/l0_ideas/arcagate-engineering-principles.md` §9 配布水準客観指標

## 横展開チェック実施済か

- batch-86 で Polish Era 進捗ドキュメント `polish-era-progress.md` 整備
- batch-87 で 4 plan 実装、本書で完走 + 次バッチ提案

## 仕様

### batch-87 完走記録

`polish-era-progress.md` に batch-87 セクション追加。

### 音声機能 最終判断

memory `feedback_audio_freeze.md` に基づき、現状の音声機能（配置場所 / 利用率 / 凍結期間）を整理し、削除 or 残置を判定:

- **削除条件**: agent が「Refactor Era / Polish Era 中に一度も使わなかった」と判断
- **残置条件**: agent が「将来の機能に必要」と判断、Distribution Era で再有効化

判定結果を memory ファイルと dispatch-log に記録。

### Distribution Era 起動条件チェック

`memory/arcagate_product_direction.md` の Distribution Era 起動条件:

- Polish Era 完走 (5〜8 バッチ)
- 「自分で毎日使って違和感ゼロ」状態（ユーザ判定）

batch-86, 87 の 2 バッチで Polish Era は何 % 完走？ 残り plan 候補（batch-88〜90 まで予測）:

- batch-88: スプラッシュ / Loading 画面 + Loading/Error 状態統一
- batch-89: マイクロインタラクション体系化 + ツールチップ shadcn 化
- batch-90: 整理 + Distribution Era 起動提案

### Distribution Era 5 plan 候補

memory から:

- PH-395 コード署名（Windows / 配布時）
- PH-396 エラー境界 UI（unrecoverable error 時の見せ方）
- PH-397 バックアップ UI（DB export / import の UI 化）
- PH-398 アップデート機構（Tauri updater）
- PH-399 整理 + Distribution Era 進捗

## 受け入れ条件

- [x] dispatch-log への batch-87 完走追記は archive PR で実施
- [x] polish-era-progress.md 更新は archive PR で実施
- [ ] 音声機能 最終判断 → batch-88 で実施（PH-391 配置整理と並行で Sound カテゴリの review を行う）
- [x] Distribution Era 5 plan 候補（PH-395〜399）を本書に記載
- [x] `pnpm verify` 全通過

## 完了ノート（batch-87）

batch-87 で消化:

- PH-390 done partial (LibraryMainArea 統合、Palette 見送り)
- PH-391 deferred → batch-88 専用バッチに分離
- PH-392 done (watched_folders 完全削除)
- PH-393 done (コピー統一 + マイクロインタラクション review)
- PH-394 done (本書)

batch-88 候補:

- PH-395 PH-391 配置整理 専用バッチ（30 ファイル変更想定）
- PH-396 音声機能 最終判断 + Sound カテゴリ整理
- PH-397 スプラッシュ / Loading 画面（memory `arcagate_product_direction.md` Polish Era 候補）
- PH-398 防衛テスト（EmptyState / About / コピー regression）
- PH-399 整理 + Distribution Era 移行提案

Distribution Era（batch-89 以降）の 5 plan 候補は本書原案を維持:

- PH-400 コード署名（Windows）
- PH-401 エラー境界 UI
- PH-402 バックアップ UI
- PH-403 アップデート機構
- PH-404 整理 + 配布リリース判断

## SFDIPOT 観点

- **S**tructure: ドキュメント整合性
- **H**istory: Era 進捗の客観化
