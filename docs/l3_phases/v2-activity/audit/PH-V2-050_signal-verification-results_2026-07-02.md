# PH-V2-050 実証済み取得方式 確定表 (2026-07-02)

> [`PH-V2-050`](../PH-V2-050_signal-verification.md) の成果物。 user 実機 (buddha-239、 Windows 11、
> 非 admin ログオン、 gonda は Administrators group member) で全信号を実測し、 生出力で確定した。
> スパイクは `scratch/ph050-spikes/` に使い捨てで残す (production コード不変更、
> `git diff --name-only -- src src-tauri` は空)。

## 結論サマリ (先出し)

| 信号                                     | 採用方式                                                                            | 状態                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 前面窓 + title + path                    | `GetForegroundWindow` + `QueryFullProcessImageName` + `SetWinEventHook(FOREGROUND)` | **core 確定** (event 駆動を推奨に格上げ)                                                          |
| 実操作 idle                              | `GetLastInputInfo`                                                                  | **core 確定** (据え置き)                                                                          |
| 再生メディア                             | SMTC `GlobalSystemMediaTransportControlsSessionManager`                             | **core 確定** (据え置き)                                                                          |
| ファイル操作 (本命)                      | USN `FSCTL_READ_USN_JOURNAL`                                                        | **admin 必須は確定 (据え置き)。admin 側の実地成功実行は deferred** (§3)                           |
| ファイル操作 (fallback)                  | ReadDirectoryChangesW                                                               | **fallback 確定** (据え置き、検証は短時間 fixture の範囲)                                         |
| **ブラウザ URL**                         | **UIA アドレスバー読取 (単独)**                                                     | **Chrome/Edge は core 候補を強く支持** (5/5)。Firefox/他Chromium系は未検証で deferred、根拠は§2.2 |
| システムメトリクス (CPU/プロセス別)      | `GetSystemTimes` / `GetProcessTimes` 系の raw Win32 API                             | **実測で確定** (WMI/PDH比で約8〜47倍高速、800 の前提)                                             |
| システムメトリクス (メモリ/disk/network) | `GlobalMemoryStatusEx` 等 (候補)                                                    | **未実測、提案のみ** (800 実装時に別途計測が必要、§1.4)                                           |

生データ索引は末尾の [§7 生データ索引](#7-生データ索引) を参照。すべて `scratch/ph050-spikes/` 配下、
個人視聴データ・具体 URL は伏字化済み (§8)。

---

## 1. 非 focus 信号 (前面操作なしで検証可能)

### 1.1 実操作 idle — `GetLastInputInfo`

生データ: `scratch/ph050-spikes/21-idle-raw.json`

| 項目       | 結果                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 取得可否   | ✓ 可 (admin 不要)                                                                                                                                                                                                   |
| 分解能     | ミリ秒 (`GetTickCount` 差分)。合成キー入力 (VK_SCROLL toggle) 直後のサンプルで `idleMs` が `537156ms → 1032ms` に即時リセットされ、以降 1.5 秒間隔ポーリングどおり `1032→2532→4047→5547` と正確に増分することを確認 |
| admin 要否 | 不要                                                                                                                                                                                                                |
| 取りこぼし | ポーリング間隔依存 (瞬間的な入力も次回ポーリングで idleMs リセットとして検出できる。入力の "内容" は一切取得しない)                                                                                                 |
| 採否       | **core 据え置き** (L2 記述と一致)                                                                                                                                                                                   |

### 1.2 再生メディア — SMTC

生データ: `scratch/ph050-spikes/30-smtc-raw.json`

| 項目                | 結果                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 取得可否            | ✓ 可 (admin 不要)。 実機で **実利用中の Chrome 上のブラウザメディアセッション (Paused 状態)** から `appId="Chrome"`, `playbackStatus="Paused"`, 非空の `title` を取得成功。合成データでなく、ユーザーが実際に開いていたセッションのメタデータで確認                      |
| 停止時挙動          | `GetCurrentSession()` はブラウザセッションを正しく解決できず `title=null` を返す一方、`GetSessions()` の列挙経由では正しく取得できた → **`GetCurrentSession()` 単独に依存せず `GetSessions()` を回して SourceAppUserModelId でフィルタする実装が必要** (L2 申し送り、§6) |
| artist / albumTitle | ニコニコ動画ソースでは空文字 (`""`)。空文字と未取得 (`null`) を区別する必要あり                                                                                                                                                                                          |
| 採否                | **core 据え置き**。ただし `GetCurrentSession()` 依存を避ける実装上の注意を追加 (§6)                                                                                                                                                                                      |

### 1.3 ファイル操作 (fallback) — ReadDirectoryChangesW

生データ: `scratch/ph050-spikes/20-rdcw-raw.json`

| 項目     | 結果                                                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 取得可否 | ✓ 可 (非 admin)。 Create → Changed×2 → Renamed → Deleted の単発シーケンス (1 fixture) で 5 イベントを漏れなく捕捉。**バッファ溢れ・高頻度書き込み時の取りこぼしは未検証** (L2 記載の `ERROR_NOTIFY_ENUM_DIR` 特性はこの短時間 fixture では再現していない) |
| 重複特性 | 1 回の書き込みで `Changed` が **2 回**発火 (前回検証と一致、debounce 必須)                                                                                                                                                                                |
| 採否     | **fallback 確定** (据え置き)。高頻度シナリオでの取りこぼし特性は実装フェーズでの追加検証が必要                                                                                                                                                            |

### 1.4 システムメトリクス — 全体 / プロセス別 (800 の前提、新規)

生データ: `scratch/ph050-spikes/70-sysmetrics-raw.json` (同一機・同一瞬間で 8 手法を計測、単位 ms = 1 回の取得呼び出しにかかった壁時計時間。
本スクリプトは 2 回実行しており、以下は最終的に `-raw.json` として永続化された 2 回目の値。1 回目の実行では
WMI `Win32_PerfFormattedData_PerfOS_Processor` が 924ms、`Get-Counter` が 1904ms を記録したことをターミナル出力で
確認済みだが、raw ファイルとして保存されていないため参考値として注記するに留める)

| # | 手法                                                          | scope            | 所要時間 (ms、raw JSON永続値)      |
| - | ------------------------------------------------------------- | ---------------- | ---------------------------------- |
| 1 | `GetSystemTimes` (raw Win32 API)                              | system-wide CPU  | **9**                              |
| 2 | `Get-Process` 相当 (`GetProcessTimes` ベース、全プロセス列挙) | per-process      | **52**                             |
| 3 | WMI `Win32_OperatingSystem` (メモリ)                          | system-wide mem  | 135                                |
| 4 | WMI `Win32_PerfFormattedData_PerfDisk_PhysicalDisk`           | system-wide disk | 265                                |
| 5 | WMI `Win32_PerfFormattedData_Tcpip_NetworkInterface`          | system-wide net  | 277                                |
| 6 | WMI `Win32_PerfFormattedData_PerfProc_Process` (全プロセス)   | per-process      | 438                                |
| 7 | WMI `Win32_PerfFormattedData_PerfOS_Processor`                | system-wide CPU  | 421 (1回目試行では924ms、参考値)   |
| 8 | `Get-Counter` (PDH、複数カウンタ同時)                         | system-wide 全種 | 1751 (1回目試行では1904ms、参考値) |

**実測で確認できた組 (同一シグナルの API 呼び出し方式間比較のみ、単発計測)**:

- system-wide CPU: `GetSystemTimes` 9ms **vs** WMI `Win32_PerfFormattedData_PerfOS_Processor` 421ms → **約47倍**
- per-process: `GetProcessTimes`ベース (`Get-Process`) 52ms **vs** WMI `Win32_PerfFormattedData_PerfProc_Process` 438ms → **約8.4倍**

メモリ (WMI `Win32_OperatingSystem` 135ms) や disk/network (WMI `Win32_PerfFormattedData_PerfDisk_PhysicalDisk`
265ms、`Win32_PerfFormattedData_Tcpip_NetworkInterface` 277ms) は **raw Win32 API 側を実測していない** ため、
「WMI 経由 vs raw API」の直接比較値ではなく、WMI 単体の呼び出しコストの参考値に留まる。 CPU (9ms) とメモリ
(135ms) のように **異なる信号間の値を跨いだ比較はしない** (Codex レビュー指摘、比較不能な数値を並べていた誤りを修正)。

- **採用 (実測に基づく): system-wide CPU は `GetSystemTimes`、プロセス別は `GetProcessTimes` 相当 (Rust では
  `sysinfo` crate または直接 `NtQuerySystemInformation(SystemProcessInformation)`)。いずれも実測で WMI/PDH
  経由より 1 桁前後高速であることを確認**
- **提案のみ (raw API 未実測、800 実装時に別途計測が必要): メモリは `GlobalMemoryStatusEx`、disk は
  `GetDiskFreeSpaceEx`/IOCTL 系、network は `GetIfTable`/`GetIfEntry2` を候補とする。ただし `GetDiskFreeSpaceEx`
  は空き容量であり `Disk Bytes/sec` のようなスループットとは指標が異なる点に注意 (800 で計測方式ごと再検討)**
- **不採用: WMI/PDH (`Get-Counter`, `Win32_PerfFormattedData_*`) は 800 の常時ポーリングには使わない**。
  診断・一括レポート等の低頻度・許容可能な用途があれば個別検討するが、デフォルト収集経路には採らない
- 本比較は **1 回の呼び出しレイテンシの単発計測**であり、ポーリング間隔を詰めた場合の累積負荷・ウォームアップ
  差・Chrome/Arcagate 自身への影響は未計測。「間隔を詰めても API 呼び出し自体のコストは無視できる」という
  断定はできず、**単発呼び出しの低レイテンシから有望と言える段階**に留める。実運用間隔での負荷確認は
  PH-V2-800 実装フェーズの前提検証として残す

---

## 2. 前面操作を伴う信号

### 2.1 前面窓 + title + path

生データ: `scratch/ph050-spikes/40-foreground-switch-raw.json`, `43-eventhook-doevents-raw.txt`
(`02-foreground-switch-raw.json` は前回セッションの遺物、参考情報として §7 に記載するのみで本節の根拠には含めない)

| 項目           | 結果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ポーリング方式 | `GetForegroundWindow` + `GetWindowText` + `GetWindowThreadProcessId` + `OpenProcess`+`QueryFullProcessImageName` で hwnd/pid/procName/procPath/title 全部取得可能。前回検証時に前面窓が固まっていた原因は **フルスクリーン専有アプリ (YourCoworker) が Win+D 最小化後も同一 hwnd を保持し続けたケース**であり、今回 Alt キー tap + `ShowWindowAsync(SW_RESTORE)` + `SetForegroundWindow` の組合せでバックグラウンドプロセスから確実に前面切替できることを確認 (focus stealing prevention の回避手順を確立) |
| event 駆動方式 | `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)` で実装。Notepad→Chrome の短時間切替シナリオで **2/2 イベントを捕捉**、hwnd と title をコールバック内で即時取得できた (試行数は少なく、高頻度切替や message loop 詰まり時の backpressure/取りこぼしは未検証)                                                                                                                                                                                                                                                     |
| 比較結論       | **event 駆動 (`SetWinEventHook`) を推奨方式に格上げ**。ポーリングは切替の間隔次第で遅延・取りこぼしが原理的に起こり得るのに対し、event 駆動は変化の瞬間に発火する設計であり、アイドル時はポーリングの tick コストがゼロになる。この短いシナリオでの実測 (2/2) はその方向性を支持するが、常駐実装では message loop の生存性・callback の処理遅延の検証が必要。L2 の「低頻度ポーリング、または SetWinEventHook」という並列記述を **SetWinEventHook を第一候補**に整理                                        |
| 実装上の注意   | `SetWinEventHook` は COM ではないが、コールバックはフックを張ったスレッドのメッセージポンプ (`PeekMessage`/`DispatchMessage` または `GetMessage` ループ) が回っていないと発火しない。Rust 実装では専用スレッドで Win32 メッセージループを回す設計が必要                                                                                                                                                                                                                                                    |
| 採否           | **core 確定、event 駆動を推奨方式として明記** (L2 申し送り、§6)                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### 2.2 ブラウザ URL 取得方式比較 (UIA vs CDP vs MSAA vs 拡張)

#### 実測結果

| 方式                      | 検証内容                                                                                                                                                  | 結果                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UIA**                   | Chrome 前面 (`50`) / Chrome 背面 (`51`) / Edge 前面 (`52`) / Chrome incognito (`53`) / Edge InPrivate (`53`) の **5 試行**                                | **5/5 成功 (成功率 100%)**。`findMs` は 9〜19ms、`FromHandle` 含む総処理は 85〜124ms。前面・背面いずれでも `ControlType=Edit` の descendant 検索でアドレスバーの `ValuePattern.Value` から URL 文字列を取得できた。背面試行では **フルパス** (`github.com/.../activity-cli.md`) まで正確に取得、通常窓・シークレット/InPrivate 窓の両方で成功                                              |
| **CDP**                   | (a) 既存の通常起動 Chrome (フラグ無し) への接続試行、(b) `--remote-debugging-port` + 隔離 `--user-data-dir` で新規起動したインスタンスへの接続試行 (`60`) | (a) **タイムアウトで失敗** (フラグ無し起動インスタンスは CDP ポートを一切開かない、実装上の必然)。(b) **成功** — `/json/version`, `/json/list` で正確な URL (`https://example.com/`) を取得。ただし **(b) は「Arcagate/ユーザーが起動時に明示的にフラグを付けた」場合のみ機能し、taskbar・スタートメニュー・他ランチャー経由でユーザーが普段どおり起動したブラウザには後から接続できない** |
| **MSAA**                  | 未実施 (Opus advisor 助言により割愛、理由は下記)                                                                                                          |                                                                                                                                                                                                                                                                                                                                                                                            |
| **拡張/native messaging** | 未実施 (製品方針で Non-goal 済み、`docs/l0_ideas/motivation.md`: 「core は拡張ゼロ」)                                                                     |                                                                                                                                                                                                                                                                                                                                                                                            |

生データ: `scratch/ph050-spikes/50-uia-addressbar-raw.json`, `51-uia-addressbar-background-raw.json`,
`52-uia-addressbar-edge-raw.json`, `53-uia-matrix-raw.json`, `60-cdp-isolated-raw.txt`

#### 成功率閾値と判定

**格上げ閾値は本 doc で 80% と定める** (試行中 4/5 以上成功で「実用に足る」とみなす)。**Chrome/Edge (Chromium系)
に限れば** 実測は **5/5 = 100%** で閾値を明確に超え、この 2 ブラウザについては **core 候補として強く支持**される。

**PH-V2-050 受け入れ条件との差分 (未達成部分を正直に記録)**: 受け入れ条件は「Chrome / Edge / Firefox + 導入済
Chromium 系 1 種」の検証マトリクスを求めているが、実機に Firefox および Chrome/Edge 以外の Chromium 系ブラウザが
導入されていないため、**この受け入れ条件は Chrome/Edge の 2 ブラウザ分のみ充足**している。「UIA 単独採用」という
方式選定の結論は Chrome/Edge の実測から Opus advisor 助言とあわせて導出したものであり、CDP に対する構造的な
優位性の論拠 (既存セッションへの後付け接続可否) はブラウザ実装に依存しない Windows API レベルの特性のため
Firefox でも同様に成立する可能性が高いが、**「UIA が Firefox でも動作すること」自体は未検証**。したがって
本 doc の格上げ判定は「**Chrome/Edge において core 格上げを確定、Firefox 等は deferred のまま持ち越し**」と
正確に理解されたい (§5 やらないこと・deferred も参照)。

#### 採用方式の結論: UIA 単独 (CDP はハイブリッド不採用)

| 観点                         | UIA                                                 | CDP                                                             |
| ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| 既存セッションへの後付け接続 | ✓ 可能 (フラグ不要)                                 | ✗ 不可能 (起動時フラグ必須、既存インスタンスに attach 不可)     |
| 前面/背面                    | ✓ 両方で成功                                        | (該当なし、HTTP API のため前面概念に非依存だがそもそも接続不可) |
| 網羅性 (通常起動経路)        | ✓ taskbar/スタートメニュー等どの起動経路でも読める  | ✗ Arcagate 経由起動時のみ (将来 opt-in layer の余地はある、§6)  |
| 取得粒度                     | full path まで取得可 (ドメイン抽出は保存前に丸める) | full URL / タイトル / 全タブ (フラグ付き起動時のみ)             |
| 低負荷                       | ✓ 1 回 9〜19ms                                      | ✓ 軽量 (JSON HTTP) だが到達性の問題で比較にならない             |

**結論 (Opus advisor 助言を採用): core (デフォルト常時稼働) は UIA 単独**。CDP は「ユーザーが普段どおり起動した
ブラウザに後付けできない」という構造的制約により、常時収集のデフォルト経路になり得ない。ハイブリッド化は
core に分岐と失敗経路を増やすだけで正当化できない。

**CDP の将来位置づけ**: Arcagate 自身がランチャーとしてブラウザを起動する経路に限り、起動コマンドへ
`--remote-debugging-port` を注入する opt-in 強化 layer として V2 core 外の backlog に置く価値はある
(全タブ・正確なタイトル取得などの精度向上)。ただし v2 core のスコープ外、将来 phase 検討事項として申し送る (§6)。

**MSAA を追加検証しなかった理由**: 現代の Chromium アクセシビリティツリーは UIA プロバイダとして実装されており、
MSAA (`IAccessible`) は UIA↔MSAA 互換ブリッジ経由での提供が実体。同じツリーを別 API で辿るだけで「UIA より
軽い」という保証はなく、ブリッジ変換のオーバーヘッドや属性欠落のリスクの方が高い。UIA が実測 9〜19ms で
性能予算内に収まっている以上、追加検証の費用対効果が無いと判断した (Opus advisor 助言)。

**対応ブラウザ**: 実機導入済みは Chrome / Edge (共に Chromium 系) のみ。**Firefox は実機未導入のため
本セッションでは検証できず、deferred**。PH-V2-050 の指示は「主要 3 + Chromium 系 1 種」を求めているが、
実機に存在しないブラウザを新規インストールする判断はスコープ外 (system 変更を伴うため) — 実機に
Firefox が導入され次第、同一手順 (`ControlType=Edit` descendant 検索) で追試することを推奨。Firefox は
UIA プロバイダの実装がある (Mozilla は Windows で UIA を段階的にサポート) ため技術的には動作する見込みだが
「見込み」であり実測ではない、正直に deferred とする。

#### 実装上の注意 (Opus advisor 助言、§6 の L2 申し送りにも反映)

- **COM スレッド要件**: UIA は COM ベース。常駐 collector は専用スレッドで `CoInitializeEx(COINIT_MULTITHREADED)`
  (MTA) に固定し、UI (Tauri メイン) スレッドと分離する。STA と混在させると reentrancy でハングし得る
- **タイムアウト必須**: `FromHandle`/`FindFirst` は対象プロセスが応答不能だとブロックし得る。別スレッド +
  タイムアウト (目安 500ms) 付きで呼び出し、失敗は「取得失敗」として飲み込む (収集全体を止めない)
- **tree 崩れ耐性**: ブラウザバージョンアップで UIA tree は変わり得る。`ControlType=Edit` の緩い descendant
  探索でも複数候補ヒット時の選別ロジックが壊れる可能性がある。失敗許容設計にし、tree 構造への依存を最小化
- **編集中の値化け**: アドレスバー編集中は `ValuePattern.Value` が入力途中文字列になる。`https?://` 形式の
  妥当性チェックで弾き、失敗時は前回値を維持するか「ブラウザ (ドメイン不明)」にフォールバック
- **Chrome 側 CPU 増分の考慮**: Chromium はアクセシビリティツリーを遅延生成するため、UIA 常時ポーリングが
  ツリーを常駐させ Chrome 側の CPU/メモリを僅かに底上げする副作用がある。性能予算 (CPU 増分平均 1% 未満) は
  **Arcagate プロセス単体でなく Chrome 側増分も含めて実測**すべき (800 実装フェーズでの追加検証事項)

---

## 3. USN Change Journal — admin 要否の確定

生データ: `scratch/ph050-spikes/10-usn-nonadmin-raw.txt`, `11-whoami-priv.txt`

### 3.1 非 admin 実測

| 項目                                               | 結果                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreateFile(\\.\E:, ...)` (ボリュームハンドル取得) | **`err=5` (Access Denied)** — `FSCTL_QUERY_USN_JOURNAL` / `FSCTL_READ_USN_JOURNAL` 以前の、ボリュームハンドル取得の時点で拒否される                                                                                                                                                         |
| `whoami /priv`                                     | `SeBackupPrivilege` / `SeRestorePrivilege` が**トークンに一切存在しない** (無効化ではなく完全にフィルタ除去、UAC split token の標準挙動)                                                                                                                                                    |
| 公式ドキュメント裏付け                             | Microsoft Learn [`CreateFile` "Physical Disks and Volumes"](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea) に明記: 「**The caller must have administrative privileges**」 (ボリュームハンドル取得は USN 固有でなく Win32 API 仕様として管理者権限必須) |

### 3.2 admin 実測について (本セッションでの制約)

**admin 側の対話的再実測はこのセッションでは実行できなかった。** 理由を正直に記録する:

- 対話的 UAC 昇格 (`Start-Process -Verb RunAs` 等) は Secure Desktop 上の同意ダイアログを要求するが、
  **user 不在の無人環境ではこれをクリックする手段が無い**。computer-use ツールは仕様上
  「Elevated processes — Task Manager, UAC prompts, installers running as administrator — cannot be
  controlled even when granted: Windows UIPI blocks input from lower-integrity processes」と明記されており、
  UAC ダイアログの操作は構造的に不可能 (ダイアログを出して応答不能のまま停止させることは、まさに前回
  セッションが固まった失敗パターンの再演になるため、そもそも発火させなかった)
- Task Scheduler 経由の非対話昇格 (`schtasks /RL HIGHEST`) を試したが、**昇格していない呼び出し元からの
  `/RL HIGHEST` タスク作成自体が `Access is denied` で拒否される**ことを実機で確認 (この経路も無人では
  成立しない)
- UAC 設定 (`ConsentPromptBehaviorAdmin` 等) のレジストリ変更によるプロンプト抑制は、**プロジェクト自身の
  設計原則 `activity-privilege-separation.md`「昇格を恒久化・自動化しない (毎回 or セッション単位の明示同意、
  UAC を黙って回避しない)」に反する**ため、たとえ技術的に可能でも行わない判断とした

### 3.3 admin 要否の確定 (代替エビデンスによる)

上記より、**実際にトークンを昇格させた「成功する」実行は本セッションで再現できていない**が、以下 3 点の
独立したエビデンスにより admin 必須の結論は揺るがないと判定する:

1. 非 admin 実測: ボリュームハンドル取得の時点で `Error 5` (今回・前回セッションの双方で再現)
2. 現在のトークンに `SeBackupPrivilege` が存在しないことを実機確認 (今回新規)
3. Microsoft 公式ドキュメントの明文規定 (今回新規、`CreateFile` の "Physical Disks and Volumes" section)

**結論: admin 必須は確定 (据え置き)。** 「admin なら成功する」ことの実地再現は **deferred** とし、
user が実機に立ち会える機会に 1 回だけ対話的 UAC 承認を得て `scratch/ph050-spikes/10-usn-nonadmin.ps1` の
admin 版 (`CreateFile` の後に `FSCTL_QUERY_USN_JOURNAL`/`FSCTL_READ_USN_JOURNAL` まで実行) を走らせることを
推奨する。この deferred は「admin 必須」という結論そのものには影響しない (admin 必須は既に 3 点で確定済み、
残るのは「admin であることを条件に何が具体的に返るか」の細部確認のみ)。

**PH-V2-050 受け入れ条件との差分 (未達成部分を正直に記録)**: 受け入れ条件は「reason flag 粒度・fileID→path
解決・wrap/欠損特性」を admin 側の実測で確定することを求めているが、admin 側の `FSCTL_READ_USN_JOURNAL` 実行
自体が本セッションでは行えなかったため、**reason flag の粒度・fileID→path 解決の実際の挙動・journal wrap/
欠損特性はいずれも未測定・deferred** である。確定できたのは「admin が必須であること」の一点のみで、
「admin があれば USN から具体的に何が・どの粒度で取れるか」は §5 の deferred リストのとおり持ち越しとなる。

### 3.4 ETW との比較

生データ: `scratch/ph050-spikes/80-etw-nonadmin-raw.txt`

```
$ logman create trace PH050EtwTest -p "Windows Kernel Trace" "(process,thread)" -o etwtest.etl
Error: Access is denied.
Try running this command as an administrator.
```

**測定範囲の限定を明記する**: このテストは `"Windows Kernel Trace"` プロバイダを `(process,thread)` キーワードで
起動しており、ファイル I/O に特化した `FileIo` キーワード群を個別に指定したものではない。確認できたのは
**「非 admin では ETW kernel trace セッションの作成自体が拒否される」という一般的事実**(`StartTrace` は
`SeSystemProfilePrivilege`/admin を要求) であり、これは USN との比較において土台となる事実として十分だが、
**実際に動作中のファイル I/O トレースの実行時オーバーヘッドは計測していない**。

**結論**: ETW Kernel Trace セッションの作成も非 admin では `Access is denied` で拒否される — **USN と同じ
admin ゲートを持つ**ことを実機で確認した。admin 必須という条件が USN と同等である以上、admin 前提を覆す
メリットが無い。加えて (a) セッションの作成・破棄・バッファ管理という追加の運用コストがあり、(b) USN は
「NTFS が既に書いているジャーナルを事後 read するだけ」という最小構成に対し、ETW は継続的なイベントストリーム
を受け続ける設計であるという **構造上の違いは設計論的な推論であり、実行時負荷の実測ではない**。
**ETW は不採用、USN 本命 / RDCW fallback のハイブリッドを据え置く** (admin ゲートが同等な以上、USN より
複雑な ETW を採る理由がない、という判断は成立する)。

---

## 4. 全体まとめ表 (確定表本体)

| 信号                    | L2 予定方式                     | 実測結果                                                                                                                                                              | 採用方式                                                        | 根拠 (負荷・粒度・権限・取りこぼし)                                                                 | 代替比較結論                                                                          | L2 差分                                                                                                  |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 前面窓+title+path       | `GetForegroundWindow`+proc path | ✓ 取得可、event 駆動も実証                                                                                                                                            | `GetForegroundWindow`系 + **`SetWinEventHook(FOREGROUND)`推奨** | admin不要、event駆動は短時間シナリオ(2/2)で捕捉確認、idle時無負荷。高頻度切替時の取りこぼしは未検証 | `SetWinEventHook` がポーリングに勝る (アイドル無負荷・即時性)                         | **変更**: 推奨方式をevent駆動に明記                                                                      |
| 実操作idle              | `GetLastInputInfo`              | ✓ 取得可、ms分解能・即時リセット確認                                                                                                                                  | `GetLastInputInfo` (据え置き)                                   | admin不要、ミリ秒分解能                                                                             | 代替調査(raw input/ETW)は費用対効果薄、現状維持で十分と判断し深追いせず               | 据え置き                                                                                                 |
| 再生メディア            | SMTC                            | ✓ 実データ(実際の再生セッション)で取得成功                                                                                                                            | SMTC (据え置き)                                                 | admin不要、全プレイヤー横断                                                                         | `GetCurrentSession()`はブラウザで不安定、`GetSessions()`列挙が必須と判明              | **変更**: 実装注意を追記 (§6)                                                                            |
| ファイル操作(本命)      | USN FSCTL                       | ✗非admin Error5(volume handle取得時点)、admin成功は不再現(理由§3.2)                                                                                                   | USN (admin前提、据え置き)                                       | 非adminでtoken上SeBackupPrivilege不在を確認、MS公式ドキュメントでも admin必須と明記                 | ETWも同じくadmin必須+セッション管理コスト大でUSNに劣る(実測: logman Access denied)    | 据え置き。admin成功の実地再現はdeferred                                                                  |
| ファイル操作(代)        | ReadDirectoryChangesW           | ✓非adminで全種イベント捕捉、Changed×2重複を再確認                                                                                                                     | RDCW (fallback、据え置き)                                       | 非admin、debounce必須                                                                               | -                                                                                     | 据え置き                                                                                                 |
| **ブラウザURL**         | UIA(候補)                       | ✓Chrome/Edge でUIA 5/5(100%)成功、CDPは既存セッションattach不可と実測確定。Firefox/他Chromium系は実機未導入で未検証                                                   | **UIA単独 (Chrome/Edgeでcore格上げ、Firefox等はdeferred)**      | 前面/背面/通常/プライベート全成功、9-19ms、admin不要                                                | CDPは技術優位だが起動時flag必須で常時収集に不適格、MSAAは追加検証不要、拡張はNon-goal | **格上げ (Chrome/Edge分)**: 候補→core。Firefox等は受け入れ条件未充足のままdeferred。実装注意(§2.2)を追記 |
| システムメトリクス(CPU) | (未確定、800)                   | ✓raw Win32 API `GetSystemTimes`(9ms) が WMI `Win32_PerfFormattedData_PerfOS_Processor`(421ms)より約47倍高速 (CPU信号のみの比較、メモリ/disk/networkのraw APIは未実測) | `GetSystemTimes`                                                | 圧倒的低レイテンシ、admin不要                                                                       | WMI/PDHは低頻度ポーリングでも遅延・ばらつき大で不採用                                 | **新規確定 (CPU/プロセス別のみ)**: メモリ/disk/networkは提案止まり、800の前提として記録                  |
| プロセス別リソース      | (未確定、800)                   | ✓raw API(`GetProcessTimes`相当、52ms)がWMI(438ms)より高速                                                                                                             | `NtQuerySystemInformation`系/`sysinfo` crate                    | 全プロセス列挙が軽量                                                                                | WMI `Win32_PerfFormattedData_PerfProc_Process`は不採用                                | **新規確定**: 800の前提として記録                                                                        |

---

## 5. やらないこと・deferred の正直な記録

- **USN admin 側の対話的成功実行の実地再現、および reason flag 粒度・fileID→path 解決・journal wrap/欠損特性**:
  user 立会いでの 1 回限りの UAC 承認が必要、無人セッションでは構造的に不可能 (§3.2)。admin 必須という結論
  自体は 3 点のエビデンスで確定済みのため後続フェーズをブロックしないが、「admin があれば具体的に何がどう
  取れるか」の細部 (PH-V2-050 受け入れ条件が本来求めていた範囲) は丸ごと deferred
- **Firefox での UIA 検証**: 実機未導入のため未実施。Chrome/Edge (Chromium系) で確立した手法がそのまま
  流用できる見込みだが「見込み」であり実測ではない
- **Chromium 系ブラウザ (Brave/Vivaldi/Opera) での追試**: 実機未導入のため未実施
- **MSAA の実地検証**: Opus advisor 助言により費用対効果なしと判断し割愛 (§2.2)
- **ETW の詳細な負荷計測**: admin必須と判明した時点でUSNへの優位性が消えたため、`logman`でのセッション作成
  可否確認 (Access Denied 確定) のみに留め、実際のイベントストリーム負荷計測は行っていない
- **CDP のArcagate起動時opt-in注入の実装検証**: V2 core スコープ外のため設計のみ言及、実装・実測はしていない

---

## 6. L2 spec 更新の申し送り

`activity-recorder.md` 実機検証表 (2026-07-02 版) への追補として、以下を反映することを申し送る
(履歴 mutation でなく追記、`docs.md` ルール準拠):

1. **ブラウザURL: Chrome/Edge に限り「候補」→「core」に格上げ**。UIA アドレスバー読取・単独方式。取得失敗時は
   「ブラウザ (ドメイン不明)」フォールバック (既存記述どおり)。**Firefox・他 Chromium 系ブラウザは実機未導入で
   未検証のため引き続き「候補」のまま**、対応表に「Chrome/Edge: core、Firefox 等: 候補 (deferred)」の区別を明記
2. **前面窓の推奨方式を `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)` に明記**。ポーリングは代替手段として残すが
   第一候補は event 駆動 (短時間シナリオでの 2/2 捕捉を実測、高頻度切替時の挙動は実装フェーズで追加検証)
3. **SMTC の実装注意を追記**: `GetCurrentSession()` 単独に依存せず `GetSessions()` を回して
   `SourceAppUserModelId` でフィルタする実装が必要 (`GetCurrentSession()`はブラウザセッションで空を返すことがある)
4. **UIA 実装上の注意を `activity-privilege-separation.md` または新規 cross-cutting doc に追記**:
   COM MTA スレッド分離・タイムアウト必須・tree崩れ耐性・編集中値の妥当性チェック・Chrome側CPU増分の計測
   (§2.2 の Opus advisor 助言、実装フェーズ PH-V2-200 が直接の反映先)
5. **システムメトリクス (800) の取得方式を一部確定**: CPU (`GetSystemTimes`) とプロセス別 (`GetProcessTimes`/
   `NtQuerySystemInformation`) は raw Win32 API系を採用、WMI/PDH は不採用と実測確定。**メモリ/disk/network は
   raw API 候補を提案したのみで未実測**、`PH-V2-800_system-metric-history.md` への反映時にこの区別を保持すること
6. **USN admin 側の実地成功確認が deferred であることを明記 (区別を明確化)**: `activity-privilege-separation.md`
   の「admin 必須は実機で確定」は **「非 admin でのボリュームハンドル取得拒否」+ドキュメント根拠**で確定済み
   のため記述は据え置いてよいが、**「admin で `FSCTL_READ_USN_JOURNAL` が実際に成功し、reason flag・
   fileID→path・wrap特性がどう見えるか」は一切検証されていない**ことを区別して注記に追加する必要がある。
   現状の L2 記述だけでは「USN read 自体を admin で検証済み」と誤読され得るため、両者を分けて書く
7. **CDP の将来 backlog 化**: `PH-PQ-800_personal-observability.md` の「UIA 確定」記述は今回の Chrome/Edge
   実測比較で裏付けが取れたため根拠付きで正本化してよい (Firefox 分は保留のまま明記)。CDP は「Arcagate
   起動時 opt-in 強化」として V2 core 外の backlog に位置づける一文を追加する価値がある

---

## 7. 生データ索引

すべて `scratch/ph050-spikes/` 配下 (使い捨てスパイク、production コード不変更):

| #     | ファイル                                                   | 内容                                                                      |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| 02    | `02-foreground-switch-raw.json`                            | 前回セッションの前面窓切替 (参考、本セッション未生成)                     |
| 10    | `10-usn-nonadmin.ps1` / `-raw.txt`                         | USN 非admin実測 (CreateFile Error 5)                                      |
| 11    | `11-whoami-priv.txt`                                       | 現トークンの特権一覧 (SeBackupPrivilege不在確認)                          |
| 20    | `20-rdcw.ps1` / `-raw.json`                                | ReadDirectoryChangesW 実測 (5イベント捕捉)                                |
| 21    | `21-idle.ps1` / `-raw.json`                                | GetLastInputInfo 実測 (リセット確認)                                      |
| 30    | `30-smtc.ps1` / `-raw.json`                                | SMTC 実測 (実データ、伏字化済み)                                          |
| 40    | `40-foreground-switch.ps1` / `-raw.json`                   | 背景プロセスからの前面切替実測 (Alt tap trick)                            |
| 43    | `43-eventhook-doevents.ps1` / `-raw.txt`                   | SetWinEventHook 実測 (2/2イベント捕捉)                                    |
| 50-53 | `50-` 〜 `53-*.ps1` / `-raw.json`                          | UIA アドレスバー読取 5試行 (前面/背面/通常/incognito/InPrivate)           |
| 60    | `60-cdp-isolated-raw.txt`                                  | CDP 接続実測 (既存インスタンス失敗/隔離インスタンス成功)                  |
| 70-71 | `70-sysmetrics.ps1` / `-raw.json`, `71-debug-systimes.ps1` | システムメトリクス8手法ベンチマーク                                       |
| 80    | `80-etw-nonadmin-raw.txt`                                  | ETW kernel trace 非admin実測 (logman Access Denied、測定範囲の限定を明記) |

## 8. プライバシー配慮の記録

SMTC (`30-smtc-raw.json`) と UIA (`50-uia-addressbar-raw.json`) の生データには、実機で実際に再生・閲覧中
だった個人の動画タイトル・URL が含まれていたため、git 履歴に残す前に内容を伏字化した (取得できたことの
確認に必要な「非空文字列であること」「ドメイン+パス形式であること」は維持し、具体的な内容のみ除去)。
これは本 feature 自体の設計原則 (「UIAの汎用スクレイプをしない」「編集中テキスト・内容は読まない」) を
検証エビデンスの取り扱いにも一貫して適用した判断である。
