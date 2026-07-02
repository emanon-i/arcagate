Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Fg {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool QueryFullProcessImageName(IntPtr hProcess, uint flags, StringBuilder exeName, ref uint size);
    [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr hObject);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

function Get-FgSample($label) {
    $hwnd = [Fg]::GetForegroundWindow()
    $len = [Fg]::GetWindowTextLength($hwnd)
    $sb = New-Object System.Text.StringBuilder ($len+1)
    [Fg]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
    $procId = 0
    [Fg]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    $procPath = "N/A"
    $hProc = [Fg]::OpenProcess(0x1000, $false, $procId)
    if ($hProc -ne [IntPtr]::Zero) {
        $size = 1024
        $sb2 = New-Object System.Text.StringBuilder $size
        if ([Fg]::QueryFullProcessImageName($hProc, 0, $sb2, [ref]$size)) { $procPath = $sb2.ToString() }
        [Fg]::CloseHandle($hProc) | Out-Null
    }
    $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    [PSCustomObject]@{ label=$label; ts=(Get-Date -Format "o"); hwnd=$hwnd.ToString(); pid=$procId; procName=$procName; procPath=$procPath; title=$sb.ToString() }
}

$results = @()
$results += Get-FgSample "initial"

$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($chrome) {
    # Alt tap trick to bypass SetForegroundWindow lockout from a background process
    [Fg]::keybd_event(0x12,0,0,[UIntPtr]::Zero)  # VK_MENU down
    [Fg]::keybd_event(0x12,0,2,[UIntPtr]::Zero)  # VK_MENU up
    [Fg]::ShowWindowAsync($chrome.MainWindowHandle, 9) | Out-Null # SW_RESTORE
    $ok = [Fg]::SetForegroundWindow($chrome.MainWindowHandle)
    Start-Sleep -Milliseconds 500
    $results += Get-FgSample "after-setforegroundwindow-chrome(ok=$ok)"
} else {
    $results += [PSCustomObject]@{ label="chrome-not-found"; ts=(Get-Date -Format "o") }
}

$results | Format-Table -AutoSize
$results | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\40-foreground-switch-raw.json"
