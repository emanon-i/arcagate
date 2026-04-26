---
id: PH-20260426-360
status: todo
batch: 81
type: 改善
---

# PH-360: Library S/M/L カード手動確認 5 件を E2E nightly 化（batch-80 PH-356 持越）

## 横展開チェック実施済か

- dispatch-log の手動確認依頼セクション L2157-2161 の 5 件を消化対象とする
- agent CDP 自己検証で潰せる（feedback_no_idle_dispatch 原則: ユーザ目視待ち禁止）

## 仕様

`tests/e2e/library-card-spec.spec.ts` に @nightly タグで 5 件追加:

1. S/M/L 切替で **カード全体** が変わる: aspect ratio + width 変化を `getBoundingClientRect` で検証
2. ウィンドウ幅変えても **gap が固定 16px**: 親 grid の computed `gap` を assert
3. カードが **4:3 アスペクト**: `width / height ≈ 4/3` を ±5% で assert
4. Settings > **ライブラリタブ** で背景 / focal / 文字色 / 縁取り設定が **即時反映**: 設定変更 → カードの DOM 属性 / style が即更新
5. Settings > **ワークスペースタブ** からライブラリカード設定が消えて誘導文言が出ている: 「Settings > Library で設定」相当の文言が visible

## 受け入れ条件

- [ ] @nightly テスト 5 件追加
- [ ] 全 pass
- [ ] dispatch-log の手動確認依頼セクションから消化済を `[x]` でマーク
- [ ] `pnpm verify` 全通過
