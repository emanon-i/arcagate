Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
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

$results = @()
for ($i = 0; $i -lt 10; $i++) {
    $hwnd = [Win32]::GetForegroundWindow()
    $len = [Win32]::GetWindowTextLength($hwnd)
    $sb = New-Object System.Text.StringBuilder ($len + 1)
    [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
    $title = $sb.ToString()
    $procId = 0
    [Win32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    $procPath = "N/A"
    $procName = "N/A"
    try {
        $hProc = [Win32]::OpenProcess(0x1000, $false, $procId) # PROCESS_QUERY_LIMITED_INFORMATION
        if ($hProc -ne [IntPtr]::Zero) {
            $size = 1024
            $sb2 = New-Object System.Text.StringBuilder $size
            $ok = [Win32]::QueryFullProcessImageName($hProc, 0, $sb2, [ref]$size)
            if ($ok) { $procPath = $sb2.ToString() }
            [Win32]::CloseHandle($hProc) | Out-Null
        }
        $procName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    } catch {}
    $ts = Get-Date -Format "o"
    $entry = [PSCustomObject]@{
        ts = $ts
        hwnd = $hwnd.ToString()
        pid = $procId
        procName = $procName
        procPath = $procPath
        title = $title
    }
    $results += $entry
    Write-Host "[$ts] hwnd=$hwnd pid=$procId proc=$procName path=$procPath title=`"$title`""
    Start-Sleep -Seconds 2
}
$results | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\01-foreground-raw.json"
Write-Host "Saved raw output to 01-foreground-raw.json"
