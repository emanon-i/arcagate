# Engineering Rules — 設計の固定枠 / 禁止事項

コードから現状パターンは読めるが「今後もそうすべきか」の意思は読めない。ここはその意思 =
**変えない設計判断**と**やってはいけないこと**だけを書く。詳細な構造は
[foundation.md](../../docs/l2_foundation/foundation.md) を参照。

## 設計の固定枠 (変えない判断)

- レイヤーは一方向: `commands → services → repositories → DB`。逆参照禁止
- Service Layer が全 IPC エントリーポイントの単一経路。Command から Repository を直呼びしない
- Repository 間の相互参照禁止 (組み合わせは Service 層で行う)
- DB 接続は `Mutex<Connection>` + WAL (1 user / 数百件規模で Connection Pool は過剰)
- ID は UUID v7 (時刻ソート可能 / import・export 時の衝突回避)
- migration は `include_str!` でバイナリ埋込・forward-only (rollback しない、fix forward)
- `AppError` は `{ code, message }` に serialize してフロントへ返す。TS 側は code で分岐する
  (message の文字列一致で判定しない)
- Rust の error は `thiserror` + `AppError`。`anyhow` は使わない
- ORM 不採用 (rusqlite + 生 SQL)。選択肢 1 個の menu を挟まない (button 押下 = 即 action)

## 禁止事項

- **color hardcode**: component に `#ffe600` / `rgb()` / `rgba()` / `hsl()` / `oklch()` /
  `bg-yellow-500` 等の生色値を書かない。必ず `var(--ag-*)` / `var(--c-*)` token を経由する
  (pre-commit `design-tokens` hook が機械検出)。単色ブランドに寄せた派手 direction
  (旧 Industrial Yellow 路線) は撤回済 — 色は theme accent に追従させる
- `src/lib/components/ui/` の手動編集 (shadcn-svelte scaffold、lint 除外済)。
  例外は build / 型 error 修正のみ
- ORM 導入 (diesel / sqlx / sea-orm)
- `status: done` の L0 / L1 / L2 ドキュメント書き換え (履歴 mutation)
- `--no-verify` での hook bypass
- 実機目視なしでの完了報告

## schema / 実装値の single source

DB schema・token 値・関数シグネチャ・PRAGMA tuning 値の正典は**コード**
(`src-tauri/migrations/*.sql` / `src/lib/styles/arcagate-theme.css` / 各 service)。
doc には設計判断 (FK / CASCADE / index 戦略・派生方式・非機能予算) を書き、生値の再掲は避ける。
