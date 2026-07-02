Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$edge = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$out = [PSCustomObject]@{ ts=(Get-Date -Format "o"); found=$false; url=$null; findMs=$null; error=$null }
if ($edge) {
    try {
        $root = [System.Windows.Automation.AutomationElement]::FromHandle($edge.MainWindowHandle)
        $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $edit = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
        $out.findMs = $sw.ElapsedMilliseconds
        if ($edit -ne $null) {
            $out.found = $true
            $valPattern = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $out.url = $valPattern.Current.Value
        }
    } catch { $out.error = $_.Exception.Message }
} else {
    $out.error = "edge process not found"
}
$out | Format-List
$out | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\52-uia-addressbar-edge-raw.json"
