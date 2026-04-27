---
id: PH-20260427-471
status: todo
batch: 106
type: 防衛
era: Distribution Era Hardening
---

# PH-471: auto-kick + spawn-on-pressure 実機動作実証 (PH-463 の継続)

## 問題

PH-463 で auto-kick の動作実証を行ったが、PH-464 で prompt refine 後の挙動再確認 + spawn-on-pressure (`scheduled-task fireAt`) の信頼性問題 (resume 11 不発) は未解決。Distribution Era 自律運用の根幹なので実機確認 + 失敗パターンの再現条件を整理する。

## 改修

1. **auto-kick 動作実証 (refine 後)**:
   - 短時間 idle (10 分) を意図的に発生させ、auto-kick が send_message で kick するか確認
   - prompt refine の Allowed/Prohibited list が機能するか確認 (Edit / Bash の git commit が PROHIBITED として遵守されるか)
   - kick 後の dispatch session が active poll に戻るか確認
2. **scheduled-task fireAt 再現テスト**:
   - 「現在時刻 +30 秒」「+5 分」「+1 時間」3 パターンで fireAt task 作成
   - 各 fireAt 後 1.5x 経過時の `lastRunAt` を比較
   - 不発条件 (Claude Desktop アプリ起動状態 / fireAt format / time zone) を切り分け
3. **spawn-on-pressure 復活判定**:
   - fireAt 信頼性が確認できたら `dispatch-operation.md §10` を「spawn-on-pressure 利用可」へ更新
   - 信頼性に依然問題があれば「自セッションで分割実装」を default 化
4. **lessons.md 更新** (再発防止策確定)

## 受け入れ条件

- [ ] auto-kick 動作実証 transcript 取得 (refine 後)
- [ ] fireAt 3 パターンの結果記録 (`docs/l2_architecture/dispatch-tooling-audit.md` 新設 or 既存に追記)
- [ ] spawn-on-pressure 利用可否判定
- [ ] dispatch-operation.md §10 更新
- [ ] lessons.md に再発防止策追記

## 横展開チェック

- 過去の resume 9/10/11 の実績データから fireAt 信頼性の傾向分析
- 他の scheduled-task (auto-kick recurring) との比較
