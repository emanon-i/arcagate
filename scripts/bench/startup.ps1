# startup.ps1
#
# arcagate.exe の cold-start 時間を 100 回計測し、P50 / P95 / P99 を出力する（PH-382）。
#
# Usage:
#   pwsh scripts/bench/startup.ps1                 # 100 iterations、release build を使用
#   pwsh scripts/bench/startup.ps1 -Iterations 30  # 短い実行
#
# 計測対象: Process Start から WebView2 が CDP コマンドに応答するまでの ms。
#
# WebView2 が起動して CDP ポート 9515 にレスポンスを返す = ユーザがホットキーで
# パレットを開ける状態とみなす。ただし「最初の paint まで」を厳密に計測する
# には CDP の Page.frameStoppedLoading event を待つ必要がある。本スクリプトは
# CDP ポート受付までの簡易計測を実装し、より厳密な計測は後続バッチで対応。

param(
    [int]$Iterations = 100,
    [int]$WaitTimeoutSec = 5,
    [string]$ExePath = "src-tauri/target/release/arcagate.exe",
    [int]$CdpPort = 9515
)

if (-not (Test-Path $ExePath)) {
    Write-Error "exe not found: $ExePath. Run 'pnpm tauri build' first."
    exit 1
}

$results = @()
Write-Host "Measuring cold-start time of $ExePath ($Iterations iterations)..."

for ($i = 0; $i -lt $Iterations; $i++) {
    # Cold start を再現するため、前回プロセスの完全終了 + WebView2 cache reset 待ち
    Get-Process arcagate -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    $start = Get-Date
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$CdpPort"
    $proc = Start-Process $ExePath -PassThru
    if (-not $proc) {
        Write-Warning "iter $i : Failed to start process"
        continue
    }

    # CDP ポートに HTTP 200 が返るまで待機（タイムアウト 5 秒）
    $deadline = (Get-Date).AddSeconds($WaitTimeoutSec)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:$CdpPort/json/version" -TimeoutSec 1 -ErrorAction Stop
            if ($resp.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds 50
        }
    }

    $end = Get-Date
    $elapsed = ($end - $start).TotalMilliseconds

    if ($ready) {
        $results += $elapsed
        Write-Progress -Activity "startup bench" -Status "$($i+1)/$Iterations" -PercentComplete (($i+1)/$Iterations*100)
    } else {
        Write-Warning "iter $i : timeout after $WaitTimeoutSec sec"
    }

    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

if ($results.Count -eq 0) {
    Write-Error "No successful iterations"
    exit 1
}

$sorted = $results | Sort-Object
$count = $sorted.Count
$p50 = $sorted[[math]::Floor($count * 0.50)]
$p95 = $sorted[[math]::Floor($count * 0.95)]
$p99 = $sorted[[math]::Floor($count * 0.99)]
$avg = ($sorted | Measure-Object -Average).Average
$min = $sorted[0]
$max = $sorted[-1]

Write-Host ""
Write-Host "===== Startup Bench Result ($count iterations) ====="
Write-Host ("Min:    {0,6:F0} ms" -f $min)
Write-Host ("P50:    {0,6:F0} ms" -f $p50)
Write-Host ("Avg:    {0,6:F0} ms" -f $avg)
Write-Host ("P95:    {0,6:F0} ms" -f $p95)
Write-Host ("P99:    {0,6:F0} ms" -f $p99)
Write-Host ("Max:    {0,6:F0} ms" -f $max)
Write-Host ""
$target = 2000
if ($p95 -le $target) {
    Write-Host "✓ vision target (P95 <= $target ms) MET" -ForegroundColor Green
} else {
    Write-Host "✗ vision target (P95 <= $target ms) NOT MET" -ForegroundColor Red
}
