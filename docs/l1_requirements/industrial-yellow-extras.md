# Industrial Yellow Extras (§4-10)

[industrial-yellow.md](./industrial-yellow.md) §1-3 の続編。

## 4. State

| state         | 表現                                                                       | 適用例                |
| ------------- | -------------------------------------------------------------------------- | --------------------- |
| default       | `--ag-il-paper` 背景 + `--ag-il-border`                                    | card / button         |
| hover         | `--ag-il-paper-dim` 背景 + 軽 elevation (shadow-sm)                        | 全 interactive        |
| focus-visible | 蛍光イエロー 2px ring + 2px offset                                         | input / button / card |
| selected      | `--ag-il-selected-fill` 背景 + `--ag-il-on-yellow` ink + L 字 bracket 蛍光 | LibraryCard / chip    |
| active (押下) | `--ag-il-yellow-active` + inset shadow                                     | button                |
| disabled      | `opacity: 0.4` + cursor not-allowed                                        | 全 interactive        |
| error         | orange 菱形 marker + `--ag-il-orange` text                                 | inline alert / chip   |

## 5. Empty / loading / error

- **empty**: prominent CTA pill (yellow primary) + 説明 text + ハーフトーン薄く敷く
- **loading**: card skeleton に 斜線ハッチ + 1.2s 進行 sweep gradient
- **error**: orange 菱形 (`◆`) + `--ag-il-orange` text + 「再試行」 pill button

## 6. Light / Dark mode

L1 までの dark theme override はそのまま維持。Industrial Yellow は **基本同じ token 値**を使うが、paper / ink 系は dark mode で flip:

- `--ag-il-paper` は light=`#F1F1EB` / dark=`#1A1B1A`
- `--ag-il-ink` は **paper 上で読める text color として semantic flip** (light=`#050605` / dark=`#F1F1EB`)。component で `text-[var(--ag-il-ink)]` を default にすれば両 mode で読める
- `--ag-il-on-yellow` は **yellow が両 mode で同じ明るさのため不変** (#050605)
- `--ag-il-border` は ink 基準 rgba (light=`rgba(5,6,5,0.12)` / dark=`rgba(255,255,255,0.18)`)
- `--ag-il-bracket` は dark で yellow に切替 (dark paper 上での視認性確保)

Light mode は L2 以降の polish で扱う。L2-A は **dark default** (現行 user 環境) のみ verify。

## 7. 共通 component prefab (L2-A A3)

- **`IndustrialPanel.svelte`** (~80 行): paper 背景 + L 字 bracket + 任意 dotscreen / hatching slot。`<header>` / default slot / `<footer>` の 3 slot
- **`IndustrialButton.svelte`** (~60 行): variant `primary | secondary | ghost | danger`、size `sm | md`、icon slot

両 component は `tests/e2e/industrial-prefab.spec.ts` で smoke。

## 8. Migration plan (L2-A 以降)

1. **L2-A**: spec + token 追加 + prefab 作成 + 可視部 3 component (LibraryDetailPanel / StatCard / sidebar 1 個) のみ切替 (smoke)
2. **L2-B**: keyboard / undo 関連で focus ring / selected を Industrial に
3. **L2-C**: filter chip / search bar / sort dropdown を Industrial に
4. **L2-D**: empty / loading / error すべて Industrial に
5. **L3**: 旧 `--ag-accent` 等を deprecated 化、最終的に削除 (旧 theme は migration v0xx で remove)

## 9. 退路 (D10)

L2-A 時点で **「default Industrial、user は旧 theme に切替えて戻れる」** を維持。

- `configStore.theme` に `'industrial' | 'classic'` を追加 (default `'industrial'`)
- classic = 既存の cyan accent + 大きい角丸 + 通常 shadow を保持
- L2-A の smoke 範囲では theme 切替えで 3 component が即見た目変わることを verify

## 10. 検証

- A2 token 追加 commit で `pnpm verify` 全段 pass
- A3 prefab で unit (props / variant 切替え) + 実機 CDP screenshot
- A4 切替えで before/after screenshot を Read で目視評価 (DOM 存在判定禁止)
- Codex 二次レビューで token 命名整合 / 旧 token 残存影響を機械検出

## 11. 引用元

- design-direction.md §0.2 (Industrial Yellow checklist) — 4 色 / shape / state の network
- design_system_architecture.md §2 (token 階層 primitive → semantic) — 命名規則
- ux_standards.md §3-3 (focus ring 仕様) — `:focus-visible` ベース
- CLAUDE.md `<critical-rule id="instant-feedback">` — 設定変えたら即見た目
