---
id: PH-V2-300
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-300: 特権分離 + ファイル操作収集 (USN / RDCW ハイブリッド)

## 目的

V2 差別化の芯 = ファイル操作ログ (作成/編集/削除/リネームを path 単位) をフル捕捉する。フル捕捉に
必要な admin を、「読むだけ・実行能力ゼロ」の収集 collector に閉じ込め、任意実行を持つ本体
(launcher) と **プロセスを分離**する。特権と任意実行が同居すると攻撃者が特権で任意コードを走らせる
踏み台になる — これを構造で断つ (REQ-20260702-004)。admin が無い user も RDCW 縮退 fallback で使える。

## 権限モデル (README P0 の具体化 — 方式は 050 確定表に従う)

本フェーズは **PH-V2-050 の確定表がファイル操作の採用方式を USN (admin) と確定したことを前提に**実装する。
050 が ETW 等の代替を採用した場合は確定表を正として方式を差し替える (下記は現行 L2 既定):

- **主経路 (050 で追認)**: 特権 collector が USN Change Journal を全ボリューム read。admin 必須は実機で
  一次確定 (非 admin = `Error 5 Access denied`)、050 で最終確定
- **fallback**: admin 拒否 / 非昇格時は ReadDirectoryChangesW + **監視フォルダ集合に縮退**へ自動で落ちる

> **要 user 確認 (1 点)**: collector の昇格方式は (a) セッション単位 UAC 同意の helper を既定に進める。
> (b) install 時昇格の Windows サービス化は着手時に採否のみ確認する (機能同値、昇格 UX の差)。

## スコープ

### やること

- **2 プロセス分離の信頼境界** (正本: [`activity-privilege-separation.md`](../../l2_foundation/features/cross-cutting/activity-privilege-separation.md)):

  | コンポーネント            | 権限         | できること                           | 構造で禁止                               |
  | ------------------------- | ------------ | ------------------------------------ | ---------------------------------------- |
  | 特権 collector            | admin (昇格) | USN read → file_event を本体へ渡す   | プロセス起動 / スクリプト実行 / 任意書込 |
  | 非特権 本体 (UI/launcher) | 通常         | UI / item 起動 / 非 admin 信号 (200) | USN の直接 read                          |

- **collector は no-exec を「リンクしない」レベルで保証**: collector バイナリは USN FSCTL と
  ファイル参照解決 API しか呼ばない。`Command` / `CreateProcess` / shell 呼び出しを **コードに
  含めない** (設定無効化ではなく、実行 API をバイナリに存在させない = 乗っ取られても実行に使えない)
- **IPC 境界を一方向・型付きに絞る**: collector → 本体 は `file_event` (path / kind / ts) の構造化
  メッセージのみ。本体 → collector は「開始 / 停止 / 対象ボリューム」程度の限定 enum コマンドのみ。
  collector が本体から任意のコマンド文字列・path・実行指示を受け取れないようにする
- **collector の入力を信頼しない**: 本体は collector から受けた path を、表示 / 保存前に検証
  (制御文字拒否・正規化)。collector から来た path で launcher を起動する経路を作らない
- **USN 収集**: admin があれば `FSCTL_READ_USN_JOURNAL` を定期バッチ read (create/edit/delete/rename の
  reason flag + file reference)。**fileID → path 解決**: file reference number から親ディレクトリ参照を
  辿ってフルパスを再構成する解決マップを保持
- **USN 連続性の担保 (取りこぼしを Partial として顕在化)**: per-volume に読取カーソル (Next USN) と
  journal ID を永続保持し、次回起動時に前回カーソルから継続 read する。journal wrap (古い範囲が上書き) /
  journal 削除・再作成 (journal ID 変化) / ボリューム再フォーマット / collector 停止中の欠損を検知したら、
  その区間を**データ品質 Partial** として記録して rebaseline し、欠損を 600/700 の品質 UI / audit に開示する
  (「フル捕捉」に静かな穴を空けない)
- **RDCW fallback**: admin 無し / 拒否時は `ReadDirectoryChangesW` (notify crate、既存 folder-watch と共有)
  で監視フォルダ集合を watch。固定バッファ溢れ (`ERROR_NOTIFY_ENUM_DIR`) 時は対象を再列挙して補正、
  Changed 重複は debounce
- **除外の収集時適用**: 700 の除外リスト (path / フォルダパターン) を collector が**収集時点で**適用し、
  除外対象の file_event を保存前に落とす (プライバシーを後段の表示層でなく収集層で守る)。除外設定は
  config-service 経由で共有 (700 が UI、collector が enforce)
- **昇格は明示的・限定的**: opt-in が ON かつファイル操作フル捕捉を選んだ時のみ user 明示同意で昇格。
  拒否なら fallback へ自動で落ちる。昇格を黙って恒久化しない
- 収集した file_event は本体経由で 100 の `file_event` テーブルへ永続化

### やらないこと

- **特権プロセスに実行機能を足さない** — collector に launcher / script-runner / shell を持たせない
- **本体を常時 admin で走らせない** — 昇格は collector だけ (分離の意味を保つ)
- **IPC で任意コマンドを渡さない** — collector が受けるのは限定 enum のみ、文字列 → 実行 経路を作らない
- **collector から来た path をそのまま起動対象にしない** — 活動ログの path は記録であって起動指示ではない
- **Modify の内容 diff を取らない** — USN / RDCW とも「変更が起きた事実と種別」のみ (中身は読まない)
- **polling + hash / 全走査 / 常時 ETW file trace をしない** — 負荷制約違反 (REQ-20260702-003)

## 依存

- 先行: PH-V2-050 (USN/RDCW/ETW 等の採用方式と admin 要否を確定表から受ける) /
  PH-V2-100 (file_event の書き込み先) / PH-V2-200 (recorder host・opt-in gate)
- 関連: [`security-model.md`](../../l2_foundation/features/cross-cutting/security-model.md) (任意実行が最大攻撃面)
- 後続: 600 (ファイル活動パネル表示) / 700 (昇格 UX・security 検証を集約)

## 受け入れ条件 (機械検出)

- [ ] admin 昇格時、USN read で create/edit/delete/rename が file reference 付きで捕捉され、
      fileID → path 解決でフルパスが `file_event` に記録される
- [ ] 非 admin / 昇格拒否時、RDCW fallback へ**自動で**落ち、監視フォルダ集合内の 4 種変更を捕捉する。
      バッファ溢れ時に取りこぼしを再列挙で補正、Changed 重複が debounce される
- [ ] **no-exec 構造保証**: collector バイナリに `Command` / `CreateProcess` / shell 呼び出しが
      **リンクされていない**ことを ビルド成果物 / ソース grep audit で確認 (存在しない = 0 件)
- [ ] **IPC 境界**: collector → 本体 は file_event 構造化メッセージのみ、本体 → collector は限定 enum のみ。
      任意コマンド文字列 / 実行指示を渡す経路が無いことを型・経路 audit で確認
- [ ] 本体が collector 由来 path を検証 (制御文字拒否・正規化) してから保存 / 表示し、その path で
      launcher を起動する経路が無いことを grep audit で確認
- [ ] 昇格が opt-in ON + フル捕捉選択 + 明示同意の 3 条件でのみ発生し、拒否で fallback に落ちる
- [ ] per-volume カーソル + journal ID を永続保持し再起動で継続 read。journal wrap / journal ID 変化 /
      停止中欠損を検知した区間が **Partial** として記録され、品質指標に開示される (欠損を黙って捨てない)
- [ ] 除外リスト対象の file_event が collector の収集時点で落とされ、DB に保存されない
- [ ] **低負荷**: USN read が NTFS 既存ジャーナルの read のみで、per-file hash / 全走査が無いことを確認。
      稼働中 CPU 増分が 200 と合算で平均 1% 未満 (REQ-20260702-003)

## 検証方針

- USN capture は admin 実機 (agent dev) で実ファイル操作を起こし、reason flag / path 解決を検証
  (実機表 2026-07-02 の裏取りを再現)
- fallback は非 admin 起動で自動降格を確認、監視フォルダ内外での捕捉差を検証
- no-exec / IPC 境界は「攻撃面が構造で閉じているか」を audit で機械確認 (実行 API 不在・任意文字列不達)
- 昇格 UX は (a) helper 方式で実機再現。(b) サービス化は着手時確認まで未実装

## リスク

- **分離が緩む**: collector に「ついでに便利」で実行機能が足される → no-exec をリンクレベルで固定、
  audit を常設 (存在した瞬間 fail)
- **IPC が任意実行の穴になる**: 文字列コマンドを IPC に通すと踏み台化 → 限定 enum + 一方向 file_event に固定
- **RDCW 取りこぼし**: 高負荷時にバッファ溢れ → 対象集合を絞る + 再列挙補正 + debounce を要件化
- **path 解決の不整合**: rename / 削除で file reference が stale → 解決マップの更新戦略を持ち、
  解決不能は「path 不明」として記録 (黙って捨てない)
- **USN の静かな穴**: wrap / journal 再作成 / 停止中欠損を検知せず「フル捕捉」を名乗ると信頼を壊す →
  カーソル + journal ID 保持で継続性を担保し、欠損は Partial として品質 UI に開示 (受け入れ条件に固定)

## 横展開

- 新規 `file_event` テーブルと collector IPC を `PERSONAL_DATA_LEAK_AUDIT` / `PERSONAL_PATH_LEAK_AUDIT`
  系の観点で点検 (path が telemetry / crash / 外部送信に混入しないこと) — 実検証は 700 で集約
- RDCW は既存 folder-watch (`src-tauri/src/watcher/`) と crate 共有。folder-watch 側の取りこぼし補正と
  同型対処を横展開 (バッファ溢れ・debounce)
- 本方針は将来 collector をサービス化しても維持 (サービスも読取専用・no-exec)

## 参照

- 正本: [`activity-privilege-separation.md`](../../l2_foundation/features/cross-cutting/activity-privilege-separation.md) (信頼境界 / no-exec / IPC)
- 収集手法: [`activity-recorder.md`](../../l2_foundation/features/backend/activity-recorder.md) (USN / RDCW 実機表・fallback)
- security: [`security-model.md`](../../l2_foundation/features/cross-cutting/security-model.md)
- 非機能: [`vision.md`](../../l1_requirements/vision.md) REQ-20260702-002 / 003 / 004
- 過去 audit: `docs/l3_phases/audit/PERSONAL_PATH_LEAK_AUDIT_2026-05-28.md`
