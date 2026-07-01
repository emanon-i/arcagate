---
id: PH-V2-200
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-200: 非特権 recorder (窓 / 実操作 / メディア)

## 目的

admin を要さない 3 信号 — 前面窓 / 実操作 (放置 vs 能動) / 再生メディア — を **低負荷で**収集し、
統合ストア (100) に流し込む収集エンジンを立てる。実機検証 (activity-recorder.md 2026-07-02 表) で
非 admin 取得可を確認済みの信号だけを本フェーズの core にする。ファイル操作は権限が絡むため 300 に分ける。

## スコープ

### やること

- `src-tauri/src/recorder/` を新設 (`watcher/` の兄弟)。**opt-in が ON の時のみ起動**する gate を最初から持つ
- **前面窓**: `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)` で前面変化時のみ発火 (または低頻度ポーリング)。
  プロセス名 + 実行イメージパス + タイトルを取得。実行イメージパスは item 照合キー (400) になるので必ず取る
- **実操作 (放置 vs 能動)**: `GetLastInputInfo` を数秒間隔で読み、一定時間 入力なしを AFK 判定して
  アクティブ時間から除外。**メディア再生中は「視聴」として救済**する (ActivityWatch の「動画視聴が
  AFK 化する」欠陥を潰す)
- **再生メディア**: Windows SMTC (`GlobalSystemMediaTransportControlsSessionManager`) をイベント購読。
  全プレイヤー横断で 曲/動画のタイトル・アプリを取得 (ポーリング不要)
- **取得品質の集計**: SMTC / 前面窓の取得成否を recorder が集計し、データ品質指標に渡す (画面の品質メーター用)。
  失敗を黙って捨てず「静かな劣化」にしない
- **privacy config substrate の確立**: opt-in / 除外リスト (アプリ / ドメイン / タイトルパターン) /
  タイトルマスクの config キー (既定 OFF)・schema・read API を、本フェーズで既存 config-service 上に
  立てる (700 の設定 UI 完成を待たずに substrate が揃う。UI は 700 が後から載せる)
- **除外・マスクの収集時適用**: 上記 config を recorder が**収集時点で**適用し、除外対象は保存せず、
  マスク時はタイトルを落としてプロセス名のみ保存する (プライバシーを表示層でなく収集層で守る)
- 収集結果は 100 の service 経由で `activity_event` に write (repository 直呼び禁止)

### やらないこと

- **キー内容を記録しない** — 実操作は打鍵/移動の「量」の集計のみ。キーストローク内容を取った瞬間に
  キーロガーになる (絶対禁止)。低レベルフック (`WH_KEYBOARD_LL`) を使わない
- **ファイル操作を収集しない** — USN / RDCW は権限が絡むため PH-V2-300
- **ブラウザ URL の採否は Phase 0 (050) に従う** — unlocked 再検証と採用方式決定は 050。050 が候補据え置きと
  判定した信号を本フェーズで先取り実装しない (格上げ判定が出た場合のみ採用方式で実装)
- **UIA の汎用スクレイプをしない** — 編集中テキスト・メール本文・chat 内容を読まない
- **常時ポーリング / ハッシュ / 全走査をしない** — 負荷制約 (REQ-20260702-003) 違反

### ブラウザ URL の扱い (Phase 0 の判定に従う)

ブラウザ URL の unlocked 再検証と採用方式 (UIA / 各ブラウザ automation・a11y の比較) は **PH-V2-050 で
決着させる**。本フェーズは 050 の確定表に従い、**core 格上げなら**その採用方式で実装、**候補据え置きなら**
着手しない。格上げ時は per-browser adapter (Chrome / Edge / Firefox + Chromium 系流用)・取得失敗時
「ブラウザ (ドメイン不明)」フォールバック・ドメイン粒度のみ保存 の方針を activity-recorder.md から引く。
050 の判定が出るまで 200 の core は窓 / 実操作 / メディアの 3 信号に固定する。

## 依存

- 先行: PH-V2-050 (窓 / 実操作 / メディアの採用取得方式を確定表から受ける) / PH-V2-100 (書き込み先の store)
- 後続: 400 (窓イベントを item 照合に使う) / 600 (画面表示) / 700 (opt-in gate・低負荷検証を集約)

## 受け入れ条件 (機械検出)

- [ ] recorder の**通常収集は opt-in ON 時のみ起動**、OFF 時はスレッドを立てない (状態確認テスト)。
      700 の 30 秒テスト記録は一時テスト同意で ephemeral バッファにのみ書き、`activity_event` に
      永続しない (通常収集 gate と両立)
- [ ] idle / AFK 検出が `GetLastInputInfo` で動作し、一定時間 入力なしがアクティブ時間から除外される。
      メディア再生中の AFK は「視聴」として救済される (テストで区間判定を検証)
- [ ] 前面窓の取得でプロセス名 + **実行イメージパス** + タイトルが `activity_event` に記録される
- [ ] SMTC で複数プレイヤー横断のメディア取得が動作 (再生中に app/title を取得、停止中は 0 session)
- [ ] SMTC / 前面窓の取得成否が集計され、データ品質指標に渡る (400/600 が読める形)
- [ ] **低負荷**: recorder 稼働中の CPU 使用率増分が実測で平均 1% 未満 (REQ-20260702-003)。
      実 target・実 disk で計測 (`perf-audit-before-measure`)
- [ ] キーストローク内容・低レベルフックがコードに存在しないことを grep audit で確認
- [ ] 除外リスト対象 (アプリ / ドメイン / タイトルパターン) が収集時点で落とされ保存されない。タイトル
      マスク ON で `activity_event.title` が保存されずプロセス名のみ記録される

## 検証方針

- CPU 増分は agent dev で実機常駐させ、実操作・実メディア再生を伴う現実的シナリオで計測
  (idle 固定でなく能動シナリオ。fixture warm 計測の再現漏れを避ける)
- AFK / 視聴救済は、入力途絶 + メディア再生の合成シナリオで区間ラベルを検証
- 品質指標は SMTC 非対応プレイヤー / 取得失敗を意図的に起こし、失敗率が集計に反映されることを確認

## リスク

- **観測で重くなる**: ポーリング頻度・ロック粒度が甘いと負荷制約を割る → イベント駆動 (WinEventHook /
  SMTC 購読) を優先、tick 読取は低頻度。event handler 内で AppServices lock を取り同期 write (folder-watch 同様)
- **SMTC の取得ムラ**: 非対応プレイヤーで曲が取れない → 失敗を品質指標に出し、静かな劣化にしない
- **AFK の誤判定**: 動画視聴を離席と誤る → メディア再生中の視聴救済を core 要件として固定

## 横展開

- recorder は watcher と同じく opt-out 可能・低負荷 (「観測で重くなる」を防ぐ)
- 実行イメージパスの正規化 (大文字小文字 / 環境変数展開 / symlink) は 400 の照合キーと同じ規則を使う
  (200 で取り 400 で照合するため、正規化ポリシーを 400 と揃える)
- i18n: メディア / 状態の文言は ja / en 同時 (700 の parity ゲート、`do-it-now-philosophy`)

## 参照

- 正本: [`activity-recorder.md`](../../l2_foundation/features/backend/activity-recorder.md) (実機検証表 / 手法 / 性能予算)
- 非機能: [`vision.md`](../../l1_requirements/vision.md) REQ-20260702-003 / §4 (CPU 増分 < 1%)
- 兄弟: `src-tauri/src/watcher/` (notify 駆動の per-root watcher)
- Windows SMTC: [SystemMediaTransportControls](https://learn.microsoft.com/en-us/uwp/api/windows.media.systemmediatransportcontrols)
