---
id: PH-20260426-356
status: todo
batch: 80
type: 改善
---

# PH-356: 手動確認依頼セクション 積み残しを E2E で消化

## 横展開チェック実施済か

- dispatch-log 「手動確認依頼」セクションに 5 件の Library 関連未消化項目あり
- agent CDP 自己検証で潰せるものは E2E に落とす（@nightly タグ）
- ユーザ目視待ちは禁止（feedback_no_idle_dispatch.md）

## 仕様

未消化項目を E2E でカバー:

- [PH-280〜282] Library S/M/L 切替で **カード全体** が変わる（アイコンだけでなく）
- [PH-280〜282] ウィンドウ幅変えても **gap 固定**
- [PH-280〜282] カードが **4:3** に見える（element computed style 検証）
- [PH-282] Settings > **ライブラリ** タブで背景モード / focal point / 文字色 / 縁取り設定が **即時反映**
- [PH-282] Settings > **ワークスペース** タブからライブラリカード設定が消えて誘導文言が出ている

## 受け入れ条件

- [ ] tests/e2e/library-card-spec.spec.ts に 5 件の @nightly テスト追加
- [ ] 各テスト pass
- [ ] dispatch-log の手動確認依頼セクションから消化済を [x] でマーク
- [ ] `pnpm verify` 全通過
