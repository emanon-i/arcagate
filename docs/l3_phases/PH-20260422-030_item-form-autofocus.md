---
status: wip
phase_id: PH-20260422-030
title: ItemForm autofocus + URL フィールド type="url" 対応
depends_on: []
scope_files:
  - src/lib/components/item/ItemForm.svelte
parallel_safe: true
---

# PH-20260422-030: ItemForm autofocus + URL フィールド type="url" 対応

## 目的

ドラッグ&ドロップや「アイテムを追加」ボタンでフォームを開いた際、
ラベル入力欄に自動フォーカスされず、毎回手動でクリックする必要がある。
連続アイテム追加の操作ステップを削減する。

また URL モードの target 入力が `type="text"` のため、
ブラウザの URL バリデーションが活用されていない。

## 現状

```svelte
<!-- ItemForm.svelte: ラベル入力に autofocus なし -->
<input
    type="text"
    id="item-label"
    class="..."
    required
    bind:value={formState.label}
/>

<!-- URL モードの target: type="text" -->
<input
    type="text"
    id="item-target-url"
    ...
/>
```

## 設計判断

- ラベル入力に `autofocus` 属性を追加（`svelte-ignore a11y_autofocus` を許容）
- URL モードの target 入力を `type="url"` に変更（HTML5 validation 活用）
- `type="url"` は `required` との組み合わせでブラウザのバリデーションが機能する
- autofocus はダイアログ外から開いた時だけ発動するため問題なし

## 実装ステップ

### Step 1: ItemForm.svelte を読んでラベル入力フィールドを特定

ファイルを読み込んでラベル入力の構造を確認する。

### Step 2: autofocus 追加

ラベル入力フィールドに `autofocus` 属性を追加:

```svelte
<!-- svelte-ignore a11y_autofocus -->
<input
    type="text"
    id="item-label"
    autofocus
    ...
/>
```

### Step 3: URL モードの target を type="url" に変更

URL トグル選択時の target 入力フィールドを `type="url"` に変更。

### Step 4: pnpm verify

## コミット規約

`feat(PH-20260422-030): ItemForm ラベル autofocus + URL モード type="url" 対応`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] フォームを開いた際にラベル入力欄が自動フォーカスされること
- [ ] URL モードで `https://` 不正 URL 入力時にブラウザ検証エラーが出ること

## 停止条件

- ItemForm のラベル入力が複数箇所・条件分岐で存在し、autofocus の適用範囲が不明瞭 → 調査して報告
