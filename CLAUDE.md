# Arcagate

PC上に散在する起動元を集約する個人用コマンドパレット（Tauri v2 + SvelteKit + Rust + SQLite）。

## セッション開始時に読む（自動ロード）

@docs/dispatch-operation.md
@docs/l0_ideas/arcagate-engineering-principles.md
@docs/lessons.md

**シーン別（手動 Read）**:

- UI 触るとき: `docs/l1_requirements/ux_standards.md` / `docs/desktop_ui_ux_agent_rules.md`
- テーマ触るとき: `docs/l1_requirements/design_system_architecture.md`
- プロダクト方針: `docs/l1_requirements/vision.md`
- 実行ログ: `docs/dispatch-log.md`

## 哲学

### プロダクトとして

- 「毎日使えるか？」で全機能を判断する。判断が微妙なら削る
- 設定変えたら即見た目が変わること。遅延反映は欠陥
- 規約より機械検証。lint / E2E が通れば OK、書いただけでは OK ではない
- **ラベルはアイコン名ではなく機能 / 状態 / アクションを書く**。⭐ +「星」/ ☰ +「三本線」/ ＋ +「プラス」は禁止、⭐ +「お気に入り」/ ☰ +「メニュー」/ ＋ +「追加」が正
- **同じ機能には同じアイコン + 同じラベル**。画面間で揺らがせない。新しい画面を作る前に `src/lib/nav-items.ts` を確認、既存項目があれば必ず参照する
- **1 つの不整合を見つけたら横展開で全画面チェック**。1 ファイル直して終わりにしない。同じパターンが他の画面にもあれば一括で潰す
- **Plan 文書に「横展開チェック実施済か」必須**。各 Plan で「同類パターンを他画面で grep / audit したか」を 1 行記載する

### 開発として

- Plan を先に書く。場当たり禁止
- コミット前は `/simplify` で自分の差分を疑う。規約違反指摘は取捨選択不可
- 「直った」= E2E 緑 + 実機確認 + SFDIPOT/HICCUPPS で観点を潰した
- ドキュメントを書いて満足しない。機械化（lint / E2E）に落とす

## 設計原則

- レイヤー依存は一方向: commands → services → repositories → DB（逆禁止）
- Service Layer が全エントリーポイントの共通経路。Repository を直接呼ばない
- **選択肢1個のメニューを挟むな**: ボタン押下 = 即アクション。中間メニューは選択肢が2個以上になってから出す
- Repository 間の相互参照禁止。複数 Repository の結合は Service で行う

## 意図的な選択（変えない）

- `Mutex<Connection>` + WAL: 個人アプリにコネクションプールは過剰
- UUID v7（TEXT型）: 時刻ソート可能 + インポート衝突回避
- `include_str!` でマイグレーション埋め込み: 実行時外部ファイル不要
- `AppError` を Serialize: フロント側はプレーン文字列で受信
- ORM 不使用: rusqlite + 生SQL が意図的選択

## してはいけないこと

- `src/lib/components/ui/` 手動編集禁止（shadcn-svelte scaffold、lint 除外済み）
  - 例外: ビルドエラー・型エラーの修正（L3 ドキュメントに記録）
- `status: done` の L1/L2 ドキュメント書き換え禁止
- ORM 導入禁止（diesel, sqlx, sea-orm）

## コマンド

- `pnpm verify` — 全検証（biome, dprint, clippy, rustfmt, svelte-check, cargo test, smoke-test, vitest, tauri build）
- `pnpm tauri dev` — 開発起動（verify に含まれない）
- `pnpm test:e2e` — Playwright E2E テスト（Tauri 統合・CDP 経由）

lefthook（pre-commit）はステージングファイルのみ。CI が真の品質ゲート。
