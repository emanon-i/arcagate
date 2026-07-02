Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FgU {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$hwnd = [FgU]::GetForegroundWindow()
$root = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
$t1 = $sw.ElapsedMilliseconds

$out = [PSCustomObject]@{ ts = (Get-Date -Format "o"); fromHandleMs = $t1; foundEditControl = $false; url = $null; findMs = $null; totalMs = $null; error = $null }

try {
    $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
    $sw2 = [System.Diagnostics.Stopwatch]::StartNew()
    $edit = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
    $t2 = $sw2.ElapsedMilliseconds
    $out.findMs = $t2
    if ($edit -ne $null) {
        $out.foundEditControl = $true
        $valPattern = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $out.url = $valPattern.Current.Value
    }
} catch {
    $out.error = $_.Exception.Message
}
$out.totalMs = $sw.ElapsedMilliseconds

$out | Format-List
$out | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\50-uia-addressbar-raw.json"
