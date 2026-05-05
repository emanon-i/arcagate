---
id: PH-20260424-204
title: Settings 2ペイン化（Obsidian 風）
status: done
priority: high
parallel_safe: false
scope_files:
  - src/lib/components/settings/SettingsPanel.svelte
  - src/routes/+page.svelte
---

## 背景

ユーザ指示（2026-04-23）: 現行の Settings は単一縦スクロール。Obsidian のような左カテゴリ
サイドバー + 右コンテンツペインへ変更する。

## 変更内容

### SettingsPanel.svelte 全面リライト

- 左ペイン (~200px): カテゴリナビ（role="tablist"）
  - 一般 / ワークスペース / 外観 / サウンド / データ
  - アイコン付きボタン、aria-selected、focus-visible ring
  - ↑↓ キーでカテゴリ切り替え
- 右ペイン (flex-1): 選択カテゴリのコンテンツ
  - 各セクションは既存の HTML をそのまま移植
  - テーマセクション → 「外観 (Appearance)」にリネーム

### +page.svelte モーダルサイズ拡大

- `max-w-lg` → `max-w-2xl` に変更

## 受け入れ条件

- Settings を開くと左にカテゴリリスト、右にコンテンツが表示される
- カテゴリクリックで右ペインが切り替わる
- ↑↓ キーでカテゴリナビゲーション
- 既存の全設定操作（ホットキー・自動起動・ズーム・テーマ・サウンド・データ）が正常動作する
