// LUMEN DRIFT — tuning constants in one place: the field, the ship, the foes, the waves.
// Every number the game balances by lives here, so world.js and render.js share one truth.

export const FIELD = {
  width: 1280,
  height: 800,
  wall: 26, // soft margin the ship and foes bounce inside
};

export const SHIP = {
  radius: 13,
  speed: 265, // px per second
  accel: 2400,
  friction: 6.5, // exponential damping per second
  hull: 100, // hit points
  fireRate: 7.5, // shots per second while firing
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 4,
  dashSpeed: 880,
  dashTime: 0.16, // seconds of dash
  dashCooldown: 1.6, // seconds between dashes
  hurtCooldown: 0.55, // seconds of mercy invulnerability after a hit
};

export const FOE = {
  shard: { radius: 14, hp: 2, speed: 92, damage: 12, score: 60, colour: '#ff5d7a' },
  weaver: { radius: 12, hp: 1, speed: 128, damage: 10, score: 90, colour: '#ffb84d' },
  bulwark: { radius: 30, hp: 9, speed: 44, damage: 20, score: 240, colour: '#c792ff' },
};

// Eight waves; clear them all and the dawn is ignited (a win). Counts grow and mix widens.
export const WAVES = [
  { shards: 5, weavers: 0, bulwarks: 0 },
  { shards: 7, weavers: 2, bulwarks: 0 },
  { shards: 8, weavers: 4, bulwarks: 1 },
  { shards: 10, weavers: 5, bulwarks: 1 },
  { shards: 11, weavers: 7, bulwarks: 2 },
  { shards: 13, weavers: 8, bulwarks: 2 },
  { shards: 15, weavers: 10, bulwarks: 3 },
  { shards: 17, weavers: 12, bulwarks: 4 },
];

export const PICKUP = {
  coreValue: 25, // score per lumen core, before the combo multiplier
  coreHeal: 0,
  heartHeal: 26, // hull restored by a repair heart
  dropHeartChance: 0.16, // chance a destroyed foe drops a heart instead of cores
  coresPerFoe: 2,
  magnetRadius: 120, // cores drift to the ship inside this range
  lifetime: 11, // seconds before a pickup fades
};

export const COMBO = {
  window: 2.6, // seconds to keep the chain alive
  maxMultiplier: 8,
};

export const STEP = 1 / 60; // fixed simulation step, seconds

// The palette: deep night indigo, lumen cyan, ember magenta, dawn amber.
export const COLOURS = {
  bgTop: '#070b1e',
  bgBottom: '#131038',
  star: '#aebfff',
  ship: '#5ff2ff',
  shipCore: '#eaffff',
  bullet: '#aefcff',
  core: '#ffe066',
  heart: '#ff7aa8',
  text: '#e8ecff',
  dim: '#8b93b8',
  danger: '#ff5d7a',
  dawn: '#ffb84d',
};
