$results = @()

# --- 1. Get-Counter (PDH-based performance counters) : system-wide ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$c = Get-Counter -Counter '\Processor(_Total)\% Processor Time','\Memory\Available MBytes','\PhysicalDisk(_Total)\Disk Bytes/sec','\Network Interface(*)\Bytes Total/sec' -ErrorAction SilentlyContinue
$t1 = $sw.ElapsedMilliseconds
$results += [PSCustomObject]@{ method="Get-Counter(PDH multi)"; scope="system-wide"; ms=$t1; sample=($c.CounterSamples | ForEach-Object { "$($_.Path)=$($_.CookedValue)" }) -join " | " }

# --- 2. WMI Win32_PerfFormattedData (system-wide CPU) ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$cpu = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
$t2 = $sw.ElapsedMilliseconds
$results += [PSCustomObject]@{ method="WMI Win32_PerfFormattedData_PerfOS_Processor"; scope="system-wide"; ms=$t2; sample="PercentProcessorTime=$($cpu.PercentProcessorTime)" }

# --- 3. WMI Win32_OperatingSystem (memory) ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$os = Get-CimInstance Win32_OperatingSystem
$t3 = $sw.ElapsedMilliseconds
$freeMB = [math]::Round($os.FreePhysicalMemory/1024,1)
$totalMB = [math]::Round($os.TotalVisibleMemorySize/1024,1)
$results += [PSCustomObject]@{ method="WMI Win32_OperatingSystem"; scope="system-wide"; ms=$t3; sample="FreeMB=$freeMB / TotalMB=$totalMB" }

# --- 4. GetSystemTimes raw Win32 API (lightweight, no WMI/PDH) ---
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class SysTimes {
    [DllImport("kernel32.dll")]
    public static extern bool GetSystemTimes(out System.Runtime.InteropServices.ComTypes.FILETIME idle, out System.Runtime.InteropServices.ComTypes.FILETIME kernel, out System.Runtime.InteropServices.ComTypes.FILETIME user);
}
"@
function Get-FTValue($ft) { return ([uint64][uint32]$ft.dwHighDateTime -shl 32) -bor [uint64][uint32]$ft.dwLowDateTime }
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$idle1 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$kernel1 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$user1 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
[SysTimes]::GetSystemTimes([ref]$idle1, [ref]$kernel1, [ref]$user1) | Out-Null
$t4 = $sw.ElapsedMilliseconds
Start-Sleep -Milliseconds 1000
$idle2 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$kernel2 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
$user2 = New-Object System.Runtime.InteropServices.ComTypes.FILETIME
[SysTimes]::GetSystemTimes([ref]$idle2, [ref]$kernel2, [ref]$user2) | Out-Null
$idleDiff = (Get-FTValue $idle2) - (Get-FTValue $idle1)
$kernelDiff = (Get-FTValue $kernel2) - (Get-FTValue $kernel1)
$userDiff = (Get-FTValue $user2) - (Get-FTValue $user1)
$totalDiff = $kernelDiff + $userDiff
$cpuPct = if ($totalDiff -gt 0) { [math]::Round((1 - ($idleDiff / $totalDiff)) * 100, 1) } else { 0 }
$results += [PSCustomObject]@{ method="GetSystemTimes (raw Win32)"; scope="system-wide"; ms=$t4; sample="cpuPct(1000ms delta)=$cpuPct" }

# --- 5. Per-process via WMI Win32_PerfFormattedData_PerfProc_Process ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$procs = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -notin @('_Total','Idle') } | Select-Object -First 5 Name, PercentProcessorTime, WorkingSetPrivate
$t5 = $sw.ElapsedMilliseconds
$results += [PSCustomObject]@{ method="WMI Win32_PerfFormattedData_PerfProc_Process (all procs)"; scope="per-process"; ms=$t5; sample=($procs | ForEach-Object { "$($_.Name):cpu=$($_.PercentProcessorTime)" }) -join ", " }

# --- 6. Per-process via Get-Process (GetProcessTimes/WorkingSet under the hood) ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$gp = Get-Process | Select-Object -First 5 ProcessName, CPU, WorkingSet64
$t6 = $sw.ElapsedMilliseconds
$results += [PSCustomObject]@{ method="Get-Process (GetProcessTimes-based, all procs)"; scope="per-process"; ms=$t6; sample=($gp | ForEach-Object { "$($_.ProcessName):cpu=$($_.CPU)" }) -join ", " }

# --- 7. Disk via WMI Win32_PerfFormattedData_PerfDisk_PhysicalDisk ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$disk = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"
$t7 = $sw.ElapsedMilliseconds
$results += [PSCustomObject]@{ method="WMI Win32_PerfFormattedData_PerfDisk_PhysicalDisk"; scope="system-wide disk"; ms=$t7; sample="DiskBytesPerSec=$($disk.DiskBytesPersec)" }

# --- 8. Network via WMI Win32_PerfFormattedData_Tcpip_NetworkInterface ---
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$net = Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | Select-Object -First 1 Name, BytesTotalPersec
$t8 = $sw.ElapsedMilliseconds
$results += [PSCustomObject]@{ method="WMI Win32_PerfFormattedData_Tcpip_NetworkInterface"; scope="system-wide net"; ms=$t8; sample="$($net.Name)=$($net.BytesTotalPersec)Bps" }

$results | Format-Table -AutoSize -Wrap
$results | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\70-sysmetrics-raw.json"
