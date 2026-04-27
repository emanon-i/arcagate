-- Migration 020: Opener registry (PH-505)
--
-- ユーザー fb (検収項目 #35、memory 27/28):
-- > アイテム別 opener (Open with system) registry、Settings に「Openers」section、
-- > Explorer / VSCode / Terminal / PowerShell / Cmd デフォルト同梱、
-- > SHOpenWithDialog 連携、per-item override、右クリック menu
--
-- {path} placeholder で args を組み立てる shell 風 invocation registry。
-- builtin = true は user 削除不可 (default 同梱)。
-- 既存 widget_item_settings.opener (PH-504) が opener.id を参照する想定 (FK は今は付けず slug 互換のため)。

CREATE TABLE IF NOT EXISTS openers (
    id            TEXT    PRIMARY KEY,
    label         TEXT    NOT NULL,
    command       TEXT    NOT NULL,
    args_template TEXT    NOT NULL DEFAULT '{path}',
    icon          TEXT,
    builtin       INTEGER NOT NULL DEFAULT 0,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_openers_builtin ON openers(builtin);

-- Builtin openers 同梱 (id は安定文字列で固定、user テーブル削除不可)
-- VS Code / Windows Terminal は PATH 解決を runtime に任せる (= 未インストールでも error にしない)
INSERT OR IGNORE INTO openers (id, label, command, args_template, icon, builtin, sort_order) VALUES
    ('builtin-explorer',   'Explorer',         'explorer.exe', '"{path}"',                                         'folder-open', 1, 0),
    ('builtin-vscode',     'VS Code',          'code',         '"{path}"',                                         'code',        1, 1),
    ('builtin-terminal',   'Windows Terminal', 'wt.exe',       '-d "{path}"',                                      'terminal',    1, 2),
    ('builtin-powershell', 'PowerShell 7',     'pwsh.exe',     '-NoExit -Command "Set-Location -LiteralPath ''{path}''"',  'terminal-square', 1, 3),
    ('builtin-cmd',        'cmd.exe',          'cmd.exe',      '/K cd /d "{path}"',                                'terminal-square', 1, 4),
    ('builtin-notepad',    'メモ帳',            'notepad.exe',  '"{path}"',                                         'file-text',   1, 5);
