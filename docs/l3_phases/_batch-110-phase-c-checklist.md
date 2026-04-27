# batch-110 Phase C Settings dialog form polish — 共通品質 checklist

各 PH-507..514 plan で**全項目 PASS** が完走条件。

## 共通 checklist (各 dialog で適用)

- [ ] **ラベル ↔ input の vertical rhythm 統一** (label と input の gap 8px、section gap 16-24px)
- [ ] **placeholder の役割明確化** (補助説明用、ラベル代替 NG = 必ず label 別途表示)
- [ ] **入力欄の配置順** (必須 → optional、論理グルーピング、関連項目を section でまとめる)
- [ ] **入力方式の最適化** (text / select / radio / segmented control / number stepper / date picker / file picker のうち項目に最良)
- [ ] **validation** (error / success / inline help の場所と timing 統一)
- [ ] **ボタン群配置** (primary action 右、secondary 左、reset は別位置)、文言統一 (保存 / キャンセル / リセット)
- [ ] **キーボードナビ** (Tab で input 移動、Enter で save、Esc で cancel)、focus visible 強化
- [ ] **dialog 幅 / フォーム要素幅統一** (max-w-md or max-w-lg を section で揃える)
- [ ] **shadcn-svelte form pattern 統一** (label / description / message helper の 3 layer)
- [ ] **before/after スクショ** (PR 説明に貼る)

## 適用 dialog 一覧

| Plan   | Dialog                                               | scope                          |
| ------ | ---------------------------------------------------- | ------------------------------ |
| PH-507 | Settings > 一般                                      | hotkey / autostart / 基本設定  |
| PH-508 | Settings > Library                                   | itemSize / カード設定          |
| PH-509 | Settings > 外観                                      | theme / Library カード style   |
| PH-510 | Settings > 監視フォルダ                              | watched_paths CRUD             |
| PH-511 | Settings > データ管理                                | import/export / SBOM / privacy |
| PH-512 | WidgetSettingsDialog (共通枠)                        | dialog ⼿前の framework polish |
| PH-513 | WorkspaceRenameDialog / WorkspaceDeleteConfirmDialog | workspace 系                   |
| PH-514 | LibraryItemPicker (再利用 form pattern)              | picker dialog の form-likeness |

## 完走条件

- 全 plan で checklist 全項目 PASS
- 各 plan で `pnpm verify` 全通過、E2E pass、dev 目視
- batch-110 完走前: feedback_widget_editing_ux.md + transcript 全 user fb 全文照合 → 表報告 → user OK
