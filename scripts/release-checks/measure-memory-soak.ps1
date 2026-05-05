# measure-memory-soak.ps1
#
# arcagate.exe を起動して N 分間放置、M 分間隔で RSS (PrivateMemorySize64) を記録し、
# soak 中のメモリ増加が threshold を超えていないか検証。
#
# audit C2 (idle 30 min ≤ +10MB) / C3 (1h heavy ≤ +50MB) を自動化。
# CI では heavy load による生成が困難なため idle soak のみ。
#
# 使用例:
#   pwsh measure-memory-soak.ps1 -Minutes 30 -SampleEverySec 300
#   pwsh measure-memory-soak.ps1 -Minutes 5 -SampleEverySec 60  # quick check

param(
	[int]$Minutes = 30,
	[int]$SampleEverySec = 300,
	[int]$ThresholdMB = 10,
	[string]$OutFile = "docs/l1_requirements/release-readiness/measurements/memory-idle-soak.json"
)

$ErrorActionPreference = "Stop"
Set-Location (git rev-parse --show-toplevel)

$exe = "src-tauri/target/release/arcagate.exe"
if (-not (Test-Path $exe)) {
	Write-Error "$exe not found. Run 'pnpm tauri build' first."
	exit 1
}

# 既存 process kill
Get-Process -Name arcagate -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 1500

$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 5  # 起動完了待機

$baselineMB = [int]($proc.PrivateMemorySize64 / 1MB)
Write-Host "Baseline RSS: $baselineMB MB"

$samples = @(@{ at_sec = 0; rss_mb = $baselineMB })
$totalSec = $Minutes * 60
$elapsed = 0

while ($elapsed -lt $totalSec) {
	Start-Sleep -Seconds $SampleEverySec
	$elapsed += $SampleEverySec
	if ($proc.HasExited) {
		Write-Warning "Process exited at ${elapsed}s, aborting soak"
		break
	}
	$proc.Refresh()
	$rss = [int]($proc.PrivateMemorySize64 / 1MB)
	$samples += @{ at_sec = $elapsed; rss_mb = $rss }
	Write-Host "  ${elapsed}s: $rss MB (delta from baseline: $($rss - $baselineMB) MB)"
}

# cleanup
$proc | Stop-Process -Force -ErrorAction SilentlyContinue

$finalRss = $samples[-1].rss_mb
$delta = $finalRss - $baselineMB
$pass = $delta -le $ThresholdMB

$result = @{
	mode = "idle-soak"
	duration_min = $Minutes
	sample_every_sec = $SampleEverySec
	baseline_mb = $baselineMB
	final_mb = $finalRss
	delta_mb = $delta
	threshold_mb = $ThresholdMB
	samples = $samples
	pass = $pass
	measured_at = (Get-Date).ToString("o")
}

$outDir = Split-Path $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$result | ConvertTo-Json -Depth 4 | Out-File -FilePath $OutFile -Encoding utf8

Write-Host ""
Write-Host "Soak measurement saved to $OutFile"
Write-Host "  Delta: $delta MB (threshold: $ThresholdMB MB) — pass=$pass"
if (-not $pass) {
	exit 1
}
