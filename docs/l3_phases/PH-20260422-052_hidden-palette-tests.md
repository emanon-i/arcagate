---
id: PH-20260422-052
title: hiddenStore / entryKey / paletteStore vitest 拡充
status: done
batch: 10
priority: medium
---

## 背景・目的

- `hiddenStore` (toggle / loadHiddenCount) の動作保護
- `entryKey` ユーティリティの型別 key 生成を保護
- `paletteStore` の重複排除・クリップボード起動・calc エッジケースをカバー

## 受け入れ条件

### hiddenStore (4 テスト)

- [x] `toggleDirect()` で `isHiddenVisible` が反転する
- [x] 2 回 toggle で元に戻る
- [x] `loadHiddenCount()` が IPC 結果を count に反映 (mock → 7)
- [x] IPC エラーは無視され count 不変

### entryKey (3 テスト)

- [x] item エントリ → "item:{id}"
- [x] calc エントリ → "calc:{expression}"
- [x] clipboard エントリ → "cb:{index}"

### paletteStore 追加 (5 テスト)

- [x] search('') で recent/frequent のアイテム重複が排除される
- [x] clipboard エントリ起動で `writeText` が呼ばれ `isOpen` が false になる
- [x] calc '= 0' → 結果 '0' (falsy ゼロを正しく処理)
- [x] calc '= (1+2)*3' → 結果 '9'
- [x] calc '= 1/0' → Infinity は reject され追加されない

## 実装メモ

- palette.svelte.test.ts はファイル内モジュール共有のため追加テストは既存テストの状態を継承
- clipboard テストは `@tauri-apps/plugin-clipboard-manager` の `writeText` をスパイ
- 15 テスト合計 (元 9 + 5 追加 + 1 既存修正)
