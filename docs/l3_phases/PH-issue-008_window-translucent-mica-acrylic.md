---
id: PH-issue-008
title: ウィンドウ半透明 — Mica / Acrylic effect (Windows 11)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-476 (window translucent + workspace bg、rollback で revert)
---

# Issue 8: ウィンドウ半透明 (Mica / Acrylic)

## 元 user fb (検収項目 #8)

> ウィンドウを半透明にしたい (Windows 11 Mica / Acrylic 風)、奥の壁紙が透けて見える

## 引用元 guideline doc

| Doc                                                  | Section                             | 採用判断への寄与                             |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------- |
| `docs/l0_ideas/arcagate-visual-language.md`          | Frosted Glass / Ubuntu 系参照       | 「すりガラス感」は user 強い嗜好             |
| `docs/l1_requirements/ux_design_vision.md`           | §4 Ubuntu 系 + §3 Endfield          | Frosted Glass パネル、backdrop-filter blur   |
| `docs/l1_requirements/design_system_architecture.md` | §2-2 背景レイヤ変数 / §6 テーマ切替 | `--ag-blur-*` token、各 theme での透明度差分 |
| `docs/desktop_ui_ux_agent_rules.md`                  | P11 (装飾より対象) / P5 (OS 文脈)   | Windows 11 Mica は OS 標準慣習               |

## Fact 確認 phase

Tauri v2 の WebView2 は `backdrop-filter: blur()` 対応 (CSS だけで実現可能)。
Windows 11 ネイティブ Mica は Tauri が `tauri.conf.json` の `windowEffects` で指定可能 (Win32 API 経由)。

Goal A 時点:

- `tauri.conf.json` に `windowEffects` 設定なし → 通常の不透明 window
- CSS 側 `--ag-blur-*` token は `design_system_architecture.md` に設計あるが**未実装**
- AppShell に backdrop-filter なし

## UX 本質 phase

User 「半透明にしたい」 =

1. **全 window を半透明** ではなく、**裏に user の壁紙が透けて見える**程度
2. パフォーマンス: 常時 GPU 使用は避ける (`arcagate-visual-language.md` 「常時 GPU 使用 NG」)
3. **設定で ON/OFF 可能** (Windows / GPU 古い PC では OFF できる)

→ **Mica (背景画像 blur) を default ON、設定で「不透明」「Mica」「Acrylic」を選択可能**。

## 横展開 phase

| 領域                              | 対応                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `tauri.conf.json` `windowEffects` | `mica` を main window に設定 (Windows 11 のみ、Win10 は noop)                          |
| `src-tauri/src/lib.rs`            | (必要なら) `set_window_effects` 動的呼び出し (設定で ON/OFF)                           |
| AppShell.svelte                   | `bg-[var(--ag-surface-page)]/70` などで背景 alpha 化、`backdrop-filter: blur()` を適用 |
| Settings > 外観                   | 「ウィンドウ効果」select (Mica / Acrylic / 不透明)                                     |
| TitleBar                          | 半透明 window 上で TitleBar が見えないと困る → border / shadow 強化                    |

## Plan: 採用案 A: 「Mica default + 設定で 3 択」

**Tauri 側**:

- `tauri.conf.json`: main window に `windowEffects: ['mica']` 設定 (Windows 11 のみ動作、他 OS で noop)
- `cmd_set_window_effect(effect: 'mica' | 'acrylic' | 'none')` IPC 新規 (実行時切替)

**フロント**:

- AppShell: `bg-[var(--ag-surface-page)]/70 backdrop-blur-md` (CSS 補助)
- Settings に「ウィンドウ効果」select、選択値を config 永続化
- 起動時に config から読み込んで `cmd_set_window_effect` 呼ぶ

**規格**:

- `design_system_architecture §2-2`: `--ag-blur-md: blur(12px)` token を実装
- `--ag-surface-page` の alpha を Mica モード時に 0.7 程度に下げる (既存 surface tokens を override)

## 棄却案 B: 「常時 100% 半透明、設定なし」

- 古い PC で重い、user 制御不可
- → 棄却

## 棄却案 C: 「CSS backdrop-filter のみ、Tauri windowEffects 不使用」

- `backdrop-filter` は **window 内** の blur のみ、デスクトップ壁紙は透けない
- user 「奥の壁紙が透けて」要望に応えるには Tauri windowEffects 必須
- → 棄却

## E2E スコープ外

実機環境依存 (Windows 11 / GPU)、E2E では Mica の有無は判定困難 → smoke test スキップ、手動確認。

設定切替 UI の E2E は別 (Settings 画面の標準 spec で吸収)。

## 規格 update

- `ux_standards` に「§14 Window Translucency 規格」新設
- `design_system_architecture §2-2` に `--ag-blur-*` 実装値を embed

## 実装ステップ

1. `tauri.conf.json` に `windowEffects: ['mica']` (Win11 only)
2. `cmd_set_window_effect` IPC 新規 (Tauri Window plugin)
3. config に `window_effect` key 永続化
4. Settings > 外観 に select UI 追加
5. AppShell の背景 alpha + backdrop-filter
6. `--ag-blur-*` token 実装
7. `ux_standards §14` 新設、規格化
