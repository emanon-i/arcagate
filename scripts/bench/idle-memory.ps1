# idle-memory.ps1
#
# arcagate.exe の idle memory（起動 + 30 秒 / 5 分使用後）を計測する（PH-383）。
#
# Usage:
#   pwsh scripts/bench/idle-memory.ps1                       # 30 秒待機 + 5 分使用後
#   pwsh scripts/bench/idle-memory.ps1 -ExtendedSec 0        # 30 秒のみ
#
# 計測対象: WorkingSet64（OS が割り当てた物理メモリ） / PrivateMemorySize64（commit）
# 単位: bytes（出力時に MB 換算）

param(
    [int]$IdleWaitSec = 30,
    [int]$ExtendedSec = 300,
    [string]$ExePath = "src-tauri/target/release/arcagate.exe"
)

if (-not (Test-Path $ExePath)) {
    Write-Error "exe not found: $ExePath. Run 'pnpm tauri build' first."
    exit 1
}

# 既存プロセス kill
Get-Process arcagate -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting arcagate.exe..."
$proc = Start-Process $ExePath -PassThru
if (-not $proc) {
    Write-Error "Failed to start arcagate.exe"
    exit 1
}

# idle (起動直後の安定化待ち)
Write-Host "Waiting $IdleWaitSec seconds for steady state..."
Start-Sleep -Seconds $IdleWaitSec

$idle = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if (-not $idle) {
    Write-Error "arcagate process died unexpectedly"
    exit 1
}

$idleWS = [math]::Round($idle.WorkingSet64 / 1MB, 2)
$idlePM = [math]::Round($idle.PrivateMemorySize64 / 1MB, 2)

Write-Host ""
Write-Host "===== Idle Memory ($IdleWaitSec sec uptime) ====="
Write-Host ("WorkingSet:        {0,6:F2} MB" -f $idleWS)
Write-Host ("PrivateMemorySize: {0,6:F2} MB" -f $idlePM)

# extended (5 分使用模擬: SystemMonitor poll 等が走る前提)
if ($ExtendedSec -gt 0) {
    Write-Host ""
    Write-Host "Waiting $ExtendedSec more seconds for extended observation..."
    Start-Sleep -Seconds $ExtendedSec

    $ext = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($ext) {
        $extWS = [math]::Round($ext.WorkingSet64 / 1MB, 2)
        $extPM = [math]::Round($ext.PrivateMemorySize64 / 1MB, 2)
        $deltaWS = [math]::Round($extWS - $idleWS, 2)
        $deltaPM = [math]::Round($extPM - $idlePM, 2)

        Write-Host ""
        Write-Host "===== Extended ($($IdleWaitSec + $ExtendedSec) sec uptime) ====="
        Write-Host ("WorkingSet:        {0,6:F2} MB ({1:+#.##;-#.##;0} MB)" -f $extWS, $deltaWS)
        Write-Host ("PrivateMemorySize: {0,6:F2} MB ({1:+#.##;-#.##;0} MB)" -f $extPM, $deltaPM)

        $target = 100
        if ($extWS -le $target) {
            Write-Host "✓ vision target (WS <= $target MB) MET" -ForegroundColor Green
        } else {
            Write-Host "✗ vision target (WS <= $target MB) NOT MET" -ForegroundColor Red
        }
    }
}

# クリーンアップ
Write-Host ""
Write-Host "Stopping arcagate.exe..."
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
