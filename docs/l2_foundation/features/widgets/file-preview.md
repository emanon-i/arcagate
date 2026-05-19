# File Preview Widget (ファイルプレビュー)

> widgetType: `file_preview` / category: memo / 配置画面: [Workspace](../screens/workspace.md)

## 目的

text ファイルの metadata + 中身を widget に表示する。D&D で配置でき、Markdown なら YAML frontmatter も表示する。

## やること (必要処理)

- config.path のファイルを `cmd_read_file_preview` で読み込み、name / ext / size / charCount / timestamp / content を表示
- Markdown の YAML frontmatter (key-value) をパース表示
- truncated / binary 状態を chip 表示
- double-click で OS default editor で開く、refresh button で再読込

## やらないこと (禁止 / scope 外)

- バイナリ / 画像のプレビューをしない (画像は Image Scrap widget の責務)
- ファイルを編集・書き込みしない (read-only)
- 大容量ファイルを全文ロードしない (backend が 256KB で truncate)
- ファイル変更を監視 / 自動再読込しない (refresh は手動)
- 対応外拡張子をスキャン対象にしない (D&D 検出側で md / txt / markdown / log / json / yaml / yml / toml / csv に限定)

## 性能予算

- ファイル read は backend 1 回。256KB cap で大容量でも有界
- frontmatter パースは文字列 split + regex で軽量

## 副作用 (state 変化 / persistence)

- widget config (`path`) を `workspace_widgets.config` JSON に保存
- ファイル read のみ、書き込みなし

## 依存

- IPC: `cmd_read_file_preview` / `cmd_open_path`
- config schema: `path: string`
- backend: [File Preview Service](../backend/file-preview-service.md)

## 既知の判断

- ⚠️ frontmatter パースは best-effort で multi-line YAML 値を無視する。複雑な YAML の正確表示は scope 外
