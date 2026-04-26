# Codex 再 review 結果 — batch-92 完走時 (Rule C, 2 回目)

**実施日**: 2026-04-27
**前回**: `codex-review.md` (batch-91 1 回目、Polish Era 完走宣言を取消するきっかけになった)
**手段**: `run-codex` skill (Codex CLI 0.125)

## 結論

> **「改善は明確、ただし完走宣言は時期尚早」**

batch-92 で前進したが、`done` 主張と実装実態にギャップ。Polish Era 完走宣言は batch-93 完走後に再判定。

## 主要所見 (5 件)

1. **PH-417 watch 系未達**: `watched_path_service.rs:21 / :40` で「失敗時 DB 保存しない」想定コメントがあるが、実装は保存している (silent failure 温存)
2. **PH-418 OnboardingTour 未実装**: `+page.svelte:151` には `SetupWizard` のみ、OnboardingTour は存在せず
3. **PH-418 EmptyState actions slot 未達**: `EmptyState.svelte:9` は単一 `action` のまま、複数 slot 未対応
4. **launch 診断の脆さ**: `launch-error.ts:13` でフロントが文字列 contains 判定 (Rust 側 `error.rs:48` の構造を活かせていない)
5. **既知の Windows 引数分割問題**: `launcher/mod.rs:36 / :128` で `split_whitespace` 残存、launch UX H9/H7 を再悪化させる地雷

## 5 質問への回答

### Q1: severity 集計の妥当性

**結論**: 分布 (4=0, 3=12, 2=15, 1=19) は方向性妥当だが、**severity 3 を過小評価寄り**。

**根拠**: 集計表自体は内部整合 (`use-case-friction-v2.md:413`)。ただし上記未達 (watch / onboarding) が残るため、HE の H9/H10 観点で major が実装上未解消。Nielsen severity は「頻度×影響×持続性」で見るため、日常導線の未解消は 3 維持が妥当。

**次のアクション**: PH-415 集計は維持しつつ、PH-417/418 完了定義を「実装確認済み」に更新して再カウント (特に case 5、case 1/2/3 の H10)。

### Q2: macro 判定 (severity 4 = 0 → 構造再設計不要)

**結論**: 「全面再設計不要」は妥当。ただし「構造拡張不要」ではない。

**根拠**: catastrophic 0 確認 (`use-case-friction-v2.md:431`)。一方で launch group は H7 major のまま、これはアーキテクチャ破壊ではなく機能面の中規模拡張 (workflow / macro 層)。

**次のアクション**: batch-93 では「再設計」ではなく「機能拡張」として launch group を切る (Rule A で要件固定後に着手)。

### Q3: Polish Era 完走再判定 (67% 解消見込み)

**結論**: **公開品質ライン未達**。67% "見込み" は判定根拠として弱い。

**根拠**: 67% はドキュメント上の見込み値 (`use-case-friction-v2.md:463`)。実装では watch / onboarding が未達、加えて launch 引数処理の既知欠陥が残存。公開判定は ISO 9241-11 的にも「主要タスクの有効性・効率・満足」が実証される必要があり、現状は H9/H10 の有効性証拠が不足。

**次のアクション**: 完走判定ゲートを「見込み」から「実装+テスト+実測」に変更。最低でも残 major 4 件 + watch 可視化 + onboarding を完了後に再判定。

### Q4: batch-93 残作業の優先順位

**結論 + 推奨順** (H9/H3 の失敗時復旧・中断可能性を先に潰すのが業界標準、次に H7 効率):

1. **file-search cancel** (H3、長時間ブロック解消)
2. **watch エラー可視化** (H9、silent failure 解消)
3. **IPC エラー全般統一** (H9、recoverability)
4. clipboard 検索 (H7)
5. 一括タグ付け (H7)
6. launch group (H7、Rule A)
7. ErrorBoundary (横断耐障害性)
8. OnboardingTour (H10、初回学習)

### Q5: 見落とし (8 件)

1. watch 失敗時に DB 書き込みしない実装へ修正 (コメントと実装の一致)
2. watch 状態 / エラーを UI 可視化 (バッジ + 再試行)
3. `OnboardingTour` を実装し `SetupWizard` と役割分離
4. `EmptyState` を `actions slot` 化 (複数導線)
5. launch error を文字列判定ではなく構造化コードで扱う
6. `split_whitespace` を廃止し Windows 引数を安全に扱う
7. HelpPanel に focus trap と初期フォーカス復帰を追加
8. e2e を「トースト表示有無」だけでなく「原因別文言」まで検証

## batch-93 plan 構成 (5 plan 制約)

| # | 種別 | Plan ID | 内容                                                                 | Codex 優先度 |
| - | ---- | ------- | -------------------------------------------------------------------- | ------------ |
| 1 | 改善 | PH-420  | file-search cancel (H3)                                              | 1            |
| 2 | 改善 | PH-421  | watch エラー可視化 + 失敗時 DB 書き込み停止 (H9)                     | 2            |
| 3 | 改善 | PH-422  | launch error 構造化 (errorCode field) + split_whitespace 修正 (H9)   | 3 + 6        |
| 4 | 防衛 | PH-423  | HelpPanel focus trap + e2e 原因別文言検証 (Codex 7, 8)               | 7 + 8        |
| 5 | 整理 | PH-424  | EmptyState actions slot + use-case-friction-v2 update + dispatch-log | 4            |

切り出し (batch-94 候補): clipboard 検索 / 一括タグ付け / launch group (Rule A) / ErrorBoundary / OnboardingTour / IPC エラー全般統一

## 次回 Codex 投げ込み計画

batch-93 完走時、3 回目の Rule C で再 review。質問は本ファイル末尾に追記する。
