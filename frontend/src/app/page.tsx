"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  PlayCircle, Wand2, Type, CheckCircle2, Zap,
  LayoutTemplate, Music, FileImage, Sparkles, IndianRupee
} from "lucide-react";
import gsap from "gsap";

/* ══════════════════════════════════════════════════════════════
   PURPLE NEON JUPITER HERO
   • Half of Jupiter rising from bottom-center
   • Atmospheric bands using the new Purple/Fuchsia present colors
   • Neon Storm (Great Red Spot variant in bright magenta)
   • Flat/angled Glowing Purple Belt (Saturn style)
   • 200 twinkling drifting stars
   • GSAP: slow band drift, edge glow pulse, ring shimmer
══════════════════════════════════════════════════════════════ */

interface Star { x: number; y: number; r: number; opacity: number; vx: number; vy: number; }

// Jupiter atmospheric bands painted in neon purple / fuchsia / blue
// const NEON_BANDS = [
//   "#10002b", "#240046", "#3c096c", "#5a189a", "#7b2cbf", // deep purple tones
//   "#9d4edd", "#c77dff", "#e0aaff", "#ffffff", "#e0aaff", // fading to bright white bands
//   "#9d4edd", "#5a189a", "#3c096c", "#7b2cbf", "#c77dff",
//   "#240046", "#10002b", "#3c096c", "#5a189a", "#9d4edd",
//   "#ffffff", "#f72585", "#b5179e", "#7209b7", "#3a0ca3"  // vivid magenta & blue hints
// ];

function PurpleJupiterPlanet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── GSAP-driven animation state ─────────────────────────
    const A = {
      bandOffset: 0,    // 0→1 → bands drift slowly upward
      glow: 1,          // planet edge glow pulse
      ringShimmer: 1,   // ring brightness
    };

    // ── Stars ───────────────────────────────────────────────
    let stars: Star[] = [];
    const buildStars = (W: number, H: number) => {
      stars.forEach(s => gsap.killTweensOf(s));
      stars = Array.from({ length: 200 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.85,
        r: Math.random() * 1.5 + 0.2,
        opacity: 0,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.025,
      }));
      stars.forEach(s => {
        gsap.to(s, {
          opacity: Math.random() * 0.85 + 0.1,
          duration: 1.0 + Math.random() * 3.0,
          ease: "sine.inOut",
          repeat: -1, yoyo: true,
          delay: Math.random() * 4,
        });
      });
    };

    // ── Canvas resize ───────────────────────────────────────
    let W = 0, H = 0;
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      buildStars(W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── GSAP tweens ─────────────────────────────────────────
    gsap.to(A, { bandOffset: 1, duration: 80, ease: "none", repeat: -1 });
    gsap.to(A, { glow: 1.4, duration: 3.5, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(A, { ringShimmer: 1.35, duration: 2.8, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 0.7 });

    // ── Render helpers ──────────────────────────────────────

    function drawRingSide(
      cx: number, cy: number,
      ringRx: number, ringRy: number,
      shimmer: number,
      side: "back" | "front"
    ) {
      if (!ctx) return;
      const startA = side === "back" ? Math.PI : 0;
      const endA = side === "back" ? 0 : Math.PI;

      // Glow layers for the "belt"
      const layers = [
        { rFac: 1.25, iF: 1.23, rgb: [50, 10, 100], al: 0.06 },
        { rFac: 1.18, iF: 1.15, rgb: [80, 20, 150], al: 0.12 },
        { rFac: 1.15, iF: 1.11, rgb: [130, 30, 200], al: 0.25 },
        { rFac: 1.11, iF: 1.07, rgb: [180, 50, 255], al: 0.40 * shimmer },
        { rFac: 1.07, iF: 1.04, rgb: [220, 100, 255], al: 0.65 * shimmer },
        { rFac: 1.04, iF: 1.02, rgb: [255, 180, 255], al: 0.85 * shimmer },
        { rFac: 1.02, iF: 1.00, rgb: [255, 240, 255], al: 1.00 }, // Bright white inner edge
      ];

      for (const l of layers) {
        const rx = ringRx * l.rFac;
        const ry = ringRy * l.rFac;
        const [r, g, b] = l.rgb;

        const lg = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
        lg.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
        lg.addColorStop(0.12, `rgba(${r},${g},${b},${l.al * 0.5})`);
        lg.addColorStop(0.30, `rgba(${r},${g},${b},${l.al})`);
        lg.addColorStop(0.50, `rgba(${r},${g},${b},${l.al * 0.95})`);
        lg.addColorStop(0.70, `rgba(${r},${g},${b},${l.al})`);
        lg.addColorStop(0.88, `rgba(${r},${g},${b},${l.al * 0.5})`);
        lg.addColorStop(1.00, `rgba(${r},${g},${b},0)`);

        const iRx = ringRx * l.iF;
        // const iRy = ringRy * l.iF; // Removed unused variable
        const thickness = Math.max(3, Math.abs(rx - iRx) * 1.6 + ry * 0.3);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, startA, endA);
        ctx.strokeStyle = lg;
        ctx.lineWidth = thickness;
        ctx.stroke();
        ctx.restore();
      }

      // Add intense lens flare cutting horizontally through the rings if it's the front belt
      if (side === "front") {
        const flareG = ctx.createLinearGradient(cx - ringRx * 1.2, cy, cx + ringRx * 1.2, cy);
        flareG.addColorStop(0.0, "rgba(0,0,0,0)");
        flareG.addColorStop(0.4, `rgba(180,50,255,${0.3 * shimmer})`);
        flareG.addColorStop(0.5, `rgba(255,200,255,${0.8 * shimmer})`);
        flareG.addColorStop(0.6, `rgba(180,50,255,${0.3 * shimmer})`);
        flareG.addColorStop(1.0, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.moveTo(cx - ringRx * 1.1, cy);
        ctx.lineTo(cx + ringRx * 1.1, cy);
        ctx.strokeStyle = flareG;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    function drawJupiterBody(cx: number, cy: number, R: number, bandOffset: number, glow: number) {
      if (!ctx) return;
      // ── Clip to planet circle ────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // Smooth Neon Purple Planet Body (No Stripes)
      const bodyG = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      bodyG.addColorStop(0, "#8a10e6");   // Upper edge glow
      bodyG.addColorStop(0.15, "#52069e"); // Upper mid
      bodyG.addColorStop(0.6, "#1f0145");  // Lower mid
      bodyG.addColorStop(1, "#070014");    // Deep bottom
      ctx.fillStyle = bodyG;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // Neon Storm (Bright Fuchsia/Magenta Oval)
      ctx.save();
      ctx.translate(cx + R * 0.22, cy - R * 0.15);
      ctx.scale(1.8, 1); // Oval stretch
      const stormRadius = R * 0.12;
      const grs = ctx.createRadialGradient(0, 0, 0, 0, 0, stormRadius);
      grs.addColorStop(0, "rgba(255,255,255,0.95)");
      grs.addColorStop(0.3, "rgba(255,100,200,0.85)");
      grs.addColorStop(0.7, "rgba(150,0,150,0.5)");
      grs.addColorStop(1, "rgba(100,0,150,0)");
      ctx.beginPath();
      ctx.arc(0, 0, stormRadius, 0, Math.PI * 2);
      ctx.fillStyle = grs;
      ctx.fill();
      ctx.restore();

      // Sphere shading overlay (3D effect)
      const shade = ctx.createRadialGradient(
        cx - R * 0.35, cy - R * 0.35, 0,
        cx, cy, R * 1.05
      );
      shade.addColorStop(0, "rgba(250,220,255,0.18)"); // Specular highlight
      shade.addColorStop(0.40, "rgba(0,0,0,0)");
      shade.addColorStop(0.75, "rgba(0,0,0,0.35)");
      shade.addColorStop(1.00, "rgba(0,0,0,0.88)");       // Deep shadow edge
      ctx.fillStyle = shade;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      ctx.restore(); // end clip

      // ── Planet edge glowing atmosphere ─────────────────────
      const edgeG = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.15);
      edgeG.addColorStop(0, "rgba(0,0,0,0)");
      edgeG.addColorStop(0.5, `rgba(180,80,255,${0.25 * glow})`);
      edgeG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = edgeG;
      ctx.fill();
      ctx.restore();
    }

    // ── Main draw ───────────────────────────────────────────
    const draw = () => {
      if (!ctx || W === 0) return;
      const dpr = devicePixelRatio;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const isMobile = W < 768;
      const R = isMobile ? Math.min(W * 0.85, H * 0.6) : Math.min(W * 0.46, H * 0.75, 540); 
      const py = isMobile ? H + R * 0.15 : H + R * 0.30; 

      const ringRx = R * 1.6; // Light belt stretching outward
      const ringRy = R * 0.035; // Extremely flat perspective (edge-on view)

      // 1. Deep purple space background
      const bg = ctx.createRadialGradient(cx, py, 0, cx, py, Math.max(W, H) * 1.2);
      bg.addColorStop(0, "#220055");
      bg.addColorStop(0.4, "#0b001a");
      bg.addColorStop(1, "#020005");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 2. Stars
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        // Purple/fuchsia tinted stars
        ctx.fillStyle = s.r > 1
          ? `rgba(255,220,255,${s.opacity})`   // pinkish
          : `rgba(200,180,255,${s.opacity})`;  // bluish/purple
        ctx.fill();
      }

      // 3. Ambient Purple glow behind planet
      const ambR = R * 2.5;
      const amb = ctx.createRadialGradient(cx, py, R * 0.8, cx, py, ambR);
      amb.addColorStop(0, `rgba(150,50,255,${0.35 * A.glow})`);
      amb.addColorStop(0.4, `rgba(80,10,180,${0.15 * A.glow})`);
      amb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, W, H);

      // 4. Back belt (behind planet = top arc of ring ellipse)
      drawRingSide(cx, py, ringRx, ringRy, A.ringShimmer, "back");

      // 5. Purple Jupiter body
      drawJupiterBody(cx, py, R, A.bandOffset, A.glow);

      // 6. Front belt (in front of planet = bottom arc)
      drawRingSide(cx, py, ringRx, ringRy, A.ringShimmer, "front");

      // 7. Top vignette
      const vig = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      vig.addColorStop(0, "rgba(2,0,10,0.85)");
      vig.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H * 0.3);

      ctx.restore();
    };

    gsap.ticker.fps(60);
    const tick = gsap.ticker.add(draw);

    return () => {
      gsap.ticker.remove(tick);
      gsap.killTweensOf(A);
      stars.forEach(s => gsap.killTweensOf(s));
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block", pointerEvents: "none" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-900 selection:text-white">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
              <Type className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">TypeMotion <span className="text-purple-400">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <Link href="#demo" className="hover:text-white transition-colors">Demo</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-6">
                Start Generating
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO — Full Viewport with Purple Planet ══ */}
      <section className="relative w-full overflow-hidden bg-[#020009]" style={{ height: "100vh", minHeight: "600px" }}>

        {/* Portal canvas fills entire hero */}
        <PurpleJupiterPlanet />

        {/* Nav gradient */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />

        {/* Hero text */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-28 px-6">
          <div className="flex flex-col items-center text-center w-full max-w-4xl mx-auto">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-400/20 text-sm mb-8 backdrop-blur-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              Introducing AI Typography Engine 2.0
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]"
            >
              Create Typography Videos
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-blue-400">
                With Pure AI Magic
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Turn your script into professional motion graphics in seconds. Perfect for TikTok, Reels, and YouTube Shorts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-full text-lg border border-white/10 shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]">
                  Start Generating <Wand2 className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="h-14 px-8 bg-white/5 hover:bg-white/10 text-white border-white/15 rounded-full text-lg backdrop-blur-md">
                  <PlayCircle className="mr-2 w-5 h-5" /> Watch Demo
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Bottom fade — helps blend horizon line if we scroll */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
      </section>

      {/* ══ DEMO ══ */}
      <section id="demo" className="py-24 relative bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">See The <span className="text-purple-400">Magic</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Watch how our engine transforms plain text into engaging visual stories with gorgeous animations and transitions.</p>
          </div>
          <div className="max-w-4xl mx-auto relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)] bg-gray-900 group aspect-video flex items-center justify-center">
            <video className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              autoPlay loop muted playsInline
              poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop">
              <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-medium">Typography Engine Demo</div>
                  <div className="text-white/60 text-sm">Target Duration: 10s • Style: Neon Glow</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Professional <span className="text-blue-400">Features</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to create viral shorts without opening After Effects or Premiere Pro.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-6"><LayoutTemplate className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold mb-3">Smart Parsing</h3>
              <p className="text-gray-400">Add timestamps directly in your script like <code className="text-purple-400">[5-8 sec]</code> and the engine automatically times the text perfectly.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6"><Zap className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold mb-3">Dynamic Scaling</h3>
              <p className="text-gray-400">Need exactly a 60-second video? Our engine mathematically stretches or compresses your scene timings instantly.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-fuchsia-500/20 text-fuchsia-400 rounded-xl flex items-center justify-center mb-6"><Sparkles className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold mb-3">Pro Animations</h3>
              <p className="text-gray-400">Built-in cinematic text animations: Dynamic Zooms, Smooth Slides, Scale-ups, and Crossfade scene transitions.</p>
            </div>
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/10 border border-green-500/30 rounded-2xl p-6 relative overflow-hidden flex items-center gap-6">
                <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">COMING SOON</div>
                <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center shrink-0"><Music className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-lg font-bold mb-1">AI Voiceover &amp; Audio</h3>
                  <p className="text-green-500/70 text-sm">Automatically generate breathtaking AI voiceovers synchronized to your text.</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/10 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden flex items-center gap-6">
                <div className="absolute top-0 right-0 bg-purple-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">COMING SOON</div>
                <div className="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center shrink-0"><FileImage className="w-7 h-7" /></div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Animated Stickers &amp; Emojis</h3>
                  <p className="text-purple-500/70 text-sm">Liven up your typography with pop-up graphics, emojis, and visual sound effects.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" className="py-24 relative bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How It <span className="text-fuchsia-400">Works</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Generate a professional video in 3 ridiculously simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto text-center relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-blue-500/0" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-900 border-4 border-black shadow-[0_0_0_2px_rgba(168,85,247,0.5)] flex items-center justify-center text-3xl font-bold text-purple-400 mb-6">1</div>
              <h3 className="text-xl font-bold mb-3">Copy &amp; Paste</h3>
              <p className="text-gray-400">Paste your script, tweet, or idea into our dashboard. Optionally add <code className="text-purple-400">[timestamps]</code>.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-900 border-4 border-black shadow-[0_0_0_2px_rgba(217,70,239,0.5)] flex items-center justify-center text-3xl font-bold text-fuchsia-400 mb-6">2</div>
              <h3 className="text-xl font-bold mb-3">Select Vibe</h3>
              <p className="text-gray-400">Choose your color theme, animations, duration target, and video dimensions.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-900 border-4 border-black shadow-[0_0_0_2px_rgba(59,130,246,0.5)] flex items-center justify-center text-3xl font-bold text-blue-400 mb-6">3</div>
              <h3 className="text-xl font-bold mb-3">Generate</h3>
              <p className="text-gray-400">Our Python render engine creates your video in the cloud. Download instantly as an MP4.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple <span className="text-green-400">Pricing</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Pay only for what you need. Zero monthly subscriptions required to start.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/[0.07] transition-colors relative">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="flex items-baseline gap-1 my-6"><IndianRupee className="w-6 h-6 text-gray-400" /><span className="text-5xl font-extrabold text-white">10</span></div>
              <p className="text-gray-400 mb-8">Pay as you go. Perfect for occasional social media posts.</p>
              <ul className="space-y-4 mb-8 w-full text-left">
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> 1 Premium Video Generation</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> Full HD 1080p Render</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> No Watermarks</li>
              </ul>
              <Link href="/dashboard" className="w-full mt-auto"><Button className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-full">Get Started</Button></Link>
            </div>
            <div className="bg-gray-900 border border-purple-500/50 rounded-3xl p-8 flex flex-col items-center text-center relative shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] transform md:-translate-y-4">
              <div className="absolute -top-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">Most Popular</div>
              <h3 className="text-2xl font-bold mb-2">Creator Pack</h3>
              <div className="flex items-baseline gap-1 my-6"><IndianRupee className="w-6 h-6 text-purple-400" /><span className="text-5xl font-extrabold text-white">299</span></div>
              <p className="text-gray-400 mb-8">Ideal for content creators making daily uploads.</p>
              <ul className="space-y-4 mb-8 w-full text-left">
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> 30 Premium Video Generations</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Massive Discount (₹10/video)</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Priority Cloud Rendering</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /> Premium Templates</li>
              </ul>
              <Link href="/dashboard" className="w-full mt-auto"><Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full">Grab Deal</Button></Link>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/[0.07] transition-colors">
              <h3 className="text-2xl font-bold mb-2">Agency</h3>
              <div className="flex items-baseline gap-1 my-6"><IndianRupee className="w-6 h-6 text-blue-400" /><span className="text-5xl font-extrabold text-white">1999</span></div>
              <p className="text-gray-400 mb-8">Perfect for agencies managing multiple client campaigns.</p>
              <ul className="space-y-4 mb-8 w-full text-left">
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> Unlimited Video Generations</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> API Access</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> Dedicated Account Manager</li>
                <li className="flex items-center gap-3 text-gray-300"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" /> Custom Font Uploads</li>
              </ul>
              <Link href="/dashboard" className="w-full mt-auto"><Button className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-full">Contact Sales</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Type className="w-5 h-5 text-purple-500" />
            <span className="font-bold text-lg text-white">TypeMotion AI</span>
          </div>
          <p>© 2026 TypeMotion. Built for modern creators.</p>
        </div>
      </footer>
    </div>
  );
}
