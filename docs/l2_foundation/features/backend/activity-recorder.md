# Activity Recorder Service

> backend feature (V2) / レイヤー: recorder thread → service → repository → SQLite
> 兄弟: [Folder Watch](./folder-watch.md) (notify 駆動) に対し recorder は定期ポーリング + イベント購読のハイブリッド

## 目的

パーソナル活動トラッカー (V2) の収集エンジン。 前面窓 / 実操作 (放置 vs 能動) / 再生メディア / ファイル操作を **低負荷で**サンプリングし、 統合時系列 ([Activity Store](./activity-store.md)) に流し込む backend feature。 「起動後の時間」 を記録し、 後から path 経由で振り返れるようにする。 収集は opt-in が ON の時のみ起動する。

## 実機検証済みの取得可否 (2026-07-02, user Windows 実機・非 admin)

推測で仕様を固めず、 各信号を実機スパイクで裏取りした結果を core 判定の根拠とする:

| 信号             | 手法                                      | 実機結果                                                    | admin  | 採否         |
| ---------------- | ----------------------------------------- | ----------------------------------------------------------- | ------ | ------------ |
| 実操作 idle      | `GetLastInputInfo`                        | ✓ idle_ms 取得 (最終入力からの経過)                         | 不要   | **core**     |
| 前面窓           | `GetForegroundWindow`+proc path           | ✓ hwnd / pid / proc / **実行イメージパス** / title 取得     | 不要   | **core**     |
| 再生メディア     | SMTC `...SessionManager.RequestAsync`     | ✓ API 成功 (停止中は session 0、 再生時に app/title/artist) | 不要   | **core**     |
| ファイル操作     | USN `FSCTL_READ_USN_JOURNAL`              | ✗ 非 admin は **Error 5 Access denied** → **admin 必須**    | **要** | **core**     |
| ファイル操作(代) | ReadDirectoryChangesW (FileSystemWatcher) | ✓ 非 admin で Created/Changed×2/Renamed/Deleted 全捕捉      | 不要   | **fallback** |
| USN メタ         | `FSCTL_QUERY_USN_JOURNAL`                 | ✓ 非 admin で Journal ID / Max Size 32MB / version 2-4 取得 | 不要   | 補助         |
| ブラウザ URL     | UIA アドレスバー                          | 実機ロック中で未検証 (要 unlocked browser 再検証)           | 不要   | **候補**     |

→ ファイル操作の「実レコード読取」 は **admin 必須**であることが実機で確定。 これが [権限分離](../cross-cutting/activity-privilege-separation.md) の設計根拠。 ブラウザ URL は core に含めず候補扱いとし、 unlocked browser での再検証を経てから確定する (§やらないこと)。

## やること (必要処理)

- `src-tauri/src/recorder/` を新設 (watcher の兄弟)。 opt-in ON 時のみ起動
- **前面窓**: 低頻度ポーリング、 または `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)` で前面変化時のみ発火。 プロセス名 + 実行イメージパス + タイトルを取得
- **実操作 (放置 vs 能動)**: `GetLastInputInfo` を数秒間隔で読み、 一定時間 入力なしを AFK 判定してアクティブ時間から除外。 二値 AFK だけでなく、 メディア再生中は「視聴」 として救済する (ActivityWatch の「動画視聴が AFK 化する」 欠陥を潰す)
- **再生メディア**: Windows SMTC (`GlobalSystemMediaTransportControlsSessionManager`) をイベント購読。 全プレイヤー横断で 曲/動画のタイトル・アプリを取得 (ポーリング不要)
- **ファイル操作**: 収集は [権限分離](../cross-cutting/activity-privilege-separation.md) の特権コンポーネントが担う。 admin があれば **USN Change Journal** を定期バッチ read (create/edit/delete/rename の reason flag + file reference)。 admin が無ければ **ReadDirectoryChangesW (notify crate)** で監視フォルダ集合を watch (fallback)
- **fileID → path 解決**: USN は file reference number を返すため、 親ディレクトリ参照を辿ってフルパスを再構成する解決マップを保持
- 取得の成否 (SMTC / 前面窓 / URL の成功率) を recorder が集計し、 データ品質指標に渡す ([Activity 画面](../../screens/activity.md) の品質メーター用)

## やらないこと (禁止 / scope 外)

- **キー内容を記録しない** — 実操作は「打鍵/移動の量」 の集計のみ。 キーストローク内容を取った瞬間にキーロガーになる (絶対禁止)
- **収集コンポーネントに実行能力を持たせない** — recorder / 特権 collector はプロセス起動・スクリプト実行をしない (読むだけ)
- **UIA の汎用スクレイプをしない** — 取得対象は「ブラウザ URL + 既知アプリのドキュメント名」 の小集合に限定。 編集中テキスト・メール本文・chat 内容は読まない
- **ブラウザ URL を実機再検証前に core としない** — 本 doc の実機表で「未検証」。 unlocked browser で UIA アドレスバー取得を確認するまで候補扱い、 取得失敗時は「ブラウザ (ドメイン不明)」 フォールバック
- **polling + hash / 全走査 / 低レベルフック (WH_KEYBOARD_LL) / 常時 ETW file trace をしない** — 負荷制約違反 (§性能予算)
- **外部送信しない** — 収集データはローカル SQLite に閉じ、 telemetry / crash 報告に混ぜない
- Modify の内容 diff は取らない (USN も「変更が起きた事実と種別」 のみ)

## 性能予算

- **一級制約: 稼働中の CPU 使用率増分 平均 1% 未満** (REQ-20260702-003)。 実機検証で選んだ手法はいずれも「イベント駆動 or tick 1 回読むだけ」:
  - `GetLastInputInfo` = tick 取得のみ、 フック不要
  - SMTC = event 購読、 ポーリング不要
  - `SetWinEventHook(FOREGROUND)` = 前面変化時のみ発火
  - **USN = NTFS が既に書くジャーナルを後から read するだけ**、 per-file hash も全走査も無し (負荷ほぼゼロ)
- recorder は interval poll 型で低頻度。 event handler 内で AppServices lock を取り同期 DB write ([Folder Watch](./folder-watch.md) と同様)
- ReadDirectoryChangesW fallback は固定バッファが溢れると `ERROR_NOTIFY_ENUM_DIR` で取りこぼす → 監視対象を絞り、 溢れ時は対象ディレクトリを再列挙して補正 (実測で Changed が重複するため debounce も要る)

## 副作用 (state 変化 / persistence)

- [Activity Store](./activity-store.md) の時系列テーブルへ write (activity event / media / file event)
- 取得成功率をデータ品質指標として保持
- opt-in / 除外設定は config に依存 (recorder は設定 ON 時のみ稼働)

## 依存

- Win32: `GetLastInputInfo` / `GetForegroundWindow` / `SetWinEventHook` / USN FSCTL (`FSCTL_QUERY_USN_JOURNAL` / `FSCTL_READ_USN_JOURNAL`)
- WinRT: `Windows.Media.Control` (SMTC)。 Rust は `windows` crate
- crate: `notify` (ReadDirectoryChangesW fallback、 既存 folder-watch と共有)
- feature: [Activity Store](./activity-store.md) (書き込み先) / [権限分離](../cross-cutting/activity-privilege-separation.md) (特権 collector) / [Activity 画面](../../screens/activity.md) (表示) / [Security Model](../cross-cutting/security-model.md)
- 兄弟: [Folder Watch](./folder-watch.md) (notify 駆動の per-root watcher)

## 既知の判断

- **AFK は `GetLastInputInfo` 方式** (ActivityWatch と同方式)。 マウス移動量の自前積分はしない (OS 標準 API のみでシンプル・軽量)
- **ファイル操作は USN 本命 / RDCW fallback のハイブリッド**。 USN は最低負荷だが admin 必須 (実機で Error 5 確定)、 RDCW は非 admin だが高負荷時取りこぼし。 admin 有無で分岐する
- **ブラウザ URL は候補**。 実機ロック中で未検証のため、 core 5 信号 (窓/実操作/メディア/ファイル操作) を先に固め、 URL は unlocked 再検証後に格上げ判断
- opt-in が OFF の間は recorder スレッドを起動しない (プライバシー・負荷の両面)
