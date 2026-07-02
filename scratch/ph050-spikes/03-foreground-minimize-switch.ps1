Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32c {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool QueryFullProcessImageName(IntPtr hProcess, uint flags, StringBuilder exeName, ref uint size);
    [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr hObject);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@

function Get-FgSample {
    param([string]$label)
    $hwnd = [Win32c]::GetForegroundWindow()
    $len = [Win32c]::GetWindowTextLength($hwnd)
    $sb = New-Object System.Text.StringBuilder ($len + 1)
    [Win32c]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
    $title = $sb.ToString()
    $procId = 0
    [Win32c]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    $procPath = "N/A"; $procName = "N/A"
    $hProc = [Win32c]::OpenProcess(0x1000, $false, $procId)
    if ($hProc -ne [IntPtr]::Zero) {
        $size = 1024
        $sb2 = New-Object System.Text.StringBuilder $size
        if ([Win32c]::QueryFullProcessImageName($hProc, 0, $sb2, [ref]$size)) { $procPath = $sb2.ToString() }
        [Win32c]::CloseHandle($hProc) | Out-Null
    }
    $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    [PSCustomObject]@{ label=$label; ts=(Get-Date -Format "o"); hwnd=$hwnd.ToString(); pid=$procId; procName=$procName; procPath=$procPath; title=$title }
}

$results = @()
$s1 = Get-FgSample "initial"
$results += $s1
Write-Host "initial fg: $($s1.procName) / $($s1.title)"

# Minimize whatever the current foreground window is (does not require SetForegroundWindow rights)
[Win32c]::ShowWindowAsync([IntPtr]::Parse($s1.hwnd), 6) | Out-Null # SW_MINIMIZE = 6
Start-Sleep -Milliseconds 800
$results += Get-FgSample "after-minimize-fullscreen-app"

$results | Format-Table -AutoSize
$results | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\03-foreground-minimize-raw.json"
