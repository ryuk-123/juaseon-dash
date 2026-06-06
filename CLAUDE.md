# CLAUDE.md — JUASEON DASH

Project memory so we can resume seamlessly. Read this first.

## What this is
**JUASEON DASH** — an original Geometry-Dash-style neon rhythm platformer, built from
scratch in vanilla JS (HTML5 Canvas + Web Audio). No build tools, no dependencies.
Gen-Z aesthetic. Inspired by Geometry Dash + the song "Back on Track" by DJVI (music vibe).

- **Live game:** https://ryuk-123.github.io/juaseon-dash/ (GitHub Pages)
- **Repo:** https://github.com/ryuk-123/juaseon-dash  (branch: `main`)
- **Local folder:** `C:\Users\Alex\ClaudeProjects\Game test\Jua Dash test`
- Reference images (`reference*.png/jpg`) are gitignored — Geometry Dash screenshots used as design targets.

## How to run / preview / verify
- Open `index.html` directly OR serve: `python -m http.server 8000`.
- Preview config: `.claude/launch.json` defines server name `juaseon-dash` (port 8000) for the Claude Preview MCP.
- Verify visually with preview_screenshot; verify logic with preview_eval against the global `JD` object.
  - NOTE: preview_screenshot occasionally hangs/times out — `preview_stop` then `preview_start` recovers it.
  - To screenshot transient particles, freeze them in eval (set vx/vy/grav=0, hold life) since the fade loop keeps running.

## Architecture (all classic `<script>` tags → works on file:// AND GitHub Pages; single global `JD` namespace)
```
index.html        shell + UI overlays (title, char-select, stage-select, HUD, win/pause, mute btn)
css/style.css     neon theme
js/audio.js       Web Audio 3-genre EDM engine (eurodance/future-bass/dubstep) + SFX
js/characters.js  11-character roster + canvas art + trail assignment
js/levels.js      3 stage defs + theme palettes + buildLevel()
js/entities.js    obstacle drawing (block, spike, orb, pad, saw, portal)
js/render.js      background, parallax, particles, per-character TRAILS, drawScene()
js/player.js      player state + resetPlayer (gravDir)
js/engine.js      loop, physics (cube/jetpack/ball + gravDir), collision, state, sfx hooks
js/main.js        screen-flow state machine, input, persistence, audio wiring, RAF loop
```

## Gameplay status
- **8 stages (expanding to 20 — see roadmap below).** 1 NEON RUSH · 2 JETSTREAM CAVE · 3 CHAOS CIRCUIT (original trilogy) · **4 SUNSET SPRINT · 5 VAPOR DRIFT · 6 MINI MIRAGE** (Sunset world, THEME_SUNSET) · **7 GLITCH GATE · 8 SYSTEM SHOCK** (Glitch world, THEME_GLITCH).
- **Per-stage speed ramp**: `JD.LEVELS[i].speed` (360 → 505 over stages 1→15), set into `JD.config.speed` in `startStage`. Stages 16-20 planned up to ~540.
- **Modes**: cube (tap jump) · jetpack (hold thrust) · ball (tap flip gravity). Mode + gravity-flip portals.
- **Mechanics**: jump orbs, jump pads, saw blades, instant-death spikes/sides, instant restart, progress % + attempt counter, win screen, stage unlock + best% in localStorage.
- **11 characters** (canvas-drawn neon): cube/ball shapes, distinct faces. Default per theme but user choice persists.
- **Controls (GD-style)**: Jump/thrust/flip = Space/↑/W/Click/Tap · Start/confirm = Enter · Pause/back = Esc · Menu nav = ←/→ · Mute = M or 🔊 button.

## Recent additions (post-milestones)
- **Stages 9-15 + checkpoint gate + party-music pass** — this session (2026-06-05). All additive, no engine API changes.
  - **7 new stages** (`levels.js`): **9 DATA STORM · 10 FIREWALL** (Glitch world, THEME_GLITCH) · **11 AURORA ASCENT · 12 FROST BYTE · 13 POLAR PULSE · 14 WHITEOUT** (new **THEME_AURORA** — glacial ice-blue/violet) · **15 EMBER GATE** (new **THEME_INFERNO** — magma red/orange). Speeds 460→505. Each stage features its roadmap toy (dual-speed, dash chains, grav-orb chains, mini+jetpack tunnels, timed moving saws, speed swings, black-orb slams). **Still need a human playtest pass for spacing/difficulty fine-tuning — bots can't dodge-test.**
  - **Checkpoint now gated to the 6th attempt** (user request): `engine.js` adds `JD.stageFails` (reset in `startStage`) + `JD.CHECKPOINT_AFTER=5`. Deaths 1-5 on a stage → full restart from start; from the 6th death on (and still only stage `id>=3`, past 50%) → mid-checkpoint respawn. Verified via eval loop.
  - **Party-music pass** (user: "powerful strong-melody EDM party"): new tracks `s8…s14` in `audio.js` (DATA STORM/FIREWALL=dubstep; AURORA…WHITEOUT=future-bass/melodic-festival w/ new euphoric hooks `L.fut4-7`; EMBER GATE=eurodance big-room anthem `L.euro4`). PLUS a global **energy "punch-up"** to the shared engine that lifts ALL stages 1-15: master 0.9→0.95, lead vols up (euro .27→.30, future .26→.29, dub .24→.27) + brighter lead filter (4200→4800Hz), deeper club sidechain (duck floor .22→.18). Old stage-1-8 *note data* was left intact (user had tuned it by ear) — only the mix/energy was lifted. **Verify the new melodies by ear; tweak hooks/roots in `L.*`/`TRACKS` to taste.**
  - Cache-bust bumped to **`?v=4`**.
- **20-stage expansion + new toys (stages 4-8)** — prior session. Plan file: `C:\Users\Alex\.claude\plans\lets-open-and-adjust-glowing-snail.md` (full 20-stage roadmap: 5 worlds of ~4, speed 360→540, new theme per world). New engine mechanics, all additive:
  - **Per-stage speed** + **speed portals** (`SP(x,mult)`, kind `'speed'`; `p.speedMul`; fast=orange/slow=cyan gate).
  - **Moving saws**: `SAW(x,y,{ax:'v',amp,spd})` → engine oscillates `o.cy = o.cy0 + sin(time*spd)*amp*tile`.
  - **Mini-mode portal** (`P(x,'mini'|'big')`): `p.mini`, `p.size = playerSize*0.6`.
  - **Orb kinds** (`O(x,y,kind)`): `jump`(yellow) · `grav`(blue, flips gravity any mode) · `dash`(green, up+forward burst via `p.dashTimer`) · `down`(purple, slam toward gravity). Colours/glyphs in `entities.js drawOrb`.
  - **Mid-level checkpoint respawn** (`engine.js`): stages `id>=3`, death past 50% → `findCheckpoint`/`isSpotSafe`/`modeStateAt` find a safe nearby spot (recovering mode/grav/mini/speed by replaying portals), then `beginRunAt` does a drop-in + `'countdown'` state (3·2·1, `#countdown` overlay in `main.js`, count/go sfx). Before 50% or stage 1-2 → normal full restart.
  - Audio `TRACKS.s3…s7` added (else `play('s'+idx)` crashes). Stage-select grid now wraps+scrolls (`.stage-grid`).
  - **Difficulty NOTE**: stage layouts use conservative spacing modeled on the proven STAGE2/3, but the new toys (esp. moving saws, mini corridors, grav/dash chains) still need a human playtest pass for fine tuning — bots can't dodge-test.
- **3-genre EDM music** (this session, replaced the single transposed electro-house track): `audio.js` is now a genre-dispatched step sequencer. Each stage = its own track `{genre,bpm,root,prog,lead?,wob?}` with a distinct chord progression + hook. Mapping by world: **stages 1-3 = EURODANCE/hands-up** (`_stepEuro`: four-on-floor, offbeat saw bass `_bassOff` + supersaw stabs, anthem `_super` lead) · **4-6 = FUTURE BASS** (`_stepFuture`: sidechained detuned `_chord`, `_pluck` vocal-chops, trap hats, `_snare`) · **7-8 = DUBSTEP** (`_stepDub`: half-time kick + snare-on-3, LFO `_wobble` bass w/ waveshaper drive, growl stabs). Shared pump/reverb/delay bus kept. Beat pulse → `JD.audioPulse` still drives bg flash (now on kicks + dub snares).
  - **Melody-first** (user feedback: first pass was "beat-like/bland"): each stage's `lead` in `L.*` is a catchy, continuous motif-based hook (call/response, 21-44 notes per 4-bar loop). Warm `_lead` voice (detuned saws+triangle+sub octave+vibrato → pump/reverb/delay) carries it up-front at vol ~0.24-0.27; stabs/hats pulled back to support. `_noteLen` makes notes legato to the next note. **The melodies/mix are the main thing to iterate on by ear.**
  - NOTE: music quality is tuned BY EAR with the user — Claude can verify it plays error-free but cannot hear it.
- **Asset cache-busting**: `index.html` script/css tags carry `?v=N` (currently `v=2`). **BUMP this number whenever you change any `js/*.js` or `css/style.css`** so the browser (and GitHub Pages users) fetch fresh files — this is what fixes the old "hard-refresh to get new code" pain. Preview MCP also caches: a normal `location.reload()` may reuse old JS, so to verify edits either bump `?v=` or do `preview_stop`+`preview_start` for a clean browser context.
- **Per-character movement trails** (commit d5c5969): each char has a `trail` key. `render.js` TRAILS config + emitTrail/updateTrail/drawTrail. Styles: BYTE=spark, BLAZE=fire+smoke, CHOMP=toxic, VOID=plasma, GNARL=star, FIZZ=bubble, PEEK=rainbow, COG=streak, FROST=frost, SLY=ember, REX=pixel. Emitted behind player in all modes; cleared on restart.

## Git / GitHub state (as of last session)
- User (ryuk-123) is a Git beginner — walk through commands step by step; they run pushes themselves in their own PowerShell.
- Git identity set globally to: name `Alex`, email `ryuk-123@users.noreply.github.com` (private noreply — keeps real Gmail out of public commits).
- **I (Claude) cannot run `git push`** — it's blocked by the safety classifier. I commit locally; the USER pushes.
- Commit message footer required: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- As of last check: local and origin/main fully in sync at d5c5969 (all work pushed & live).
- Common beginner confusion: the repo page = code; `ryuk-123.github.io/juaseon-dash/` = playable game. After a push, Pages rebuilds ~1-2 min; tell them to **hard-refresh (Ctrl+Shift+R)** to bust browser cache of old .js.

## Likely next ideas (not yet done)
- **Author stages 16-20** (names/themes/featured-toys locked in the plan file; layouts TBD). Inferno world continues (16-18, THEME_INFERNO exists); Finale 19-20 still needs new palette **THEME_VOID**.
- **Human playtest + difficulty tuning of stages 4-15** — spacing of moving saws / mini corridors / grav-dash chains / speed swings. Layouts use the proven STAGE2/3/8 spacing envelope but are bot-untested.
- **Tune the new music (s8-s14) by ear** — adjust hooks (`L.fut4-7`, `L.euro4`, `L.dub3-4`), roots, bpm, or the global energy-lift constants in `audio.js` to taste.
- Stage-select polish: card BEST% line is slightly clipped at 8 cards; consider per-world section labels.
- Grav-orb glyph reads as a single down-arrow — a double-headed (↕) arrow would signal "flip" more clearly.
- Trail tuning, per-world music character (darker glitch / hyperpop), buildup-then-drop intro, mobile polish.

## Working style for this project
Build in milestones; after each, report done + ask permission before next. Be token-efficient.
Verify in-browser (preview MCP) before declaring done. User is non-technical on git/deploy — explain clearly.
