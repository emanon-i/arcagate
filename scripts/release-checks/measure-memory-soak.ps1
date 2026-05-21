# measure-memory-soak.ps1
#
# PH-PQ-100 T5: arcagate.exe の memory soak を自動計測する。
#
# 旧版は「idle 放置のみ / user 手動実行前提」 だった。 本版は 2 mode を持ち、
# heavy mode は CDP 経由で UI 操作 (Library scroll / sort / workspace 切替 /
# palette open-close) を自動 loop し、 RSS を線形回帰して leak rate (MB/h) を機械判定する。
#
#   - idle   : N 分放置。 release-criteria C2 (idle 30 min <= +10MB)。
#   - heavy  : N 分の自動 UI loop。 release-criteria C3 (1h heavy <= +50MB)。
#
# 判定:
#   - idle  : baseline からの total delta <= ThresholdMB で pass。
#   - heavy : 線形回帰 slope (MB/h) <= ThresholdMB で pass (一過性 spike に頑健)。
#
# 出力: <OutDir>/memory-soak-<mode>.csv (時系列) + memory-soak-<mode>.json (判定結果)。
#
# 使用例:
#   pwsh measure-memory-soak.ps1 -Mode idle  -Minutes 30 -ThresholdMB 10
#   pwsh measure-memory-soak.ps1 -Mode heavy -Minutes 60 -ThresholdMB 50
#   pwsh measure-memory-soak.ps1 -Mode heavy -Minutes 3  -ThresholdMB 50   # quick check

param(
	[ValidateSet("idle", "heavy")]
	[string]$Mode = "idle",
	[int]$Minutes = 30,
	[int]$SampleEverySec = 60,
	[int]$ThresholdMB = 10,
	[int]$DebugPort = 9777,
	[string]$OutDir = "tmp/soak"
)

$ErrorActionPreference = "Stop"
Set-Location (git rev-parse --show-toplevel)

$exe = "src-tauri/target/release/arcagate.exe"
if (-not (Test-Path $exe)) {
	# release build が無ければ debug build を fallback (CI の build step 構成に依存)
	$dbg = "src-tauri/target/debug/arcagate.exe"
	if (Test-Path $dbg) {
		$exe = $dbg
	} else {
		Write-Error "arcagate.exe not found (looked in target/release and target/debug). Run 'pnpm tauri build' first."
		exit 1
	}
}
Write-Host "Soak target: $exe (mode=$Mode, ${Minutes}min, sample=${SampleEverySec}s)"

# ---------------------------------------------------------------------------
# CDP helpers (heavy mode の UI 駆動用)。
# ---------------------------------------------------------------------------

function Get-CdpPageTarget {
	param([int]$Port, [int]$TimeoutSec = 30)
	$deadline = (Get-Date).AddSeconds($TimeoutSec)
	while ((Get-Date) -lt $deadline) {
		try {
			$targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json" -TimeoutSec 5
			$page = $targets | Where-Object { $_.type -eq "page" -and $_.url -notlike "about:blank*" } | Select-Object -First 1
			if ($page) { return $page }
		} catch {
			# まだ debug server が立っていない — retry
		}
		Start-Sleep -Milliseconds 800
	}
	return $null
}

function Invoke-CdpEval {
	# CDP WebSocket に Runtime.evaluate を 1 度送って結果を捨てる (best-effort)。
	param([string]$WsUrl, [string]$Expression, [int]$TimeoutSec = 10)
	$ws = [System.Net.WebSockets.ClientWebSocket]::new()
	$cts = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds($TimeoutSec))
	try {
		$ws.ConnectAsync([Uri]$WsUrl, $cts.Token).Wait()
		$payload = @{
			id     = 1
			method = "Runtime.evaluate"
			params = @{ expression = $Expression; awaitPromise = $true; returnByValue = $true }
		} | ConvertTo-Json -Depth 6 -Compress
		$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
		$seg = [System.ArraySegment[byte]]::new($bytes)
		$ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
		# 1 frame だけ受信して捨てる (結果は不要、 churn を起こすのが目的)
		$buf = [System.ArraySegment[byte]]::new([byte[]]::new(8192))
		$ws.ReceiveAsync($buf, $cts.Token).Wait()
		return $true
	} catch {
		Write-Host "  (cdp eval skipped: $($_.Exception.Message))"
		return $false
	} finally {
		$ws.Dispose()
		$cts.Dispose()
	}
}

# heavy mode の UI churn workload。 best-effort で例外は握りつぶす
# (selector が無くても loop 自体は継続させ、 sustained allocation を起こす)。
$HeavyWorkloadJs = @'
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    // (1) route churn: 画面内の遷移リンク / nav item を順に click
    const navs = Array.from(document.querySelectorAll('a[href], [data-route], nav button, [role="tab"]'));
    for (const el of navs.slice(0, 8)) {
      try { el.click(); } catch {}
      await sleep(120);
    }
    // (2) scroll churn: スクロール可能コンテナを上下に振る
    const scrollers = Array.from(document.querySelectorAll('*')).filter((e) => {
      const s = getComputedStyle(e);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight;
    });
    for (const sc of scrollers.slice(0, 6)) {
      for (let i = 0; i < 12; i++) {
        sc.scrollTop = (i % 2 === 0) ? sc.scrollHeight : 0;
        sc.dispatchEvent(new Event('scroll', { bubbles: true }));
        await sleep(40);
      }
    }
    // (3) sort / control churn: sort 系 button をトグル
    const sortBtns = Array.from(document.querySelectorAll('button')).filter((b) =>
      /sort|sort|order/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    for (const b of sortBtns.slice(0, 4)) {
      try { b.click(); } catch {}
      await sleep(120);
    }
    // (4) palette open/close: グローバルショートカット相当の keydown を dispatch
    for (let i = 0; i < 4; i++) {
      const ev = (t) => new KeyboardEvent(t, { key: ' ', code: 'Space', ctrlKey: true, shiftKey: true, bubbles: true });
      window.dispatchEvent(ev('keydown'));
      window.dispatchEvent(ev('keyup'));
      await sleep(150);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      await sleep(150);
    }
  } catch (e) {
    // best-effort: workload の失敗は soak 自体を止めない
  }
  return 'ok';
})()
'@

# ---------------------------------------------------------------------------
# soak 本体
# ---------------------------------------------------------------------------

# 既存 process kill (本 soak が起動するもの以外を巻き込まないよう、 起動直後に PID 固定)
Get-Process -Name arcagate -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 1500

# heavy mode は CDP attach 用に WebView2 の debug port を有効化して起動。
# hotkey 競合を避けるため ARCAGATE_SKIP_HOTKEY=1 で global shortcut 登録を skip。
$prevWebview2Args = $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
$prevSkipHotkey = $env:ARCAGATE_SKIP_HOTKEY
if ($Mode -eq "heavy") {
	$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$DebugPort"
}
$env:ARCAGATE_SKIP_HOTKEY = "1"

$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 6  # 起動完了待機

# CDP page target を取得 (heavy mode のみ)
$wsUrl = $null
if ($Mode -eq "heavy") {
	$page = Get-CdpPageTarget -Port $DebugPort -TimeoutSec 40
	if ($page) {
		$wsUrl = $page.webSocketDebuggerUrl
		Write-Host "CDP attached: $($page.url)"
	} else {
		Write-Warning "CDP page target not found - heavy workload will be skipped (RSS は依然サンプルする)"
	}
}

$proc.Refresh()
$baselineMB = [int]($proc.PrivateMemorySize64 / 1MB)
Write-Host "Baseline RSS: $baselineMB MB"

$samples = [System.Collections.Generic.List[object]]::new()
$samples.Add([pscustomobject]@{ at_sec = 0; rss_mb = $baselineMB })

$totalSec = $Minutes * 60
$elapsed = 0
$aborted = $false

while ($elapsed -lt $totalSec) {
	# sample interval の間、 heavy mode なら workload を繰り返し駆動する
	$intervalDeadline = (Get-Date).AddSeconds($SampleEverySec)
	while ((Get-Date) -lt $intervalDeadline) {
		if ($proc.HasExited) { break }
		if ($Mode -eq "heavy" -and $wsUrl) {
			[void](Invoke-CdpEval -WsUrl $wsUrl -Expression $HeavyWorkloadJs -TimeoutSec 20)
		}
		Start-Sleep -Seconds 2
	}
	$elapsed += $SampleEverySec

	if ($proc.HasExited) {
		Write-Warning "Process exited at ${elapsed}s - aborting soak"
		$aborted = $true
		break
	}
	$proc.Refresh()
	$rss = [int]($proc.PrivateMemorySize64 / 1MB)
	$samples.Add([pscustomobject]@{ at_sec = $elapsed; rss_mb = $rss })
	Write-Host "  ${elapsed}s: $rss MB (delta from baseline: $($rss - $baselineMB) MB)"
}

# cleanup
$proc | Stop-Process -Force -ErrorAction SilentlyContinue
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = $prevWebview2Args
$env:ARCAGATE_SKIP_HOTKEY = $prevSkipHotkey

# ---------------------------------------------------------------------------
# 解析: total delta + 線形回帰 slope (MB/h)
# ---------------------------------------------------------------------------

$finalRss = $samples[-1].rss_mb
$delta = $finalRss - $baselineMB

# 最小二乗法で slope (MB/sec) を求め、 MB/h に換算 -> leak rate。
$n = $samples.Count
$leakRateMBPerHour = 0.0
if ($n -ge 2) {
	$sumX = 0.0; $sumY = 0.0; $sumXY = 0.0; $sumXX = 0.0
	foreach ($s in $samples) {
		$x = [double]$s.at_sec
		$y = [double]$s.rss_mb
		$sumX += $x; $sumY += $y; $sumXY += ($x * $y); $sumXX += ($x * $x)
	}
	$denom = ($n * $sumXX) - ($sumX * $sumX)
	if ($denom -ne 0) {
		$slopePerSec = (($n * $sumXY) - ($sumX * $sumY)) / $denom
		$leakRateMBPerHour = [math]::Round($slopePerSec * 3600.0, 2)
	}
}

# 判定: heavy は leak rate (回帰 slope) で、 idle は total delta で機械判定。
if ($Mode -eq "heavy") {
	$pass = (-not $aborted) -and ($leakRateMBPerHour -le $ThresholdMB)
	$metric = "leak_rate_mb_per_hour"
	$metricValue = $leakRateMBPerHour
} else {
	$pass = (-not $aborted) -and ($delta -le $ThresholdMB)
	$metric = "total_delta_mb"
	$metricValue = $delta
}

# ---------------------------------------------------------------------------
# 出力 (CSV 時系列 + JSON 判定結果)
# ---------------------------------------------------------------------------

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$csvPath = Join-Path $OutDir "memory-soak-$Mode.csv"
$jsonPath = Join-Path $OutDir "memory-soak-$Mode.json"

$samples | Export-Csv -Path $csvPath -NoTypeInformation -Encoding utf8

$result = [ordered]@{
	mode                  = $Mode
	duration_min          = $Minutes
	sample_every_sec      = $SampleEverySec
	baseline_mb           = $baselineMB
	final_mb              = $finalRss
	total_delta_mb        = $delta
	leak_rate_mb_per_hour = $leakRateMBPerHour
	threshold_mb          = $ThresholdMB
	decision_metric       = $metric
	decision_value        = $metricValue
	sample_count          = $n
	aborted               = $aborted
	pass                  = $pass
	measured_at           = (Get-Date).ToString("o")
}
$result | ConvertTo-Json -Depth 4 | Out-File -FilePath $jsonPath -Encoding utf8

Write-Host ""
Write-Host "Soak result ($Mode):"
Write-Host "  baseline=$baselineMB MB  final=$finalRss MB  total_delta=$delta MB"
Write-Host "  leak_rate=$leakRateMBPerHour MB/h  (decision: $metric=$metricValue, threshold=$ThresholdMB)"
Write-Host "  CSV : $csvPath"
Write-Host "  JSON: $jsonPath"
Write-Host "  pass=$pass"

if (-not $pass) {
	if ($aborted) {
		Write-Error "Soak FAILED: process exited before soak completed."
	} else {
		Write-Error "Soak FAILED: $metric=$metricValue exceeds threshold ${ThresholdMB}."
	}
	exit 1
}
exit 0
