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

/// **背景 (app 内部) で叩く console プロセス** 用の `Command` を生成する単一 factory。
///
/// 返ってきた `Command` は Windows で `CREATE_NO_WINDOW` 済みなので、 `.output()` /
/// `.status()` / `.spawn()` のいずれで実行しても console window がちらつかない。
///
/// 不変条件 (audit `audit-background-spawn-console.sh` で fail-closed gate):
/// **`launcher/mod.rs` 以外で背景プロセスを spawn する時は、 生 `Command::new(...)` を
/// 直接使わず必ず本 factory を経由する**。 launcher module は user が明示起動する CLI /
/// script / terminal を扱う唯一の例外で、 そこは console 可視が正のため対象外。
///
/// 用途は git / powershell 等の **固定 system command** に限る (PATHEXT 解決は不要)。
/// PATH × PATHEXT 解決が要る user-facing な bare name は `launcher::resolved_command` を使う。
pub fn background_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    let mut cmd = Command::new(program);
    hide_console(&mut cmd);
    cmd
}
