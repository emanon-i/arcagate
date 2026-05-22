---
id: PH-CF-400
status: planning
batch: clean-feedback
type: バグ修正
era: Distribution Hardening
parent: README.md
---

# PH-CF-400: EXE フォルダ監視 検出ロジック再設計

## 元 user fb (検収項目)

- **D5**: EXE フォルダ監視 — 監視拡張子を可変に (.exe 固定でなく .blend / .clip 等も対象に設定可能)。 検出階層も可変に (例 3 階層)
- **D6**: EXE フォルダ監視の検出ロジックがバグ。 症状 = 重複ラベルが出る

## ユーザー指定の正しい検出仕様

- 監視拡張子を **可変** に (.exe 固定でなく .blend / .clip 等も設定可能)
- 検出階層を **可変** に (例 3 階層)
- **ラベル = Root 直下の第1階層フォルダ名**。 その配下で検出された対象ファイルを **1 つだけ** 選ぶ
- 選択優先度 = **浅い階層優先 → 同一階層ならファイルサイズ大優先**
- 対象ファイルが 1 つも検出されない第1階層フォルダは **一覧に出さない**
- 第1階層フォルダ = 1 entry。 重複ラベルは出ない

## 問題

現状の `exe_scanner_service.rs walk()` は **「対象ファイルを含むディレクトリごとに 1 entry」** を生成する。 正しい仕様の **「第1階層フォルダごとに 1 entry」** とは粒度が完全に違い、 1 つの第1階層フォルダ配下の複数階層に対象ファイルがあると **同じラベルの entry が複数生成される** (= D6 重複ラベル)。 また拡張子はハードコード、 階層は 1-3 にクランプ固定 (= D5 未対応)。

## 引用元 guideline doc

| Doc                                                  | Section      | 採用判断への寄与                             |
| ---------------------------------------------------- | ------------ | -------------------------------------------- |
| `docs/l2_foundation/features/backend/exe-scanner.md` | 検出ロジック | 第1階層 = entry の契約を明文化               |
| `docs/l2_foundation/features/widgets/exe-folder.md`  | widget 仕様  | 拡張子 / 階層の設定 UI                       |
| `docs/l0_ideas/motivation.md`                        | 利用形態     | Steam ゲーム / 創作ファイル等の起動元集約    |
| `CLAUDE.md`                                          | レイヤー設計 | scanner は service 層、 cmd → service → walk |

## Fact 確認 (root cause)

### D6: 重複ラベルの真因 (断定)

`exe_scanner_service.rs`:

- `walk()` (`:64-169`) は `root` から再帰的に各ディレクトリを訪れ、 **対象ファイルを含むディレクトリごとに `out.push`** する (`:152`)
- `folder_name` (`:133-144`) は `root` からの相対パスの最初の component (= 第1階層フォルダ名) にしている
- `folder_path` は `dir.to_string_lossy()` (`:153`、 訪問中の実ディレクトリ)

→ 第1階層フォルダ配下の **複数階層それぞれに対象ファイルがある** と、 `folder_name="GameA"` の entry がファイルを含む階層の数だけ生成される。 `folder_path` は別物だが **ラベル (`folder_name`) が同一**。 フロント (`ExeFolderWatchWidget.svelte:443/475`) は `folderPath` を key に全 entry を render → 同じ「GameA」 ラベルが複数並ぶ。

既存テスト `scan_depth_limits_recursion` (`:276` 付近、 depth=3) は `level1` + `level1/level2` の **2 entry を期待** しており、 **バグを「正しい」 とテストが固定化している**。

### D5: 拡張子 / 階層の現状

- **拡張子**: ハードコード。 `:106` で `Some("exe" | "bat" | "cmd" | "ps1" | "sh")` の固定マッチ。 `.blend` / `.clip` 等は不可。 設定 UI (`ExeFolderSettings.svelte`) にも config 型にも拡張子フィールドなし
- **階層 (`scan_depth`)**: 可変だが `:50` で `depth.clamp(1, 3)`、 `ExeFolderSettings.svelte:62-76` の `min=1 max=3`。 上限 3 固定

## スコープ

- `walk()` を **「第1階層フォルダ単位の entry 生成 + 配下の最良 1 ファイル選択」** に全面再設計
- 監視拡張子を `Vec<String>` で可変化、 設定 UI を追加
- 検出階層の上限 3 固定を撤廃 (可変、 妥当な上限値は実装時に決定)
- 既存テストを正しい仕様に合わせて全面書き直し

## やらないこと

- exe scan 結果のキャッシュ — PH-CF-900 (本 PH で再設計した scanner にキャッシュを載せる)
- exe-folder widget の chrome (sort バーめり込み 等) — PH-CF-500
- 他の監視 widget (script_folder / projects) の検出ロジック

## 具体タスク

1. **`walk()` 再設計** (`exe_scanner_service.rs:64-169`):
   - Root 直下の第1階層フォルダを列挙
   - 各第1階層フォルダ配下を `scan_depth` まで再帰探索し **全対象ファイルを収集**
   - 収集集合から「浅い階層優先 → 同一階層ならファイルサイズ大優先」 で **1 ファイルを選択**
   - 第1階層フォルダごとに 1 entry (`folder_name` = 第1階層名、 選択ファイルへの参照)
   - 対象ファイル 0 件の第1階層フォルダは entry を出さない
2. **拡張子の引数化**: 監視拡張子を `Vec<String>` 引数に。 `cmd_scan_exe_folders` のシグネチャ (`exe_scanner_commands.rs:14-27`) に `extensions` 追加。 `:106` の固定マッチを引数集合との照合に置換。 大文字小文字を正規化
3. **階層上限の撤廃**: `:50` の `clamp(1, 3)` を撤廃 (または妥当な上限へ緩和)。 `ExeFolderSettings.svelte:62-76` の `max=3` も連動
4. **設定 UI**: `ExeFolderSettings.svelte` に拡張子入力 UI を追加、 config 型 (`index.ts` defaultConfig + 型定義) に `extensions` を追加。 default は `["exe", "bat", "cmd", "ps1", "sh"]`
5. **entry の安定 identity 契約 (Codex review)**: フロントは entry を `folderPath` で key 化し、 hide / override 設定もこれに紐づく。 再設計で entry 粒度が変わると **既存の hide / override が外れる**。 entry id を「**第1階層フォルダの正規化済 絶対パス**」 に固定し、 列挙順を deterministic (パス昇順等) にする。 旧 `folderPath` key からの移行 (widget_item_hides / widget config の参照更新) を back-compat test で保証
6. **異常系の堅牢化 (Codex review)**: depth 制限だけでは弱い。 symlink ループ (訪問済 inode/path の検出で無限再帰回避)、 permission denied (該当ディレクトリを skip して走査継続、 panic しない)、 cancel 応答遅延 (cancel token を walk ループ内で頻繁にチェック) に対応
7. **テスト全面書き直し**: `scan_depth_limits_recursion` の 2-entry 期待、 `exe_candidates` の複数候補前提など、 旧バグを固定化しているテストを正しい仕様に書き直す

## 受け入れ条件 (機械検出)

- [ ] Rust unit test: 第1階層フォルダ配下の **複数階層に対象ファイル** がある fixture で、 entry が **第1階層フォルダ数と一致 / 重複ラベル 0**
- [ ] Rust unit test: 1 つの第1階層配下に「浅い階層の小ファイル」 と「深い階層の大ファイル」 → **浅い方が選ばれる**
- [ ] Rust unit test: 同一階層に複数対象ファイル → **サイズ最大が選ばれる**
- [ ] Rust unit test: 対象ファイル 0 件の第1階層フォルダは entry に出ない
- [ ] Rust unit test: `extensions = ["blend"]` を渡すと `.blend` のみ検出、 `.exe` は無視
- [ ] Rust unit test: symlink ループを含む fixture で無限再帰せず終了する
- [ ] Rust unit test: permission denied のディレクトリを含む fixture で panic せず、 該当を skip して走査継続
- [ ] Rust unit test: entry id (正規化済 絶対パス) が安定し、 既存の hide / override 設定が再設計後も正しい entry に紐づく (back-compat)
- [ ] e2e / 手動: `ExeFolderSettings` で拡張子と階層を変更でき、 反映される

## 機能契約の追記

`features/backend/exe-scanner.md`:

> **EXE フォルダ検出契約**: scan の entry 単位は **Root 直下の第1階層フォルダ**。 1 第1階層フォルダ = 最大 1 entry。 entry のラベルは第1階層フォルダ名、 entry の **identity は第1階層フォルダの正規化済 絶対パス** (hide / override 設定がこれに紐づくため安定でなければならない)。 列挙順は deterministic。 配下を `scan_depth` まで探索し対象ファイルを収集、 「浅い階層優先 → 同一階層はサイズ大優先」 で 1 ファイルを選ぶ。 対象ファイル 0 件の第1階層フォルダは entry を生成しない。 監視拡張子は呼び出し側が `extensions` で指定し、 scanner にハードコードしない。 symlink ループ・permission denied で panic / 無限再帰してはならない。

`features/widgets/exe-folder.md`:

> 拡張子 (`extensions`) と検出階層 (`scan_depth`) は widget 設定で可変。 default 拡張子 = `["exe","bat","cmd","ps1","sh"]`。

機械検出: 上記の多階層 nesting fixture unit test を回帰テストとして常設。 「第1階層数 = entry 数」 の不変条件をテストで固定。

## 横展開

- フロントの `folderPath` key 採用 (`ExeFolderWatchWidget.svelte:443/475`) は entry が一意になれば問題ないが、 再設計後の entry id を確認
- script_folder / projects の検出が同型の「ディレクトリごと entry」 問題を持たないか確認 (script_folder は正常との user 報告だが、 D6 の教訓として念のため audit)
- 拡張子ハードコードが他の scanner (file_search / script) にもないか grep

## 工数感

| Task                          | 工数   |
| ----------------------------- | ------ |
| `walk()` 全面再設計           | 3-4 日 |
| 拡張子引数化 + 階層撤廃 + IPC | 1-2 日 |
| 設定 UI + config 型           | 1 日   |
| テスト全面書き直し            | 1-2 日 |

合計: 約 1.5-2 週間。

## 依存・着手順

- **先行**: なし
- **後続**: PH-CF-500 (exe-folder settings を共有)、 PH-CF-900 (再設計後の scanner にキャッシュを載せる)

## 参照

- `src-tauri/src/services/exe_scanner_service.rs:45-62, 64-169` (`walk`)、 `:50` (depth clamp)、 `:106` (拡張子)、 `:133-144` (folder_name)、 `:152-159` (out.push)
- `src-tauri/src/commands/exe_scanner_commands.rs:14-27`
- `src/lib/widgets/exe-folder/ExeFolderSettings.svelte:62-76`
- `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:443, 475`
- 旧バグを固定化したテスト: `exe_scanner_service.rs` の `scan_depth_limits_recursion` (`:276` 付近)
