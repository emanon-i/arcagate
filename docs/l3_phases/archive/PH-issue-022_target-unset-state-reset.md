---
id: PH-issue-022
title: ターゲット未設定 state 共通化 + reset ボタン
status: done
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-490b (Clear button、rollback で revert)
---

# Issue 22: 未設定 state + reset 共通化

## 元 user fb (検収項目 #27)

> Widget が未設定状態のとき、設定への明確な誘導と reset ボタンが欲しい

## 引用元 doc

- `desktop_ui_ux P1` 状態 / P3 主要操作 / P12 整合性
- `ux_standards §7 Do/Don't` 「空状態に理由と次の操作テキスト」

## Fact

各 widget の未設定 state UI が個別実装、文言ばらつき。reset 経路無し。

## UX

- 未設定 state UI:
  - icon (大、薄) + 状態テキスト + 主操作ボタン + 補助テキスト
  - 中央寄せ、shadcn primary button
- reset ボタン: WidgetSettingsDialog 内に「初期状態に戻す」(destructive ghost、確認 dialog)

## 横展開

| widget     | 未設定 condition                    | empty state title  |
| ---------- | ----------------------------------- | ------------------ |
| Item       | `item_ids[]` 空                     | アイテム未選択     |
| ExeFolder  | watch_path 未指定                   | 監視フォルダ未設定 |
| FileSearch | root 未指定                         | 検索フォルダ未設定 |
| Snippet    | snippets[] 空                       | スニペット未登録   |
| QuickNote  | content 空 (許容、empty state なし) | —                  |

## Plan A: 「`WidgetEmptyState.svelte` 共通 component + 各 widget で利用」

```svelte
<!-- src/lib/components/common/WidgetEmptyState.svelte -->
<script>
let { icon, title, description, actionLabel, onAction } = $props();
</script>
<div class="flex h-full flex-col items-center justify-center gap-2 px-3 py-4 text-center">
  <Icon class="h-8 w-8 text-faint" />
  <p class="text-sm font-medium text-secondary">{title}</p>
  <p class="text-xs text-muted">{description}</p>
  <button onclick={onAction} class="...">{actionLabel}</button>
</div>
```

reset ボタン: WidgetSettingsDialog に共通 footer 「初期状態に戻す」 button 追加。

## 棄却 B (個別 empty state): P4 一貫性違反

## E2E

ExeFolder を path 未設定で配置 → "監視フォルダ未設定" + 設定ボタン表示 → click で WidgetSettingsDialog 開く / reset ボタンで初期化確認

## 規格 update

`ux_standards §6-1` に「未設定 state は WidgetEmptyState で統一」必須化
