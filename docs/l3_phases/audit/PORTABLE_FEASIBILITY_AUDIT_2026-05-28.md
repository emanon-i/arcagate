# Portable 化 機能的フィージビリティ audit (2026-05-28)

## 結論先出し: **一部成立しない (= grey)、 「ほぼ portable」 が現実解**

- **OS 管理領域への暗黙書き込み** (= `%LOCALAPPDATA%\Microsoft\EdgeWebView\` の Evergreen
  runtime + Crashpad) は **redirect 不可**。 これは Arcagate が touch しないが、 WebView2 を
  使う以上 Windows 側で必ず存在する。
- **自動更新 + bundle id ベースの single-instance** が portable 配布と本質的に相性が悪い。
  「portable mode = updater 無効 + identifier に exe path hash を append」 で回避は可能だが、
  通常 installer 版と portable 版の **分岐実装** が要る。
- 上記 2 点を除けば、 Arcagate 側の write 先 (DB / log / icons / wallpapers / image-scraps /
  WebView2 UDF) は **全て `<exe_dir>/data/` に redirect 可能**。 個人情報 (user 名混入 path)
  も 99% 解消できる。
- 「個人フォルダ名が path に出ない / リネーム時の migration ゼロ」 という当初の動機は、
  「**`%APPDATA%` 配下 `app_data_dir()` を全部 portable 経由に差し替える + redact_for_display
  helper 併用**」 で目的達成可能。 USB / Dropbox 配布の利便性 (副次的) は単独 PC なら OK、
  cloud sync 配下は SQLite WAL 警告必須。

---

## A. 現状の外部書き込み箇所 全列挙

### A.1 直接 file system に書く経路

| #  | 用途                                     | path resolver                                                                           | 解決現 path (典型)                                               | file:line                                                                                                                                     |
| -- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | DB (`arcagate.db` + WAL/SHM)             | `app.path().app_data_dir().join("arcagate.db")` (env `ARCAGATE_DB_PATH` で override 可) | `%APPDATA%\com.arcagate.desktop\arcagate.db`                     | `src-tauri/src/lib.rs:159-194`                                                                                                                |
| 2  | corrupted DB 退避 (`.corrupted-<ts>`)    | `path.with_file_name(...)` 同 dir                                                       | `%APPDATA%\com.arcagate.desktop\arcagate.db.corrupted-<unix_ts>` | `src-tauri/src/db/mod.rs:122-160`                                                                                                             |
| 3  | tauri-plugin-log log file                | `TargetKind::LogDir { file_name: Some("arcagate".into()) }` (= `app_log_dir()` 配下)    | `%LOCALAPPDATA%\com.arcagate.desktop\logs\arcagate.log[.0-6]`    | `src-tauri/src/lib.rs:124-128, 148-155`                                                                                                       |
| 4  | panic_hook crash dialog の log path 表示 | `app.path().app_log_dir()`                                                              | 上記と同じ (UI 表示のみ、 書き込み path ではない)                | `src-tauri/src/panic_hook.rs:86-90`                                                                                                           |
| 5  | item icon cache (extract / copy)         | `app_data_dir.join("icons")`                                                            | `%APPDATA%\com.arcagate.desktop\icons\<uuid>.<ext>`              | `src-tauri/src/services/item_service.rs:855-934`、 `src-tauri/src/commands/item_commands.rs:259-285`                                          |
| 6  | wallpaper file copy                      | `app_data_dir.join("wallpapers")`                                                       | `%APPDATA%\com.arcagate.desktop\wallpapers\<uuid>.<ext>`         | `src-tauri/src/services/wallpaper_service.rs:49-59`、 `src-tauri/src/commands/workspace_commands.rs:170-185`                                  |
| 7  | image-scrap file copy                    | `app_data_dir.join("image-scraps")`                                                     | `%APPDATA%\com.arcagate.desktop\image-scraps\<uuid>.<ext>`       | `src-tauri/src/services/image_scrap_service.rs:18-40`、 `src-tauri/src/commands/image_scrap_commands.rs:14-19`                                |
| 8  | (e2e seam only) launch log               | env `ARCAGATE_TEST_LAUNCH_SEAM_LOG` 直指定 (feature `test-launch-seam`)                 | release では compile-out。 dev / e2e のみ                        | `src-tauri/src/launcher/mod.rs:61-68`                                                                                                         |
| 9  | (test only) temp dir                     | `std::env::temp_dir()` (Rust 標準)                                                      | `%TEMP%\arcagate-*` (各 unit test ローカル)                      | `src-tauri/src/{db/mod.rs,launcher/mod.rs,utils/git.rs,services/file_preview_service.rs,services/exe_scanner_service.rs}` 配下 `#[cfg(test)]` |
| 10 | (dev binary only) seed_dev               | env `APPDATA` 直読                                                                      | `%APPDATA%\com.arcagate.desktop\arcagate.db`                     | `src-tauri/examples/seed_dev.rs:15-26`                                                                                                        |
| 11 | (dev binary only) arcagate_cli           | env `APPDATA` 直読                                                                      | 同上                                                             | `src-tauri/src/bin/arcagate_cli.rs:285-288`                                                                                                   |
| 12 | export_service                           | `fs::write(output_path, json)` (= user 指定 path)                                       | user dialog で選んだ任意 path                                    | `src-tauri/src/services/export_service.rs:64`                                                                                                 |

### A.2 DB 内に永続化される設定 / state (file system ではないが永続)

| #  | 内容                                                                       | 場所                                            |
| -- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| 13 | config (hotkey, theme, autostart, locale, setup flag 等)                   | `config` テーブル (`%APPDATA%\.../arcagate.db`) |
| 14 | exe_scan_cache JSON                                                        | `exe_scan_cache` テーブル (同上)                |
| 15 | items / tags / workspaces / widgets / launch_log / item_stats / icon_cache | 同 DB                                           |

### A.3 暗黙の write 先 (Arcagate コードでは制御していない)

| #  | 内容                                  | 現在の path                                                                                     | 制御性                                                                       |
| -- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 16 | WebView2 user data folder (UDF)       | `%LOCALAPPDATA%\com.arcagate.desktop\EBWebView\` (Tauri が自前で identifier 下に作る)           | env `WEBVIEW2_USER_DATA_FOLDER` + `additional_browser_args` で override 可能 |
| 17 | WebView2 Evergreen runtime + Crashpad | `%LOCALAPPDATA%\Microsoft\EdgeWebView\Application\<ver>\` + `Crashpad\`                         | **redirect 不可** (OS / runtime 管理)                                        |
| 18 | tauri-plugin-updater download         | `tempfile` 経由 = `std::env::temp_dir()` = `%TEMP%`                                             | env `TEMP`/`TMP` を起動時書き換えで redirect 可能 (副作用注意)               |
| 19 | tauri-plugin-autostart レジストリ     | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` (enable 時のみ)                            | user 操作で enable した時だけ書く                                            |
| 20 | NSIS / MSI installer uninstall info   | `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\<id>` (installer 経由 install 時のみ) | portable zip 配布なら書かれない                                              |
| 21 | Tauri resource extraction             | 通常は exe 内埋め込みで tmp に出さない。 sidecar 使用時のみ展開                                 | arcagate は sidecar 不使用なので **書かない**                                |

### A.4 frontend localStorage prefix (file system ではないが、 ブラウザの IndexedDB / LocalStorage に書かれる = WebView2 UDF 配下)

`arcagate.app.activeView` / `arcagate.locale` / `arcagate.test.force_locale` / `arcagate.theme.active` / `arcagate.widget.*` / `arcagate.workspace.*` — **WebView2 UDF (`#16`) 配下に Chromium 標準で永続化**。 UDF を redirect すれば連動。

---

## B. portable 化したときの機能的影響 (1 個ずつ判定)

| #                              | 用途                         | 判定              | 理由 / 必要な追加実装                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                              | DB (.db / .db-wal / .db-shm) | **OK**            | `app_data_dir()` 呼び出し 6 箇所 (lib.rs / commands x3 / services x2) を portable resolver に差し替えるだけ。 WAL は同 dir に置かれるので追従。 USB は OK、 cloud sync は警告必須 (§D-5)                                                                                                                                                                      |
| 2                              | corrupted DB 退避            | **OK**            | DB と同 dir に置く設計 (`db/mod.rs:122-160`) なので #1 と連動                                                                                                                                                                                                                                                                                                 |
| 3                              | log file                     | **OK**            | `tauri-plugin-log` の `TargetKind::Folder { path: ..., file_name: ... }` を使えば任意 dir 可能 (現在の `TargetKind::LogDir` は `app_log_dir()` 固定)。 lib.rs:124-128 を書き換える                                                                                                                                                                            |
| 4                              | panic_hook 表示              | OK                | 表示のみ (`app_log_dir()` を `redact_for_display()` 経由にすれば個人名も消える、 §C 既存 audit `DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md` 参照)                                                                                                                                                                                                            |
| 5                              | item icons                   | OK                | `app_data_dir().join("icons")` を portable resolver の `.join("icons")` に差し替え。 6 箇所 (service x2 + commands x2 + lib.rs setup の asset scope x1 + db 内 cache key 等)                                                                                                                                                                                  |
| 6                              | wallpapers                   | OK                | 同上 (`wallpapers` subdir)                                                                                                                                                                                                                                                                                                                                    |
| 7                              | image-scraps                 | OK                | 同上 (`image-scraps` subdir)                                                                                                                                                                                                                                                                                                                                  |
| 8                              | (e2e) launch seam            | OK                | env で path 指定済、 portable 関係なし                                                                                                                                                                                                                                                                                                                        |
| 9                              | (test) temp_dir              | OK                | `#[cfg(test)]` のみ、 portable 関係なし                                                                                                                                                                                                                                                                                                                       |
| 10                             | seed_dev                     | OK                | dev binary、 env 直読を `<exe_dir>/data/` に書き換えるだけ                                                                                                                                                                                                                                                                                                    |
| 11                             | arcagate_cli                 | OK                | 同上                                                                                                                                                                                                                                                                                                                                                          |
| 12                             | export                       | OK                | user 指定 path、 portable 関係なし                                                                                                                                                                                                                                                                                                                            |
| 13-15                          | DB 内永続化                  | OK                | DB が portable に移れば連動                                                                                                                                                                                                                                                                                                                                   |
| 16                             | WebView2 UDF                 | **要工夫**        | env `WEBVIEW2_USER_DATA_FOLDER` を **`tauri::Builder::default()` より前** に `std::env::set_var` + windowBuilder の `additional_browser_args(["--user-data-dir=..."])` で **二重保険**。 設定漏れ時は `%LOCALAPPDATA%\<identifier>\EBWebView\` に fallback (= 個人名混入)。 [tauri-apps/tauri#11144](https://github.com/tauri-apps/tauri/issues/11144) も参照 |
| 17                             | WebView2 runtime + Crashpad  | **NG (回避不能)** | `%LOCALAPPDATA%\Microsoft\EdgeWebView\` は OS 管理、 redirect 不可。 fixed-version WebView2 runtime を bundle すれば回避可能だが配布サイズ +250MB。 但し ここに書かれるのは個人名を含まない (`%LOCALAPPDATA%` の Microsoft\EdgeWebView 部分は user 識別子なし)                                                                                                |
| 18                             | updater download (`%TEMP%`)  | **要工夫**        | env `TEMP` / `TMP` を `<exe_dir>/data/tmp/` に書き換える方法はあるが、 副作用 (WebView2 process 自身も TEMP を使う) があるので大きい。 **portable mode では updater 無効化 (`updater.active=false`) が現実解** (§B-A)                                                                                                                                         |
| 19                             | autostart registry           | **要判断**        | HKCU\Run に exe absolute path を書く (admin 不要)。 user が明示 enable した時のみ。 portable 純度を最優先するなら autostart 機能ごと除外、 妥協 ライン として「user が enable する時のみ HKCU 書き込み」 を許す                                                                                                                                               |
| 20                             | installer uninstall key      | OK                | portable zip 配布なら installer を経由しないので書かれない                                                                                                                                                                                                                                                                                                    |
| 21                             | sidecar extraction           | OK                | 不使用                                                                                                                                                                                                                                                                                                                                                        |
| `tauri-plugin-single-instance` | (現状未導入)                 | **要判断**        | Tauri default は multi-instance 起動可能だが WebView2 UDF lock 競合で実害。 portable 化と同時に plugin 導入推奨、 ただし `bundle.identifier` ベースなので USB + 内蔵 disk 同居時に互いを「同一 instance」 と誤判定。 identifier に exe path hash を suffix する patch で「同一 exe path のみ single」 にできる                                                |
| `tauri-plugin-global-shortcut` | (使用中)                     | OK                | OS API (RegisterHotKey) process-scoped、 portable 関係なし                                                                                                                                                                                                                                                                                                    |
| SmartScreen / Defender         | -                            | OK                | exe hash + 署名 cert reputation で判定、 install 場所非依存。 portable zip 配布でも署名済 + reputation 蓄積されれば同じ動作 (EV cert なら即時 pass、 OV cert なら数百 install 必要)                                                                                                                                                                           |

### B-A. 詰めた話: tauri-plugin-updater

NSIS / MSI installer は **元の install 先を registry から読んで上書き** するため、 portable
で exe を任意 dir に置いた状態で updater を走らせると **installer が「registry の install 先」
に書き、 user の portable exe は更新されない** (もしくは別 path に重複インストール)。

選択肢:

1. **portable では updater 無効化** (`tauri.conf.json > plugins.updater.active = false`、 portable
   profile 専用 conf)、 user が手動で zip 再 download → 上書き
2. **portable 用の独自 updater 実装** (zip 再 download → 別 dir 展開 → bootstrap exe で旧 dir
   退避 → rename → exec) — 実装コスト中、 Squirrel.Windows 流
3. **portable 配布をやめて installer (NSIS perUser) 配布のみ + `installMode: "perUser"`** —
   installer は user の選択 dir に展開可、 updater は機能、 ただし「portable」 ではなくなる

「USB 配布」 を真に satisfy するなら (1)、 user 数が少ない (自分 + α) ことから保守コスト最小の
(1) + (3) の組合せが妥当。

### B-B. 詰めた話: tauri-plugin-autostart

Windows 実装は **`auto_launch` crate** 経由で **HKCU\Software\Microsoft\Windows\CurrentVersion\Run** に
exe absolute path + (optional) args を書くだけ。

- portable で `D:\Tools\Arcagate\arcagate.exe` を登録した場合、 **path に user 名は含まれない** ので
  個人情報 leak 上 OK。
- ただし「user 領域 (registry) に何も書かない」 ことを portable 純度の定義とするなら、 autostart は
  許容外。 「user が明示 enable した時だけ HKCU\Run に書く」 が落としどころ。
- portable 配布で exe path を移動した user は registry entry が孤児化する → **起動時に
  `current_exe()` と registry 値の path mismatch を検出 → 自動再登録 or 削除** のロジックを
  追加すれば自己修復可能 (~50 LOC)。

### B-C. 詰めた話: tauri-plugin-single-instance

現状 **未導入** (Cargo.toml に未記載)。 Tauri v2 default は multi-instance 起動を許容するため、
**user が誤って 2 度起動した時に WebView2 UDF lock で失敗する** 既存リスクが portable 化と
無関係に存在する (実害は WebView2 が「Profile in use by another process」 のエラー)。 portable
化と同時に plugin を導入し、 identifier を `${bundle.identifier}-${exe_path_hash}` 等にすれば
USB + 内蔵 disk co-install 時の予期せぬ前面化を回避できる。

### B-D. 詰めた話: SQLite WAL on portable storage

- **同 dir 配置必須**: `.db-wal` / `.db-shm` は SQLite が同 dir に作る (path override 不可)。
  `<exe_dir>/data/` が write 可能なら OK。
- **USB drive (NTFS / exFAT) 単独 PC 使用**: WAL OK。 ただし USB 抜去中の write は corruption
  リスク (`sqlite.org/howtocorrupt.html`)。
- **network drive (SMB / NFS)**: WAL **使用禁止** ([sqlite.org/useovernet.html](https://sqlite.org/useovernet.html))。
  advisory lock が不完全。
- **OneDrive / Dropbox / Google Drive 配下**: **避けるべき**。 cloud sync が `.db-wal` を他 PC
  に push して file lock を破る → corruption。
- 推奨: 起動時に DB path が `OneDrive` / `Dropbox` / `Google Drive` / `Box` 等を含むか文字列
  check し、 warning dialog を出す。 検出時は WAL → DELETE journal_mode に fallback する option
  も提供 (パフォーマンス低下と引き換えに安全)。

### B-E. 詰めた話: WebView2 UDF

[Microsoft 公式 doc](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder) と
[tauri-apps/tauri#11144](https://github.com/tauri-apps/tauri/issues/11144) によると:

- Tauri は自前で `userDataFolder` を `ICoreWebView2Environment` に渡している (= identifier 下)
- env `WEBVIEW2_USER_DATA_FOLDER` を尊重するかは Tauri version 依存。 安全策は **両方** 設定する:
  ```rust
  // main 冒頭で env を set (Tauri::Builder 構築前必須)
  std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", &udf_path);
  // window builder で additional_browser_args
  .additional_browser_args(format!("--user-data-dir={}", udf_path.display()))
  ```
- WebView2 runtime 自身 (`%LOCALAPPDATA%\Microsoft\EdgeWebView\Application\`) は OS 管理、 redirect
  不可。

---

## C. Tauri / プラグインが暗黙的に書く場所 (#A.3 と重複だが redirect 不可リスト)

| 場所                                                      | redirect 可?        | 個人名混入?                                       |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------- |
| `%LOCALAPPDATA%\Microsoft\EdgeWebView\Application\<ver>\` | **不可**            | NO                                                |
| `%LOCALAPPDATA%\Microsoft\EdgeWebView\Crashpad\`          | **不可**            | NO                                                |
| `%LOCALAPPDATA%\Microsoft\EdgeWebView\` 配下の cache      | **不可**            | NO                                                |
| WebView2 UDF (default: `%LOCALAPPDATA%\<id>\EBWebView\`)  | 可 (B-E)            | YES (= `<id>` に user dir 経由)。 redirect で解消 |
| `%TEMP%` (updater / wry 内部)                             | 部分的可 (env TEMP) | YES (`%LOCALAPPDATA%\Temp` に user 名混入)        |
| HKCU\Run (autostart enable 時)                            | n/a                 | NO (registry 値の exe path 次第)                  |
| HKCU\...\Uninstall (installer 経由 install 時のみ)        | n/a                 | NO                                                |

**「個人名混入 = NO」 の grey 領域**: WebView2 runtime / Crashpad / `%LOCALAPPDATA%\Microsoft\EdgeWebView\`
の path は `%LOCALAPPDATA%` 部分が `C:\Users\<user>\AppData\Local\` に展開されるが、 これは
Arcagate が書いている path ではなく Windows が WebView2 を install した場所。 user が screenshot
を共有する時に Windows 自身の path を見せる訳ではないので、 individual leak 経路としては優先度
低。

---

## D. install 場所の制約

| 場所                                               | 動くか          | 書き込み権限 | 副作用                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `C:\Program Files\Arcagate\`                    | **動かない**    | admin 必要   | 標準 user は exe 自身を上書きできない (updater fail) + `<exe_dir>/data/` に書けない → portable layout 自体が機能しない。 install 場所として **不適**                                                           |
| 2. `%USERPROFILE%\Apps\Arcagate\`                  | **動く**        | user 権限    | path に user 名混入 (例: `C:\Users\<個人名>\Apps\Arcagate\data\`)。 portable の目的「個人名を path に出さない」 と衝突                                                                                         |
| 3. `D:\Tools\Arcagate\`                            | **動く** (推奨) | user 権限    | 個人名混入なし。 user の typical 配置パターン                                                                                                                                                                  |
| 4. ネットワーク drive (`\\server\share\Arcagate\`) | 動くが NG       | server 依存  | **WAL 使用禁止**、 SMB advisory lock 不完全。 SQLite corruption リスク高。 推奨しない                                                                                                                          |
| 5. USB drive (NTFS / exFAT)                        | **動く**        | user 権限    | 単独 PC 使用なら OK。 抜去タイミングが悪いと WAL 不整合 → 起動次回に DB recovery trigger (現状 false positive で healthy DB を destroy する既知 bug あり、 `DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md` 参照) |
| 6. OneDrive / Dropbox / Google Drive 配下          | 動くが NG       | user 権限    | **SQLite corruption リスク (sqlite.org 公式に警告)**。 cloud sync が `.db-wal` を別 PC に push して lock を破る。 起動時 path check で warning dialog 必須                                                     |

**install 場所として推奨**: (3) `D:\Tools\Arcagate\` 系 (= 個人名 leak なし、 通常 disk、 write
権限あり)。 (5) USB は二次推奨。 (1) Program Files は portable layout と機能的に衝突。

---

## E. 既存 dev 環境からの移行

dev (= 開発者 = user 自身) の現 data:

```
%APPDATA%\com.arcagate.desktop\
├ arcagate.db                              ← 104 items
├ arcagate.db-shm / arcagate.db-wal
├ arcagate.db.corrupted-1779801526         ← 2026-05-26 隔離残骸 (117 items、 別 audit 参照)
├ icons\ <uuid>.<ext> 多数
├ wallpapers\ <uuid>.<ext>
└ image-scraps\ <uuid>.<ext>
%LOCALAPPDATA%\com.arcagate.desktop\
├ logs\arcagate.log[.0-6]
└ EBWebView\ Default\... (cookie, localStorage, etc.)
```

移行が必要な物:

| 種別                                    | 移行先候補                   | 自動化必要?                                                                                                                                                                                |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `arcagate.db` + WAL                     | `<exe_dir>/data/arcagate.db` | 起動時 1 度の copy (= 安全)                                                                                                                                                                |
| icons / wallpapers / image-scraps       | `<exe_dir>/data/icons` 等    | 同上、 個別 path は DB の `icon_path` 列に絶対 path で保存されているため **DB の path も書き換え必要** (= `%APPDATA%\com.arcagate.desktop\icons\xxx.png` → `<exe_dir>/data/icons\xxx.png`) |
| log                                     | `<exe_dir>/data/logs/`       | 起動時 copy or 旧 log は捨てる                                                                                                                                                             |
| WebView2 UDF (localStorage / cookie 等) | `<exe_dir>/data/webview2/`   | 起動時 copy が望ましい (localStorage に theme / active view / locale 設定が入っている)                                                                                                     |

**選択肢**:

- (A) **自動移行コードを portable 版に lib.rs setup へ追加** (旧 `%APPDATA%` 検出 → copy →
  DB 内 icon_path 列を一括 UPDATE → 旧 path に marker 残して二重移行を防ぐ)。 約 100-150 LOC、
  unit test 付きで 1-2 日。
- (B) **手動移行**: dev は自分しか居ないので、 portable 切替時に export → portable 起動 → import
  を 1 度やれば終わり。 release 版に migration code を残さない (= portable は new install 想定)。
- (C) **hybrid**: portable build に「初回起動時に旧 `%APPDATA%\com.arcagate.desktop\` を検出 →
  copy するか聞く dialog」 を入れる。 (A) + 確認 UI。 ~200 LOC、 2-3 日。

**推奨**: (B) — dev user は自分のみ、 portable 化は実質「new install + 旧 data 手動 export/import」
で十分。 移行 code を残すと「installer 版 ↔ portable 版」 の往復で migration が二重発火する
リスク。 portable 版は config 駆動でなく「exe を置いた dir = data の場所」 として一度切りで設計
する方が清潔。

---

## F. 「portable mode 自動検出」 の設計案

Squirrel.Windows / Visual Studio Code Portable の慣習に倣う:

- `<exe_dir>/portable.flag` ファイル (空ファイル可) の存在で portable mode を判定
- 存在しなければ通常 mode (`app_data_dir()` 経由 = `%APPDATA%` 配下)
- portable build artifact では zip 内に `portable.flag` を同梱
- installer build artifact では同梱しない (= installer 経由は通常 mode、 portable zip 経由は
  portable mode)

これにより **同じ exe** を installer 配布 / portable zip 配布両対応にできる。 source code 上は
分岐 1 箇所 (`portable_mode()` helper) で集約。

```rust
fn portable_mode() -> Option<PathBuf> {
    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    if exe_dir.join("portable.flag").exists() {
        Some(exe_dir.join("data"))
    } else {
        None
    }
}

fn resolve_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    if let Some(p) = portable_mode() {
        Ok(p)
    } else {
        app.path().app_data_dir().map_err(...)
    }
}
```

同様に `resolve_log_dir()`, `resolve_webview2_udf()`。

---

## G. 総合判定

### G.1 portable 化は **「ほぼ成立」**

| 機能                              | 判定          | コメント                                                                 |
| --------------------------------- | ------------- | ------------------------------------------------------------------------ |
| DB / WAL                          | ✅ 成立       | path resolver 差し替え                                                   |
| log                               | ✅ 成立       | `TargetKind::Folder` への切替                                            |
| icons / wallpapers / image-scraps | ✅ 成立       | `app_data_dir()` 差し替え + asset scope 連動                             |
| WebView2 UDF                      | ✅ 成立       | env + additional_browser_args 二重保険                                   |
| WebView2 runtime本体              | ⚠ 残る        | OS 管理。 path に個人名混入なし (`%LOCALAPPDATA%\Microsoft\EdgeWebView`) |
| autostart                         | ⚠ 妥協        | HKCU\Run に user enable 時のみ書く (個人名混入なし)                      |
| updater                           | ❌ 無効化推奨 | installer 経路と portable 経路の updater は本質的に不整合                |
| single-instance                   | ⚠ patch必要   | 現状未導入。 portable と同時に導入 + identifier suffix                   |
| global-shortcut                   | ✅ 影響なし   | process-scoped                                                           |
| cloud sync 配下配置               | ⚠ 警告必要    | OneDrive / Dropbox 等で WAL corruption リスク                            |

### G.2 リスクサマリ (優先度別)

| 優先度 | リスク                                                           | 緩和策                                                                         |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| HIGH   | updater が portable では機能しない (installer registry と不整合) | portable build では `updater.active=false` に切替、 zip 再 download で手動更新 |
| HIGH   | WebView2 UDF redirect 漏れで `%LOCALAPPDATA%` に fallback        | env var + browser args の **二重保険**、 起動時 sanity check                   |
| HIGH   | cloud sync 配下の SQLite WAL corruption                          | 起動時 path check + warning dialog、 検出時は journal_mode=DELETE option       |
| MED    | single-instance 未導入で multi 起動 race                         | portable 化と同時に plugin 導入 + identifier suffix                            |
| MED    | autostart registry の portable 純度妥協                          | 「user enable 時のみ」 で許容、 path mismatch 自己修復ロジック追加             |
| LOW    | `%LOCALAPPDATA%\Microsoft\EdgeWebView\` 残存                     | OS 管理、 個人名混入なし、 容認                                                |
| LOW    | `%TEMP%` の使用 (updater download 等)                            | updater 無効化 (HIGH 案) で連動解決、 残る wry 内部使用は実質無害              |
| LOW    | SmartScreen reputation 蓄積                                      | EV cert 取得で即時 pass、 OV cert は時間で解決                                 |

### G.3 当初動機との適合性

| 動機                           | 達成度                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 個人フォルダ名が path に出ない | ✅ ほぼ達成 (Arcagate 側 path は全部 portable、 残る `%LOCALAPPDATA%\Microsoft\EdgeWebView\` は OS 側で「user 名混入」 とは別カテゴリ) |
| リネーム時の migration ゼロ    | ✅ 達成 (portable layout なら identifier 変更時に `<exe_dir>/data/` を rename しなくて済む — 単に新 exe を新 dir に置くだけ)           |
| USB / Dropbox 配布             | ⚠ USB は OK、 Dropbox は SQLite corruption リスクで非推奨                                                                              |

### G.4 採否の判断材料

- **採用するメリット** (a) 個人名 leak 構造的に解消、 (b) 移行/リネーム自由度、 (c) install
  uninstall の clean さ
- **採用するデメリット** (a) updater 無効化 = 手動更新負荷、 (b) installer 版と portable 版の
  分岐コード、 (c) cloud sync 配下警告 + WebView2 UDF redirect の二重保険テスト

「個人ツール / 配布水準を狙う」 という Arcagate の定位 (`docs/l0_ideas/motivation.md`) を踏まえると、

- **個人 dev 利用**: portable mode 一択で十分
- **future 配布想定**: installer + portable 両対応 (portable.flag 検出方式) が清潔。 ただし
  updater の手動化は説明が要る (RELEASE.md / INSTALL.md にコピー追加)

### G.5 推奨実装順序 (もし採用する場合)

1. (前提) `redact_for_display()` helper を別 audit (`DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md`)
   と統合実装
2. `portable_mode()` / `resolve_data_dir()` / `resolve_log_dir()` / `resolve_webview2_udf()`
   の 4 helper 新設
3. 既存 `app_data_dir()` 呼び出し 6 箇所を helper 経由に統一
4. `lib.rs` setup で env `WEBVIEW2_USER_DATA_FOLDER` 設定 + window builder の `additional_browser_args`
   を portable mode 時に追加
5. cloud sync detection (起動時 path 文字列 check + warning toast)
6. portable build profile (`tauri.conf.json` の portable variant + `portable.flag` 自動同梱) を
   bundle に追加
7. `tauri-plugin-single-instance` 導入 + identifier suffix patch
8. autostart の path mismatch 自己修復ロジック追加
9. RELEASE.md / INSTALL.md / PRIVACY.md に portable mode 説明を追加
10. user 検収 — installer 版 / portable 版両 build で smoke 検証

工数概算: 4-6 日 (テスト + doc 込み)。 但し **「リネームと portable を同 PR でやる」** 場合は
リネーム実装と portable 実装の両方で path / identifier を触るので **同時にやった方が touch
回数が少なく済む**。

---

## H. 参照

- [Tauri v2 Updater plugin](https://v2.tauri.app/plugin/updater/)
- [Tauri v2 Autostart plugin](https://v2.tauri.app/plugin/autostart/)
- [Tauri v2 Single Instance plugin](https://v2.tauri.app/plugin/single-instance/)
- [Tauri v2 Global Shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/)
- [Microsoft Edge WebView2 — Manage user data folders](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder)
- [tauri-apps/tauri#11144 — additional_browser_args + data_directory](https://github.com/tauri-apps/tauri/issues/11144)
- [tauri-apps/tauri#6657 — Changing default Data directory](https://github.com/tauri-apps/tauri/issues/6657)
- [SQLite — How To Corrupt A Database File](https://sqlite.org/howtocorrupt.html)
- [SQLite Over a Network](https://sqlite.org/useovernet.html)
- [Microsoft Defender SmartScreen reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
- 内部 audit: [`DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md`](DB_SELF_RECOVERY_DESIGN_AUDIT_2026-05-27.md)
- 内部 audit: [`PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`](PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md)
