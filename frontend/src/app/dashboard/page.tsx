"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import {
  LogOut, Type, Loader2, PlayCircle, Download, FileImage,
  Trash2, CheckSquare, Square, Shield, CreditCard, Wand2,
  Clock, Film, Sparkles, Search, X, ChevronDown, ChevronUp,
  Copy, Check, Zap, Settings, History, PenLine, BarChart3,
  SlidersHorizontal, RefreshCw, Star, Video, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAN_QUOTA: Record<string, number> = {
  Starter: 1,
  Creator: 30,
  Agency: Infinity,
};

const API = "http://localhost:5000";

const SCRIPT_PRESETS = [
  {
    label: "🚀 Tech Product Launch",
    value:
      "Introducing the future of productivity. One app. Infinite possibilities. Smarter workflows. Faster decisions. Your team — supercharged.",
  },
  {
    label: "🎵 Music Drop Hype",
    value:
      "New era. New sound. New chapter. The beat drops tonight. Are you ready? This is the moment you've been waiting for.",
  },
  {
    label: "💪 Motivational Reel",
    value:
      "Wake up. Show up. Level up. Every day is a new chance to be better than yesterday. No excuses. Just results.",
  },
  {
    label: "🛍️ Product Showcase",
    value:
      "Crafted with precision. Designed for life. Premium quality meets everyday simplicity. Experience the difference — from day one.",
  },
  {
    label: "🌍 Brand Story",
    value:
      "We started with a simple question: why settle? Three years and a million stories later — we're just getting started.",
  },
];

const BACKGROUNDS = [
  { value: "gradient",       label: "Gradient",       preview: "bg-gradient-to-br from-purple-900 via-blue-900 to-black" },
  { value: "radial",         label: "Radial",         preview: "bg-[radial-gradient(ellipse_at_center,_#1a0533_0%,_#000_70%)]" },
  { value: "particles",      label: "Particles",      preview: "bg-gradient-to-b from-gray-900 to-black" },
  { value: "solid",          label: "Solid",          preview: "bg-gray-950" },
  { value: "aurora",         label: "Aurora",         preview: "bg-gradient-to-b from-teal-900 via-blue-900 to-indigo-950" },
  { value: "geometric",      label: "Geometric",      preview: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" },
  { value: "bokeh",          label: "Bokeh",          preview: "bg-gradient-to-br from-purple-950 via-blue-950 to-black" },
  { value: "cinematic_bars", label: "Cinematic",      preview: "bg-gradient-to-b from-zinc-900 to-black" },
  { value: "glitch_lines",   label: "Glitch",         preview: "bg-gradient-to-br from-green-950 to-black" },
];

const STYLES = [
  { value: "minimal",     label: "Minimal Dark",  icon: "⬛" },
  { value: "neon",        label: "Neon Glow",     icon: "🟣" },
  { value: "cinematic",   label: "Cinematic",     icon: "🎬" },
  { value: "retro",       label: "Retro Warm",    icon: "🔥" },
  { value: "pop",         label: "Pop Bright",    icon: "🎨" },
  { value: "dark_luxury", label: "Dark Luxury",   icon: "✨" },
  { value: "vibrant",     label: "Vibrant",       icon: "🌈" },
];

const ANIMATIONS = [
  { value: "karaoke",          label: "Karaoke",         desc: "Word-by-word highlight" },
  { value: "typewriter",       label: "Typewriter",      desc: "Letter-by-letter reveal" },
  { value: "bounce",           label: "Bounce",          desc: "Elastic text bounce" },
  { value: "zoom_in",          label: "Zoom In",         desc: "Cinematic zoom" },
  { value: "slide_up",         label: "Slide Up",        desc: "Bottom entry motion" },
  { value: "shake",            label: "Shake",           desc: "Vibration energy" },
  { value: "glow",             label: "Glow",            desc: "Neon glow pulse" },
  { value: "wave",             label: "Wave",            desc: "Sine-wave ripple" },
  { value: "fade_in",          label: "Fade In",         desc: "Smooth opacity" },
  { value: "scale_pulse",      label: "Pulse",           desc: "Breathing scale" },
  { value: "pop_up",           label: "Pop Up",          desc: "CapCut overshoot pop" },
  { value: "flip_in",          label: "Flip In",         desc: "Vertical flip entrance" },
  { value: "glitch",           label: "Glitch",          desc: "Chromatic aberration" },
  { value: "spotlight",        label: "Spotlight",       desc: "Dark stage spotlight" },
  { value: "color_pop",        label: "Color Pop",       desc: "Grey→color on active" },
  { value: "word_by_word_rise",label: "Rise",            desc: "Words rise in sequence" },
];

const TRANSITIONS = [
  { value: "crossfade",   label: "Crossfade",   desc: "Smooth dissolve" },
  { value: "fade",        label: "Hard Cut",    desc: "Instant cut" },
  { value: "slide_right", label: "Slide Right", desc: "Wipe rightward" },
  { value: "slide_left",  label: "Slide Left",  desc: "Wipe leftward" },
  { value: "none",        label: "None",        desc: "No transition" },
];

const FONT_STYLES = [
  { value: "bold",      label: "Bold",      preview: "font-bold",    sample: "Aa" },
  { value: "italic",    label: "Italic",    preview: "italic",       sample: "Aa" },
  { value: "impact",    label: "Impact",    preview: "font-black tracking-tight", sample: "Aa" },
  { value: "script",    label: "Script",    preview: "italic font-light",         sample: "Aa" },
  { value: "condensed", label: "Condensed", preview: "font-bold tracking-tighter",sample: "Aa" },
  { value: "rounded",   label: "Rounded",   preview: "font-medium",  sample: "Aa" },
  { value: "outline",   label: "Outline",   preview: "font-bold",    sample: "Aa" },
];

type TabId = "generate" | "history" | "settings";
type Status = "idle" | "generating" | "rendering" | "completed" | "error";

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<TabId>("generate");

  // ── Form state ──
  const [script, setScript] = useState("");
  const [style, setStyle] = useState("minimal");
  const [videoSize, setVideoSize] = useState("9:16");
  const [duration, setDuration] = useState("none");
  const [transitions, setTransitions] = useState("crossfade");
  const [animation, setAnimation] = useState("karaoke");
  const [background, setBackground] = useState("gradient");
  const [fps, setFps] = useState("24");
  const [fontsize, setFontsize] = useState(80);
  const [fontStyle, setFontStyle] = useState("bold");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Generation state ──
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // ── History ──
  const [history, setHistory] = useState<any[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "failed" | "processing">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── User & plan ──
  const [user, setUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [videosGenerated, setVideosGenerated] = useState(0);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (!userCookie) { router.push("/login"); return; }
    try {
      const parsed = JSON.parse(userCookie);
      setUser(parsed);
      if (parsed.role !== "admin") {
        const plan = parsed.plan || null;
        setUserPlan(plan);
        if (plan) fetchUserPlan(parsed.id || parsed._id, plan);
        else { router.push("/payment"); return; }
      }
    } catch { router.push("/login"); }
    fetchHistory();
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, []);

  // ── API helpers ───────────────────────────────────────────────────────────────
  const fetchUserPlan = async (userId: string, plan: string) => {
    try {
      const res = await axios.get(`${API}/api/user/${userId}/plan`);
      const { videos_generated, quota } = res.data;
      setVideosGenerated(videos_generated);
      const planQuota = PLAN_QUOTA[plan] ?? quota;
      if (videos_generated >= planQuota) setQuotaBlocked(true);
    } catch {}
  };

  const fetchHistory = useCallback(async () => {
    try {
      const userCookie = Cookies.get("user");
      const parsed = userCookie ? JSON.parse(userCookie) : null;
      const userId = parsed?.id || parsed?._id;
      const url = userId ? `${API}/api/video?userId=${userId}` : `${API}/api/video`;
      const res = await axios.get(url);
      setHistory(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const pollVideoStatus = (id: string) => {
    pollInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/api/video/${id}`);
        if (res.data.status === "completed") {
          clearInterval(pollInterval.current!);
          setStatus("completed");
          setProgress(100);
          setVideoUrl(`${API}${res.data.videoUrl}`);
          setLoading(false);
          fetchHistory();
          const newCount = videosGenerated + 1;
          setVideosGenerated(newCount);
          if (userPlan && newCount >= (PLAN_QUOTA[userPlan] ?? Infinity)) setQuotaBlocked(true);
        } else if (res.data.status === "failed") {
          clearInterval(pollInterval.current!);
          setStatus("error");
          setLoading(false);
        } else if (res.data.status === "processing") {
          setProgress(res.data.progress || 0);
        }
      } catch {
        clearInterval(pollInterval.current!);
        setStatus("error");
        setLoading(false);
      }
    }, 2000);
  };

  const handleGenerate = async () => {
    if (user?.role !== "admin" && quotaBlocked) { router.push("/payment"); return; }
    if (!script.trim()) return;
    setLoading(true);
    setStatus("generating");
    setProgress(0);
    setVideoUrl(null);
    try {
      const userId = user?.id || user?._id;
      const genRes = await axios.post(`${API}/api/video/generate-video`, {
        script, style, videoSize,
        duration: duration && duration !== "none" ? parseInt(duration) : undefined,
        transitions, animation, background,
        fps: parseInt(fps),
        fontsize,
        fontStyle,
        userId,
      });
      const newVideoId = genRes.data.videoId;
      setCurrentVideoId(newVideoId);
      setStatus("rendering");
      await axios.post(`${API}/api/video/render-video`, { videoId: newVideoId });
      pollVideoStatus(newVideoId);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setQuotaBlocked(true);
        setLoading(false);
        setStatus("idle");
        setTimeout(() => router.push("/payment"), 2000);
        return;
      }
      setStatus("error");
      setLoading(false);
    }
  };

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedVideos(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

  const selectAll = () =>
    setSelectedVideos(selectedVideos.length === filteredHistory.length ? [] : filteredHistory.map(v => v._id));

  const deleteSelected = async () => {
    if (!selectedVideos.length) return;
    await axios.post(`${API}/api/video/delete`, { videoIds: selectedVideos });
    setSelectedVideos([]);
    fetchHistory();
  };

  const deleteAll = async () => {
    if (!history.length) return;
    await axios.post(`${API}/api/video/delete`, { videoIds: history.map(v => v._id) });
    setSelectedVideos([]);
    fetchHistory();
  };

  const copyScript = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/login");
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === "admin";
  const quota = userPlan ? PLAN_QUOTA[userPlan] : 0;
  const quotaRemaining = quota === Infinity ? Infinity : Math.max(0, quota - videosGenerated);

  const filteredHistory = history.filter(v => {
    const matchSearch = historySearch
      ? v.script?.toLowerCase().includes(historySearch.toLowerCase())
      : true;
    const matchFilter = historyFilter === "all" ? true : v.status === historyFilter;
    return matchSearch && matchFilter;
  });

  const completedCount = history.filter(v => v.status === "completed").length;
  const processingCount = history.filter(v => v.status === "processing").length;

  const stageLabel =
    status === "generating" ? "Step 1/2 — AI segmenting script..." :
    status === "rendering"  ? `Step 2/2 — Rendering frames ${progress}%` :
    status === "completed"  ? "✅ Done!" :
    status === "error"      ? "❌ Failed" : "";

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "generate", label: "Generate",  icon: <Wand2 className="w-4 h-4" /> },
    { id: "history",  label: `History (${history.length})`, icon: <History className="w-4 h-4" /> },
    { id: "settings", label: "Settings",  icon: <Settings className="w-4 h-4" /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white relative flex flex-col" style={{ background: "radial-gradient(ellipse at 20% 0%, #1a0a3e 0%, #000 60%)" }}>
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-700/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-700/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-800/10 rounded-full blur-[80px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Type className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">TypeMotion</span>
            <span className="hidden sm:block text-xs text-gray-500 ml-1 mt-0.5">AI</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {!isAdmin && userPlan && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
                <Zap className="w-3 h-3" />
                {userPlan} · {quotaBlocked ? "Limit reached" : `${quotaRemaining === Infinity ? "∞" : quotaRemaining} left`}
              </div>
            )}
            {isAdmin && (
              <Button
                variant="outline" size="sm"
                onClick={() => router.push("/admin")}
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Admin
              </Button>
            )}
            <Button
              variant="ghost" size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Log Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8 relative z-10 w-full max-w-6xl">

        {/* ── Hero strip ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-purple-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Video Studio
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-blue-300">
                Create Stunning<br className="sm:hidden" /> Typography Videos
              </h1>
            </div>
            {/* Quick stats */}
            <div className="flex gap-3">
              {[
                { label: "Total",      value: history.length,     icon: <Film className="w-3.5 h-3.5" /> },
                { label: "Completed",  value: completedCount,     icon: <Check className="w-3.5 h-3.5" /> },
                { label: "Processing", value: processingCount,    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 min-w-[70px]">
                  <span className="text-purple-400 mb-0.5">{s.icon}</span>
                  <span className="text-lg font-bold">{s.value}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan banner */}
          {!isAdmin && userPlan && quotaBlocked && (
            <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm mb-4">
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <span>
                You've used all <strong>{PLAN_QUOTA[userPlan] === Infinity ? "∞" : PLAN_QUOTA[userPlan]}</strong> video(s) on your <strong>{userPlan}</strong> plan.{" "}
                <button onClick={() => router.push("/payment")} className="underline hover:text-amber-300 font-medium">
                  Upgrade now →
                </button>
              </span>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit mb-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─────────────────── GENERATE TAB ─────────────────── */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

            {/* LEFT: Controls */}
            <div className="space-y-4">

              {/* Script Presets */}
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
                <CardContent className="p-5">
                  <Label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-3">
                    <Star className="w-3.5 h-3.5 text-yellow-400" /> Quick Presets
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SCRIPT_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        disabled={loading}
                        onClick={() => setScript(preset.value)}
                        className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:border-purple-500/50 hover:text-white hover:bg-purple-500/10 transition-all disabled:opacity-40"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Script Input */}
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <PenLine className="w-3.5 h-3.5 text-purple-400" /> Your Script
                      </Label>
                      <span className={`text-xs ${script.length > 500 ? "text-amber-400" : "text-gray-500"}`}>
                        {script.length} chars
                      </span>
                    </div>
                    <textarea
                      placeholder="Type or paste your script here... or pick a preset above."
                      className="w-full min-h-[160px] bg-black/40 border border-white/10 text-white placeholder:text-gray-600 resize-none rounded-lg p-3.5 text-sm outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500/50 transition-all leading-relaxed"
                      value={script}
                      onChange={e => setScript(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Core options: 2 cols */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Style */}
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">Visual Theme</Label>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-thin pr-0.5">
                        {STYLES.map(s => (
                          <button
                            key={s.value}
                            disabled={loading}
                            onClick={() => setStyle(s.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${
                              style === s.value
                                ? "border-purple-500 bg-purple-500/15 text-white"
                                : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                            }`}
                          >
                            <span>{s.icon}</span>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Format + Duration */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs">Format</Label>
                        <Select value={videoSize} onValueChange={setVideoSize} disabled={loading}>
                          <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/10 text-white">
                            <SelectItem value="9:16">📱 Vertical (9:16)</SelectItem>
                            <SelectItem value="16:9">🖥️ Landscape (16:9)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs">Duration</Label>
                        <Select value={duration} onValueChange={setDuration} disabled={loading}>
                          <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-9">
                            <SelectValue placeholder="Auto" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/10 text-white">
                            <SelectItem value="none">⚡ Auto (from script)</SelectItem>
                            <SelectItem value="10">⏱️ 10s — Fast</SelectItem>
                            <SelectItem value="30">📽️ 30s — Standard</SelectItem>
                            <SelectItem value="60">🎬 60s — Full</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs">Transition</Label>
                        <Select value={transitions} onValueChange={setTransitions} disabled={loading}>
                          <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/10 text-white">
                            {TRANSITIONS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Animation picker */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-yellow-400" /> Text Animation
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ANIMATIONS.map(a => (
                        <button
                          key={a.value}
                          disabled={loading}
                          onClick={() => setAnimation(a.value)}
                          title={a.desc}
                          className={`flex flex-col items-center px-2 py-2 rounded-lg border text-[10px] transition-all ${
                            animation === a.value
                              ? "border-purple-500 bg-purple-500/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300"
                          }`}
                        >
                          <span className="font-semibold text-xs mb-0.5">{a.label}</span>
                          <span className="opacity-70 text-center leading-tight">{a.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Advanced toggleable section ── */}
                  <button
                    onClick={() => setShowAdvanced(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full pt-2 border-t border-white/5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Advanced Settings
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Background */}
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs">Background Style</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {BACKGROUNDS.map(bg => (
                            <button
                              key={bg.value}
                              disabled={loading}
                              onClick={() => setBackground(bg.value)}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                                background === bg.value
                                  ? "border-purple-500 bg-purple-500/10"
                                  : "border-white/10 hover:border-white/20"
                              }`}
                            >
                              <div className={`w-full h-8 rounded-md ${bg.preview}`} />
                              <span className="text-[9px] text-gray-400">{bg.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Style Picker */}
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs">Font Style</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {FONT_STYLES.map(fs => (
                            <button
                              key={fs.value}
                              disabled={loading}
                              onClick={() => setFontStyle(fs.value)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                fontStyle === fs.value
                                  ? "border-purple-500 bg-purple-500/10 text-white"
                                  : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
                              }`}
                            >
                              <span className={`text-sm ${fs.preview}`}>{fs.sample}</span>
                              <span className="text-[9px]">{fs.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* FPS */}
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                          <Film className="w-3 h-3" /> Frame Rate (FPS)
                        </Label>
                        <div className="flex gap-2">
                          {["24", "30", "60"].map(f => (
                            <button
                              key={f}
                              disabled={loading}
                              onClick={() => setFps(f)}
                              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                                fps === f
                                  ? "border-purple-500 bg-purple-500/15 text-white"
                                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                              }`}
                            >
                              {f} FPS
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font size slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-400 text-xs">Font Size</Label>
                          <span className="text-xs text-purple-400 font-mono font-bold">{fontsize}px</span>
                        </div>
                        <input
                          type="range"
                          min={40} max={140} step={10}
                          value={fontsize}
                          disabled={loading}
                          onChange={e => setFontsize(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #9333ea ${((fontsize - 40) / 100) * 100}%, #374151 ${((fontsize - 40) / 100) * 100}%)`
                          }}
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Small (40px)</span><span>Large (140px)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={loading || (!script.trim() && !(user?.role !== "admin" && quotaBlocked))}
                    className={`w-full h-12 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 mt-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      !isAdmin && quotaBlocked
                        ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-orange-500/20"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.01]"
                    }`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {status === "generating" ? "Segmenting script…" : `Rendering ${progress}%`}</>
                    ) : !isAdmin && quotaBlocked ? (
                      <><CreditCard className="w-4 h-4" /> Upgrade Plan</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Generate Video Magic</>
                    )}
                  </button>

                  {status === "error" && (
                    <p className="text-red-400 text-xs text-center bg-red-900/20 py-2 rounded-lg border border-red-800/40">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Preview panel */}
            <div className="flex flex-col">
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm flex-1">
                <CardContent className="p-5 flex flex-col items-center justify-center min-h-[520px] h-full">
                  {status === "idle" && (
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-900/60 to-blue-900/60 border border-white/10 flex items-center justify-center">
                          <Video className="w-9 h-9 text-purple-400 opacity-60" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-ping opacity-30" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm font-medium">Preview will appear here</p>
                        <p className="text-gray-600 text-xs mt-1">Configure your settings and click Generate</p>
                      </div>
                      {/* Mini feature list */}
                      <div className="w-full mt-4 space-y-2">
                        {["AI script segmentation", "Smooth text animations", "MP4 download ready"].map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                            <Check className="w-3 h-3 text-purple-500" /> {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(status === "generating" || status === "rendering") && (
                    <div className="flex flex-col items-center w-full space-y-5">
                      {/* Animated ring */}
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin" />
                        <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-transparent border-b-purple-400 border-l-blue-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-300">{progress}%</span>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-semibold text-white mb-1 animate-pulse">{stageLabel}</p>
                        <p className="text-xs text-gray-500">
                          {status === "generating"
                            ? "Breaking your script into animated scenes…"
                            : "Rendering each frame with MoviePy / Pillow…"
                          }
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full space-y-1.5">
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700"
                            style={{ width: `${status === "generating" ? 15 : progress}%` }}
                          />
                        </div>
                        {/* Stage dots */}
                        <div className="flex items-center justify-between text-[10px] text-gray-600">
                          <span className="text-purple-400 font-medium">Script → Scenes</span>
                          <span className={status === "rendering" ? "text-blue-400 font-medium" : ""}>Frames → MP4</span>
                          <span className={status === "completed" ? "text-green-400 font-medium" : ""}>Done</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 text-center">
                        Estimated time: 1–3 min depending on script length
                      </p>
                    </div>
                  )}

                  {status === "completed" && videoUrl && (
                    <div className="w-full flex flex-col items-center space-y-4">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <Check className="w-4 h-4" /> Video ready!
                      </div>
                      <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className={`w-full rounded-xl shadow-2xl shadow-purple-900/40 ${
                          videoSize === "9:16" ? "aspect-[9/16] max-w-[240px]" : "aspect-video"
                        }`}
                      />
                      <div className="flex gap-2 w-full">
                        <a
                          href={videoUrl} download
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <Download className="w-4 h-4" /> Download MP4
                        </a>
                        <button
                          onClick={() => { setStatus("idle"); setVideoUrl(null); setScript(""); }}
                          className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 text-sm rounded-xl hover:bg-white/10 transition-colors"
                        >
                          New
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─────────────────── HISTORY TAB ─────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by script content…"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-purple-500"
                />
                {historySearch && (
                  <button onClick={() => setHistorySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Status filter pills */}
              <div className="flex gap-1.5">
                {(["all", "completed", "processing", "failed"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${
                      historyFilter === f
                        ? "border-purple-500 bg-purple-500/15 text-white"
                        : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk actions */}
            {filteredHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={selectAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                  {selectedVideos.length === filteredHistory.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {selectedVideos.length === filteredHistory.length ? "Deselect All" : "Select All"}
                </button>
                <button
                  onClick={deleteSelected}
                  disabled={selectedVideos.length === 0}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-white px-3 py-1.5 rounded-lg border border-red-900/40 hover:bg-red-900/30 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedVideos.length})
                </button>
                <button
                  onClick={deleteAll}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-white px-3 py-1.5 rounded-lg border border-red-900/40 hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete All
                </button>
                <button onClick={fetchHistory} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors ml-auto">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            )}

            {/* Grid */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center text-gray-600">
                <FileImage className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">{historySearch ? "No videos match your search." : "No videos yet. Create your first one!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredHistory.map(video => {
                  const isSelected = selectedVideos.includes(video._id);
                  const isCompleted = video.status === "completed" && video.videoUrl;
                  const isFailed = video.status === "failed";
                  const isProcessing = video.status === "processing";

                  return (
                    <div
                      key={video._id}
                      className={`group rounded-xl border overflow-hidden flex flex-col transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/30"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* Thumbnail / video */}
                      <div className="relative">
                        {/* Checkbox overlay */}
                        <div className="absolute top-2 left-2 z-10">
                          <button
                            onClick={() => toggleSelect(video._id)}
                            className="p-1 rounded-md bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white"
                          >
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-purple-400" />
                              : <Square className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            }
                          </button>
                        </div>

                        {/* Status badge */}
                        <div className="absolute top-2 right-2 z-10">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            isCompleted  ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                            isFailed     ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            isProcessing ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                            "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          }`}>
                            {isCompleted ? "✓ Done" : isFailed ? "✕ Failed" : `${video.progress || 0}%`}
                          </span>
                        </div>

                        {isCompleted ? (
                          <video
                            src={`${API}${video.videoUrl}`}
                            className={`w-full bg-black ${video.videoSize === "9:16" ? "aspect-[9/16] object-contain" : "aspect-video object-cover"}`}
                            muted
                            controls
                          />
                        ) : (
                          <div className={`w-full bg-black/60 flex flex-col items-center justify-center ${video.videoSize === "9:16" ? "aspect-[9/16]" : "aspect-video"}`}>
                            {isFailed ? (
                              <div className="text-red-400 text-xs text-center px-3">
                                <X className="w-6 h-6 mx-auto mb-1 opacity-60" />
                                Render failed
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-blue-400">
                                <Loader2 className="w-6 h-6 animate-spin opacity-60" />
                                <span className="text-xs">Processing {video.progress || 0}%</span>
                                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${video.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-3 flex flex-col flex-1 gap-2">
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed italic">
                          &ldquo;{video.script}&rdquo;
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-500 capitalize">{video.style}</span>
                          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-500">{video.videoSize}</span>
                          {video.animation && (
                            <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full text-purple-400 capitalize">{video.animation}</span>
                          )}
                        </div>
                        {video.createdAt && (
                          <p className="text-[10px] text-gray-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(video.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {/* Actions */}
                        <div className="flex gap-1.5 mt-auto pt-1">
                          <button
                            onClick={() => copyScript(video.script, video._id)}
                            title="Copy script"
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                          >
                            {copiedId === video._id
                              ? <><Check className="w-3 h-3 text-green-400" /> Copied</>
                              : <><Copy className="w-3 h-3" /> Copy</>
                            }
                          </button>
                          {isCompleted && (
                            <a
                              href={`${API}${video.videoUrl}`} download
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────── SETTINGS TAB ─────────────────── */}
        {activeTab === "settings" && (
          <div className="max-w-xl space-y-4">
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
              <CardContent className="p-5 space-y-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-purple-400" /> Account & Plan
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500">Email</span>
                    <span className="text-white font-medium">{user?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500">Role</span>
                    <span className={`font-medium capitalize ${isAdmin ? "text-purple-400" : "text-white"}`}>{user?.role || "user"}</span>
                  </div>
                  {!isAdmin && (
                    <>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-gray-500">Plan</span>
                        <span className="text-purple-300 font-medium">{userPlan || "None"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-gray-500">Videos Used</span>
                        <span className="text-white font-medium">{videosGenerated} / {quota === Infinity ? "∞" : quota}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Quota Remaining</span>
                        <span className={`font-medium ${quotaBlocked ? "text-red-400" : "text-green-400"}`}>
                          {quotaRemaining === Infinity ? "Unlimited" : quotaBlocked ? "Exhausted" : quotaRemaining}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {!isAdmin && (
                  <Button
                    onClick={() => router.push("/payment")}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {quotaBlocked ? "Upgrade Plan" : "Manage Plan"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" /> Your Stats
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Videos",  value: history.length,   color: "text-white" },
                    { label: "Completed",      value: completedCount,   color: "text-green-400" },
                    { label: "Processing",     value: processingCount,  color: "text-blue-400" },
                    { label: "Failed",         value: history.filter(v => v.status === "failed").length, color: "text-red-400" },
                  ].map(s => (
                    <div key={s.label} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <LogOut className="w-4 h-4 text-red-400" /> Session
                </h2>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20 hover:border-red-700 text-sm bg-transparent"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
