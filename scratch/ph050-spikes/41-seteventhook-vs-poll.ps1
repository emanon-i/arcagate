Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class HookTest {
    public delegate void WinEventDelegate(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime);

    [DllImport("user32.dll")]
    public static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr hmodWinEventProc, WinEventDelegate lpfnWinEventProc, uint idProcess, uint idThread, uint dwFlags);

    [DllImport("user32.dll")]
    public static extern bool UnhookWinEvent(IntPtr hWinEventHook);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern bool TranslateMessage(ref MSG lpMsg);
    [DllImport("user32.dll")]
    public static extern IntPtr DispatchMessage(ref MSG lpMsg);
    [DllImport("user32.dll")]
    public static extern int PeekMessage(ref MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax, uint wRemoveMsg);

    public struct MSG {
        public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int pt_x; public int pt_y;
    }

    public const uint EVENT_SYSTEM_FOREGROUND = 3;
    public const uint WINEVENT_OUTOFCONTEXT = 0;

    public static List<string> Log = new List<string>();

    public static void Callback(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime) {
        int len = GetWindowTextLength(hwnd);
        StringBuilder sb = new StringBuilder(len + 1);
        GetWindowText(hwnd, sb, sb.Capacity);
        Log.Add(DateTime.Now.ToString("o") + " FOREGROUND_CHANGED hwnd=" + hwnd + " title=" + sb.ToString());
    }
}
"@

$callback = [Delegate]::CreateDelegate([HookTest+WinEventDelegate], [HookTest], "Callback")
$hook = [HookTest]::SetWinEventHook([HookTest]::EVENT_SYSTEM_FOREGROUND, [HookTest]::EVENT_SYSTEM_FOREGROUND, [IntPtr]::Zero, $callback, 0, 0, [HookTest]::WINEVENT_OUTOFCONTEXT)
Write-Host "hook handle=$hook"

# Pump messages for N seconds while triggering foreground switches via Alt-tap + SetForegroundWindow
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Fg3 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string cls, string title);
}
"@

$endTime = (Get-Date).AddSeconds(6)
$switchCount = 0
while ((Get-Date) -lt $endTime) {
    $msg = New-Object HookTest+MSG
    while ([HookTest]::PeekMessage([ref]$msg, [IntPtr]::Zero, 0, 0, 1) -ne 0) {
        [HookTest]::TranslateMessage([ref]$msg) | Out-Null
        [HookTest]::DispatchMessage([ref]$msg) | Out-Null
    }
    Start-Sleep -Milliseconds 50
    if ($switchCount -lt 3 -and ((Get-Date) -gt $endTime.AddSeconds(-5)).GetHashCode() ) {}
}

[HookTest]::UnhookWinEvent($hook) | Out-Null

[HookTest]::Log | ForEach-Object { Write-Host $_ }
[HookTest]::Log | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\41-eventhook-raw.txt"
Write-Host "eventCount=$([HookTest]::Log.Count)"
