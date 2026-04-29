---
id: PH-20260424-227
title: テーマ JSON ファイルダウンロード / ファイル選択インポート
status: done
priority: medium
parallel_safe: false
scope_files:
  - src/lib/components/settings/SettingsPanel.svelte
depends_on: [PH-20260424-226]
---

## 目的

現在のエクスポートはクリップボードコピーのみ。インポートはテキストエリア貼り付け。
ファイルとしてダウンロード / <input type="file"> で読み込む UI を追加する。

## 実装内容

1. エクスポート: クリップボードコピーに加え、`<a download="theme.json">` を生成して
   JSON ファイルをダウンロードするボタンを追加
2. インポート: テキストエリアに加え `<input type="file" accept=".json">` を追加。
   選択したファイルを FileReader で読み込み → importTheme() に渡す

## 受け入れ条件

- [ ] エクスポートボタンでテーマ JSON ファイルがダウンロードされる
- [ ] ファイル選択ボタンで .json ファイルを選んでインポートできる
- [ ] `pnpm verify` 全通過
