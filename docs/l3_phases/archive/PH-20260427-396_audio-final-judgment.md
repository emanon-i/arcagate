---
id: PH-20260427-396
status: done
batch: 88
type: 整理
era: Polish Era
---

# PH-396: 音声機能 最終判断 + Sound カテゴリ整理

## 参照した規約

- `~/.claude/projects/E--Cella-Projects-arcagate/memory/feedback_audio_freeze.md` 音声機能凍結、Polish Era で最終判断
- `docs/l1_requirements/vision.md` 音声機能のスコープ判定

## 横展開チェック実施済か

- 音声関連コード:
  - `src/lib/utils/sfx.ts` - playClick / 音声再生関数
  - `src/lib/state/sound.svelte.ts` - soundEnabled / soundVolume
  - `src/lib/components/settings/SettingsPanel.svelte` - sound カテゴリ UI
  - 各 widget での `playClick(soundStore.soundVolume)` 呼び出し
- 凍結期間: batch-XX 以降、新規追加・改修なし

## 仕様

### 判定基準

- **削除条件**: Refactor Era / Polish Era 中に一度も使わなかった、UX 上の重要性が低い
- **残置条件**: 音声フィードバックが「毎日使える UX」に貢献している（agent が確認）

### 削除する場合の作業

1. `src/lib/utils/sfx.ts` 削除
2. `src/lib/state/sound.svelte.ts` 削除
3. SettingsPanel から `sound` カテゴリ削除
4. 各 widget の `playClick` 呼び出し削除
5. memory `feedback_audio_freeze.md` を「削除済」に更新

### 残置する場合の作業

1. `feedback_audio_freeze.md` を「Polish Era で残置決定」に更新
2. 凍結期間を Distribution Era まで延長（または恒久残置）

## 受け入れ条件

- [x] agent 判定: **削除**（使用 1 箇所のみ・デフォルト OFF・ユーザの「いらんかった」評価）
- [x] 全関連コード除去: sfx.ts / sound.svelte.ts / SettingsPanel sound カテゴリ / nav-items.ts Volume2 + sound entry / PaletteOverlay playClick 2 箇所
- [x] memory `feedback_audio_freeze.md` を「削除済」に更新
- [x] `pnpm verify` 通過（svelte-check 0 errors、vitest 既存 pass）

## 完了ノート（batch-88）

5 files changed, 1 insertion(+), 135 deletions(-) で完全削除。
将来 user が「やっぱり音欲しい」と言ったら git 履歴から復元可能（`git log -- src/lib/utils/sfx.ts`）。

## SFDIPOT 観点

- **F**unction: 音声フィードバックが本当に必要か
- **U**ser expectations: 「無音が普通」現代の傾向
- **P**urpose: arcagate のコア価値（毎日使える）に音声が必要か
