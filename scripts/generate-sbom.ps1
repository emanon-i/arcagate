# generate-sbom.ps1
#
# CycloneDX format で Rust + npm 依存を SBOM 化 (PH-448 batch-102)。
# 出力: sbom-rust.json / sbom-npm.json (release.yml で Release assets に添付)
#
# 前提:
# - cargo cyclonedx (cargo install cargo-cyclonedx)
# - @cyclonedx/cyclonedx-npm (npx で on-demand 実行、install 不要)
#
# Usage:
#   pwsh scripts/generate-sbom.ps1                # default 出力先 ./sbom-*.json
#   pwsh scripts/generate-sbom.ps1 -OutputDir dist

param(
    [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$rustOut = Join-Path $OutputDir "sbom-rust.json"
$npmOut = Join-Path $OutputDir "sbom-npm.json"

Write-Host "=== CycloneDX SBOM generation ==="
Write-Host "Repo root: $repoRoot"
Write-Host "Output: $OutputDir"

# --- Rust 側 ---
Write-Host ""
Write-Host "[1/2] Rust dependencies (cargo cyclonedx)..."
$cargoCyclonedx = Get-Command cargo-cyclonedx -ErrorAction SilentlyContinue
if (-not $cargoCyclonedx) {
    Write-Warning "cargo-cyclonedx not found. Run 'cargo install cargo-cyclonedx' first."
    Write-Warning "Skipping Rust SBOM."
} else {
    Push-Location "$repoRoot/src-tauri"
    try {
        cargo cyclonedx --format json --override-filename "$rustOut" 2>&1 | Out-Host
        if (Test-Path $rustOut) {
            Write-Host "  ✓ Rust SBOM: $rustOut"
        }
    } finally {
        Pop-Location
    }
}

# --- npm 側 ---
Write-Host ""
Write-Host "[2/2] npm dependencies (cyclonedx-npm)..."
Push-Location $repoRoot
try {
    npx --yes @cyclonedx/cyclonedx-npm --output-format JSON --output-file "$npmOut" 2>&1 | Out-Host
    if (Test-Path $npmOut) {
        Write-Host "  ✓ npm SBOM: $npmOut"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== SBOM generation complete ==="
Write-Host "Files:"
Get-ChildItem -Path "$OutputDir/sbom-*.json" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  - $($_.Name) ($([math]::Round($_.Length / 1024, 1)) KB)" }
