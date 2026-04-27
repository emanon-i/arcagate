---
id: PH-20260428-492
title: Settings Theme list 拡張 (Industrial Yellow 選択可能化)
status: todo
batch: 108
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/components/settings/AppearanceSettings.svelte
  - src/lib/state/theme.svelte.ts
---

# PH-492: Settings Theme list 拡張 (Industrial Yellow 選択可能化)

## 背景

仕様: `industrial-yellow-spec.md` 適用優先順位 §8 + 画面別翻訳「テーマ変更」。

PH-486 で builtin として登録した `theme-industrial-yellow` を Settings の Theme list に
表示してユーザーが選択可能にする。Theme 変更 dialog 自体も Industrial Yellow テーマで
使えるよう、theme switch UX を強化:

> 左にテーマサムネイル、中央に大きなプレビューカード。背景は薄い等高線とドット。
> 選択中テーマは黄色縦ラインと白枠。下部にカプセル型確定/キャンセルボタン。

ただし**MVP scope では既存 AppearanceSettings の theme list に Industrial Yellow を 1 行追加 + サムネイル**で済ませ、
2 ペイン preview UI は別 plan (将来) に切り出す。

## 受け入れ条件

### 機能

- [ ] **theme list 表示**: AppearanceSettings の theme list (既存 builtin + custom) に Industrial Yellow が表示される
- [ ] **サムネイル**: Industrial Yellow theme サムネイル (黒地 + 黄ドットフェード + 白 paper 角の 80×60 SVG or img)
- [ ] **選択 → 即時反映**: theme 切替で `data-theme="theme-industrial-yellow"` が `<html>` に付与、CSS 変数 + 背景レイヤー (PH-490) が即時切替
- [ ] **「現在選択中」インジケータ**: 既存実装維持 (border-accent or ring)、Industrial Yellow theme 時は L-bracket (PH-488) 検討
- [ ] **PH-491 home redesign 連動**: theme 切替後 home 画面が RadialHub に切替

### 横展開チェック

- [ ] Liquid Glass / Endfield-builtin / Ubuntu Frosted の builtin theme と同じ表示パターン
- [ ] Custom theme (ユーザー作成) との並列表示 OK
- [ ] PH-486 で seed した theme-industrial-yellow が Rust DB から取得される

### SFDIPOT

- **F**unction: Settings → Appearance → theme select → 即時反映
- **D**ata: themeStore.themes (Rust DB から) + activeMode
- **I**nterface: `themeStore.setThemeMode('theme-industrial-yellow')` で IPC + applyTheme
- **P**latform: WebView2 で `data-theme` attribute + CSS var
- **T**ime: instant (CSS var update のみ)

### HICCUPPS

- [Image] 仕様 画面別翻訳「テーマ変更」 (MVP は既存 list 拡張のみ、preview 画面は scope 外)
- [User] 既存 theme と並列で選択肢として明示

## 実装ステップ

1. AppearanceSettings.svelte の theme list が `themeStore.themes` を表示している箇所を確認
2. Industrial Yellow サムネイル SVG を `static/themes/industrial-yellow.svg` で作成 (黒地 + 黄ドット + 白 paper モチーフ)
3. theme カード表示で sumbnail rendering 確認 (既存 builtin theme と同じパターン)
4. theme 切替動作確認 (theme.svelte.ts:setThemeMode + applyTheme で即時反映)
5. unit test: theme list に theme-industrial-yellow が含まれること、選択で activeMode 変化

## 規約参照

- `industrial-yellow-spec.md` 適用優先順位 §8
- 既存 PH-50 ThemeEditor の theme list 表示パターン

## 参考

- AppearanceSettings.svelte (既存 theme list)
- theme.svelte.ts:setThemeMode / applyTheme
- src-tauri/src/services/theme_service.rs (builtin seed)
