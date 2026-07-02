$watchDir = "E:\Cella\Projects\arcagate\scratch\ph050-spikes\rdcw-testdir"
if (Test-Path $watchDir) { Remove-Item $watchDir -Recurse -Force }
New-Item -ItemType Directory -Path $watchDir | Out-Null

$events = [System.Collections.Generic.List[object]]::new()
$fsw = New-Object System.IO.FileSystemWatcher
$fsw.Path = $watchDir
$fsw.IncludeSubdirectories = $false
$fsw.EnableRaisingEvents = $true
$fsw.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, DirectoryName'

$action = {
    $e = $Event.SourceEventArgs
    $ts = Get-Date -Format "o"
    $entry = [PSCustomObject]@{ ts = $ts; changeType = $e.ChangeType.ToString(); name = $e.Name; fullPath = $e.FullPath }
    $global:rdcwEvents.Add($entry)
    Write-Host "[$ts] $($e.ChangeType) $($e.Name)"
}
$global:rdcwEvents = $events

$h1 = Register-ObjectEvent $fsw Created -Action $action
$h2 = Register-ObjectEvent $fsw Changed -Action $action
$h3 = Register-ObjectEvent $fsw Deleted -Action $action
$h4 = Register-ObjectEvent $fsw Renamed -Action $action

Start-Sleep -Milliseconds 300
"hello" | Out-File "$watchDir\a.txt"
Start-Sleep -Milliseconds 300
"hello2" | Out-File "$watchDir\a.txt" -Append
Start-Sleep -Milliseconds 300
Rename-Item "$watchDir\a.txt" "$watchDir\b.txt"
Start-Sleep -Milliseconds 300
Remove-Item "$watchDir\b.txt"
Start-Sleep -Milliseconds 500

Unregister-Event -SourceIdentifier $h1.Name
Unregister-Event -SourceIdentifier $h2.Name
Unregister-Event -SourceIdentifier $h3.Name
Unregister-Event -SourceIdentifier $h4.Name
$fsw.Dispose()

$events | ConvertTo-Json | Out-File -Encoding utf8 "E:\Cella\Projects\arcagate\scratch\ph050-spikes\20-rdcw-raw.json"
Write-Host "total events: $($events.Count)"
Remove-Item $watchDir -Recurse -Force
