param([string]$label = "sample")

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null

function Await($WinRtTask, $ResultType) {
    $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    $asTaskGeneric = $asTask.MakeGenericMethod($ResultType)
    $task = $asTaskGeneric.Invoke($null, @($WinRtTask))
    $task.Wait(-1) | Out-Null
    return $task.Result
}

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

$sessions = $mgr.GetSessions()
$out = @()
foreach ($s in $sessions) {
    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $playInfo = $s.GetPlaybackInfo()
    $out += [PSCustomObject]@{
        label = $label
        ts = Get-Date -Format "o"
        appId = $s.SourceAppUserModelId
        title = $props.Title
        artist = $props.Artist
        albumTitle = $props.AlbumTitle
        playbackStatus = $playInfo.PlaybackStatus.ToString()
    }
}
$currentSession = $mgr.GetCurrentSession()
$out += [PSCustomObject]@{ label = "$label-currentSession"; ts = Get-Date -Format "o"; appId = $(if ($currentSession) { $currentSession.SourceAppUserModelId } else { "null" }); title=$null; artist=$null; albumTitle=$null; playbackStatus=$null }

$out | Format-Table -AutoSize
$existing = @()
$outFile = "E:\Cella\Projects\arcagate\scratch\ph050-spikes\30-smtc-raw.json"
if (Test-Path $outFile) {
    $existing = @(Get-Content $outFile -Raw | ConvertFrom-Json)
}
$existing += $out
$existing | ConvertTo-Json | Out-File -Encoding utf8 $outFile
Write-Host "sessionCount=$($sessions.Count) appended to $outFile"
