Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
public class IdleTest {
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [DllImport("kernel32.dll")] public static extern uint GetTickCount();
}
"@

$results = @()
for ($i = 0; $i -lt 8; $i++) {
    $lii = New-Object LASTINPUTINFO
    $lii.cbSize = [Runtime.InteropServices.Marshal]::SizeOf([type][LASTINPUTINFO])
    [IdleTest]::GetLastInputInfo([ref]$lii) | Out-Null
    $tick = [IdleTest]::GetTickCount()
    $idleMs = $tick - $lii.dwTime
    $ts = Get-Date -Format "o"
    $entry = [PSCustomObject]@{ ts = $ts; tickCount = $tick; lastInputTick = $lii.dwTime; idleMs = $idleMs }
    $results += $entry
    Write-Host "[$ts] idleMs=$idleMs"
    Start-Sleep -Milliseconds 1500
}
$results | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\21-idle-raw.json"
