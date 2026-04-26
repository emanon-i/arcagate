---
id: PH-20260427-422
status: done
batch: 93
type: 改善
era: UX Audit Re-Validation Round 2
---

# PH-422: launch error 構造化 + Windows 引数安全化（Nielsen H9）

## 問題

batch-92 PH-417 の launch エラー分類で 2 つの脆さが残存:

1. **フロント側 contains 判定が脆い**: `src/lib/utils/launch-error.ts:13` で `String(error).includes('File not found:')` パターン → エラーメッセージ文字列の言語化 / 形式変更で破綻
2. **`split_whitespace` Windows 引数問題**: `src-tauri/src/launcher/mod.rs:36 / :128` で `args.split_whitespace()` がスペース入りパス (`C:/Program Files/...`) を破壊

Codex Rule C 再 review (2026-04-27) で **Q5 #5 + #6 として指摘**。

## 改修

### Rust 側 — エラー構造化

1. **`AppError` に `code()` メソッド追加**: 各 variant に対応する文字列コード (`launch.file_not_found` / `launch.permission_denied` / `launch.not_executable` / `launch.failed` 等)
2. **境界 serialize 形式の拡張**: `{ code: string, message: string }` の object に変更
   - 現状: `serializer.serialize_str(&self.to_string())` → message のみ
   - 変更後: `serializer.serialize_struct` で `{ code, message }`
3. **後方互換**: フロント側で string 受け取りも継続可能 (toString 経由)

### Rust 側 — Windows 引数安全化

1. **`shell-words` クレート追加**: POSIX 風 quoting を解析
   - 候補: `shlex` (より広い対応) or `shell-words` (軽量)
2. **`launch_exe` / `launch_command`**: `args.split_whitespace()` を `shlex::split(args)` に置換
3. **テスト追加**: スペース入りパスでの引数解析が正しく分割される
   - `"C:/Program Files/Foo/foo.exe" --flag value` → `["C:/Program Files/Foo/foo.exe", "--flag", "value"]`

### フロント側 — 構造化判定

1. **`launch-error.ts` を errorCode field 判定に変更**:
   ```ts
   const code = typeof error === 'object' && error !== null && 'code' in error
     ? (error as { code: string }).code
     : null;
   if (code === 'launch.file_not_found') { ... }
   ```
2. **後方互換**: code が無い場合は従来の string contains にフォールバック
3. **launch-error.test.ts 追加ケース**: errorCode 経由の判定 5 ケース

## 解決理屈

- Codex Q5 #5 #6 の同時解消、launch UX H9 を実装レベルで強化
- shell-words 導入は依存予算 §5 通過 (3KB 程度、業界標準パターン)
- 構造化 code は i18n 対応の前提 (将来 messages.json 化時に必須)

## メリット

- フロント文字列パース不要、型安全
- スペース入りパス (`C:/Program Files/...`) で launch 成功率 100%
- i18n 化 (将来) に備えた基盤

## デメリット

- shell-words 依存追加 (curated list 通過必要)
- AppError serialize 形式変更 → 全 IPC 呼び出し catch の互換性確認
- 既存 launch-error.test.ts 既存テスト改修

## 受け入れ条件 (batch-93 必須スコープ — Windows 引数安全化を優先)

- [ ] shell-words (or shlex) crate 依存追加、Cargo.toml に記載
- [ ] launch_exe / launch_command / launch_script の split_whitespace を shell-words::split に置換
- [ ] スペース入りパス + `--flag "value with space"` 引数の単体テスト 3 ケース
- [ ] AppError に `code()` メソッド追加 (string code 返却)、serialize 形式は維持 (互換性)
- [ ] launch-error.ts に code() 利用は別 plan で対応する旨コメント
- [ ] `pnpm verify` 全通過 (clippy + biome)

## 別 plan に切り出し (batch-94 候補 PH-429)

- AppError serialize 形式を `{ code, message }` に変更 (IPC 境界 break change)
- launch-error.ts を errorCode field ベースに改修
- 全 IPC エラー catch の互換性確認
- e2e テストで原因別文言検証 (PH-423 と被るが完全な fix は serialize 変更後)

理由: serialize 変更は全 IPC 境界に影響、慎重に進めるため別 plan。
本 plan では「Windows 引数安全化」を最優先 (Codex 指摘の地雷)。

## SFDIPOT 観点

- **D**ata (データ): エラー情報の構造化
- **I**nterface (界面): IPC 境界の型安全
- **P**latform (環境): Windows パスの安全な扱い

参照: Codex review-batch-92.md Q5 #5 / #6 / batch-92 PH-417
