---
id: PH-20260425-291
status: done
batch: 67
type: 改善
---

# PH-291: Library 右パネル UX 磨き込み（⭐ボタン + タグ UI 明確化 + 可視/不可視切替）

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md` §3 操作明確化
- `docs/l1_requirements/ux_standards.md` §2 ボタン規約
- `arcagate-engineering-principles.md` §6 HICCUPPS U（User）

## 背景・目的

ユーザフィードバック: 「お気に入りボタンをアイコン + 『お気に入り』テキスト付きにしたい」「タグ追加 UI が見つけにくい」「可視/不可視切替がどこにあるかわからない」。

LibraryDetailPanel (右パネル) の操作 UX を磨き込む。

## 仕様

### A. ⭐ お気に入りボタン

現状: アクションボタングリッド内、アイコンのみ。
変更: **アイコン + テキストラベル「お気に入り」**、塗り/枠で状態表示。

**ラベル原則** (CLAUDE.md / desktop_ui_ux_agent_rules.md P4 補足):

- ⭐ + 「星」 ❌ アイコン名をそのままラベルにしない
- ⭐ + 「お気に入り」 ✅ 機能・状態を書く

```svelte
<button class="favorite-button {isStarred ? 'is-starred' : ''}" onclick={handleToggleStar}>
    <Star class="size-4" fill={isStarred ? 'currentColor' : 'none'} />
    <span>お気に入り</span>
</button>
```

スタイル:

- `is_starred = false`: 枠だけアイコン + 灰色文字
- `is_starred = true`: 塗りアイコン + accent 色 + テキストも accent 色

`cmd_toggle_star` を呼ぶ（既存）。

**aria-label も「お気に入りに追加 / 解除」のように機能ベース**（"Star button" 禁止）。

### B. タグ追加 UI 明確化

現状: 入力欄が分かりにくい。
変更:

1. **「+ タグを追加」ボタン**を明示的に表示（タグチップ列の末尾）
2. クリック → ドロップダウン式 picker（既存 `LibraryItemTagSection`）
3. 候補リスト + autocomplete + 「新規タグ作成」オプション
4. 既に付いているタグは候補から除外（既存）

### C. 可視/不可視切替トグル

現状: `is_enabled` フィールドはあるが UI なし。
変更:

- 詳細セクションに「ライブラリで非表示」チェックボックス + 説明 hint
- ON: グレースケール表示 + 検索結果から除外
- 説明: 「不要だが残しておきたいアイテム。Library グリッドで半透明、検索からは除外」

```svelte
<label class="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={!selectedItem.is_enabled}
        onchange={(e) => itemStore.updateItem(id, { is_enabled: !e.currentTarget.checked })}
    />
    <span>ライブラリで非表示</span>
</label>
<p class="text-xs text-muted">非表示にすると検索結果から除外されます。残したまま隠せます。</p>
```

### D. アクションボタンの並び替え

優先度高→低 で:

1. 起動 (Play)
2. お気に入り (Star) ← B 拡張
3. 編集 (Settings2)
4. 削除 (Trash2)

その他（複製、JSON コピー、デフォルトアプリ）は MoreMenu に集約（既存）。

## 受け入れ条件

- [ ] お気に入りボタンがアイコン + テキストで表示 [Function, U]
- [ ] toggle で is_starred が DB 反映 + LibraryCard の ★ が連動 [Function, P]
- [ ] 「+ タグを追加」ボタンが見つかる [U]
- [ ] タグ picker で autocomplete + 新規作成が機能 [Function]
- [ ] 「ライブラリで非表示」チェックで is_enabled が反転 + LibraryCard が grayscale [Function]
- [ ] 検索結果から非表示アイテムが除外される [Function]
- [ ] `pnpm verify` 全通過

## 自己検証

- ⭐ 切替で LibraryCard 上の ★ バッジが即時反映
- 非表示 ON でカードが灰色に、検索結果から消える
- タグ追加 → カードチップ反映
