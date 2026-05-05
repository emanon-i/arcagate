---
id: PH-20260423-140
title: SettingsPanel セクション整理 + フォームコントロール統一
status: done
batch: 30
priority: low
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/settings/SettingsPanel.svelte
  - src/lib/components/arcagate/settings/
parallel_safe: true
depends_on: []
---

## 背景/目的

batch-21 で Settings ボタンを TitleBar に統一した。
次のステップとして SettingsPanel の内容を整備し:

1. セクション見出しの統一（`<h2>` + `<h3>` の階層化）
2. フォームコントロールの視覚的統一（`--ag-*` トークン使用）
3. 各設定項目の説明テキスト追加

## 実装ステップ

### Step 1: SettingsPanel の現状確認

`src/lib/components/arcagate/settings/SettingsPanel.svelte` を読み込み、
セクション構成・トークン使用状況を把握する。

### Step 2: セクション見出し統一

- 各設定セクションに `<h3 class="text-[var(--ag-text-secondary)] text-xs uppercase tracking-wide mb-2">` を付ける
- セクション間の `<Separator>` で区切りを明示

### Step 3: フォームコントロールの統一

- input, select が `--ag-*` トークンを使用しているか確認
- shadcn の Input / Select コンポーネントに置き換え済みなら、スタイル確認のみ
- 未置き換えのネイティブコントロールがあれば shadcn コンポーネントに移行

### Step 4: 説明テキスト追加

主要設定項目に `<p class="text-xs text-[var(--ag-text-tertiary)] mt-0.5">` で説明を追加。

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] SettingsPanel のセクション見出しが視覚的に統一されていること（実機確認）
- [ ] フォームコントロールのスタイルが `--ag-*` トークン準拠であること
- [ ] settings.spec.ts の既存テストが全通過すること
