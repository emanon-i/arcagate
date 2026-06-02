# PH-CF-1300 — データ透明化 (Data transparency)

## 背景・目的

Arcagate は標準 Tauri パターンで `%APPDATA%\com.arcagate.desktop\` に DB / log /
cache / icons / wallpapers / image-scraps を保存している。 portable 化までは行わない
方針 (`PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md` 結論) が、 **user が「自分の PC の
どこにデータがあるか把握できる」 ことが個人ツール契約 (`docs/l0_ideas/motivation.md`)
として必須**。 現状は user が AppData まで探しに行く必要があり、 「Windows アプリが
気づかぬうちにデータを残す」 不透明さがある。

本 phase で:

1. 設定画面の About section にデータ保存場所 path 表示 + 「Explorer で開く」 ボタン
2. README にデータ保存先 section を追加 (各 subdir / uninstall 手順込み)
3. データ export 機能の補完 (既存 JSON export を確認、 必要なら zip 化 / 補完)

## 制約

- portable 化はやらない (別 phase、 別判断)
- 既存 `cmd_export_json` / `cmd_import_json` は壊さない (API contract 維持)
- 個人 path (`C:\Users\<personal>\...`) を log / commit message / PR description に
  混入させない (`PERSONAL_PATH_LEAK_AUDIT_2026-05-28.md` の規律遵守)
- assert 緩和 / test.skip / 合成 hook bypass NG (`feedback_tests_real_path`)
- L0/L2 status:done doc 書き換え NG (`CLAUDE.md` 禁止事項)
- user 検収待ち禁止 (`feedback_auto_merge_no_user_gate`)

## 現状把握

### 1. 設定 / About — **未実装** (新規)

- `src/lib/components/settings/AboutSection.svelte:1-67` — 現状は Version / Tauri /
  License / repo link のみ。 **データ path 表示なし**
- `src/lib/components/settings/SettingsDataPane.svelte:1-118` — Export / Import +
  全設定 reset + factory reset。 path 表示なし
- Tauri 側に `app_data_dir` / `app_log_dir` を frontend へ返す `#[tauri::command]`
  は **未実装** (新規 `cmd_get_app_paths` 等が必要)
- 「Explorer で開く」 機能は既存:
  - `src-tauri/src/commands/launch_commands.rs:59-75` — `cmd_reveal_in_explorer`
  - `src-tauri/src/launcher/mod.rs:210-238` — `explorer.exe /select,<path>` 実装
  - `src/lib/ipc/launch.ts:42-44` — frontend wrapper `revealInExplorer(path)`
    → **再利用可能**、 新規 IPC 不要

### 2. README / INSTALL / PRIVACY — **部分** (補強要)

- `README.md:110` — log path 1 行のみ (`%LOCALAPPDATA%\arcagate\logs\arcagate.log`)。
  しかし bundle identifier が `com.arcagate.desktop` なので実際は `%LOCALAPPDATA%\
  com.arcagate.desktop\logs\arcagate.log` (= README の現記述は **古い identifier**、
  要修正)
- `INSTALL.md:52` — uninstall 手順で `%APPDATA%/com.arcagate.desktop/` 1 行言及。
  subdir 詳細なし
- `PRIVACY.md:33, 60` — crash redaction 例 + 削除手順で言及あり (OK)
- 不足: **README に専用 section が無い**。 user が「自分のデータどこ?」 で困ったとき
  README で見つからない (= README は first-touch surface)

### 3. データ export 機能 — **大体できている** (補完候補は確認後判断)

- `src/lib/components/settings/ExportImport.svelte` — UI 完成
- `src-tauri/src/commands/export_commands.rs:1-24` — `cmd_export_json` / `cmd_import_json`
- `src-tauri/src/services/export_service.rs:1-72+` — `ExportData` struct (version 2)
  で `items` / `tags` / `item_tags` / `config` + `exported_at` を JSON 出力
  - **起動ログは除外** (line 27 comment)
  - **出力先 user dialog 選択可** (line 14)
  - **Import merge with INSERT OR REPLACE** (= 既存 DB に上書き / 安全)
- 含まれない: **icons / wallpapers / image-scraps / themes / workspaces / widgets /
  launch_log / item_stats** (推測、 要 export_service.rs 全文 verify)
- 出力形式: JSON 単独 (= zip 化なし)

**判定**:

- (a) DB schema 全 table が export 対象に含まれているか確認 → 含まれていない table
  があれば追加
- (b) `icons/` / `wallpapers/` / `image-scraps/` の resource file 本体は include か
  exclude か decision → 含めるなら zip 化、 含めないなら「DB の path 参照は壊れる」
  注記を README + dialog で明示
- (c) **「もう大体できてる」** なので scope は **gap fill のみ**。 zip 化は overkill
  なら見送り

## 機能契約

### 1. 設定画面データ path 表示

- **AboutSection** に新規 section「Data location」 を追加 (Version の下、 repo link の
  上)
- 表示項目 (固定順、 各行 1 path):
  - DB (`%APPDATA%\com.arcagate.desktop\arcagate.db`)
  - Log dir (`%LOCALAPPDATA%\com.arcagate.desktop\logs\`)
  - App data dir (= 上記 DB の親、 icons / wallpapers / image-scraps 含む)
- 各 path 表示は **`<code>` 等幅 font + 横スクロール許容** で長い path も省略しない
- 各 path の右に `[Explorer で開く]` button (icon + label)、 click で
  `revealInExplorer(path)` を呼ぶ
- 失敗時は toast で `t('toast.copy_failed')` 系 pattern (既存 i18n key 利用 or 新規)
- 機械検出: `data-testid="about-data-location-db"` / `about-data-location-log` /
  `about-data-location-appdata` + 各 open ボタンに `about-data-open-{kind}`

### 2. README データ保存先 section

- 場所: 「Installation」 section の **直後**、 「Configuration」 / 「Usage」 系の前
- 内容 (表形式):

  | 種別           | path (Windows 標準)                                     |
  | -------------- | ------------------------------------------------------- |
  | データベース   | `%APPDATA%\com.arcagate.desktop\arcagate.db`            |
  | アイコン cache | `%APPDATA%\com.arcagate.desktop\icons\`                 |
  | 壁紙           | `%APPDATA%\com.arcagate.desktop\wallpapers\`            |
  | image-scrap    | `%APPDATA%\com.arcagate.desktop\image-scraps\`          |
  | log            | `%LOCALAPPDATA%\com.arcagate.desktop\logs\arcagate.log` |

- uninstall 時の手動掃除手順 (`%APPDATA%\com.arcagate.desktop\` + `%LOCALAPPDATA%
  \com.arcagate.desktop\` を削除)
- 設定画面 → About で実 path を確認 + Explorer ボタンへの参照
- README:110 の古い log path 記述は **identifier 正しく** 直す

### 3. export 機能

- (a) `export_service.rs` 全文確認 → 対象 table 一覧を本 plan に固定
- (b) 不足 table (e.g. workspaces / widgets / themes 等) があれば追加
- (c) resource file (icons / wallpapers / image-scraps) は **scope 外** (JSON path
  参照のみ export、 import 時に「ファイル本体は手動コピー要」 と Dialog で注記)
- README に export / import の使い方 1 段落追加 (3 と関連付け)
- (推測) 既存 UI は十分機能、 i18n 文言と説明改善のみで完了する可能性が高い

## 影響範囲

### touch する file

- `src-tauri/src/commands/config_commands.rs` (新規 cmd_get_app_paths または既存 file に追記)
- `src-tauri/src/lib.rs` (invoke_handler に新 cmd 追加)
- `src/lib/ipc/config.ts` (frontend wrapper `getAppPaths`)
- `src/lib/components/settings/AboutSection.svelte` (data location section)
- `src/lib/i18n/messages_ja.json` / `messages_en.json` (`settings.about.data_location.*`)
- `README.md` (新 section + identifier 修正)
- `INSTALL.md` (uninstall 手順詳細化、 任意)
- `tests/e2e/` 新規 spec or 既存 spec に統合 (e2e: settings → About → data location 表示 + button click → reveal_in_explorer IPC が called される seam 検証)
- 必要なら export_service.rs (table 追加)

### touch しない / 守る

- portable 化系 (別 phase)
- bundle identifier (`com.arcagate.desktop`)
- 既存 `cmd_export_json` / `cmd_import_json` の wire (内部 schema 拡張のみ可)
- L0 / L2 status:done doc

## 機械検出 / audit

- 新規 audit: 「README にデータ保存先 section が存在する」 / 「README に古い log
  path 記述が残っていない」 (簡易 bash grep audit script `audit-readme-data-location.sh`、
  lefthook + `pnpm audit:all` に組込)
- 既存 `audit-personal-data.sh` で個人 path 混入を防ぐ (= identifier 表記のみ通る)
- e2e: Settings → About を開いて `data-testid="about-data-location-db"` 等が visible、
  click で reveal_in_explorer の test-seam が path を受け取ることを assert (実 UI 経路)

## test plan (実 UI e2e)

T1. Settings → About を開く
T2. `about-data-location-db` が表示され、 textContent に `arcagate.db` 含む
T3. `about-data-open-db` button が visible / enabled
T4. Click → `revealInExplorer` IPC が引数 = DB path で呼ばれる (CDP attach の test seam
でない場合は **本物の reveal が走るが test 環境では verifying side-effect は
Explorer 起動 visual のみ** = e2e の限界、 IPC call の log で代替検証)
T5. log / appdata dir についても T2-T4 同様
T6. (export) Settings → Data pane → Export 既存 UI が壊れていないことを smoke 確認

## audit script の追加 / 既存 audit との関係

- `scripts/audit-readme-data-location.sh` 新規 (内容: README に「データ保存場所」
  「Data location」 section heading が存在することを grep で要求)
- `lefthook.yml` に staged file `README.md` 変更時に audit を走らせる hook を追加
- `pnpm audit:all` に組込
- 既存 audit との関係: `audit-personal-data.sh` の regex は `%APPDATA%` / `%LOCALAPPDATA%`
  などの placeholder を許容 (literal username なし)、 README の path 表記とは無衝突

## 工数概算

| 項目                          | 工数 (推測)  |
| ----------------------------- | ------------ |
| 1 設定 path 表示 + ボタン     | 0.5 day      |
| 2 README データ保存先 section | 0.25 day     |
| 3 export 状況確認 + gap fill  | 0.25-0.5 day |
| audit script + lefthook hook  | 0.25 day     |
| e2e 1 本                      | 0.5 day      |
| 合計                          | ~2 day       |

## 完了条件

- [ ] 設定 → About に Data location section が表示される
- [ ] DB / Log / App data dir の 3 path が表示される
- [ ] 各 path の右に Explorer ボタンが表示される
- [ ] click で `revealInExplorer` IPC が呼ばれる (e2e で seam log で検証)
- [ ] README に「データ保存場所」 section が追加され、 各 subdir + uninstall 手順を記載
- [ ] README:110 の log path 記述が `com.arcagate.desktop` identifier に修正
- [ ] export_service.rs の対象 table が plan 末尾に明文化される (gap があれば追加)
- [ ] e2e 1 本追加 (実 UI 経路、 hook bypass / skip なし)
- [ ] `audit-readme-data-location.sh` 新設 + `lefthook.yml` 組込 + `pnpm audit:all` 通過
- [ ] `pnpm verify` 全段 pass
- [ ] PR auto-merge (squash) で merge 完了
