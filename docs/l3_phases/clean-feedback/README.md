---
id: PH-CF-000
status: planning
batch: clean-feedback
type: 統合
era: Distribution Hardening
---

# Clean-Feedback — クリーン状態 user 検収 28 件の L3 プラン集

> Arcagate を **クリーンな初期状態から触った user** から届いた 28 件の指摘 (Dispatch 側で A〜F に分類構造化済) を、 実コード調査で root cause を特定し、 **各 PH が独立して 1 PR で実装可能な単位** に分割した L3 プラン集。
>
> 本 plan 集は **コード変更ゼロ docs のみ**。 実装は per-phase で別 PR、 **1 PH = 1 PR = 1 コードセッション** で順番に進める。

---

## 動機

paid-quality batch (PH-PQ-100〜800) が一巡し i18n まで完了 (#555) した直後、 **クリーン状態の user が実機を通しで触った検収** で 28 件の指摘が出た。 これは「設計層の成熟度に対して、 初回 user が最初の数分で触る経路に欠陥が残っている」 ことを示す。 とくに:

- **再発バグ** (E1 workspace D&D 配置) — 「PR #543 で直したはず」 と user が認識していたが、 調査の結果 #543 は D&D 配置に **一度も触れていない** (誤帰属)。 §workspace D&D 再発分析 を参照
- **polish sweep の取りこぼし** (D1 / D3) — PH-PQ-600 widget polish sweep を実施済のはずが、 監視ウィジェット 3 種の chrome 不整合が残った。 §PH-PQ-600 取りこぼし分析 を参照
- **データ整合の穴** (E5 孤立 item → ItemNotFound) — workspace 削除の cascade が参照経路の片方しか追っていない

基本方針は **「機能契約 (L2 features spec) に追記して二度と起きなくする。 起きても機械的に気づけるようにする」**。 各 PH の §機能契約の追記 で、 どの spec にどんな契約条項を足し、 どんな機械検出 (audit script / unit test / e2e) を追加するかを具体に書く。

---

## 28 件 → PH 対応表

| PH                                                      | テーマ                                            | 含む指摘 ID            | 件数 |
| ------------------------------------------------------- | ------------------------------------------------- | ---------------------- | ---- |
| [PH-CF-100](./PH-CF-100_workspace-library-integrity.md) | workspace ↔ Library 参照整合                      | E4, E5                 | 2    |
| [PH-CF-200](./PH-CF-200_workspace-dnd-placement.md)     | workspace D&D 配置経路の洗い直し                  | E1                     | 1    |
| [PH-CF-300](./PH-CF-300_destructive-action-confirm.md)  | 破壊的操作の確認パターン統一                      | C1, E3, E6             | 3    |
| [PH-CF-400](./PH-CF-400_exe-folder-scan-redesign.md)    | EXE フォルダ監視 検出ロジック再設計               | D5, D6                 | 2    |
| [PH-CF-500](./PH-CF-500_watch-widget-chrome.md)         | 監視ウィジェット chrome 統一 + 設定デフォルト整合 | D1, D2, D3, D4, D7     | 5    |
| [PH-CF-600](./PH-CF-600_library-bug-fixes.md)           | ライブラリ画面 バグ修正                           | C2, C3, C4, C7         | 4    |
| [PH-CF-700](./PH-CF-700_library-ux-wallpaper.md)        | ライブラリ画面 UX + 背景                          | C5, C6, C8             | 3    |
| [PH-CF-800](./PH-CF-800_theme-settings-polish.md)       | テーマ / 設定 polish                              | F1, F2, F3, F4, F5, F6 | 6    |
| [PH-CF-900](./PH-CF-900_startup-perf-exe-cache.md)      | 起動 perf: アプリのコールドスタート全般           | A1                     | 1    |
| [PH-CF-1000](./PH-CF-1000_overlay-drag-region.md)       | オーバーレイの window drag region 横展開          | B1                     | 1    |

合計 28 件 (A1 / B1 / C1-8 / D1-7 / E1,3,4,5,6 / F1-6)。 E2 は E1 に統合済の欠番、 B2 は現状維持で対象外。

---

## 横展開テーマ (複数 PH / 複数画面にまたがる)

調査で判明した「1 file 直して終わりにできない」 横展開テーマと、 どこへ展開するか:

| テーマ                                     | 起点指摘   | 展開先                                                                                                                                                                                              | 担当 PH              |
| ------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **workspace ↔ Library 参照整合**           | E5         | sys-ws-* tag 経路 と widget config `item_ids` 経路の二重管理を一本化。 E4 のエラーも同根                                                                                                            | PH-CF-100            |
| **破壊的操作の確認パターン**               | C1, E3, E6 | Library カード削除 / タブ削除を `WidgetItemContextMenu` の既存 destructive パターン + 専用 confirm modal に統一。 widget 削除の undo-toast 方式との非対称を整理                                     | PH-CF-300            |
| **監視ウィジェット族の共通契約**           | D1, D3     | exe_folder / script_folder / projects の 3 widget を 1 グループとして chrome (header / sort 帯 / WidgetShell prop / description 配置) を揃える                                                      | PH-CF-500            |
| **sort バー と配置領域の z-order**         | D1         | card を持つ全 widget (exe card mode / projects / file-search) で透明 sticky bar 配下の不透明 card 透け問題を修正。 「正しい」 とされた script_folder は item に背景が無いだけで構造的解決ではない   | PH-CF-500            |
| **widget のデフォルト起動アプリ (opener)** | D4         | exe_folder のみ持つ `default_opener_id` を projects widget へ展開。 opener registry (`opener_service`) は既存流用                                                                                   | PH-CF-500            |
| **widget 設定デフォルト値の単一情報源**    | D7         | widget 本体の `?? default` と settings の `?? default` の二重定義 (cpu/memory/disk 全て不一致) を `index.ts` defaultConfig 一本に                                                                   | PH-CF-500            |
| **初回描画の即時反映**                     | C2, D7     | 設定変更 → 即見た目反映 (`instant-feedback` rule)。 C2 は `content-visibility` 再描画、 D7 は default 不一致。 機構は別だが「設定を開く前後で見た目が変わる」 欠陥として共通契約化                  | PH-CF-500, PH-CF-600 |
| **panel / menu の閉じ条件**                | C7         | Library detail panel の click-outside ホワイトリスト方式 (`closest('[data-testid^="library-card-"]')`) を「余白クリックのみ閉じる」 へ。 `ContextMenu` の `contains()` 方式を正規パターンとして参照 | PH-CF-600            |
| **wallpaper の格納先抽象**                 | C8         | per-workspace の `wallpaper_*` 列を Library 用に config テーブルへ展開。 `wallpaper_service::save_wallpaper_file` は workspace 非依存で流用可                                                       | PH-CF-700            |
| **オーバーレイの window drag region**      | B1         | `fixed inset-0` フルスクリーンオーバーレイ (SetupWizard / OnboardingTour / HelpPanel / Settings / Dialog) が TitleBar の drag region を覆い、 表示中に window を掴めない                            | PH-CF-1000           |
| **アプリのコールドスタート perf**          | A1         | 起動の遅さは exe scan に限定されない。 backend setup 4 段階 + frontend 初期化 + Workspace 復元 scan を通しで計測し、 release build で予算判定。 exe scan キャッシュ化は寄与要因の 1 つ              | PH-CF-900            |

---

## PH-PQ-600 取りこぼし分析 (D1 / D3 がなぜ残ったか)

PH-PQ-600 は「既存 15 widget の polish sweep (chrome 一貫性 / empty・loading・error)」 を謳ったが、 監視ウィジェット 3 種の chrome 不整合 (D1 sort バーめり込み / D3 フォルダ監視だけ統一感がない) が残った。 調査で判明した **カバレッジの穴**:

1. **DOM クラス文字列一致で「統一済」 と誤判定**
   PH-PQ-600 A1 は sticky bar の **クラス名** (`ag-sticky-bar`) の grep 一致で 3 widget を「揃っている」 と判断した。 実際の D1 の差は **sticky bar 配下の item 背景の有無** (list = 透明 / card = 不透明) と **default `view_mode`** (exe = list / projects = card) であり、 クラス grep では検出不能。 card モードを実機でスクロールして初めて透けが見える。 → `dom-not-fixed` rule の「DOM 存在 = 治った 判定禁止」 が audit 工程でも適用されていなかった。

2. **projects widget が比較グループから漏れていた (推定)**
   projects (フォルダ監視) widget は `git_poll` 等の独自機能が多く、 結果として PH-PQ-600 の chrome 修正 commit 群は exe_folder / script_folder に集中し projects に drift が残った。 「監視ウィジェット 3 種を 1 つの比較グループとして並べる」 横展開 (`lateral-sweep` rule) が効いていれば防げた。 ※これは結果のコード drift からの**推定**であり (Codex クロスチェックの指摘)、 当時の audit 工程記録から断定はできない。

3. **chrome の比較が「コンポーネント有無」 止まりで「prop / 配置」 まで降りていない**
   D3 の実体は WidgetShell に渡す `path` prop の有無 / `icon` の meta 不一致 (exe_folder: meta `FolderOpen` ≠ shell `AppWindow`) / description disclosure の配置 (empty state の内 or 外) といった **prop レベルの差**。 PH-PQ-600 の chrome matrix は「header chrome ✓ / settings modal ✓」 の有無チェック粒度で、 prop の値までは比較していなかった。

### 再発防止 (本 batch で設計)

- PH-CF-500 で **監視ウィジェット族の共通契約** を `features/widgets/_chrome-consistency.md` に prop レベルで明文化 (WidgetShell に渡す prop / default view_mode / description 配置を表で固定)
- **audit script の粒度を上げる**: クラス名一致でなく「card を持つ widget は sticky bar が不透明 fill を持つ」 を機械検出する script を PH-CF-500 §機能契約 で新設
- chrome matrix を「✓ / —」 から「実際の prop 値」 を埋める表へ変更し、 doc を真とする

---

## workspace D&D 再発分析 (E1)

user は「E1 は PR #543 で直したはずの再発」 と認識していた。 調査結論:

- **#543 は D&D 配置に一度も触れていない (誤帰属)**。 `git show` で #543 のコミット (`6e91b89`) を確認したところ、 変更は `WorkspaceGrid.svelte` / `zoom-math.ts` / `widget-zoom.svelte.ts` のみ — PageTabBar の overlay 化と fit-to-content の visual center 計算修正であり、 D&D 配置・座標計算コードは対象外。
- したがって E1 は **リグレッションではなく、 そもそも一度も実装されていない欠陥**。 OS ファイルドロップ (`tauri://drag-drop`) は payload に `{ paths }` しか持たず **カーソル座標 (clientX/Y) を OS 仕様上一切持たない**。 ドロップ座標は配置経路のどこにも入っていない。
- アイテム 0 個で必ず左上端になるのは、 `workspace-widgets.svelte.ts` の `computeClusterAnchor` が空配列で `null` を返し、 `addWidget` が (0,0) 起点の `findFreePosition` にフォールバックするため。

詳細な処理経路と簡素化案は [PH-CF-200](./PH-CF-200_workspace-dnd-placement.md) を参照。 配置ロジックが `addWidget` (spiral) / `addWidgetAt` (直接) / `bulkAddItemWidgets` (線形) / `computeClusterAnchor` の 4 経路に分散しており、 seed 解決を 1 関数に集約する簡素化も同 PH で扱う。

---

## Codex クロスチェック / レビュー反映

本 plan は Claude の調査後、 Codex CLI (`codex exec --sandbox read-only`) で **(1) 28 件の root cause 独立クロスチェック** と **(2) plan 草案レビュー** を実施した。 Codex の生出力は `audit/CODEX_ROOTCAUSE_CROSSCHECK_2026-05-23.md` / `audit/CODEX_PLAN_REVIEW_2026-05-23.md` に未加工で保存。

### root cause クロスチェックの差異 (Claude の調査を修正した点)

| 件                       | Codex 判定 | plan への反映                                                                                                                                                                                                    |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D3                       | 誤診断     | 「icon 不一致」 は projects でなく **exe_folder** (meta `FolderOpen` ≠ shell `AppWindow`)。 projects / script_folder は meta/shell 一致。 PH-CF-500 を修正                                                       |
| E5                       | 見落とし   | `ItemNotFound` の根は孤立 item だけでなく **cascade DELETE 後にフロント `itemStore` が refresh されず ghost item が残る** stale cache。 PH-CF-100 に itemStore refresh タスクを追加                              |
| C4                       | リスク指摘 | `searchItemsInTag` は favorites widget も使用 (`FavoritesWidget.svelte:34`)。 `is_enabled=1` 単純撤去は favorites に hidden 漏れ → PH-CF-600 を `include_disabled` flag 方式 + call-site matrix に変更           |
| A1 / C2 / F2 / PH-PQ-600 | 部分一致   | A1 は「起動経路に無い」 と断定せず「キャッシュ無し mount 時 scan」 と framing 修正 / C2 は仮説である旨を明記済 / F2 は「白文字」 でなく derived accent-text のコントラスト / PH-PQ-600 §2 は推定であることを明記 |

それ以外の 21 件は Codex も AGREE。

### plan レビューで取り込んだ改善 (Codex の建設的提案)

| PH        | 取り込んだ改善                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PH-CF-100 | cascade を 1 トランザクション化 / `delete_items` を **必須引数** (implicit default 禁止) に / mixed widget payload の統合 test                 |
| PH-CF-200 | ドロップ先 page をドロップ開始時に固定 (非同期ドロップ中のタブ切替で誤配置しない) / 実 OS drop 経路 + zoom/scroll の e2e                       |
| PH-CF-400 | entry の **安定 identity 契約** (正規化済 絶対パス、 hide/override が再設計で外れない) / symlink ループ・permission denied・cancel 遅延の test |
| PH-CF-600 | C4 を flag 方式 + call-site matrix へ (上記)                                                                                                   |
| README    | 再発防止の機械監査 3 種を §機能契約 に明記 (下表)                                                                                              |

---

## 推奨対応順

CLAUDE.md `feedback_serial_pr_discipline` (並行 PR 禁止) に従い直列。 番号順を基本とし、 データ整合と高リスク再発バグを前方に置く:

| 順 | PH         | 理由                                                                                                           | 依存             |
| -- | ---------- | -------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1  | PH-CF-100  | データ整合 (孤立 item / ItemNotFound) が最優先。 後続 PH の cascade 前提を確定させる                           | —                |
| 2  | PH-CF-200  | 高リスク再発バグ。 初回 user が必ず踏む。 早期に処理経路を簡素化                                               | —                |
| 3  | PH-CF-300  | 破壊的操作の確認。 E6 は 100 の cascade flag を前提にする                                                      | PH-CF-100        |
| 4  | PH-CF-400  | EXE 検出ロジックの全面再設計。 後続 500 / 900 の前提                                                           | —                |
| 5  | PH-CF-500  | 監視ウィジェット chrome。 exe-folder settings を 400 と共有                                                    | PH-CF-400        |
| 6  | PH-CF-600  | ライブラリ バグ修正                                                                                            | —                |
| 7  | PH-CF-700  | ライブラリ UX + 背景 (機能追加)                                                                                | —                |
| 8  | PH-CF-800  | テーマ / 設定 polish                                                                                           | —                |
| 9  | PH-CF-900  | アプリのコールドスタート perf 全般。 棚卸し → release 計測 → 改善。 exe scan キャッシュ化タスクのみ 400 に依存 | PH-CF-400 (一部) |
| 10 | PH-CF-1000 | オーバーレイ drag region 横展開                                                                                | —                |

**工数感**: 直列で約 8-12 週間。 内訳は各 PH の §工数感 を参照。 PH-CF-100 / 200 / 400 (再設計を含む) が重く、 600 / 700 / 800 / 1000 は比較的軽い。

---

## 機能契約に足す項目 (一覧)

各 PH の §機能契約の追記 で詳述。 追記先 spec と機械検出の対応:

| テーマ                          | 追記先 L2 features spec                                                              | 機械検出チェック                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| workspace ↔ Library 参照整合    | `features/backend/workspace-service.md` / `features/backend/item-service.md`         | 孤立 item 検出の referential-integrity audit query + unit test (workspace 削除後 0 孤立)       |
| 破壊的操作の確認                | `features/screens/library.md` / `features/screens/workspace.md`                      | 「破壊的アクションは confirm modal か undo-toast のいずれかを必ず経由」 を e2e で検証          |
| 監視ウィジェット共通契約        | `features/widgets/_chrome-consistency.md`                                            | card を持つ widget の不透明 sticky bar を検出する audit script                                 |
| widget 設定デフォルト単一情報源 | `features/widgets/_chrome-consistency.md`                                            | widget 本体 と settings の `?? default` 不一致を検出する audit script                          |
| EXE 検出ロジック                | `features/backend/exe-scanner.md` / `features/widgets/exe-folder.md`                 | 「第1階層フォルダ = 1 entry / 重複ラベル無し」 を Rust unit test (多階層 nesting fixture)      |
| Launch this week 集計           | `features/backend/item-service.md`                                                   | launch_log datetime フォーマット一致の unit test (7 日境界 fixture)                            |
| hidden item の Type タブ表示    | `features/screens/library.md`                                                        | hidden item を含む tag 検索の unit test                                                        |
| panel の閉じ条件                | `features/screens/library.md`                                                        | 検索バー / sort クリックで panel が閉じない e2e                                                |
| オーバーレイ drag region        | `features/screens/onboarding.md` / `features/cross-cutting/`                         | 全 `fixed inset-0` オーバーレイに `data-tauri-drag-region` を要求する audit script             |
| アプリのコールドスタート perf   | `features/backend/exe-scanner.md` / `features/cross-cutting/` (or `vision.md` D1-D9) | 起動 cold/warm P95 を **release binary** で CI hard gate。 backend + frontend の段階内訳を計測 |

---

## 各 phase 共通の進め方

paid-quality README と同一:

1. **fact 確認**: 該当 file:line を実 read、 引用元 guideline doc を明示 (CLAUDE.md `<critical-rule id="cite-guideline">`)
2. **横展開 audit**: 1 file 直して終わりにしない、 同 pattern を grep で sweep (`<critical-rule id="lateral-sweep">`)
3. **再現 + screenshot**: agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` 隔離) で実機 reproduce、 before/after screenshot を Read で目視評価 (`<critical-rule id="dom-not-fixed">`)
4. **受け入れ条件は測定可能**: 抽象表現禁止、 「audit 0 violations」 「unit test pass」 等の機械検出に落とす
5. **1 phase 1 PR シリアル**: 並行 PR 禁止 (`feedback_serial_pr_discipline.md`)

---

## 確定済の方針判断

- **F1 テーマ体系 (option A 確定、 2026-05-23 user 確認)**: builtin テーマを **6 本** に整理する — 3 系統 (glass デフォルト / ブルータリスト / ニューモーフ) × Dark/Light。 並び順は「ダーク → ライト → ブルータリスト ダーク → ブルータリスト ライト → ニューモーフ ダーク → ニューモーフ ライト」。 **HUD は組み込みから削除** (印象が薄いため)。 詳細タスクは PH-CF-800 §F1 を参照。

---

## 参照

- 既存 L3 雛形: `docs/l3_phases/_template/use-case-audit.md`
- 既存 plan 例: `docs/l3_phases/_archive/PH-issue-024_opener-registry.md` / `docs/l3_phases/paid-quality/PH-PQ-600_widget-expansion.md`
- L2 features spec 群: `docs/l2_foundation/features/`
- 失敗駆動メモリ: `docs/l2_foundation/lessons.md`
- 設計の固定枠 / 禁止事項: [`CLAUDE.md`](../../../CLAUDE.md)
- Codex root cause クロスチェック (生出力): [`audit/CODEX_ROOTCAUSE_CROSSCHECK_2026-05-23.md`](./audit/CODEX_ROOTCAUSE_CROSSCHECK_2026-05-23.md)
- Codex plan レビュー (生出力): [`audit/CODEX_PLAN_REVIEW_2026-05-23.md`](./audit/CODEX_PLAN_REVIEW_2026-05-23.md)
