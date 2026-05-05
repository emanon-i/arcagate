# Foundation §2.6-2.9: State / rusqlite / Error / Password

[foundation.md](./foundation.md) §2 のうち §2.6-2.9。

### 2.6 State 管理

Svelte 5 runes をクラスベースで使用。外部状態管理ライブラリ不要。

```typescript
// src/lib/state/palette.svelte.ts
class PaletteState {
  query = $state('');
  results = $state<ItemSearchResult[]>([]);
  selectedIndex = $state(0);
  isVisible = $state(false);

  selectedItem = $derived(this.results[this.selectedIndex] ?? null);

  async search(query: string) { /* ... */ }
  toggle() { /* ... */ }
}

export const paletteState = new PaletteState();
```

**パターン**: クラスの `$state` フィールド + `$derived` ゲッター。シングルトンインスタンスをエクスポート。

### 2.7 rusqlite Connection管理

`rusqlite::Connection` は `Send` だが `Sync` ではないため、スレッド間共有に制約がある。

```rust
// Tauri managed state として Mutex<Connection> を保持
use std::sync::Mutex;

pub struct DbState(pub Mutex<rusqlite::Connection>);

// lib.rs での登録
app.manage(DbState(Mutex::new(connection)));

// Command ハンドラでの使用
#[tauri::command]
fn item_search(db: State<DbState>, query: String) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // ...
}
```

**方針**: M1のアイテム数（数百件以下）・同時リクエスト数（1ユーザー）では `Mutex<Connection>` で十分。将来的に並行性が問題になった場合は `r2d2-sqlite` コネクションプールへの移行パスがある。

**トランザクション方針**: `launch_item` はアイテム取得→ログ記録→統計更新を単一SQLiteトランザクションで実行する。プロセス起動自体はトランザクション外（起動成功後にコミット）。

### 2.8 エラーハンドリング戦略

#### エラー型

```rust
// src-tauri/src/utils/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Item not found: {0}")]
    NotFound(String),

    #[error("Launch failed: {0}")]
    LaunchFailed(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database lock error")]
    DbLock,
}

// Tauri IPC でフロントエンドに返すための変換
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}
```

#### エラー伝播パターン

```
Repository (rusqlite::Error) → Service (AppError) → Command (Result<T, AppError>) → Frontend
```

- Repository層: `rusqlite::Error` を `AppError::Database` に自動変換（`From` impl）
- Service層: ビジネスロジック固有のエラー（`NotFound`, `Validation`）を生成
- Command層: `Result<T, AppError>` をそのまま返す。Tauriが `Serialize` 経由でフロントエンドに伝達
- Frontend: IPCラッパーで `catch` し、トースト通知（shadcn-svelteの `Sonner` コンポーネント）で表示

### 2.9 パスワード可視性トグル

`visibility::toggle` のパスワードはカジュアルな隠蔽用途（暗号学的保護ではない）。

- パスワードハッシュは `argon2` でハッシュ化し `config` テーブルに保存
- セッション中はメモリ上のフラグでトグル状態を管理
- 試行回数制限なし（個人用途のため）
- パスワード未設定の場合はホットキーのみでトグル可能
