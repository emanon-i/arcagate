# §7 user decision needed

Library overhaul を進める前に user に確定して欲しい分岐点。各 decision に agent 推奨と理由を併記。

## 7.1 D1: Library と Workspace の カード共有 vs 独立

### 状況

- Library に `LibraryCard.svelte` が存在
- Workspace の ItemWidget は `LibraryCard` を再利用していない (独自 grid render)
- LibraryItemPicker (Workspace 内) は `LibraryCard` を再利用

### option

- **A**: Workspace ItemWidget でも `LibraryCard` を採用 (Library と Workspace が同 component) → 統一感、保守単一
- **B**: Workspace は独自 card 維持 (現状) → workspace 内の dense 表示を最適化
- **C**: 共通 ItemCardCore + Library / Workspace で wrapper を分ける → 中間案、複雑度+

### agent 推奨

**B** (現状維持) + Phase L2 で共通 design tokens (色 / radius / icon size) を統一。

理由: Workspace は dense / fluid (resize 可)、Library は cohesive list / grid。表示密度の要求が異なる。card component 共有のメリットより divergent UI 要件のほうが大きい。

## 7.2 D2: icon cache location

### 状況

- 現状: filesystem `app_data_dir/icons/{item_id}.png` + DB `items.icon_path` 列
- I3 で icon 関連が遅さの原因

### option

- **A**: filesystem (現状) → file 単位で cache、debug し易い、しかし scan 時に I/O コスト
- **B**: DB BLOB → 1 query で取得、cache invalidation 容易、しかし DB サイズ増 (icon × 数百 = 数十 MB)
- **C**: メモリ cache + filesystem (hybrid) → 起動時 lazy populate、TTL 管理

### agent 推奨

**C** (Hybrid)。Phase L1 で memory cache (TTL 含む)、filesystem は維持。L3 で必要なら BLOB 化検討。

理由: filesystem は debug / 移行容易、memory cache で sync IPC / load 時間を吸収できる。

## 7.3 D3: launcher UX 方向 (Steam-grid 寄り vs Raycast-keyboard 寄り)

### 状況

- 現状 Library は **mouse-first grid** (Steam に近い)
- Workspace は dashboard pattern
- user の用途は混在 (game launch / project open / URL bookmark / script run)

### option

- **A**: **Steam-grid 寄り** (現状維持 + 強化): 大画像 card / 装飾 / mouse / drag → 視覚的、cover image / hero 等を強調
- **B**: **Raycast-keyboard 寄り**: list view 中心、`Ctrl+F` で常時 search、frecency 上位、action panel
- **C**: **両立 (Playnite 路線)**: Grid / List / Category 3-view toggle、keyboard 完全対応 + visual rich card 維持

### agent 推奨

**C** (Playnite 路線)。

理由: 「徹底的に UX overhaul」 + game / project / URL の混在用途には Playnite ライクの multi-view + 完全 keyboard が最適。Phase L2-6 の 3-view toggle はこの方針に沿う。

## 7.4 D4: I3 の解決方法 (Phase L1 範囲)

### option

- **A1**: F1 (batch IPC) のみ → 最小修正、複雑度+ ~3 h
- **A2**: F1 + F2 (batch + memory cache) → cache 管理込み ~4 h
- **A3**: F1 + F2 + F3 (icon extract spawn_blocking 込み) → I3 完全対処 ~5 h
- **B**: virtualization (L3-1) を Phase L1 に前倒し → 大改修、~10 h、退行 risk 高

### agent 推奨

**A3** (Phase L1 で 3 件まとめ)。

理由: F1 / F2 / F3 はそれぞれ独立、組み合わせで効果最大化。virtualization は別議論 (L3 で慎重に)。

## 7.5 D5: virtualization library 採用 vs 自作

### 状況

- Phase L3-1 で必要、現状 200+ item で frame drop 想定

### option

- **A**: `@tanstack/svelte-virtual` 採用 → 機能豊富、API 固い、bundle ~30 KB
- **B**: `svelte-virtual-list` (Sveltejs/svelte-virtual-list) → 軽量、shimple API、しかし維持低調
- **C**: 自作 windowing (~150 行) → 全制御、Tauri webview2 固有最適化可能、保守 code 増

### agent 推奨

**A** (`@tanstack/svelte-virtual`)。

理由: 業界標準、bug fix がコミュニティで早い、Tauri webview2 でも動作報告多。

## 7.6 D6: undo の実装方針 (Phase L2-2 関連)

### option

- **A**: 5-sec toast undo only (削除復元、簡易)
- **B**: Trash collection (sys-trash tag、30 日後 GC) + 5-sec toast の併用 (Notion 標準)
- **C**: workspaceHistory ライクな global undo stack (Cmd+Z で全操作 undo、Library + Workspace 共通)

### agent 推奨

**B** (Trash + toast)。

理由: A だけでは 5 秒経ったら復元不可、user 体感「迷ったら復元できない」が残る。C は scope 大、Phase L2 から外したい。B は Notion 標準で user の期待に沿う。

## 7.7 D7: search lib (kana 正規化) 採用

### option

- **A**: `kuroshiro` (1.5 MB、kana → romaji 変換)
- **B**: 自作 lite normalize (hiragana ↔ katakana のみ、~30 行)
- **C**: `wanakana` (lighter ~50 KB、kana 変換 only)
- **D**: 諦める (substring + IME のみ、現状維持)

### agent 推奨

**C** (wanakana)。

理由: 1.5 MB は重い、自作は edge case 取りこぼし risk、諦めは UX gap 解消できず。wanakana が落とし所。

## 7.8 D8: Phase 着手順序 (priority)

### option

- **A**: L1 → L2 → L3 順次 (推奨)
- **B**: L1 完了後 L3 (virtualization 先) → L2 (UX) → 性能優先
- **C**: I1 / I2 / I3 別々の独立 PR → L2 / L3 は user 体感確認後決定

### agent 推奨

**A** (L1 → L2 → L3)。

理由: bug fix → 基礎 UX → 機能追加 の順で「動く → 使える → 強い」と段階的に user 価値を積む。Phase 間で user 検収 → 優先度再調整可。

## 7.9 まとめ (decision matrix)

| #  | 質問                          | agent 推奨                   | 確定後の影響                          |
| -- | ----------------------------- | ---------------------------- | ------------------------------------- |
| D1 | Library / Workspace card 共有 | B (独立維持)                 | Phase L1+ で design token 統一だけ    |
| D2 | icon cache location           | C (hybrid memory + fs)       | Phase L1 F2 cache 追加                |
| D3 | launcher UX 方向              | C (Playnite 路線)            | Phase L2-6 view toggle 採用           |
| D4 | I3 fix 範囲                   | A3 (F1+F2+F3)                | Phase L1 工数 3-4 h                   |
| D5 | virtualization lib            | A (@tanstack/svelte-virtual) | Phase L3-1 着手時 dep 追加            |
| D6 | undo 方針                     | B (Trash + toast)            | Phase L2-2 工数 +1 h (sys-trash 実装) |
| D7 | kana 正規化                   | C (wanakana)                 | Phase L2-4 dep 追加                   |
| D8 | Phase 着手順序                | A (L1 → L2 → L3)             | scope 全体                            |

→ user は **D1-D8 一括で「agent 推奨で OK」** か、個別に override か decide すれば実装着手可能。
