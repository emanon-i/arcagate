---
id: PH-20260424-222
title: ThemeEditor テーマ名インライン編集
status: done
priority: high
parallel_safe: false
scope_files:
  - src/lib/components/settings/ThemeEditor.svelte
depends_on: [PH-20260424-218]
---

## 目的

カスタムテーマを複製すると「〇〇のコピー」という固定名になるが、
ThemeEditor 内でテーマ名を変更できる UI がなかった。
インライン編集で名前変更できるようにする。

## 実装内容

1. `ThemeEditor.svelte` のタイトル部分（`{theme.name} を編集`）を
   クリックで編集モードに切り替わる `<input>` に変更
2. `let editingName = $state(false)` + `let nameValue = $state(theme.name)`
3. Enter / blur → `themeStore.updateTheme(theme.id, nameValue)` を呼ぶ
4. Escape → 編集キャンセル（元の名前に戻す）
5. 空文字保存は禁止（元の名前にリセット）

## 受け入れ条件

- [ ] テーマ名をクリックすると input になる
- [ ] Enter / blur でテーマ名が変更・保存される
- [ ] Escape で編集キャンセルになる
- [ ] 空文字保存は行われない
- [ ] テーマリストのボタン表示も即時更新される（`themeStore.themes` の reactive）
- [ ] E2E テストを追加（name 変更後テーマリストに新名が表示される）
- [ ] `pnpm verify` 全通過
