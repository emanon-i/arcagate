# search-latency.ps1
#
# arcagate のパレット検索 latency (入力 → 結果反映) を CDP 経由で計測 (PH-419)。
#
# Usage:
#   pwsh scripts/bench/search-latency.ps1                   # 30 iterations、release build を使用
#   pwsh scripts/bench/search-latency.ps1 -Iterations 100   # 長時間計測
#
# 計測対象: パレット表示後の 1 文字入力 → 検索結果が DOM に反映されるまでの ms。
# Raycast / Alfred は < 50ms、VS Code Command Palette は < 30ms が業界標準 (PH-410 industry-standards.md)。
#
# 前提:
# - arcagate.exe (release build) が起動済 + パレットウィンドウが webView2 CDP port 9515 で疎通可能
# - chromedriver / Playwright 不要、CDP 直接呼び出し
#
# 注意:
# - 実機計測は許可制 (dispatch-operation §4c)、ユーザの「OK」を待ってから実行
# - 結果は docs/l2_architecture/performance-baseline.md に追記

param(
    [int]$Iterations = 30,
    [string]$ExePath = "src-tauri/target/release/arcagate.exe",
    [int]$CdpPort = 9515,
    [string]$Query = "test"
)

if (-not (Test-Path $ExePath)) {
    Write-Error "exe not found: $ExePath. Run 'pnpm tauri build' first."
    exit 1
}

# --- CDP 取得 helper ---
function Get-CdpTargets {
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:$CdpPort/json" -TimeoutSec 2
        return $r
    } catch {
        return $null
    }
}

# --- アプリ起動 (まだなら) ---
$existing = Get-Process -Name "arcagate" -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Starting $ExePath..."
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$CdpPort"
    $proc = Start-Process -FilePath $ExePath -PassThru
    Start-Sleep -Seconds 4
}

$targets = Get-CdpTargets
if (-not $targets) {
    Write-Error "CDP not reachable on port $CdpPort. Is arcagate running with --remote-debugging-port?"
    exit 1
}

# パレットウィンドウを優先選択 (label = palette)、無ければ main
$paletteTarget = $targets | Where-Object { $_.url -match "palette" } | Select-Object -First 1
if (-not $paletteTarget) {
    $paletteTarget = $targets | Select-Object -First 1
}
$wsUrl = $paletteTarget.webSocketDebuggerUrl
Write-Host "Connected to: $($paletteTarget.title) ($wsUrl)"

# --- WebSocket 経由で Runtime.evaluate を呼ぶ helper ---
Add-Type -AssemblyName System.Net.WebSockets

function Invoke-CdpEval {
    param([string]$Expression, [string]$WsUrl)

    $client = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $client.ConnectAsync([Uri]$WsUrl, $cts.Token).Wait()

    $msg = @{
        id = 1
        method = "Runtime.evaluate"
        params = @{
            expression = $Expression
            returnByValue = $true
            awaitPromise = $true
        }
    } | ConvertTo-Json -Compress -Depth 5

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
    $segment = [System.ArraySegment[byte]]::new($bytes)
    $client.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()

    $buf = New-Object byte[] 16384
    $segment2 = [System.ArraySegment[byte]]::new($buf)
    $r = $client.ReceiveAsync($segment2, $cts.Token).Result
    $client.Dispose()
    $resp = [System.Text.Encoding]::UTF8.GetString($buf, 0, $r.Count)
    return $resp | ConvertFrom-Json
}

# --- 計測本体 ---
$results = @()
Write-Host "Measuring search latency ($Iterations iterations, query='$Query')..."

for ($i = 1; $i -le $Iterations; $i++) {
    # input をクリア → 1 文字入力 → 結果 DOM 反映までの ms
    $expr = @"
(async () => {
    const input = document.querySelector('[data-testid="palette-search-input"]') || document.querySelector('input[type="text"]');
    if (!input) return { error: 'input not found' };
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200)); // debounce 解除
    const t0 = performance.now();
    input.value = '$Query'.charAt(0);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // 結果リストの DOM 更新を MutationObserver で待つ
    return await new Promise(resolve => {
        const target = document.body;
        const obs = new MutationObserver(() => {
            const t1 = performance.now();
            obs.disconnect();
            resolve({ ms: t1 - t0 });
        });
        obs.observe(target, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); resolve({ ms: -1, timeout: true }); }, 1000);
    });
})()
"@
    $r = Invoke-CdpEval -Expression $expr -WsUrl $wsUrl
    if ($r.result.result.value.ms -ge 0) {
        $results += $r.result.result.value.ms
        Write-Host "  iter $i : $([math]::Round($r.result.result.value.ms, 2)) ms"
    } else {
        Write-Host "  iter $i : timeout / no DOM change"
    }
    Start-Sleep -Milliseconds 300
}

# --- 集計 ---
if ($results.Count -eq 0) {
    Write-Error "No successful measurements"
    exit 1
}

$sorted = $results | Sort-Object
$p50 = $sorted[[math]::Floor($sorted.Count * 0.5)]
$p95 = $sorted[[math]::Floor($sorted.Count * 0.95)]
$p99 = $sorted[[math]::Floor($sorted.Count * 0.99)]
$avg = ($sorted | Measure-Object -Average).Average

Write-Host ""
Write-Host "=== Search Latency Results ==="
Write-Host "Iterations: $($sorted.Count) / $Iterations"
Write-Host "Avg: $([math]::Round($avg, 2)) ms"
Write-Host "P50: $([math]::Round($p50, 2)) ms"
Write-Host "P95: $([math]::Round($p95, 2)) ms"
Write-Host "P99: $([math]::Round($p99, 2)) ms"
Write-Host ""
Write-Host "Industry standard:"
Write-Host "  Raycast: < 50ms"
Write-Host "  VS Code Command Palette: < 30ms"
Write-Host "  Arcagate target: < 80ms (PH-410 / PH-414)"
