---
id: PH-20260427-402
status: todo
batch: 89
type: 防衛
era: Polish Era
---

# PH-402: 実機計測完走（起動 P95 + idle memory）+ スプラッシュ採用判定

## 参照した規約

- batch-85 PH-382 / PH-383 で計測スクリプト整備（実機計測待ち）
- vision: 起動 P95 ≤ 2 秒 / idle memory ≤ 100 MB
- 実機計測はユーザ承認前提（dispatch-operation §4c）

## 仕様

### 計測実行

ユーザ承認確認後に:

```powershell
pwsh scripts/bench/startup.ps1 -Iterations 100
pwsh scripts/bench/idle-memory.ps1 -IdleWaitSec 30 -ExtendedSec 300
```

### 結果記録

`docs/l2_architecture/performance-baseline.md` の §9 / §10 に実測値追記:

- 起動 P50 / P95 / P99 / Min / Max
- idle WS / PrivateMemorySize（30 秒 / 5 分後）

### 判定

- P95 ≤ 2000ms → vision 達成、splash 不要
- P95 > 2000ms → splash 採用（白フラッシュ抑制）or 起動最適化（DB lazy / IPC reduction）
- idle WS ≤ 100 MB → vision 達成
- idle WS > 100 MB → sysinfo Mutex 戦略 review or WebView2 baseline 確認

## 受け入れ条件

- [ ] startup.ps1 100 回計測完走、結果を performance-baseline.md に追記
- [ ] idle-memory.ps1 完走、結果を performance-baseline.md に追記
- [ ] 判定結果（vision 達成 / 改善必要）を memory + dispatch-log に記録
- [ ] 改善必要なら 1 件 commit、達成なら baseline のみ
