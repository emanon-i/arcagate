[A1] ⚠️ partial\
evidence: [perf.yml](E:/Cella/Projects/arcagate/.github/workflows/perf.yml:52) runs release build + perf suite; [startup.spec.ts](E:/Cella/Projects/arcagate/tests/perf/startup.spec.ts:139) measures cold/warm; [exe-scan-cache.spec.ts](E:/Cella/Projects/arcagate/tests/perf/exe-scan-cache.spec.ts:44) verifies cache path. But repo measurements still show over-budget startup ([perf-budgets-2026-05-22.md](E:/Cella/Projects/arcagate/docs/l3_phases/paid-quality/audit/perf-budgets-2026-05-22.md:109)).\
test: `tests/perf/startup.spec.ts::D1/D2 起動 P95 (cold / warm)` (exists: yes), `tests/perf/exe-scan-cache.spec.ts::PH-CF-900 A1-4` (exists: yes)\
missing/wrong: performance target itself is not evidenced as achieved.

[B1] ✅ verified\
evidence: drag-region strips are present in overlays: [SetupWizard.svelte](E:/Cella/Projects/arcagate/src/lib/components/setup/SetupWizard.svelte:30), [OnboardingTour.svelte](E:/Cella/Projects/arcagate/src/lib/components/setup/OnboardingTour.svelte:178), [HelpPanel.svelte](E:/Cella/Projects/arcagate/src/lib/components/help/HelpPanel.svelte:86), [\+page.svelte](E:/Cella/Projects/arcagate/src/routes/+page.svelte:545).\
test: `tests/e2e/ph-cf-1000-overlay-drag.spec.ts` (exists: yes), `scripts/audit-overlay-drag-region.sh` (exists: yes)

[C1] ✅ verified\
evidence: right-click menu delete wired in [LibraryView.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:323), handler routes to parent delete path [LibraryMainArea.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryMainArea.svelte:291).\
test: `tests/e2e/destructive-confirm.spec.ts::DC-1` (exists: yes)

[C2] ⚠️ partial\
evidence: content-visibility workaround implemented with temporary virtualization disable in [LibraryCard.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte:94) and rationale at [LibraryCard.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte:225).\
test: dedicated LB-2 automated test (exists: no); file explicitly notes C2 e2e is skipped in [ph-cf-600-library-bug-fixes.spec.ts](E:/Cella/Projects/arcagate/tests/e2e/ph-cf-600-library-bug-fixes.spec.ts:42)\
missing/wrong: no machine regression test for “instant icon reflection”.

[C3] ✅ verified\
evidence: 7-day count uses matching ISO format in [item_repository.rs](E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:214).\
test: `src-tauri/src/repositories/item_repository.rs::test_get_library_stats_recent_launch_count_respects_7d_boundary` (exists: yes)

[C4] ✅ verified\
evidence: `include_disabled` plumbed through backend [item_repository.rs](E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:77), command path [item_commands.rs](E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs:154), library callsite [LibraryMainArea.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryMainArea.svelte:173), favorites default false [FavoritesWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/favorites/FavoritesWidget.svelte:34).\
test: `test_search_in_tag_include_disabled_flag` (exists: yes), `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts::LB-4a/b/c` (exists: yes)

[C5] ✅ verified\
evidence: multi-select icon button and add button placement in [LibrarySortControls.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibrarySortControls.svelte:121) and [LibrarySortControls.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibrarySortControls.svelte:133).\
test: `tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts::LB-5` (exists: yes)

[C6] ✅ verified\
evidence: user-tag section uses `Tag` icon while workspace section keeps `LayoutDashboard` in [LibrarySidebar.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibrarySidebar.svelte:126) and [LibrarySidebar.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibrarySidebar.svelte:102).\
test: `scripts/audit-library-sidebar-icons.sh` (exists: yes), `tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts::LB-6` (exists: yes)

[C7] ✅ verified\
evidence: detail panel closes only on blank-area direct click (`e.target===e.currentTarget`) in [LibraryMainArea.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryMainArea.svelte:401).\
test: `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts::LB-7` (exists: yes)

[C8] ✅ verified\
evidence: wallpaper config migration [040_library_wallpaper_config.sql](E:/Cella/Projects/arcagate/src-tauri/migrations/040_library_wallpaper_config.sql:1), render layer in [LibraryLayout.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryLayout.svelte:112), settings UI in [LibraryWallpaperSettings.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/LibraryWallpaperSettings.svelte:118).\
test: `tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts::LB-8a/b/c` (exists: yes)

[D1] ✅ verified\
evidence: sticky bar token and style in [arcagate-theme.css](E:/Cella/Projects/arcagate/src/lib/styles/arcagate-theme.css:106) and [arcagate-theme.css](E:/Cella/Projects/arcagate/src/lib/styles/arcagate-theme.css:350); widgets use `ag-sticky-bar` in [ProjectsWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:321) and [ExeFolderWatchWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:415).\
test: `scripts/audit-sticky-bar-occlusion.sh` (exists: yes)

[D2] ✅ verified\
evidence: projects config/settings now only keep watched folder/title/description/default opener ([ProjectsWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:77), [projects/index.ts](E:/Cella/Projects/arcagate/src/lib/widgets/projects/index.ts:21), [ProjectsSettings.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsSettings.svelte:25)); removed fields are absent as config keys.\
test: dedicated automated D2 grep test (exists: no)

[D3] ✅ verified\
evidence: projects passes `path` to shell [ProjectsWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:267), description is outside empty/error branches [ProjectsWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:268), exe-folder shell icon aligned to `FolderOpen` [ExeFolderWatchWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:362).\
test: `scripts/audit-widget-shell.sh` (exists: yes, partial coverage only)

[D4] ✅ verified\
evidence: projects settings has `default_opener_id` selector [ProjectsSettings.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsSettings.svelte:107), launch uses cascade with widget default [ProjectsWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:256), default config includes key [projects/index.ts](E:/Cella/Projects/arcagate/src/lib/widgets/projects/index.ts:23).\
test: dedicated D4 opener-behavior e2e (exists: no)

[D5] ✅ verified\
evidence: scanner accepts variable `extensions` and clamps depth [exe_scanner_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/exe_scanner_service.rs:79), [exe_scanner_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/exe_scanner_service.rs:82); settings exposes extensions/depth [ExeFolderSettings.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderSettings.svelte:119).\
test: `extensions_filter_blend_only`, `scan_depth_controls_recursion_depth` in `exe_scanner_service.rs` (exists: yes)

[D6] ✅ verified\
evidence: scanner iterates first-level dirs and pushes one entry per first-level folder [exe_scanner_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/exe_scanner_service.rs:22), candidate ordering is shallow-first then size tiebreak [exe_scanner_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/exe_scanner_service.rs:144).\
test: `shallower_file_wins_over_deeper_larger` ([exe_scanner_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/exe_scanner_service.rs:439), exists: yes), `same_depth_picks_largest` (exists: yes), `scan_depth_returns_first_level_only_no_duplicates` (exists: yes)

[D7] ✅ verified\
evidence: single default source sets disk gauge [system-monitor/index.ts](E:/Cella/Projects/arcagate/src/lib/widgets/system-monitor/index.ts:28), widget and settings both derive from `SYSTEM_MONITOR_DEFAULTS` ([SystemMonitorWidget.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/system-monitor/SystemMonitorWidget.svelte:27), [SystemMonitorSettings.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/system-monitor/SystemMonitorSettings.svelte:12)).\
test: `scripts/audit-widget-default-config.sh` (exists: yes)

[E1] ✅ verified\
evidence: drop position is converted and passed as `dropCell` instead of old fallback path in [\+page.svelte](E:/Cella/Projects/arcagate/src/routes/+page.svelte:186) and [\+page.svelte](E:/Cella/Projects/arcagate/src/routes/+page.svelte:203); pinning by drag-enter/leave in [\+page.svelte](E:/Cella/Projects/arcagate/src/routes/+page.svelte:324); seed resolution order in [widget-grid.ts](E:/Cella/Projects/arcagate/src/lib/utils/widget-grid.ts:153).\
test: `tests/e2e/workspace-dnd-placement.spec.ts::WD-1/2/3` (exists: yes), `src/lib/utils/widget-grid.test.ts::resolveSeedCell` (exists: yes)

[E3] ✅ verified\
evidence: tab-delete target enlarged to `h-7 w-7` and route moved to modal flow in [PageTabBar.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/workspace/PageTabBar.svelte:172) and [PageTabBar.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/workspace/PageTabBar.svelte:50).\
test: `tests/e2e/destructive-confirm.spec.ts::DC-2` (exists: yes)

[E4] ✅ verified\
evidence: not_found unhandled rejections are suppressed in error monitor [error-monitor.svelte.ts](E:/Cella/Projects/arcagate/src/lib/state/error-monitor.svelte.ts:64), and tab-delete no-error behavior is explicitly tested.\
test: `tests/e2e/workspace-dnd-placement.spec.ts::WD-5` (exists: yes)

[E5] ✅ verified\
evidence: backend workspace delete is transaction + two-reference-path aware [workspace_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:99), referenced-id collection [workspace_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:107); frontend refreshes item store after delete [workspace-config.svelte.ts](E:/Cella/Projects/arcagate/src/lib/state/workspace-config.svelte.ts:123).\
test: `test_delete_workspace_cascades_orphan_items`, `test_delete_workspace_cascades_widget_config_item_ids`, `test_delete_workspace_mixed_payload_no_orphans_or_dangling` (exist: yes), plus `WD-6` e2e (exists: yes)

[E6] ✅ verified\
evidence: tab delete modal includes opt-in checkbox and propagates `deleteItems` [WorkspaceDeleteConfirmDialog.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte:56), checkbox component contract [ConfirmDialog.svelte](E:/Cella/Projects/arcagate/src/lib/components/common/ConfirmDialog.svelte:96), backend call takes bool [PageTabBar.svelte](E:/Cella/Projects/arcagate/src/lib/components/arcagate/workspace/PageTabBar.svelte:92).\
test: `tests/e2e/destructive-confirm.spec.ts::DC-2` (exists: yes)

[F1] ✅ verified\
evidence: migration creates explicit six builtins and sort order [041_theme_six_builtins.sql](E:/Cella/Projects/arcagate/src-tauri/migrations/041_theme_six_builtins.sql:28), remaps `theme_mode='hud'` to dark [041_theme_six_builtins.sql](E:/Cella/Projects/arcagate/src-tauri/migrations/041_theme_six_builtins.sql:34), deletes HUD [041_theme_six_builtins.sql](E:/Cella/Projects/arcagate/src-tauri/migrations/041_theme_six_builtins.sql:37), repository orders by `sort_order` [theme_repository.rs](E:/Cella/Projects/arcagate/src-tauri/src/repositories/theme_repository.rs:38).\
test: `tests/e2e/ph-cf-800-theme-settings.spec.ts::TS-1/TS-2` (exists: yes), `theme_repository.rs::test_builtin_themes_sort_order` (exists: yes)

[F2] ✅ verified\
evidence: dark primary contrast adjustments in [arcagate-theme.css](E:/Cella/Projects/arcagate/src/lib/styles/arcagate-theme.css:217).\
test: `src/lib/utils/theme-contrast.test.ts::PH-CF-800 F2: builtin primary WCAG contrast` (exists: yes)

[F3] ✅ verified\
evidence: clone path strictly resolves selected source and clones current active mode [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:75), [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:114).\
test: `tests/e2e/ph-cf-800-theme-settings.spec.ts::TS-3` (exists: yes)

[F4] ✅ verified\
evidence: theme card actions are icon-only with tooltip/aria labels [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:257), [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:272).\
test: `tests/e2e/ph-cf-800-theme-settings.spec.ts::TS-4` (exists: yes)

[F5] ✅ verified\
evidence: actions merged to duplicate/download, old clipboard-copy behavior removed in [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:21) and [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:229).\
test: `tests/e2e/ph-cf-800-theme-settings.spec.ts::TS-4` checks clipboard untouched (exists: yes)

[F6] ✅ verified\
evidence: backend max custom themes and quota API [theme_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/theme_service.rs:17), [theme_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/theme_service.rs:597); UI quota display in [SettingsAppearancePane.svelte](E:/Cella/Projects/arcagate/src/lib/components/settings/SettingsAppearancePane.svelte:183).\
test: `tests/e2e/ph-cf-800-theme-settings.spec.ts::TS-5` (exists: yes), unit limit tests in `theme_service.rs` (exists: yes)

**Special: monitored-item reverse lifecycle** ✅ verified\
evidence: schema back-links added ([039_items_source_back_link.sql](E:/Cella/Projects/arcagate/src-tauri/migrations/039_items_source_back_link.sql:22)); `delete_item` records hide before delete ([item_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:180)); reconcile uses `(source_widget_id, source_entry_key)` and hide check ([item_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:414), [item_service.rs](E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:423)); restoration UI mounted in both settings ([ProjectsSettings.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsSettings.svelte:125), [ExeFolderSettings.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderSettings.svelte:201), shared section [WidgetExcludedItemsSection.svelte](E:/Cella/Projects/arcagate/src/lib/widgets/_shared/WidgetExcludedItemsSection.svelte:66)).\
test: `test_projects_auto_register_delete_no_resurrection`, `test_projects_auto_register_unhide_resurrects`, `test_back_link_both_columns_filled_on_auto_register`, `test_widget_delete_cascades_hides_and_sets_null_source` (exist: yes), plus `tests/e2e/widget-excluded-items-restore.spec.ts` (exists: yes)

**FINAL SUMMARY**\
✅ 26: B1, C1, C3, C4, C5, C6, C7, C8, D1, D2, D3, D4, D5, D6, D7, E1, E3, E4, E5, E6, F1, F2, F3, F4, F5, F6\
⚠️ 2: A1, C2\
❌ 0: none
