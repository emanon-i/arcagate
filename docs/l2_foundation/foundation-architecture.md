# Foundation §2: アーキテクチャ overview (§2.1)

[foundation.md](./foundation.md) §2 のうち overview (§2.1 コンポーネント構成図)。

その他:

- §2.2 ディレクトリ構成: [foundation-dirs.md](./foundation-dirs.md)
- §2.3 Service Layer / §2.4 Plugin Interface / §2.5 Tauri IPC: [foundation-architecture-service.md](./foundation-architecture-service.md)
- §2.6 State / §2.7 rusqlite / §2.8 Error / §2.9 Password: [foundation-architecture-state.md](./foundation-architecture-state.md)

## 2. アーキテクチャ

### 2.1 コンポーネント構成図

```
┌──────────────────────────────────────────────────────────┐
│                 FRONTEND (SvelteKit SPA / Svelte 5)       │
│                                                           │
│  ┌────────────┐  ┌───────────┐  ┌───────────────────┐    │
│  │ Command    │  │ Settings  │  │ Workspace (M2b)   │    │
│  │ Palette    │  │ UI        │  │                   │    │
│  └──────┬─────┘  └─────┬─────┘  └─────────┬─────────┘    │
│         │              │                   │              │
│  ┌──────▼──────────────▼───────────────────▼───────────┐  │
│  │         Frontend State ($state runes)                │  │
│  │       + IPC Client (typed wrappers over invoke)      │  │
│  └──────────────────────┬──────────────────────────────┘  │
├─────────────────────────┼─────────────────────────────────┤
│               TAURI IPC BOUNDARY                          │
│          commands = request/response                      │
│          events   = backend → frontend                    │
├─────────────────────────┼─────────────────────────────────┤
│                 BACKEND (Rust)                             │
│                                                           │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Command Layer (thin)                       │  │
│  │   #[tauri::command] — 引数パース → Service呼び出し    │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Service Layer (ビジネスロジック)             │  │
│  │   ItemService, LaunchService, ConfigService,         │  │
│  │   ThemeService, WorkspaceService                     │  │
│  │   *** Plugin Interface Boundary (M1でtrait定義) ***   │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Repository Layer (データアクセス)            │  │
│  │   ItemRepo, TagRepo, LogRepo, ConfigRepo,             │  │
│  │   ThemeRepo, WatchedPathRepo, WorkspaceRepo           │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │                 SQLite (rusqlite)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       将来のエントリーポイント（同じService Layer）     │  │
│  │       CLI (M2a)                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**設計原則**: UI・CLIは同一のService Layerを経由する。どのエントリーポイントからでも同じ操作結果を保証する。
