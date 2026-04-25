---
id: PH-20260425-292
status: todo
batch: 67
type: 改善
---

# PH-292: Library 左パネル（3 セクション罫線分離 + 「すべて」アイコン + アイコン rendering 修正）

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md` §1 情報密度
- `docs/l1_requirements/ux_standards.md` §3 a11y / 罫線
- `arcagate-engineering-principles.md` §6 HICCUPPS I（Image）

## 背景・目的

ユーザフィードバック: 「左パネル（タグサイドバー）の構造が見にくい。"すべて" のアイコンが弱い。システム/通常/ワークスペースの境界が分からない。背景なしモード時アイコンがぼやける」。

## 仕様

### A. 3 セクション分離

タグを 3 グループに分けて表示（既存タグデータの `is_system` / 既存 prefix で判別）:

```
┌─ 全体 ─────────────────┐
│  📚 すべて (count)         │
├─────────────────────────┤
│ システム                   │
│  ⭐ お気に入り (count)      │
│  📁 フォルダ (count)        │
│  🌐 URL (count)            │
│  ⚙️ EXE (count)            │
├─────────────────────────┤
│ ユーザータグ                │
│  #project-a (count)         │
│  #personal (count)          │
├─────────────────────────┤
│ ワークスペース             │
│  💼 work (count)            │
│  🏠 home (count)            │
└─────────────────────────┘
```

罫線: `border-t border-[var(--ag-border)] pt-2` で各セクション分離。
セクション見出し: `text-[10px] font-medium uppercase text-[var(--ag-text-muted)]`。

### B. 「すべて」アイコン強化

現状: `Layers` 等の弱いアイコン。
変更: `Library`（lucide-svelte）または `LayoutGrid` で「すべて表示」を直感化。

### C. 背景なしモード時アイコンぼやけ修正

現状: LibraryCard で背景モード = `none` 時、`bg-gradient-to-br {artMap[item.item_type]}` で artMap の柔らかいグラデにアイコンを重ねるが、`drop-shadow-lg` の影でぼやけて見える。

修正:

- 背景なし時のアイコンに **`drop-shadow-md`**（少し弱い）に変更、または:
- アイコンに **`crisp-edges`** または **`pixelated`**（image-rendering CSS）を適用、または:
- アイコンサイズを少し大きく（h-12→h-14 等）して相対的に明瞭化

CDP スクショで複数アプローチを比較し、最も視認性が高いものを採用。

### D. ワークスペースタグの分離

現状: ワークスペース名がタグとして混在。
変更: `tag.kind === 'workspace'` 等の判別フィールドで明示的にグループ化（必要なら DB schema 拡張）。

または、既存の prefix で識別（`workspace:` prefix を使う）。schema 変更を避けるため prefix 方式を採用。

## 受け入れ条件

- [ ] 左パネルが「全体 / システム / ユーザー / ワークスペース」の 4 セクション + 罫線 [Structure, U]
- [ ] セクション見出しが小さめテキストで明確 [U]
- [ ] 「すべて」のアイコンが視覚的に強い [I]
- [ ] 背景なしモードでアイコンがぼやけない（CDP スクショで確認）[I]
- [ ] 既存タグデータでマイグレーション不要（prefix 方式）[Operations]
- [ ] `pnpm verify` 全通過

## 自己検証

- 4 セクション + 罫線が CDP スクショで視認できる
- 背景なしモードでアイコンが鮮明（HICCUPPS I）
