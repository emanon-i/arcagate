---
id: PH-20260427-417
status: done
batch: 92
type: 改善
era: UX Audit Re-Validation
---

# PH-417: エラー診断 + 復旧導線強化（Nielsen H9）

## 問題

batch-90 use-case-friction.md の medium 摩擦最大カテゴリ:

- 🟡 launch 失敗時の **diagnose 不足**: 「起動に失敗しました: <stack>」のみ、ファイルが見つからない / 権限なし / 実行不可 の区別なし
- 🟡 watch 一時エラー: silent retry → ユーザに何が起きてるか不明
- 🟡 IPC エラー: toast 短文のみ、復旧導線（リトライボタン / 設定ジャンプ）なし

Nielsen H9（Help users recognize, diagnose, and recover from errors）違反、severity 3 が複数想定。

Codex Q5 でも「エラー復旧導線 + in-app ヘルプ最小実装」を Q1 HE+CW 再監査の次に優先と判定。

## 改修

### 1. launch 失敗の原因分類（Rust 側）

`src-tauri/src/services/launch_service.rs` で:

- ファイル存在確認 → NotFound
- 拡張子 / 実行権限確認 → InvalidExecutable
- spawn 結果から exit code → SpawnFailed { code, stderr_excerpt }
- 上記を `LaunchError` enum に分類（`AppError` 派生）

### 2. エラー toast の充実（フロント側）

`src/lib/components/common/ErrorToast.svelte`（新設 or ErrorState 再利用）:

- エラー文言は「<原因> — <次の操作の促し>」フォーマット
  - 例: 「ファイルが見つかりません — パスを確認するか、ファイルを再選択してください」
  - 例: 「実行権限がありません — 管理者として実行を試してください」
- アクションボタン: [リトライ] / [パスを編集] / [削除] のいずれかを文脈で出す
- `aria-live="assertive"` でスクリーンリーダー対応

### 3. watch エラーの可視化

`src/lib/state/watch.svelte.ts`（または該当 store）:

- 一時エラー回数を state に保持
- N 回連続失敗で Settings の「監視フォルダ」に warning バッジ
- クリックで詳細エラー閲覧 + 再 subscribe ボタン

### 4. グローバルエラー境界

`src/lib/components/ErrorBoundary.svelte`（新設）:

- 未補足 promise / svelte error を catch
- 「予期しないエラーが発生しました — 再読み込みすると復旧する場合があります」
- [再読み込み] / [ログを確認] ボタン
- `cmd_log_frontend` 経由で Rust 側に詳細送信

## 解決理屈

- 「起動に失敗しました」だけでは Nielsen H9 を満たさない → 原因 + 解決方法を見せる
- watch silent エラーは User オラクル違反 → 必要なときに見える化
- 配布水準の必須要件（engineering-principles §9「ストレスがない」「壊れない」）

## メリット

- launch 失敗時にユーザが何をすべきか分かる
- watch が静かに死んでいる事故を防げる
- 配布後の問い合わせ減少（エラー文言 = ヘルプ）

## デメリット

- エラー文言の i18n 検討（現状日本語固定でよいが、英語化したくなった時に増える）
- ErrorBoundary 自体のテストが書きづらい（意図的にエラーを起こす test は flaky）

## 受け入れ条件（batch-92 スコープ：launch エラー分類 + toast 充実）

- [ ] `AppError` に launch 系 variants 追加（FileNotFound / PermissionDenied / NotExecutable）
- [ ] `launch_service.rs` で pre-flight check（path 存在 / 拡張子）→ 原因別エラー
- [ ] フロント `launchItem` catch で「原因 + 次の操作」フォーマット toast
- [ ] toast container に `aria-live="assertive"`（既存確認 + 追加）
- [ ] launch 失敗系 e2e テスト 1 ケース追加（存在しない path）
- [ ] `pnpm verify` 全通過

## 別 plan に切り出し（batch-93）

- watch エラーの可視化（バッジ + 詳細パネル + 再 subscribe）→ PH-424 候補
- `ErrorBoundary.svelte` 新設、未補足エラー catch → PH-425 候補
- launch 以外の IPC エラー全般のフォーマット統一 → PH-426 候補

## SFDIPOT 観点

- **F**unction（機能）: エラー時に何が起きたか説明
- **O**perations（運用）: 復旧導線の操作性
- **U**ser expectations（ユーザ期待）: Nielsen H9 / Raycast 同等

参照: `docs/l1_requirements/ux-research/industry-standards.md` H9 節 / engineering-principles.md §3 エラーハンドリング標準
