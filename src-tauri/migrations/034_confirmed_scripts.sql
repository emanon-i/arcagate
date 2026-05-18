-- audit F15 (2026-05-18): #11 スクリプト監視 widget の初回実行確認の永続化。
--
-- security model:
--   #11 widget (script_runner_service) は監視フォルダ配下の allowlist スクリプトを
--   実行する。 path confinement (canonicalize + フォルダ配下確認) と拡張子 allowlist は
--   既に実装済。 本テーブルはその上に「初回実行時のユーザー確認」を追加する。
--   未確認スクリプトの実行要求に対し cmd_run_script は `launch.confirmation_required`
--   を返し、 frontend が確認ダイアログを表示する。 ユーザー承認後、 canonical path を
--   本テーブルに記録し、 2 回目以降は確認なしで実行する。
--
--   Library の Command / Script アイテム (confirmed_items) とは別経路 — item ではなく
--   フォルダ走査で動的発見されるスクリプト — のため別テーブルとする。
--
-- forward-only migration。

CREATE TABLE confirmed_scripts (
    script_path  TEXT PRIMARY KEY,
    confirmed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
