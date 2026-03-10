use std::path::Path;

use crate::utils::error::AppError;

/// exe ファイルからアイコンを抽出し、output_path に PNG として保存する。
/// 成功時は出力パスの文字列を返す。
pub fn extract_icon_from_exe(exe_path: &str, output_path: &str) -> Result<String, AppError> {
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
    Ok(output_path.to_string())
}

/// icons ディレクトリへの出力パスを生成する（UUID v7 ベース）。
pub fn build_icon_output_path(icons_dir: &Path) -> String {
    let filename = format!("{}.png", uuid::Uuid::now_v7());
    icons_dir.join(filename).to_string_lossy().to_string()
}
