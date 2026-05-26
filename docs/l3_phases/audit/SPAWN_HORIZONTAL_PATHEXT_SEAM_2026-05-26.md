# Spawn 横展開 audit — `resolve_program_with_pathext` / `try_spawn_cmd` の漏れ調査 (PH-CF-1210 ⑨ 追跡)

対象: PR #579 (HEAD `2968a44c`) が `launcher::launch_argv` に追加した
`resolve_program_with_pathext` (Windows で PATH × PATHEXT を展開して `code.cmd` 等を絶対パスで
解決) と、 全 spawn 葉を集約する `launcher::try_spawn_cmd` (e2e seam の通り路) が、
Arcagate 内の **すべての外部プロセス spawn 経路** に行き渡っているかの調査。

- 解析時点 main HEAD = `2968a44c` (PR #579 マージ済)。
- 解析方法: `grep` による静的 spawn 出口点の網羅 + 呼出経路の追跡 + 個別ファイル読解。
- **本ドキュメントは分析のみで、 コードは一切変更していない。**

---

## TL;DR

1. **`launcher::launch_argv` (= PATHEXT 解決済) を経由するのは custom / non-builtin opener 経路 だけ**。
   - opener registry が `builtin:` / `user:` prefix で resolve した custom opener は安全。
2. **PATHEXT 解決を受けない spawn が 4 系統残存**。 同型 (`code.cmd` shim 起動失敗) の再発リスクあり:
   - `launcher::launch_command` (`ItemType::Command` 起動): user-typed コマンド文字列の第 1 トークンが
     `pnpm` / `code` / `tsc` のような `.cmd` shim だと spawn が `NotFound` で死ぬ。
   - `launcher::launch_exe_args` (folder の legacy `default_app` 経路): `default_app` が
     `builtin:` / `user:` prefix を持たない legacy 値 (例: `"code"`、 旧 `cmd_register_exe_item`
     で登録された生コマンド名) のとき、 PATHEXT 解決なし。
   - `launcher::launch_exe` (`ItemType::Exe`): `target` が拡張子なし bare name (例: `"code"`) の場合
     spawn 失敗。 実用上 Exe 登録は file picker 経由で絶対 path が入るため発生確率は低いが、
     手入力 / import で bare name が混入する経路を構造的に塞いでいない。
   - `script_runner_service::run_script`: スクリプト監視 widget が `Command::new("node")` /
     `Command::new("python")` / `Command::new("bash")` 等で interpreter を起動。
     Volta / fnm / nvm-windows / rbenv-for-windows / Git Bash 等は `.cmd` shim を介する典型 path
     のため、 `.js` / `.ts` / `.sh` / `.rb` 等のスクリプト実行が同 root cause で失敗する。
3. **e2e seam (`try_spawn_cmd`) を経由しない直接 spawn が 4 箇所**。 ② (PH-CF-1210 ⑨) で導入した
   build-flag シーム driven の cascade verify が **届かない blind spot**:
   - `commands/launch_commands.rs:72,74` (`cmd_reveal_in_explorer`)
   - `services/script_runner_service.rs:191` (`run_script`)
   - `utils/git.rs` (`git_cmd` 系 8 箇所、 `output()` 経由の read-only 利用)
   - `utils/icon.rs:38` (`extract_icon_from_exe`、 `output()` 経由の read-only 利用)
4. **横展開案** (§5): 全 spawn を `launcher::try_spawn_cmd` (e2e seam 経由) に集約 + program 解決を
   `resolve_program_with_pathext` 経由の薄い共通ヘルパー (`launcher::resolved_command(program) -> Command`)
   に集約する。 段階移行可能で影響範囲は 5 file。
5. **機械検出 audit 案** (§6): `Command::new(<可変 program 文字列>)` を `launcher/mod.rs` 外で
   呼ぶ箇所を grep で検出 → 固定 system command (`explorer.exe` / `cmd` / `powershell` /
   `git`) を allowlist で除外 → 残った spawn を fail。

---

## 1. spawn 出口の inventory (PR #579 反映後の main 全 spawn)

`grep -rnE 'Command::new\(|\.spawn\(\)|\.output\(\)' src-tauri/src` 結果を整理 (test コード除外):

|  # | 位置                                                                                                                   | program 引数                                | spawn API           | 経由 helper     | PATHEXT 解決 | e2e seam 経由        |
| -: | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------- | --------------- | ------------ | -------------------- |
|  1 | [`launcher/mod.rs:152`](../../../src-tauri/src/launcher/mod.rs) `launch_exe`                                           | `target` (DB の `item.target`)              | `spawn`             | `try_spawn_cmd` | ❌ なし      | ✓ ある               |
|  2 | [`launcher/mod.rs:172`](../../../src-tauri/src/launcher/mod.rs) `launch_exe_args`                                      | `target` (legacy `default_app`)             | `spawn`             | `try_spawn_cmd` | ❌ なし      | ✓ ある               |
|  3 | [`launcher/mod.rs:189`](../../../src-tauri/src/launcher/mod.rs) `launch_url`                                           | 固定 `"explorer.exe"`                       | `spawn`             | `try_spawn_cmd` | n/a (system) | ✓ ある               |
|  4 | [`launcher/mod.rs:200`](../../../src-tauri/src/launcher/mod.rs) `launch_folder`                                        | 固定 `"explorer.exe"`                       | `spawn`             | `try_spawn_cmd` | n/a (system) | ✓ ある               |
|  5 | [`launcher/mod.rs:240`](../../../src-tauri/src/launcher/mod.rs) `launch_script` (ps1)                                  | 固定 `"powershell"`                         | `spawn`             | `try_spawn_cmd` | n/a (system) | ✓ ある               |
|  6 | [`launcher/mod.rs:246`](../../../src-tauri/src/launcher/mod.rs) `launch_script` (bat/cmd)                              | 固定 `"cmd"`                                | `spawn`             | `try_spawn_cmd` | n/a (system) | ✓ ある               |
|  7 | [`launcher/mod.rs:271`](../../../src-tauri/src/launcher/mod.rs) `launch_command`                                       | parsed token\[0\] (user 入力)               | `spawn`             | `try_spawn_cmd` | ❌ なし      | ✓ ある               |
|  8 | [`launcher/mod.rs:301`](../../../src-tauri/src/launcher/mod.rs) `launch_argv`                                          | resolved (PATHEXT 適用後)                   | `spawn`             | `try_spawn_cmd` | ✓ あり       | ✓ ある               |
|  9 | [`launcher/mod.rs:389`](../../../src-tauri/src/launcher/mod.rs) `launch_terminal_in_dir`                               | `program` 引数 (caller 固定値)              | `spawn`             | `try_spawn_cmd` | n/a (system) | ✓ ある               |
| 10 | [`commands/launch_commands.rs:72`](../../../src-tauri/src/commands/launch_commands.rs) `cmd_reveal_in_explorer` (dir)  | 固定 `"explorer.exe"`                       | `spawn` 直          | ❌ bypass       | n/a (system) | ❌ blind             |
| 11 | [`commands/launch_commands.rs:74`](../../../src-tauri/src/commands/launch_commands.rs) `cmd_reveal_in_explorer` (file) | 固定 `"explorer.exe"`                       | `spawn` 直          | ❌ bypass       | n/a (system) | ❌ blind             |
| 12 | [`services/script_runner_service.rs:182`](../../../src-tauri/src/services/script_runner_service.rs) `run_script`       | `interp[0]` (`node` / `python` / `bash` 等) | `spawn` 直          | ❌ bypass       | ❌ なし      | ❌ blind             |
| 13 | [`utils/git.rs:11`](../../../src-tauri/src/utils/git.rs) `git_cmd()`                                                   | 固定 `"git"`                                | `output()` (8 箇所) | ❌ bypass       | ❌ なし      | ❌ blind (read-only) |
| 14 | [`utils/icon.rs:38`](../../../src-tauri/src/utils/icon.rs) `extract_icon_from_exe`                                     | 固定 `"powershell"`                         | `output()` 直       | ❌ bypass       | n/a (system) | ❌ blind (read-only) |

`tauri_plugin_updater` / `tauri_plugin_shell` は外部 crate 内で spawn するため本 audit の範囲外
(frontend からは `@tauri-apps/plugin-shell` は import しておらず、 capabilities 上は
`shell:allow-open` 許可だけが残存 — 使用箇所は 0)。

---

## 2. PATHEXT 解決の漏れ判定 (用途別に再評価)

|  # | 経路                                            | 入力源                                                                                                           | bare name (`code`) が来る現実シナリオ                                                                                                                                                                        | PATHEXT 漏れの実害                                                             |
| -: | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
|  1 | `launch_exe` (`ItemType::Exe`)                  | `item.target` (DB)                                                                                               | ⚠ 低: file picker 登録は絶対 path だが、 import JSON / 手入力で `"code"` が混入可能                                                                                                                          | spawn `NotFound` (=⑨ と同型)                                                   |
|  2 | `launch_exe_args` (folder legacy `default_app`) | `item.default_app` (DB legacy 値)                                                                                | ⚠ 中: PR #578 以前 (opener registry 化前) に登録された folder item が `default_app = "code"` を持つ可能性。 また`normalize_legacy_default_app` を通っても `builtin:` / `user:` でない既定 path は ここに来る | spawn `NotFound` (=⑨ と同型)、 Explorer fallback も無い                        |
|  7 | `launch_command` (`ItemType::Command`)          | user-typed コマンド文字列                                                                                        | 🔴 高: `pnpm install` / `code .` / `tsc --watch` / `cargo run` 等は日常運用の典型                                                                                                                            | spawn `NotFound` で Command item 全般が壊れる                                  |
| 12 | `run_script` (script-folder widget)             | 拡張子 → 固定 interpreter table (`node` / `python` / `bash` / `ruby` / `perl` / `lua` / `wscript` / `osascript`) | 🔴 高: Volta / fnm / nvm-windows は `node.cmd` / `npm.cmd` を install。 rbenv-for-windows / chocolatey 系も同様。 Git Bash の `bash.exe` は実体だが PATH 配置による。                                        | スクリプト監視 widget が `.js`/`.ts`/`.sh`/`.rb` を全く実行できない (⑨ の再現) |

`#3` `#4` `#5` `#6` `#9` `#10` `#11` `#13` `#14` は固定 system command (`explorer.exe` /
`cmd` / `powershell` / `git`) なので PATHEXT 漏れは事実上発生しない (これらは System32
配下の `.exe` で `Command::new("cmd")` が `cmd.exe` を見つける Windows 標準挙動)。

---

## 3. e2e seam の blind spot (`try_spawn_cmd` を通らない spawn)

PR #579 で導入した build-flag シーム (`cargo build --features test-launch-seam` +
`ARCAGATE_TEST_LAUNCH_SEAM_LOG`) は `try_spawn_cmd` を通る spawn のみ JSON 行を log file に
append する。 以下の 4 系統は **シームに記録されない** ため、 後続 e2e で cascade verify を
書こうとしても駆動できない (= ⑨ と同型の 「test pass / 実機 broken」 を許す穴):

- `cmd_reveal_in_explorer` (右クリック「Explorer で開く」、 launch_commands.rs:72/74)
- `cmd_run_script` (スクリプト監視 widget の launch、 script_runner_service.rs:191)
- `cmd_git_statuses_batch` (Projects widget の git 状態取得、 git.rs:30/116/121/126/140/147/164/182/221)
- `extract_icon_from_exe` (icon キャッシュ生成、 icon.rs:40)

`git` / `extract_icon` は read-only operation で **「起動した・しなかった」 が user 体験に
直結しない**ため、 e2e cascade verify の対象外でも実害は低い。 一方、 `cmd_reveal_in_explorer`
と `cmd_run_script` は **user の launch アクション**であり、 ⑨ と同レベルの 「click → 実 spawn」
cascade を機械検証する将来 spec を書く際に blind spot になる。

---

## 4. 既存 OK / 念のため (false-positive)

- `opener_service::launch_with` (opener_service.rs:71-87): builtin (`explorer` / `cmd` /
  `powershell`) は `launch_folder` / `launch_terminal_in_dir` に振り分け、 それ以外は
  `launch_argv` (= PATHEXT 解決済) を呼ぶ。 **OK**。
- 旧 `cmd_register_exe_item` (PR #572 で撤廃): inventory 0 件、 確認済。

---

## 5. 横展開案 (実装しない、 cost 感の見積もりのみ)

### 5.1 共通化ヘルパー案

```rs
// launcher/mod.rs に追加
pub fn resolved_command(program: &str) -> Result<Command, AppError> {
    let resolved: PathBuf = if cfg!(target_os = "windows") {
        resolve_program_with_pathext(program)
            .ok_or_else(|| AppError::LaunchOpenerNotFound(program.to_string()))?
    } else {
        PathBuf::from(program)
    };
    Ok(Command::new(&resolved))
}
```

これを使えば、 各 spawn 点を以下のように書き換えるだけで PATHEXT 漏れを構造的に塞げる:

```rs
// Before
let mut cmd = Command::new(target);
// ... args / cwd ...
try_spawn_cmd(&mut cmd, "exe")

// After
let mut cmd = launcher::resolved_command(target)?;
// ... args / cwd ...
try_spawn_cmd(&mut cmd, "exe")
```

### 5.2 影響範囲 (差分の bigness 見積もり)

| 位置                                      | 必要な書き換え                                                                                                                                                | 行数感                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `launcher/mod.rs:152` (`launch_exe`)      | `Command::new(target)` → `resolved_command(target)?`                                                                                                          | ~1 行                                  |
| `launcher/mod.rs:172` (`launch_exe_args`) | 同上                                                                                                                                                          | ~1 行                                  |
| `launcher/mod.rs:271` (`launch_command`)  | `Command::new(&program)` → `resolved_command(&program)?`                                                                                                      | ~1 行                                  |
| `script_runner_service.rs:182,191`        | `Command::new(interp[0])` → `launcher::resolved_command(interp[0])?` + 末尾の `.spawn()` 直呼びを `launcher::try_spawn_cmd(&mut cmd, "script_runner")` に置換 | ~3 行                                  |
| `commands/launch_commands.rs:72,74`       | `Command::new("explorer.exe").spawn()` を `launcher::launch_folder` / 新規 `launcher::reveal_in_explorer` (file 版) 経由に集約                                | ~10 行 (新 helper を 1 つ用意するなら) |
| `utils/git.rs` (`git_cmd`)                | 任意。 PATHEXT 漏れの実害が事実上ない (git.exe は native) + `output()` で blocking なので、 e2e seam に乗せるメリットも薄い                                   | (見送り推奨)                           |
| `utils/icon.rs:38`                        | 同上 (`powershell` は system path)                                                                                                                            | (見送り推奨)                           |

合計影響範囲: **3 file (~5-15 行)** で PATHEXT 漏れを完全に塞げる + e2e seam blind spot を
script_runner / reveal-in-explorer まで広げられる。 既存 unit test (`test_launch_command_*`、
`resolve_program_with_pathext_*`) と互換、 追加 spec は `cmd_reveal_in_explorer` /
`cmd_run_script` の seam log driven cascade verify (LB-2 / ⑨ と同 pattern) を別 PR で追加可能。

### 5.3 段階移行可否

- **段階 1**: `resolved_command` helper を追加して `launcher/mod.rs` 内 3 関数 (#1 / #2 / #7)
  を移行 → daily-use の Command item / folder legacy default_app / Exe bare name の即時修正。
- **段階 2**: `script_runner_service::run_script` を `launcher::try_spawn_cmd` + `resolved_command`
  経由に refactor → スクリプト監視 widget の `.js` / `.ts` / `.sh` 起動を修正。
- **段階 3**: `cmd_reveal_in_explorer` を `launcher::reveal_in_explorer(path)` 経由に集約 →
  cascade e2e で右クリック「Explorer で開く」 までカバー。

`do_it_now_philosophy.md` 原則上、 段階 1〜3 は **同 PR で全部やる**のが正。 段階分割は本 audit
の見積もりとしての言及のみで、 実装方針として推奨はしない。

---

## 6. 機械検出 audit 案

### 6.1 検出ロジック (bash + ripgrep / grep)

```bash
# scripts/audit-launcher-spawn-leak.sh (案、 未実装)
set -euo pipefail

# allowlist:
#   - launcher/mod.rs は集約点なので除外
#   - 固定 system command (実在パスが System32 等にあり、 PATHEXT 漏れの実害なし)
ALLOWED='"explorer.exe"\|"cmd"\|"powershell"\|"git"\|"pwsh"'

# Command::new(<X>) の出現を src-tauri/src 配下 (launcher を除く) で検出。
LEAKS=$(
  grep -rnE 'Command::new\(' src-tauri/src \
    --include='*.rs' \
    --exclude='launcher/mod.rs' \
    | grep -vE "Command::new\\((${ALLOWED})" || true
)

if [ -n "$LEAKS" ]; then
  echo "ERROR: launcher/mod.rs 外で Command::new(<可変 program>) が直接呼ばれています:"
  echo "$LEAKS"
  echo "  → launcher::resolved_command(program) + launcher::try_spawn_cmd(&mut cmd, what) 経由に集約してください"
  echo "  → 固定 system command (cmd / powershell / explorer.exe / git / pwsh) のみ allowlist で除外可"
  exit 1
fi

# .spawn() 直呼びの検出 (try_spawn_cmd を通っているか)
SPAWN_LEAKS=$(
  grep -rnE '\.spawn\(\)' src-tauri/src \
    --include='*.rs' \
    --exclude='launcher/mod.rs' \
    || true
)
if [ -n "$SPAWN_LEAKS" ]; then
  echo "ERROR: launcher/mod.rs 外で .spawn() が直接呼ばれています (e2e seam を通らない):"
  echo "$SPAWN_LEAKS"
  echo "  → launcher::try_spawn_cmd(&mut cmd, what) 経由に集約してください"
  exit 1
fi

echo "✓ audit-launcher-spawn-leak: launcher/mod.rs 外の spawn 直呼びなし"
```

### 6.2 allowlist の妥当性

- `cmd` / `powershell`: Windows System32 配下にある stub (`cmd.exe` / `powershell.exe`)。
  `Command::new("cmd")` は OS の `CreateProcessW` が自動で `.exe` を補完するため PATHEXT
  問題は発生しない (これは Rust std の `code.cmd` 問題とは別の挙動: Windows API レベルで
  既知のシステムコマンドは PATHEXT 適用なしで解決される)。
- `explorer.exe`: 拡張子明示済なので PATHEXT 不要、 PATH 解決も Windows ディレクトリで完結。
- `git`: Git for Windows は `git.exe` を `C:\Program Files\Git\bin` 等に install。 Scoop の
  shim 経路 (`git.cmd`) で運用する user がいる可能性は理論上ある (実害は read-only operation の
  ProjectsWidget のみ)。
- `pwsh`: PowerShell 7+ の bin。 `git` 同様 native `.exe`、 まず実害なし。

allowlist 文字列は **直接 literal** (`Command::new("cmd")`) を想定。 変数 (`Command::new(&prog)`)
は allowlist を抜けるため audit fail。 これにより 「将来 `program` を変数化したら audit が
catch する」 fail-closed 設計になる。

### 6.3 gate に乗せる場所

- `lefthook.yml` の pre-commit (Rust file 変更時のみ実行)
- `package.json` の `pnpm audit:all` に追加 (CI で必ず実行)

`scripts/audit-*` の既存パターンに沿った placement で導入コストは 0 に近い。

---

## 7. 結論 / 推奨

### (a) 横展開済み / 共通化済みか

**部分的に共通化済み、 重要 path が漏れている**。 `try_spawn_cmd` (e2e seam) は launcher の 8
関数を集約しているが、 `resolve_program_with_pathext` は `launch_argv` 1 関数のみ。 `launch_exe`
/ `launch_exe_args` / `launch_command` / `script_runner::run_script` は PATHEXT 解決を
受けず、 ⑨ (`code.cmd` shim) と同型の bug が異なる経路で再発する状態。

### (b) bypass している spawn 箇所のリスト

**PATHEXT 解決を受けない (= `code.cmd` 問題が再発しうる) spawn**:

| 位置                                                  | 経路                                            | 実害シナリオ                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/launcher/mod.rs:152`                   | `launch_exe` (`ItemType::Exe`)                  | Exe item の `target` が bare name (例: `"code"`、 import 経由) で spawn 失敗                                                                                |
| `src-tauri/src/launcher/mod.rs:172`                   | `launch_exe_args` (folder legacy `default_app`) | folder item の `default_app = "code"` (PR #578 以前の登録) で spawn 失敗                                                                                    |
| `src-tauri/src/launcher/mod.rs:271`                   | `launch_command` (`ItemType::Command`)          | Command item に `pnpm install` / `code .` / `tsc --watch` を保存 → 第 1 token が `.cmd` shim で spawn 失敗                                                  |
| `src-tauri/src/services/script_runner_service.rs:182` | `run_script` (スクリプト監視)                   | `.js` / `.ts` / `.sh` / `.rb` 等を実行する interpreter (`node` / `python` / `bash` / `ruby`) が `.cmd` shim (Volta / fnm / Git Bash 等) のとき全 spawn 失敗 |

**e2e seam (`try_spawn_cmd`) を経由しない spawn (cascade verify の blind spot)**:

| 位置                                                  | 経路                            | blind spot の影響                                                     |
| ----------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `src-tauri/src/commands/launch_commands.rs:72,74`     | `cmd_reveal_in_explorer`        | 右クリック「Explorer で開く」 cascade を後続 e2e で機械検証できない   |
| `src-tauri/src/services/script_runner_service.rs:191` | `run_script` (`.spawn()` 直)    | スクリプト監視 widget の launch cascade を後続 e2e で機械検証できない |
| `src-tauri/src/utils/git.rs:11` (`git_cmd`)           | Projects widget の git 状態取得 | read-only / 影響低 (cascade 対象外)                                   |
| `src-tauri/src/utils/icon.rs:38`                      | icon キャッシュ生成             | read-only / 影響低 (cascade 対象外)                                   |

### (c) 共通化案 (要約)

1. `launcher::resolved_command(program: &str) -> Result<Command, AppError>` を 1 関数追加し、
   `Command::new(<変数>)` を呼ぶ launcher 内 3 関数 + `script_runner` を全て本 helper 経由に。
2. `script_runner::run_script` / `cmd_reveal_in_explorer` の `.spawn()` 直呼びを
   `launcher::try_spawn_cmd` 経由に書換 (e2e seam を script_runner / reveal-in-explorer まで広げる)。
3. 影響範囲は **3 file (~5-15 行)** で完了。 既存 unit test と互換。

### (d) audit 案 (要約)

- `scripts/audit-launcher-spawn-leak.sh` (新規) で `Command::new(<可変 program>)` を `launcher/mod.rs`
  以外で検出 → 固定 system command (`cmd` / `powershell` / `explorer.exe` / `git` / `pwsh`) のみ
  literal allowlist で除外 → 残った spawn を fail-closed で gate。
- 同 script で `.spawn()` 直呼びも `launcher/mod.rs` 以外で禁止 (e2e seam blind spot を防ぐ)。
- `lefthook.yml` pre-commit + `pnpm audit:all` の 2 段 gate。 導入コスト 0 に近い。

---

## 引用元 / 関連 doc

- `docs/l3_phases/audit/CODEX_LIBRARY_ICON_REFRESH_FOLLOWUP_2026-05-25.md` (構造保証を sub leaf に
  局所化する設計原則)
- `docs/l2_foundation/lessons.md` (横展開 sweep / 1 fix → 全箇所 audit 原則)
- `memory/feedback_horizontal_application.md` (2026-05-13 user 確定の横展開 sweep ルール)
- PR #579 (`2968a44c`): `launcher::launch_argv` への `resolve_program_with_pathext` 投入 +
  `try_spawn_cmd` シーム集約。
- PR #578: folder opener cascade、 `default_app` legacy 値の opener registry 移行。
