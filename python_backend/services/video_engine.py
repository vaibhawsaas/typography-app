"""
TypeMotion AI - Ultra-Fast Typography Video Engine v3.0
=======================================================
CapCut-style features:
  • 7 font styles: bold, italic, impact, script, condensed, rounded, outline
  • 9 background types: gradient, radial, particles, aurora,
                         geometric, bokeh, cinematic_bars, glitch_lines, solid
  • 7 visual styles: neon, cinematic, minimal, retro, pop, dark_luxury, vibrant
  • 16 animation types: karaoke, typewriter, bounce, zoom_in, slide_up,
                         shake, glow, wave, fade_in, scale_pulse,
                         pop_up, flip_in, glitch, spotlight, color_pop,
                         word_by_word_rise
  • Pre-rendered static BG frames (gradient/geometric/cinematic_bars/solid)
  • Font cache keyed by (size, style)
  • Parallel frame rendering via ThreadPoolExecutor
  • Direct FFmpeg stdin pipe — no temp files
"""

import os
import re
import math
import random
import subprocess
import shutil
import colorsys
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

import numpy as np

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    if not hasattr(Image, 'ANTIALIAS'):
        Image.ANTIALIAS = getattr(Image, 'LANCZOS', Image.BICUBIC)
except ImportError:
    raise RuntimeError("Pillow is required: pip install pillow")

logger = logging.getLogger("video_engine")
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")

# ─────────────────────────────────────────────
#  FONT SYSTEM  (7 styles, cached per size+style)
# ─────────────────────────────────────────────

_FONT_MAP = {
    "bold": [
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ],
    "italic": [
        "C:/Windows/Fonts/ariali.ttf",
        "C:/Windows/Fonts/calibrii.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
    ],
    "impact": [
        "C:/Windows/Fonts/impact.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/ttf-dejavu/DejaVuSans-Bold.ttf",
    ],
    "script": [
        "C:/Windows/Fonts/KUNSTLER.TTF",
        "C:/Windows/Fonts/PRISTINA.TTF",
        "C:/Windows/Fonts/calibrii.ttf",
        "/usr/share/fonts/truetype/freefont/FreeMonoBold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
    ],
    "condensed": [
        "C:/Windows/Fonts/ARIALN.TTF",
        "C:/Windows/Fonts/ARIALNB.TTF",
        "/usr/share/fonts/truetype/liberation/LiberationNarrow-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
    ],
    "rounded": [
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    "outline": [
        "C:/Windows/Fonts/verdanab.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
}

_font_cache: dict = {}


def _get_font(size: int, style: str = "bold") -> ImageFont.FreeTypeFont:
    """Return a cached font object for the given size and style."""
    key = (size, style)
    if key in _font_cache:
        return _font_cache[key]
    candidates = _FONT_MAP.get(style, _FONT_MAP["bold"])
    # Also fall back to bold paths if style-specific fonts not found
    fallbacks = _FONT_MAP["bold"]
    for path in candidates + fallbacks:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, size)
                _font_cache[key] = font
                return font
            except Exception:
                continue
    logger.warning(f"No TrueType font found for style={style}, using PIL default.")
    font = ImageFont.load_default()
    _font_cache[key] = font
    return font


# ─────────────────────────────────────────────
#  COLOUR UTILITIES
# ─────────────────────────────────────────────

def hex_to_rgb(hex_code: str) -> tuple:
    h = hex_code.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def hex_to_rgba(hex_code: str, alpha: int = 255) -> tuple:
    r, g, b = hex_to_rgb(hex_code)
    return (r, g, b, alpha)


def blend_colors(c1: tuple, c2: tuple, t: float) -> tuple:
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


# ─────────────────────────────────────────────
#  STYLE PALETTES  (7 styles)
# ─────────────────────────────────────────────

STYLE_PALETTES = {
    'neon': {
        'bg':        [('#000000', '#0a0a0a'), ('#110022', '#000011')],
        'text':      ['#39ff14', '#ff00ff', '#00ffff', '#ff6600'],
        'highlight': '#ffff00',
        'font':      'bold',
    },
    'cinematic': {
        'bg':        [('#1a1a2e', '#0f0f1a'), ('#16213e', '#0d1b2a')],
        'text':      ['#f1faee', '#e0e0e0'],
        'highlight': '#e94560',
        'font':      'condensed',
    },
    'minimal': {
        'bg':        [('#0f172a', '#070f1a'), ('#1e293b', '#0f172a')],
        'text':      ['#ffffff', '#e2e8f0'],
        'highlight': '#38bdf8',
        'font':      'rounded',
    },
    'retro': {
        'bg':        [('#2d1b00', '#1a0f00'), ('#3d2b00', '#241500')],
        'text':      ['#ffb347', '#ff8c00', '#ffd700', '#ff6347'],
        'highlight': '#fff4cc',
        'font':      'impact',
    },
    'pop': {
        'bg':        [('#ffffff', '#f0e0ff'), ('#fff0f5', '#e0f0ff')],
        'text':      ['#ff1493', '#00bfff', '#7b00ff', '#ff4500'],
        'highlight': '#ff1493',
        'font':      'impact',
    },
    'dark_luxury': {
        'bg':        [('#000000', '#0a0800'), ('#0d0a00', '#050400')],
        'text':      ['#d4af37', '#c5a028', '#e8c84a', '#b8960c'],
        'highlight': '#fff5cc',
        'font':      'script',
    },
    'vibrant': {
        'bg':        [('#0a0a1a', '#050510'), ('#1a0a1a', '#0a0010')],
        'text':      ['#ff0080', '#00ff88', '#ff8800', '#00ccff', '#cc00ff', '#ffff00'],
        'highlight': '#ffffff',
        'font':      'bold',
    },
}

VIBRANT_WORD_COLORS = [
    '#ff0080', '#00ff88', '#ff8800', '#00ccff', '#cc00ff',
    '#ffff00', '#ff4444', '#44ffaa', '#4488ff',
]


# ─────────────────────────────────────────────
#  SCRIPT SEGMENTATION
# ─────────────────────────────────────────────

def segment_script_local(
    script: str,
    style: str,
    target_duration: int = None,
    background: str = 'gradient',
    effects: str = 'none',
    transitions: str = 'crossfade',
    animation: str = 'karaoke',
    font_style: str = None,
) -> list:
    """
    Split script into scenes with per-scene metadata.
    Supports [X-Y sec] timestamp blocks for lyric-style segmentation.
    Falls back to chunking every 4 words.
    """
    palette = STYLE_PALETTES.get(style, STYLE_PALETTES['minimal'])
    # font_style override; default from palette
    effective_font = font_style if font_style else palette.get('font', 'bold')
    scenes = []

    ts_pattern = r'\[(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*sec[^\]]*\](.*?)(?=\[\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*sec|$)'
    matches = re.findall(ts_pattern, script, re.DOTALL | re.IGNORECASE)

    if matches:
        for start_s, end_s, text in matches:
            duration = float(end_s) - float(start_s)
            clean = text.strip()
            if not clean:
                continue
            bg_pair = random.choice(palette['bg'])
            scenes.append({
                "text":             clean,
                "durationInSeconds": max(1.0, duration),
                "animationType":    animation,
                "transition":       transitions,
                "background":       background,
                "backgroundColor":  bg_pair[0],
                "backgroundColor2": bg_pair[1],
                "textColor":        random.choice(palette['text']),
                "highlightColor":   palette['highlight'],
                "fontStyle":        effective_font,
            })
    else:
        words = script.split()
        chunk_size = 4
        for i in range(0, max(1, len(words)), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            bg_pair = random.choice(palette['bg'])
            scenes.append({
                "text":             chunk,
                "durationInSeconds": 2.5,
                "animationType":    animation,
                "transition":       transitions,
                "background":       background,
                "backgroundColor":  bg_pair[0],
                "backgroundColor2": bg_pair[1],
                "textColor":        random.choice(palette['text']),
                "highlightColor":   palette['highlight'],
                "fontStyle":        effective_font,
            })

    if not scenes:
        scenes.append({
            "text":             "Hello World",
            "durationInSeconds": 2.0,
            "animationType":    "karaoke",
            "transition":       "crossfade",
            "background":       "gradient",
            "backgroundColor":  "#0f172a",
            "backgroundColor2": "#070f1a",
            "textColor":        "#ffffff",
            "highlightColor":   "#38bdf8",
            "fontStyle":        "bold",
        })

    if target_duration:
        total = sum(s['durationInSeconds'] for s in scenes)
        if total > 0:
            scale = target_duration / total
            for s in scenes:
                s['durationInSeconds'] = round(s['durationInSeconds'] * scale, 2)

    return scenes


# ─────────────────────────────────────────────
#  BACKGROUND FRAME GENERATORS
# ─────────────────────────────────────────────

def _make_gradient_bg(width: int, height: int, color1: tuple, color2: tuple) -> np.ndarray:
    """Fast NumPy vertical linear gradient."""
    t = np.linspace(0, 1, height, dtype=np.float32)
    r = np.uint8(color1[0] + (color2[0] - color1[0]) * t)
    g = np.uint8(color1[1] + (color2[1] - color1[1]) * t)
    b = np.uint8(color1[2] + (color2[2] - color1[2]) * t)
    frame = np.stack([
        np.broadcast_to(r[:, None], (height, width)),
        np.broadcast_to(g[:, None], (height, width)),
        np.broadcast_to(b[:, None], (height, width)),
    ], axis=2)
    return frame.copy()


def _make_radial_bg(width: int, height: int, color1: tuple, color2: tuple) -> np.ndarray:
    """Radial spotlight gradient."""
    cx, cy = width / 2, height / 2
    y_idx, x_idx = np.mgrid[0:height, 0:width]
    dist = np.sqrt((x_idx - cx) ** 2 + (y_idx - cy) ** 2)
    max_dist = math.sqrt(cx ** 2 + cy ** 2)
    t = np.clip(dist / max_dist, 0, 1).astype(np.float32)
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    for ch in range(3):
        frame[:, :, ch] = np.uint8(color1[ch] + (color2[ch] - color1[ch]) * t)
    return frame


def _make_solid_bg(width: int, height: int, color1: tuple, color2: tuple) -> np.ndarray:
    """Solid colour background."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:, :, 0] = color1[0]
    frame[:, :, 1] = color1[1]
    frame[:, :, 2] = color1[2]
    return frame


def _make_particles_bg(
    width: int, height: int,
    color1: tuple, color2: tuple,
    frame_idx: int,
    particle_positions: list,
) -> np.ndarray:
    """Animated particle dots on gradient background."""
    bg = _make_gradient_bg(width, height, color1, color2)
    img = Image.fromarray(bg, 'RGB')
    draw = ImageDraw.Draw(img)
    speed = 0.6
    for px, py, pr, pc, phase in particle_positions:
        dy = math.sin(frame_idx * speed * 0.05 + phase) * 12
        dx = math.cos(frame_idx * speed * 0.03 + phase) * 8
        nx = int((px + dx) % width)
        ny = int((py + dy) % height)
        alpha_factor = 0.4 + 0.3 * math.sin(frame_idx * 0.07 + phase)
        rc = tuple(int(c * alpha_factor) for c in pc)
        draw.ellipse([nx - pr, ny - pr, nx + pr, ny + pr], fill=rc)
    return np.array(img)


def _make_aurora_bg(
    width: int, height: int,
    color1: tuple, color2: tuple,
    frame_idx: int,
) -> np.ndarray:
    """Animated aurora borealis — slow HSL-based horizontal wave bands."""
    frame = np.zeros((height, width, 3), dtype=np.float32)
    phase = frame_idx * 0.018
    for y in range(height):
        y_n = y / height  # 0..1
        # base gradient dark blue/purple
        base_r = color1[0] + (color2[0] - color1[0]) * y_n
        base_g = color1[1] + (color2[1] - color1[1]) * y_n
        base_b = color1[2] + (color2[2] - color1[2]) * y_n
        # aurora wave brightness
        wave = (math.sin(y_n * 7 + phase) + math.sin(y_n * 13 - phase * 1.3)) * 0.25
        wave = max(0.0, wave)
        # aurora hue shift (green/cyan/purple)
        hue_shift = (y_n * 0.4 + phase * 0.05) % 1.0
        ar, ag, ab = [int(c * 255) for c in colorsys.hsv_to_rgb(hue_shift, 0.8, wave)]
        frame[y, :, 0] = base_r + ar
        frame[y, :, 1] = base_g + ag
        frame[y, :, 2] = base_b + ab
    np.clip(frame, 0, 255, out=frame)
    return frame.astype(np.uint8)


def _make_geometric_bg(
    width: int, height: int,
    color1: tuple, color2: tuple,
    static_cache: dict,
    style_key: str,
) -> np.ndarray:
    """Static tiled triangles pattern — rendered once and cached."""
    cache_key = f"geo_{style_key}_{width}_{height}"
    if cache_key in static_cache:
        return static_cache[cache_key].copy()
    img = Image.fromarray(_make_gradient_bg(width, height, color1, color2))
    draw = ImageDraw.Draw(img)
    tile = 120
    for row in range(-1, height // tile + 2):
        for col in range(-1, width // tile + 2):
            x0 = col * tile
            y0 = row * tile
            # Alternate up/down triangles
            if (row + col) % 2 == 0:
                pts = [(x0, y0 + tile), (x0 + tile // 2, y0), (x0 + tile, y0 + tile)]
            else:
                pts = [(x0, y0), (x0 + tile, y0), (x0 + tile // 2, y0 + tile)]
            bright = 0.06 if (row + col) % 3 == 0 else 0.03
            edge_color = tuple(min(255, int(c + 255 * bright)) for c in color2)
            draw.polygon(pts, outline=edge_color + (90,))
    result = np.array(img)
    static_cache[cache_key] = result
    return result.copy()


def _make_bokeh_bg(
    width: int, height: int,
    color1: tuple, color2: tuple,
    bokeh_circles: list,
    frame_idx: int,
) -> np.ndarray:
    """Soft glowing bokeh circles on gradient."""
    base = _make_gradient_bg(width, height, color1, color2)
    img = Image.fromarray(base, 'RGB').convert('RGBA')
    bokeh_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bokeh_layer)
    for bx, by, br, bc, bphase in bokeh_circles:
        drift_x = math.sin(frame_idx * 0.008 + bphase) * 20
        drift_y = math.cos(frame_idx * 0.006 + bphase * 1.3) * 15
        cx = int(bx + drift_x) % width
        cy = int(by + drift_y) % height
        pulse_alpha = int(30 + 20 * math.sin(frame_idx * 0.05 + bphase))
        for ring in range(3, 0, -1):
            ring_r = br * ring
            ring_alpha = pulse_alpha // ring
            fill = bc + (ring_alpha,)
            draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], fill=fill)
    blurred = bokeh_layer.filter(ImageFilter.GaussianBlur(20))
    img.alpha_composite(blurred)
    return np.array(img.convert('RGB'))


def _make_cinematic_bars_bg(
    width: int, height: int,
    color1: tuple, color2: tuple,
    static_cache: dict,
    style_key: str,
) -> np.ndarray:
    """Gradient with black letterbox bars top and bottom."""
    cache_key = f"cinema_{style_key}_{width}_{height}"
    if cache_key in static_cache:
        return static_cache[cache_key].copy()
    base = _make_gradient_bg(width, height, color1, color2)
    bar_h = int(height * 0.09)
    base[:bar_h, :, :] = 0
    base[height - bar_h:, :, :] = 0
    static_cache[cache_key] = base
    return base.copy()


def _make_glitch_lines_bg(
    width: int, height: int,
    color1: tuple, color2: tuple,
    frame_idx: int,
) -> np.ndarray:
    """Gradient with horizontal scan-line glitch artifacts."""
    base = _make_gradient_bg(width, height, color1, color2).copy()
    rng = random.Random(frame_idx * 31337)
    n_lines = rng.randint(2, 6)
    for _ in range(n_lines):
        y = rng.randint(0, height - 1)
        thickness = rng.randint(1, 4)
        shift = rng.randint(-30, 30)
        row = base[y:y+thickness, :, :].copy()
        base[y:y+thickness, :, :] = np.roll(row, shift, axis=1)
        brightness = rng.uniform(0.5, 1.5)
        base[y:y+thickness, :, :] = np.clip(
            base[y:y+thickness, :, :].astype(float) * brightness, 0, 255
        ).astype(np.uint8)
    return base


def _generate_particle_seed(width: int, height: int, style: str) -> list:
    """Create random particle positions/colours for a scene."""
    palette = STYLE_PALETTES.get(style, STYLE_PALETTES['minimal'])
    particles = []
    for _ in range(30):
        px = random.randint(0, width)
        py = random.randint(0, height)
        pr = random.randint(2, 6)
        pc = hex_to_rgb(random.choice(palette['text']))
        phase = random.uniform(0, 2 * math.pi)
        particles.append((px, py, pr, pc, phase))
    return particles


def _generate_bokeh_seed(width: int, height: int, style: str) -> list:
    """Create bokeh circle seed data."""
    palette = STYLE_PALETTES.get(style, STYLE_PALETTES['minimal'])
    circles = []
    for _ in range(18):
        bx = random.randint(0, width)
        by = random.randint(0, height)
        br = random.randint(30, 100)
        bc = hex_to_rgb(random.choice(palette['text']))
        phase = random.uniform(0, 2 * math.pi)
        circles.append((bx, by, br, bc, phase))
    return circles


# ─────────────────────────────────────────────
#  GLOW HELPER
# ─────────────────────────────────────────────

def _draw_word_glow(text_layer: Image.Image, x: int, y: int, word: str, font, color: tuple, radius: int = 22):
    """Composite a blurred glow halo onto text_layer (RGBA)."""
    glow_img = Image.new('RGBA', text_layer.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img)
    for r_step in range(radius, 0, -3):
        alpha = int(160 * (1 - r_step / radius))
        glow_color = color + (alpha,)
        gd.text((x - r_step, y), word, font=font, fill=glow_color)
        gd.text((x + r_step, y), word, font=font, fill=glow_color)
        gd.text((x, y - r_step), word, font=font, fill=glow_color)
        gd.text((x, y + r_step), word, font=font, fill=glow_color)
    blurred = glow_img.filter(ImageFilter.GaussianBlur(radius // 2))
    text_layer.alpha_composite(blurred)


# ─────────────────────────────────────────────
#  LINE LAYOUT HELPER
# ─────────────────────────────────────────────

def _layout_lines(words: list, font, d, width: int, space_w: float):
    """Wrap words into lines respecting max_text_width. Returns list of lines."""
    max_text_width = int(width * 0.85)
    lines = []
    current_line = []
    current_w = 0.0
    for idx, word_str in enumerate(words):
        ww = d.textlength(word_str, font=font)
        if current_w + ww > max_text_width and current_line:
            lines.append(current_line)
            current_line = []
            current_w = 0.0
        current_line.append((idx, word_str, ww))
        current_w += ww + space_w
    if current_line:
        lines.append(current_line)
    return lines


# ─────────────────────────────────────────────
#  TEXT / ANIMATION FRAME RENDERER
# ─────────────────────────────────────────────

def _render_text_frame(
    bg_frame: np.ndarray,
    words: list,
    active_word_idx: int,
    text_color: tuple,
    highlight_color: tuple,
    style: str,
    animation: str,
    font_style: str,
    frame_local_t: float,       # normalised time within this word's window [0,1]
    word_t: float,              # absolute time within the scene [0, duration]
    scene_duration: float,
    font_size: int = 80,
    width: int = 1080,
    height: int = 1920,
    word_color_map: dict = None,  # For vibrant style: {idx: color_tuple}
) -> np.ndarray:
    """
    Composite text onto bg_frame with all 16 animation types.
    Returns a new NumPy RGB frame.
    """
    frame_img = Image.fromarray(bg_frame, 'RGB').convert('RGBA')
    text_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)

    effective_font_style = font_style or 'bold'
    font = _get_font(font_size, effective_font_style)

    stroke_color = (0, 0, 0, 200)
    stroke_w = 3

    # For 'pop' style with light bg: invert stroke to white
    if style == 'pop':
        stroke_color = (255, 255, 255, 180)
        stroke_w = 2

    # For 'outline' font style render only stroke
    outline_only = (effective_font_style == 'outline')

    # Dummy image for measuring
    dummy_img = Image.new('RGBA', (1, 1))
    d = ImageDraw.Draw(dummy_img)
    space_w = max(18, d.textlength(" ", font=font))

    # ─── Whole-block entrance animations ─────────────────────────────────
    scene_in_t = min(1.0, word_t / 0.35)   # entrance over first 0.35s

    offset_x = 0
    offset_y = 0
    alpha_mult = 1.0

    effective_anim_font_size = font_size

    if animation == 'zoom_in':
        scale = 0.25 + 0.75 * scene_in_t
        effective_anim_font_size = max(20, int(font_size * scale))
        font = _get_font(effective_anim_font_size, effective_font_style)
    elif animation == 'slide_up':
        slide_offset = int((1 - scene_in_t) * height * 0.22)
        offset_y = slide_offset
    elif animation == 'fade_in':
        alpha_mult = scene_in_t
    elif animation == 'flip_in':
        # Squash vertically on entrance then release
        flip_scale = min(1.0, scene_in_t * 2)  # 0..1 in first half of entrance
        effective_anim_font_size = max(8, int(font_size * (0.05 + 0.95 * flip_scale)))
        font = _get_font(effective_anim_font_size, effective_font_style)
    elif animation == 'pop_up':
        # Entrance: fast overshoot scale 0 → 1.15 → 1.0
        if scene_in_t < 0.5:
            s = scene_in_t / 0.5
            scale = s * 1.18
        else:
            s = (scene_in_t - 0.5) / 0.5
            scale = 1.18 - 0.18 * s
        effective_anim_font_size = max(10, int(font_size * scale))
        font = _get_font(effective_anim_font_size, effective_font_style)

    # Re-layout after font might have changed
    lines = _layout_lines(words, font, d, width, space_w)

    try:
        _, _, _, line_h = d.textbbox((0, 0), "Ay", font=font)
    except Exception:
        line_h = effective_anim_font_size + 10
    line_gap = int(line_h * 1.45)
    total_text_h = len(lines) * line_gap

    base_y = (height - total_text_h) // 2

    # ─── Spotlight: darken bg except active word region ───────────────────
    spotlight_mask = None
    if animation == 'spotlight':
        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 190))
        text_layer.alpha_composite(overlay)

    # ─── word_by_word_rise state ─────────────────────────────────────────
    # Words rise in sequence from bottom; already-shown = faded; upcoming = invisible
    wwrise_offsets = {}
    if animation == 'word_by_word_rise':
        n_words = len(words)
        word_duration = scene_duration / max(1, n_words)
        for widx in range(n_words):
            wt_start = widx * word_duration
            elapsed = word_t - wt_start
            if elapsed < 0:
                wwrise_offsets[widx] = None  # invisible
            elif elapsed < word_duration * 0.4:
                rise_t = elapsed / (word_duration * 0.4)
                rise_t = 1 - (1 - rise_t) ** 2  # ease-out
                wwrise_offsets[widx] = int((1 - rise_t) * 60)
            else:
                fade_t = (elapsed - word_duration * 0.4) / (word_duration * 0.6)
                fade_t = min(1.0, fade_t)
                wwrise_offsets[widx] = -int(fade_t * 25)  # slight upward fade

    # ─── Draw each word ───────────────────────────────────────────────────
    lx_cursor = 0  # reset each line
    for line_no, line in enumerate(lines):
        space_w_cur = max(18, d.textlength(" ", font=font))
        line_w = sum(ww for _, _, ww in line) + space_w_cur * (len(line) - 1)
        lx = (width - line_w) // 2
        ly = base_y + line_no * line_gap + offset_y

        for idx, word_str, ww in line:
            is_active = (idx == active_word_idx)

            # Vibrant per-word colours
            if word_color_map and idx in word_color_map:
                base_wcolor = word_color_map[idx]
            else:
                base_wcolor = text_color

            # Active word colour
            if is_active:
                wcolor = highlight_color + (255,)
            else:
                wcolor = base_wcolor + (int(200 * alpha_mult),)

            wx = lx
            wy = ly

            # ── word_by_word_rise individual word handling ─────────────
            if animation == 'word_by_word_rise':
                offs = wwrise_offsets.get(idx)
                if offs is None:
                    lx += ww + space_w_cur
                    continue
                wy = ly + offs
                if idx < active_word_idx:
                    wcolor = base_wcolor + (120,)  # faded prior words

            # ── Per-word active animations ─────────────────────────────
            if is_active:
                if animation in ('karaoke', 'scale_pulse'):
                    pulse = 1.0 + 0.13 * math.sin(frame_local_t * math.pi)
                    cur_fs = max(20, int(effective_anim_font_size * pulse))
                    wfont = _get_font(cur_fs, effective_font_style)
                    new_ww = d.textlength(word_str, font=wfont)
                    wx_adj = wx + int((ww - new_ww) // 2)
                    if outline_only:
                        draw.text((wx_adj, wy), word_str, font=wfont,
                                  fill=(0,0,0,0), stroke_width=3, stroke_fill=wcolor)
                    else:
                        draw.text((wx_adj, wy), word_str, font=wfont, fill=wcolor,
                                  stroke_width=stroke_w, stroke_fill=stroke_color)

                elif animation == 'bounce':
                    dy = int(-35 * math.sin(frame_local_t * math.pi))
                    draw.text((wx, wy + dy), word_str, font=font, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

                elif animation == 'shake':
                    dx = int(8 * math.sin(frame_local_t * math.pi * 10))
                    draw.text((wx + dx, wy), word_str, font=font, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

                elif animation == 'glow':
                    _draw_word_glow(text_layer, wx, wy, word_str, font, highlight_color, radius=26)
                    draw.text((wx, wy), word_str, font=font, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

                elif animation == 'wave':
                    char_x = wx
                    for ch_idx, ch in enumerate(word_str):
                        ch_dy = int(14 * math.sin(ch_idx * 0.9 + frame_local_t * math.pi * 3))
                        draw.text((char_x, wy + ch_dy), ch, font=font, fill=wcolor,
                                  stroke_width=stroke_w, stroke_fill=stroke_color)
                        char_x += int(d.textlength(ch, font=font))

                elif animation == 'typewriter':
                    n_chars = max(1, int(len(word_str) * frame_local_t + 1))
                    partial = word_str[:n_chars]
                    draw.text((wx, wy), partial, font=font, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

                elif animation == 'glitch':
                    # Chromatic aberration: offset R/G/B channels
                    offset = 5
                    r_img = Image.new('RGBA', text_layer.size, (0,0,0,0))
                    g_img = Image.new('RGBA', text_layer.size, (0,0,0,0))
                    b_img = Image.new('RGBA', text_layer.size, (0,0,0,0))
                    r_d = ImageDraw.Draw(r_img)
                    g_d = ImageDraw.Draw(g_img)
                    b_d = ImageDraw.Draw(b_img)
                    r_d.text((wx - offset, wy), word_str, font=font,
                             fill=(255, 30, 30, 220), stroke_width=stroke_w, stroke_fill=stroke_color)
                    g_d.text((wx, wy + offset // 2), word_str, font=font,
                             fill=(30, 255, 30, 180), stroke_width=stroke_w, stroke_fill=stroke_color)
                    b_d.text((wx + offset, wy), word_str, font=font,
                             fill=(30, 30, 255, 200), stroke_width=stroke_w, stroke_fill=stroke_color)
                    text_layer.alpha_composite(r_img)
                    text_layer.alpha_composite(g_img)
                    text_layer.alpha_composite(b_img)
                    draw.text((wx, wy), word_str, font=font, fill=wcolor,
                              stroke_width=1, stroke_fill=(0,0,0,100))

                elif animation == 'spotlight':
                    # Clear a bright circle around active word from darkness overlay
                    wbbox = d.textbbox((wx, wy), word_str, font=font)
                    cx = (wbbox[0] + wbbox[2]) // 2
                    cy = (wbbox[1] + wbbox[3]) // 2
                    radius = max(120, (wbbox[2] - wbbox[0]) + 80)
                    # Punch a radial light hole in the darkness
                    for r_step in range(radius, 0, -8):
                        fade = int(190 * (r_step / radius) ** 2)
                        text_layer.paste(
                            Image.new('RGBA', (r_step*2, r_step*2), (0,0,0,0)),
                            (cx - r_step, cy - r_step),
                        )
                    draw.text((wx, wy), word_str, font=font, fill=wcolor,
                              stroke_width=stroke_w+1, stroke_fill=stroke_color)

                elif animation == 'color_pop':
                    # Active = full colour + scale; inactive already grey
                    pulse = 1.0 + 0.10 * math.sin(frame_local_t * math.pi)
                    cur_fs = max(20, int(effective_anim_font_size * pulse))
                    wfont = _get_font(cur_fs, effective_font_style)
                    new_ww = d.textlength(word_str, font=wfont)
                    wx_adj = wx + int((ww - new_ww) // 2)
                    draw.text((wx_adj, wy), word_str, font=wfont, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

                elif animation == 'word_by_word_rise':
                    # Active word gets highlight + subtle scale
                    pulse = 1.0 + 0.08 * math.sin(frame_local_t * math.pi)
                    cur_fs = max(20, int(effective_anim_font_size * pulse))
                    wfont = _get_font(cur_fs, effective_font_style)
                    draw.text((wx, wy), word_str, font=wfont, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

                else:
                    # Default / fallback
                    draw.text((wx, wy), word_str, font=font, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

            else:
                # Inactive words
                if animation == 'color_pop':
                    # Grey out inactive
                    grey_val = int(0.35 * base_wcolor[0] + 0.35 * base_wcolor[1] + 0.35 * base_wcolor[2])
                    grey = (grey_val, grey_val, grey_val, 180)
                    draw.text((wx, wy), word_str, font=font, fill=grey,
                              stroke_width=1, stroke_fill=stroke_color)
                elif outline_only:
                    draw.text((wx, wy), word_str, font=font,
                              fill=(0,0,0,0), stroke_width=3, stroke_fill=wcolor)
                else:
                    draw.text((wx, wy), word_str, font=font, fill=wcolor,
                              stroke_width=stroke_w, stroke_fill=stroke_color)

            lx += ww + space_w_cur

    # Apply global alpha for fade_in
    if animation == 'fade_in' and alpha_mult < 1.0:
        alpha_channel = text_layer.split()[3]
        alpha_channel = alpha_channel.point(lambda p: int(p * alpha_mult))
        text_layer.putalpha(alpha_channel)

    frame_img.alpha_composite(text_layer)
    return np.array(frame_img.convert('RGB'))


# ─────────────────────────────────────────────
#  TRANSITION FRAME BLENDING
# ─────────────────────────────────────────────

def _crossfade(frame_a: np.ndarray, frame_b: np.ndarray, t: float) -> np.ndarray:
    return np.uint8(frame_a * (1 - t) + frame_b * t)


def _slide_transition(frame_a: np.ndarray, frame_b: np.ndarray, t: float, direction: str = 'left') -> np.ndarray:
    h, w = frame_a.shape[:2]
    offset = int(w * t)
    result = np.zeros_like(frame_a)
    if direction == 'left':
        result[:, :w - offset] = frame_a[:, offset:]
        result[:, w - offset:] = frame_b[:, :offset]
    else:
        result[:, offset:] = frame_a[:, :w - offset]
        result[:, :offset] = frame_b[:, w - offset:]
    return result


# ─────────────────────────────────────────────
#  MAIN RENDER FUNCTION  (FFmpeg pipe)
# ─────────────────────────────────────────────

def render_video_local(
    output_path: str,
    scenes: list,
    style: str,
    video_size: str,
    progress_callback=None,
    fps: int = 24,
    font_size: int = 80,
    font_style: str = None,
    max_workers: int = None,
):
    """
    Render all scenes to `output_path` via a direct FFmpeg stdin pipe.
    No temporary files per scene - raw RGB frames are streamed directly.
    """
    is_portrait = video_size == '9:16'
    width  = 1080 if is_portrait else 1920
    height = 1920 if is_portrait else 1080

    if max_workers is None:
        max_workers = min(8, (os.cpu_count() or 4))

    # Shared static-BG cache across scenes
    static_bg_cache: dict = {}

    # Locate FFmpeg
    def _find_ffmpeg() -> str:
        try:
            from imageio_ffmpeg import get_ffmpeg_exe
            path = get_ffmpeg_exe()
            if path and os.path.exists(path):
                return path
        except Exception:
            pass
        try:
            from moviepy.config import get_setting
            path = get_setting('FFMPEG_BINARY')
            if path and os.path.exists(path):
                return path
        except Exception:
            pass
        path = shutil.which('ffmpeg')
        if path:
            return path
        for loc in [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
        ]:
            if os.path.exists(loc):
                return loc
        return 'ffmpeg'

    ffmpeg_cmd = _find_ffmpeg()
    logger.info(f"Using FFmpeg: {ffmpeg_cmd}")

    TRANSITION_FRAMES = 12
    transition_type_map = {
        'crossfade': 'crossfade', 'fade': 'crossfade',
        'slide_right': 'slide_right', 'slide_left': 'slide_left',
        'none': 'none',
    }

    # Pre-compute per-scene metadata
    scene_meta = []
    for s_idx, scene in enumerate(scenes):
        dur = float(scene.get('durationInSeconds', 2.0))
        n_frames = max(1, int(round(dur * fps)))
        anim = scene.get('animationType', 'karaoke')
        bg_style = scene.get('background', 'gradient')
        c1 = hex_to_rgb(scene.get('backgroundColor', '#0f172a'))
        c2 = hex_to_rgb(scene.get('backgroundColor2', '#070f1a'))
        t_color = hex_to_rgb(scene.get('textColor', '#ffffff'))
        h_color = hex_to_rgb(scene.get('highlightColor', '#ffff00'))
        raw_words = scene.get('text', '').split() or ['…']
        t_type = transition_type_map.get(scene.get('transition', 'crossfade'), 'crossfade')
        # Resolve font style: scene overrides > render-time arg > palette default
        scene_font_style = scene.get('fontStyle') or font_style or STYLE_PALETTES.get(style, STYLE_PALETTES['minimal']).get('font', 'bold')

        # Pre-generate seeds for animated BGs
        particles = _generate_particle_seed(width, height, style) if bg_style == 'particles' else None
        bokeh_circles = _generate_bokeh_seed(width, height, style) if bg_style == 'bokeh' else None

        # Vibrant per-word colour map
        word_color_map = None
        if style == 'vibrant':
            word_color_map = {i: hex_to_rgb(VIBRANT_WORD_COLORS[i % len(VIBRANT_WORD_COLORS)])
                              for i in range(len(raw_words))}

        # Pre-render static BG (gradient, geometric, cinematic_bars, solid, radial)
        static_bg = None
        if bg_style in ('gradient', 'solid', 'radial', 'cinematic_bars', 'geometric'):
            style_key = f"{s_idx}_{bg_style}"
            if bg_style == 'gradient':
                static_bg = _make_gradient_bg(width, height, c1, c2)
            elif bg_style == 'solid':
                static_bg = _make_solid_bg(width, height, c1, c2)
            elif bg_style == 'radial':
                static_bg = _make_radial_bg(width, height, c1, c2)
            elif bg_style == 'cinematic_bars':
                static_bg = _make_cinematic_bars_bg(width, height, c1, c2, static_bg_cache, style_key)
            elif bg_style == 'geometric':
                static_bg = _make_geometric_bg(width, height, c1, c2, static_bg_cache, style_key)

        scene_meta.append({
            'dur': dur,
            'n_frames': n_frames,
            'anim': anim,
            'bg_style': bg_style,
            'c1': c1, 'c2': c2,
            'particles': particles,
            'bokeh_circles': bokeh_circles,
            'text_color': t_color,
            'highlight_color': h_color,
            'words': raw_words,
            'transition': t_type,
            'font_style': scene_font_style,
            'static_bg': static_bg,
            'word_color_map': word_color_map,
            'style_key': f"{s_idx}_{bg_style}",
        })

    total_frames = sum(m['n_frames'] for m in scene_meta)
    logger.info(f"Rendering {len(scenes)} scenes → {total_frames} frames @ {fps}fps  ({width}x{height})")

    # Per-frame renderer
    def render_scene_frame(sm: dict, frame_idx_in_scene: int, abs_frame_idx: int) -> np.ndarray:
        frame_t = frame_idx_in_scene / max(1, sm['n_frames'])
        dur = sm['dur']
        word_t = frame_t * dur
        words = sm['words']
        n_words = len(words)
        word_duration = dur / max(1, n_words)
        active_word_idx = min(n_words - 1, int(word_t / max(0.001, word_duration)))
        time_in_word = (word_t - active_word_idx * word_duration) / max(0.001, word_duration)
        frame_local_t = max(0.0, min(1.0, time_in_word))

        # Background
        bg_style = sm['bg_style']
        if sm['static_bg'] is not None:
            bg = sm['static_bg']
        elif bg_style == 'particles':
            bg = _make_particles_bg(width, height, sm['c1'], sm['c2'], abs_frame_idx, sm['particles'])
        elif bg_style == 'aurora':
            bg = _make_aurora_bg(width, height, sm['c1'], sm['c2'], abs_frame_idx)
        elif bg_style == 'bokeh':
            bg = _make_bokeh_bg(width, height, sm['c1'], sm['c2'], sm['bokeh_circles'], abs_frame_idx)
        elif bg_style == 'glitch_lines':
            bg = _make_glitch_lines_bg(width, height, sm['c1'], sm['c2'], abs_frame_idx)
        else:
            bg = _make_gradient_bg(width, height, sm['c1'], sm['c2'])

        return _render_text_frame(
            bg_frame=bg,
            words=words,
            active_word_idx=active_word_idx,
            text_color=sm['text_color'],
            highlight_color=sm['highlight_color'],
            style=style,
            animation=sm['anim'],
            font_style=sm['font_style'],
            frame_local_t=frame_local_t,
            word_t=word_t,
            scene_duration=dur,
            font_size=font_size,
            width=width,
            height=height,
            word_color_map=sm.get('word_color_map'),
        )

    # Open FFmpeg pipe
    ffmpeg_args = [
        ffmpeg_cmd,
        '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{width}x{height}',
        '-pix_fmt', 'rgb24',
        '-r', str(fps),
        '-i', 'pipe:0',
        '-vcodec', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        output_path,
    ]

    proc = None
    try:
        proc = subprocess.Popen(
            ffmpeg_args,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )

        frames_written = 0
        prev_last_frame = None

        for scene_idx, sm in enumerate(scene_meta):
            n_frames = sm['n_frames']
            transition = sm['transition']

            frame_results = [None] * n_frames

            def _job(fi, sm=sm, base=frames_written):
                return fi, render_scene_frame(sm, fi, base + fi)

            with ThreadPoolExecutor(max_workers=max_workers) as pool:
                futures = {pool.submit(_job, fi): fi for fi in range(n_frames)}
                for future in as_completed(futures):
                    fi, frame = future.result()
                    frame_results[fi] = frame

            # Apply entrance transition
            if prev_last_frame is not None and transition != 'none' and n_frames >= TRANSITION_FRAMES:
                for tf in range(TRANSITION_FRAMES):
                    t_val = tf / TRANSITION_FRAMES
                    if transition == 'crossfade':
                        blended = _crossfade(prev_last_frame, frame_results[tf], t_val)
                    elif transition == 'slide_right':
                        blended = _slide_transition(prev_last_frame, frame_results[tf], t_val, 'right')
                    elif transition == 'slide_left':
                        blended = _slide_transition(prev_last_frame, frame_results[tf], t_val, 'left')
                    else:
                        blended = frame_results[tf]
                    frame_results[tf] = blended

            # Write frames to FFmpeg
            for frame in frame_results:
                proc.stdin.write(frame.tobytes())
                frames_written += 1

            prev_last_frame = frame_results[-1].copy()

            if progress_callback:
                pct = int((scene_idx + 1) / len(scene_meta) * 95)
                progress_callback(pct)

        proc.stdin.close()
        _, ffmpeg_err = proc.communicate()
        ret = proc.returncode

        if ret != 0:
            err_msg = ffmpeg_err.decode('utf-8', errors='replace') if ffmpeg_err else 'unknown'
            raise RuntimeError(f"FFmpeg exited with code {ret}:\n{err_msg}")

        if progress_callback:
            progress_callback(100)

        logger.info(f"Video written to {output_path}  ({frames_written} frames)")

    except Exception:
        if proc and proc.stdin and not proc.stdin.closed:
            try:
                proc.stdin.close()
            except Exception:
                pass
        if proc:
            proc.wait()
        raise
    finally:
        if proc and proc.poll() is None:
            proc.terminate()
