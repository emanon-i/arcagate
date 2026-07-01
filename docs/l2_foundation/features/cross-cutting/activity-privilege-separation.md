# Activity Privilege Separation

> cross-cutting (V2) / 特権収集コンポーネントと非特権 UI/launcher の分離・信頼境界
> 関連: [Security Model](./security-model.md) / [Activity Recorder](../backend/activity-recorder.md)

## 目的

活動トラッカーのファイル操作フル捕捉には管理者権限が要る (USN Change Journal の実レコード読取は **実機で非 admin は `Error 5 Access denied`**、 2026-07-02 検証)。 だが Arcagate 本体は「任意の .exe / スクリプト / コマンドを起動する」 ツールであり、 injection と任意実行が最大の攻撃面 ([Security Model](./security-model.md))。 **特権と任意実行が同一プロセスに同居すると、 攻撃者が特権で任意コードを実行する踏み台になる**。 これを構造で断つのが本 feature — 特権は「読むだけ・実行能力ゼロ」 の収集コンポーネントに閉じ込め、 実行機能は非特権のまま分離する。 最小権限。

## やること (必要処理)

- **2 プロセスに分離**する信頼境界を定める:

| コンポーネント                | 権限         | できること                                                  | できないこと (構造で禁止)                    |
| ----------------------------- | ------------ | ----------------------------------------------------------- | -------------------------------------------- |
| **特権 collector**            | admin (昇格) | USN journal を read、 file_event を DB/IPC へ渡す           | プロセス起動・スクリプト実行・任意 path 書込 |
| **非特権 本体 (UI/launcher)** | 通常         | UI 描画、 item 起動、 非 admin 信号 (窓/入力/メディア/RDCW) | USN の直接 read (admin が無い)               |

- **collector は読取専用・no-exec**: collector バイナリは USN FSCTL とファイル参照解決の API しか呼ばない。 `Command` / `CreateProcess` / shell 呼び出しを **リンクすらしない** (コードに存在させない = 乗っ取られても実行に使えない)
- **IPC 境界を一方向・型付きに絞る**: collector → 本体 の通信は「file_event (path / kind / ts) の構造化メッセージ」 のみ。 本体 → collector は「開始/停止/対象ボリューム」 程度の限定コマンド。 collector が本体から任意のコマンド文字列・path・実行指示を受け取れないようにする (信頼境界)
- **collector の入力を信頼しない**: 本体は collector から受けた path を、 表示/保存前に検証 (制御文字拒否・正規化)。 collector から来た値で launcher を起動する経路を作らない
- **昇格は明示的・限定的**: collector の admin 昇格は user の明示同意で、 opt-in が ON かつファイル操作フル捕捉を選んだ時のみ。 admin が無い/拒否なら **非特権 RDCW fallback** に自動で落ちる (監視フォルダ集合に限定、 [Activity Recorder](../backend/activity-recorder.md))

## やらないこと (禁止 / scope 外)

- **特権プロセスに実行機能を足さない** — collector に「ついでに便利だから」 で launcher / script-runner / shell を持たせない ([Security Model](./security-model.md) の「任意コード実行につながる便利機能を Non-goal」 と同じ原則)
- **本体を常時 admin で走らせない** — UI/launcher を昇格したまま常駐させると分離の意味が消える。 昇格は collector だけ
- **IPC で任意コマンドを渡さない** — collector が受け取るのは限定 enum のコマンドのみ。 文字列 → 実行 の経路を IPC に作らない
- **collector から来た path をそのまま起動対象にしない** — 活動ログの path は「記録」 であって「起動指示」 ではない
- 昇格を恒久化・自動化しない (毎回 or セッション単位の明示同意、 UAC を黙って回避しない)

## 性能予算

- IPC は file_event のバッチ転送。 USN read 自体が低負荷 (NTFS が既に書くジャーナルを read するだけ) なので、 分離による追加コストは IPC シリアライズのみで軽微

## 副作用 (state 変化 / persistence)

- collector の admin 昇格状態・opt-in 選択を config に記録
- file_event は本体経由で [Activity Store](../backend/activity-store.md) に永続化

## 依存

- feature: [Activity Recorder](../backend/activity-recorder.md) / [Activity Store](../backend/activity-store.md) / [Security Model](./security-model.md) / [IPC Bridge](./ipc-bridge.md)
- Win32: USN FSCTL (admin 必須は実機確定)

## 既知の判断

- **admin 必須は実機で確定** (USN readjournal 非 admin = Error 5)。 憶測でなく検証済みの制約に基づく分離設計
- **collector は no-exec を「リンクしない」 レベルで保証**する (設定で無効化ではなく、 実行 API をバイナリに含めない)。 乗っ取り耐性を構造で持たせる
- admin を拒否した user も **非特権 RDCW fallback で使える** ようにし、 「admin 必須で使えない」 を避ける (フォルダ集合に絞る代償つき)
- 本方針は将来 collector を Windows サービス化する場合も維持する (サービスも読取専用・no-exec)
