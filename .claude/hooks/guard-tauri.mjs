#!/usr/bin/env node
// PreToolUse guard (Bash): AI のうっかりを機械的にブロックする。
// 1. ローカル `tauri build`（release ビルド）禁止 → リリースは CI から (RELEASE.md)
// 2. 素の `tauri dev` 禁止 → 本番 identity=本番データを使うため。隔離は `pnpm app:dev`
//
// exit 2 + stderr = ブロック (理由が Claude に返る)。それ以外は exit 0 で素通し。
// 人間の手元ターミナルには影響せず、Claude Code の Bash tool だけを制約する。

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let cmd = "";
  try {
    cmd = (JSON.parse(input).tool_input || {}).command || "";
  } catch {
    process.exit(0); // パース不能なら素通し
  }

  // コマンド「実行位置」の tauri build/dev のみを対象にする (行頭 / シェル演算子 / env 前置き /
  // pnpm・npx 等の runner の直後)。 commit message や echo / grep 内の「言及」は誤検知しないよう、
  // backtick やクォート内に出てくる "tauri build" 等はマッチさせない。
  const at = "(?:^|[\\n;&|(])\\s*(?:\\w+=\\S*\\s+)*(?:(?:pnpm|npx|yarn|bun|bunx)\\s+(?:run\\s+)?)?";
  const invokesBuild = new RegExp(at + "tauri\\s+build\\b");
  const invokesDev = new RegExp(at + "tauri\\s+dev\\b");

  if (invokesBuild.test(cmd)) {
    process.stderr.write(
      "ローカルでの `tauri build`（release ビルド）は禁止です。" +
        "リリースは CI から行います（tag push か `gh workflow run release.yml`）。手順は RELEASE.md を参照。\n",
    );
    process.exit(2);
  }

  if (invokesDev.test(cmd) && !/tauri\.dev\.conf\.json/.test(cmd)) {
    process.stderr.write(
      "素の `tauri dev` は本番 identity（= 本番データ %APPDATA%\\com.arcagate.desktop\\）を使うため禁止です。" +
        "隔離 dev は `pnpm app:dev` を使ってください。\n",
    );
    process.exit(2);
  }

  process.exit(0);
});
