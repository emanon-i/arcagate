Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class HookTest2 {
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
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int pt_x; public int pt_y; }

    public const uint EVENT_SYSTEM_FOREGROUND = 3;
    public static List<string> Log = new List<string>();

    public static void Callback(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime) {
        int len = GetWindowTextLength(hwnd);
        StringBuilder sb = new StringBuilder(len + 1);
        GetWindowText(hwnd, sb, sb.Capacity);
        Log.Add(DateTime.Now.ToString("o") + " hwnd=" + hwnd + " title=" + sb.ToString());
    }
}
"@

# Keep delegate rooted explicitly to avoid GC collection during native callback
$script:callbackDelegate = [Delegate]::CreateDelegate([HookTest2+WinEventDelegate], [HookTest2], "Callback")
$hook = [HookTest2]::SetWinEventHook([HookTest2]::EVENT_SYSTEM_FOREGROUND, [HookTest2]::EVENT_SYSTEM_FOREGROUND, [IntPtr]::Zero, $script:callbackDelegate, 0, 0, 0)
Write-Host "hook=$hook"

$msg = New-Object HookTest2+MSG
for ($i = 0; $i -lt 100; $i++) {
    while ([HookTest2]::PeekMessage([ref]$msg, [IntPtr]::Zero, 0, 0, 1) -ne 0) {
        [HookTest2]::TranslateMessage([ref]$msg) | Out-Null
        [HookTest2]::DispatchMessage([ref]$msg) | Out-Null
    }
    if ($i -eq 10) {
        [HookTest2]::keybd_event(0x5B,0,0,[UIntPtr]::Zero); [HookTest2]::keybd_event(0x44,0,0,[UIntPtr]::Zero)
        Start-Sleep -Milliseconds 80
        [HookTest2]::keybd_event(0x44,0,2,[UIntPtr]::Zero); [HookTest2]::keybd_event(0x5B,0,2,[UIntPtr]::Zero)
    }
    if ($i -eq 40) {
        [HookTest2]::keybd_event(0x5B,0,0,[UIntPtr]::Zero); [HookTest2]::keybd_event(0x44,0,0,[UIntPtr]::Zero)
        Start-Sleep -Milliseconds 80
        [HookTest2]::keybd_event(0x44,0,2,[UIntPtr]::Zero); [HookTest2]::keybd_event(0x5B,0,2,[UIntPtr]::Zero)
    }
    Start-Sleep -Milliseconds 50
}
[HookTest2]::UnhookWinEvent($hook) | Out-Null
[HookTest2]::Log | ForEach-Object { Write-Host $_ }
[HookTest2]::Log | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\42-eventhook-inline-raw.txt"
Write-Host "eventCount=$([HookTest2]::Log.Count)"
