#!/usr/bin/env bash
# audit-widget-default-config.sh
#
# PH-CF-500 D7 機械検出: widget 本体 と settings dialog が `?? <リテラル>` で同 config key
# に対し 異なる default を指定していないか検証する (= 「設定デフォルト単一情報源契約」)。
#
# 真の bug pattern:
#   widget 本体     : let x = $derived(config.foo ?? 'A')
#   settings dialog : let x = $derived(config.foo ?? 'B')   ← 'B' != 'A' → 設定を開く前後で表示が変わる
#
# (= PH-CF-500 D7 root cause、 system-monitor の cpu/memory/disk chart_type が widget は
#    'bar' / settings は 'sparkline' で食い違っていた事例)
#
# 同 key に同 リテラルを書いている (重複だが値は一致) のは warning。
# const (識別子) を `?? FOO_DEFAULT` で参照しているのは OK (= 単一情報源を共有)。
#
# 検出範囲:
#   src/lib/widgets/<widget>/*.svelte (Widget / Settings) ペアごと
#
# Python helper を呼び出す (pair 比較のため正規表現だけでは困難)。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

PYTHONIOENCODING=utf-8 python - <<'PYEOF'
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path("src/lib/widgets")
# `(identifier) ?? <literal>` パターン。 リテラルは数値 / true / false / 'string' / "string"。
# 識別子や null / [] / {} / 関数呼び出しは含めない (= OK fallback)。
PAIR = re.compile(
    r"(?:config\.|cfg\.)?"          # optional config. prefix
    r"([A-Za-z_][A-Za-z_0-9]*)"     # key (group 1)
    r"\s*\?\?\s*"
    r"("                            # literal (group 2)
    r"-?\d+(?:\.\d+)?"
    r"|true|false"
    r"|'[^'\n]*'"
    r"|\"[^\"\n]*\""
    r")"
)

inconsistencies = []     # (key, widget_lit, settings_lit, widget_file, settings_file)
duplicate_literals = []  # (key, lit, widget_file, settings_file)  # 同値だが両方リテラル
ok_pairs = 0

for widget_dir in sorted(ROOT.iterdir()):
    if not widget_dir.is_dir() or widget_dir.name.startswith("_"):
        continue

    widget_file = None
    settings_file = None
    for entry in widget_dir.glob("*.svelte"):
        name = entry.name.lower()
        if "settings" in name:
            settings_file = entry
        elif "widget" in name:
            widget_file = entry

    if not widget_file or not settings_file:
        # 一方 missing は対象外 (設定 dialog を持たない widget もある)
        continue

    def collect(path):
        out = defaultdict(list)  # key -> [literal, ...]
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*"):
                continue
            for m in PAIR.finditer(line):
                key, lit = m.group(1), m.group(2)
                # 単純な type-narrowing fallback ('mtimeMs' ?? 0 等) は除外:
                # 「'?? 0' (数値 0)」 や 「'?? '''」 (空文字) のような中立 fallback は許容したいが、
                # 不一致検出には影響しない (両 file で同じ pattern なら一致扱い、 異なるなら fail)。
                out[key].append(lit)
        return out

    widget_pairs = collect(widget_file)
    settings_pairs = collect(settings_file)

    common_keys = set(widget_pairs.keys()) & set(settings_pairs.keys())
    for key in common_keys:
        w_lits = set(widget_pairs[key])
        s_lits = set(settings_pairs[key])
        if not w_lits.intersection(s_lits) or w_lits != s_lits:
            inconsistencies.append((widget_dir.name, key, sorted(w_lits), sorted(s_lits), widget_file, settings_file))
        else:
            # 同 リテラル両 file = 単一情報源契約違反 (warning)、 const 化推奨。
            for lit in w_lits:
                duplicate_literals.append((widget_dir.name, key, lit, widget_file, settings_file))
            ok_pairs += 1

if inconsistencies:
    print("ERROR: widget body と settings dialog で同 config key に対して異なる default リテラルが指定されています")
    print("       (PH-CF-500 D7 真因の bug pattern。 widget / settings 双方が index.ts の")
    print("        single source <NAME>_DEFAULTS を import し参照すること)")
    print()
    for widget_name, key, w_lits, s_lits, wf, sf in inconsistencies:
        print(f"  [{widget_name}] key='{key}'")
        print(f"    widget   ({wf}): default = {', '.join(w_lits)}")
        print(f"    settings ({sf}): default = {', '.join(s_lits)}")
        print()
    print(f"audit-widget-default-config: FAIL ({len(inconsistencies)} mismatches)")
    sys.exit(1)

if duplicate_literals:
    print(f"WARN: widget body と settings dialog で同 リテラル defaults が両方 hard-coded されています ({len(duplicate_literals)} 件)。")
    print("      不一致は無いものの、 PH-CF-500 「設定デフォルト単一情報源契約」 に従い")
    print("      index.ts の defaultConfig export を import して参照することが推奨されます。")
    print("      (将来の片側変更で D7 と同型の bug が再発するため)")
    print()
    for widget_name, key, lit, wf, sf in duplicate_literals[:20]:
        print(f"  [{widget_name}] {key} ?? {lit}")
    if len(duplicate_literals) > 20:
        print(f"  ... and {len(duplicate_literals) - 20} more")
    print()

print(f"audit-widget-default-config: OK (no mismatched defaults; {ok_pairs} key(s) consistent)")
sys.exit(0)
PYEOF
