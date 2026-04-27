---
id: PH-20260429-503a
title: Obsidian Canvas 仕様調査 + 取捨選択ドキュメント (PH-503 前提)
status: done
batch: 109
era: research
priority: critical
parent_l1: REQ-006_workspace-widgets
scope_files:
  - docs/l1_requirements/design/obsidian-canvas-spec-survey.md (新規)
---

# PH-503a: Obsidian Canvas 仕様調査 + 取捨選択

## 背景

ユーザー dev fb (2026-04-28):

> Obsidian Canvasの具体的な仕様についてはちゃんと調べてから真似するようにして
> （全部真似すると微妙になるかもだからそのまま真似する必要はないが操作感や挙動はかなり取り入れてほしい）

PH-503 (Workspace = Obsidian Canvas) の **前段階で仕様調査 phase を必須化**。
research → spec doc → 実装着手 の順序を厳守。

## 受け入れ条件

### 1. 公式ドキュメント熟読

- [ ] `https://help.obsidian.md/Plugins/Canvas` 全文 fetch
- [ ] `https://help.obsidian.md/canvas` 全文 fetch
- [ ] キーボードショートカット一覧抽出
- [ ] canvas file format `.canvas` JSON spec (公式記載があれば)

### 2. 操作仕様調査 (個別確認、出典付き)

| 観点                                         | Obsidian 挙動     | 出典 (URL or 推測) |
| -------------------------------------------- | ----------------- | ------------------ |
| 接続線 (edges) 描画 / 編集                   | ?                 |                    |
| グルーピング (同色枠)                        | ?                 |                    |
| alignment / distribution                     | ?                 |                    |
| select-all / multi-select Shift / Ctrl       | ?                 |                    |
| 右クリック context menu 項目                 | ?                 |                    |
| drag & drop ファイル投下                     | ?                 |                    |
| text card vs file card vs link card          | ?                 |                    |
| 矢印キー細かい移動 (1px / 10px)              | ?                 |                    |
| Delete key 挙動                              | ?                 |                    |
| copy / paste (同 canvas / 別 canvas)         | ?                 |                    |
| 拡大率上限 / 下限 / step                     | ?                 |                    |
| カードリサイズハンドル位置                   | ?                 |                    |
| 自動 layout / フリー配置 境界                | ?                 |                    |
| dotted grid サイズ / 色                      | ?                 |                    |
| mini-map (有無 / 挙動)                       | ?                 |                    |
| 一画面 fit shortcut                          | ? (推測 `Ctrl+1`) |                    |
| card type 切替方法                           | ?                 |                    |
| pan: マウスホイール / Shift / Middle / Space | ?                 |                    |
| zoom: Ctrl+wheel / トラックパッドピンチ      | ?                 |                    |
| Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)          | ?                 |                    |

### 3. 取捨選択ドキュメント作成

`docs/l1_requirements/design/obsidian-canvas-spec-survey.md` を新規作成、各機能を表で:

| 機能                              | Obsidian 挙動 | Arcagate 採用           | 採用しない理由 (該当時)               |
| --------------------------------- | ------------- | ----------------------- | ------------------------------------- |
| pan (wheel/Shift/Middle/Space)    | ✅            | ✅ 採用 (操作感)        | —                                     |
| zoom (Ctrl+wheel)                 | ✅            | ✅ 採用                 | —                                     |
| Undo / Redo                       | ✅            | ✅ 採用 (PH-477 既存)   | —                                     |
| Fit to content                    | ✅            | ✅ 採用                 | —                                     |
| 拡大率リセット                    | ✅            | ✅ 採用                 | —                                     |
| 即時保存                          | ✅            | ✅ 採用 (PH-503 大方針) | —                                     |
| dotted grid                       | ✅            | ✅ 採用 (見た目)        | —                                     |
| edges (接続線)                    | ✅            | ❌ 不採用               | Arcagate は launcher、widget 接続不要 |
| text node / link node / file node | ✅            | ❌ 不採用               | widget 配置中心、note 管理は scope 外 |
| .canvas JSON file format          | ✅            | ❌ 不採用               | SQLite で workspace state 永続化済    |
| グルーピング (同色枠)             | ✅            | 🟡 検討                 | widget 整理に有用、後続検討           |
| alignment / distribution          | ✅            | 🟡 検討                 | 複数選択で widget 整列、有用          |
| ミニマップ                        | ?? (要調査)   | ✅ 採用予定 (PH-503)    | —                                     |

### 4. spec sanity check

- [ ] agent 自己 review (取捨選択の妥当性)
- [ ] Codex に取捨選択 doc を投げて sanity check (option、Codex 6 までの中間確認)
- [ ] user に取捨選択 doc を提示して OK 取得

### 5. 不明 / 要 user 確認

- [ ] 公式 doc に明記されてない挙動は **「不明・要 user 確認」**として doc に明記
- [ ] 推測ベースの実装禁止
- [ ] Obsidian 内部実装依存の挙動 (画面 fit shortcut の正確な値等) は agent が dev で確認できないなら user に投げる

## 実装ステップ

1. WebFetch で公式 doc 2 URL fetch
2. (option) WebSearch で動画 / フォーラム発言を集める
3. obsidian-canvas-spec-survey.md 作成 (上記表形式)
4. 取捨選択を埋める (採用 / 不採用 / 検討 / 不明)
5. agent 自己 review
6. user に提示 → OK 取得 → PH-503 実装着手

## 関連 plan

- **PH-503** (本格実装) は本 research plan 完了が **前提条件**

## 規約参照

- engineering-principles §8 G9 テスト観点 (SFDIPOT で観点列挙可)
- engineering-principles §8 G10 コスト妥当性 (research → spec → 実装の段階分解)
- desktop_ui_ux_agent_rules.md (Obsidian / VS Code 慣習を踏襲)
