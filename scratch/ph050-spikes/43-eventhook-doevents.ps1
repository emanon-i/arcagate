Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class HookTest3 {
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
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    public const uint EVENT_SYSTEM_FOREGROUND = 3;
    public static List<string> Log = new List<string>();
    public static WinEventDelegate Del = new WinEventDelegate(Callback);

    public static void Callback(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime) {
        int len = GetWindowTextLength(hwnd);
        StringBuilder sb = new StringBuilder(len + 1);
        GetWindowText(hwnd, sb, sb.Capacity);
        Log.Add(DateTime.Now.ToString("o") + " hwnd=" + hwnd + " title=" + sb.ToString());
    }
}
"@

$hook = [HookTest3]::SetWinEventHook([HookTest3]::EVENT_SYSTEM_FOREGROUND, [HookTest3]::EVENT_SYSTEM_FOREGROUND, [IntPtr]::Zero, [HookTest3]::Del, 0, 0, 0)
Write-Host "hook=$hook"

$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$notepad = Start-Process notepad -PassThru
Start-Sleep -Milliseconds 500

for ($i = 0; $i -lt 100; $i++) {
    [System.Windows.Forms.Application]::DoEvents()
    if ($i -eq 10 -and $chrome) {
        [HookTest3]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [HookTest3]::keybd_event(0x12,0,2,[UIntPtr]::Zero)
        [HookTest3]::ShowWindowAsync($chrome.MainWindowHandle, 9) | Out-Null
        [HookTest3]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
    }
    if ($i -eq 40) {
        [HookTest3]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [HookTest3]::keybd_event(0x12,0,2,[UIntPtr]::Zero)
        [HookTest3]::SetForegroundWindow($notepad.MainWindowHandle) | Out-Null
    }
    Start-Sleep -Milliseconds 50
}
Stop-Process -Id $notepad.Id -Force -ErrorAction SilentlyContinue
[HookTest3]::UnhookWinEvent($hook) | Out-Null
[HookTest3]::Log | ForEach-Object { Write-Host $_ }
[HookTest3]::Log | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\43-eventhook-doevents-raw.txt"
Write-Host "eventCount=$([HookTest3]::Log.Count)"
