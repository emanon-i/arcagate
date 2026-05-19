# Snippet Widget (スニペット)

> widgetType: `snippet` / category: memo / 配置画面: [Workspace](../screens/workspace.md)

## 目的

label + body の定型文 (snippet) を widget 内で作成・編集し、ワンクリックで clipboard にコピーする widget。

## やること (必要処理)

- snippet の追加 / 編集 / 削除 (inline form)
- snippet click で body を clipboard にコピー
- 変更時に全 snippets 配列を widget config に一括保存

## やらないこと (禁止 / scope 外)

- file system / DB テーブルに書かない (config JSON にのみ保存)
- snippet の自動展開 / テキスト置換 (IME 連携) をしない (手動コピーのみ)
- 変数 / プレースホルダ展開をしない (plain text コピー)
- polling / IPC (clipboard write 以外) を持たない

## 性能予算

- 純 in-memory + config 保存。snippets 配列の JSON serialize は数 KB 程度

## 副作用 (state 変化 / persistence)

- widget config (`snippets[]` / `title`) を `workspace_widgets.config` JSON に保存
- clipboard への書き込み (copy 操作時)

## 依存

- IPC: `cmd_update_widget_config` のみ
- config schema: `snippets: { id, label, body }[]` / `title`
- backend: [Workspace Service](../backend/workspace-service.md)

## 既知の判断

- 旧 config が `max_items` 前提で不整合だったため専用 Settings (title のみ) に置換 (PH-issue-027)
