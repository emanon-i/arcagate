import React from "react";
import {
  Search,
  FolderKanban,
  Gamepad2,
  TerminalSquare,
  Globe,
  LayoutDashboard,
  GitBranch,
  Clock3,
  Sparkles,
  Shield,
  EyeOff,
  Settings2,
  Play,
  FolderOpen,
  ExternalLink,
  Palette,
  Zap,
  Star,
  ChevronRight,
  Lock,
  Cpu,
  Plus,
  Archive,
  MoreHorizontal,
  AppWindow,
  PanelLeft,
  Command,
  Pin,
  ArrowRightLeft,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

type Tone = "default" | "accent" | "warm" | "success";

type PaletteResult = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  meta: string;
  accent: string;
};

type LibraryItem = {
  title: string;
  source: string;
  type: string;
  usage: string;
  last: string;
  badge: string;
  art: string;
};

type LabeledValue = [string, string];

type ChipProps = {
  children: React.ReactNode;
  tone?: Tone;
};

type SectionLabelProps = {
  eyebrow: string;
  title: string;
  desc: string;
};

type TitleTabProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
};

type TitleActionProps = {
  icon: LucideIcon;
  label: string;
  tone?: Exclude<Tone, "success">;
};

type WindowFrameProps = {
  title: string;
  subtitle?: string;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
};

type SidebarRowProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  meta?: string;
};

type LibraryCardProps = {
  item: LibraryItem;
};

type WidgetProps = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  badge?: string;
  source?: string;
};

type TipProps = {
  children: React.ReactNode;
  tone?: "default" | "accent" | "success";
};

const paletteResults: PaletteResult[] = [
  {
    icon: TerminalSquare,
    title: "Claude Code",
    subtitle: "Script · PowerShell",
    meta: "alias: cla",
    accent: "from-cyan-500/30 to-sky-500/20",
  },
  {
    icon: Cpu,
    title: "Blender 4.2",
    subtitle: "Dev Tool · Local EXE",
    meta: "recently used",
    accent: "from-violet-500/30 to-fuchsia-500/20",
  },
  {
    icon: Gamepad2,
    title: "Elden Ring",
    subtitle: "Steam · Game",
    meta: "frequent",
    accent: "from-orange-500/30 to-amber-500/20",
  },
  {
    icon: LayoutDashboard,
    title: "Open Workspace: Game Dev",
    subtitle: "Workspace",
    meta: "Ctrl+1",
    accent: "from-emerald-500/30 to-teal-500/20",
  },
  {
    icon: Sparkles,
    title: "calc 1920 / 120",
    subtitle: "Built-in Command",
    meta: "= 16",
    accent: "from-pink-500/30 to-rose-500/20",
  },
];

const libraryItems: LibraryItem[] = [
  {
    title: "Blender 4.2",
    source: "Local",
    type: "Dev Tool",
    usage: "起動 128回",
    last: "2時間前",
    badge: "Tracked",
    art: "from-violet-600 via-fuchsia-600 to-indigo-700",
  },
  {
    title: "Claude Code",
    source: "PowerShell",
    type: "Script",
    usage: "起動 94回",
    last: "昨日",
    badge: "Alias",
    art: "from-cyan-500 via-sky-500 to-blue-700",
  },
  {
    title: "Elden Ring",
    source: "Steam",
    type: "Game",
    usage: "起動 57回",
    last: "3日前",
    badge: "Hidden",
    art: "from-orange-500 via-amber-500 to-red-700",
  },
  {
    title: "Docs / Arcagate",
    source: "URL",
    type: "Link",
    usage: "起動 41回",
    last: "1時間前",
    badge: "Pinned",
    art: "from-emerald-500 via-teal-500 to-cyan-700",
  },
  {
    title: "Blender 3.6",
    source: "Local",
    type: "Dev Tool",
    usage: "起動 22回",
    last: "先週",
    badge: "Versioned",
    art: "from-slate-600 via-slate-500 to-zinc-700",
  },
  {
    title: "AI Notes Sync",
    source: "Python",
    type: "Script",
    usage: "起動 12回",
    last: "先週",
    badge: "Pinned",
    art: "from-pink-500 via-rose-500 to-fuchsia-700",
  },
];

const favorites: string[] = [
  "Claude Code",
  "Blender 4.2",
  "Steam",
  "Arcagate Docs",
  "Obsidian Vault",
];

const recent: LabeledValue[] = [
  ["Claude Code", "3分前"],
  ["Arcagate Docs", "25分前"],
  ["Blender 4.2", "2時間前"],
  ["PowerShell: clean build", "昨日"],
];

const projectShortcuts: LabeledValue[] = [
  ["Arcagate", "main · clean"],
  ["VoiceReins", "feat/mcp · 2 changes"],
  ["Synfragia", "docs · ahead 1"],
];

const selectedItemDetails: LabeledValue[] = [
  ["種別", "Executable"],
  ["ソース", String.raw`Local / D:\Apps\Blender42\blender.exe`],
  ["別名", "bl42, blender new"],
  ["最終起動", "2026-03-03 09:12"],
  ["起動回数", "128"],
  ["追跡", "ON（フォルダ移動時も追従）"],
];

const watchFolders: LabeledValue[] = [
  [String.raw`D:\Games`, "新規EXEを検出したら候補化"],
  [String.raw`D:\DevTools`, "バージョン違いを自動グループ化"],
  [String.raw`D:\Scripts`, "ps1 / bat 更新を追跡"],
  ["Downloads", "登録候補を一時トレイへ"],
];

const quickActions: string[] = [
  "Open palette",
  "Import DB",
  "Export DB",
  "Theme edit",
  "Snippet",
  "Calculator",
];

const mockSanityChecks = {
  paletteCount: paletteResults.length >= 5,
  libraryCount: libraryItems.length >= 6,
  favoriteCount: favorites.length >= 4,
  recentCount: recent.length >= 4,
  watchFolderCount: watchFolders.length >= 4,
  noDuplicateLibraryTitles: new Set(libraryItems.map((item) => item.title)).size === libraryItems.length,
};

function Chip({ children, tone = "default" }: ChipProps) {
  const tones: Record<Tone, string> = {
    default: "border-white/10 bg-white/5 text-white/70",
    accent: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    warm: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  };

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>{children}</span>;
}

function SectionLabel({ eyebrow, title, desc }: SectionLabelProps) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{eyebrow}</div>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">{desc}</p>
    </div>
  );
}

function Tip({ children, tone = "default" }: TipProps) {
  const tones: Record<NonNullable<TipProps["tone"]>, string> = {
    default: "border-white/10 bg-white/[0.03] text-white/70",
    accent: "border-cyan-400/15 bg-cyan-400/8 text-cyan-50/90",
    success: "border-emerald-400/18 bg-emerald-400/8 text-emerald-50/90",
  };

  return (
    <div data-kind="tip" className={`relative rounded-[22px] border px-4 py-3 text-sm ${tones[tone]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-1.5">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 leading-6">{children}</div>
        <button
          type="button"
          aria-label="閉じる"
          className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-white/60 hover:bg-white/[0.07]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TitleTab({ icon: Icon, label, active = false }: TitleTabProps) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition ${
        active
          ? "border-cyan-400/25 bg-cyan-400/12 text-white"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function TitleAction({ icon: Icon, label, tone = "default" }: TitleActionProps) {
  const tones: Record<Exclude<Tone, "success">, string> = {
    default: "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]",
    accent: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    warm: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  };

  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function WindowFrame({
  title,
  subtitle,
  centerContent,
  rightContent,
  children,
  width = "w-full",
}: WindowFrameProps) {
  return (
    <div
      className={`${width} overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]`}
    >
      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 bg-white/5 px-5">
        <div className="min-w-0 truncate text-sm font-semibold text-white">
          {title}
          {subtitle ? <span className="ml-2 text-xs font-normal text-white/40">— {subtitle}</span> : null}
        </div>
        <div className="justify-self-center">{centerContent}</div>
        <div className="flex items-center gap-2 justify-self-end">{rightContent}</div>
      </div>
      {children}
    </div>
  );
}

function SidebarRow({ icon: Icon, label, active = false, meta }: SidebarRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm ${
        active ? "bg-cyan-400/12 text-white ring-1 ring-cyan-400/25" : "text-white/65 hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {meta ? <span className="text-xs text-white/35">{meta}</span> : null}
    </div>
  );
}

function LibraryCard({ item }: LibraryCardProps) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04]">
      <div className={`relative h-28 bg-gradient-to-br ${item.art}`}>
        <button
          type="button"
          aria-label={`${item.title} のメニュー`}
          className="absolute right-3 top-3 rounded-xl border border-white/15 bg-black/20 p-1.5 text-white/70"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{item.title}</div>
            <div className="mt-1 text-xs text-white/50">
              {item.source} · {item.type}
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/65">
            {item.badge}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/45">
          <span>{item.usage}</span>
          <span>{item.last}</span>
        </div>
      </div>
    </div>
  );
}

function Widget({ title, icon: Icon, children, badge, source }: WidgetProps) {
  return (
    <div className="relative rounded-[24px] border border-white/10 bg-white/[0.04] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <button
        type="button"
        aria-label={`${title} の設定メニュー`}
        className="absolute right-3 top-3 rounded-xl border border-white/10 bg-white/[0.05] p-1.5 text-white/55 hover:bg-white/[0.08]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <Icon className="h-4 w-4 text-white/70" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{title}</div>
            {source ? <div className="text-[11px] text-white/35">{source}</div> : null}
          </div>
        </div>
        {badge ? <span className="text-xs text-white/40">{badge}</span> : null}
      </div>
      {children}
    </div>
  );
}

export default function ArcagateMockupBoard() {
  const allChecksPassed = Object.values(mockSanityChecks).every(Boolean);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(41,98,255,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(16,185,129,0.12),_transparent_24%),#090b10] text-white">
      <div className="mx-auto max-w-[1500px] px-8 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip tone="accent">Arcagate mockups</Chip>
              <Chip>Windows-first</Chip>
              <Chip>Keyboard-centric</Chip>
              <Chip tone="success">Tauri + Svelte 想定</Chip>
              <Chip tone={allChecksPassed ? "success" : "warm"}>mock data OK</Chip>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Arcagate 主要画面モックアップ</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/60">
              コアはコマンドパレット、Library は登録済みアイテムの正本、Workspace はそれを用途別に束ねたビューという役割分担で再構成。
              同一アプリシェル内で切り替わる前提にし、Library と Workspace を分断しない設計に寄せています。
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/55">
            <div className="font-medium text-white/80">画面の役割</div>
            <div className="mt-1">
              Palette = デスクトップオーバーレイ起動面 / Library = 登録管理 / Workspace = 日常運用のホーム
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <SectionLabel
              eyebrow="Mock 01"
              title="コマンドパレット検索・起動"
              desc="最頻出フローである『ホットキー → 名前入力 → Enter』を最短に寄せたオーバーレイ。アプリの通常ウィンドウとは別で、デスクトップ上に軽く重なる即時起動面として扱う。"
            />
            <div className="relative mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-[#0b0f16]/92 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%)]" />
              <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-white/45">
                  <Command className="h-4 w-4" />
                  <span>Desktop Overlay Palette</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone="accent">Alt + Space</Chip>
                  <Chip tone="warm">hidden off</Chip>
                </div>
              </div>
              <div className="relative overflow-hidden bg-[linear-gradient(180deg,#0a0d13_0%,#0e1320_100%)] p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.10),_transparent_28%)]" />
                <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-[#0b0f16]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
                    <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/6 px-4 py-3">
                      <Search className="h-5 w-5 text-cyan-200" />
                      <div className="text-base text-white/95">cla</div>
                    </div>
                    <Chip tone="accent">Arcagate 全体を検索</Chip>
                    <Chip>wk:game-dev</Chip>
                    <Chip tone="warm">hidden off</Chip>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                    <div className="space-y-2">
                      {paletteResults.map((item, index) => {
                        const Icon = item.icon;
                        const active = index === 0;
                        return (
                          <div
                            key={item.title}
                            className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 transition ${
                              active
                                ? "border-cyan-400/25 bg-cyan-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                : "border-white/8 bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} ring-1 ring-white/10`}>
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                                <div className="truncate text-xs text-white/50">{item.subtitle}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-white/45">{item.meta}</div>
                              {active ? <div className="mt-1 text-[11px] text-cyan-200">Enter で起動</div> : null}
                            </div>
                          </div>
                        );
                      })}

                      <div className="grid grid-cols-3 gap-2 pt-3 text-xs text-white/45">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">:dev で開発ツールのみ</div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">= で電卓</div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">&gt; で内蔵コマンド</div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-white/35">Quick context</div>
                        <div className="mt-2 text-sm font-medium text-white">Claude Code</div>
                        <div className="mt-1 text-sm leading-6 text-white/55">
                          PowerShell 経由で起動。作業ディレクトリと profile をプリセット化できます。
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-white/60">
                        <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2">
                          <span>カテゴリ</span>
                          <span className="text-white/85">Scripts</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2">
                          <span>別名</span>
                          <span className="text-white/85">cla / code</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2">
                          <span>最終起動</span>
                          <span className="text-white/85">3分前</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2">
                          <span>起動回数</span>
                          <span className="text-white/85">94</span>
                        </div>
                      </div>
                      <Tip tone="success">ショートカットや別名を登録すると、数文字で目的のアプリに到達できます。</Tip>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/40">
                    <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">↑ ↓ 移動</span>
                    <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">Tab 詳細</span>
                    <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">Ctrl+H 非表示アイテム表示</span>
                    <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">Ctrl+K アクション</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionLabel
              eyebrow="Mock 02"
              title="統合ライブラリ・アイテム管理"
              desc="Library は『登録済みアイテムの正本』。タグ・別名・起動ログ・パス追跡・センシティブ設定をここで管理し、Workspace にはここから参照を貼る。"
            />
            <WindowFrame
              title="Library & Item Registry"
              subtitle="Source of truth for all registered items"
              centerContent={
                <div className="flex items-center gap-2">
                  <TitleTab icon={Archive} label="Library" active />
                  <TitleTab icon={LayoutDashboard} label="Workspace" />
                  <TitleTab icon={Command} label="Palette" />
                </div>
              }
              rightContent={
                <>
                  <TitleAction icon={PanelLeft} label="Sidebar" />
                  <TitleAction icon={EyeOff} label="Hidden off" tone="warm" />
                  <TitleAction icon={Settings2} label="Settings" />
                </>
              }
            >
              <div className="grid min-h-[760px] grid-cols-[250px_minmax(0,1fr)_340px] bg-[#0b0f16]">
                <aside className="border-r border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 font-semibold text-white">
                      A
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Items</div>
                      <div className="text-xs text-white/45">Registry</div>
                    </div>
                  </div>

                  <Tip tone="accent">ここでアイテムを登録・整理します。Workspace にはよく使うものを配置できます。</Tip>

                  <div className="mt-4 space-y-1.5">
                    <SidebarRow icon={Archive} label="すべて" active meta="248" />
                    <SidebarRow icon={Gamepad2} label="ゲーム" meta="86" />
                    <SidebarRow icon={FolderKanban} label="開発ツール" meta="52" />
                    <SidebarRow icon={TerminalSquare} label="スクリプト" meta="39" />
                    <SidebarRow icon={Globe} label="URL / Web" meta="28" />
                    <SidebarRow icon={FolderOpen} label="フォルダ" meta="21" />
                    <SidebarRow icon={EyeOff} label="デフォルト非表示" meta="22" />
                  </div>

                  <div className="mt-6 rounded-[24px] border border-dashed border-white/15 bg-white/[0.02] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                      <Plus className="h-4 w-4" />
                      クイック登録
                    </div>
                    <p className="text-xs leading-5 text-white/50">
                      exe / url / folder / ps1 をドラッグ&amp;ドロップで登録。アイコン取得・初期カテゴリ推定・別名候補を自動入力。
                    </p>
                  </div>
                </aside>

                <main className="p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-[340px] flex-1 items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3">
                      <Search className="h-5 w-5 text-white/45" />
                      <span className="text-sm text-white/55">ライブラリを検索</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Chip>最近使った順</Chip>
                      <Chip>起動回数順</Chip>
                      <Chip>カテゴリ</Chip>
                      <Chip tone="accent">タグ</Chip>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-4 gap-3">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-white/40">総アイテム</div>
                      <div className="mt-2 text-2xl font-semibold text-white">248</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-white/40">今週の起動</div>
                      <div className="mt-2 text-2xl font-semibold text-white">61</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-white/40">追跡中パス</div>
                      <div className="mt-2 text-2xl font-semibold text-white">94</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-white/40">よく使う</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Top 10</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {libraryItems.map((item) => (
                      <LibraryCard key={item.title} item={item} />
                    ))}
                  </div>
                </main>

                <aside className="border-l border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">Selected item</div>
                      <div className="mt-1 text-lg font-semibold text-white">Blender 4.2</div>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">
                      Versioned
                    </span>
                  </div>

                  <div className="h-40 rounded-[24px] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-800" />

                  <div className="mt-4 space-y-2 text-sm">
                    {selectedItemDetails.map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-4 rounded-2xl bg-white/[0.04] px-3 py-2.5">
                        <span className="text-white/45">{k}</span>
                        <span className="max-w-[190px] text-right text-white/80">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      [Play, "起動"],
                      [Pin, "Workspaceに追加"],
                      [Settings2, "編集"],
                      [ExternalLink, "関連URL"],
                    ].map(([Icon, label]) => {
                      const ActionIcon = Icon as LucideIcon;
                      return (
                        <button
                          key={label}
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/80 hover:bg-white/[0.07]"
                        >
                          <ActionIcon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <Tip>Workspace に追加しても複製は作られません。編集は Library 側で行います。</Tip>
                  </div>

                  <div className="mt-4 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Shield className="h-4 w-4" />
                      センシティブ制御
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-white/60">
                      <span>デフォルト非表示</span>
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
                        ON
                      </span>
                    </div>
                    <div className="text-xs leading-5 text-white/45">
                      ホットキーまたはパスワード入力で一時表示。配信・画面共有時の事故防止を優先。
                    </div>
                  </div>
                </aside>
              </div>
            </WindowFrame>
          </section>

          <section>
            <SectionLabel
              eyebrow="Mock 03"
              title="ワークスペース・ダッシュボード"
              desc="Workspace は『日常運用のホーム』。Library のアイテムを用途別に束ね、ページ・ウィジェット・テーマで素早くアクセスする。管理機能の重心は Library に残したまま、ホーム画面としての快適さを優先。"
            />
            <WindowFrame
              title="Workspace Dashboard"
              subtitle="Curated views built from Library items"
              centerContent={
                <div className="flex items-center gap-2">
                  <TitleTab icon={Archive} label="Library" />
                  <TitleTab icon={LayoutDashboard} label="Workspace" active />
                  <TitleTab icon={Command} label="Palette" />
                </div>
              }
              rightContent={
                <>
                  <TitleAction icon={AppWindow} label="Open palette" tone="accent" />
                  <TitleAction icon={EyeOff} label="Safe mode" tone="warm" />
                  <TitleAction icon={Settings2} label="Page settings" />
                </>
              }
            >
              <div className="min-h-[780px] bg-[linear-gradient(180deg,#0b0f16_0%,#0d1320_100%)] p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="accent">Today</Chip>
                    <Chip>Game Dev</Chip>
                    <Chip>Writing</Chip>
                    <Chip>AI Ops</Chip>
                    <button
                      type="button"
                      className="rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-white/45"
                    >
                      + Add page
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip tone="accent">Dark</Chip>
                    <Chip>Light</Chip>
                    <Chip>Theme settings</Chip>
                  </div>
                </div>

                <div className="mb-4">
                  <Tip tone="accent">このページはホームです。よく使うものをまとめて配置できます。</Tip>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-3">
                    <Widget title="Favorites" icon={Star} badge="Pinned 5" source="Linked from Library">
                      <div className="space-y-2">
                        {favorites.map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5 text-sm text-white/75"
                          >
                            <span>{item}</span>
                            <ChevronRight className="h-4 w-4 text-white/35" />
                          </div>
                        ))}
                      </div>
                    </Widget>

                    <Widget title="Visibility" icon={Lock} badge="Privacy" source="Workspace-only controls">
                      <div className="space-y-3 text-sm text-white/65">
                        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
                          <span>非表示アイテム</span>
                          <span className="text-amber-200">22 件</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
                          <span>一時表示</span>
                          <span className="text-emerald-200">OFF</span>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-white/45">
                          ストリーミング・会議前にまとめて隠せる導線を明示。
                        </div>
                      </div>
                    </Widget>
                  </div>

                  <div className="space-y-4 lg:col-span-6">
                    <Widget title="Recent launches" icon={Clock3} badge="This morning" source="Usage log from Library">
                      <div className="space-y-2">
                        {recent.map(([label, time]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-3 text-sm"
                          >
                            <div className="flex items-center gap-3 text-white/80">
                              <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                              <span>{label}</span>
                            </div>
                            <span className="text-white/40">{time}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          Open in Library
                        </button>
                      </div>
                    </Widget>

                    <Widget title="Projects & Git status" icon={GitBranch} badge="3 repos" source="Project shortcuts">
                      <div className="grid gap-3 md:grid-cols-3">
                        {projectShortcuts.map(([name, status]) => (
                          <div key={name} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-sm font-semibold text-white">{name}</div>
                              <FolderKanban className="h-4 w-4 text-white/35" />
                            </div>
                            <div className="text-xs text-white/45">{status}</div>
                            <div className="mt-4 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-white/65">
                              Open workspace
                            </div>
                          </div>
                        ))}
                      </div>
                    </Widget>

                    <Widget title="Watch folders" icon={FolderOpen} badge="Auto tracked" source="Feeds Library auto-registration">
                      <div className="grid gap-3 md:grid-cols-2">
                        {watchFolders.map(([path, desc]) => (
                          <div key={path} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                            <div className="text-sm font-medium text-white">{path}</div>
                            <div className="mt-2 text-xs leading-5 text-white/45">{desc}</div>
                          </div>
                        ))}
                      </div>
                    </Widget>
                  </div>

                  <div className="space-y-4 lg:col-span-3">
                    <Widget title="Quick actions" icon={Zap} badge="Keyboard" source="Global actions">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {quickActions.map((action) => (
                          <div key={action} className="rounded-2xl bg-white/[0.04] px-3 py-3 text-center text-white/70">
                            {action}
                          </div>
                        ))}
                      </div>
                    </Widget>

                    <Widget title="Theme controls" icon={Palette} badge="Light / Dark" source="Workspace appearance">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[22px] border border-cyan-400/20 bg-cyan-400/10 p-3">
                            <div className="text-sm font-medium text-white">Dark theme</div>
                            <div className="mt-1 text-xs leading-5 text-white/50">
                              日常利用の既定テーマ。内部でアクセント色・角丸・密度を調整可能。
                            </div>
                          </div>
                          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                            <div className="text-sm font-medium text-white">Light theme</div>
                            <div className="mt-1 text-xs leading-5 text-white/50">
                              画面共有や昼間利用向け。こちらも内部設定だけ個別に調整可能。
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-white/65">
                          表には Light / Dark だけを出し、色味やシェイプはテーマ設定画面の中で編集する想定。
                        </div>
                      </div>
                    </Widget>
                  </div>
                </div>
              </div>
            </WindowFrame>
          </section>
        </div>
      </div>
    </div>
  );
}
