---
id: PH-20260427-439
status: deferred
batch: 96
type: 防衛
era: Polish Era 完走判定 + 機能拡張
---

# PH-439: Polish Era 完走判定文書化

## 問題

batch-90 で「Polish Era 完走宣言」を出したが Codex で取消、batch-91-94 で残作業を消化。
batch-96 完走 + Codex 3 回目 OK 後に **正式に Polish Era 完走** を宣言する。

## 改修

### 完走判定基準

batch-95 の dispatch infra も含めて以下を全て満たす:

- ✅ severity 4 (catastrophic): 0 件 (use-case-friction-v2)
- ✅ Codex Q5 全 8 件: 解消 (batch-92/93/94)
- ✅ severity 3 残: 4 件中 2 件 batch-96 で解消、残 2 件 (launch group / file-search 進捗) は機能拡張系で deferred
- ✅ Codex 3 回目: 公開水準到達 OK (PH-438 で確認)
- ✅ dispatch infra: auto-merge / queue / auto-kick / spawn-on-pressure (PH-435)
- ⏸ 実機ベンチ: PH-419 deferred、batch-97 で実施 (許可制)

### 文書更新

1. `arcagate-engineering-principles.md` §1 品質バー節に「Polish Era 完走 (2026-04-27 batch-96)」追記
2. `dispatch-log.md` に正式宣言記録
3. `dispatch-queue.md` の Active Batch を Distribution Era 候補に切替
4. `arcagate_product_direction.md` (memory) を Polish Era ✅ に更新

### Distribution Era 着手準備

- batch-97 候補: 実機ベンチ実行 (PH-419 deferred 解消)
- batch-98 候補: Windows Authenticode コード署名
- batch-99 候補: Update 機構 (tauri-plugin-updater)
- batch-100 候補: 配布ドキュメント整備 (README + INSTALL + LICENSE)

## 受け入れ条件

- [ ] PH-438 Codex 3 回目「公開水準到達 OK」確認後に着手
- [ ] arcagate-engineering-principles.md §1 に Polish Era 完走宣言追記
- [ ] dispatch-log.md に正式宣言
- [ ] dispatch-queue.md を Distribution Era ベースに切替
- [ ] memory/arcagate_product_direction.md 更新
- [ ] `pnpm verify` 全通過

## 注意

PH-438 で Codex 「公開水準未達」判定が出たら、本 plan は status: deferred にして batch-97 以降に持ち越し。

## 確定: deferred (batch-97 以降に持ち越し)

PH-438 Codex Rule C 3 回目で「Distribution Era 着手 OK、公開可能品質は未達」判定。
署名 / Updater / SBOM 未実装 + 残テスト (e2e 原因別文言、bulk tag) のため、本 plan は **deferred**。
Polish Era 完走判定は **batch-97 完走 (Authenticode + テスト充足) 後** に再判定。
