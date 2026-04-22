---
id: PH-20260423-127
title: format-target.ts の edge case テスト追加
status: todo
batch: 27
priority: low
created: 2026-04-23
scope_files:
  - src/lib/utils/format-target.test.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`format-target.ts` のユニットテストは基本ケース 5 件のみ。
`\\server\share\` 形式の UNC パス、末尾スラッシュ付き URL など
エッジケースが未テスト。PH-109 で Windows パスの URL 誤認識バグを修正したが、
同様の回帰が起きないようカバレッジを強化する。

## 実装内容

以下のテストケースを `format-target.test.ts` に追加:

| 入力                             | 期待値        |
| -------------------------------- | ------------- |
| `\\\\server\\share\\file.txt`    | `file.txt`    |
| `https://example.com/path/`      | `example.com` |
| `https://example.com`            | `example.com` |
| `C:\\path with spaces\\file.exe` | `file.exe`    |
| `./relative/path.sh`             | `path.sh`     |

## 受け入れ条件

- [ ] テストケースが 5 件以上追加されていること
- [ ] `pnpm vitest run` で全テストが通過すること
