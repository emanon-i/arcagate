Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FgU2 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

# Move focus away from Chrome (Win+D show desktop) so Chrome is background
[FgU2]::keybd_event(0x5B,0,0,[UIntPtr]::Zero); [FgU2]::keybd_event(0x44,0,0,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 100
[FgU2]::keybd_event(0x44,0,2,[UIntPtr]::Zero); [FgU2]::keybd_event(0x5B,0,2,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 600

$fgNow = [FgU2]::GetForegroundWindow()
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1

$out = [PSCustomObject]@{ ts=(Get-Date -Format "o"); foregroundHwndNow=$fgNow.ToString(); chromeHwnd=$chrome.MainWindowHandle.ToString(); isChromeForeground=($fgNow -eq $chrome.MainWindowHandle); foundEditControl=$false; url=$null; findMs=$null; error=$null }

try {
    $root = [System.Windows.Automation.AutomationElement]::FromHandle($chrome.MainWindowHandle)
    $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $edit = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
    $out.findMs = $sw.ElapsedMilliseconds
    if ($edit -ne $null) {
        $out.foundEditControl = $true
        $valPattern = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $out.url = $valPattern.Current.Value
    }
} catch {
    $out.error = $_.Exception.Message
}

$out | Format-List
$out | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\51-uia-addressbar-background-raw.json"
