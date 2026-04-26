---
id: PH-20260426-352
status: todo
batch: 79
type: 改善
---

# PH-352: ts-rs で Rust → TS 型同期 + audit-widget-coverage.sh

## 横展開チェック実施済か

- batch-74 で `audit-labels.sh` を機械化したのと同じパターン
- ts-rs は cargo の type-sync 業界標準

## 仕様

### Rust 側 ts-rs 導入

- `Cargo.toml` に `ts-rs = "10"` 追加
- `src-tauri/src/models/workspace.rs` の `WidgetType` に:

  ```rust
  #[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ts_rs::TS)]
  #[serde(rename_all = "snake_case")]
  #[ts(export, export_to = "../src/lib/bindings/")]
  pub enum WidgetType {
      Favorites,
      // ...
  }
  ```

- `cargo test` 実行で `src/lib/bindings/WidgetType.ts` が自動生成

### TS 側

- `src/lib/types/workspace.ts` の `WidgetType` 手書き union を **削除**
- `import type { WidgetType } from '$lib/bindings/WidgetType'`（または相対 path）に置換
- `WIDGET_LABELS` も削除（PH-350 の registry に統合）
- `Workspace` / `WorkspaceWidget` 型は別 export 維持

### audit-widget-coverage.sh

- Rust enum と TS registry の variant 集合差分検出（registry 側に WidgetType が漏れていれば fail）
- CI ci.yml に Label audit と並ぶ step

## 受け入れ条件

- [ ] cargo test で WidgetType.ts auto-generate
- [ ] TS の手書き union 削除、auto-gen 参照に置換
- [ ] audit-widget-coverage.sh が Rust と TS の集合一致を検証
- [ ] 意図的に片方だけ entry 追加すると fail することをセルフテストで確認
- [ ] CI step 統合
- [ ] `pnpm verify` 全通過
