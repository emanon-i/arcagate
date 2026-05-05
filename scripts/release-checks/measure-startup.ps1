# measure-startup.ps1
#
# arcagate.exe (release build) を 5 回起動し、process start → main window visible までの
# elapsed を計測、min / max / mean / P95 を出力。
#
# Pass criteria (audit D1 / D2):
#   cold P95 ≤ 1500ms / warm P95 ≤ 1000ms
#
# 実行前提:
# - pnpm tauri build を一度実施 (release バンドル生成済)
# - arcagate.exe path: src-tauri/target/release/arcagate.exe
# - 既存 arcagate プロセスを kill 推奨

param(
	[int]$Iterations = 5,
	[switch]$Cold = $false,
	[string]$OutFile = "docs/l1_requirements/release-readiness/measurements/startup.json"
)

$ErrorActionPreference = "Stop"
Set-Location (git rev-parse --show-toplevel)

$exe = "src-tauri/target/release/arcagate.exe"
if (-not (Test-Path $exe)) {
	Write-Error "$exe not found. Run 'pnpm tauri build' first."
	exit 1
}

$samples = @()
for ($i = 1; $i -le $Iterations; $i++) {
	if ($Cold) {
		# cold: app data dir を削除して 1 sec 待機
		$dataDir = "$env:LOCALAPPDATA\arcagate"
		if (Test-Path $dataDir) {
			Remove-Item $dataDir -Recurse -Force -ErrorAction SilentlyContinue
		}
		Start-Sleep -Milliseconds 1500
	}

	# 既存 process kill
	Get-Process -Name arcagate -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
	Start-Sleep -Milliseconds 500

	$start = [DateTime]::UtcNow
	$proc = Start-Process -FilePath $exe -PassThru
	# main window が visible になるまで待機 (MainWindowHandle != 0 で判定)
	while ($proc.MainWindowHandle -eq 0 -and -not $proc.HasExited) {
		$proc.Refresh()
		Start-Sleep -Milliseconds 50
		if (([DateTime]::UtcNow - $start).TotalSeconds -gt 30) {
			Write-Warning "iteration ${i}: timeout (>30s), aborting iteration"
			$proc | Stop-Process -Force -ErrorAction SilentlyContinue
			break
		}
	}
	$elapsed = ([DateTime]::UtcNow - $start).TotalMilliseconds
	$samples += [int]$elapsed
	Write-Host "iteration ${i}: $([int]$elapsed) ms"

	# cleanup
	$proc | Stop-Process -Force -ErrorAction SilentlyContinue
	Start-Sleep -Milliseconds 1000
}

$sorted = $samples | Sort-Object
$min = $sorted[0]
$max = $sorted[-1]
$mean = [int]($samples | Measure-Object -Average).Average
$p95Idx = [Math]::Floor($Iterations * 0.95) - 1
if ($p95Idx -lt 0) { $p95Idx = $sorted.Count - 1 }
$p95 = $sorted[$p95Idx]

$result = @{
	mode = if ($Cold) { "cold" } else { "warm" }
	iterations = $Iterations
	samples_ms = $samples
	min_ms = $min
	max_ms = $max
	mean_ms = $mean
	p95_ms = $p95
	threshold_ms = if ($Cold) { 1500 } else { 1000 }
	pass = if ($Cold) { $p95 -le 1500 } else { $p95 -le 1000 }
	measured_at = (Get-Date).ToString("o")
}

$outDir = Split-Path $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$result | ConvertTo-Json -Depth 4 | Out-File -FilePath $OutFile -Encoding utf8

Write-Host ""
Write-Host "Startup measurement saved to $OutFile"
Write-Host "  P95: $p95 ms (threshold: $($result.threshold_ms) ms) — pass=$($result.pass)"
if (-not $result.pass) {
	exit 1
}
