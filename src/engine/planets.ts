import * as THREE from 'three';
import type { BiomeId, LandingSite, PlanetId } from '../types/simulation';

export interface PlanetConfig {
  id: PlanetId;
  biome: BiomeId;
  seed: number;
  name: string;
  tagline: string;
  spacePos: THREE.Vector3;
  radius: number;
  orbitRange: number;
  atmosphereColor: string;
  ringColor?: string;
  hasMoon?: boolean;
  isFlatDome?: boolean;
  accentHex: string;
  precipType: 'rain' | 'snow' | 'dust' | 'spores';
}

const SECTOR_SIZE = 1450;

export const STARTER_PLANETS: PlanetConfig[] = [
  {
    id: 'coruscant',
    biome: 'coruscant',
    seed: 101,
    name: 'Корускант',
    tagline: 'Экуменополис · Шпили и неоновые каньоны',
    spacePos: new THREE.Vector3(0, 0, 0),
    radius: 175,
    orbitRange: 440,
    atmosphereColor: '#f59e0b',
    hasMoon: true,
    accentHex: '#f59e0b',
    precipType: 'rain',
  },
  {
    id: 'earth',
    biome: 'earth',
    seed: 777,
    name: 'Земля',
    tagline: 'Плоский мир под куполом · Москва, Солнце и Луна',
    spacePos: new THREE.Vector3(-440, 65, -520),
    radius: 172,
    orbitRange: 445,
    atmosphereColor: '#60a5fa',
    isFlatDome: true,
    accentHex: '#ef4444',
    precipType: 'rain',
  },
  {
    id: 'kryos',
    biome: 'kryos',
    seed: 202,
    name: 'Неон-Криос',
    tagline: 'Ледяные кристаллы · Северное сияние',
    spacePos: new THREE.Vector3(880, 90, -1050),
    radius: 155,
    orbitRange: 410,
    atmosphereColor: '#38bdf8',
    ringColor: '#bae6fd',
    accentHex: '#38bdf8',
    precipType: 'snow',
  },
  {
    id: 'solaris',
    biome: 'solaris',
    seed: 303,
    name: 'Соларис-Дюн',
    tagline: 'Золотые монолиты · Солнечные каньоны',
    spacePos: new THREE.Vector3(-940, -60, -1120),
    radius: 165,
    orbitRange: 425,
    atmosphereColor: '#fb923c',
    ringColor: '#fed7aa',
    accentHex: '#fb923c',
    precipType: 'dust',
  },
  {
    id: 'verdant',
    biome: 'verdant',
    seed: 404,
    name: 'Вердана-IX',
    tagline: 'Изумрудные сады · Биолюминесценция',
    spacePos: new THREE.Vector3(80, 140, -1950),
    radius: 160,
    orbitRange: 420,
    atmosphereColor: '#34d399',
    hasMoon: true,
    accentHex: '#34d399',
    precipType: 'spores',
  },
];

export const PLANETS: PlanetConfig[] = STARTER_PLANETS;

const planetRegistry = new Map<PlanetId, PlanetConfig>();
for (const p of STARTER_PLANETS) {
  planetRegistry.set(p.id, p);
}

export function getPlanetLandingSites(planetId: PlanetId): LandingSite[] {
  const cfg = getPlanetConfig(planetId);
  if (planetId === 'earth') {
    return [
      {
        id: 'earth_moscow_square',
        name: 'Москва · Красная площадь',
        subtitle: 'Кремль, Спасская башня и собор · Прогулка пешком',
        x: 0,
        z: 0,
        accentHex: '#ef4444',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'earth_moscow_streets',
        name: 'Москва · Проспекты',
        subtitle: 'Улицы с потоком машин и оживлённые перекрёстки',
        x: 320,
        z: 0,
        accentHex: '#f59e0b',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'earth_serbos',
        name: 'Дом Сербоса',
        subtitle: 'Уютный дом у тихой дороги — подойдите к крыльцу',
        x: -320,
        z: 320,
        accentHex: '#34d399',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'earth_dome_edge',
        name: 'Край Земли · Ледяной купол',
        subtitle: 'Ледяная стена и сияющая граница купола мира',
        x: 0,
        z: -960,
        accentHex: '#38bdf8',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'earth_reptiloids',
        name: 'Город рептилоидов',
        subtitle: 'Тайный изумрудный мегаполис за ледяным барьером',
        x: 0,
        z: -1280,
        accentHex: '#10b981',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
    ];
  }

  if (planetId === 'coruscant') {
    return [
      {
        id: 'coruscant_spires',
        name: 'Центральные шпили',
        subtitle: 'Главный проспект, аэро-кафе, отель и ангар',
        x: 0,
        z: 0,
        accentHex: '#f59e0b',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'coruscant_park',
        name: 'Парковый проспект',
        subtitle: 'Аллеи, купол обсерватории и тихие скверы',
        x: 0,
        z: -320,
        accentHex: '#38bdf8',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'coruscant_serbos',
        name: 'Дом Сербоса',
        subtitle: 'Уютный особняк Сербоса на окраине сектора',
        x: -320,
        z: 320,
        accentHex: '#34d399',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
      {
        id: 'coruscant_fields',
        name: 'Зелёные поля и рощи',
        subtitle: 'Открытые луга, озёра и просёлочные дороги',
        x: 320,
        z: -320,
        accentHex: '#a3e635',
        screenX: 0,
        screenY: 0,
        inFront: true,
      },
    ];
  }

  return [
    {
      id: `${cfg.id}_center`,
      name: `${cfg.name} · Столица`,
      subtitle: 'Центральный сектор, кафе и небесный отель',
      x: 0,
      z: 0,
      accentHex: cfg.accentHex,
      screenX: 0,
      screenY: 0,
      inFront: true,
    },
    {
      id: `${cfg.id}_park`,
      name: 'Парковый бульвар',
      subtitle: 'Прогулочные скверы и планетарий',
      x: 0,
      z: -320,
      accentHex: '#38bdf8',
      screenX: 0,
      screenY: 0,
      inFront: true,
    },
    {
      id: `${cfg.id}_fields`,
      name: 'Природная долина',
      subtitle: 'Равнины, холмы и тихие озёра',
      x: 320,
      z: -320,
      accentHex: '#34d399',
      screenX: 0,
      screenY: 0,
      inFront: true,
    },
    {
      id: `${cfg.id}_observatory`,
      name: 'Пригородный маяк',
      subtitle: 'Тихий район у границы мегаполиса',
      x: -320,
      z: 320,
      accentHex: '#fbbf24',
      screenX: 0,
      screenY: 0,
      inFront: true,
    },
  ];
}

export function getLandingSiteSpaceWorldPos(
  planet: PlanetConfig,
  site: Pick<LandingSite, 'x' | 'z'>,
  out: THREE.Vector3,
): THREE.Vector3 {
  if (planet.isFlatDome) {
    const mapScale = (planet.radius * 0.78) / 1000;
    let dx = site.x * mapScale;
    let dz = site.z * mapScale;
    const len = Math.hypot(dx, dz);
    const maxR = planet.radius * 0.88;
    if (len > maxR && len > 0.001) {
      dx = (dx / len) * maxR;
      dz = (dz / len) * maxR;
    }
    return out.set(
      planet.spacePos.x + dx,
      planet.spacePos.y + planet.radius * 0.045,
      planet.spacePos.z + dz,
    );
  }

  const lat = THREE.MathUtils.clamp(0.45 - (site.z / 1200) * 0.55, -0.75, 1.15);
  const lon = (site.x / 1100) * 0.95;
  const r = planet.radius * 1.02;
  return out.set(
    planet.spacePos.x + r * Math.cos(lat) * Math.sin(lon),
    planet.spacePos.y + r * Math.sin(lat),
    planet.spacePos.z + r * Math.cos(lat) * Math.cos(lon),
  );
}

const NAME_PREFIXES = [
  'Аура',
  'Вега',
  'Лира',
  'Альтаир',
  'Орион',
  'Селена',
  'Элизиум',
  'Кассиопея',
  'Талис',
  'Аркадия',
  'Небула',
  'Хелиос',
  'Мира',
  'Кеплер',
  'Астра',
  'Зефир',
  'Ирида',
  'Тау',
  'Люмен',
  'Эос',
  'Сириус',
  'Стелла',
  'Валькирия',
  'Рея',
];

const NAME_SUFFIXES = [
  'Прайм',
  'Нова',
  'Люкс',
  'Скай',
  'Сити',
  'Дюн',
  'Криос',
  'Гарден',
  'Сфера',
  'Альфа',
  'Мир',
  'IV',
  'V',
  'VII',
  'IX',
  'XII',
  '34',
  '77',
];

const BIOME_LIST: BiomeId[] = ['coruscant', 'kryos', 'solaris', 'verdant', 'amethyst', 'crimson'];

const BIOME_META: Record<
  BiomeId,
  {
    taglines: string[];
    atmoColors: string[];
    ringColors: string[];
    precip: 'rain' | 'snow' | 'dust' | 'spores';
  }
> = {
  coruscant: {
    taglines: ['Неоновый мегаполис · Небесные трассы', 'Огни эстакад и парковые острова'],
    atmoColors: ['#f59e0b', '#38bdf8', '#fbbf24'],
    ringColors: ['#fde68a', '#93c5fd'],
    precip: 'rain',
  },
  earth: {
    taglines: ['Плоский мир под куполом · Москва и Солнце с Луной'],
    atmoColors: ['#60a5fa', '#93c5fd'],
    ringColors: ['#e0f2fe'],
    precip: 'rain',
  },
  kryos: {
    taglines: ['Кристальные льды · Голубое сияние', 'Снежные проспекты · Замёрзшие озёра'],
    atmoColors: ['#38bdf8', '#7dd3fc', '#60a5fa'],
    ringColors: ['#bae6fd', '#e0f2fe'],
    precip: 'snow',
  },
  solaris: {
    taglines: ['Янтарные каньоны · Тёплые дюны', 'Солнечные террасы · Золотой ветер'],
    atmoColors: ['#fb923c', '#f59e0b', '#fcd34d'],
    ringColors: ['#fed7aa', '#fde68a'],
    precip: 'dust',
  },
  verdant: {
    taglines: ['Изумрудные рощи · Био-огни', 'Живые долины · Тёплые озёра'],
    atmoColors: ['#34d399', '#10b981', '#a3e635'],
    ringColors: ['#a7f3d0', '#bef264'],
    precip: 'spores',
  },
  amethyst: {
    taglines: ['Аметистовые башни · Розовый туман', 'Кварцевые луга · Лиловый горизонт'],
    atmoColors: ['#c084fc', '#e879f9', '#f472b6'],
    ringColors: ['#f5d0fe', '#fbcfe8'],
    precip: 'spores',
  },
  crimson: {
    taglines: ['Багровые арки · Медные равнины', 'Закатные шпили · Красная долина'],
    atmoColors: ['#fb7185', '#f97316', '#f43f5e'],
    ringColors: ['#fecdd3', '#fed7aa'],
    precip: 'dust',
  },
};

function hash3(sx: number, sy: number, sz: number, salt = 0): number {
  let n = sx * 374761393 + sy * 668265263 + sz * 1442695041 + salt * 972364513;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function hashSeed(sx: number, sy: number, sz: number): number {
  let n = sx * 73856093 ^ sy * 19349663 ^ sz * 83492791;
  n = (n ^ (n >> 15)) * 2246822519;
  return Math.abs(n ^ (n >> 13)) % 2147483647 || 777;
}

function generateSectorPlanet(sx: number, sy: number, sz: number): PlanetConfig | null {
  if (sx === 0 && sy === 0 && sz === 0) return null;

  const id = `sec_${sx}_${sy}_${sz}`;
  const cached = planetRegistry.get(id);
  if (cached) return cached;

  const spawnRoll = hash3(sx, sy, sz, 11);
  if (spawnRoll < 0.22) return null;

  const seed = hashSeed(sx, sy, sz);
  const biome = BIOME_LIST[Math.floor(hash3(sx, sy, sz, 17) * BIOME_LIST.length) % BIOME_LIST.length];
  const meta = BIOME_META[biome];

  const pIdx = Math.floor(hash3(sx, sy, sz, 23) * NAME_PREFIXES.length) % NAME_PREFIXES.length;
  const sIdx = Math.floor(hash3(sx, sy, sz, 29) * NAME_SUFFIXES.length) % NAME_SUFFIXES.length;
  const name = `${NAME_PREFIXES[pIdx]}-${NAME_SUFFIXES[sIdx]}`;
  const tagline = meta.taglines[Math.floor(hash3(sx, sy, sz, 31) * meta.taglines.length) % meta.taglines.length];

  const jitterX = (hash3(sx, sy, sz, 41) - 0.5) * (SECTOR_SIZE * 0.54);
  const jitterY = (hash3(sx, sy, sz, 43) - 0.5) * (SECTOR_SIZE * 0.42);
  const jitterZ = (hash3(sx, sy, sz, 47) - 0.5) * (SECTOR_SIZE * 0.54);

  const px = sx * SECTOR_SIZE + jitterX;
  const py = sy * SECTOR_SIZE + jitterY;
  const pz = sz * SECTOR_SIZE + jitterZ;

  for (const sp of STARTER_PLANETS) {
    if (sp.spacePos.distanceToSquared(new THREE.Vector3(px, py, pz)) < 580 * 580) {
      return null;
    }
  }

  const radius = 140 + Math.round(hash3(sx, sy, sz, 53) * 48);
  const atmoColor =
    meta.atmoColors[Math.floor(hash3(sx, sy, sz, 59) * meta.atmoColors.length) % meta.atmoColors.length];
  const hasRing = hash3(sx, sy, sz, 61) > 0.52;
  const ringColor = hasRing
    ? meta.ringColors[Math.floor(hash3(sx, sy, sz, 67) * meta.ringColors.length) % meta.ringColors.length]
    : undefined;
  const hasMoon = hash3(sx, sy, sz, 71) > 0.44;

  const cfg: PlanetConfig = {
    id,
    biome,
    seed,
    name,
    tagline,
    spacePos: new THREE.Vector3(px, py, pz),
    radius,
    orbitRange: Math.round(radius * 2.58),
    atmosphereColor: atmoColor,
    ringColor,
    hasMoon,
    accentHex: atmoColor,
    precipType: meta.precip,
  };

  planetRegistry.set(id, cfg);
  return cfg;
}

export function getPlanetConfig(id: PlanetId): PlanetConfig {
  const existing = planetRegistry.get(id);
  if (existing) return existing;
  if (id.startsWith('sec_')) {
    const parts = id.split('_');
    if (parts.length === 4) {
      const sx = Number(parts[1]);
      const sy = Number(parts[2]);
      const sz = Number(parts[3]);
      if (Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz)) {
        const gen = generateSectorPlanet(sx, sy, sz);
        if (gen) return gen;
      }
    }
  }
  return STARTER_PLANETS[0];
}

export function getActiveSpacePlanets(spacePos: THREE.Vector3, maxCount = 24): PlanetConfig[] {
  const csx = Math.round(spacePos.x / SECTOR_SIZE);
  const csy = Math.round(spacePos.y / SECTOR_SIZE);
  const csz = Math.round(spacePos.z / SECTOR_SIZE);

  const collected: PlanetConfig[] = [];

  if (Math.abs(csx) <= 2 && Math.abs(csy) <= 2 && Math.abs(csz) <= 2) {
    collected.push(...STARTER_PLANETS);
  }

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const p = generateSectorPlanet(csx + dx, csy + dy, csz + dz);
        if (p) collected.push(p);
      }
    }
  }

  collected.sort((a, b) => a.spacePos.distanceToSquared(spacePos) - b.spacePos.distanceToSquared(spacePos));
  return collected.slice(0, maxCount);
}

function createFlatEarthDiscTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const cx = size / 2;
  const cy = size / 2;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d')!;

  const emissive = document.createElement('canvas');
  emissive.width = size;
  emissive.height = size;
  const ectx = emissive.getContext('2d')!;

  // Deep blue flat ocean base
  const oceanGrad = actx.createRadialGradient(cx, cy, size * 0.04, cx, cy, size * 0.48);
  oceanGrad.addColorStop(0, '#1e40af');
  oceanGrad.addColorStop(0.55, '#1d4ed8');
  oceanGrad.addColorStop(0.84, '#0f3d7a');
  oceanGrad.addColorStop(0.91, '#bae6fd');
  oceanGrad.addColorStop(1, '#f8fafc');
  actx.fillStyle = oceanGrad;
  actx.fillRect(0, 0, size, size);

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, size, size);

  // Stylized radial continents around the center
  const continents = [
    // Eurasia / Moscow cluster near center-right/top
    { x: 0.52, y: 0.48, rx: 0.14, ry: 0.11, rot: -0.25, col: '#2f7a44' },
    { x: 0.64, y: 0.44, rx: 0.11, ry: 0.08, rot: 0.3, col: '#3a884d' },
    { x: 0.44, y: 0.56, rx: 0.08, ry: 0.09, rot: 0.5, col: '#4a8f49' },
    // Africa-like warm continent
    { x: 0.5, y: 0.64, rx: 0.075, ry: 0.095, rot: 0.1, col: '#849442' },
    // Americas on left side
    { x: 0.28, y: 0.44, rx: 0.09, ry: 0.08, rot: -0.4, col: '#3b8249' },
    { x: 0.31, y: 0.65, rx: 0.055, ry: 0.095, rot: 0.2, col: '#2c7342' },
    // Australia / islands
    { x: 0.72, y: 0.66, rx: 0.06, ry: 0.045, rot: -0.2, col: '#a38246' },
  ];

  for (const c of continents) {
    actx.save();
    actx.translate(c.x * size, c.y * size);
    actx.rotate(c.rot);
    actx.fillStyle = c.col;
    actx.beginPath();
    actx.ellipse(0, 0, c.rx * size, c.ry * size, 0, 0, Math.PI * 2);
    actx.fill();
    actx.fillStyle = 'rgba(255,255,255,0.12)';
    actx.beginPath();
    actx.ellipse(-c.rx * size * 0.15, -c.ry * size * 0.15, c.rx * size * 0.55, c.ry * size * 0.45, 0, 0, Math.PI * 2);
    actx.fill();
    actx.restore();
  }

  // Antarctica outer ice ring around the edge of the Flat Earth disc
  actx.strokeStyle = '#f1f5f9';
  actx.lineWidth = size * 0.095;
  actx.beginPath();
  actx.arc(cx, cy, size * 0.465, 0, Math.PI * 2);
  actx.stroke();

  // Warm city lights (Moscow & global hubs)
  const cities = [
    { x: 0.5, y: 0.5, r: 9, col: '#ef4444' }, // Moscow center
    { x: 0.53, y: 0.47, r: 5, col: '#fbbf24' },
    { x: 0.46, y: 0.49, r: 5, col: '#fde047' },
    { x: 0.63, y: 0.45, r: 5, col: '#fbbf24' },
    { x: 0.29, y: 0.44, r: 5, col: '#fde047' },
    { x: 0.32, y: 0.64, r: 4, col: '#fbbf24' },
    { x: 0.5, y: 0.08, r: 7, col: '#10b981' }, // Reptiloid City behind the Ice Barrier
  ];
  for (const city of cities) {
    const g = ectx.createRadialGradient(city.x * size, city.y * size, 1, city.x * size, city.y * size, city.r * 2.2);
    g.addColorStop(0, city.col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ectx.fillStyle = g;
    ectx.beginPath();
    ectx.arc(city.x * size, city.y * size, city.r * 2.2, 0, Math.PI * 2);
    ectx.fill();
  }

  // Subtle ice edge shimmer
  ectx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
  ectx.lineWidth = 10;
  ectx.beginPath();
  ectx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
  ectx.stroke();

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(emissive);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;

  return { map, emissiveMap };
}

function createBiomeSurfaceTexture(
  biome: BiomeId,
  maxAnisotropy: number,
): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  if (biome === 'earth') {
    return createFlatEarthDiscTextures(maxAnisotropy);
  }

  const w = 1024;
  const h = 512;
  const albedo = document.createElement('canvas');
  albedo.width = w;
  albedo.height = h;
  const actx = albedo.getContext('2d')!;

  const emissive = document.createElement('canvas');
  emissive.width = w;
  emissive.height = h;
  const ectx = emissive.getContext('2d')!;

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  let seed =
    biome === 'coruscant'
      ? 11
      : biome === 'kryos'
        ? 22
        : biome === 'solaris'
          ? 33
          : biome === 'verdant'
            ? 44
            : biome === 'amethyst'
              ? 55
              : 66;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  if (biome === 'coruscant') {
    actx.fillStyle = '#141923';
    actx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 10 + rand() * 38;
      actx.fillStyle = rand() > 0.5 ? '#1f2937' : '#2b241d';
      actx.fillRect(x, y, r, r * 0.6);

      ectx.fillStyle = rand() > 0.25 ? '#f59e0b' : '#38bdf8';
      ectx.globalAlpha = 0.35 + rand() * 0.65;
      ectx.fillRect(x + 2, y + 2, r * 0.7, 2);
      for (let d = 0; d < 8; d++) {
        ectx.fillRect(x + rand() * r, y + rand() * r * 0.6, 2, 2);
      }
      ectx.globalAlpha = 1;
    }
    for (let k = 0; k < 6; k++) {
      const y = 70 + k * 70;
      ectx.strokeStyle = k % 2 === 0 ? '#fbbf24' : '#38bdf8';
      ectx.lineWidth = 1.5;
      ectx.globalAlpha = 0.65;
      ectx.beginPath();
      ectx.moveTo(0, y);
      ectx.lineTo(w, y + (rand() - 0.5) * 35);
      ectx.stroke();
      ectx.globalAlpha = 1;
    }
  } else if (biome === 'kryos') {
    const g = actx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e0f2fe');
    g.addColorStop(0.5, '#7dd3fc');
    g.addColorStop(1, '#e0f2fe');
    actx.fillStyle = g;
    actx.fillRect(0, 0, w, h);

    for (let i = 0; i < 260; i++) {
      const x = rand() * w;
      const y = rand() * h;
      actx.strokeStyle = rand() > 0.4 ? '#0284c7' : '#e0f2fe';
      actx.lineWidth = 1 + rand() * 3;
      actx.beginPath();
      actx.moveTo(x, y);
      actx.lineTo(x + (rand() - 0.5) * 90, y + (rand() - 0.5) * 40);
      actx.stroke();

      if (rand() > 0.68) {
        ectx.fillStyle = rand() > 0.3 ? '#38bdf8' : '#a78bfa';
        ectx.globalAlpha = 0.75;
        ectx.fillRect(x, y, 4, 4);
        ectx.globalAlpha = 1;
      }
    }
  } else if (biome === 'solaris') {
    const g = actx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9a3412');
    g.addColorStop(0.35, '#d97706');
    g.addColorStop(0.65, '#b45309');
    g.addColorStop(1, '#7c2d12');
    actx.fillStyle = g;
    actx.fillRect(0, 0, w, h);

    for (let i = 0; i < 320; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const rw = 30 + rand() * 120;
      actx.fillStyle = rand() > 0.5 ? 'rgba(253,186,116,0.28)' : 'rgba(67,20,7,0.32)';
      actx.fillRect(x, y, rw, 4 + rand() * 12);

      if (rand() > 0.8) {
        ectx.fillStyle = '#fde047';
        ectx.globalAlpha = 0.75;
        ectx.fillRect(x, y, 5, 3);
        ectx.globalAlpha = 1;
      }
    }
  } else if (biome === 'amethyst') {
    const g = actx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b0764');
    g.addColorStop(0.5, '#6b21a8');
    g.addColorStop(1, '#4c1d95');
    actx.fillStyle = g;
    actx.fillRect(0, 0, w, h);

    for (let i = 0; i < 240; i++) {
      const x = rand() * w;
      const y = rand() * h;
      actx.fillStyle = rand() > 0.4 ? 'rgba(232,121,249,0.26)' : 'rgba(30,27,75,0.4)';
      actx.beginPath();
      actx.ellipse(x, y, 18 + rand() * 64, 10 + rand() * 34, rand() * Math.PI, 0, Math.PI * 2);
      actx.fill();

      if (rand() > 0.62) {
        ectx.fillStyle = rand() > 0.35 ? '#e879f9' : '#f472b6';
        ectx.globalAlpha = 0.72;
        ectx.fillRect(x, y, 4, 3);
        ectx.globalAlpha = 1;
      }
    }
  } else if (biome === 'crimson') {
    const g = actx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#450a0a');
    g.addColorStop(0.45, '#9f1239');
    g.addColorStop(1, '#4c0519');
    actx.fillStyle = g;
    actx.fillRect(0, 0, w, h);

    for (let i = 0; i < 280; i++) {
      const x = rand() * w;
      const y = rand() * h;
      actx.fillStyle = rand() > 0.5 ? 'rgba(251,113,133,0.24)' : 'rgba(69,10,10,0.38)';
      actx.fillRect(x, y, 24 + rand() * 96, 5 + rand() * 14);

      if (rand() > 0.72) {
        ectx.fillStyle = rand() > 0.4 ? '#fb7185' : '#fdba74';
        ectx.globalAlpha = 0.7;
        ectx.fillRect(x, y, 5, 3);
        ectx.globalAlpha = 1;
      }
    }
  } else {
    actx.fillStyle = '#064e3b';
    actx.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const rx = 20 + rand() * 75;
      const ry = 14 + rand() * 45;
      actx.fillStyle = rand() > 0.4 ? '#059669' : '#047857';
      actx.beginPath();
      actx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      actx.fill();

      if (rand() > 0.65) {
        ectx.fillStyle = rand() > 0.3 ? '#34d399' : '#fef08a';
        ectx.globalAlpha = 0.65;
        ectx.beginPath();
        ectx.arc(x, y, 2.5 + rand() * 3, 0, Math.PI * 2);
        ectx.fill();
        ectx.globalAlpha = 1;
      }
    }
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(emissive);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.anisotropy = maxAnisotropy;

  return { map, emissiveMap };
}

function createAtmosphereHaloMaterial(colorHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 viewDir = normalize(vViewPos);
        float rim = pow(clamp(0.75 + dot(vNormal, viewDir), 0.0, 1.0), 3.2);
        gl_FragColor = vec4(uColor, rim * 0.85 * uOpacity);
      }
    `,
  });
}

interface PooledPlanetSlot {
  root: THREE.Group;
  sphere: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  halo: THREE.Mesh;
  haloMat: THREE.ShaderMaterial;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  moon: THREE.Mesh;
  moonMat: THREE.MeshStandardMaterial;
  flatGroup: THREE.Group;
  flatSun: THREE.Mesh;
  flatMoon: THREE.Mesh;
}

const MAX_SPACE_SLOTS = 24;
const MAX_ORBIT_BEACONS = 6;
const _beaconPos = new THREE.Vector3();
const _beaconNormal = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

export class SpaceSystem {
  public readonly group = new THREE.Group();
  private biomeTextures: Record<BiomeId, { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture }>;
  private slots: PooledPlanetSlot[] = [];
  private starPoints: THREE.Points;
  private starMaterial: THREE.PointsMaterial;
  private beaconGroup = new THREE.Group();
  private beaconBeams: THREE.Mesh[] = [];
  private beaconRings: THREE.Mesh[] = [];
  private orbitTimer = 0;
  private disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene, maxAnisotropy: number) {
    this.group.visible = false;
    scene.add(this.group);

    // Dense deep-space starfield following the ship infinitely
    const starCount = 1800;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#bae6fd'),
      new THREE.Color('#fde68a'),
      new THREE.Color('#fbcfe8'),
    ];

    for (let i = 0; i < starCount; i++) {
      const r = 4600 + Math.random() * 1200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starMaterial = new THREE.PointsMaterial({
      size: 3.4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.starPoints = new THREE.Points(starGeo, this.starMaterial);
    this.starPoints.frustumCulled = false;
    this.starPoints.renderOrder = -5;
    this.group.add(this.starPoints);
    this.disposables.push(starGeo, this.starMaterial);

    // Prebuild biome textures once
    this.biomeTextures = {
      coruscant: createBiomeSurfaceTexture('coruscant', maxAnisotropy),
      earth: createBiomeSurfaceTexture('earth', maxAnisotropy),
      kryos: createBiomeSurfaceTexture('kryos', maxAnisotropy),
      solaris: createBiomeSurfaceTexture('solaris', maxAnisotropy),
      verdant: createBiomeSurfaceTexture('verdant', maxAnisotropy),
      amethyst: createBiomeSurfaceTexture('amethyst', maxAnisotropy),
      crimson: createBiomeSurfaceTexture('crimson', maxAnisotropy),
    };
    for (const pair of Object.values(this.biomeTextures)) {
      this.disposables.push(pair.map, pair.emissiveMap);
    }

    const sphereGeo = new THREE.SphereGeometry(1, 44, 28);
    const haloGeo = new THREE.SphereGeometry(1.12, 28, 20);
    const ringGeo = new THREE.RingGeometry(1.32, 2.05, 56);
    ringGeo.rotateX(-Math.PI * 0.42);
    ringGeo.rotateY(0.28);
    const moonGeo = new THREE.SphereGeometry(1, 14, 10);

    // Shared geometries & materials for Flat Earth under a translucent dome
    const flatDiscTopGeo = new THREE.CircleGeometry(1, 56);
    flatDiscTopGeo.rotateX(-Math.PI / 2);
    const flatUnderGeo = new THREE.ConeGeometry(1.0, 0.28, 48);
    flatUnderGeo.rotateX(Math.PI);
    flatUnderGeo.translate(0, -0.14, 0);
    const flatIceWallGeo = new THREE.TorusGeometry(0.985, 0.036, 10, 56);
    flatIceWallGeo.rotateX(Math.PI / 2);
    flatIceWallGeo.translate(0, 0.015, 0);
    const flatDomeGeo = new THREE.SphereGeometry(1.0, 40, 22, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const flatDomeArchGeo = new THREE.TorusGeometry(1.0, 0.008, 6, 48, Math.PI);
    const flatSunGeo = new THREE.SphereGeometry(0.055, 16, 12);
    const flatMoonGeo = new THREE.SphereGeometry(0.04, 14, 10);

    const flatTopMat = new THREE.MeshStandardMaterial({
      map: this.biomeTextures.earth.map,
      emissiveMap: this.biomeTextures.earth.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.75,
      roughness: 0.72,
      metalness: 0.08,
      fog: false,
    });
    const flatUnderMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.92,
      metalness: 0.12,
      fog: false,
    });
    const flatIceWallMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.2,
      roughness: 0.28,
      metalness: 0.15,
      fog: false,
    });
    const flatDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.18,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const flatArchMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.24,
      fog: false,
    });
    const flatSunMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      toneMapped: false,
      fog: false,
    });
    const flatMoonMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      toneMapped: false,
      fog: false,
    });

    this.disposables.push(
      sphereGeo,
      haloGeo,
      ringGeo,
      moonGeo,
      flatDiscTopGeo,
      flatUnderGeo,
      flatIceWallGeo,
      flatDomeGeo,
      flatDomeArchGeo,
      flatSunGeo,
      flatMoonGeo,
      flatTopMat,
      flatUnderMat,
      flatIceWallMat,
      flatDomeMat,
      flatArchMat,
      flatSunMat,
      flatMoonMat,
    );

    for (let i = 0; i < MAX_SPACE_SLOTS; i++) {
      const root = new THREE.Group();
      root.visible = false;

      const mat = new THREE.MeshStandardMaterial({
        map: this.biomeTextures.coruscant.map,
        emissiveMap: this.biomeTextures.coruscant.emissiveMap,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.9,
        roughness: 0.62,
        metalness: 0.15,
        fog: false,
      });
      const sphere = new THREE.Mesh(sphereGeo, mat);
      root.add(sphere);

      const haloMat = createAtmosphereHaloMaterial('#f59e0b');
      const halo = new THREE.Mesh(haloGeo, haloMat);
      root.add(halo);

      const ringMat = new THREE.MeshBasicMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      root.add(ring);

      const moonMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.85,
        metalness: 0.05,
        fog: false,
      });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      root.add(moon);

      // Flat Earth under Dome assembly
      const flatGroup = new THREE.Group();
      flatGroup.visible = false;

      const discTop = new THREE.Mesh(flatDiscTopGeo, flatTopMat);
      discTop.position.y = 0.01;
      flatGroup.add(discTop);

      const under = new THREE.Mesh(flatUnderGeo, flatUnderMat);
      flatGroup.add(under);

      const iceWall = new THREE.Mesh(flatIceWallGeo, flatIceWallMat);
      flatGroup.add(iceWall);

      const arch1 = new THREE.Mesh(flatDomeArchGeo, flatArchMat);
      const arch2 = new THREE.Mesh(flatDomeArchGeo, flatArchMat);
      arch2.rotation.y = Math.PI / 2;
      flatGroup.add(arch1, arch2);

      const dome = new THREE.Mesh(flatDomeGeo, flatDomeMat);
      dome.renderOrder = 3;
      flatGroup.add(dome);

      const flatSun = new THREE.Mesh(flatSunGeo, flatSunMat);
      flatSun.position.set(0.45, 0.34, 0);
      flatGroup.add(flatSun);

      const flatMoon = new THREE.Mesh(flatMoonGeo, flatMoonMat);
      flatMoon.position.set(-0.45, 0.32, 0);
      flatGroup.add(flatMoon);

      root.add(flatGroup);

      this.group.add(root);
      this.disposables.push(mat, haloMat, ringMat, moonMat);
      this.slots.push({
        root,
        sphere,
        mat,
        halo,
        haloMat,
        ring,
        ringMat,
        moon,
        moonMat,
        flatGroup,
        flatSun,
        flatMoon,
      });
    }

    // 3D Orbital Landing Beacons (shown when hovering in orbit over a planet)
    const beamGeo = new THREE.CylinderGeometry(1.4, 3.8, 32, 12);
    beamGeo.translate(0, 16, 0);
    const ringBeaconGeo = new THREE.TorusGeometry(6.5, 0.85, 8, 24);
    ringBeaconGeo.rotateX(Math.PI / 2);
    this.disposables.push(beamGeo, ringBeaconGeo);

    for (let i = 0; i < MAX_ORBIT_BEACONS; i++) {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.72,
        fog: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.visible = false;
      this.beaconGroup.add(beam);
      this.beaconBeams.push(beam);

      const bRingMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        fog: false,
      });
      const bRing = new THREE.Mesh(ringBeaconGeo, bRingMat);
      bRing.visible = false;
      this.beaconGroup.add(bRing);
      this.beaconRings.push(bRing);

      this.disposables.push(beamMat, bRingMat);
    }
    this.group.add(this.beaconGroup);
  }

  public update(
    spaceFactor: number,
    spaceVehiclePos: THREE.Vector3,
    activePlanets: PlanetConfig[],
    delta: number,
    inOrbitMode = false,
    orbitPlanet?: PlanetConfig,
    landingSites: LandingSite[] = [],
    selectedSiteId: string | null = null,
    timeOfDay = 0.5,
  ): void {
    const active = spaceFactor > 0.02;
    this.group.visible = active;
    if (!active) return;

    this.orbitTimer += delta;
    this.starMaterial.opacity = THREE.MathUtils.clamp(spaceFactor * 0.95, 0, 0.95);
    this.starPoints.position.copy(spaceVehiclePos);

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const cfg = activePlanets[i];
      if (!cfg) {
        slot.root.visible = false;
        continue;
      }

      slot.root.visible = true;
      slot.root.position.copy(cfg.spacePos);

      if (cfg.isFlatDome) {
        slot.sphere.visible = false;
        slot.halo.visible = false;
        slot.ring.visible = false;
        slot.moon.visible = false;
        slot.flatGroup.visible = true;
        slot.flatGroup.scale.setScalar(cfg.radius);

        // Orbiting Sun & Moon under the dome synced with timeOfDay + slow motion
        const angle = (timeOfDay - 0.25) * Math.PI * 2 + this.orbitTimer * 0.08;
        slot.flatSun.position.set(Math.cos(angle) * 0.52, 0.34 + Math.sin(angle * 2) * 0.04, Math.sin(angle) * 0.52);
        slot.flatMoon.position.set(
          Math.cos(angle + Math.PI) * 0.5,
          0.31 - Math.sin(angle * 2) * 0.04,
          Math.sin(angle + Math.PI) * 0.5,
        );
        continue;
      }

      slot.flatGroup.visible = false;
      slot.sphere.visible = true;
      slot.halo.visible = true;

      const tex = this.biomeTextures[cfg.biome];
      if (slot.mat.map !== tex.map) {
        slot.mat.map = tex.map;
        slot.mat.emissiveMap = tex.emissiveMap;
        slot.mat.needsUpdate = true;
      }

      slot.sphere.scale.setScalar(cfg.radius);
      // Keep sphere nearly steady while in orbit so landing beacons align with terrain
      slot.sphere.rotation.y += delta * (inOrbitMode && orbitPlanet?.id === cfg.id ? 0.002 : 0.018);

      slot.halo.scale.setScalar(cfg.radius);
      slot.haloMat.uniforms.uColor.value.set(cfg.atmosphereColor);
      slot.haloMat.uniforms.uOpacity.value = spaceFactor;

      if (cfg.ringColor) {
        slot.ring.visible = true;
        slot.ring.scale.setScalar(cfg.radius);
        slot.ringMat.color.set(cfg.ringColor);
      } else {
        slot.ring.visible = false;
      }

      if (cfg.hasMoon) {
        slot.moon.visible = true;
        slot.moon.scale.setScalar(cfg.radius * 0.18);
        slot.moon.position.set(cfg.radius * 1.9, cfg.radius * 0.45, -cfg.radius * 0.9);
        slot.moonMat.color.set(cfg.biome === 'verdant' ? 0xa7f3d0 : 0xcbd5e1);
      } else {
        slot.moon.visible = false;
      }
    }

    // Update 3D Orbital Landing Beacons when orbiting a planet
    this.beaconGroup.visible = inOrbitMode && Boolean(orbitPlanet) && landingSites.length > 0;
    if (this.beaconGroup.visible && orbitPlanet) {
      for (let i = 0; i < MAX_ORBIT_BEACONS; i++) {
        const site = landingSites[i];
        const beam = this.beaconBeams[i];
        const bRing = this.beaconRings[i];
        if (!site) {
          beam.visible = false;
          bRing.visible = false;
          continue;
        }
        getLandingSiteSpaceWorldPos(orbitPlanet, site, _beaconPos);
        const isSel = site.id === selectedSiteId;
        beam.visible = true;
        bRing.visible = true;
        beam.position.copy(_beaconPos);
        bRing.position.copy(_beaconPos);

        if (!orbitPlanet.isFlatDome) {
          _beaconNormal.subVectors(_beaconPos, orbitPlanet.spacePos).normalize();
          beam.quaternion.setFromUnitVectors(_upVec, _beaconNormal);
          bRing.quaternion.setFromUnitVectors(_upVec, _beaconNormal);
        } else {
          beam.quaternion.identity();
          bRing.quaternion.identity();
        }

        const pulse = isSel ? 1.35 + Math.sin(this.orbitTimer * 5) * 0.2 : 0.78;
        beam.scale.set(pulse, isSel ? 1.55 : 0.85, pulse);
        bRing.scale.setScalar(pulse);
        (beam.material as THREE.MeshBasicMaterial).color.set(site.accentHex);
        (beam.material as THREE.MeshBasicMaterial).opacity = isSel ? 0.92 : 0.55;
        (bRing.material as THREE.MeshBasicMaterial).color.set(isSel ? '#ffffff' : site.accentHex);
      }
    }
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
