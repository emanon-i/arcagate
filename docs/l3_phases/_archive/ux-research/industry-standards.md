# 業界 UX 標準ベンチマーク

batch-91 PH-410 で着手、partial 完成（Nielsen 10 のみ取得済、他は次セッションで補完）。

## 1. Nielsen Norman Group: 10 Usability Heuristics

**出典**: https://www.nngroup.com/articles/ten-usability-heuristics/（取得日 2026-04-27）

| #  | 原則                                                    | 要約                                                   | Arcagate 自己評価                                                                          |
| -- | ------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 1  | **Visibility of System Status**                         | 適切な時間内のフィードバックでシステム状態を常に伝える | 🟡 LoadingState/toast はあるが、widget poll 中の表示弱い                                   |
| 2  | **Match Between System and Real World**                 | ユーザの言語・概念・実世界の慣行に合わせる             | ✅ 「アイテム」「タグ」「ワークスペース」は直感的                                          |
| 3  | **User Control and Freedom**                            | 明確な「緊急脱出」/ 元に戻す機能                       | 🟡 ConfirmDialog で破壊的操作は確認、undo はなし                                           |
| 4  | **Consistency and Standards**                           | 用語・操作・配置の一貫性、業界慣行に従う               | 🟡 ホットキー Ctrl+Shift+Space (Win IME 衝突回避、PH-191)、Settings 2 ペインは Obsidian 風 |
| 5  | **Error Prevention**                                    | エラー発生防止が最優先（事後復旧より）                 | 🟡 入力 validation あり、launch 失敗の事前チェックなし（PH-410 候補）                      |
| 6  | **Recognition Rather than Recall**                      | 視認可能な要素・操作・選択肢で記憶負担を減らす         | ✅ Workspace で pinned アイテム、Library で全件可視                                        |
| 7  | **Flexibility and Efficiency of Use**                   | 上級者向けショートカット + 初心者向け簡易操作の両立    | 🟡 ホットキーあり、エイリアスやマクロなし                                                  |
| 8  | **Aesthetic and Minimalist Design**                     | 不要・低頻度の情報を排除、本質に集中                   | ✅ batch-65 で情報密度整理 (lessons.md)                                                    |
| 9  | **Help Users Recognize, Diagnose, Recover from Errors** | プレーンな言葉でエラー説明、解決策提示                 | 🔴 launch 失敗時 stack trace 表示、復旧導線なし（batch-90 friction case 1）                |
| 10 | **Help and Documentation**                              | 必要時にコンテキスト依存ヘルプ                         | 🔴 in-app ヘルプなし、README + About のみ                                                  |

### 違反 / 弱点 集計

- ✅ 適合: 3 件（#2, #6, #8）
- 🟡 部分適合: 5 件（#1, #3, #4, #5, #7）
- 🔴 違反: 2 件（#9, #10）

batch-92 re-audit でこの分類を **コードで verify** することが目標（現状は agent 自己評価ベース）。

---

## 2. Material Design 3 / Apple HIG（WebSearch 経由 partial 取得）

### Apple HIG: Menu / キーボードショートカット

**出典**: WebSearch 結果（取得日 2026-04-27）

- メニュータイトルは内容を正確に表す（Font メニュー = フォント名、Cut/Paste は別）
- キーボードショートカットは **頻繁に使うコマンドのみ** 設定（多用は混乱を招く）
- HIG は OS / デバイスごとに更新、最新動向はリリースノート参照

**Arcagate 整合**: `Ctrl+Shift+Space` パレット起動 (Win IME と衝突しないよう PH-191 で Ctrl+Space から変更)。Settings 内のショートカットは限定的、パレット中心の power user 向け設計。

参考: [Apple HIG Menus](https://leopard-adc.pepas.com/documentation/UserExperience/Conceptual/AppleHIGuidelines/XHIGMenus/XHIGMenus.html)

### Material Design 3: アニメーション / フィードバック

**出典**: WebSearch（NN/g + Material Design ドキュメント、取得日 2026-04-27）

| インタラクション                      | 推奨時間                 |
| ------------------------------------- | ------------------------ |
| トグル / 細かいフィードバック         | **~100ms**               |
| ボタン状態変化（color shift + scale） | **300-500ms**            |
| 一般 UI アニメーション（フェード等）  | **400-500ms 以内に完了** |

**Arcagate 整合**:

- ConfirmDialog の transition: `dFast=120ms (fade)`, `dNormal=200ms (scale)` → ✅ 業界標準内
- toast の表示時間: 短い、これは適切（NN/g 推奨と整合）
- `motion-reduce:` Tailwind プリファレンスで Reduced Motion 対応 ✅

参考:

- [Material Design 3 Dialogs spec](https://m3.material.io/components/dialogs/specs)
- [Material Design 3 Easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- [NN/g UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/)

### 残: GNOME HIG / Microsoft Fluent

⏸ 次セッションで補完。Linux/Windows native UX の参照が薄いと「Tauri × Windows」のネイティブ感整合確認が不完全。

## 3. ランチャー / コマンドパレット 競合（WebSearch 取得）

**出典**: WebSearch 結果（取得日 2026-04-27、Tech-insider / TechLila / Medium のレビュー記事）

### 性能ベンチマーク

| 指標           | Raycast                  | Alfred                                   | Spotlight     |
| -------------- | ------------------------ | ---------------------------------------- | ------------- |
| 検索結果表示   | <50ms (M3 Mac)           | ms 単位で Raycast より速い (file search) | OS 統合で最速 |
| アプリ起動応答 | ~80ms 前後               | ≤80ms (Spotlight indexing 利用)          | OS native     |
| 起動時間       | 0.5 秒（プラグイン依存） | ~1 秒未満                                | 0 (常駐)      |
| CPU baseline   | プラグイン依存           | 1-2% baseline                            | システム      |
| 拡張性         | 2,000+ 拡張              | Workflow + 有料 PowerPack                | 限定的        |

### UX 設計思想（要約）

- **Raycast**: コマンドオリエンテッド、AI 統合、UI 流線型、無料
- **Alfred**: power-user 向け、Workflow ベース、ファジー検索 + 履歴学習、有料 PowerPack で機能拡張
- **Spotlight**: OS 統合 / 最小機能、初心者向け、カスタマイズ薄

### Arcagate との比較

| 観点           | Arcagate                                            | 業界平均                        | 評価                   |
| -------------- | --------------------------------------------------- | ------------------------------- | ---------------------- |
| 検索結果表示   | 未計測（推定 ~150ms、debounce 150ms）               | Raycast 50ms / Alfred ms        | 🟡 計測 + 改善余地     |
| ホットキー応答 | 未計測（PH-402）                                    | Raycast ~100ms / Spotlight 即時 | TBD                    |
| 拡張性         | widget folder colocation で容易                     | Raycast 2000+ ext               | 🟡 公式 ext store なし |
| 慣行整合       | Ctrl+Shift+Space (Win 用、Spotlight 系慣行から派生) | 各 OS native                    | ✅                     |

参考:

- [Tech Insider: Raycast vs Alfred 2026](https://tech-insider.org/raycast-vs-alfred-2026/)
- [TechLila: Raycast vs Alfred Statistics 2026](https://www.techlila.com/raycast-vs-alfred-statistics/)
- [Medium: Spotlight vs Alfred vs Raycast](https://medium.com/@andriizolkin/spotlight-vs-alfred-vs-raycast-31bd942ac3b6)
- [Raycast 公式比較](https://www.raycast.com/raycast-vs-alfred)

---

## 4. ゲーム業界 ライブラリ UX（WebSearch 取得）

**出典**: WebSearch 結果（取得日 2026-04-27）

### Playnite（OSS / カスタマイズ最強）

- **完全カスタマイズ可能**: 色 / レイアウト / メタデータ全て編集可
- **複数ストア統合**: Steam / Epic / GOG / 自作プロジェクト 1 つの UI に集約
- **Fullscreen mode**: コントローラー対応の別 UI
- **欠点**: cover art のアスペクト比が不揃い（複数ソースから引っ張るため）

### GOG Galaxy 2.0

- **2 表示モード**: list view / **grid view**（grid がデフォルト）
- **cover art 統一**: 全サービスで同サイズ / 同形状（見栄え重視）
- **軽量**: Playnite より軽い、設定簡単
- **欠点**: カスタマイズは Playnite より浅い

### Steam

- 標準 UI、collections / shelves で grouping
- アクセスしやすい大型サムネイル

### 共通パターン

- ✅ **grid view + list view の二択** を提供
- ✅ **cover art 統一表示**（GOG Galaxy ベスト）
- ✅ **複数ストア / ソース統合**（Playnite/GOG）
- ✅ **fullscreen / desktop モード分離**（Playnite/Steam Big Picture）

### Arcagate 整合

| パターン              | Arcagate                                                          | 評価              |
| --------------------- | ----------------------------------------------------------------- | ----------------- |
| grid view + list view | ✅ batch-65 で実装                                                | OK                |
| cover art 統一        | ✅ 4:3 + S/M/L 全体可変、batch-65 PH-280                          | OK                |
| 複数ソース統合        | 🟡 Library + Workspace で集約だが、Steam / Epic 等の API 連携なし | 🟡 batch-91+ 検討 |
| fullscreen mode       | ❌ なし、対応必要性低い（PC 用個人ツール）                        | OK（スコープ外）  |

参考:

- [Playnite 公式](https://playnite.link/)
- [Playnite GitHub](https://github.com/JosefNemec/Playnite/)
- [MakeUseOf: Playnite で Steam/Epic/GOG 統合](https://www.makeuseof.com/playnite-game-launcher-steam-epic-games-gog/)
- [Stardust Theme: GOG Galaxy 2.0 風 Playnite テーマ](https://github.com/darklinkpower/Stardust)

---

## 5. 数値ベンチマーク表（テンプレート、未測定）

| 指標                          | Arcagate 現状                       | 業界標準                                    | 評価      |
| ----------------------------- | ----------------------------------- | ------------------------------------------- | --------- |
| ホットキー → パレット表示 P95 | 未計測（PH-402 deferred）           | Spotlight: 即時 / Raycast: ~100ms           | TBD       |
| 検索結果表示まで              | 未計測                              | Raycast: 50-100ms                           | TBD       |
| top タスククリック数          | 未計測（walkthrough 推測 1-3 操作） | Raycast: 2 操作 / Spotlight: 1 操作         | TBD       |
| idle メモリ                   | 未計測（PH-402 deferred）           | Raycast: ~80MB / Alfred: ~30MB              | TBD       |
| exe サイズ                    | 16.5 MB                             | Tauri 系: 10-50 MB / Electron 系: 80-200 MB | ✅ 競合的 |

---

## 次バッチ batch-92 への入力

このリサーチを基に:

1. Nielsen 10 違反 #9, #10 の解消（micro/medium 改修候補）
2. 数値ベンチマーク実測（PH-402 起動 P95 + idle memory）
3. 業界標準と Arcagate の数値比較表完成

を batch-92 で実施。

---

## 取得状況サマリ

| 出典               | 取得 | 備考                                       |
| ------------------ | ---- | ------------------------------------------ |
| NN/g 10 Heuristics | ✅   | full text 取得済                           |
| Material Design 3  | 🟡   | SPA、次セッションで代替アプローチ          |
| Apple HIG          | 🟡   | SPA、次セッションで代替アプローチ          |
| Raycast manual     | 🟡   | 404 (URL 変更可能性)、次セッションで再探索 |
| GNOME HIG / Fluent | ⏸    | 次セッション着手                           |
| ランチャー競合     | ⏸    | 次セッション着手                           |
| ゲーム業界         | ⏸    | 次セッション着手                           |

PH-410 を **partial done** として batch-91 commit、残は **next session** で完成。
