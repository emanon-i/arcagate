# Codex 6 回目 review プロンプト (batch-107 Polish Era 完走 + Industrial Yellow 採用判定)

> **draft** — `/run-codex` 起動時に下記を base prompt として使用。
> 起動タイミング: PR #185 (batch-107 archive + batch-108 plans) merge 後、main pull で 73b13c5 + #185 反映済の状態で。

## Codex 6 への質問 (2 軸)

### 軸 1: Polish Era 完走判定

batch-107 (Widget UX 全面改修) で user fb 14 項目 → 8 plan (PH-472〜479) を全て main 反映完了。
これで Polish Era は完走したと判断してよいか?

#### batch-107 で main 反映済の改修

| Plan   | 内容                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------- |
| PH-472 | Widget Move/Resize/Delete ハンドル普通化 (shadcn 風 floating × button、選択時のみ表示)                  |
| PH-473 | 衝突回避 + Grid 50% 縮小 (320×180 → 160×100) + Canvas +4 行余白 + Crop ボタン                           |
| PH-474 | Item Picker = LibraryCard 再利用 + 複数選択 (multi + checkbox + 確定 button) + Rust 削除 cascade        |
| PH-475 | Font Token 化 (`text-ag-{xs..2xl}` 6 段階) + audit script + lefthook + CI 統合                          |
| PH-476 | Window 半透明 MVP (Mica/Acrylic via window-vibrancy crate)                                              |
| PH-477 | Undo/Redo system (Ctrl+Z / Ctrl+Shift+Z, ring buffer 50, 4 entry kind)                                  |
| PH-478 | Widget 編集 state 整理 (race-free lock + history clear で「再編集で前 draft 残らない」fix)              |
| PH-479 | App 全体 reactivity 監査 + items/workspace/theme spread copy + Promise.all reload + helper + 7 E2E spec |

#### Codex 5 で残っていた TOP 3 懸念 (POST v0.2.0 推奨)

batch-106 後の Codex 5 review で「Polish Era 続編」として推奨されていた:

- panic_hook + ErrorBoundary 統合 end-to-end (hard crash 捕捉)
- KillSwitchDialog UX (何が無効化 / なぜ / 次に何をすべきか)
- Telemetry/Crash 配信信頼性 (flush() 24h timer / retry+backoff+jitter)

これらは batch-107 では touch せず Distribution Era 続編 (batch-109+) として残置中。
**質問**: Polish Era 完走の定義として、これら 3 件は **scope に含むべきか / Distribution Era 別 batch で OK か**?

#### 残課題 (batch-107 MVP scope 外、batch-108 以降で扱う)

- per-workspace 背景画像 (PH-476 MVP scope 外)
- Library フィルタ (PH-474 sort のみ実装、tag/type フィルタは未)
- Industrial Yellow theme 採用 (batch-108 で実装着手予定 ← 軸 2 へ)

### 軸 2: Industrial Yellow theme 採用判定 (batch-108)

#### 仕様

`docs/l1_requirements/design/industrial-yellow-spec.md` (新規 179 行)
出典: ChatGPT が Arknights:Endfield UI 画像を分析・言語化、user 経由で 2026-04-28 投下。

**方向**: 「青シアン発光端末」ではなく **「Industrial Yellow の技術資料 UI」**。
蛍光イエロー (#ffe600) + 黒地 + 白パネル + ハーフトーン/ハッチ/等高線 + ピル button + L 字ブラケット + オレンジ菱形マーカー。

#### batch-108 plan 構成 (8 plan、PH-486〜493)

| ID     | スコープ                                                                                 |
| ------ | ---------------------------------------------------------------------------------------- |
| PH-486 | Token 定義 (蛍光黄 #ffe600 / 黒地 / 白パネル / 既存 token system 拡張)                   |
| PH-487 | Halftone / dot-fade / hatch utility (CSS)                                                |
| PH-488 | Pill button + L-bracket + orange diamond marker (新 component)                           |
| PH-489 | White industrial paper panel (Card 系拡張)                                               |
| PH-490 | 背景レイヤー (薄い等高線 + dot-fade) AppShell 適用                                       |
| PH-491 | ホーム画面リデザイン (ラジアル + 傾いた card、Industrial Yellow theme 限定)              |
| PH-492 | Settings Theme list 拡張 (Industrial Yellow 選択可能化)                                  |
| PH-493 | 既存全 widget / panel に Industrial Yellow 適用 (横展開、theme-conditional CSS override) |

#### 採用判定要請

1. **採用方針**: 既存 5 builtin theme (Light/Dark/Endfield-builtin/Liquid Glass/Ubuntu Frosted) と並列で **新規 builtin theme として追加** (置き換えではない、共存) — この方針で OK か?
2. **scope 妥当性**: 8 plan で full 実装か、MVP として 4-5 plan に絞るべきか?
   - 例: PH-486 (token) + PH-487 (utility) + PH-488 (component) + PH-489 (paper panel) + PH-492 (theme 切替) で MVP、PH-490/491/493 は phase 2 (横展開後)
3. **batch-108 開始タイミング**: Polish Era 続編 (panic_hook 等) より先に Industrial Yellow を着手して問題ないか?
4. **既存テーマとの共存**: PH-493 の theme-conditional CSS override が既存テーマ regression を起こすリスクは?
5. **配布 (v0.2.0) との関係**: Industrial Yellow を含めて v0.3.0 とすべきか、v0.2.x で beta として出すか?

#### 禁忌 (memory `project_arcagate_design_direction.md` 反映済)

1. シアン主役 NG
2. 黒パネルだらけ NG (白パネル併用必須)
3. 等高線を主役 NG
4. 完全角丸 NG
5. 矩形グリッド NG
6. 単色フラット背景 NG
7. アンバー (金色っぽい黄) NG

これら禁忌は plan の受け入れ条件と矛盾しないか確認希望。

## Codex 6 のアウトプット期待

- **Verdict**: Polish Era 完走 (Go/No-go) + Industrial Yellow 採用 (Go/No-go)
- **TOP 3 残懸念** (Polish Era 完走後に最優先で扱うべき項目)
- **Industrial Yellow MVP scope 推奨** (8 plan 全 vs 5 plan MVP)
- **batch 順序提案** (Polish Era 続編 vs Industrial Yellow vs 配布 hardening)

## 参照

- main HEAD: 73b13c5 (PR #184 PH-479 reactivity)
- batch-107 archive PR #185 (本 commit 起動時に main 反映想定)
- 仕様: `docs/l1_requirements/design/industrial-yellow-spec.md`
- memory: `project_arcagate_design_direction.md` / `feedback_widget_editing_ux.md`
- Codex 4 review: `docs/l1_requirements/ux-research/codex-review.md`
- Codex 5 review: `docs/l1_requirements/ux-research/codex-review-batch-106.md`
