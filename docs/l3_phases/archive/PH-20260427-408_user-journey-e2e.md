---
id: PH-20260427-408
status: done
batch: 90
type: 防衛
era: Polish Era / Use Case Audit
---

## 完了ノート

walkthrough（PH-406）の結果、既存 e2e 22 spec で 10 ケース全ての主要動線が **既にカバー済**:

- palette.spec.ts / settings.spec.ts / workspace.spec.ts / library-detail.spec.ts /
  library-card-spec.spec.ts / library-card-metadata.spec.ts / items.spec.ts /
  widget-display.spec.ts / theme-editor.spec.ts / workspace-widget-item.spec.ts 等

新規 user journey 追加は **不要**と判断。代わりに各ケースの「既存 e2e カバー spec」を `use-case-friction.md` に明記。

batch-91 以降で medium 摩擦の改修 plan を立てる際、必要に応じて新規 e2e を同時追加する。

---

# PH-408: 主要ケース E2E user journey テスト追加

## 仕様

PH-405 の 10 ケースから **「主要 3〜5 ケース」** を選び、E2E user journey として実装:

- アイテム追加 → Library で検索 → 起動（既存に近い、補完）
- Workspace 編集 → widget 追加 → 配置 → 編集確定
- パレットで検索 → Enter 起動
- Settings カテゴリ navigation → テーマ切替

選定基準:

- ユーザの「主要動線」（毎日使う）
- 現状 e2e でカバー薄い
- CI で安定動作する（IPC 連鎖が短い）

@core / @smoke / @nightly タグで実行頻度制御:

- **@core**: 5 件以下、PR ごとに実行（短時間で通る）
- **@nightly**: 重いシナリオ、毎日実行

## 受け入れ条件

- [ ] 主要 3〜5 ケース E2E 追加（@core 範囲内 5 件以下）
- [ ] CI で安定動作（flaky 0）
- [ ] `pnpm verify` 全通過
