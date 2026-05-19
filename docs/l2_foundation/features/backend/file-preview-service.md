# File Preview Service

> backend feature / レイヤー: commands → service → filesystem

## 目的

text ファイルの metadata と中身、Markdown frontmatter を読み取り File Preview widget へ提供する backend feature。

## やること (必要処理)

- `read_file_preview`: name / ext / size / 作成・更新時刻 / content を返す
- content は 256KB で cap、truncated flag を立てる
- NULL byte でバイナリ判定
- Markdown の YAML frontmatter (`---` 区切り) を抽出

## やらないこと (禁止 / scope 外)

- 画像 / バイナリのプレビューをしない
- syntax highlight をしない (raw text)
- ファイルを編集・書き込みしない (read-only)
- 256KB を超える全文を読まない (DoS 防止の cap)
- ファイル変更を監視しない (再読込は widget からの明示要求のみ)

## 性能予算

- read は 256KB cap で有界。1 ファイル 1 IPC

## 副作用 (state 変化 / persistence)

- なし (read-only)

## 依存

- 外部 crate なし
- 依存される: File Preview widget

## 既知の判断

- 存在確認 + `is_file()` チェック + 256KB cap (DoS 防止)
