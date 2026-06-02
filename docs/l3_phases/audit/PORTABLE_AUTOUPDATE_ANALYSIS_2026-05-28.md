# Portable + 自動更新 両立方法 分析 (2026-05-28)

`PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md` の続編。 前 audit で 「portable では updater 無効化」 と
雑に結論したのを user 指摘で再調査。 **portable layout (exe と同 folder の data) を維持したまま
self-update を成立させる選択肢** を、 公式 source / issue / 第三者 library を実際に WebFetch
して詰めた結果。

---

## 結論先出し

**Velopack** (`velopack` Rust crate v1.0.1、 MIT、 2026-05-26 リリース) を **第 1 推奨**。
Squirrel.Windows / Clowd.Squirrel の正統後継で、 portable zip target が公式に self-update
対応する**唯一の現役 production-ready** 解。 Tauri community 事例は薄いが Rust SDK が Ready
で技術的阻害要因なし。

**避けるべき**: tauri-plugin-updater v2 を portable に流用すること。 公式設計が installer
前提で、 portable 配置先と NSIS registry の install dir が乖離する既知問題があり、 仕様上
解決されない。

---

## A. tauri-plugin-updater v2 の portable 対応可能性 — **NO**

### A.1 公式設計が installer 前提

[Tauri v2 distribute/windows-installer](https://v2.tauri.app/distribute/windows-installer/) の
原文 引用:

> "Tauri applications for Windows are either distributed as Microsoft Installers (.msi
> files) using the WiX Toolset v3 or as setup executables (-setup.exe files) using NSIS."

→ Windows target は **MSI / NSIS の 2 つだけ**。 portable / zip target は **存在しない**。

[Tauri v2 plugin/updater](https://v2.tauri.app/plugin/updater/) の `installMode` は
`passive | basicUi | quiet` の 3 種だけで、 **全て installer 起動経路**。 `installerArgs` /
`installer_path` で portable に近い挙動を実現する記述はない。

### A.2 Rust source レベルの確認

[`plugins-workspace/blob/v2/plugins/updater/src/updater.rs`](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/updater/src/updater.rs):

- `WindowsUpdaterType` enum は `Nsis | Msi` の **2 variant のみ**
- Windows path の install は `ShellExecuteW(... .exe / .msi ...)` → `std::process::exit(0)` の
  **1 経路だけ**
- `.zip` は中身の `.exe` / `.msi` を探すための **解凍にしか使われない** (= zip 内に NSIS / MSI
  を入れる前提)
- **in-place 上書き経路は無い** (macOS / Linux path には `std::fs::rename` の direct replace が
  あるが Windows 側にはない)

### A.3 関連 issue / PR

| issue                                                                                                                                                                                           | 内容                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [tauri/issues/12720](https://github.com/tauri-apps/tauri/issues/12720)                                                                                                                          | 「現 updater は本体に embed されている、 separate launcher が必要」 — 公式実装は **まだ無い**                      |
| [plugins-workspace/issues/1083](https://github.com/tauri-apps/plugins-workspace/issues/1083)                                                                                                    | 「zip wrapping を撤去したい」 提案、 portable 経路の新設ではない                                                   |
| [tauri/issues/11015](https://github.com/tauri-apps/tauri/issues/11015) / [#6928](https://github.com/tauri-apps/tauri/issues/6928) / [PR #12365](https://github.com/tauri-apps/tauri/pull/12365) | NSIS は install dir を registry から読む。 portable 配置先と registry の値が乖離 → 重複 install が発生する既知 bug |

### A.4 判定

| 項目               | 評価                             |
| ------------------ | -------------------------------- |
| portable 維持      | NO                               |
| auto-update 維持   | YES (但し installer 経路)        |
| 実装工数           | 高 (fork / patch が必要)         |
| Tauri スタック相性 | 最悪 (公式設計が installer 前提) |
| code-sign 影響     | NSIS / MSI 両方の sig 必須       |
| 学習コスト         | 中                               |
| **推奨度**         | **✗ (避けるべき)**               |

---

## B. 自前 bootstrap exe pattern — **条件付き YES**

### B.1 部品

| crate                                                                               | 機能                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`self-replace`](https://docs.rs/self-replace/)                                     | Windows で running exe を上書きする hack (移動 → 新規 → 子で親終了待ち)。 注: 「if power is cut in just the wrong moment, some files are left over」 (= power loss 時の部分破損リスク) |
| [`self_update`](https://github.com/jaemk/self_update)                               | GitHub Releases backend で download + replace + restart を包む high-level wrapper                                                                                                      |
| [`Gussy/tauri-windows-installer`](https://github.com/Gussy/tauri-windows-installer) | Tauri 専用 pure-Rust installer (v0.1.4)。 update **機能なし** ("Unlike VeloPack, this is Tauri-specific and has no update mechanism") = parts として参照する程度                       |

### B.2 実装パターン (推測 + community 議論ベース)

1. 小 bootstrap exe (Rust) を `<exe_dir>/updater.exe` に同梱
2. 本体 (`arcagate.exe`) は終了時に updater.exe を起動 → exit
3. updater.exe が:
   - 新 zip を download
   - sig 検証
   - 旧 folder を退避
   - 新 zip を展開
   - 本体を再起動
4. Tauri v2 の updater plugin は **使わない** (`updater.active=false`)
5. Update IPC コマンドを Arcagate 側で自前定義し、 frontend からトリガー

### B.3 評価

| 項目             | 評価                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| portable 維持    | YES (exe と同 folder 完結)                                                                                                            |
| auto-update 維持 | YES (自前)                                                                                                                            |
| 実装工数         | 中〜高 (zip handling / sig 検証 / file lock 回避 / 再起動 を自作)                                                                     |
| Tauri 相性       | 良 (sidecar として Rust binary 同梱可能)                                                                                              |
| code-sign 影響   | bootstrap + 本体 **両方** sign 推奨 (SmartScreen reputation は signed exe ごと別。 (推測) bootstrap が頻繁更新で reputation 蓄積遅延) |
| 学習コスト       | 中 (`self-replace` 自体は薄いが、 WebView2 / Tauri との file lock 相互作用は実機検証必須)                                             |
| 単一作者依存度   | なし (`self-replace` / `self_update` は別々のメンテナンス)                                                                            |
| **推奨度**       | **△ (Velopack に致命的問題が出た時の fallback)**                                                                                      |

---

## C. Side-by-side versioning (Chrome / VSCode / Squirrel 流) — **条件付き YES (自作 launcher)**

### C.1 既存実装例

| app                 | 実装                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chrome              | `C:\Program Files\Google\Chrome\Application\<version>\chrome.exe` + sibling の `Application\chrome.exe` (stub launcher)。 update は `new_chrome.exe` を sibling に置き、 再起動時 rename ([omaha-consulting.com](https://omaha-consulting.com/google-omaha-tutorial-chrome-updater)) |
| **VSCode portable** | [`code.visualstudio.com/docs/editor/portable`](https://code.visualstudio.com/docs/editor/portable) 公式 quote: **「the Windows ZIP archive does not support auto update」** — portable では 「data フォルダを新版にコピー」 という **手動 update のみ**                              |
| Squirrel.Windows    | `<install>/app-<version>/` pattern。 archived 状態 ([electron/issues/17722](https://github.com/electron/electron/issues/17722))、 後継 = Velopack                                                                                                                                    |

VSCode portable が公式 auto-update を諦めている事実は重い (= 仕様面で portable + auto-update は
それなりの設計負担を要する証明)。 Chrome は専用 updater (Omaha) を持ち、 個人ツールで完コピは
オーバースペック。

### C.2 自作する場合の touch 範囲

- thin launcher exe (~数十 KB Rust): `<install>/versions/v*/` を走査して最新を spawn
- update 経路: 新 zip download → `<install>/versions/<新version>/` に展開 → launcher の状態更新
  → 既存版終了後に新版起動
- 旧版 GC: 1-2 世代保持して rollback 可能
- DB / data の共有: `<install>/data/` だけ versions 横断で共有、 各 `<install>/versions/v*/`
  は exe + asset only

### C.3 評価

| 項目             | 評価                                                        |
| ---------------- | ----------------------------------------------------------- |
| portable 維持    | YES                                                         |
| auto-update 維持 | YES (自作)                                                  |
| 実装工数         | 高 (thin launcher + version 管理 + atomic rename + 古版 GC) |
| Tauri 相性       | 普通 (launcher 自体は Rust で書ける)                        |
| code-sign 影響   | launcher + 各 version の exe を全て sign                    |
| **推奨度**       | **△ (既製品 Velopack があるので自作は通常不要)**            |

---

## D. Velopack — **YES (最有力)**

### D.1 基本情報

[github.com/velopack/velopack](https://github.com/velopack/velopack):

- License: **MIT**
- 最新: **v1.0.1 release 2026-05-26** (= 2 日前)
- 4,024 commits、 98 contributors、 61 releases、 active maintained
- 系譜: Squirrel.Windows → Clowd.Squirrel → **Velopack が公式後継** (作者 Caelan Sayler 継続。
  「the original Squirrel.Windows code was discarded and the core Squirrel binaries were
  rewritten in Rust」 と Clowd.Squirrel V3 の DESCRIPTION で明言)
- 実装言語: **Rust** ("Velopack is written in Rust for native performance")

### D.2 portable 自動更新 サポート

[`docs.velopack.io/packaging/overview`](https://docs.velopack.io/packaging/overview):

- 配布形態 4 種:
  1. `MyAppId-Setup.exe` (installer)
  2. **`MyAppId-Portable.zip`** (portable, self-updating)
  3. `.nupkg` (full / delta packages)
  4. `releases.json` (channel manifest)

公式 quote: 「Velopack produces a portable package (YourAppId-Portable.zip) which does not
need to be installed and is self-updating」 → **portable + self-update を明示サポート**。

### D.3 layout (Windows)

[`docs.velopack.io/packaging/operating-systems/windows`](https://docs.velopack.io/packaging/operating-systems/windows):

```
<install_dir>/
├ <packId>/
│  ├ current/         ← 本体 exe / asset (毎回上書きされる)
│  │  └ <app>.exe
│  └ Update.exe       ← stub launcher (entry point)
```

- 「the entire `current` directory will be replaced」 = atomic swap で in-place replace
  ([velopack/issues/314 closed](https://github.com/velopack/velopack/issues/314))
- Stub launcher `Update.exe` が entry point。 user は `Update.exe` を起動するか
  shortcut が `Update.exe` を指す
- portable でも同 layout、 `current/` 配下が in-place で上書きされる

### D.4 Rust SDK の状態

[`docs.rs/velopack/latest`](https://docs.rs/velopack/latest/velopack/) (v1.0.1):

- [`docs.velopack.io/category/integrating`](https://docs.velopack.io/category/integrating) で
  Rust は **"Ready"** と明記
- main 冒頭に 1 行: `VelopackApp::build().run();` で update / restart hook が動く
- 通常 update flow: `UpdateManager::new(...)?.check_for_updates()?` → `download_updates()` →
  `apply_updates_and_restart()` の 3 段

### D.5 code signing 統合

- `vpk pack --sign` で installer / portable / delta を一括署名 (EV cert / OV cert 両対応)
- Velopack core binary 自体は Velopack 作者が pre-sign 済 = SmartScreen reputation は
  Velopack 全体で共有 (= 新規アプリでも reputation 上の不利が小さい)

### D.6 制約

- 「Neither the updater nor the installer support privileged directories such as
  `C:\Program Files`」 ([Windows Overview](https://docs.velopack.io/packaging/operating-systems/windows))
  — admin 領域は不可、 user folder / portable folder 限定。 **Arcagate の個人 launcher 用途と
  相性が良い** (Arcagate を Program Files に置く要求は無い)
- `current/` 配下は毎回 atomic swap で上書きされるため、 **SQLite DB は `current/` の中に
  置けない**。 `<install_dir>/<packId>/data/` のように **1 階層上に置く設計が必要**
  (Velopack 公式が 「`%VPK_*%` 環境変数」 経由で current 外を解決する方式を提供、 推測 だが
  詳細未確認)
- Tauri 統合 docs は **薄い**。 Velopack docs 上 Tauri 言及はなく、 community 事例検索で
  目立つ例なし = **自分が pioneer になるリスク**あり

### D.7 評価

| 項目             | 評価                                                              |
| ---------------- | ----------------------------------------------------------------- |
| portable 維持    | **YES** (公式 target)                                             |
| auto-update 維持 | **YES** (公式 feature)                                            |
| 実装工数         | 低〜中 (vpk CLI pipeline 追加 + main 冒頭 1 行 + データ dir 設計) |
| Tauri 相性       | 良 (Rust SDK Ready、 但し community 事例薄)                       |
| code-sign 影響   | vpk pack のフラグで完結                                           |
| maintainer       | 単一作者依存だが 5 年連続活発、 1.0 GA 直後、 MIT                 |
| **推奨度**       | **◎ (第 1 推奨)**                                                 |

---

## E. その他

| アプローチ           | 状態                                                                                                                                                                                  | 推奨度 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| ClickOnce            | .NET / Visual C++ 専用、 Tauri (Rust) 対象外。 portable 概念無し ([learn.microsoft.com](https://learn.microsoft.com/en-us/visualstudio/deployment/clickonce-security-and-deployment)) | ✗      |
| Squirrel.Windows     | read-only 化 / no longer maintained ([electron/issues/17722](https://github.com/electron/electron/issues/17722))。 後継 = Velopack                                                    | ✗      |
| Clowd.Squirrel       | **2024-07-05 archived** ([github.com/clowd/Clowd.Squirrel](https://github.com/clowd/Clowd.Squirrel))。 後継 = Velopack                                                                | ✗      |
| WinSparkle / Sparkle | C++ native 向け Sparkle 移植。 Rust SDK 公式無し、 Tauri 事例検索で出ず ((推測) FFI 自前)。 portable 対応も自前                                                                       | ✗      |
| CrabNebula Cloud     | Tauri 公式 commercial サービス。 内部は tauri-plugin-updater をそのまま使うので portable 問題未解決 (= A と同等)                                                                      | ✗      |

---

## F. 評価マトリクス

| アプローチ                 | portable 維持 | auto-update 維持 | 実装工数   | Tauri 相性 | code-sign 影響 | 学習コスト | 推奨度 |
| -------------------------- | ------------- | ---------------- | ---------- | ---------- | -------------- | ---------- | ------ |
| A. tauri-plugin-updater v2 | NO            | YES (installer)  | 高         | 最悪       | NSIS+MSI 両    | 中         | ✗      |
| B. 自前 bootstrap exe      | YES           | YES (自作)       | 中〜高     | 良         | 2 exe sign     | 中         | △      |
| C. Side-by-side launcher   | YES           | YES (自作)       | 高         | 普通       | 全版 sign      | 高         | △      |
| **D. Velopack**            | **YES**       | **YES (公式)**   | **低〜中** | **良**     | **vpk 統合**   | **中**     | **◎**  |
| E. その他 (ClickOnce 等)   | NO/NA         | NA               | NA         | NA         | NA             | NA         | ✗      |

---

## G. Arcagate 向け推奨ルート

### G.1 第 1 推奨: Velopack (`velopack` crate v1.0.1 + `vpk` CLI)

**理由**:

- portable zip target が **公式に self-update 対応** する唯一の現役 production-ready 解
- Squirrel 系統の正統後継、 active maintained (1.0 GA 直後)、 MIT
- Rust SDK が Ready (Tauri 統合 docs は薄いが阻害要因はない)
- code signing 一体化、 delta packaging も標準で備える (Arcagate 本体 size 増加への将来対策)
- Arcagate の 「個人 launcher / 配布水準を狙う daily-use ツール」 という制約に最も合致
  (admin 不要、 user folder / portable folder 限定 = Program Files 配置不要)

**懸念点 + 緩和**:

| 懸念                                        | 緩和策                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Tauri community 事例が薄い (pioneer リスク) | 公式 docs + Rust SDK Ready を信頼。 cookie 検証は実機 dogfood で吸収                       |
| `current/` が atomic swap で上書きされる    | SQLite DB は `current/` の外に置く設計 (1 階層上)                                          |
| 単一作者 (Caelan Sayler) 依存度             | MIT + Rust なので最悪 fork 可能、 5 年連続活発で短期撤退リスク低                           |
| Tauri 標準 updater plugin を捨てる          | `tauri-plugin-updater` を Cargo.toml から外す、 `tauri.conf.json > plugins.updater` を撤去 |

### G.2 第 2 推奨 (fallback): self-replace + 自前 bootstrap

Velopack に致命的な問題 (Tauri / WebView2 と相互作用での file lock 等) が判明した場合の fallback。
`self-replace` + `self_update` crate で零細自作。 個人ツール水準を超え 「配布水準」 を狙うなら
工数が見合わないが、 制御権は最大。

### G.3 避けるべき: tauri-plugin-updater v2 の portable 流用

Windows path は ShellExecuteW(installer) 経路 1 つだけで、 portable 配置先と NSIS registry の
install dir が乖離する既知問題 ([PR #12365](https://github.com/tauri-apps/tauri/pull/12365)) が
あり、 仕様上 fix されても portable 用途では設計外。

---

## H. 前 audit との接続

`PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md` § G.5 「推奨実装順序」 を本 audit に合わせて改訂
する場合の差分:

| ステップ | 旧 (`updater 無効化`)                              | 新 (Velopack 採用)                                                                   |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| -        | `tauri.conf.json > plugins.updater.active = false` | `tauri-plugin-updater` を Cargo.toml / Tauri Builder から完全撤去                    |
| -        | (なし)                                             | `velopack` crate を Cargo.toml に追加、 `main()` 冒頭に `VelopackApp::build().run()` |
| -        | (なし)                                             | `vpk pack --sign` を release CI に追加、 `MyAppId-Portable.zip` artifact を生成      |
| -        | (なし)                                             | DB / data dir 設計を 「`current/` の外」 にする (`<install_dir>/<packId>/data/`)     |
| -        | RELEASE.md / INSTALL.md に「手動 update」 と記載   | RELEASE.md / INSTALL.md に Velopack の update flow と portable layout 説明           |

工数概算: **+1-2 日** (Velopack 学習 + vpk CI + データ dir 1 階層移動)。 前 audit の 4-6 日と
合算で **5-8 日**。

---

## I. 参照 (本 audit で実際に WebFetch / WebSearch して引用したもの)

- [v2.tauri.app/plugin/updater/](https://v2.tauri.app/plugin/updater/)
- [v2.tauri.app/distribute/windows-installer/](https://v2.tauri.app/distribute/windows-installer/)
- [plugins-workspace/blob/v2/plugins/updater/src/updater.rs](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/updater/src/updater.rs)
- [plugins-workspace/blob/v2/plugins/updater/Cargo.toml](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/updater/Cargo.toml)
- [tauri/issues/12720 (separate launcher proposal)](https://github.com/tauri-apps/tauri/issues/12720)
- [plugins-workspace/issues/1083 (zip wrapping)](https://github.com/tauri-apps/plugins-workspace/issues/1083)
- [tauri/issues/11015](https://github.com/tauri-apps/tauri/issues/11015) / [tauri/issues/6928](https://github.com/tauri-apps/tauri/issues/6928) / [tauri/pull/12365](https://github.com/tauri-apps/tauri/pull/12365) (NSIS/MSI install dir mismatch)
- [github.com/velopack/velopack](https://github.com/velopack/velopack)
- [docs.velopack.io/packaging/overview](https://docs.velopack.io/packaging/overview)
- [docs.velopack.io/packaging/operating-systems/windows](https://docs.velopack.io/packaging/operating-systems/windows)
- [docs.velopack.io/category/integrating](https://docs.velopack.io/category/integrating)
- [docs.rs/velopack/latest](https://docs.rs/velopack/latest/velopack/)
- [velopack/issues/314 (portable dual exe)](https://github.com/velopack/velopack/issues/314)
- [clowd/Clowd.Squirrel (archived 2024-07-05)](https://github.com/clowd/Clowd.Squirrel)
- [electron/issues/17722 (Squirrel.Windows unmaintained)](https://github.com/electron/electron/issues/17722)
- [docs.rs/self-replace](https://docs.rs/self-replace/latest/self_replace/)
- [github.com/jaemk/self_update](https://github.com/jaemk/self_update)
- [Gussy/tauri-windows-installer](https://github.com/Gussy/tauri-windows-installer)
- [code.visualstudio.com/docs/editor/portable](https://code.visualstudio.com/docs/editor/portable)
- [omaha-consulting.com (Chrome updater)](https://omaha-consulting.com/google-omaha-tutorial-chrome-updater)
- [learn.microsoft.com ClickOnce](https://learn.microsoft.com/en-us/visualstudio/deployment/clickonce-security-and-deployment)
- 内部: [`PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md`](PORTABLE_FEASIBILITY_AUDIT_2026-05-28.md)
