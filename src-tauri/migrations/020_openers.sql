-- PH-505: Opener registry (起動方法レジストリ)
-- 各 widget item の opener (Explorer / VS Code / Terminal / PowerShell / cmd / Notepad / etc.) を
-- 一元管理。builtin = アプリ同梱、削除不可。custom = ユーザ追加。

CREATE TABLE IF NOT EXISTS openers (
    id            TEXT PRIMARY KEY,
    label         TEXT NOT NULL,
    command       TEXT NOT NULL,
    args_template TEXT NOT NULL DEFAULT '{path}',
    icon          TEXT,
    builtin       INTEGER NOT NULL DEFAULT 0,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_openers_sort_order ON openers(sort_order);

-- Builtin openers 同梱 (Windows 標準 / どの PC にもある必須セット)
INSERT OR IGNORE INTO openers (id, label, command, args_template, icon, builtin, sort_order) VALUES
    ('opener-builtin-explorer',  'Explorer',          'explorer.exe', '"{path}"',                'FolderOpen',    1, 0),
    ('opener-builtin-cmd',       'cmd.exe',           'cmd.exe',      '/k cd /d "{path}"',       'TerminalSquare', 1, 10),
    ('opener-builtin-powershell','PowerShell',        'powershell.exe', '-NoExit -Command "Set-Location -Path \"{path}\""', 'Terminal', 1, 20),
    ('opener-builtin-notepad',   'Notepad',           'notepad.exe',  '"{path}"',                'FileText',      1, 30);

-- Optional builtin (PATH 通っていれば使える、なければ launch 時に LaunchFileNotFound)
INSERT OR IGNORE INTO openers (id, label, command, args_template, icon, builtin, sort_order) VALUES
    ('opener-builtin-vscode',    'VS Code',           'code.cmd',     '"{path}"',                'Code',          1, 40),
    ('opener-builtin-wt',        'Windows Terminal',  'wt.exe',       '-d "{path}"',             'SquareTerminal', 1, 50),
    ('opener-builtin-pwsh',      'PowerShell 7',      'pwsh.exe',     '-NoExit -Command "Set-Location -Path \"{path}\""', 'Terminal', 1, 60);
