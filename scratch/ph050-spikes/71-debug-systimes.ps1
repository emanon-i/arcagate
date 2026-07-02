Add-Type @"
using System;
using System.Runtime.InteropServices;
public class SysTimes2 {
    [DllImport("kernel32.dll")]
    public static extern bool GetSystemTimes(out System.Runtime.InteropServices.ComTypes.FILETIME idle, out System.Runtime.InteropServices.ComTypes.FILETIME kernel, out System.Runtime.InteropServices.ComTypes.FILETIME user);
}
"@
function Get-FTValue($ft) { return ([uint64][uint32]$ft.dwHighDateTime -shl 32) -bor [uint64][uint32]$ft.dwLowDateTime }
$idle1 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$kernel1 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$user1 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
[SysTimes2]::GetSystemTimes([ref]$idle1, [ref]$kernel1, [ref]$user1) | Out-Null
Write-Host "idle1: hi=$($idle1.dwHighDateTime) lo=$($idle1.dwLowDateTime) val=$(Get-FTValue $idle1)"
Write-Host "kernel1: hi=$($kernel1.dwHighDateTime) lo=$($kernel1.dwLowDateTime) val=$(Get-FTValue $kernel1)"
Write-Host "user1: hi=$($user1.dwHighDateTime) lo=$($user1.dwLowDateTime) val=$(Get-FTValue $user1)"
Start-Sleep -Milliseconds 1000
$idle2 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$kernel2 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$user2 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
[SysTimes2]::GetSystemTimes([ref]$idle2, [ref]$kernel2, [ref]$user2) | Out-Null
$idleDiff = (Get-FTValue $idle2) - (Get-FTValue $idle1)
$kernelDiff = (Get-FTValue $kernel2) - (Get-FTValue $kernel1)
$userDiff = (Get-FTValue $user2) - (Get-FTValue $user1)
$totalDiff = $kernelDiff + $userDiff
Write-Host "idleDiff=$idleDiff kernelDiff=$kernelDiff userDiff=$userDiff totalDiff=$totalDiff"
$cpuPct = if ($totalDiff -gt 0) { [math]::Round((1 - ($idleDiff / $totalDiff)) * 100, 1) } else { 0 }
Write-Host "cpuPct=$cpuPct"
