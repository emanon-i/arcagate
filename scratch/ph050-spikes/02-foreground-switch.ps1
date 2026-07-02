Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32b {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool QueryFullProcessImageName(IntPtr hProcess, uint flags, StringBuilder exeName, ref uint size);
    [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr hObject);
}
"@

function Get-FgSample {
    param([string]$label)
    $hwnd = [Win32b]::GetForegroundWindow()
    $len = [Win32b]::GetWindowTextLength($hwnd)
    $sb = New-Object System.Text.StringBuilder ($len + 1)
    [Win32b]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
    $title = $sb.ToString()
    $procId = 0
    [Win32b]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    $procPath = "N/A"; $procName = "N/A"
    $hProc = [Win32b]::OpenProcess(0x1000, $false, $procId)
    if ($hProc -ne [IntPtr]::Zero) {
        $size = 1024
        $sb2 = New-Object System.Text.StringBuilder $size
        if ([Win32b]::QueryFullProcessImageName($hProc, 0, $sb2, [ref]$size)) { $procPath = $sb2.ToString() }
        [Win32b]::CloseHandle($hProc) | Out-Null
    }
    $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    [PSCustomObject]@{ label=$label; ts=(Get-Date -Format "o"); hwnd=$hwnd.ToString(); pid=$procId; procName=$procName; procPath=$procPath; title=$title }
}

$results = @()
$results += Get-FgSample "before-notepad"

$p = Start-Process notepad -PassThru
Start-Sleep -Milliseconds 800
$shell = New-Object -ComObject WScript.Shell
$shell.AppActivate($p.Id) | Out-Null
Start-Sleep -Milliseconds 500
$results += Get-FgSample "notepad-foreground"

# type something to change title (Untitled -> keeps Untitled unless saved, but exercise title read)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("PH050 spike test line")
Start-Sleep -Milliseconds 300
$results += Get-FgSample "notepad-after-typing"

Stop-Process -Id $p.Id -Force
Start-Sleep -Milliseconds 500
$results += Get-FgSample "after-notepad-closed"

$results | Format-Table -AutoSize
$results | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\02-foreground-switch-raw.json"
Write-Host "Saved to 02-foreground-switch-raw.json"
