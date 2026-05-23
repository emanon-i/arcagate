[A1] PARTIAL\
evidence: `src/routes/+page.svelte:38,520`, `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:170`, `src-tauri/src/services/exe_scanner_service.rs:64-90` — scan is only triggered from ExeFolder widget mount/effect, but if app reopens in Workspace view it can still run during startup; walk is cold recursive `read_dir` + per-entry `metadata`.\
if DISAGREE/PARTIAL/ADDITIONAL: correct cause is “no scan cache + mount-time scan” (not strictly “never startup path”).

[B1] AGREE\
evidence: `src/lib/components/setup/SetupWizard.svelte:22`, `src/lib/components/arcagate/common/TitleBar.svelte:47,58,64` — fullscreen fixed overlay covers titlebar; drag regions exist only in TitleBar.

[C1] AGREE\
evidence: `src/lib/components/arcagate/library/LibraryView.svelte:265-333`, `src/lib/state/items.svelte.ts:101` — context menu has launch/star/settings/opener actions, no delete action, while delete API exists.

[C2] PARTIAL\
evidence: `src/lib/components/item/ItemFormCardOverride.svelte:103-106`, `src/lib/components/arcagate/library/LibraryView.svelte:173,226`, `src/lib/components/arcagate/library/LibraryCard.svelte:193` — update path and keyed rerender are correct; `content-visibility:auto` exists.\
if DISAGREE/PARTIAL/ADDITIONAL: repaint-skipping is plausible but still a hypothesis from static code (not conclusively provable here).

[C3] AGREE\
evidence: `src-tauri/src/repositories/item_repository.rs:188`, `src-tauri/migrations/001_initial.sql:67` — query compares `launch_log.launched_at` text (`...T...Z`) against `datetime('now', '-7 days')` text (`... ...`), so string-time semantics are mismatched at boundary.

[C4] AGREE\
evidence: `src-tauri/src/repositories/item_repository.rs:75`, `src/lib/components/arcagate/library/LibraryMainArea.svelte:153,207-208` — tag search hard-filters `is_enabled=1`; All tab uses full list then client filter.

[C5] AGREE\
evidence: `src/lib/components/arcagate/library/LibrarySortControls.svelte:109-127` — add-item button appears before rightmost selection toggle text button.

[C6] AGREE\
evidence: `src/lib/components/arcagate/library/LibrarySidebar.svelte:102,126` — workspace and user-tag rows both use `LayoutDashboard`.

[C7] AGREE\
evidence: `src/lib/components/arcagate/library/LibraryMainArea.svelte:369-373` — panel closes unless click target is inside `[data-testid^="library-card-"]`; toolbar/search/sort clicks are treated as outside.

[C8] AGREE\
evidence: `src/lib/components/arcagate/workspace/WorkspaceGrid.svelte:278-285`, `src-tauri/src/services/wallpaper_service.rs:47` — wallpaper is workspace-bound in model/UI, while file-save service itself is reusable and workspace-agnostic.

[D1] AGREE\
evidence: `src/lib/styles/arcagate-theme.css:107,345-347`, `src/lib/widgets/projects/ProjectsWidget.svelte:84,431`, `src/lib/widgets/script-folder/ScriptFolderWatchWidget.svelte:250,256`, `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:440-442` — transparent sticky bar + opaque card rows in projects/exe(card) causes bleed-through; script-folder rows are transparent except hover.\
if DISAGREE/PARTIAL/ADDITIONAL: additional confirmed issue is invalid DOM in exe card mode (`<div>` directly inside `<ul>`).

[D2] AGREE\
evidence: `src/lib/widgets/projects/ProjectsSettings.svelte:22,33,64,76`, `src/lib/widgets/projects/index.ts:18`, `src/lib/widgets/projects/ProjectsWidget.svelte:72`, and only these hits for `max_items` — setting exists but is unused in behavior.

[D3] PARTIAL\
evidence: `src/lib/widgets/projects/ProjectsWidget.svelte:294` (no `path` prop), `src/lib/widgets/projects/ProjectsWidget.svelte:323-339` (description only in non-empty branch).\
if DISAGREE/PARTIAL/ADDITIONAL: icon mismatch claim is stale; meta and widget both use `FolderKanban` (`src/lib/widgets/projects/index.ts:12`, `ProjectsWidget.svelte:294`).

[D4] AGREE\
evidence: `src/lib/widgets/exe-folder/ExeFolderSettings.svelte:22,128-131`, `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:293-299`, `src/lib/widgets/projects/ProjectsWidget.svelte:286` — opener cascade exists for exe-folder only; projects uses plain `launchItem`.

[D5/D6] AGREE\
evidence: `src-tauri/src/services/exe_scanner_service.rs:133-152,166`, `src-tauri/src/services/exe_scanner_service.rs:276-289` — scanner pushes one entry per matched directory, but label is first root component, so nested matches under one top folder duplicate labels; tests currently assert this behavior.\
if DISAGREE/PARTIAL/ADDITIONAL: also misses required “one representative file per first-level folder” selection logic (depth-first + size tie policy not implemented).

[D7] PARTIAL\
evidence: `src/lib/widgets/system-monitor/SystemMonitorWidget.svelte:85-87`, `src/lib/widgets/system-monitor/SystemMonitorSettings.svelte:35-38` — defaults are mismatched, but currently mismatch is broader than Claude stated (CPU/memory/disk differ; settings defaults are sparkline/sparkline/gauge vs widget bar/bar/bar).\
if DISAGREE/PARTIAL/ADDITIONAL: root cause is dual default sources with divergent per-metric values.

[E1] AGREE\
evidence: `src/routes/+page.svelte:143,157,167,272`, `src/lib/state/workspace-widgets.svelte.ts:110,198-201`, `src/lib/utils/widget-grid.ts:53-70`, `git show 6e91b89 --name-only` — drag-drop payload has only paths; placement calls `addWidget` without coords; empty workspace falls back to first free cell `(0,0)`; PR #543 touched zoom/layout files only, not D&D placement.

[E3] AGREE\
evidence: `src/lib/components/arcagate/workspace/PageTabBar.svelte:57,133-147`, `rg WorkspaceDeleteConfirmDialog` returns no usage — small hover-only delete affordance + `window.confirm`; dedicated dialog component is unused.

[E4] AGREE\
evidence: `src/lib/state/workspace-config.svelte.ts:87-109`, `src/lib/state/error-monitor.svelte.ts:53-57,74` — delete flow stores error in state (no toast there); unexpected toast is from global unhandled rejection monitor.\
if DISAGREE/PARTIAL/ADDITIONAL: exact rejecting promise remains unresolved without runtime trace.

[E5] DISAGREE\
evidence: `src-tauri/src/services/workspace_service.rs:93-107` already deletes `sys-ws-*`-tagged items on workspace delete; `src/lib/state/workspace-config.svelte.ts:87-109` does not refresh `itemStore`; `src-tauri/src/services/launch_service.rs:51` resolves item by id and can return NotFound.\
if DISAGREE/PARTIAL/ADDITIONAL: correct/missing cause now is stale frontend item cache after backend cascade delete, plus unsynced dual references (`sys-ws-*` tags vs widget `item_ids`) can still leave invalid references.

[E6] AGREE\
evidence: `src/lib/components/arcagate/workspace/PageTabBar.svelte:57` — `window.confirm` cannot express “also delete items” checkbox/flag.

[F1] AGREE\
evidence: `src-tauri/src/repositories/theme_repository.rs:32`, tests at `:97-108` — order is builtin-first then alphabetical; builtin set is 5 themes.

[F2] PARTIAL\
evidence: `src/lib/styles/arcagate-theme.css:218,516`, plus `:119-124` — dark/hud primaries are very bright; accent text is derived via `color-mix`, not literal pure white.\
if DISAGREE/PARTIAL/ADDITIONAL: issue is low contrast from bright primary + derived accent text, not strictly “white text” only.

[F3] AGREE\
evidence: `src/lib/components/settings/SettingsAppearancePane.svelte:53-57,70-72` — clone uses `activeMode`; if source theme not yet in loaded list, code falls back to default dark/empty clone.

[F4] AGREE\
evidence: `src/lib/components/settings/SettingsAppearancePane.svelte:161,179-217` — 2-column cards with multiple text-label action buttons in one narrow row are prone to wrapping/breaking.

[F5] AGREE\
evidence: `src/lib/components/settings/SettingsAppearancePane.svelte:199,207,75-77` — “clone_and_edit” duplicates theme; “copy” exports JSON to clipboard.

[F6] AGREE\
evidence: `src-tauri/src/services/theme_service.rs:42-61`, `src-tauri/src/repositories/theme_repository.rs:6-16`, `src-tauri/migrations/006_themes.sql` (name unique only) — no count cap exists.

[PH-PQ-600 miss analysis] PARTIAL\
evidence: `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:367`, `src/lib/widgets/projects/ProjectsWidget.svelte:348`, `src/lib/widgets/script-folder/ScriptFolderWatchWidget.svelte:220` all share `ag-sticky-bar` class, while real differences are in defaults/row backgrounds/props (`ProjectsWidget.svelte:84,294,323`; `ExeFolderWatchWidget.svelte:314`; `ScriptFolderWatchWidget.svelte:169`); `docs/l3_phases/paid-quality/PH-PQ-600_widget-expansion.md:88` shows checkbox-style matrix granularity.\
if DISAGREE/PARTIAL/ADDITIONAL: class-string uniformity and prop-level blind spots are verified; “projects was excluded” is process-level and only indirectly supported by resulting code drift, not provable from runtime code alone.

**CROSS-CHECK SUMMARY**

- A1
- C2
- D3
- D7
- E5
- F2
- PH-PQ-600 miss analysis
