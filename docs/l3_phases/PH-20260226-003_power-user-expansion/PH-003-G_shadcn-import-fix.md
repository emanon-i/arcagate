---
status: in_progress
phase_id: PH-003-G
depends_on:
  - PH-003-F
---

# PH-003-G: バグ修正 + 技術的負債解消

## 概要

PH-003-F までの実装で蓄積されたバグ・技術的負債・コードレビュー指摘を一括解消するフェーズ。

---

## G-1: shadcn-svelte `import type` バグ修正（done）

### 背景

shadcn-svelte CLI が生成した `src/lib/components/ui/` の 23 ファイルで `import type { X } from "bits-ui"` としているが、テンプレート内で `<X.Root>` 等のランタイム値として使用している。TypeScript の `import type` はコンパイル時に除去されるため:

- `svelte-check` が 39 エラーを報告
- DropdownMenu 系が実行時クラッシュ（MoreMenu は bits-ui 直接インポートで回避していた）

## 変更内容

### 1. ui/ 23 ファイルの `import type` → `import` 一括修正

`import type { X as XPrimitive } from "bits-ui"` → `import { X as XPrimitive } from "bits-ui"` に置換。

| グループ     | ファイル数 |
| ------------ | ---------- |
| DropdownMenu | 15         |
| Tooltip      | 5          |
| ScrollArea   | 2          |
| Separator    | 1          |

追加修正（ローカル `.svelte` の type import）:

- `dropdown-menu-content.svelte` — `import type DropdownMenuPortal` → `import DropdownMenuPortal`
- `tooltip-content.svelte` — `import type TooltipPortal` → `import TooltipPortal`

変更しなかったもの: `import type { ComponentProps } from "svelte"` 等の真の型インポート。

### 2. MoreMenu を shadcn ラッパー経由に統一

bits-ui 直接インポート → shadcn DropdownMenu ラッパー経由に変更。WidgetShell と同じパターン。

- `import { DropdownMenu } from 'bits-ui'` → `import * as DropdownMenu from '$lib/components/ui/dropdown-menu'`
- `onSelect` → `onclick`（shadcn API）
- Content/Item のカスタム class を削除し、shadcn デフォルトに統一
- Trigger のカスタム class（`--ag-*`）は Arcagate デザインの一部として維持

### 3. CLAUDE.md ルール更新

「やってはいけないこと」セクションの ui/ 手動編集ルールに、ビルドエラー・型エラー修正の例外を追記。

### 4. docs/lessons.md 記録

shadcn-svelte CLI の `import type` バグのパターン・修正方法・再発防止を追記。

## CLAUDE.md への例外ルール追加理由

`src/lib/components/ui/` は shadcn-svelte の scaffold 出力であり原則手動編集禁止だが、上流の CLI バグによるビルドエラー・型エラーはプロジェクトのビルドを阻害する。このような修正は例外として許可し、L3 ドキュメントに記録することとした。

---

## G-2: PH-003-F simplify レビュー修正（done）

F-7/F-8/F-9 のコードレビューで特定された重複・バグ・非効率を修正。

### 修正済み（5件）

| # | 内容                                                                                      | ファイル                                                                                      |
| - | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 | `<ItemIcon>` 共通コンポーネント抽出（3箇所の重複排除 + `iconError` リセット漏れバグ修正） | 新規: `common/ItemIcon.svelte`、変更: `LibraryCard`, `LibraryDetailPanel`, `PaletteResultRow` |
| 2 | `git status --porcelain -b` で 2プロセス→1プロセスに統合                                  | `src-tauri/src/utils/git.rs`                                                                  |
| 3 | `run_git_command` ヘルパー抽出（Command 生成の重複排除）                                  | `src-tauri/src/utils/git.rs`                                                                  |
| 4 | `.git` 存在チェック追加（非Git フォルダでのプロセス起動回避）                             | `src-tauri/src/utils/git.rs`                                                                  |
| 5 | `hasGitDir` 誤称関数を削除しインライン化                                                  | `ProjectsWidget.svelte`                                                                       |

### 見送り（6件）

| # | 項目                                                  | 理由                                               | 対応時期                     |
| - | ----------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| 1 | `AppError::LaunchFailed` を git エラーに流用          | フロントエンドはプレーン文字列受信で機能的影響なし | エラーバリアント追加の機会に |
| 2 | `has_changes` の冗長性                                | DTO の利便性フィールドとして許容                   | 対応不要（意図的設計）       |
| 3 | ストア初期化の重複（メイン / パレットウィンドウ）     | 別 Tauri ウィンドウのため構造的に必要              | 対応不要（必要な重複）       |
| 4 | バッチ IPC コマンド（複数 git status を1回で）        | 個人アプリの規模では時期尚早                       | パフォーマンス問題顕在化時   |
| 5 | トースト `nextId` の number オーバーフロー            | 285百万年問題                                      | 対応不要                     |
| 6 | passthrough service（`workspace_service.git_status`） | アーキテクチャルール通り                           | 対応不要（意図的設計）       |

---

## G-3: 技術的負債の棚卸し

PH-003 の各サブフェーズで simplify レビューや実装判断として見送った項目を全洗い出しし、一括記録する。

### A. ソースコード内の技術的負債（7件）

| #   | 項目                                          | 場所                                          | 内容                                                                            | 優先度 | 対応時期                 |
| --- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- | ------ | ------------------------ |
| A-1 | `#[allow(dead_code)] mod plugin_api`          | `src-tauri/src/lib.rs:5-6`                    | MCP 除去（PH-003-H）後もモジュール残存。plugin_api 配下のファイルがデッドコード | 高     | 次の simplify で削除     |
| A-2 | `#[allow(dead_code)] DbState`                 | `src-tauri/src/db/mod.rs:8`                   | 実際は多数箇所で使用されており allow 不要                                       | 低     | 次の simplify で除去     |
| A-3 | `#[allow(dead_code)] SortOrder`               | `src-tauri/src/models/launch.rs:18`           | 定義済みだが未使用の enum                                                       | 中     | 使用するか削除するか判断 |
| A-4 | `#[allow(dead_code)] AppError`                | `src-tauri/src/utils/error.rs:4`              | 一部バリアントが未使用の可能性                                                  | 低     | 次の simplify で精査     |
| A-5 | `TODO: Settings 導線 U-05`                    | `src/routes/+page.svelte:168`                 | Settings ボタンの配置先が仕様未決                                               | 中     | U-05 仕様決定時          |
| A-6 | `#[allow(clippy::should_implement_trait)]` ×2 | `models/item.rs:24`, `models/workspace.rs:22` | `from_str` を手動実装。`FromStr` trait 実装が正道                               | 低     | 次の simplify            |
| A-7 | `eslint-disable-next-line no-new-func`        | `state/palette.svelte.ts:28`                  | 電卓の動的関数評価。正規表現でサニタイズ済みだが inherent なリスク              | —      | 対応不要（意図的設計）   |

### B. lessons.md 記録済みの技術的負債（2件）

| #   | 項目                                                           | 内容                                                                                                                                  | 優先度 | 対応時期                   |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------- |
| B-1 | `category_repository::find_all_with_counts()` の相関サブクエリ | O(N) の COUNT(\*)。LEFT JOIN + GROUP BY で O(1) に改善可能                                                                            | 低     | カテゴリ 100+ で要対応     |
| B-2 | `LibraryMainArea.svelte` の $effect race condition             | 高速切替時に stale response が後着して上書きするリスク。AbortController/request ID で対策可能。IPC <10ms のため実用上は顕在化しにくい | 低     | パフォーマンス問題顕在化時 |

### 備考

- G-2 の見送り 6 件は上記と別枠で記録済み（重複なし）
- D（凍結中の大型機能: コンテキストメニュー統合、ファイルマネージャー・AI連携、Steam API）は L0 ロードマップの管轄であり、技術的負債ではないため本フェーズには含めない
