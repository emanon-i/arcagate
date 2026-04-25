---
id: PH-20260425-290
status: todo
batch: 67
type: 改善
---

# PH-290: Library カード個別背景 override（per-card override + global default）

## 参照した規約

- メモリ `project_library_card_spec.md` E. 画像表示位置調整 (個別 override 検討記載)
- `arcagate-engineering-principles.md` §2 フロント/バック分担: DB 永続化は Rust
- `feedback_no_idle_dispatch.md`

## 背景・目的

batch-65/66 で導入した Library カード設定（背景モード / focal point / fillBgColor / fillIconColor）は **global default** のみ。
ユーザは個別カードに対して「このカードだけ background image にして focalY=20%」という上書きを求めている。

global を維持しつつ、各 item に optional な override を持たせる。

## 仕様

### Item モデル拡張

`models/item.rs` に新フィールド `card_override_json: Option<String>`（JSON 文字列、null = global を使う）:

```rust
pub struct Item {
    // ...existing
    pub card_override_json: Option<String>,
}
```

JSON shape（フロントの型と整合）:

```typescript
interface LibraryCardItemOverride {
    background?: Partial<LibraryCardBackgroundConfig>;
    style?: Partial<LibraryCardStyleConfig>;
}
```

部分上書き: ユーザは override したいフィールドだけ指定（他は global を継承）。

### マイグレーション

`migrations/` に新規 SQL ファイル:

```sql
-- card_override_json: per-card 個別設定（NULL = global default）
ALTER TABLE items ADD COLUMN card_override_json TEXT;
```

`include_str!` でアプリ起動時に走る。

### IPC

新規 `cmd_update_item_card_override(item_id, override_json: Option<String>) -> Item`:

- `null` を渡すと override 解除（global に戻る）
- バリデーション: 不正 JSON は AppError::InvalidInput

または既存 `cmd_update_item` の `UpdateItemInput` に `card_override_json` を追加（既存 IPC を拡張、新規 IPC 不要）→ こちらを採用、変更が小さい。

### LibraryCard.svelte 適用

```typescript
let resolvedBg = $derived.by(() => {
    const global = configStore.libraryCard.background;
    const override = parseCardOverride(item.card_override_json);
    return { ...global, ...(override?.background ?? {}) };
});
```

style も同様。

### 操作 UI（最小 MVP）

LibraryDetailPanel に「カード表示」セクションを追加:

- 「このカードだけ画像位置を調整」ボタン → 簡易 X/Y スライダー（global と差分のみ保存）
- 「global に戻す」ボタン → override 解除

advanced UI は batch-68 以降に持ち越し。

## 受け入れ条件

- [ ] DB マイグレーションが適用される [Operations]
- [ ] override なし時は global default 表示（既存挙動維持）[P consistency]
- [ ] override あり時はカードのみ仕様変更（他カード影響なし）[Function]
- [ ] override 解除で global に戻る [Function]
- [ ] Rust 単体テスト: マイグレーション + override 設定/解除 [Structure]
- [ ] `pnpm verify` 全通過

## 自己検証（CDP）

- 1 アイテムに override をつけて他のカードと表示が変わる
- override 解除で global と一致
