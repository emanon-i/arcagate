---
id: PH-20260427-388
status: todo
batch: 86
type: 改善
era: Polish Era
---

# PH-388: README 磨き込み

## 参照した規約

- `docs/l0_ideas/arcagate-engineering-principles.md` §9「他人に渡しても困らない」: README + 初回セットアップ完走
- GitHub public 状態で配布可能、README が「アプリの顔」

## 横展開チェック実施済か

- 現状 README.md の中身を確認（短い / 機能不明瞭ならリライト）
- 既存スクリーンショット資産は `tmp/screenshots/` に分散、整理されていない

## 仕様

### README 構成

```markdown
# Arcagate

> 1 行コピー: PC上に散在する起動元を集約する個人用コマンドパレット

[ヒーロースクショ or GIF placeholder]

## 何ができる

- ホットキーで起動 → 任意のアプリ / URL / ファイル / 定型操作を一発実行
- Workspace でよく使うものを並べて 1 クリック起動
- Library でアイテム管理 + タグ分類 + 検索

[3 機能スクショ placeholder × 3]

## インストール

- Releases から最新版をダウンロード（msi / NSIS）
- Windows 11 64bit 対応（macOS / Linux は scope 外）

## 使い始める

1. アプリ起動
2. グローバルホットキー（デフォルト Ctrl+Space）でパレット起動
3. アイテムを Library から追加（D&D 対応）

## 開発

`pnpm verify` で全検証、`pnpm tauri dev` で開発起動。

## ライセンス

MIT
```

### スクショ placeholder

`docs/screenshots/` ディレクトリを新設し、空状態アイコン + README 用 placeholder PNG を配置（実機スクショは Polish Era の別 plan で撮影）。

## 受け入れ条件

- [ ] README.md を上記構成にリライト
- [ ] スクショ placeholder ディレクトリ整備（`docs/screenshots/README.md` で「ここに XXX のスクショを配置」と説明）
- [ ] LICENSE ファイル存在確認、無ければ MIT 追加
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **C**laims: README の主張 = アプリの実態 と一致
- **I**mage: 業界標準（Hero + 機能 + Install + Usage）に合致
- **U**ser expectations: 初見で「何のアプリ？」「使えそう？」が 30 秒で分かる
