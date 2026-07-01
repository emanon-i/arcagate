---
id: PH-V2-700
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-700: プライバシー統制 + 低負荷 / security ゲート

## 目的

活動追跡は本質的に sensitive。opt-in / 除外 / マスク / 削除 の統制 UI を集約し、非機能ゲート
(絶対的低負荷・no-exec security・完全ローカル) を配布水準で**検証・確定**する。プライバシーは各
フェーズの設計初期から組み込む制約であり (後付け禁止)、本フェーズはそれを一望に集約し、抜けを
横断 audit で塞ぐ最終ゲート。

## スコープ

### やること

- **opt-in 同意 UI**: デフォルト OFF。初回 ON 時に明示同意を出してからでないと記録を開始しない
  (「知らないうちに記録されていた」を起こさない)。recorder (200) / collector (300) の起動 gate と接続
- **記録プレビュー + 30 秒テスト記録** (opt-in gate と両立する test mode を明示):
  - **プレビュー**は synthetic・非永続。「今の設定だと何が保存されるか」をサンプル表示
    (`browser: domain のみ` / `title: masked` / `入力: 記録しない` 等)。実収集しない
  - **30 秒テスト記録**は本 opt-in とは別の**一時テスト同意**で起動し、書き込み先を**破棄前提の
    ephemeral バッファ / 一時テーブル**に限定する。`activity_event` / `file_event` には書かず、表示後に
    purge する (本 opt-in を有効化した時のみ通常テーブルへ)。これにより 200/300 の「opt-in ON 時のみ
    通常収集」gate と矛盾させず、同意の**前に** user が実際の保存内容を確認できる
- **除外リスト**: 特定アプリ / ドメイン / ウィンドウタイトルパターンを記録対象外に (パスワードマネージャ /
  銀行サイト等)。**設定 UI と config 正本は 700 が持ち、enforce は 200/300 の収集層**が担う (config-service 共有)。
  本フェーズは UI 提供と「除外が収集時に効いている」ことの検証
- **タイトルマスク**: 「プロセス名のみ記録、タイトルは記録しない」モード (タイトルは機微情報が乗りやすい)。
  同じく UI は 700、enforce は 200 の収集層
- **データ削除**: 追跡履歴の全削除 / 期間指定削除 UI
- **昇格統制**: collector の admin 昇格は opt-in ON + フル捕捉選択 + 明示同意でのみ、恒久化しない (300 と接続)
- **候補シグナル採用時の厳密条件** (採用する場合のみ): 入力強度 = カウントのみ (キー内容禁止) /
  マイク・カメラ = boolean のみ (中身・デバイス名に触れない)

### 非機能ゲート (検証・確定)

- **絶対的低負荷 (一級・ゲート条件)**: recorder + collector 稼働中の CPU 使用率増分が実測で平均 1% 未満
  (REQ-20260702-003)。実 target・実 disk・能動シナリオで計測 (`perf-audit-before-measure`)。
  フルスキャン / ハッシュ差分 / 低レベルフック / 常時カーネルトレースが無いことを grep audit
- **no-exec security**: collector に実行 API (`Command`/`CreateProcess`/shell) がリンクされていないこと、
  IPC が限定 enum + 一方向 file_event のみで任意実行経路を持たないこと (300 の受け入れを最終再確認)
- **完全ローカル**: 追跡データ (`activity_event` / `file_event` / `system_metric` / path / title) が
  telemetry / crash 報告 / 外部送信経路に混入しないことを `PERSONAL_DATA_LEAK_AUDIT` /
  `PERSONAL_PATH_LEAK_AUDIT` 系の観点で全経路 audit
- **a11y / i18n / security 3 軸 sweep**: audit close 前に 3 軸を sweep (`feedback_a11y_i18n_security_sweep`)。
  「explicitly clean」を要件にし「touched せず」を不可にする

### やらないこと

- プライバシーを本フェーズで初めて設計しない — 各フェーズが opt-in gate / 除外 / マスクを既に持つ前提で、
  本フェーズは統制 UI 集約と検証。設計を後ろ倒しにしない
- telemetry / crash 報告の本実装 (別 trip)。ここでは追跡データの非混入を audit するのみ

## 依存

- 先行: PH-V2-200 (recorder gate) / PH-V2-300 (昇格・no-exec) / PH-V2-600 (設定 UI の載る画面)
- 関連: `config-service` (opt-in / 除外 / マスク設定) / `security-model.md` / 既存 Settings 画面
- 後続: なし (V2 core の配布ゲート)

## 受け入れ条件 (機械検出)

- [ ] デフォルト OFF、初回 ON で明示同意なしに記録開始しない。同意前に「30 秒テスト記録 → 結果表示」で
      保存内容を確認できる
- [ ] 記録プレビューが現在設定での保存内容 (browser/title/入力の扱い) をサンプル表示する
- [ ] 除外リスト (アプリ / ドメイン / タイトルパターン) が収集時に適用され、対象が記録されない
- [ ] タイトルマスクモードでタイトルが保存されず、プロセス名のみ記録される
- [ ] 追跡履歴の全削除 / 期間削除が動作し、削除後に該当データが引けない
- [ ] **低負荷ゲート**: recorder + collector 合算の CPU 増分が実測平均 1% 未満。フルスキャン / ハッシュ /
      低レベルフック / 常時トレースが無いことを grep audit で 0 件
- [ ] **no-exec / IPC**: collector に実行 API 不在、IPC に任意実行経路が無いことを最終 audit で 0 件確認
- [ ] **完全ローカル**: 追跡データ (event / file_event / path / title / metric) が telemetry / crash /
      外部送信に混入しないことを leak audit で 0 件確認
- [ ] 候補シグナルを採用した場合、入力強度 = カウントのみ / マイク・カメラ = boolean のみ を満たす
      (採用しなければ N/A)
- [ ] a11y / i18n / security 3 軸 sweep が「explicitly clean」で close

## 検証方針

- 低負荷は agent dev で長時間常駐 + 能動シナリオ計測 (idle 固定・warm fixture の再現漏れを避ける)
- leak audit は追跡データ列を起点に telemetry / crash / export 経路を grep + 直接 read で追跡
- no-exec は 300 の audit を最終再実行 (回帰で穴が開いていないか)
- 削除 / マスク / 除外は agent dev で設定変更 → 収集 → DB 確認の往復で検証

## リスク

- **静かな劣化 / 静かな漏出**: 追跡データが export / crash 経路に紛れる → 列起点の全経路 leak audit を常設
- **低負荷ゲートの計測環境ズレ**: warm fixture で 1% を通しても実機で割る → 実 disk・能動シナリオを要件に固定
- **プライバシーの後ろ倒し**: 統制 UI を最後に足すと各フェーズに漏れが残る → 各 PH が gate を持つ前提を README で固定、
  本フェーズは検証で塞ぐ

## 横展開

- 新規時系列テーブル・collector IPC を PERSONAL_DATA/PATH_LEAK 系観点で全件点検
- opt-in gate は recorder (200) / collector (300) の起動条件と単一の config を共有 (gate を二重定義しない)
- i18n: 同意 / 除外 / マスク文言を ja/en 同時 (PQ-700 parity)

## 参照

- 正本: [`vision.md`](../../l1_requirements/vision.md) REQ-20260702-003 / 004 / §4 非機能 (CPU 増分 / retention)
- privacy 設計: [`PH-PQ-800 §プライバシー`](../paid-quality/PH-PQ-800_personal-observability.md)
- security: [`activity-privilege-separation.md`](../../l2_foundation/features/cross-cutting/activity-privilege-separation.md) / [`security-model.md`](../../l2_foundation/features/cross-cutting/security-model.md)
- 過去 audit: `docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` / `PERSONAL_PATH_LEAK_AUDIT_2026-05-28.md`
- memory: `feedback_a11y_i18n_security_sweep` / `feedback_perf_audit_before_measure`
