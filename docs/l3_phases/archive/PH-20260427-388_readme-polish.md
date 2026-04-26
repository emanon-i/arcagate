---
id: PH-20260427-388
status: done
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

- [x] README.md を新設（Hero + 何ができる + Install + Usage + 開発 + アーキテクチャ + License）
- [ ] スクショ placeholder は batch-87 で追加（実機スクショ必要）
- [x] LICENSE ファイル新設（MIT）
- [x] `pnpm verify` 全通過

## 完了ノート（batch-86）

README + LICENSE が共に未存在だったため、Polish Era 第 1 弾の最重要タスクとして集中対応。
スクショ整備は実機環境での撮影が必要なので batch-87 PH-390/391 で消化。

## SFDIPOT 観点

- **C**laims: README の主張 = アプリの実態 と一致
- **I**mage: 業界標準（Hero + 機能 + Install + Usage）に合致
- **U**ser expectations: 初見で「何のアプリ？」「使えそう？」が 30 秒で分かる
