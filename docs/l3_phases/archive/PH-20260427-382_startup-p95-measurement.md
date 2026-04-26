---
id: PH-20260427-382
status: todo
batch: 85
type: 改善
era: Refactor Era / 性能フェーズ
---

# PH-382: 起動 P95 計測 + 改善（実測ベース）

## 参照した規約

- `docs/l1_requirements/vision.md` 起動 P95 ≤ 2 秒（非機能要求）
- `docs/l0_ideas/arcagate-engineering-principles.md` §9「毎日使える」客観指標: 起動が速い
- batch-82 PH-365 partial: 計測手法の整理は途中（「実測手段」が未確定）

## 横展開チェック実施済か

- batch-82 で起動時間は **未計測** とマークされた
- vision の 2 秒目標に対して baseline がない
- 配布水準を主張するには客観数値が必要

## 仕様

### 計測手法の確立

PowerShell で 100 回起動 + 起動完了時刻を記録:

```powershell
$results = @()
for ($i=0; $i -lt 100; $i++) {
    $start = Get-Date
    $proc = Start-Process target/release/arcagate.exe -PassThru
    # CDP 経由で about:blank ではなく / が表示されるまで待つ
    # WaitForCDPReady サブスクリプトで実装
    Wait-CDPReady -Port 9515 -TimeoutSec 5
    $end = Get-Date
    $results += ($end - $start).TotalMilliseconds
    Stop-Process $proc -Force
    Start-Sleep -Seconds 1
}
$results | Sort-Object | Measure-Object -Average -Maximum -Minimum
$p95 = $results | Sort-Object | Select-Object -Index ([math]::Floor($results.Length * 0.95))
```

### 改善候補（計測後判断）

P95 > 2 秒なら以下を検討:

- Splash window で webview2 init 隠蔽
- DB マイグレーション遅延（lazy schema check）
- 起動時 IPC 連鎖の reduction
- tauri-plugin-log の sink 数削減

P95 ≤ 2 秒なら baseline 維持に留め、改善は別バッチに deferred。

## 受け入れ条件

- [ ] 計測スクリプト `scripts/bench/startup.ps1` を作成
- [ ] 100 回計測の P50 / P95 / P99 を performance-baseline.md に記録
- [ ] vision 目標（P95 ≤ 2 秒）の達成 / 未達成を明記
- [ ] 未達成なら改善 1 件以上 commit、達成なら baseline のみ
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **T**ime: 起動時間そのもの
- **P**latform: Windows / WebView2 cold-start vs warm-start
- **O**perations: 100 回計測中の OS scheduling 揺らぎを除外
