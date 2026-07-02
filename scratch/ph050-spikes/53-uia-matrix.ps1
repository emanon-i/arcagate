param([string]$procName, [string]$label)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process $procName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$out = [PSCustomObject]@{ label=$label; ts=(Get-Date -Format "o"); procName=$procName; found=$false; urlLen=$null; findMs=$null; error=$null }
if ($proc) {
    try {
        $root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
        $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $edit = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
        $out.findMs = $sw.ElapsedMilliseconds
        if ($edit -ne $null) {
            $out.found = $true
            $valPattern = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $out.urlLen = $valPattern.Current.Value.Length
        }
    } catch { $out.error = $_.Exception.Message }
} else {
    $out.error = "$procName process not found"
}
$out | Format-List
$existing = @()
$outFile = "E:\Cella\Projects\arcagate\scratch\ph050-spikes\53-uia-matrix-raw.json"
if (Test-Path $outFile) { $existing = @(Get-Content $outFile -Raw | ConvertFrom-Json) }
$existing += $out
$existing | ConvertTo-Json | Out-File -Encoding utf8 $outFile
