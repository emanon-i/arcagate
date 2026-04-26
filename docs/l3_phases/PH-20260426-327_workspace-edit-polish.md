---
id: PH-20260426-327
status: todo
batch: 74
type: 改善
---

# PH-327: Workspace 編集モード polish（編集中の触感改善）

## 横展開チェック実施済か

- batch-70 で middle-click pan + Del キー削除 + 8 ハンドル拡張済 → 残り polish
- 編集確定 / キャンセル UX を `desktop_ui_ux_agent_rules.md` のキーボード完結率と整合

## 仕様

- 編集モード入って即「ヒント Tip」を強調表示（accent 強め）
- 選択中ウィジェットの Outline を二重化（focus ring + selection ring）
- Esc 時に「変更あり」なら即破棄ではなく確認ダイアログ（破壊的操作確認）
- Enter で確定（既存）+ Cmd/Ctrl+Z で 1 段階 undo（snapshot 復元）

## 受け入れ条件

- [ ] 編集中 Esc → 変更があれば確認ダイアログ、なければ即終了
- [ ] Cmd/Ctrl+Z で 1 段階 undo（snapshot 復元）動作
- [ ] 選択ウィジェットの outline が判別容易
- [ ] `pnpm verify` 全通過
