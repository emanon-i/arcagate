# sign-windows.ps1
#
# Authenticode コード署名スクリプト (PH-441 batch-97)。
# tauri build 後、生成された exe / msi / nsis bundle を signtool で署名。
#
# Usage:
#   pwsh scripts/sign-windows.ps1                  # env:ARCAGATE_CERT_THUMBPRINT を使用
#   pwsh scripts/sign-windows.ps1 -CertThumbprint "<sha1>"
#
# 前提:
# - signtool.exe が PATH 上 (Windows SDK インストール時に同梱)
# - 証明書が CurrentUser\My ストアにインストール済み (Thumbprint で参照)
# - または PFX ファイル指定 (-CertFile + -CertPassword)
#
# 環境変数:
# - ARCAGATE_CERT_THUMBPRINT: 証明書の Thumbprint (SHA1)
# - ARCAGATE_CERT_FILE: PFX ファイルパス (Thumbprint の代替)
# - ARCAGATE_CERT_PASSWORD: PFX パスワード (-CertFile 使用時)
# - ARCAGATE_TIMESTAMP_URL: タイムスタンプサーバ (デフォルト digicert)

param(
    [string]$CertThumbprint = $env:ARCAGATE_CERT_THUMBPRINT,
    [string]$CertFile = $env:ARCAGATE_CERT_FILE,
    [string]$CertPassword = $env:ARCAGATE_CERT_PASSWORD,
    [string]$TimestampUrl = $(if ($env:ARCAGATE_TIMESTAMP_URL) { $env:ARCAGATE_TIMESTAMP_URL } else { "http://timestamp.digicert.com" }),
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# 署名対象を収集
$repoRoot = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $repoRoot "src-tauri/target/release/arcagate.exe"
$msiPath = Get-ChildItem -Path "$repoRoot/src-tauri/target/release/bundle/msi" -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
$nsisPath = Get-ChildItem -Path "$repoRoot/src-tauri/target/release/bundle/nsis" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

$targets = @()
if (Test-Path $exePath) { $targets += $exePath }
if ($msiPath) { $targets += $msiPath.FullName }
if ($nsisPath) { $targets += $nsisPath.FullName }

if ($targets.Count -eq 0) {
    Write-Error "No targets found. Run 'pnpm tauri build' first."
    exit 1
}

# signtool 検出
$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) {
    Write-Error "signtool.exe not found. Install Windows SDK or add to PATH."
    exit 1
}

# 証明書チェック
if (-not $CertThumbprint -and -not $CertFile) {
    Write-Warning "No certificate specified. Set ARCAGATE_CERT_THUMBPRINT or ARCAGATE_CERT_FILE env var."
    Write-Warning "Skipping signing (this is OK for local builds without cert)."
    exit 0
}

Write-Host "=== Authenticode signing ==="
Write-Host "Targets: $($targets.Count) file(s)"
Write-Host "Timestamp URL: $TimestampUrl"

# signtool 引数組み立て
$signArgs = @("sign", "/tr", $TimestampUrl, "/td", "sha256", "/fd", "sha256")

if ($CertThumbprint) {
    Write-Host "Certificate: Thumbprint $CertThumbprint"
    $signArgs += @("/sha1", $CertThumbprint)
} elseif ($CertFile) {
    Write-Host "Certificate: File $CertFile"
    $signArgs += @("/f", $CertFile)
    if ($CertPassword) {
        $signArgs += @("/p", $CertPassword)
    }
}

if ($DryRun) {
    Write-Host "[DryRun] would invoke: signtool $($signArgs -join ' ') <each target>"
    foreach ($t in $targets) {
        Write-Host "  - $t"
    }
    exit 0
}

# 各 target を署名
$failed = 0
foreach ($t in $targets) {
    Write-Host "Signing: $t"
    & $signtool.Source @signArgs $t
    if ($LASTEXITCODE -ne 0) {
        Write-Error "signtool failed for $t (exit $LASTEXITCODE)"
        $failed++
    } else {
        # 検証
        & $signtool.Source verify /pa /v $t > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ verified"
        } else {
            Write-Warning "  ⚠ signed but verify failed (exit $LASTEXITCODE)"
        }
    }
}

if ($failed -gt 0) {
    exit 1
}

Write-Host ""
Write-Host "=== Signing complete: $($targets.Count) file(s) ==="
