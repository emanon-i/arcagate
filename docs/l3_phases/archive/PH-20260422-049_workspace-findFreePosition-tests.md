---
id: PH-20260422-049
title: workspaceStore.findFreePosition vitest 拡充
status: done
batch: 10
priority: high
---

## 背景・目的

`workspaceStore.findFreePosition` は AABB ベースのグリッド配置アルゴリズムを持つ純粋関数。
既存テストゼロ。ウィジェット追加 UX の根幹ロジックを保護するため vitest で網羅する。

## 受け入れ条件

- [x] 空グリッド 1x1 → (0,0)
- [x] (0,0) 占有時 1x1 → (1,0)
- [x] 行 0 全埋まり → (0,1)
- [x] gridCols=2 両列埋まり → (0,1)
- [x] 空グリッド 2x1 → (0,0)
- [x] 2x1 ウィジェット存在時 2x1 → (2,0)
- [x] 幅 4 空グリッド → (0,0)
- [x] 幅 4 ウィジェット存在時 → (0,1)
- [x] 隣接するだけで重複なし (AABB 境界値)
- [x] 3x3 ウィジェット内包位置はスキップ → x=3

## 実装メモ

- `vi.resetAllMocks()` + dynamic import で各テスト前にモジュール再取得
- `@tauri-apps/api/core` の invoke をモック (IPC 不要)
- 10 テスト全通過
