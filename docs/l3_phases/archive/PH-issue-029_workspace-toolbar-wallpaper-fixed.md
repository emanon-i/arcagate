---
id: PH-issue-029
title: Workspace 上部 toolbar + 壁紙 位置固定 + 初回 onboarding (Issues #6 / #7 / #8 bundle)
status: planning
parent_l1: REQ-006_workspace-widgets
related: PH-issue-002 (Obsidian Canvas 編集モード撤廃)、PH-issue-009 (壁紙 Phase A/B)
---

# Issues #6 / #7 / #8: Workspace 上部固定 + 壁紙固定 + 初回起動

## user 指摘 (3 件 bundle)

> #6: workspace 未作成時の挙動が変 → 初回起動で空 workspace を自動作成（onboarding flow）
> #7: workspace 一覧 + 壁紙設定ボタンを上部固定: 右下 Undo toolbar と同じ位置固定パターン、パンでずらさない、編集モードなしなので非表示機能不要
> #8: 壁紙が画面パンでずれる → 位置固定、パンの影響を受けない

これら 3 件は **workspace 上部 / 背景の位置固定** 系で関連性が高いため bundle PR で対応。

## 引用元 guideline doc

| Doc                                         | Section                                             | 採用判断への寄与                                                                                                 |
| ------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `docs/desktop_ui_ux_agent_rules.md`         | P3 主要 vs 補助 / P2 即時反応 / P11 装飾より対象    | navigation toolbar は scroll に従わない (sticky)、初回起動で「何もない」を見せない、壁紙は装飾なので scroll 固定 |
| `docs/l1_requirements/ux_standards.md`      | §6-3 Toolbar / §13 Workspace Canvas / §15 Wallpaper | workspace 切替は常時アクセス可能、wallpaper は背景 layer (scroll 非追従)                                         |
| `docs/l1_requirements/vision.md`            | M1 launch 摩擦ゼロ                                  | 初回起動で「workspace を作る」摩擦をゼロに                                                                       |
| `docs/l0_ideas/arcagate-visual-language.md` | 過度な装飾 NG                                       | 壁紙の parallax は装飾過剰 → 固定                                                                                |
| `CLAUDE.md`                                 | 「設定変えたら即見た目が変わる」                    | 初回 workspace 自動生成、PageTabBar 固定                                                                         |

## Fact 確認 phase

### #6 workspace 未作成時の挙動

`src/lib/state/workspace.svelte.ts:29-43` の `loadWorkspaces()`:

```ts
async function loadWorkspaces(): Promise<void> {
  workspaces = await workspaceIpc.listWorkspaces();
  if (workspaces.length > 0 && activeWorkspaceId === null) {
    activeWorkspaceId = workspaces[0].id;
    await loadWidgets(workspaces[0].id);
  }
}
```

→ **workspaces.length === 0 の場合、何も起きない**。`activeWorkspaceId` も null のまま。
→ user は WorkspaceLayout で空白画面を見るか、PageTabBar に空 tabs を見るだけ。
→ 初回起動 (DB 新規) では migration で seed されないので空の状態を必ず通る。

### #7 PageTabBar 位置

`src/lib/components/arcagate/workspace/WorkspaceLayout.svelte:281-308` (現状):

```svelte
<div class="canvas-edit-mode relative min-w-0 flex-1 overflow-auto p-5 ..." bind:this={workspaceContainer}>
  {#if wallpaper} <div class="absolute inset-0 ..." /> {/if}
  <div class="mb-5">
    <PageTabBar ... />
  </div>
  <div class="flex gap-4">
    <WorkspaceWidgetGrid ... />
  </div>
</div>
```

→ PageTabBar は **canvas (overflow-auto) の中**にあり、Space+drag pan / 中ボタン pan で上方向に
スクロールすると **PageTabBar が画面外に消える**。
→ 右下 Undo toolbar (`absolute bottom-4 right-4 z-30`) は WorkspaceLayout の **canvas 外** に
position:absolute されているため pan の影響を受けない。同じ pattern を上部にも適用する必要。

### #8 壁紙位置

同 `WorkspaceLayout.svelte:290-298`:

```svelte
{#if workspaceStore.activeWorkspace?.wallpaper_path}
  <div class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat motion-reduce:!filter-none"
    style="background-image: url('{wpUrl}'); opacity: ...; filter: blur(...)">
```

→ wallpaper layer は canvas (overflow-auto) の **中**にある絶対配置 → canvas が scroll すると
absolute layer も内部 content と一緒に動く。
→ user 期待: 壁紙は背景固定、widget だけ pan で動く。

## 横展開 phase

| 領域                                        | 影響                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `workspaceStore.loadWorkspaces`             | length === 0 で auto-create + seedDefaultWidgets                                 |
| `WorkspaceLayout` レイアウト                | canvas の外に top toolbar + wallpaper layer を出す。canvas は widget grid 専用に |
| `WorkspaceLayout` 中ボタン / Space+drag pan | scroll 動作は canvas 限定 (現状通り)、外側 toolbar は影響しない                  |
| 右下 Undo toolbar                           | 既に canvas 外 absolute、変更なし                                                |
| `WorkspaceHintBar`                          | canvas 外 fixed bottom、変更なし                                                 |
| `PageTabBar`                                | canvas 外 → pan 非追従                                                           |
| 壁紙                                        | canvas 外 absolute → pan 非追従、widget grid だけが scroll                       |
| Library / Palette / Settings                | 影響なし (Workspace 専用)                                                        |

## 採用案 A: 「canvas を 3 段 layout (header / grid / footer toolbar) に分割、wallpaper は最外層 absolute」

```svelte
<div class="relative flex h-full">
  <Sidebar />
  <div class="relative flex flex-1 flex-col min-w-0 overflow-hidden">
    {#if wallpaper}
      <!-- 背景: 最外層、固定 (parent flex-1 を覆うのみ、scroll しない) -->
      <div class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center" style="..." />
    {/if}
    <!-- 上部 fixed toolbar (PageTabBar + 壁紙 button) -->
    <div class="relative z-10 shrink-0 border-b border-[var(--ag-border)] bg-[var(--ag-surface-opaque)]/85 backdrop-blur-sm">
      <PageTabBar ... />
    </div>
    <!-- Canvas (scrollable widget grid) -->
    <div class="canvas-edit-mode relative z-10 flex-1 overflow-auto p-5 [scrollbar-gutter:stable]"
         bind:this={workspaceContainer}
         onpointerdown={...} onpointermove={...} onpointerup={...}>
      <WorkspaceWidgetGrid ... />
    </div>
    <!-- 右下 toolbar (canvas 外、絶対配置維持) -->
    <div class="absolute bottom-4 right-4 z-30 ..."> Undo / Redo / Reset / Fit </div>
  </div>
</div>
```

- pan / scroll 操作対象は canvas のみ
- wallpaper / PageTabBar / 右下 toolbar は canvas 外なので pan 非追従 (#7 + #8 解消)
- PageTabBar の bg は半透明 + backdrop-blur で wallpaper を透かす (P11 装飾より対象)

## 棄却案 B: 「PageTabBar を `position: sticky; top: 0` で対応」

- canvas 内に sticky 配置 → wallpaper が動く問題は別途解決必要 (依然)
- wallpaper を fixed background-attachment にしても overflow-auto 内では効かない
- → 解 A の方が clean、棄却

## 棄却案 C: 「workspace なしを許容、 EmptyState で誘導」

- 旧実装に近いが「初回起動で必ず手動作成」摩擦が残る → vision M1 違反
- → 棄却

## 実装ステップ

1. `workspaceStore.loadWorkspaces`: length === 0 で auto-create (`'Home'` という default 名)
   - 既存 `createWorkspace` は既に seedDefaultWidgets を呼ぶ → そのまま使える
2. `WorkspaceLayout.svelte` の layout 再構成:
   - canvas (現 overflow-auto + bind:this=workspaceContainer) は **widget grid 専用**に
   - 上部に sticky header (PageTabBar)
   - wallpaper layer は parent flex-1 column の外側 absolute (canvas の外)
   - pan / wheel / pointer handler は canvas のみ
3. wallpaper を canvas 外に移動した結果、`workspaceContainer` への bind は維持 (zoom hook が使う)
4. E2E spec は変更なし (機能は変わらず、レイアウトだけ)

## 受け入れ条件

- [ ] 初回起動 (DB 新規) で workspace が自動作成される (default 名 'Home')、user が「workspace を作る」step なしで widget grid が出る
- [ ] PageTabBar が canvas pan で消えない (常時画面上部に固定)
- [ ] 壁紙が canvas pan で動かない (背景は静止、widget grid のみ動く)
- [ ] 壁紙設定 button (PageTabBar 内) も同じく固定
- [ ] 右下 Undo toolbar の挙動は変わらない (既に canvas 外)
- [ ] WorkspaceHintBar の挙動は変わらない
- [ ] pnpm verify 全通過
- [ ] dev で実機: pan で壁紙 + tab bar が固定 / widget grid だけが動く

## guideline 整合 audit

- ✅ P3 主要 vs 補助: navigation = 主要 → 常時アクセス、widget grid = 主要 → scroll 可、wallpaper = 補助 → 固定
- ✅ P2 即時反応: 初回起動 → 待ち時間ゼロで workspace UI
- ✅ P11 装飾より対象: 壁紙は背景、widget grid と toolbar が前景
- ✅ vision M1 launch 摩擦ゼロ: 初回 workspace 作成手間ゼロ
