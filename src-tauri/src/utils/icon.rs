use crate::utils::error::AppError;

/// exe ファイルからアイコンを PNG バイト列として取得する（PowerShell 経由）
pub fn extract_icon_from_exe(exe_path: &str, output_path: &str) -> Result<(), AppError> {
    let script = format!(
        r#"
Add-Type -AssemblyName System.Drawing;
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{0}');
$bmp = $icon.ToBitmap();
$bmp.Save('{1}', [System.Drawing.Imaging.ImageFormat]::Png);
"#,
        exe_path.replace('\'', "\\'"),
        output_path.replace('\'', "\\'")
    );
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()?;
    if !output.status.success() {
        return Err(AppError::LaunchFailed(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }
    Ok(())
}
