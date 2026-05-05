# Engineering Principles Extras (テスト / リファクタ / ゲート / 指標)

[engineering-principles.md](./engineering-principles.md) の続編。

## <severity>high</severity> テスト観点（業界体系）

### SFDIPOT（機能設計 7 観点）

| 観点             | 問い                         |
| ---------------- | ---------------------------- |
| **S** Structure  | 内部構造は？                 |
| **F** Function   | 入出力 / 主要変換            |
| **D** Data       | 型 / 範囲 / encoding / 欠損  |
| **I** Interface  | 呼び元 / 呼び先 / IPC 境界   |
| **P** Platform   | OS / WebView2 / デバイス固有 |
| **O** Operations | 正しい使い方 / 誤操作        |
| **T** Time       | 遅い / 速い / TZ / 期限      |

Plan には「観点 3 つ以上をテスト化」を明記。

### HICCUPPS（受け入れ判定オラクル）

History / Image / Comparable products / Claims / User expectations / Product internal consistency / Purpose / Statutes。
Plan の受け入れ条件にタグ（例: `[Function, User]`）。

### Property-based Testing

- TS: `fast-check`、Rust: `proptest`
- 向く対象: パーサ / バリデータ / IPC payload round-trip / テーマ JSON round-trip

### 「直った」の判定（3 点揃い）

1. E2E 緑
2. agent CDP 経由実機確認 + screenshot Read
3. SFDIPOT 重要観点を潰した

主観 UX (User / Image オラクル) は user 検収のみ。

---

## <severity>high</severity> リファクタ発動条件

計測でトリガ、感覚でやらない:

| 指標                  | 閾値                        |
| --------------------- | --------------------------- |
| 関数 LoC              | 50 warning / 100 refactor   |
| ファイル LoC          | 500 warning / 1000 refactor |
| Cyclomatic complexity | 10 warning / 20 refactor    |
| Fan-out               | 15 超                       |
| Fan-in                | 20 超 (ホットスポット)      |
| Duplicate code        | 5 行 × 3 箇所以上           |
| Deep nesting          | 4 レベル以上                |
| Parameter count       | 4 warning / 6 refactor      |
| Circular deps         | 存在で即 fail               |

「意味ある凝集」で説明できるなら残し可、例外は lessons.md に記録。

人間判断トリガ: SRP 違反 / 抽象化しすぎ / 抽象化が薄い / Test smells / Boy scout 違反 / `// TODO` 増 / `/simplify` で同種指摘が複数バッチ。

---

## <severity>high</severity> 新規機能ゲート（10 項目すべて pass）

1. **凍結領域** に該当しない（vision.md）
2. **スコープ外** に該当しない（クラウド同期 / 他 OS / ターミナル統合 等）
3. M1〜M2c のいずれかに属する、または妥当な延長
4. パフォーマンス目標を悪化させない（必要なら計測）
5. UX 原則整合（ux_standards.md）
6. デザインシステム整合（`--ag-*` トークン使用、shadcn 手動編集なし）
7. 依存予算 通過（上 §依存予算）
8. 複雑度予算 通過（既存 LoC / cyclomatic を悪化させない）
9. テスト観点 列挙可（SFDIPOT / HICCUPPS）
10. 1〜2 Plan で収まる規模

「**なくても毎日使えるか？**」で問う。Yes なら追加しない。

却下機能は `dispatch-log.md` の「却下機能リスト」に記録。

---

## <severity>medium</severity> 「毎日使える」客観指標

| 観点                          | Arcagate 閾値       | 業界目安                             |
| ----------------------------- | ------------------- | ------------------------------------ |
| ホットキー → パレット表示 P95 | 2 秒以内 / 未計測   | Raycast/Alfred ≤ 100ms               |
| 入力 → 結果反映 P95           | 150ms debounce      | Raycast < 50ms                       |
| アニメ duration               | 120 / 200ms         | Material 3 emphasized 200-300ms      |
| WCAG コントラスト             | AA 以上（自動化未） | AA = 4.5:1 (text), 3:1 (UI)          |
| キーボード完結率              | コア操作 100%       | Raycast/Alfred 標準                  |
| exe 容量                      | 20 MB 以下          | Raycast macOS ~80MB / Playnite ~50MB |
| Idle メモリ                   | 100 MB 以下         | Raycast ~100MB / Alfred ~70MB        |
| クラッシュ率                  | 0 件目標            | 商用 SLA 0.1% 未満                   |

---

## 参照

- 製品: `docs/l1_requirements/vision.md`
- UX: `docs/l1_requirements/ux_standards.md` / `docs/desktop_ui_ux_agent_rules.md`
- 過去: `docs/archive/arcagate-engineering-principles-historical.md`
