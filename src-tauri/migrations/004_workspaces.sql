CREATE TABLE IF NOT EXISTS workspaces (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workspace_widgets (
    id           TEXT    PRIMARY KEY,
    workspace_id TEXT    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    widget_type  TEXT    NOT NULL,
    position_x   INTEGER NOT NULL DEFAULT 0,
    position_y   INTEGER NOT NULL DEFAULT 0,
    width        INTEGER NOT NULL DEFAULT 2,
    height       INTEGER NOT NULL DEFAULT 2,
    config       TEXT,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_widgets_workspace
    ON workspace_widgets(workspace_id);
