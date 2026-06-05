# 🎮 JUASEON DASH

A neon, Gen-Z-flavored rhythm platformer inspired by *Geometry Dash* — built from scratch with plain HTML5 Canvas + the Web Audio API. **No build tools, no dependencies.**

Auto-run, one-touch control, instant restart, three hand-crafted stages, 11 playable neon icons, and original procedural funk that pulses with the gameplay.

## ▶️ Play

**Option A — just open it:** double-click `index.html`.

**Option B — local server** (recommended, mirrors GitHub Pages):
```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## 🕹️ Controls (same as Geometry Dash)

| Action | Keys |
| --- | --- |
| Jump / thrust / flip | `Space` · `↑` · `W` · **Click** · **Tap** |
| Start / confirm | `Enter` (or click) |
| Pause / back | `Esc` |
| Navigate menus | `←` `→` + click |
| Mute | `M` (or the 🔊 button) |

**Modes:** *Cube* — tap to jump · *Jetpack* — hold to fly up · *Ball* — tap to flip gravity. Portals switch your mode mid-run.

## 🌟 Features

- **3 stages**, each with its own theme + original music loop
  - **Neon Rush** — classic cube
  - **Jetstream Cave** — cube + jetpack, glowing ice + chains + water
  - **Chaos Circuit** — cube · ball · jetpack mix, electric green/magenta
- **11 selectable characters**, all drawn programmatically with neon glow
- **Jump orbs, jump pads, saw blades, mode & gravity portals**
- **Procedural soundtrack** (Web Audio): drums + bass + lead, beat-synced screen flash
- **Progress bar, attempt counter, instant restart**, best-% + unlock progression (saved in `localStorage`)

## 🚀 Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. **Settings → Pages → Branch:** `main` / root → **Save**.
3. Play at `https://<you>.github.io/<repo>/`.

Because everything uses classic `<script>` tags (no ES modules / bundler), it runs identically locally and on Pages.

## 🛠️ Tech & structure

Vanilla JS on a single global `JD` namespace.

```
index.html          shell + UI overlays
css/style.css       neon theme
js/audio.js         Web Audio music + SFX
js/characters.js    11-character roster + art
js/levels.js        stage data + theme palettes
js/entities.js      obstacle drawing
js/render.js        background, parallax, particles
js/player.js        player state
js/engine.js        loop, physics, collision, state
js/main.js          screen flow + input
```

## 📝 Notes

JUASEON DASH is an original game. It is *inspired by* Geometry Dash but ships no assets from it — all art is canvas-drawn and all music is synthesized at runtime.
