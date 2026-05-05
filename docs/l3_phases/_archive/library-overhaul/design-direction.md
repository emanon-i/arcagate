# §0 design 軸 + widget UX 常識 (L1/L2/L3 共通制約)

user 追加指示 (5/05): UX 改修は **Industrial Yellow design 方向** + **widget UX 常識** で実装すること。本 file は L1/L2/L3 全 Plan で参照される共通制約。

## 0.1 参照 source 優先順位

### 確定して参照すべき (本 file の上位)

1. **`docs/l1_requirements/ux_standards.md`** ✅ 存在 — 既存 widget 編集 UX 常識
2. **`docs/l1_requirements/ux_design_vision.md`** ✅ 存在 — UX 設計方針
3. **`docs/l1_requirements/design_system_architecture.md`** ✅ 存在 — token / theme / 配色
4. memory: **`project_arcagate_design_direction.md`** (archive 内) — 過去の design direction 記録
5. CLAUDE.md `<critical-rule id="label-content">` — 機能 / 状態 / アクション label 原則

### user が言及したが未存在 — Plan で create 必要

- `docs/l1_requirements/design/industrial-yellow-spec.md` ❌ 未存在
  → dispatch-queue で future PH-522-529 として queue 済だが未着手
  → **L2 着手時に「Industrial Yellow spec 起こし」を先行 task として include**
- `feedback_widget_editing_ux.md` ❌ memory に未存在
  → CLAUDE.md / 既存 memory `feedback_*.md` から精神 (普通のアプリならそうしない を避ける) を抽出して L1/L2/L3 で運用

## 0.2 Industrial Yellow design 軸 (Plan checklist)

L2/L3 の Plan doc に **必ず以下 checklist を含める**。各項目を component / dialog ごとに verify。

### 配色

- [ ] **蛍光イエロー (`#FFE600`)**: 主アクション (primary button) / 選択中 (selected state) / 重要通知
- [ ] **白パネル (`#F1F1EB`)**: 詳細 pane / 一覧 card 背景
- [ ] **黒地 (`#050605`)**: 全体背景 / 重 typography
- [ ] **オレンジ菱形 (`#FF7A00`)**: 通知 / 注目マーカー (新着 / 警告以外の attention)
- [ ] 既存 token (`--ag-accent` 等) との対応関係を design_system_architecture.md と整合

### Shape / decoration

- [ ] **完全角丸 NG**、軽い丸み (工業カードレベル `rounded-md` 以下)
- [ ] **ピル型物理ボタン** (フラットボタン NG、`shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]` 等で立体感)
- [ ] **L 字ブラケット** = focus / 選択 強調 (border の corner 装飾)
- [ ] **ハーフトーンドット** / **斜線ハッチ** を panel 角 / header に散らす (decorative SVG / CSS background)

### State

- [ ] **keyboard focus ring** = 蛍光イエロー輪郭 (`focus-visible:ring-2 focus-visible:ring-[#FFE600]`)
- [ ] **selected** = 蛍光イエロー fill or 蛍光イエロー border
- [ ] **hover** = 軽 elevation 変化 + 色変化最小 (Industrial の重さを保つ)
- [ ] **disabled** = opacity 0.4、明確に「触れない」感
- [ ] **error** = オレンジ菱形 + `--ag-error-text`

### Empty / loading / error

- [ ] empty state も同 design language (Industrial 装飾 + CTA はピル型)
- [ ] loading は monochrome spinner ではなく Industrial 風 (skeleton card に hatching 等)
- [ ] error は inline alert + オレンジ菱形 marker

## 0.3 widget UX 常識 checklist (`ux_standards.md` 由来)

L1/L2/L3 全 Plan で **以下を必ず checklist 化**。

### 削除 / 確認

- [ ] **削除確認は 1 step**、無駄な multi-step 禁止 (workspace で `instantDeleteWidget` + Undo toast 採用済の pattern を Library にも適用)
- [ ] delete は明示的 hover ✕ (透明背景 ✕ ではなく hover で red background 出る)
- [ ] 削除後 5 sec Undo toast (Phase L2-2)

### 視認性

- [ ] **半透明・ぼかしは最小限** (`bg-black/50` 系は dialog backdrop だけ、card 表面では使わない)
- [ ] background image / wallpaper を card 表面で透過させない (text 可読性 first)
- [ ] font / 背景 は予測可能な default (Settings dialog で初めて見える設定 NG)

### Label

- [ ] ラベルは **機能 / 状態 / アクション**を書く (CLAUDE.md `<critical-rule id="label-content">`)
- [ ] アイコン名 (「星」「三本線」「プラス」) 禁止
- [ ] ⭐+「お気に入り」/ ☰+「メニュー」/ ＋+「追加」が正

### keyboard a11y

- [ ] focus-visible で keyboard nav 経路すべてに focus ring
- [ ] tab order が visual 順序と一致
- [ ] `Esc` で modal close、`Enter` で primary action

### 「普通のアプリならそうしない」回避 (post-redo3 系の user feedback 由来)

- [ ] item picker は **大量 item で動く** (virtualization か progressive load、69+ で重くしない)
- [ ] grid resize で widget 中身が **見切れない** (container query 採用)
- [ ] handle 位置は予測可能 (resize handle は corner / edge の標準位置)
- [ ] 設定変えたら **即見た目が変わる** (CLAUDE.md `<critical-rule id="instant-feedback">`)
- [ ] 「DOM 存在 = 治った」判定禁止 (CLAUDE.md `<critical-rule id="dom-not-fixed">`)

## 0.4 Phase 別 適用度

### L1 (bug fix)

- 機能修復が主、**Industrial Yellow デザイン適用は控えめ**
- 既存 token / pattern (`--ag-*` CSS variable) に揃える程度
- 新規 dialog / panel を作る場合は **本 file の checklist を満たす**

### L2 (基礎 UX)

- **すべて Industrial Yellow を default として実装**
- L2 着手前に `industrial-yellow-spec.md` を起こす task を include (未存在のため)
- 既存 component の design refresh も同時実施 (Library 全体の visual consistency)
- 配色 / shape / state / empty/loading/error checklist を **全 component で verify**

### L3 (機能追加)

- L2 で確立した design language を継続適用
- 新機能 (virtualization / dynamic collection / bulk bar 等) でも checklist 全項目 OK

## 0.5 Plan doc に含めるべき節 (template)

各 Phase の Plan で以下節を必ず作る:

```markdown
## §X design checklist

### Industrial Yellow 適用箇所

- 本 PR で触る component 一覧
- 各 component で配色 / shape / state を design checklist と照合
- 必要なら before/after screenshot で確認
- 不適用箇所があれば理由を明示

### widget UX 常識 checklist

- 削除 / 確認 / 視認性 / label / keyboard a11y を本 PR で触る範囲で verify
- 「普通のアプリならそうしない」 回避 5 項目の self-check
```

→ Plan doc は本 file へのリンクと、Phase 固有の追記内容で構成。

## 0.6 不確かな点 (要 user decision)

- **D9 (新規)**: `industrial-yellow-spec.md` を **L2 着手時に起こす** vs **L1 中に先行で起こす** vs **既存 design_system_architecture.md を拡張**
  - agent 推奨: **L2 着手時に起こす** (L1 は bug fix scope を最小に保つ)
- **D10 (新規)**: Industrial Yellow を Library overhaul で **default theme として適用** vs **opt-in theme として保存** (既存 user の操作感維持)
  - agent 推奨: **default 適用** (徹底的 overhaul の趣旨)、ただし theme 切替えで現状 theme に戻れる退路は維持

D9 / D10 を decisions.md に追加して合計 D1-D10 にする。
