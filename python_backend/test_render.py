"""
Comprehensive render test - verifies all new engine features.
Run from: d:\\vscode\\Typography app\\python_backend
    py test_render.py
"""
import os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from services.video_engine import segment_script_local, render_video_local

# --- Test 1: Retro style + aurora bg + pop_up animation ---
SCRIPT = "[0-3 sec] Wake Up [3-6 sec] Level Up [6-9 sec] Never Stop"
STYLE = "retro"
ANIMATION = "pop_up"
BACKGROUND = "aurora"
TRANSITIONS = "crossfade"
FONT_STYLE = "impact"
OUTPUT = os.path.join(os.path.dirname(__file__), "test_output.mp4")

print("=" * 60)
print("TEST 1: Retro / Aurora / Pop-Up / Impact Font")
print("=" * 60)
print("Segmenting script...")
scenes = segment_script_local(
    SCRIPT, STYLE, target_duration=9,
    background=BACKGROUND, effects="none",
    transitions=TRANSITIONS, animation=ANIMATION,
    font_style=FONT_STYLE,
)
print(f"Got {len(scenes)} scenes: {[s['text'] for s in scenes]}")
print(f"Font style in scene: {scenes[0].get('fontStyle')}")

def on_progress(pct):
    sys.stdout.write(f"\r  Progress: {pct}%   ")
    sys.stdout.flush()

print("Rendering video...")
t0 = time.time()
try:
    render_video_local(
        OUTPUT, scenes, STYLE, "9:16",
        progress_callback=on_progress,
        fps=24, font_size=90,
        font_style=FONT_STYLE,
    )
    elapsed = time.time() - t0
    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f"\nDONE in {elapsed:.1f}s  ({size_kb:.0f} KB)  -> {OUTPUT}")
except Exception as e:
    import traceback
    print(f"\nERROR: {e}")
    traceback.print_exc()
    sys.exit(1)

# --- Test 2: Vibrant style + glitch animation + geometric bg ---
print()
print("=" * 60)
print("TEST 2: Vibrant / Geometric / Glitch / Bold Font")
print("=" * 60)
OUTPUT2 = os.path.join(os.path.dirname(__file__), "test_output2.mp4")
scenes2 = segment_script_local(
    "New era. New sound. Drops tonight. Are you ready?",
    "vibrant", target_duration=8,
    background="geometric", effects="none",
    transitions="slide_left", animation="glitch",
    font_style="bold",
)
print(f"Got {len(scenes2)} scenes, rendering...")
t0 = time.time()
try:
    render_video_local(
        OUTPUT2, scenes2, "vibrant", "9:16",
        progress_callback=on_progress,
        fps=24, font_size=80,
        font_style="bold",
    )
    elapsed = time.time() - t0
    size_kb = os.path.getsize(OUTPUT2) / 1024
    print(f"\nDONE in {elapsed:.1f}s  ({size_kb:.0f} KB)  -> {OUTPUT2}")
except Exception as e:
    import traceback
    print(f"\nERROR: {e}")
    traceback.print_exc()
    sys.exit(1)

print()
print("All tests passed! ✅")
