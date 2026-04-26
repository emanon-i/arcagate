---
id: PH-YYYYMMDD-NNN
status: todo
batch: NN
type: 防衛
era: <Polish | UX Research | Distribution>
---

# PH-NNN: <ケース名> Use Case Audit（HE+CW 雛形）

> batch-91 PH-414 で確立した雛形。Nielsen 10 Heuristic Evaluation + Cognitive Walkthrough 4 Steps を 1 ユースケースに適用するためのテンプレート。

## 対象ユースケース

- **ケース番号**: <use-cases.md の#番号>
- **ケース名**: <例: ゲーム起動 / クリップボード履歴呼び出し>
- **想定操作回数 / 日**: <例: 10 回 / 日>
- **想定アクター**: <個人ユーザ / 同人サークル / クリエイター 等>

## 現状フロー（コード read ベース）

- 起点: <ホットキー / アイコンクリック / ドラッグ&ドロップ 等>
- 経由: <UI コンポーネント → store → IPC → Rust service → DB>
- 終点: <ユーザに視認される結果（toast / 画面遷移 / 起動）>

## Nielsen 10 Heuristic Evaluation

各 H1〜H10 について該当する場合のみ severity を付ける。

| #   | Heuristic                                               | 適合 / 違反 | severity (0-4) | 観察メモ |
| --- | ------------------------------------------------------- | ----------- | -------------- | -------- |
| H1  | Visibility of system status（状態可視化）               |             |                |          |
| H2  | Match between system and the real world（現実との一致） |             |                |          |
| H3  | User control and freedom（操作と取り消し）              |             |                |          |
| H4  | Consistency and standards（一貫性 / 業界標準）          |             |                |          |
| H5  | Error prevention（エラー予防）                          |             |                |          |
| H6  | Recognition rather than recall（認識 vs 想起）          |             |                |          |
| H7  | Flexibility and efficiency of use（柔軟性 / 効率）      |             |                |          |
| H8  | Aesthetic and minimalist design（最小主義）             |             |                |          |
| H9  | Help users recognize, diagnose, recover from errors     |             |                |          |
| H10 | Help and documentation                                  |             |                |          |

severity 凡例（Nielsen 標準）:

- 0: not a problem
- 1: cosmetic — fix only if extra time
- 2: minor — low priority
- 3: major — high priority
- 4: catastrophic — must fix before release

## Cognitive Walkthrough（4 Steps × 各操作ステップ）

主要操作（3〜5 ステップ）を分解して各ステップに 4 質問を当てる。

### Step 1: <例: ホットキー押下>

- **Q1 目標**: ユーザは「次に何をすべきか」を理解できるか? → ✅ / ❌ + 理由
- **Q2 手段認知**: 正しい操作（このホットキー）が利用可能だと気づくか? → ✅ / ❌ + 理由
- **Q3 操作可能性**: 気づいた操作を正しく実行できるか? → ✅ / ❌ + 理由
- **Q4 フィードバック**: 操作結果が「進んでいる」と分かるか? → ✅ / ❌ + 理由

### Step 2: <例: 検索文字入力>

- **Q1**:
- **Q2**:
- **Q3**:
- **Q4**:

### Step 3: <例: Enter で起動>

- **Q1**:
- **Q2**:
- **Q3**:
- **Q4**:

## 業界比較

| 競合製品     | 同等操作                        | Arcagate との差分 |
| ------------ | ------------------------------- | ----------------- |
| Raycast      | <例: ⌘Space → 即時 fuzzy match> |                   |
| Alfred       |                                 |                   |
| Spotlight    |                                 |                   |
| <ジャンル別> | <例: Steam Library / Playnite>  |                   |

参照: `docs/l1_requirements/ux-research/industry-standards.md`

## 数値計測（実機計測時のみ）

| 指標                     | 計測値      | 目標値  | 業界標準            |
| ------------------------ | ----------- | ------- | ------------------- |
| ホットキー → UI 表示 P95 | < 計測 ms > | < 100ms | Spotlight 即時      |
| 検索結果反映 P95         | < 計測 ms > | < 80ms  | Raycast < 50ms      |
| 起動 → アプリ起動 P95    | < 計測 ms > | < 1.5s  | OS 依存             |
| キーボード完結率         | < 計測 % >  | 100%    | Raycast/Alfred 標準 |
| クリック数（最短経路）   | < 計測 >    | 1〜3    | <競合>              |

実測手段: `scripts/bench/*.ps1` / 手動ストップウォッチ / Chrome DevTools Performance

## 摩擦サマリ

- 🟢 **micro**（即修正、5 行以下）:
  - <例: H4 違反 / hotkey 表記 ずれ>
- 🟡 **medium**（5 ファイル以下、batch-92+）:
  - <例: H9 違反 / launch 失敗診断不足>
- 🔴 **macro**（構造再設計、Rule A）:
  - <例: 該当なし / Quick Settings 新設>

## 解決提案（次バッチ Plan 候補）

- <提案 1>: PH-XXX 候補（Nielsen H? / CW Step?）
- <提案 2>:

## SFDIPOT 観点

- **F**unction: ユースケースが期待通り完走するか
- **U**ser expectations: 業界標準と合致するか
- **T**ime: 各ステップの体感応答時間
- **I**mage（HICCUPPS）: 競合比較で違和感ないか

## 受け入れ条件（このテンプレ使用時）

- [ ] Nielsen 10 全項目に severity または「該当なし」記入
- [ ] Cognitive Walkthrough 全ステップに 4 質問記入
- [ ] 業界比較表 3 製品以上記入
- [ ] 摩擦サマリに micro / medium / macro 分類
- [ ] 解決提案 1 件以上を batch+1 候補として記載
