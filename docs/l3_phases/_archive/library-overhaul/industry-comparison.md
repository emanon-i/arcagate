# §5 industry comparison

各 tool から **Arcagate Library に取り入れたいパターン** と **真似しないほうがいい点** を抽出。詳細は subagent 調査結果 (1500 word) を圧縮。

## 5.1 横断比較表

| 機能        | Steam                             | Playnite                                  | Raycast/Alfred/Spotlight     | Launchpad        | Win11 Start       | Notion                                | **Arcagate 現状**        |
| ----------- | --------------------------------- | ----------------------------------------- | ---------------------------- | ---------------- | ----------------- | ------------------------------------- | ------------------------ |
| Add 経路    | manual + Steam 自動               | 多 plugin + Scan + drag                   | 自動 (`/Applications`)       | 自動 + drag      | Pin / drag        | inline `+`                            | manual / drag / watch    |
| Edit        | 右クリック properties             | F3 multi-tab dialog                       | alias + hotkey               | drag rename      | drag reorder      | inline cell                           | DetailPanel + Form       |
| Delete      | 個別 only (UI)                    | Del + bulk                                | uninstall (OS)               | ⌥+× (Store apps) | unpin             | Del + Trash 30day                     | confirm + bulk_delete    |
| Sort        | name/recent/playtime/size/etc     | + saved presets                           | frecency                     | manual order     | manual + auto cat | multi-key                             | **無し UI?**             |
| Filter      | players/state/genre/tags/AND-only | 12+ fields, presets                       | (frecency 自動)              | none             | search only       | stacked rules AND/OR groups           | tag single               |
| Search      | substring + IME                   | substring + fuzzy + Keyboard Launcher     | **fuzzy** (subseq) + IME     | substring        | substring         | fuzzy                                 | substring (LIKE)         |
| Empty state | onboarding                        | wizard scan                               | recent + suggestions         | (never empty)    | default pins      | template gallery                      | 不明                     |
| Keyboard    | mouse-first                       | 完全 (`F2/F3/F5/Del/Ctrl+A/F`)            | 完全 (`Up/Down/Enter/Cmd+K`) | 矢印 + type      | `Win` + Tab       | `Cmd+A` + Shift-click                 | ほぼ無し                 |
| Bulk        | drag to collection                | shift-click + bulk dialog                 | 無し                         | 無し             | 無し              | **floating bar + bulk edit any prop** | star/delete のみ         |
| Grouping    | static + **dynamic collections**  | by any field                              | category                     | manual folder    | folder + auto cat | group by + sub-group                  | tag filter のみ          |
| Icon        | 4 slot (capsule/hero/icon/logo)   | 3 slot (cover/bg/icon) + auto exe extract | system                       | system .icns     | tile              | emoji/upload                          | 1 slot + 自動 extract    |
| Persistence | per-collection sort/scroll        | filter preset + view                      | frecency                     | folder pos       | view + pin        | per-view scroll/filter                | sidebar/activeTag/scroll |

## 5.2 採用したいパターン (Patterns to adopt)

### 高優先 (Phase L1-L2)

1. **完全 keyboard nav (Playnite 標準)**: `F2` rename / `F3` edit / `F5` refresh / `Del` delete / `Ctrl+A` select all / `Enter` 起動 / `Ctrl+F` search focus / 矢印 grid nav
2. **fuzzy search + IME 対応 (Raycast)**: subsequence match、kana-katakana-romaji 揺れ、`compositionend` で debounce
3. **3-view toggle (Win11)**: Grid / List / Category 同データの view 切替、persist
4. **onboarding scan (Playnite)**: 空状態に「フォルダを scan」「URL を貼り付け」CTA を explicit に
5. **floating bulk bar (Notion)**: hover-checkbox + Shift/Ctrl-click で範囲選択 + 上部 bar に bulk action (retag / move / delete)
6. **undo toast (Notion)**: 削除直後 5 秒 "Undo" toast、または Trash collection 30 日

### 中優先 (Phase L2-L3)

7. **frecency ranking (Raycast/Alfred)**: 検索結果を usage × recency でソート
8. **dynamic collection (Steam)**: rule-based 自動更新コレクション (例「最近 7 日起動した exe のみ」)
9. **3-slot media (Playnite)**: icon + cover + hero、auto exe-icon は guaranteed fallback
10. **saved filter preset (Playnite)**: 名前付き filter+sort+view triple を localStorage 保存
11. **standard Windows keys (Playnite)**: 既知 shortcut で学習コスト最小化

### 低優先 (Phase L3+)

12. **virtualization** (Steam/Playnite は 1000+ item で virtual scroll 必須)
13. **per-view scroll/filter persist** (Notion)
14. **AND/OR multi-tag chip toggle** (Steam の弱点を改善)

## 5.3 採用しない / 真似しないパターン (Patterns to avoid)

1. **pinch-zoom / page-flip canvas (Launchpad)** — Arcagate Library は **fixed grid**、infinite canvas ではない
2. **drag-only folder creation (Launchpad/Win11)**: keyboard user に不利、明示 "Create collection" + multi-select assign を併用
3. **AND-only multi-tag filter (Steam)**: user は OR も欲しい、両対応 chip
4. **global hotkey 必須 (Raycast/Alfred)**: 在 in-window catalog は mouse only でも完結すべき
5. **hidden を右クリック menu のみで切替 (Steam)**: hidden を first-class collection (sidebar に「非表示」section)
6. **no-undo destructive ops (Launchpad/Playnite Del)**: 5-sec toast undo か Trash collection 必須
7. **single-shot launcher only (Spotlight/Launchpad)**: launcher と library は独立、library 側で bulk edit を提供
8. **folder hard cap (Win11 ~12 items)**: tag は無制限 (capped collection 不要)
9. **mandatory online metadata (Playnite F4)**: 個人 launcher なので opt-in、デフォルト online API call 禁止

## 5.4 Arcagate 固有の position

Arcagate は:

- **fixed grid dashboard** (Workspace) + **searchable catalog** (Library) のハイブリッド
- 単独 user の personal launcher (multi-user 想定なし)
- 起動対象が多様 (game exe / project folder / URL / script)

→ Steam (game-only) / Playnite (game-only) よりは **Notion** や **Raycast** の汎用パターンが整合する局面が多い。

## 5.5 最有力 reference

| reference tool         | 採用度                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Playnite**           | 最有力 (fixed-grid catalog、keyboard 完全、bulk edit、preset、auto exe icon extract、open-source = 実装参照可能) |
| **Notion DB**          | 最有力 (bulk edit pattern、view persistence、undo)                                                               |
| **Raycast**            | 中 (fuzzy / frecency / IME)                                                                                      |
| **Steam**              | 中 (dynamic collection / sort/filter)                                                                            |
| **Launchpad / Win11**  | 参考程度 (fixed grid だが keyboard / bulk が弱い、Arcagate には不足)                                             |
| **Alfred / Spotlight** | 参考程度 (launcher only、library は別物)                                                                         |

## 5.6 source URLs (subagent 調査結果)

詳細 URLs は subagent 出力に含まれる。主要参照:

- Playnite Wiki / API docs (実装参照に使える)
- Steam Library + Dynamic Collection
- Raycast Manual (Search Bar / Keyboard Shortcuts / Aliases)
- Notion bulk edit + Views/filters/sorts/groups

(URL 一覧は別途 source 引用が必要なら subagent 出力を docs/ 内に保存する)
