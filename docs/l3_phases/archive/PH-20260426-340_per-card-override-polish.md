---
id: PH-20260426-340
status: done
batch: 77
type: 改善
---

# PH-340: LibraryDetailPanel per-card override UI 仕上げ

## 横展開チェック実施済か

- batch-67 で per-card override (`card_override_json: Option<String>`) + 「個別調整」「グローバルに戻す」ボタンを実装
- 残り polish: 視覚フィードバック / 差分プレビュー / 削除確認の整備
- LibraryCardSettings.svelte と整合する UI 用語

## 仕様

- per-card override がアクティブな状態（card_override_json が non-null）でカードに視覚バッジを付ける
- 「グローバルに戻す」を押す前に「変更が失われます」確認ダイアログ（Workspace 編集破棄確認と同じ思想）
- override 設定中は LibraryCardSettings の global 設定が grayed out + 「このカードは個別調整中」hint
- override 解除時に成功 toast

## 受け入れ条件

- [ ] override 中バッジ表示
- [ ] 解除確認ダイアログ動作
- [ ] grayed-out hint 表示
- [ ] `pnpm verify` 全通過
