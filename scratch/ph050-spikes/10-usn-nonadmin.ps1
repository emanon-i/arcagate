$out = "E:\Cella\Projects\arcagate\scratch\ph050-spikes\10-usn-nonadmin-raw.txt"
"=== whoami ===" | Out-File $out
whoami | Out-File $out -Append
"=== elevation check ===" | Out-File $out -Append
([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator) | Out-File $out -Append

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class UsnTest {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr CreateFile(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool DeviceIoControl(
        IntPtr hDevice, uint dwIoControlCode,
        IntPtr lpInBuffer, uint nInBufferSize,
        IntPtr lpOutBuffer, uint nOutBufferSize,
        out uint lpBytesReturned, IntPtr lpOverlapped);

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr hObject);

    public const uint GENERIC_READ = 0x80000000;
    public const uint GENERIC_WRITE = 0x40000000;
    public const uint FILE_SHARE_READ = 0x1;
    public const uint FILE_SHARE_WRITE = 0x2;
    public const uint OPEN_EXISTING = 3;
    public const uint FSCTL_QUERY_USN_JOURNAL = 0x000900f4;
    public const uint FSCTL_READ_USN_JOURNAL = 0x000900bb;
}
"@

$out2 = "E:\Cella\Projects\arcagate\scratch\ph050-spikes\10-usn-nonadmin-raw.txt"
"=== FSCTL_QUERY_USN_JOURNAL on E: ===" | Out-File $out2 -Append
$hVol = [UsnTest]::CreateFile("\\.\E:", [UsnTest]::GENERIC_READ -bor [UsnTest]::GENERIC_WRITE, [UsnTest]::FILE_SHARE_READ -bor [UsnTest]::FILE_SHARE_WRITE, [IntPtr]::Zero, [UsnTest]::OPEN_EXISTING, 0, [IntPtr]::Zero)
if ($hVol -eq [IntPtr]-1) {
    $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    "CreateFile handle=INVALID err=$err" | Out-File $out2 -Append
} else {
    "CreateFile handle=$hVol (ok)" | Out-File $out2 -Append
    $outBuf = [Runtime.InteropServices.Marshal]::AllocHGlobal(512)
    $bytesReturned = 0
    $ok = [UsnTest]::DeviceIoControl($hVol, [UsnTest]::FSCTL_QUERY_USN_JOURNAL, [IntPtr]::Zero, 0, $outBuf, 512, [ref]$bytesReturned, [IntPtr]::Zero)
    if ($ok) {
        $bytes = New-Object byte[] $bytesReturned
        [Runtime.InteropServices.Marshal]::Copy($outBuf, $bytes, 0, $bytesReturned)
        $hex = ($bytes | ForEach-Object { $_.ToString("X2") }) -join " "
        "QUERY_USN_JOURNAL ok bytesReturned=$bytesReturned hex=$hex" | Out-File $out2 -Append
    } else {
        $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        "QUERY_USN_JOURNAL FAILED err=$err" | Out-File $out2 -Append
    }
    [Runtime.InteropServices.Marshal]::FreeHGlobal($outBuf)

    "=== FSCTL_READ_USN_JOURNAL on E: (non-admin) ===" | Out-File $out2 -Append
    # READ_USN_JOURNAL_DATA struct: StartUsn(8) ReasonMask(4) ReturnOnlyOnClose(4) Timeout(8) BytesToWaitFor(8) UsnJournalID(8) = 40 bytes (v0)
    $inBuf = [Runtime.InteropServices.Marshal]::AllocHGlobal(40)
    [Runtime.InteropServices.Marshal]::WriteInt64($inBuf, 0, 0)      # StartUsn
    [Runtime.InteropServices.Marshal]::WriteInt32($inBuf, 8, -1)     # ReasonMask = 0xFFFFFFFF
    [Runtime.InteropServices.Marshal]::WriteInt32($inBuf, 12, 0)     # ReturnOnlyOnClose
    [Runtime.InteropServices.Marshal]::WriteInt64($inBuf, 16, 0)     # Timeout
    [Runtime.InteropServices.Marshal]::WriteInt64($inBuf, 24, 0)     # BytesToWaitFor
    [Runtime.InteropServices.Marshal]::WriteInt64($inBuf, 32, 0)     # UsnJournalID (0 = try any, will fail if mismatched but we just want the error/access path)
    $outBuf2 = [Runtime.InteropServices.Marshal]::AllocHGlobal(4096)
    $bytesReturned2 = 0
    $ok2 = [UsnTest]::DeviceIoControl($hVol, [UsnTest]::FSCTL_READ_USN_JOURNAL, $inBuf, 40, $outBuf2, 4096, [ref]$bytesReturned2, [IntPtr]::Zero)
    if ($ok2) {
        "READ_USN_JOURNAL ok bytesReturned=$bytesReturned2" | Out-File $out2 -Append
    } else {
        $err2 = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        "READ_USN_JOURNAL FAILED err=$err2" | Out-File $out2 -Append
    }
    [Runtime.InteropServices.Marshal]::FreeHGlobal($inBuf)
    [Runtime.InteropServices.Marshal]::FreeHGlobal($outBuf2)
    [UsnTest]::CloseHandle($hVol) | Out-Null
}
Write-Host "done, see $out2"
