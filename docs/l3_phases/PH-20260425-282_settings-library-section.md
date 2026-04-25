---
id: PH-20260425-282
status: done
batch: 65
type: 改善
---

# PH-282: Settings > Library 新設 + 背景 3 モード + focal point picker

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md`: §3 設定 UX 統一
- `docs/l1_requirements/ux_standards.md`: §2 サイズプリセット（S/M/L）
- `arcagate-engineering-principles.md` §6 SFDIPOT: Interface（IPC 境界）/ Function（設定→表示連動）
- メモリ `project_library_card_spec.md`（背景 3 モード / focal point / Settings 連動節）
- メモリ `project_settings_theme_direction.md`

## 背景・目的

現状 Settings には General のみ。Library カードの設定（PH-280 で導入したサイズ、PH-281 で導入した文字スタイル、本 Plan で導入する背景モード/focal point）を一括で操作する **Library セクション** を新設する。

ユーザ確定仕様:

- **背景 3 モード**:
  - 塗りつぶし: アイコン + 背景色 + アイコン塗りつぶし色
  - 画像: ユーザ画像 or アイコン画像 を `object-fit: cover`
  - なし: 透過、アイコンと文字のみ
- **focal point picker**: `object-position` を視覚スライダーで X/Y 0〜100% 指定

設定はカード共通デフォルトとして適用（個別カード上書きは batch-66 以降で検討）。

## 仕様

### 背景モード

```typescript
type LibraryCardBackgroundMode = 'fill' | 'image' | 'none';

interface LibraryCardBackgroundConfig {
  mode: LibraryCardBackgroundMode;
  fillBgColor: string;     // mode='fill' のとき使用
  fillIconColor: string;   // mode='fill' のとき使用、アイコンの fill
  focalX: number;          // 0〜100 (%)
  focalY: number;          // 0〜100 (%)
}
```

LibraryCard 適用:

```svelte
{#if cardBg.mode === 'image' && item.icon_path}
  <img src={icon} class="absolute inset-0 h-full w-full object-cover" style="object-position: {cardBg.focalX}% {cardBg.focalY}%" />
{:else if cardBg.mode === 'fill'}
  <div class="absolute inset-0" style="background: {cardBg.fillBgColor}">
    <ItemIcon style="color: {cardBg.fillIconColor}" />
  </div>
{:else}
  <!-- mode === 'none': 透明、アイコン中央 -->
  <div class="absolute inset-0 flex items-center justify-center">
    <ItemIcon class="h-1/2 w-1/2" />
  </div>
{/if}
```

### focal point picker UI

X/Y それぞれ `<input type="range" min="0" max="100" />` 2 本でも OK。
拡張: 視覚的なドラッグ式（プレビュー領域でクリック地点が focal）→ 余裕があれば実装。最低限はスライダー。

### Settings 構成

`SettingsDialog` のカテゴリナビに「Library」を追加（既存パターン踏襲、batch-44 で確立）。
パネルに以下を配置:

1. **アイテムサイズ** S / M / L トグルボタン（PH-280 のプリセット）
2. **背景モード** ラジオ（塗りつぶし / 画像 / なし）
3. **塗りつぶし色**（mode='fill' のとき表示）color picker × 2（背景・アイコン）
4. **focal point** X / Y スライダー（mode='image' のとき表示）+ プレビュー
5. **ラベル文字色** color picker（PH-281）
6. **縁取り** トグル + 色 + 太さスライダー（PH-281）
7. **オーバーレイ** トグル（PH-281）

### configStore への統合

PH-281 の `libraryCardStyle` と本 Plan の `libraryCardBackground` を `libraryCard` 名前空間に統合:

```typescript
configStore.libraryCard = {
  size: 'S' | 'M' | 'L',
  background: LibraryCardBackgroundConfig,
  labelStyle: LibraryCardStyleConfig,
};
```

localStorage キー: `arcagate-library-card`

## 作業内容

- `src/lib/state/config.svelte.ts` に `libraryCard` ネスト構造を追加
- `SettingsDialog.svelte` または該当ファイルに `LibrarySection.svelte` を新設
- カテゴリナビに 'Library' を追加
- `LibraryCard.svelte` を背景 3 モードに対応
- 既存の `configStore.itemSize` を `configStore.libraryCard.size` に集約（移行）
- 旧 `itemSize` localStorage キー → 新キーへのマイグレーション 1 回（読みは fallback、書きは新キーのみ）

## 受け入れ条件

- [ ] Settings ダイアログに 'Library' タブが表示される [P consistency, Interface]
- [ ] アイテムサイズ S/M/L 切替が PH-280 と連動して効く [Function]
- [ ] 背景モード切替で表示が切り替わる（塗りつぶし / 画像 / なし） [Function]
- [ ] focal point スライダーで `object-position` が変わる（画像モード時） [Function]
- [ ] 塗りつぶし色 picker でカード背景色が変わる（塗りつぶしモード時） [Function]
- [ ] 設定変更が即時反映される（ダイアログ閉じる前にカードが追従） [Time]
- [ ] localStorage で永続化、リロード後も維持 [History]
- [ ] 旧 itemSize キーから新キーへのマイグレーションが 1 回限り走る [Operations]
- [ ] `pnpm verify` 全通過

## 自己検証

- CDP で Settings 開いて Library タブをスクショ
- 各設定変更 → スクショで反映確認
- focal point を 0/50/100 各位置でプレビュー
- HICCUPPS U: 設定の見つけやすさ（Settings > Library で迷わない）
