//! 外部プロセス spawn の共通ユーティリティ。
//!
//! GUI プロセス (Tauri app 本体) は console を持たないため、 そこから console サブプロセス
//! (git / powershell 等) を起動すると Windows は既定で一瞬 console window を生成する。
//! background な内部処理 (プロジェクトモーダルの git 走査 / icon 抽出) では走査ごとに
//! window がちらつく不具合 (user 報告 2026-06) になるため、 `CREATE_NO_WINDOW` を立てて抑止する。
//!
//! 注意: **user が明示的に起動する CLI / script** (launcher::launch_script / launch_command /
//! launch_terminal_in_dir 等) には適用しない。 console を見たい launch まで隠すと退行になる。
//! 本 helper は「app 内部が裏で叩く console プロセス」専用。

use std::process::Command;

/// Windows の `CREATE_NO_WINDOW` プロセス生成フラグ。
/// <https://learn.microsoft.com/windows/win32/procthread/process-creation-flags>
#[cfg(windows)]
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// background サブプロセスが console window を出さないようにする。
///
/// Windows でのみ `CREATE_NO_WINDOW` を付与する。 非 Windows では no-op。
/// 呼び出しは `&mut Command` を返すので builder chain に挟める。
pub fn hide_console(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}
