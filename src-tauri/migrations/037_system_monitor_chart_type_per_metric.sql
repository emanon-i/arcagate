-- W-8 (2026-05-19): System Monitor widget の legacy 共通 chart_type を per-metric key へ展開する。
--
-- 経緯: 4/30 user 検収で chart_type を metric 別 (cpu / memory / disk / network) に分割したが、
-- 旧 config 互換のため frontend に `config.<metric>_chart_type ?? config.chart_type ?? default`
-- という 2 段 fallback が残っていた。 新 Settings UI は per-metric key しか書かないため、
-- 旧 `chart_type` を持つのは 4/30 以前に保存された widget config のみ。
--
-- 対策: 旧 `chart_type` を持つ system_monitor widget の config を一度だけ per-metric key へ移し
-- (既に per-metric key があればそちら優先)、 旧 `chart_type` key を除去する。 これにより
-- frontend の fallback コードを安全に削除できる (migration なしで fallback だけ消すと
-- 旧 config の widget が default に戻ってしまうため、 必ず本 migration とセット)。

UPDATE workspace_widgets
SET config = json_remove(
        json_set(
            config,
            '$.cpu_chart_type',
            COALESCE(json_extract(config, '$.cpu_chart_type'), json_extract(config, '$.chart_type')),
            '$.memory_chart_type',
            COALESCE(json_extract(config, '$.memory_chart_type'), json_extract(config, '$.chart_type')),
            '$.disk_chart_type',
            COALESCE(json_extract(config, '$.disk_chart_type'), json_extract(config, '$.chart_type')),
            '$.network_chart_type',
            COALESCE(json_extract(config, '$.network_chart_type'), json_extract(config, '$.chart_type'))
        ),
        '$.chart_type'
    )
WHERE widget_type = 'system_monitor'
  AND config IS NOT NULL
  AND json_valid(config)
  AND json_extract(config, '$.chart_type') IS NOT NULL;
