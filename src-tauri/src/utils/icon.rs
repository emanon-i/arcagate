use std::path::Path;

use crate::utils::error::AppError;

/// PowerShell のシングルクォート文字列向けエスケープ (audit F1 2026-05-18)。
///
/// security model: PowerShell の単一引用符文字列 (`'...'`) 内では `'` を **`''` (二重化)**
/// で escape する。 バックスラッシュは literal 扱いされる。 旧実装は `\'` で escape して
/// いたため、 PS は `\` を literal 文字、 直後の `'` を文字列終端と解釈し、 パスに `'` を
/// 含むファイル (Windows のファイル名はアポストロフィを許す) で文字列を抜け出して
/// 任意 PowerShell コードを実行できた。 `''` 二重化が正しく完全な escape。
fn ps_single_quote_escape(s: &str) -> String {
    s.replace('\'', "''")
}

/// exe ファイルからアイコンを抽出し、output_path に PNG として保存する。
/// 成功時は出力パスの文字列を返す。
pub fn extract_icon_from_exe(exe_path: &str, output_path: &str) -> Result<String, AppError> {
    // 制御文字 (改行等) を含むパスは PS スクリプトを破壊しうるため事前拒否する。
    for (value, what) in [(exe_path, "exe_path"), (output_path, "output_path")] {
        if value.chars().any(char::is_control) {
            return Err(AppError::InvalidInput(format!(
                "{what} contains control characters"
            )));
        }
    }

    let script = format!(
        r#"
Add-Type -AssemblyName System.Drawing;
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{0}');
$bmp = $icon.ToBitmap();
$bmp.Save('{1}', [System.Drawing.Imaging.ImageFormat]::Png);
"#,
        ps_single_quote_escape(exe_path),
        ps_single_quote_escape(output_path)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ps_escape_doubles_single_quote() {
        // audit F1: PS シングルクォート文字列内では `'` → `''`。
        assert_eq!(ps_single_quote_escape("a'b"), "a''b");
        assert_eq!(ps_single_quote_escape("o'brien's"), "o''brien''s");
    }

    #[test]
    fn ps_escape_leaves_other_chars_literal() {
        // バックスラッシュ・スペース・アンパサンドは PS 単一引用符内で literal。
        assert_eq!(
            ps_single_quote_escape(r"C:\Program Files\a & b"),
            r"C:\Program Files\a & b"
        );
    }

    #[test]
    fn ps_escape_quote_cannot_break_string() {
        // インジェクション狙いの `';calc;'` も `''` 二重化で文字列内に閉じ込められる。
        let escaped = ps_single_quote_escape("x';calc;'y");
        assert_eq!(escaped, "x'';calc;''y");
        // escape 後の文字列を `'...'` で囲むと、 単独の `'` は一切残らない。
        assert!(!format!("'{escaped}'").contains("' "));
    }

    #[test]
    fn extract_icon_rejects_control_chars() {
        let err = extract_icon_from_exe("C:/a\nb.exe", "C:/out.png").unwrap_err();
        assert!(matches!(err, AppError::InvalidInput(_)));
    }
}
