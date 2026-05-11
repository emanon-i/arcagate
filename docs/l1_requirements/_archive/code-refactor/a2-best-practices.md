# A2 Best Practices Research (index)

A1 audit (`a1-violations.md`) で抽出した V1-V10 の課題を踏まえ、Tauri v2 + Svelte 5 ecosystem の「常套」パターンを調査。A3 target architecture の根拠材料。

調査時点: 2026-05-06。

## Scope

- Tauri v2 公式 architecture / state management
- Yaak (10.8k stars、API client、Tauri v2 大規模 ref impl)
- Svelte 5 runes module 境界 / global state pattern
- Rust DI / Mutex / Arc 使い分け

## 関連 doc

| File                 | 内容                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `a2-tauri-rust.md`   | Tauri v2 architecture、State management、Cargo workspace 分割、command/service/repository pattern |
| `a2-svelte-runes.md` | Svelte 5 runes 基本則、`.svelte.ts` 内 global state、Context pattern、test 容易性                 |

## 主要 take-away (短くサマリ、A3 で根拠として参照)

### TR-1: Tauri 公式は app-level service/repository pattern を規定しない

- 公式 doc は **command pattern** と **`tauri::State<'_, T>` 注入** までしか規定しない ([Tauri Architecture](https://v2.tauri.app/concept/architecture/))
- service / repository / domain layer は **app 開発者の判断**

### TR-2: 大規模 prod (Yaak) は **Cargo workspace + 多 crate 分割** で責務分離

- Yaak は `yaak-models` (DB) / `yaak-plugins` / `yaak-templates` / `yaak-http` etc. の **9+ crate**
- src-tauri/src/ 内には **明示的な service/ repository/ subdir 分離は無く**、crate 境界で責務を切る ([Yaak DeepWiki](https://deepwiki.com/mountain-loop/yaak))

### TR-3: state は `tauri::State<'_, Mutex<T>>` で **Arc 不要** (Tauri が内部 wrap)

- `Arc<Mutex<T>>` は誤り、`Mutex<T>` を `app.manage()` するだけで OK ([Tauri State Management](https://v2.tauri.app/develop/state-management/))
- async でも `std::sync::Mutex` 推奨。`tokio::sync::Mutex` は **await 跨ぎでガード保持時のみ**
- 複数 state は **個別に `app.manage()`** + 各 command で個別 inject

### TR-4: command function は **thin layer** (DTO 入出力 + state delegate のみ)

- 公式パターン: `fn cmd_xxx(state: State<'_, Mutex<AppState>>, args) -> Result<...>` で受け、即 service 関数に delegate
- 業務ロジック / DB アクセスを command 内で書かない (test 困難 + 規約違反)

### SV-1: `.svelte.ts` で `export { count }` 直接は **frozen** で危険

- `let count = $state(0); export { count }` は import 時に値固定。変更が伝播しない ([Mainmatter: Runes and Global state](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/))
- 推奨は **Object getter/setter** / **Class wrapper** / **`export const obj = $state({...})`** の 3 通り

### SV-2: component 跨ぎ state は **Context + 型安全ラッパー** が SSR-safe

- root layout で `setContext`、child で `getContext`
- module-level global state は SSR で **クロスリクエスト汚染** の危険

### SV-3: $derived (pure compute) と $effect (side effect) を **混同しない**

- 「The single most common mistake with runes is reaching for $effect when a $derived would do」 ([Svelte 公式 blog](https://svelte.dev/blog/runes))
- $derived は値を返す、$effect は値を返さず副作用のみ

### SV-4: stores は deprecated **ではない**、bottom-up migration

- 既存 `*.svelte.ts` runes store は維持 OK
- 一気に変えず、子から runes 化していく

## A1 finding との対応

| A1 finding                              | 関連 take-away                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| V1 commands→DbState 直接依存            | TR-3 + TR-4 (`State<'_, Mutex<XxxService>>` で service 注入、command は thin layer) |
| V2 repository 相互参照                  | TR-2 (crate 境界 / 共通 helper を models へ移管)                                    |
| V3 watcher→repository 直接              | TR-4 (service 経由で repository を叩く)                                             |
| V4 workspace store 666 LOC              | SV-1 + SV-4 (split を bottom-up で、Class wrapper か Object pattern で再構築)       |
| V5 component 肥大                       | (Svelte 公式 + 一般 component composition、A3 で具体化)                             |
| V6 itemStore→metadataStore invalidation | SV-3 ($effect で暗黙的にやらず、明示 invoke を service / store method に集約)       |
| V7 icon_cache 命名混乱                  | TR-2 (命名規則は app 判断、規約整備で対応)                                          |
| V8 configStore vs themeStore 境界       | SV-2 (責務 = state slice の単位を Context per slice で再設計)                       |
| V9 legacy item_id                       | (migration の実装 detail、A3 で migration step)                                     |
| V10 #[allow(dead_code)] 棚卸            | (Rust 一般、A3 で cleanup PR)                                                       |

## A3 への接続

A3 では V1-V10 を P0-P3 順に migration PR list 化。各 PR の **scope と退行 risk** を評価し、`refactor/<scope>-<short>` branch 命名で発行する。

参照 sources は各 sub-doc に詳細記載。
