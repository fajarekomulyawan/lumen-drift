# lumen-drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/fajarekomulyawan/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/fajarekomulyawan/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Drift** — an original neon arena survival game for the desktop browser. Pilot the last light-ship through eight waves of void shards: shatter them, harvest the lumen they drop, chain combos, dash through danger, and survive the whole night to ignite the dawn. Plain static files and vanilla JavaScript modules — no library, no build step, no network — with every sound synthesised live in WebAudio.

- **Move** with WASD or the arrow keys, **aim** with the mouse, **hold click** to fire
- **Dash** with Shift or Space: a burst of speed that makes you untouchable
- Three shard kinds — chasing Shards, weaving Weavers, armoured Bulwarks — across 8 escalating waves
- Lumen cores raise your combo multiplier; repair hearts restore hull; a full HUD tracks hull, dash, wave, score and combo

## Run it

```sh
python3 -m http.server 8080 --directory game   # then open http://localhost:8080 in desktop Chrome
node main.ts                                    # or hand the game in: copies game/ + screenshots/ to /output and writes dossier.json
```

The source is split by job: `game/src/config.js` (tuning), `random.js` (seeded RNG), `input.js` (keyboard/mouse), `audio.js` (synth sound), `world.js` (the simulation), `render.js` (every pixel), `shots.js` (deterministic screenshot scenes) and `main.js` (the shell and screen flow).

---

<sub>Entered on [make.fun](https://make.fun/?ref=cxst033q&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
