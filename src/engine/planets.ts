import * as THREE from 'three';
import type { BiomeId, PlanetId } from '../types/simulation';

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

  // Keep slight spacing from starter planets near origin
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

  // Avoid colliding with starter planets at (0,0,0) neighborhood
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

  // Always include starter planets when reasonably nearby (within 2 sectors of origin)
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

function createBiomeSurfaceTexture(
  biome: BiomeId,
  maxAnisotropy: number,
): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
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
}

const MAX_SPACE_SLOTS = 24;

export class SpaceSystem {
  public readonly group = new THREE.Group();
  private biomeTextures: Record<BiomeId, { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture }>;
  private slots: PooledPlanetSlot[] = [];
  private starPoints: THREE.Points;
  private starMaterial: THREE.PointsMaterial;
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

    // Prebuild 6 crisp biome globe texture pairs once (zero runtime allocations)
    this.biomeTextures = {
      coruscant: createBiomeSurfaceTexture('coruscant', maxAnisotropy),
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
    this.disposables.push(sphereGeo, haloGeo, ringGeo, moonGeo);

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

      this.group.add(root);
      this.disposables.push(mat, haloMat, ringMat, moonMat);
      this.slots.push({ root, sphere, mat, halo, haloMat, ring, ringMat, moon, moonMat });
    }
  }

  public update(
    spaceFactor: number,
    spaceVehiclePos: THREE.Vector3,
    activePlanets: PlanetConfig[],
    delta: number,
  ): void {
    const active = spaceFactor > 0.02;
    this.group.visible = active;
    if (!active) return;

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

      const tex = this.biomeTextures[cfg.biome];
      if (slot.mat.map !== tex.map) {
        slot.mat.map = tex.map;
        slot.mat.emissiveMap = tex.emissiveMap;
        slot.mat.needsUpdate = true;
      }

      slot.sphere.scale.setScalar(cfg.radius);
      slot.sphere.rotation.y += delta * 0.018;

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
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
