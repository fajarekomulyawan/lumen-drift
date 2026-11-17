// LUMEN DRIFT — the shell around the world: canvas, the fixed-step loop, the screen
// state machine (title → play → win/over → restart), and turning world events into
// sound. With ?shot=<scene>&seed=<n> in the URL it instead stages one deterministic
// screenshot scene, which is how the entry's screenshots were taken.

import { FIELD, STEP } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { World, EVENT_DASH, EVENT_FOE_DOWN, EVENT_HEART, EVENT_HURT, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE, EVENT_WIN } from './world.js';
import { drawScene, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? '1') || 1;

let best = 0;
try {
  best = Number(window.localStorage.getItem('lumen-drift-best') ?? '0') || 0;
} catch {
  best = 0;
}
function rememberBest(score) {
  best = Math.max(best, score);
  try {
    window.localStorage.setItem('lumen-drift-best', String(best));
  } catch {
    // Private modes may refuse storage; the best score then lasts the session.
  }
}

// --- Screenshot mode: stage one scene, draw it, and stop.
if (params.has('shot')) {
  const world = new World(seed);
  const staged = stageShot(params.get('shot'), world);
  rememberBest(staged.best);
  drawScene(ctx, world, staged.screen, best);
  window.__shotReady = { scene: staged.screen, score: world.score, outcome: world.outcome };
} else {
  play();
}

function play() {
  const input = new Input(canvas, FIELD);
  const sounds = new SoundBank();
  let world = new World((Math.random() * 1e9) >>> 0);
  let screen = SCREEN_TITLE;
  let paused = false;
  let attractTimer = 0;

  function announce(message) {
    if (status) status.textContent = message;
  }

  function startRun() {
    world = new World((Math.random() * 1e9) >>> 0);
    screen = SCREEN_PLAY;
    paused = false;
    announce('Wave 1. Survive all eight waves to ignite the dawn.');
  }

  function playEvents(events) {
    if (events & EVENT_SHOOT) sounds.shoot();
    if (events & EVENT_DASH) sounds.dash();
    if (events & EVENT_FOE_DOWN) sounds.foeDown();
    if (events & EVENT_PICKUP) sounds.pickup();
    if (events & EVENT_HEART) sounds.heart();
    if (events & EVENT_HURT) sounds.hurt();
    if (events & EVENT_WAVE) sounds.waveStart();
    if (events & EVENT_WIN) sounds.win();
    if (events & EVENT_OVER) sounds.lose();
  }

  function controlFromInput() {
    return {
      move: input.moveVector(),
      aim: { x: input.mouseX, y: input.mouseY },
      fire: input.firing,
      dash: input.down('ShiftLeft', 'ShiftRight', 'Space'),
    };
  }

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25; // a stalled tab must not teleport the world
    accumulator += elapsed;

    if (input.consume('KeyM')) {
      sounds.toggleMute();
    }
    if (input.consume('KeyP') && screen === SCREEN_PLAY) {
      paused = !paused;
      announce(paused ? 'Paused.' : 'Resumed.');
    }

    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (screen === SCREEN_TITLE) {
        // The night drifts behind the title: foes hunt a ship that steers itself
        // in a slow circle and never fires.
        attractTimer += STEP;
        const drift = {
          move: { x: Math.cos(attractTimer * 0.6), y: Math.sin(attractTimer * 0.6) },
          aim: { x: world.ship.x + Math.cos(attractTimer * 0.6 + 1.2) * 90, y: world.ship.y + Math.sin(attractTimer * 0.6 + 1.2) * 90 },
          fire: false,
          dash: false,
        };
        world.step(STEP, drift);
        if (world.outcome) world.reset((Math.random() * 1e9) >>> 0);
      } else if (screen === SCREEN_PLAY && !paused) {
        const events = world.step(STEP, controlFromInput());
        playEvents(events);
        if (world.outcome === 'won') {
          rememberBest(world.score);
          screen = SCREEN_WIN;
          announce(`Dawn ignited. Final score ${world.score}. Press R to play again.`);
        } else if (world.outcome === 'over') {
          rememberBest(world.score);
          screen = SCREEN_OVER;
          announce(`The light fades on wave ${world.waveDisplay}. Score ${world.score}. Press R to try again.`);
        }
      } else {
        // End screens: let particles and pickups settle behind the panel.
        world.step(STEP, { move: { x: 0, y: 0 }, aim: { x: world.ship.x + 40, y: world.ship.y }, fire: false, dash: false });
      }
    }

    // Starting and restarting read the same gestures on every screen.
    if (screen === SCREEN_TITLE && (input.consume('Enter') || input.consume('Pointer'))) {
      sounds.unlock();
      startRun();
    } else if ((screen === SCREEN_OVER || screen === SCREEN_WIN) &&
               (input.consume('KeyR') || input.consume('Enter') || input.consume('Pointer'))) {
      sounds.unlock();
      startRun();
    }
    if (input.consume('Pointer')) sounds.unlock();

    drawScene(ctx, world, screen, best);
    if (paused) {
      ctx.save();
      ctx.fillStyle = 'rgba(4, 6, 18, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#e8ecff';
      ctx.font = '800 40px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
      ctx.restore();
    }
  }
  requestAnimationFrame(frame);
}
