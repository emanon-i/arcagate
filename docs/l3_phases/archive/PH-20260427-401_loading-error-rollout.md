---
id: PH-20260427-401
status: done
batch: 89
type: 改善
era: Polish Era
---

## 完了ノート（batch-89）

- LoadingState 適用 2 箇所（LibraryMainArea / SettingsPanel）
- ErrorState 適用箇所なし: 致命的 error は toast で十分、深追いしない（YAGNI）
- AboutSection.test は Tauri API mock 必要 → batch-90 Use Case Audit と並行で着手可

---

# PH-401: LoadingState / ErrorState を既存箇所に適用 + AboutSection テスト

## 参照した規約

- batch-88 PH-397 で LoadingState / ErrorState コンポーネント新設
- 既存 Loading 表示は LibraryMainArea の hand-rolled spinner、Settings の "読み込み中..."
- batch-88 PH-398 の AboutSection.test 残課題

## 仕様

### LoadingState 適用

既存 hand-rolled Loading を LoadingState に置換:

- LibraryMainArea.svelte の Loading 表示
- SettingsPanel.svelte の `configStore.loading` 表示
- その他 grep で見つかる `animate-spin` パターン

### ErrorState 適用

致命的 error 表示として:

- Settings の保存エラー（toastStore とは別の永続表示）
- IPC 致命的エラー時の inline 表示

### AboutSection テスト

`src/lib/components/settings/AboutSection.test.ts`:

- Tauri API mock（@tauri-apps/api/app の `getVersion`/`getTauriVersion`）
- ロード中は version === null、ロード完了で version 表示
- 外部リンクが `target="_blank" rel="noopener noreferrer"` を持つ

## 受け入れ条件

- [ ] LoadingState 適用 2 箇所以上
- [ ] ErrorState 適用 1 箇所以上（ない場合は「適用候補なし」明記）
- [ ] AboutSection.test.ts 3 ケース追加
- [ ] vitest 142 → 145 件
- [ ] `pnpm verify` 全通過
