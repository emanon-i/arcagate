CREATE TABLE IF NOT EXISTS themes (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL UNIQUE,
    base_theme TEXT    NOT NULL DEFAULT 'dark',
    css_vars   TEXT    NOT NULL DEFAULT '{}',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
    ('theme-builtin-light', 'Light', 'light', '{}', 1),
    ('theme-builtin-dark', 'Dark', 'dark', '{}', 1);
