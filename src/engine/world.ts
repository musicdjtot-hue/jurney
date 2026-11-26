import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createCloudTexture,
  createCoruscantFacadeTextures,
  createFieldGroundTexture,
  createNeonSignTextures,
  createRoadTextures,
} from './textures';
import type { BuildingFootprint } from './physics';
import type { PlanetConfig } from './planets';
import type { WorldLandmark } from './events';
import type {
  BiomeId,
  PlanetId,
  SeasonId,
  SpecialSpotInfo,
  WeatherMode,
} from '../types/simulation';

export const CHUNK_SIZE = 320;
const DEFAULT_GRID_RADIUS = 3; // 7x7 chunks = 2240x2240m continuous network

const MAX_TOWER_INSTANCES = 480;
const MAX_ACCENT_INSTANCES = 340;
const MAX_DOME_INSTANCES = 80;
const MAX_LAMP_INSTANCES = 260;
const MAX_SIGN_PER_STYLE = 48;
const MAX_ROAD_INSTANCES = 360;
const MAX_BRIDGE_INSTANCES = 96;
const MAX_BEACON_INSTANCES = 180;
const MAX_FIELD_INSTANCES = 64;
const MAX_PLAZA_INSTANCES = 64;
const MAX_HILL_INSTANCES = 80;
const MAX_TREE_INSTANCES = 960;
const MAX_POND_INSTANCES = 36;
const MAX_CAFE_INSTANCES = 24;
const MAX_HOTEL_INSTANCES = 18;
const MAX_OBS_INSTANCES = 14;
const MAX_HANGAR_INSTANCES = 12;
const MAX_SKYGATE_INSTANCES = 14;
const MAX_ROAD_GATE_INSTANCES = 18;

const FLYING_CAR_COUNT = 220;
const GROUND_CAR_COUNT = 90;
const PEDESTRIAN_COUNT = 150;
const CLOUD_COUNT = 240;
const RAIN_COUNT = 750;

const _dummy = new THREE.Object3D();
const _glowDummy = new THREE.Object3D();
const _color = new THREE.Color();
const _quat = new THREE.Quaternion();

export type ChunkZoneType = 'city' | 'park' | 'fields' | 'viaduct';

interface BiomePreset {
  label: string;
  parkLabel: string;
  fieldsLabel: string;
  openLabel: string;
  facadeTints: [string, string, string];
  facadeEmissiveTint: string;
  trimColor: string;
  plazaColor: string;
  fieldColor: string;
  hillColor: string;
  pondColor: string;
  trunkColor: string;
  foliagePalette: [string, string, string, string];
  roadColor: string;
  roadEmissiveTint: string;
  lampColor: string;
  beaconColors: [string, string];
  openThreshold: number;
  heightScale: number;
  domeChance: number;
  showSigns: boolean;
  carCount: number;
  pedCount: number;
  precipColor: string;
  precipLength: number;
  precipSpeedScale: number;
  precipDrift: number;
  cloudTint: string;
  cloudDensity: number;
}

const BIOMES: Record<BiomeId, BiomePreset> = {
  coruscant: {
    label: 'Корускант · Центральные шпили',
    parkLabel: 'Корускант · Парковый проспект',
    fieldsLabel: 'Корускант · Зелёные поля и рощи',
    openLabel: 'Открытый горизонт · Небесный виадук',
    facadeTints: ['#ffffff', '#e2e8f0', '#cbd5e1'],
    facadeEmissiveTint: '#ffffff',
    trimColor: '#242c3a',
    plazaColor: '#10151f',
    fieldColor: '#6f9646',
    hillColor: '#4c6d33',
    pondColor: '#1d4d6b',
    trunkColor: '#5c4632',
    foliagePalette: ['#3f7a2a', '#5ea136', '#c98a2c', '#d4a638'],
    roadColor: '#ffffff',
    roadEmissiveTint: '#ffffff',
    lampColor: '#ffe4b5',
    beaconColors: ['#38bdf8', '#f59e0b'],
    openThreshold: 0.42,
    heightScale: 1.0,
    domeChance: 0.35,
    showSigns: true,
    carCount: 220,
    pedCount: 140,
    precipColor: '#bfe3ff',
    precipLength: 1.45,
    precipSpeedScale: 1.0,
    precipDrift: 0,
    cloudTint: '#ffffff',
    cloudDensity: 1.0,
  },
  earth: {
    label: 'Москва · Красная площадь и проспекты',
    parkLabel: 'Земля · Парковый район и дом Сербоса',
    fieldsLabel: 'Земля · Поля и край купола',
    openLabel: 'Земля · Загородное шоссе',
    facadeTints: ['#f1f5f9', '#e2e8f0', '#ede9fe'],
    facadeEmissiveTint: '#fde68a',
    trimColor: '#475569',
    plazaColor: '#334155',
    fieldColor: '#5d8a3e',
    hillColor: '#476e2e',
    pondColor: '#2563eb',
    trunkColor: '#5c4033',
    foliagePalette: ['#3b7d2c', '#529b38', '#65a30d', '#ca8a04'],
    roadColor: '#475569',
    roadEmissiveTint: '#fde68a',
    lampColor: '#fef3c7',
    beaconColors: ['#ef4444', '#fbbf24'],
    openThreshold: 0.34,
    heightScale: 0.44,
    domeChance: 0.25,
    showSigns: false,
    carCount: 0,
    pedCount: 150,
    precipColor: '#bae6fd',
    precipLength: 1.35,
    precipSpeedScale: 0.95,
    precipDrift: 0.5,
    cloudTint: '#ffffff',
    cloudDensity: 0.88,
  },
  kryos: {
    label: 'Неон-Криос · Ледяные шпили',
    parkLabel: 'Неон-Криос · Хвойная аллея',
    fieldsLabel: 'Неон-Криос · Заснеженные равнины',
    openLabel: 'Ледяной простор · Аврора-виадук',
    facadeTints: ['#bae6fd', '#e0f2fe', '#7dd3fc'],
    facadeEmissiveTint: '#7dd3fc',
    trimColor: '#64748b',
    plazaColor: '#1e3a5f',
    fieldColor: '#cfe8ff',
    hillColor: '#9bc4e8',
    pondColor: '#387ca8',
    trunkColor: '#475569',
    foliagePalette: ['#94d2f2', '#cfefff', '#5aa4cf', '#7dd3fc'],
    roadColor: '#cfe8ff',
    roadEmissiveTint: '#38bdf8',
    lampColor: '#bae6fd',
    beaconColors: ['#38bdf8', '#c084fc'],
    openThreshold: 0.15,
    heightScale: 1.15,
    domeChance: 0.65,
    showSigns: true,
    carCount: 110,
    pedCount: 70,
    precipColor: '#f0f9ff',
    precipLength: 0.28,
    precipSpeedScale: 0.24,
    precipDrift: 3.5,
    cloudTint: '#e0f2fe',
    cloudDensity: 1.0,
  },
  solaris: {
    label: 'Соларис-Дюн · Солнечные монолиты',
    parkLabel: 'Соларис-Дюн · Оазис-бульвар',
    fieldsLabel: 'Соларис-Дюн · Золотые дюны и саванна',
    openLabel: 'Песчаная долина · Солнечный мост',
    facadeTints: ['#d97706', '#b45309', '#9a3412'],
    facadeEmissiveTint: '#fde047',
    trimColor: '#78350f',
    plazaColor: '#451a03',
    fieldColor: '#d4944a',
    hillColor: '#b36b2c',
    pondColor: '#226f73',
    trunkColor: '#6b4226',
    foliagePalette: ['#859e33', '#b88c28', '#5f8a3e', '#d67e22'],
    roadColor: '#f6d5a8',
    roadEmissiveTint: '#fb923c',
    lampColor: '#fef08a',
    beaconColors: ['#fde047', '#fb923c'],
    openThreshold: -0.25,
    heightScale: 0.85,
    domeChance: 0.45,
    showSigns: false,
    carCount: 55,
    pedCount: 30,
    precipColor: '#fed7aa',
    precipLength: 0.22,
    precipSpeedScale: 0.16,
    precipDrift: 7.5,
    cloudTint: '#ffedd5',
    cloudDensity: 0.62,
  },
  verdant: {
    label: 'Вердана-IX · Изумрудные террасы',
    parkLabel: 'Вердана-IX · Био-бульвар',
    fieldsLabel: 'Вердана-IX · Цветущие луга и леса',
    openLabel: 'Био-долина · Парящие сады',
    facadeTints: ['#10b981', '#059669', '#047857'],
    facadeEmissiveTint: '#6ee7b7',
    trimColor: '#115e59',
    plazaColor: '#064e3b',
    fieldColor: '#4da866',
    hillColor: '#2d7a49',
    pondColor: '#1b8a78',
    trunkColor: '#42362a',
    foliagePalette: ['#10b981', '#34d399', '#6ee7b7', '#84cc16'],
    roadColor: '#bbf7d0',
    roadEmissiveTint: '#34d399',
    lampColor: '#a7f3d0',
    beaconColors: ['#34d399', '#fef08a'],
    openThreshold: -0.05,
    heightScale: 0.78,
    domeChance: 0.75,
    showSigns: false,
    carCount: 75,
    pedCount: 50,
    precipColor: '#a7f3d0',
    precipLength: 0.18,
    precipSpeedScale: 0.11,
    precipDrift: 4.5,
    cloudTint: '#d1fae5',
    cloudDensity: 0.85,
  },
  amethyst: {
    label: 'Аметист · Кварцевые кварталы',
    parkLabel: 'Аметист · Сиреневый сквер',
    fieldsLabel: 'Аметист · Лиловые долины',
    openLabel: 'Кристальный мост · Звёздный простор',
    facadeTints: ['#e9d5ff', '#d8b4fe', '#c084fc'],
    facadeEmissiveTint: '#f0abfc',
    trimColor: '#4c1d95',
    plazaColor: '#2e1065',
    fieldColor: '#7e5ba6',
    hillColor: '#5b3c88',
    pondColor: '#4338ca',
    trunkColor: '#3f2e4d',
    foliagePalette: ['#e879f9', '#c084fc', '#f472b6', '#a78bfa'],
    roadColor: '#f3e8ff',
    roadEmissiveTint: '#e879f9',
    lampColor: '#f5d0fe',
    beaconColors: ['#e879f9', '#38bdf8'],
    openThreshold: 0.08,
    heightScale: 0.95,
    domeChance: 0.6,
    showSigns: true,
    carCount: 95,
    pedCount: 65,
    precipColor: '#f5d0fe',
    precipLength: 0.22,
    precipSpeedScale: 0.14,
    precipDrift: 4.0,
    cloudTint: '#fae8ff',
    cloudDensity: 0.9,
  },
  crimson: {
    label: 'Кримсон · Закатные террасы',
    parkLabel: 'Кримсон · Янтарная набережная',
    fieldsLabel: 'Кримсон · Багровые луга и скалы',
    openLabel: 'Красная долина · Небесный тракт',
    facadeTints: ['#fecdd3', '#fda4af', '#fb7185'],
    facadeEmissiveTint: '#fdba74',
    trimColor: '#4c0519',
    plazaColor: '#2a0812',
    fieldColor: '#9c4c47',
    hillColor: '#75302d',
    pondColor: '#7c2d12',
    trunkColor: '#4a251d',
    foliagePalette: ['#fb7185', '#f97316', '#f59e0b', '#e11d48'],
    roadColor: '#ffe4e6',
    roadEmissiveTint: '#fb7185',
    lampColor: '#fed7aa',
    beaconColors: ['#fb7185', '#fbbf24'],
    openThreshold: -0.1,
    heightScale: 0.9,
    domeChance: 0.5,
    showSigns: false,
    carCount: 80,
    pedCount: 45,
    precipColor: '#fecdd3',
    precipLength: 0.2,
    precipSpeedScale: 0.16,
    precipDrift: 6.0,
    cloudTint: '#ffe4e6',
    cloudDensity: 0.78,
  },
};

function hash2(ix: number, iz: number, salt = 0): number {
  let n = ix * 374761393 + iz * 668265263 + salt * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

export function getChunkRoadArms(
  cx: number,
  cz: number,
  worldSeed: number,
): { n: boolean; s: boolean; e: boolean; w: boolean } {
  // Trans-planetary continuous arterial highways along every even coordinate line
  const isHighwayX = (x: number) => Math.abs(x) % 2 === 0;
  const isHighwayZ = (z: number) => Math.abs(z) % 2 === 0;

  const hasEast = (x: number, z: number) => {
    // East-West trans-planetary highway along all even Z rows
    if (isHighwayZ(z)) return true;
    // Radial feeder connectors to nearby landmarks & hubs
    return (x === 0 && z === 0) || (x === -1 && z === 0) || hash2(x, z, worldSeed + 701) > 0.18;
  };

  const hasSouth = (x: number, z: number) => {
    // North-South trans-planetary highway along all even X columns
    if (isHighwayX(x)) return true;
    // Radial feeder connectors
    return (x === 0 && z === 0) || (x === 0 && z === -1) || hash2(x, z, worldSeed + 702) > 0.18;
  };

  let e = hasEast(cx, cz);
  let w = hasEast(cx - 1, cz);
  let s = hasSouth(cx, cz);
  let n = hasSouth(cx, cz - 1);

  // Guarantee that every road segment leads somewhere without dead-ends:
  // if a road enters a chunk, it continues through or connects to an artery
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);
  if (count < 2) {
    if (isHighwayX(cx)) {
      n = true;
      s = true;
    } else if (isHighwayZ(cz)) {
      e = true;
      w = true;
    } else {
      if (cx > 0) w = true; else e = true;
      if (cz > 0) n = true; else s = true;
    }
  }

  return { n, s, e, w };
}

export function getChunkZone(
  cx: number,
  cz: number,
  openThreshold = 0.42,
  worldSeed = 101,
): ChunkZoneType {
  // Starting hub guarantees quick sightseeing across downtown, parkway, and countryside fields
  if (cx === 0 && cz === 0) return 'city';
  if (worldSeed === 777) {
    // Flat Earth: Moscow center + avenues, Dom Serbosa (-1, 1), Ice Dome Edge (0, -3), Reptiloid City (0, -4)
    if (cx === -1 && cz === 1) return 'park';
    if (cx === 0 && cz === -3) return 'fields';
    if (cx === 0 && cz === -4) return 'city';
    if (cx === 0 && cz === -1) return 'park';
    if ((cx === 1 && cz === -1) || (cx === -1 && cz === -1)) return 'fields';
    if (Math.abs(cx) <= 1 && Math.abs(cz) <= 1) return 'city';
  }
  if (Math.abs(cx) <= 1 && Math.abs(cz) <= 1 && worldSeed === 101) {
    if (cx === 0 && cz === -1) return 'park';
    if ((cx === 1 && cz === -1) || (cx === -1 && cz === -1)) return 'fields';
    if (cx === 1 && cz === 0) return 'park';
    if (cx === 1 && cz === 1) return 'viaduct';
    return 'city';
  }

  const pOff = (worldSeed % 97) * 0.17;
  const wave =
    Math.sin(cx * 0.34 + 0.4 + pOff) +
    Math.cos(cz * 0.32 - 0.25 - pOff * 0.7) +
    0.35 * Math.sin((cx + cz) * 0.22 + pOff * 0.5);

  if (wave > openThreshold + 0.55) {
    return hash2(cx, cz, worldSeed + 19) > 0.42 ? 'fields' : 'viaduct';
  }
  if (wave > openThreshold) {
    return 'fields';
  }
  if (wave > openThreshold - 0.48) {
    return 'park';
  }
  return 'city';
}

export function isOpenSpaceChunk(cx: number, cz: number, openThreshold = 0.42, worldSeed = 101): boolean {
  const z = getChunkZone(cx, cz, openThreshold, worldSeed);
  return z === 'fields' || z === 'viaduct';
}

export function chunkHasFullPlaza(_cx: number, _cz: number, _openThreshold = 0.42, _worldSeed = 101): boolean {
  return true;
}

interface FlyingCar {
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  bobPhase: number;
}

interface Pedestrian {
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  phase: number;
  scale: number;
  knocked: boolean;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotZ: number;
  spinX: number;
  spinZ: number;
  knockedTimer: number;
}

interface CloudPuff {
  ox: number;
  oy: number;
  oz: number;
  scaleX: number;
  scaleY: number;
  rot: number;
  layer: number;
}

function buildFlyingCarGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(2.1, 0.72, 5.2);
  hull.translate(0, 0, 0);

  const canopy = new THREE.BoxGeometry(1.45, 0.48, 2.3);
  canopy.translate(0, 0.52, 0.15);

  const leftWing = new THREE.BoxGeometry(0.85, 0.24, 3.1);
  leftWing.translate(-1.32, -0.05, 0.35);

  const rightWing = new THREE.BoxGeometry(0.85, 0.24, 3.1);
  rightWing.translate(1.32, -0.05, 0.35);

  const merged = mergeGeometries([hull, canopy, leftWing, rightWing]);
  hull.dispose();
  canopy.dispose();
  leftWing.dispose();
  rightWing.dispose();
  return merged;
}

function buildGroundCarGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1.9, 0.64, 4.3);
  body.translate(0, 0.55, 0);

  const cabin = new THREE.BoxGeometry(1.62, 0.52, 2.15);
  cabin.translate(0, 1.08, 0.1);

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10);
  wheelGeo.rotateZ(Math.PI / 2);

  const w1 = wheelGeo.clone().translate(-0.92, 0.34, -1.32);
  const w2 = wheelGeo.clone().translate(0.92, 0.34, -1.32);
  const w3 = wheelGeo.clone().translate(-0.92, 0.34, 1.32);
  const w4 = wheelGeo.clone().translate(0.92, 0.34, 1.32);
  wheelGeo.dispose();

  const merged = mergeGeometries([body, cabin, w1, w2, w3, w4]);
  body.dispose();
  cabin.dispose();
  w1.dispose();
  w2.dispose();
  w3.dispose();
  w4.dispose();
  return merged;
}

function buildPedestrianGeometry(): THREE.BufferGeometry {
  const body = new THREE.CylinderGeometry(0.24, 0.32, 1.28, 6);
  body.translate(0, 0.64, 0);

  const head = new THREE.SphereGeometry(0.2, 6, 6);
  head.translate(0, 1.46, 0);

  const merged = mergeGeometries([body, head]);
  body.dispose();
  head.dispose();
  return merged;
}

function buildTreeCanopyGeometry(): THREE.BufferGeometry {
  const lower = new THREE.ConeGeometry(2.8, 4.4, 7);
  lower.translate(0, 5.2, 0);
  const mid = new THREE.ConeGeometry(2.2, 3.8, 7);
  mid.translate(0, 7.6, 0);
  const top = new THREE.ConeGeometry(1.45, 3.3, 7);
  top.translate(0, 9.8, 0);
  const merged = mergeGeometries([lower, mid, top]);
  lower.dispose();
  mid.dispose();
  top.dispose();
  return merged ?? new THREE.ConeGeometry(2.6, 6.5, 7);
}

interface HangarZone {
  id: string;
  name: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  roofY: number;
}

interface SkyGateAnchor {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

interface RoadGateAnchor {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export class CoruscantWorld {
  public readonly group = new THREE.Group();

  private planetId: PlanetId = 'coruscant';
  private biomeId: BiomeId = 'coruscant';
  private season: SeasonId = 'summer';
  private planetName = 'Корускант';
  private worldSeed = 101;
  private facadeMaterials: THREE.MeshStandardMaterial[] = [];
  private trimMaterial: THREE.MeshStandardMaterial;
  private plazaMaterial: THREE.MeshStandardMaterial;
  private fieldMaterial: THREE.MeshStandardMaterial;
  private hillMaterial: THREE.MeshStandardMaterial;
  private pondMaterial: THREE.MeshStandardMaterial;
  private trunkMaterial: THREE.MeshStandardMaterial;
  private canopyMaterial: THREE.MeshStandardMaterial;
  private roadMaterial: THREE.MeshStandardMaterial;
  private beaconMaterial: THREE.MeshBasicMaterial;
  private lampGlowMaterial: THREE.MeshBasicMaterial;
  private signMaterials: THREE.MeshBasicMaterial[] = [];
  private abyssFloor: THREE.Mesh;

  private towerMeshes: THREE.InstancedMesh[] = [];
  private trimMesh: THREE.InstancedMesh;
  private domeMesh: THREE.InstancedMesh;
  private plazaMesh: THREE.InstancedMesh;
  private fieldMesh: THREE.InstancedMesh;
  private hillMesh: THREE.InstancedMesh;
  private pondMesh: THREE.InstancedMesh;
  private treeTrunkMesh: THREE.InstancedMesh;
  private treeCanopyMesh: THREE.InstancedMesh;
  private roadMesh: THREE.InstancedMesh;
  private bridgeMesh: THREE.InstancedMesh;
  private beaconMesh: THREE.InstancedMesh;
  private lampPoleMesh: THREE.InstancedMesh;
  private lampGlowMesh: THREE.InstancedMesh;
  private cafeBodyMesh: THREE.InstancedMesh;
  private cafeAwningMesh: THREE.InstancedMesh;
  private cafeGlowMesh: THREE.InstancedMesh;
  private hotelBodyMesh: THREE.InstancedMesh;
  private hotelCanopyMesh: THREE.InstancedMesh;
  private hotelGlowMesh: THREE.InstancedMesh;
  private obsBaseMesh: THREE.InstancedMesh;
  private obsDomeMesh: THREE.InstancedMesh;
  private obsRingMesh: THREE.InstancedMesh;
  private hangarWallMesh: THREE.InstancedMesh;
  private hangarRoofMesh: THREE.InstancedMesh;
  private hangarGlowMesh: THREE.InstancedMesh;
  private skyGateMesh: THREE.InstancedMesh;
  private roadGateMesh: THREE.InstancedMesh;
  private signMeshes: THREE.InstancedMesh[] = [];

  private flyingCarMesh: THREE.InstancedMesh;
  private flyingCarGlowMesh: THREE.InstancedMesh;
  private flyingCars: FlyingCar[] = [];

  private groundCarMesh: THREE.InstancedMesh;
  private groundCarGlowMesh: THREE.InstancedMesh;
  private groundCars: FlyingCar[] = [];

  private moscowGroup = new THREE.Group();
  private serbosGroup = new THREE.Group();
  private domeEdgeGroup = new THREE.Group();
  private reptiloidGroup = new THREE.Group();
  private reptiloidBeaconRing: THREE.Mesh | null = null;

  private pedestrianMesh: THREE.InstancedMesh;
  private pedestrians: Pedestrian[] = [];

  private cloudMesh: THREE.InstancedMesh;
  private cloudMaterial: THREE.MeshBasicMaterial;
  private cloudPuffs: CloudPuff[] = [];

  private rainLines: THREE.LineSegments;
  private rainMaterial: THREE.LineBasicMaterial;
  private rainPositions: Float32Array;
  private rainOffsets: Float32Array;

  private activeBuildings: BuildingFootprint[] = [];
  private landmarks: WorldLandmark[] = [];
  private specialSpots: SpecialSpotInfo[] = [];
  private hangars: HangarZone[] = [];
  private skyGates: SkyGateAnchor[] = [];
  private roadGates: RoadGateAnchor[] = [];
  private gridRadius = DEFAULT_GRID_RADIUS;
  private trafficScale = 1;
  private fxScale = 1;
  private lastChunkX = Number.NaN;
  private lastChunkZ = Number.NaN;
  private disposables: { dispose: () => void }[] = [];

  constructor(
    scene: THREE.Scene,
    maxAnisotropy: number,
    lowTierProfile = false,
    touchProfile = false,
  ) {
    this.gridRadius = lowTierProfile ? 2 : DEFAULT_GRID_RADIUS;
    this.trafficScale = lowTierProfile ? 0.5 : touchProfile ? 0.72 : 1.0;
    this.fxScale = lowTierProfile ? 0.55 : touchProfile ? 0.75 : 1.0;
    scene.add(this.group);

    // 1. Tower Facades (3 styles)
    const facadeSets = createCoruscantFacadeTextures(maxAnisotropy);
    const towerBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.disposables.push(towerBoxGeo);

    for (let i = 0; i < facadeSets.length; i++) {
      const set = facadeSets[i];
      set.map.repeat.set(2, 5);
      set.emissiveMap.repeat.set(2, 5);
      const mat = new THREE.MeshStandardMaterial({
        map: set.map,
        emissiveMap: set.emissiveMap,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.9,
        roughness: 0.4 + i * 0.1,
        metalness: 0.56 - i * 0.08,
      });
      this.facadeMaterials.push(mat);

      const imesh = new THREE.InstancedMesh(towerBoxGeo, mat, MAX_TOWER_INSTANCES);
      imesh.castShadow = false;
      imesh.receiveShadow = false;
      imesh.frustumCulled = false;
      this.group.add(imesh);
      this.towerMeshes.push(imesh);

      this.disposables.push(set.map, set.emissiveMap, mat);
    }

    // 2. Architectural Metallic Trims, Spires, Domes & Skybridges
    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x242c3a,
      roughness: 0.3,
      metalness: 0.84,
    });
    this.trimMesh = new THREE.InstancedMesh(towerBoxGeo, this.trimMaterial, MAX_ACCENT_INSTANCES);
    this.trimMesh.receiveShadow = false;
    this.trimMesh.frustumCulled = false;
    this.group.add(this.trimMesh);

    const domeGeo = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    this.domeMesh = new THREE.InstancedMesh(domeGeo, this.trimMaterial, MAX_DOME_INSTANCES);
    this.domeMesh.frustumCulled = false;
    this.group.add(this.domeMesh);

    this.bridgeMesh = new THREE.InstancedMesh(towerBoxGeo, this.trimMaterial, MAX_BRIDGE_INSTANCES);
    this.bridgeMesh.frustumCulled = false;
    this.group.add(this.bridgeMesh);

    this.plazaMaterial = new THREE.MeshStandardMaterial({
      color: 0x10151f,
      roughness: 0.65,
      metalness: 0.45,
    });
    this.plazaMesh = new THREE.InstancedMesh(towerBoxGeo, this.plazaMaterial, MAX_PLAZA_INSTANCES);
    this.plazaMesh.receiveShadow = !lowTierProfile;
    this.plazaMesh.frustumCulled = false;
    this.group.add(this.plazaMesh);
    this.disposables.push(this.trimMaterial, domeGeo, this.plazaMaterial);

    // 2b. Countryside Fields, Rolling Hills, Ponds & Trees
    const fieldTex = createFieldGroundTexture(maxAnisotropy);
    this.fieldMaterial = new THREE.MeshStandardMaterial({
      map: fieldTex,
      color: 0x6f9646,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.fieldMesh = new THREE.InstancedMesh(towerBoxGeo, this.fieldMaterial, MAX_FIELD_INSTANCES);
    this.fieldMesh.receiveShadow = false;
    this.fieldMesh.frustumCulled = false;
    this.group.add(this.fieldMesh);

    const hillGeo = new THREE.DodecahedronGeometry(1, 1);
    this.hillMaterial = new THREE.MeshStandardMaterial({
      color: 0x4c6d33,
      roughness: 0.88,
      metalness: 0.05,
    });
    this.hillMesh = new THREE.InstancedMesh(hillGeo, this.hillMaterial, MAX_HILL_INSTANCES);
    this.hillMesh.receiveShadow = false;
    this.hillMesh.frustumCulled = false;
    this.group.add(this.hillMesh);

    const pondGeo = new THREE.CircleGeometry(1, 20);
    pondGeo.rotateX(-Math.PI / 2);
    this.pondMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d4d6b,
      roughness: 0.09,
      metalness: 0.78,
      envMapIntensity: 1.5,
    });
    this.pondMesh = new THREE.InstancedMesh(pondGeo, this.pondMaterial, MAX_POND_INSTANCES);
    this.pondMesh.frustumCulled = false;
    this.group.add(this.pondMesh);

    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.44, 3.8, 6);
    trunkGeo.translate(0, 1.9, 0);
    this.trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4632,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.treeTrunkMesh = new THREE.InstancedMesh(trunkGeo, this.trunkMaterial, MAX_TREE_INSTANCES);
    this.treeTrunkMesh.frustumCulled = false;
    this.group.add(this.treeTrunkMesh);

    const canopyGeo = buildTreeCanopyGeometry();
    this.canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.84,
      metalness: 0.04,
    });
    this.treeCanopyMesh = new THREE.InstancedMesh(canopyGeo, this.canopyMaterial, MAX_TREE_INSTANCES);
    this.treeCanopyMesh.frustumCulled = false;
    this.group.add(this.treeCanopyMesh);

    this.disposables.push(
      fieldTex,
      this.fieldMaterial,
      hillGeo,
      this.hillMaterial,
      pondGeo,
      this.pondMaterial,
      trunkGeo,
      this.trunkMaterial,
      canopyGeo,
      this.canopyMaterial,
    );

    // 3. Futuristic Skyway Boulevards
    const roadTex = createRoadTextures(maxAnisotropy);
    roadTex.map.repeat.set(1, 8);
    roadTex.emissiveMap.repeat.set(1, 8);
    roadTex.roughnessMap.repeat.set(1, 8);

    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTex.map,
      emissiveMap: roadTex.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.9,
      roughnessMap: roadTex.roughnessMap,
      roughness: 0.65,
      metalness: 0.28,
      envMapIntensity: 1.35,
    });
    const roadGeo = new THREE.BoxGeometry(1, 1, 1);
    this.roadMesh = new THREE.InstancedMesh(roadGeo, this.roadMaterial, MAX_ROAD_INSTANCES);
    this.roadMesh.receiveShadow = true;
    this.roadMesh.frustumCulled = false;
    this.group.add(this.roadMesh);
    this.disposables.push(roadTex.map, roadTex.emissiveMap, roadTex.roughnessMap, this.roadMaterial, roadGeo);

    // 4. Boulevard Streetlight Pylons & Lamps
    const poleGeo = new THREE.BoxGeometry(0.35, 6.2, 0.35);
    this.lampPoleMesh = new THREE.InstancedMesh(poleGeo, this.trimMaterial, MAX_LAMP_INSTANCES);
    this.lampPoleMesh.frustumCulled = false;
    this.group.add(this.lampPoleMesh);

    const lampGeo = new THREE.BoxGeometry(1.1, 0.24, 0.45);
    this.lampGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4b5, toneMapped: false });
    this.lampGlowMesh = new THREE.InstancedMesh(lampGeo, this.lampGlowMaterial, MAX_LAMP_INSTANCES);
    this.lampGlowMesh.frustumCulled = false;
    this.group.add(this.lampGlowMesh);
    this.disposables.push(poleGeo, lampGeo, this.lampGlowMaterial);

    // 5. Holographic Neon Signs (4 styles, 1 draw call each)
    const signTextures = createNeonSignTextures(maxAnisotropy);
    const signGeo = new THREE.PlaneGeometry(16, 8);
    this.disposables.push(signGeo);

    for (let i = 0; i < signTextures.length; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: signTextures[i],
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      this.signMaterials.push(mat);
      const imesh = new THREE.InstancedMesh(signGeo, mat, MAX_SIGN_PER_STYLE);
      imesh.frustumCulled = false;
      this.group.add(imesh);
      this.signMeshes.push(imesh);
      this.disposables.push(signTextures[i], mat);
    }

    // 6. Rooftop Aviation Beacons
    const beaconGeo = new THREE.SphereGeometry(1, 8, 8);
    this.beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.beaconMesh = new THREE.InstancedMesh(beaconGeo, this.beaconMaterial, MAX_BEACON_INSTANCES);
    this.beaconMesh.frustumCulled = false;
    this.group.add(this.beaconMesh);
    this.disposables.push(beaconGeo, this.beaconMaterial);

    // 6b. Cozy Roadside Aero-Café Pavilions (3 instanced draw calls)
    const cafeBodyGeo = new THREE.BoxGeometry(8.5, 4.2, 12.5);
    const cafeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x182232,
      roughness: 0.48,
      metalness: 0.35,
    });
    this.cafeBodyMesh = new THREE.InstancedMesh(cafeBodyGeo, cafeBodyMat, MAX_CAFE_INSTANCES);
    this.cafeBodyMesh.frustumCulled = false;
    this.group.add(this.cafeBodyMesh);

    const cafeAwningGeo = new THREE.BoxGeometry(10.8, 0.35, 13.8);
    const cafeAwningMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.2,
    });
    this.cafeAwningMesh = new THREE.InstancedMesh(cafeAwningGeo, cafeAwningMat, MAX_CAFE_INSTANCES);
    this.cafeAwningMesh.frustumCulled = false;
    this.group.add(this.cafeAwningMesh);

    const cafeGlowGeo = new THREE.BoxGeometry(0.4, 2.8, 10.6);
    const cafeGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      toneMapped: false,
    });
    this.cafeGlowMesh = new THREE.InstancedMesh(cafeGlowGeo, cafeGlowMat, MAX_CAFE_INSTANCES);
    this.cafeGlowMesh.frustumCulled = false;
    this.group.add(this.cafeGlowMesh);

    this.disposables.push(
      cafeBodyGeo,
      cafeBodyMat,
      cafeAwningGeo,
      cafeAwningMat,
      cafeGlowGeo,
      cafeGlowMat,
    );

    // 6c. Boutique Sky-Hotel Buildings with Glowing Canopy Entrance (3 instanced draw calls)
    const hotelBodyGeo = new THREE.BoxGeometry(14.5, 22.0, 16.0);
    const hotelBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a2030,
      roughness: 0.4,
      metalness: 0.45,
    });
    this.hotelBodyMesh = new THREE.InstancedMesh(hotelBodyGeo, hotelBodyMat, MAX_HOTEL_INSTANCES);
    this.hotelBodyMesh.frustumCulled = false;
    this.group.add(this.hotelBodyMesh);

    const hotelCanopyGeo = new THREE.BoxGeometry(4.6, 0.4, 9.2);
    const hotelCanopyMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0xa855f7,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.3,
    });
    this.hotelCanopyMesh = new THREE.InstancedMesh(hotelCanopyGeo, hotelCanopyMat, MAX_HOTEL_INSTANCES);
    this.hotelCanopyMesh.frustumCulled = false;
    this.group.add(this.hotelCanopyMesh);

    const hotelGlowGeo = new THREE.BoxGeometry(0.5, 16.5, 12.2);
    const hotelGlowMat = new THREE.MeshBasicMaterial({
      color: 0xe9d5ff,
      toneMapped: false,
    });
    this.hotelGlowMesh = new THREE.InstancedMesh(hotelGlowGeo, hotelGlowMat, MAX_HOTEL_INSTANCES);
    this.hotelGlowMesh.frustumCulled = false;
    this.group.add(this.hotelGlowMesh);

    this.disposables.push(
      hotelBodyGeo,
      hotelBodyMat,
      hotelCanopyGeo,
      hotelCanopyMat,
      hotelGlowGeo,
      hotelGlowMat,
    );

    // 6d. Walk-In Observatory Planetarium Domes (3 instanced draw calls)
    const obsBaseGeo = new THREE.CylinderGeometry(7.2, 7.6, 3.2, 16);
    const obsBaseMat = new THREE.MeshStandardMaterial({
      color: 0x162033,
      roughness: 0.42,
      metalness: 0.48,
    });
    this.obsBaseMesh = new THREE.InstancedMesh(obsBaseGeo, obsBaseMat, MAX_OBS_INSTANCES);
    this.obsBaseMesh.frustumCulled = false;
    this.group.add(this.obsBaseMesh);

    const obsDomeGeo = new THREE.SphereGeometry(6.8, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const obsDomeMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.65,
    });
    this.obsDomeMesh = new THREE.InstancedMesh(obsDomeGeo, obsDomeMat, MAX_OBS_INSTANCES);
    this.obsDomeMesh.frustumCulled = false;
    this.group.add(this.obsDomeMesh);

    const obsRingGeo = new THREE.TorusGeometry(7.5, 0.28, 6, 24);
    obsRingGeo.rotateX(Math.PI / 2);
    const obsRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    this.obsRingMesh = new THREE.InstancedMesh(obsRingGeo, obsRingMat, MAX_OBS_INSTANCES);
    this.obsRingMesh.frustumCulled = false;
    this.group.add(this.obsRingMesh);

    this.disposables.push(obsBaseGeo, obsBaseMat, obsDomeGeo, obsDomeMat, obsRingGeo, obsRingMat);

    // 6e. Open Hollow Drive-In & Fly-In Aero-Hangars (3 instanced draw calls)
    const hangarWallGeo = new THREE.BoxGeometry(2.8, 16.5, 48);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.65,
    });
    this.hangarWallMesh = new THREE.InstancedMesh(hangarWallGeo, hangarMat, MAX_HANGAR_INSTANCES * 2);
    this.hangarWallMesh.frustumCulled = false;
    this.group.add(this.hangarWallMesh);

    const hangarRoofGeo = new THREE.BoxGeometry(31.8, 1.8, 48);
    this.hangarRoofMesh = new THREE.InstancedMesh(hangarRoofGeo, hangarMat, MAX_HANGAR_INSTANCES);
    this.hangarRoofMesh.frustumCulled = false;
    this.group.add(this.hangarRoofMesh);

    const hangarGlowGeo = new THREE.BoxGeometry(0.45, 0.35, 46.0);
    const hangarGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    this.hangarGlowMesh = new THREE.InstancedMesh(hangarGlowGeo, hangarGlowMat, MAX_HANGAR_INSTANCES * 4);
    this.hangarGlowMesh.frustumCulled = false;
    this.group.add(this.hangarGlowMesh);

    // 6f. Cloud-Layer Fly-Through Sky-Gates (1 draw call)
    const skyGateGeo = new THREE.TorusGeometry(18, 1.15, 8, 28);
    const skyGateMat = new THREE.MeshBasicMaterial({ color: 0xfde047, toneMapped: false });
    this.skyGateMesh = new THREE.InstancedMesh(skyGateGeo, skyGateMat, MAX_SKYGATE_INSTANCES);
    this.skyGateMesh.frustumCulled = false;
    this.group.add(this.skyGateMesh);

    // 6g. Street-Level Drive-Through Energy Gates (refill boost & award credits)
    const roadGateGeo = new THREE.TorusGeometry(4.4, 0.24, 8, 22);
    const roadGateMat = new THREE.MeshBasicMaterial({ color: 0x34d399, toneMapped: false });
    this.roadGateMesh = new THREE.InstancedMesh(roadGateGeo, roadGateMat, MAX_ROAD_GATE_INSTANCES);
    this.roadGateMesh.frustumCulled = false;
    this.group.add(this.roadGateMesh);

    this.disposables.push(
      hangarWallGeo,
      hangarMat,
      hangarRoofGeo,
      hangarGlowGeo,
      hangarGlowMat,
      skyGateGeo,
      skyGateMat,
      roadGateGeo,
      roadGateMat,
    );

    // 7. Planetary Horizon Surface (16km seamless planetary disc extending to the horizon)
    const abyssGeo = new THREE.CircleGeometry(16000, 32);
    abyssGeo.rotateX(-Math.PI / 2);
    const abyssMat = new THREE.MeshStandardMaterial({
      color: 0x10151f,
      roughness: 0.85,
      metalness: 0.15,
    });
    this.abyssFloor = new THREE.Mesh(abyssGeo, abyssMat);
    this.abyssFloor.position.y = -2.25;
    this.abyssFloor.receiveShadow = !lowTierProfile;
    this.group.add(this.abyssFloor);
    this.disposables.push(abyssGeo, abyssMat);

    // 8. Detailed 3D Flying Cars (Airspeeders + Glowing Engine Thrusters)
    const speederGeo = buildFlyingCarGeometry();
    const speederHullMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.78,
    });
    this.flyingCarMesh = new THREE.InstancedMesh(speederGeo, speederHullMat, FLYING_CAR_COUNT);
    this.flyingCarMesh.frustumCulled = false;
    this.group.add(this.flyingCarMesh);

    const thrusterGeo = new THREE.BoxGeometry(1.5, 0.22, 0.35);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.flyingCarGlowMesh = new THREE.InstancedMesh(thrusterGeo, thrusterMat, FLYING_CAR_COUNT);
    this.flyingCarGlowMesh.frustumCulled = false;
    this.group.add(this.flyingCarGlowMesh);
    this.disposables.push(speederGeo, speederHullMat, thrusterGeo, thrusterMat);

    const hullColors = ['#334155', '#475569', '#1e293b', '#7c2d12', '#1e3a5f', '#4c1d95'];
    const laneAltitudes = [12, 19, 28, 42, 62, 88, 108, 124];
    for (let i = 0; i < FLYING_CAR_COUNT; i++) {
      const axisZ = i % 2 === 0;
      const sign = i % 4 < 2 ? 1 : -1;
      const corridorBase = ((Math.floor(i / 4) % 5) - 2) * 320;
      const laneSide = (sign > 0 ? 1 : -1) * (8 + (i % 3) * 6);
      const altitude = laneAltitudes[i % laneAltitudes.length] + (Math.random() - 0.5) * 4;

      this.flyingCars.push({
        x: axisZ ? corridorBase + laneSide : (Math.random() - 0.5) * 1300,
        y: altitude,
        z: axisZ ? (Math.random() - 0.5) * 1300 : corridorBase + laneSide,
        dirX: axisZ ? 0 : sign,
        dirZ: axisZ ? sign : 0,
        speed: 32 + Math.random() * 44,
        bobPhase: Math.random() * Math.PI * 2,
      });

      _color.set(hullColors[i % hullColors.length]);
      this.flyingCarMesh.setColorAt(i, _color);

      _color.set(i % 3 === 0 ? '#38bdf8' : i % 2 === 0 ? '#ff6b35' : '#fbbf24');
      this.flyingCarGlowMesh.setColorAt(i, _color);
    }
    if (this.flyingCarMesh.instanceColor) this.flyingCarMesh.instanceColor.needsUpdate = true;
    if (this.flyingCarGlowMesh.instanceColor) this.flyingCarGlowMesh.instanceColor.needsUpdate = true;

    // 8b. Ground Street Cars (Moscow / Earth road traffic)
    const groundCarGeo = buildGroundCarGeometry();
    const groundCarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.55,
    });
    this.groundCarMesh = new THREE.InstancedMesh(groundCarGeo, groundCarMat, GROUND_CAR_COUNT);
    this.groundCarMesh.frustumCulled = false;
    this.groundCarMesh.visible = false;
    this.group.add(this.groundCarMesh);

    const headTailGeo = new THREE.BoxGeometry(1.45, 0.18, 0.25);
    const headTailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.groundCarGlowMesh = new THREE.InstancedMesh(headTailGeo, headTailMat, GROUND_CAR_COUNT);
    this.groundCarGlowMesh.frustumCulled = false;
    this.groundCarGlowMesh.visible = false;
    this.group.add(this.groundCarGlowMesh);
    this.disposables.push(groundCarGeo, groundCarMat, headTailGeo, headTailMat);

    const earthCarColors = ['#e2e8f0', '#1e293b', '#dc2626', '#2563eb', '#facc15', '#475569', '#059669'];
    for (let i = 0; i < GROUND_CAR_COUNT; i++) {
      const axisZ = i % 2 === 0;
      const sign = i % 4 < 2 ? 1 : -1;
      const corridorBase = ((Math.floor(i / 4) % 5) - 2) * CHUNK_SIZE;
      const laneSide = (sign > 0 ? 1 : -1) * (5.2 + (i % 2) * 5.2);
      this.groundCars.push({
        x: axisZ ? corridorBase + laneSide : (Math.random() - 0.5) * 1200,
        y: 0.02,
        z: axisZ ? (Math.random() - 0.5) * 1200 : corridorBase + laneSide,
        dirX: axisZ ? 0 : sign,
        dirZ: axisZ ? sign : 0,
        speed: 10 + Math.random() * 8,
        bobPhase: Math.random() * Math.PI * 2,
      });
      _color.set(earthCarColors[i % earthCarColors.length]);
      this.groundCarMesh.setColorAt(i, _color);
      _color.set('#fef08a');
      this.groundCarGlowMesh.setColorAt(i, _color);
    }
    if (this.groundCarMesh.instanceColor) this.groundCarMesh.instanceColor.needsUpdate = true;
    if (this.groundCarGlowMesh.instanceColor) this.groundCarGlowMesh.instanceColor.needsUpdate = true;

    // 8c. Special Landmarks: Moscow Red Square, Dom Serbosa, Flat Earth Ice Dome Edge & Reptiloid City
    this.buildSpecialLandmarks();

    // 9. Walking Pedestrians on Boulevard Sidewalks (1 draw call)
    const pedGeo = buildPedestrianGeometry();
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.1,
    });
    this.pedestrianMesh = new THREE.InstancedMesh(pedGeo, pedMat, PEDESTRIAN_COUNT);
    this.pedestrianMesh.frustumCulled = false;
    this.group.add(this.pedestrianMesh);
    this.disposables.push(pedGeo, pedMat);

    const outfitColors = ['#94a3b8', '#e2e8f0', '#38bdf8', '#f59e0b', '#fb7185', '#cbd5e1'];
    for (let i = 0; i < PEDESTRIAN_COUNT; i++) {
      const alongZ = i % 2 === 0;
      const side = i % 4 < 2 ? 1 : -1;
      const sidewalkOffset = side * (20.5 + (i % 3) * 1.4);
      const roadLine = ((Math.floor(i / 20) % 3) - 1) * CHUNK_SIZE;
      const dir = Math.random() > 0.5 ? 1 : -1;

      this.pedestrians.push({
        x: alongZ ? roadLine + sidewalkOffset : (Math.random() - 0.5) * 640,
        y: 0,
        z: alongZ ? (Math.random() - 0.5) * 640 : roadLine + sidewalkOffset,
        dirX: alongZ ? 0 : dir,
        dirZ: alongZ ? dir : 0,
        speed: 1.5 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        scale: 0.88 + Math.random() * 0.24,
        knocked: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotZ: 0,
        spinX: 0,
        spinZ: 0,
        knockedTimer: 0,
      });

      _color.set(outfitColors[i % outfitColors.length]);
      this.pedestrianMesh.setColorAt(i, _color);
    }
    if (this.pedestrianMesh.instanceColor) this.pedestrianMesh.instanceColor.needsUpdate = true;

    // 10. Layered 3D Cloud Sea (Y = 74..132m)
    const cloudTex = createCloudTexture();
    const cloudGeo = new THREE.PlaneGeometry(1, 1);
    this.cloudMaterial = new THREE.MeshBasicMaterial({
      map: cloudTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.cloudMesh = new THREE.InstancedMesh(cloudGeo, this.cloudMaterial, CLOUD_COUNT);
    this.cloudMesh.frustumCulled = false;
    this.cloudMesh.renderOrder = 2;
    this.group.add(this.cloudMesh);
    this.disposables.push(cloudTex, cloudGeo, this.cloudMaterial);

    const cloudLayers = [76, 96, 118];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const layer = i % 3;
      this.cloudPuffs.push({
        ox: (Math.random() - 0.5) * 1350,
        oy: cloudLayers[layer] + (Math.random() - 0.5) * 14,
        oz: (Math.random() - 0.5) * 1350,
        scaleX: 110 + Math.random() * 140,
        scaleY: 44 + Math.random() * 52,
        rot: Math.random() * Math.PI * 2,
        layer,
      });
    }

    // 11. Velocity-Reactive 3D Precipitation (strictly outside vehicle cabin!)
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    this.rainOffsets = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * 58;
      this.rainOffsets[i * 3 + 1] = Math.random() * 38 - 10;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 58;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMaterial = new THREE.LineBasicMaterial({
      color: 0xbfe3ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMaterial);
    this.rainLines.frustumCulled = false;
    this.group.add(this.rainLines);
    this.disposables.push(rainGeo, this.rainMaterial);

    this.setPlanetBiome({
      id: 'coruscant',
      biome: 'coruscant',
      seed: 101,
      name: 'Корускант',
    });
  }

  private buildSpecialLandmarks(): void {
    // 1) Moscow Red Square (centered around (0, 0, -10) on Earth)
    this.moscowGroup.visible = false;
    const cobbleGeo = new THREE.BoxGeometry(88, 0.08, 76);
    const cobbleMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.88,
      metalness: 0.08,
    });
    const cobble = new THREE.Mesh(cobbleGeo, cobbleMat);
    cobble.position.set(0, -0.02, -10);
    cobble.receiveShadow = true;
    this.moscowGroup.add(cobble);

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.82 });
    const trimStoneMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65 });
    const spireGreenMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.8 });
    const rubyMat = new THREE.MeshBasicMaterial({ color: 0xff2442, toneMapped: false });

    // Kremlin Wall on West side (x = -48)
    const wallGeo = new THREE.BoxGeometry(6, 11, 84);
    const kremlinWall = new THREE.Mesh(wallGeo, brickMat);
    kremlinWall.position.set(-48, 5.5, -10);
    this.moscowGroup.add(kremlinWall);

    // Spasskaya Tower (-47, 0, -10)
    const towerBaseGeo = new THREE.BoxGeometry(10, 20, 10);
    const towerBase = new THREE.Mesh(towerBaseGeo, brickMat);
    towerBase.position.set(-47, 10, -10);
    this.moscowGroup.add(towerBase);

    const belfryGeo = new THREE.BoxGeometry(7.2, 8, 7.2);
    const belfry = new THREE.Mesh(belfryGeo, trimStoneMat);
    belfry.position.set(-47, 24, -10);
    this.moscowGroup.add(belfry);

    const clockGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.4, 16);
    clockGeo.rotateZ(Math.PI / 2);
    const clockFaceMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7, toneMapped: false });
    const clockFace = new THREE.Mesh(clockGeo, clockFaceMat);
    clockFace.position.set(-41.9, 17, -10);
    this.moscowGroup.add(clockFace);

    const spireGeo = new THREE.ConeGeometry(5.6, 15, 4);
    spireGeo.rotateY(Math.PI / 4);
    const spire = new THREE.Mesh(spireGeo, spireGreenMat);
    spire.position.set(-47, 35.5, -10);
    this.moscowGroup.add(spire);

    const starGeo = new THREE.OctahedronGeometry(1.5, 0);
    const star = new THREE.Mesh(starGeo, rubyMat);
    star.position.set(-47, 44.5, -10);
    this.moscowGroup.add(star);

    // St. Basil's Cathedral cluster on North side (0, 0, -58)
    const basilBaseGeo = new THREE.BoxGeometry(22, 10, 16);
    const basilBase = new THREE.Mesh(basilBaseGeo, brickMat);
    basilBase.position.set(0, 5, -58);
    this.moscowGroup.add(basilBase);

    const centerTowerGeo = new THREE.CylinderGeometry(2.6, 3.4, 13, 10);
    const centerTower = new THREE.Mesh(centerTowerGeo, trimStoneMat);
    centerTower.position.set(0, 16.5, -58);
    this.moscowGroup.add(centerTower);

    const centerConeGeo = new THREE.ConeGeometry(3.2, 11, 8);
    const centerCone = new THREE.Mesh(centerConeGeo, goldMat);
    centerCone.position.set(0, 28, -58);
    this.moscowGroup.add(centerCone);

    const domeColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xeab308];
    const domeOffsets: [number, number][] = [
      [-6.5, -54],
      [6.5, -54],
      [-6.5, -62],
      [6.5, -62],
    ];
    const onionBaseGeo = new THREE.CylinderGeometry(1.8, 2.0, 9, 8);
    const onionDomeGeo = new THREE.SphereGeometry(2.7, 12, 10);
    const onionTipGeo = new THREE.ConeGeometry(1.1, 3.2, 8);
    for (let i = 0; i < domeOffsets.length; i++) {
      const [dx, dz] = domeOffsets[i];
      const drum = new THREE.Mesh(onionBaseGeo, trimStoneMat);
      drum.position.set(dx, 13.5, dz);
      this.moscowGroup.add(drum);

      const dMat = new THREE.MeshStandardMaterial({
        color: domeColors[i],
        roughness: 0.35,
        metalness: 0.25,
      });
      const onion = new THREE.Mesh(onionDomeGeo, dMat);
      onion.scale.set(1, 1.25, 1);
      onion.position.set(dx, 19.8, dz);
      this.moscowGroup.add(onion);

      const tip = new THREE.Mesh(onionTipGeo, goldMat);
      tip.position.set(dx, 24.2, dz);
      this.moscowGroup.add(tip);
      this.disposables.push(dMat);
    }

    // GUM Facade on East side (+49, 0, -10)
    const gumGeo = new THREE.BoxGeometry(9, 14, 74);
    const gumMat = new THREE.MeshStandardMaterial({ color: 0xe7dcc8, roughness: 0.72 });
    const gum = new THREE.Mesh(gumGeo, gumMat);
    gum.position.set(49, 7, -10);
    this.moscowGroup.add(gum);

    const gumGlowGeo = new THREE.BoxGeometry(0.4, 8, 66);
    const gumGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde68a, toneMapped: false });
    const gumGlow = new THREE.Mesh(gumGlowGeo, gumGlowMat);
    gumGlow.position.set(44.3, 6.2, -10);
    this.moscowGroup.add(gumGlow);

    this.group.add(this.moscowGroup);
    this.disposables.push(
      cobbleGeo,
      cobbleMat,
      brickMat,
      trimStoneMat,
      spireGreenMat,
      goldMat,
      rubyMat,
      wallGeo,
      towerBaseGeo,
      belfryGeo,
      clockGeo,
      clockFaceMat,
      spireGeo,
      starGeo,
      basilBaseGeo,
      centerTowerGeo,
      centerConeGeo,
      onionBaseGeo,
      onionDomeGeo,
      onionTipGeo,
      gumGeo,
      gumMat,
      gumGlowGeo,
      gumGlowMat,
    );

    // 2) Dom Serbosa at (-282, 0, 280) — ALWAYS off the road, beside the avenue and a scenic lake
    this.serbosGroup.position.set(-282, 0, 280);
    this.serbosGroup.visible = false;

    const yardGeo = new THREE.BoxGeometry(28, 0.08, 26);
    const yardMat = new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: 0.92 });
    const yard = new THREE.Mesh(yardGeo, yardMat);
    yard.position.set(0, -0.02, 2);
    this.serbosGroup.add(yard);

    // Scenic lakeside shore & reflective lake right next to Serbos's house
    const lakeRimGeo = new THREE.CylinderGeometry(17.4, 18.2, 0.07, 28);
    const lakeRimMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9 });
    const lakeRim = new THREE.Mesh(lakeRimGeo, lakeRimMat);
    lakeRim.position.set(25, 0.0, -2);
    this.serbosGroup.add(lakeRim);

    const lakeWaterGeo = new THREE.CylinderGeometry(16.2, 16.2, 0.09, 28);
    const lakeWaterMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.22,
      roughness: 0.08,
      metalness: 0.78,
      envMapIntensity: 1.5,
    });
    const lakeWater = new THREE.Mesh(lakeWaterGeo, lakeWaterMat);
    lakeWater.position.set(25, 0.02, -2);
    this.serbosGroup.add(lakeWater);

    // Wooden dock jutting into the lake + warm pier lantern
    const dockGeo = new THREE.BoxGeometry(6.8, 0.18, 2.4);
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    const dock = new THREE.Mesh(dockGeo, dockMat);
    dock.position.set(11.6, 0.24, -1.5);
    this.serbosGroup.add(dock);

    // Stone path leading directly from roadside (-15, 11) to front porch (0, 0)
    const pathMainGeo = new THREE.BoxGeometry(3.8, 0.1, 14);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const pathMain = new THREE.Mesh(pathMainGeo, pathMat);
    pathMain.position.set(-2, 0.02, 6);
    this.serbosGroup.add(pathMain);

    const pathSideGeo = new THREE.BoxGeometry(13, 0.1, 3.6);
    const pathSide = new THREE.Mesh(pathSideGeo, pathMat);
    pathSide.position.set(-8.5, 0.02, 10.5);
    this.serbosGroup.add(pathSide);

    const houseGeo = new THREE.BoxGeometry(14, 7.6, 11);
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
    const house = new THREE.Mesh(houseGeo, houseMat);
    house.position.set(0, 3.8, -6);
    this.serbosGroup.add(house);

    const roofGeo = new THREE.ConeGeometry(10.8, 5.2, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 10.2, -6);
    this.serbosGroup.add(roof);

    const doorGeo = new THREE.BoxGeometry(2.2, 3.4, 0.35);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.7, -0.4);
    this.serbosGroup.add(door);

    const winGeo = new THREE.BoxGeometry(11.4, 2.0, 0.3);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfde047, toneMapped: false });
    const win1 = new THREE.Mesh(winGeo, winMat);
    win1.position.set(0, 5.2, -0.4);
    this.serbosGroup.add(win1);

    const sideWinGeo = new THREE.BoxGeometry(0.3, 2.2, 6.4);
    const sideWin = new THREE.Mesh(sideWinGeo, winMat);
    sideWin.position.set(7.05, 3.2, -6);
    this.serbosGroup.add(sideWin);

    const lanternGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const lantern = new THREE.Mesh(lanternGeo, winMat);
    lantern.position.set(1.8, 3.6, 0.1);
    this.serbosGroup.add(lantern);

    const pierLantern = new THREE.Mesh(lanternGeo, winMat);
    pierLantern.position.set(14.5, 1.35, -2.4);
    this.serbosGroup.add(pierLantern);

    this.group.add(this.serbosGroup);
    this.disposables.push(
      yardGeo,
      yardMat,
      lakeRimGeo,
      lakeRimMat,
      lakeWaterGeo,
      lakeWaterMat,
      dockGeo,
      dockMat,
      pathMainGeo,
      pathSideGeo,
      pathMat,
      houseGeo,
      houseMat,
      roofGeo,
      roofMat,
      doorGeo,
      doorMat,
      winGeo,
      sideWinGeo,
      winMat,
      lanternGeo,
    );

    // 3) Flat Earth Edge & Great Ice Wall + Breach Gate to Reptiloid City at (0, 0, -960)
    this.domeEdgeGroup.position.set(0, 0, -960);
    this.domeEdgeGroup.visible = false;

    const iceWallGeo = new THREE.BoxGeometry(205, 26, 12);
    const iceWallMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.28,
      roughness: 0.25,
      metalness: 0.15,
    });
    const iceWallLeft = new THREE.Mesh(iceWallGeo, iceWallMat);
    iceWallLeft.position.set(-128, 13, -38);
    this.domeEdgeGroup.add(iceWallLeft);

    const iceWallRight = new THREE.Mesh(iceWallGeo, iceWallMat);
    iceWallRight.position.set(128, 13, -38);
    this.domeEdgeGroup.add(iceWallRight);

    const iceGateLintelGeo = new THREE.BoxGeometry(56, 3.2, 12);
    const iceGateGlowMat = new THREE.MeshBasicMaterial({ color: 0x10b981, toneMapped: false });
    const iceGateLintel = new THREE.Mesh(iceGateLintelGeo, iceWallMat);
    iceGateLintel.position.set(0, 24, -38);
    this.domeEdgeGroup.add(iceGateLintel);

    const iceGatePillarGeo = new THREE.BoxGeometry(2.6, 24, 13);
    for (const side of [-25.5, 25.5]) {
      const p = new THREE.Mesh(iceGatePillarGeo, iceGateGlowMat);
      p.position.set(side, 12, -38);
      this.domeEdgeGroup.add(p);
    }

    const domeBeamGeo = new THREE.TorusGeometry(230, 1.4, 8, 48, Math.PI);
    const domeBeamMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.45,
      fog: false,
    });
    const domeBeam1 = new THREE.Mesh(domeBeamGeo, domeBeamMat);
    domeBeam1.position.set(0, 12, -38);
    this.domeEdgeGroup.add(domeBeam1);

    const beaconPillarGeo = new THREE.CylinderGeometry(0.8, 1.1, 14, 8);
    const beaconPillar = new THREE.Mesh(beaconPillarGeo, iceWallMat);
    beaconPillar.position.set(-28, 7, -14);
    this.domeEdgeGroup.add(beaconPillar);

    this.group.add(this.domeEdgeGroup);
    this.disposables.push(
      iceWallGeo,
      iceWallMat,
      iceGateLintelGeo,
      iceGateGlowMat,
      iceGatePillarGeo,
      domeBeamGeo,
      domeBeamMat,
      beaconPillarGeo,
    );

    // 4) Secret Reptiloid City behind the Ice Barrier at (0, 0, -1280)
    this.reptiloidGroup.position.set(0, 0, -1280);
    this.reptiloidGroup.visible = false;

    const repPlazaGeo = new THREE.BoxGeometry(116, 0.14, 116);
    const repPlazaMat = new THREE.MeshStandardMaterial({
      color: 0x052e2b,
      roughness: 0.42,
      metalness: 0.52,
    });
    const repPlaza = new THREE.Mesh(repPlazaGeo, repPlazaMat);
    repPlaza.position.set(0, -0.02, 0);
    this.reptiloidGroup.add(repPlaza);

    const repObsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.78,
    });
    const repNeonMat = new THREE.MeshBasicMaterial({ color: 0x10b981, toneMapped: false });
    const repGoldMat = new THREE.MeshBasicMaterial({ color: 0xa3e635, toneMapped: false });

    const repRing1Geo = new THREE.TorusGeometry(28, 0.35, 8, 36);
    repRing1Geo.rotateX(Math.PI / 2);
    const repRing1 = new THREE.Mesh(repRing1Geo, repNeonMat);
    repRing1.position.set(0, 0.12, 0);
    this.reptiloidGroup.add(repRing1);

    const repRing2Geo = new THREE.TorusGeometry(44, 0.28, 8, 48);
    repRing2Geo.rotateX(Math.PI / 2);
    const repRing2 = new THREE.Mesh(repRing2Geo, repGoldMat);
    repRing2.position.set(0, 0.12, 0);
    this.reptiloidGroup.add(repRing2);

    const zigBaseGeo = new THREE.BoxGeometry(24, 10, 24);
    const zigMidGeo = new THREE.BoxGeometry(16, 12, 16);
    const zigTopGeo = new THREE.ConeGeometry(7.2, 16, 4);
    zigTopGeo.rotateY(Math.PI / 4);
    const zigStripGeo = new THREE.BoxGeometry(16.6, 0.55, 16.6);
    const zigPositions: [number, number][] = [
      [-40, -38],
      [40, -38],
      [-40, 38],
      [40, 38],
    ];
    for (const [zx, zz] of zigPositions) {
      const zb = new THREE.Mesh(zigBaseGeo, repObsidianMat);
      zb.position.set(zx, 5, zz);
      this.reptiloidGroup.add(zb);

      const zm = new THREE.Mesh(zigMidGeo, repObsidianMat);
      zm.position.set(zx, 16, zz);
      this.reptiloidGroup.add(zm);

      const zStrip = new THREE.Mesh(zigStripGeo, repNeonMat);
      zStrip.position.set(zx, 10.2, zz);
      this.reptiloidGroup.add(zStrip);

      const zt = new THREE.Mesh(zigTopGeo, repNeonMat);
      zt.position.set(zx, 29, zz);
      this.reptiloidGroup.add(zt);
    }

    const repArchGeo = new THREE.TorusGeometry(19, 0.75, 10, 32, Math.PI);
    const repArch = new THREE.Mesh(repArchGeo, repNeonMat);
    repArch.position.set(0, 0.5, 42);
    this.reptiloidGroup.add(repArch);

    const repObeliskGeo = new THREE.OctahedronGeometry(2.6, 0);
    const repObelisk = new THREE.Mesh(repObeliskGeo, repGoldMat);
    repObelisk.position.set(0, 12, -26);
    this.reptiloidGroup.add(repObelisk);

    const repBeaconRingGeo = new THREE.TorusGeometry(5.5, 0.3, 8, 28);
    this.reptiloidBeaconRing = new THREE.Mesh(repBeaconRingGeo, repNeonMat);
    this.reptiloidBeaconRing.position.set(0, 12, -26);
    this.reptiloidGroup.add(this.reptiloidBeaconRing);

    this.group.add(this.reptiloidGroup);
    this.disposables.push(
      repPlazaGeo,
      repPlazaMat,
      repObsidianMat,
      repNeonMat,
      repGoldMat,
      repRing1Geo,
      repRing2Geo,
      zigBaseGeo,
      zigMidGeo,
      zigTopGeo,
      zigStripGeo,
      repArchGeo,
      repObeliskGeo,
      repBeaconRingGeo,
    );
  }

  public setPlanetBiome(
    planet: Pick<PlanetConfig, 'id' | 'biome' | 'seed' | 'name'>,
    centerX = 0,
    centerZ = 0,
  ): void {
    this.planetId = planet.id;
    this.biomeId = planet.biome;
    this.worldSeed = planet.seed;
    this.planetName = planet.name;
    this.applyBiomeAndSeasonPalette();

    const cx = Math.round(centerX / CHUNK_SIZE);
    const cz = Math.round(centerZ / CHUNK_SIZE);
    this.rebuildChunks(cx, cz);
  }

  public setSeason(season: SeasonId): void {
    if (this.season === season) return;
    this.season = season;
    this.applyBiomeAndSeasonPalette();
    if (!Number.isNaN(this.lastChunkX) && !Number.isNaN(this.lastChunkZ)) {
      this.rebuildChunks(this.lastChunkX, this.lastChunkZ);
    }
  }

  private getSeasonalFoliagePalette(biome: BiomePreset): [string, string, string, string] {
    if (this.season === 'winter') {
      return ['#e2e8f0', '#bae6fd', '#cbd5e1', '#94a3b8'];
    }
    if (this.season === 'autumn') {
      if (this.biomeId === 'amethyst') {
        return ['#e879f9', '#f59e0b', '#fb7185', '#c084fc'];
      }
      return ['#d97706', '#ea580c', '#eab308', '#b45309'];
    }
    if (this.season === 'spring') {
      if (this.biomeId === 'coruscant' || this.biomeId === 'verdant') {
        return ['#4ade80', '#86efac', '#f9a8d4', '#fbcfe8'];
      }
    }
    return biome.foliagePalette;
  }

  private applyBiomeAndSeasonPalette(): void {
    const biome = BIOMES[this.biomeId];

    for (let i = 0; i < this.facadeMaterials.length; i++) {
      this.facadeMaterials[i].color.set(biome.facadeTints[i]);
      this.facadeMaterials[i].emissive.set(biome.facadeEmissiveTint);
    }
    this.trimMaterial.color.set(biome.trimColor);
    this.plazaMaterial.color.set(biome.plazaColor);
    this.fieldMaterial.color.set(biome.fieldColor);
    this.hillMaterial.color.set(biome.hillColor);
    this.pondMaterial.color.set(biome.pondColor);
    this.trunkMaterial.color.set(biome.trunkColor);
    this.roadMaterial.color.set(biome.roadColor);
    this.roadMaterial.emissive.set(biome.roadEmissiveTint);
    this.lampGlowMaterial.color.set(biome.lampColor);
    this.rainMaterial.color.set(biome.precipColor);

    if (this.season === 'winter') {
      this.fieldMaterial.color.lerp(_color.set('#e2effa'), 0.72);
      this.hillMaterial.color.lerp(_color.set('#cbdcf0'), 0.68);
      this.plazaMaterial.color.lerp(_color.set('#334155'), 0.35);
      this.roadMaterial.color.lerp(_color.set('#e0f2fe'), 0.32);
    } else if (this.season === 'autumn') {
      this.fieldMaterial.color.lerp(_color.set('#b8833e'), 0.5);
      this.hillMaterial.color.lerp(_color.set('#965e28'), 0.45);
    } else if (this.season === 'spring') {
      this.fieldMaterial.color.lerp(_color.set('#7ec868'), 0.25);
    }
  }

  public getNearbyBuildings(): BuildingFootprint[] {
    return this.activeBuildings;
  }

  public getLandmarks(): WorldLandmark[] {
    return this.landmarks;
  }

  public getSpecialSpots(): SpecialSpotInfo[] {
    return this.specialSpots;
  }

  public getNearestSpecialSpot(x: number, z: number): { spot: SpecialSpotInfo; distance: number } | null {
    let best: SpecialSpotInfo | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.specialSpots.length; i++) {
      const s = this.specialSpots[i];
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best ? { spot: best, distance: bestDist } : null;
  }

  public getWorldSeed(): number {
    return this.worldSeed;
  }

  public getNearestSerbosHouse(x: number, z: number): { name: string; distance: number } | null {
    if (!this.serbosGroup.visible) return null;
    const dDoor = Math.hypot(-282 - x, 285 - z);
    const dRoad = Math.hypot(-296 - x, 290 - z);
    return {
      name: 'Дом Сербоса',
      distance: Math.min(dDoor, dRoad),
    };
  }

  public getNearestCafe(x: number, z: number): { landmark: WorldLandmark; distance: number } | null {
    return this.getNearestLandmarkOfType(x, z, 'cafe');
  }

  public getNearestHotel(x: number, z: number): { landmark: WorldLandmark; distance: number } | null {
    return this.getNearestLandmarkOfType(x, z, 'hotel');
  }

  public getNearestObservatory(x: number, z: number): { landmark: WorldLandmark; distance: number } | null {
    return this.getNearestLandmarkOfType(x, z, 'observatory');
  }

  public getHangarAt(x: number, y: number, z: number): { id: string; name: string } | null {
    for (let i = 0; i < this.hangars.length; i++) {
      const h = this.hangars[i];
      if (
        Math.abs(x - h.x) <= h.halfW &&
        Math.abs(z - h.z) <= h.halfD &&
        y >= -1 &&
        y <= h.roofY
      ) {
        return { id: h.id, name: h.name };
      }
    }
    return null;
  }

  public getSkyGateAt(x: number, y: number, z: number): { id: string; name: string } | null {
    for (let i = 0; i < this.skyGates.length; i++) {
      const g = this.skyGates[i];
      if (Math.hypot(x - g.x, y - g.y) <= g.radius && Math.abs(z - g.z) <= 5.5) {
        return { id: g.id, name: g.name };
      }
    }
    return null;
  }

  public getRoadGateAt(x: number, y: number, z: number): { id: string; name: string } | null {
    if (y < -0.5 || y > 7.5) return null;
    for (let i = 0; i < this.roadGates.length; i++) {
      const g = this.roadGates[i];
      if (Math.hypot(x - g.x, z - g.z) <= g.radius) {
        return { id: g.id, name: g.name };
      }
    }
    return null;
  }

  private getNearestLandmarkOfType(
    x: number,
    z: number,
    type: WorldLandmark['type'],
  ): { landmark: WorldLandmark; distance: number } | null {
    let best: WorldLandmark | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.landmarks.length; i++) {
      const lm = this.landmarks[i];
      if (lm.type !== type) continue;
      const d = Math.hypot(lm.x - x, lm.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = lm;
      }
    }
    return best ? { landmark: best, distance: bestDist } : null;
  }

  public getZoneTypeAt(x: number, z: number): ChunkZoneType {
    const biome = BIOMES[this.biomeId];
    const cx = Math.round(x / CHUNK_SIZE);
    const cz = Math.round(z / CHUNK_SIZE);
    return getChunkZone(cx, cz, biome.openThreshold, this.worldSeed);
  }

  public isViaductOnlyAt(_x: number, _z: number): boolean {
    return false;
  }

  public isInCityAt(x: number, z: number): boolean {
    const zone = this.getZoneTypeAt(x, z);
    return zone === 'city' || zone === 'park';
  }

  public canWalkAt(_x: number, _z: number): boolean {
    return true;
  }

  public getZoneLabel(pos: THREE.Vector3): string {
    const biome = BIOMES[this.biomeId];
    const cx = Math.round(pos.x / CHUNK_SIZE);
    const cz = Math.round(pos.z / CHUNK_SIZE);
    if (pos.y > 55) return `${this.planetName} · Облачный слой`;
    if (this.biomeId === 'earth' && cx === 0 && cz <= -4) {
      return 'Земля · Город рептилоидов';
    }
    if (this.biomeId === 'earth' && cx === 0 && cz === -3) {
      return 'Земля · Ледяная стена и проход';
    }
    const zone = getChunkZone(cx, cz, biome.openThreshold, this.worldSeed);
    const suffix =
      zone === 'viaduct'
        ? biome.openLabel.split(' · ')[1] ?? 'Небесный виадук'
        : zone === 'fields'
          ? biome.fieldsLabel.split(' · ')[1] ?? 'Поля и рощи'
          : zone === 'park'
            ? biome.parkLabel.split(' · ')[1] ?? 'Парковый проспект'
            : biome.label.split(' · ')[1] ?? 'Центральный сектор';
    return `${this.planetName} · ${suffix}`;
  }

  private rebuildChunks(centerCx: number, centerCz: number): void {
    this.lastChunkX = centerCx;
    this.lastChunkZ = centerCz;
    this.activeBuildings.length = 0;
    this.landmarks.length = 0;
    this.specialSpots.length = 0;
    this.hangars.length = 0;
    this.skyGates.length = 0;
    this.roadGates.length = 0;

    const isEarth = this.biomeId === 'earth';
    this.moscowGroup.visible = false;
    this.serbosGroup.visible = false;
    this.domeEdgeGroup.visible = false;
    this.reptiloidGroup.visible = false;

    const biome = BIOMES[this.biomeId];
    const foliagePalette = this.getSeasonalFoliagePalette(biome);
    const sOff = this.worldSeed;
    const towerCounts = [0, 0, 0];
    const signCounts = [0, 0, 0, 0];
    let trimCount = 0;
    let domeCount = 0;
    let plazaCount = 0;
    let fieldCount = 0;
    let hillCount = 0;
    let pondCount = 0;
    let treeCount = 0;
    let roadCount = 0;
    let bridgeCount = 0;
    let beaconCount = 0;
    let lampCount = 0;
    let cafeCount = 0;
    let hotelCount = 0;
    let obsCount = 0;
    let hangarCount = 0;
    let skyGateCount = 0;
    let roadGateCount = 0;

    for (let gx = -this.gridRadius; gx <= this.gridRadius; gx++) {
      for (let gz = -this.gridRadius; gz <= this.gridRadius; gz++) {
        const cx = centerCx + gx;
        const cz = centerCz + gz;
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;
        const zone = getChunkZone(cx, cz, biome.openThreshold, sOff);
        const isNature = zone === 'fields' || zone === 'park';
        const arms = getChunkRoadArms(cx, cz, sOff);

        if ((zone === 'city' || zone === 'viaduct') && plazaCount < MAX_PLAZA_INSTANCES) {
          _dummy.position.set(originX, -2.15, originZ);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(CHUNK_SIZE, 4, CHUNK_SIZE);
          _dummy.updateMatrix();
          this.plazaMesh.setMatrixAt(plazaCount++, _dummy.matrix);
        } else if (isNature && fieldCount < MAX_FIELD_INSTANCES) {
          _dummy.position.set(originX, -2.12, originZ);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(CHUNK_SIZE, 4, CHUNK_SIZE);
          _dummy.updateMatrix();
          this.fieldMesh.setMatrixAt(fieldCount++, _dummy.matrix);
        } else if (plazaCount < MAX_PLAZA_INSTANCES) {
          _dummy.position.set(originX, -2.15, originZ);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(CHUNK_SIZE, 4, CHUNK_SIZE);
          _dummy.updateMatrix();
          this.plazaMesh.setMatrixAt(plazaCount++, _dummy.matrix);
        }

        // Seed-driven connected half-road arms + central intersection plaza
        if (roadCount < MAX_ROAD_INSTANCES) {
          _dummy.position.set(originX, -1.49, originZ);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(36, 3, 36);
          _dummy.updateMatrix();
          this.roadMesh.setMatrixAt(roadCount++, _dummy.matrix);
        }
        const halfArmLen = CHUNK_SIZE * 0.5;
        if (arms.n && roadCount < MAX_ROAD_INSTANCES) {
          _dummy.position.set(originX, -1.5, originZ - halfArmLen * 0.5);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(36, 3, halfArmLen);
          _dummy.updateMatrix();
          this.roadMesh.setMatrixAt(roadCount++, _dummy.matrix);
        }
        if (arms.s && roadCount < MAX_ROAD_INSTANCES) {
          _dummy.position.set(originX, -1.5, originZ + halfArmLen * 0.5);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(36, 3, halfArmLen);
          _dummy.updateMatrix();
          this.roadMesh.setMatrixAt(roadCount++, _dummy.matrix);
        }
        if (arms.e && roadCount < MAX_ROAD_INSTANCES) {
          _dummy.position.set(originX + halfArmLen * 0.5, -1.48, originZ);
          _dummy.rotation.set(0, Math.PI / 2, 0);
          _dummy.scale.set(36, 3, halfArmLen);
          _dummy.updateMatrix();
          this.roadMesh.setMatrixAt(roadCount++, _dummy.matrix);
        }
        if (arms.w && roadCount < MAX_ROAD_INSTANCES) {
          _dummy.position.set(originX - halfArmLen * 0.5, -1.48, originZ);
          _dummy.rotation.set(0, Math.PI / 2, 0);
          _dummy.scale.set(36, 3, halfArmLen);
          _dummy.updateMatrix();
          this.roadMesh.setMatrixAt(roadCount++, _dummy.matrix);
        }

        if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1 && zone !== 'fields') {
          for (let lz = -110; lz <= 110; lz += 55) {
            if (Math.abs(lz) < 24) continue;
            for (const side of [-19.2, 19.2]) {
              if (lampCount < MAX_LAMP_INSTANCES) {
                _dummy.position.set(originX + side, 3.1, originZ + lz);
                _dummy.rotation.set(0, 0, 0);
                _dummy.scale.set(1, 1, 1);
                _dummy.updateMatrix();
                this.lampPoleMesh.setMatrixAt(lampCount, _dummy.matrix);

                _dummy.position.set(originX + side * 0.96, 6.2, originZ + lz);
                _dummy.updateMatrix();
                this.lampGlowMesh.setMatrixAt(lampCount, _dummy.matrix);
                lampCount++;
              }
            }
          }
        }

        if (trimCount + 2 <= MAX_ACCENT_INSTANCES && (zone === 'city' || zone === 'viaduct')) {
          _dummy.position.set(originX - 18, -48, originZ - 18);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(5, 92, 5);
          _dummy.updateMatrix();
          this.trimMesh.setMatrixAt(trimCount++, _dummy.matrix);

          _dummy.position.set(originX + 18, -48, originZ + 18);
          _dummy.scale.set(5, 92, 5);
          _dummy.updateMatrix();
          this.trimMesh.setMatrixAt(trimCount++, _dummy.matrix);
        }

        if (zone === 'viaduct') {
          if (hash2(cx, cz, 19) > 0.25 && bridgeCount < MAX_BRIDGE_INSTANCES) {
            _dummy.position.set(originX, 26, originZ);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(54, 3.2, 6);
            _dummy.updateMatrix();
            this.bridgeMesh.setMatrixAt(bridgeCount++, _dummy.matrix);
          }
          continue;
        }

        if (zone === 'fields') {
          // Open countryside: rolling hills, reflective ponds, and forest groves
          const quadOffsets = [
            [-92, -92],
            [92, -92],
            [-92, 92],
            [92, 92],
          ];
          for (let q = 0; q < quadOffsets.length; q++) {
            const [qx, qz] = quadOffsets[q];
            const bx = originX + qx;
            const bz = originZ + qz;
            const seedBase = q * 37;
            const rType = hash2(cx, cz, seedBase + 1);

            let hillW = 0;
            let hillH = 0;
            let hasHill = false;
            if (rType > 0.62 && hillCount < MAX_HILL_INSTANCES) {
              hillW = 26 + hash2(cx, cz, seedBase + 2) * 28;
              hillH = 12 + hash2(cx, cz, seedBase + 3) * 22;
              hasHill = true;
              _dummy.position.set(bx, -2, bz);
              _dummy.rotation.set(0, hash2(cx, cz, seedBase + 4) * Math.PI, 0);
              _dummy.scale.set(hillW, hillH, hillW * 0.85);
              _dummy.updateMatrix();
              this.hillMesh.setMatrixAt(hillCount++, _dummy.matrix);

              if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
                this.activeBuildings.push({
                  x: bx,
                  z: bz,
                  halfW: hillW * 0.65,
                  halfD: hillW * 0.55,
                  height: hillH,
                });
              }
            } else if (rType < 0.2 && pondCount < MAX_POND_INSTANCES) {
              const pr = 24 + hash2(cx, cz, seedBase + 5) * 18;
              _dummy.position.set(bx, 0.04, bz);
              _dummy.rotation.set(0, 0, 0);
              _dummy.scale.set(pr, 1, pr * 0.82);
              _dummy.updateMatrix();
              this.pondMesh.setMatrixAt(pondCount++, _dummy.matrix);
            }

            // Dense groves in near 3x3 chunks, sparser landmark trees on outer horizon chunks
            const isNearChunk = Math.abs(gx) <= 1 && Math.abs(gz) <= 1;
            const treesInQuad = !isNearChunk ? 3 : rType < 0.2 ? 5 : 9;
            for (let t = 0; t < treesInQuad; t++) {
              if (treeCount >= MAX_TREE_INSTANCES) break;
              const ox = (hash2(cx, cz, seedBase + 20 + t * 2) - 0.5) * 104;
              const oz = (hash2(cx, cz, seedBase + 21 + t * 2) - 0.5) * 104;
              const tx = bx + ox;
              const tz = bz + oz;
              if (Math.abs(tx - originX) < 24 || Math.abs(tz - originZ) < 24) continue;
              // Don't plant inside a pond
              if (rType < 0.2 && Math.hypot(ox, oz) < 30) continue;

              // Elevate tree onto hill slope if inside a hill footprint so trunks are never buried
              let treeY = -0.2;
              if (hasHill) {
                const rNormSq = (ox / hillW) * (ox / hillW) + (oz / (hillW * 0.85)) * (oz / (hillW * 0.85));
                if (rNormSq < 0.85) {
                  treeY = Math.sqrt(Math.max(0, 1 - rNormSq)) * hillH - 2.4;
                }
              }

              const ts = 0.72 + hash2(cx, cz, seedBase + 60 + t) * 0.85;
              const tyaw = hash2(cx, cz, seedBase + 80 + t) * Math.PI * 2;
              _dummy.position.set(tx, treeY, tz);
              _dummy.rotation.set(0, tyaw, 0);
              _dummy.scale.set(ts, ts * (0.9 + hash2(cx, cz, seedBase + 95 + t) * 0.35), ts);
              _dummy.updateMatrix();
              this.treeTrunkMesh.setMatrixAt(treeCount, _dummy.matrix);
              this.treeCanopyMesh.setMatrixAt(treeCount, _dummy.matrix);
              const fCol = foliagePalette[Math.floor(hash2(cx, cz, seedBase + 110 + t) * 4) % 4];
              this.treeCanopyMesh.setColorAt(treeCount, _color.set(fCol));
              treeCount++;
            }
          }
          continue;
        }

        // Special Landmark hooks per chunk
        const isRedSquareChunk = isEarth && cx === 0 && cz === 0;
        const isSerbosChunk = (isEarth || this.biomeId === 'coruscant') && cx === -1 && cz === 1;
        const isDomeEdgeChunk = isEarth && cx === 0 && cz === -3;
        const isReptiloidChunk = isEarth && cx === 0 && cz === -4;

        if (isRedSquareChunk) {
          this.moscowGroup.visible = true;
          this.specialSpots.push({
            id: 'red_square',
            kind: 'red_square',
            name: 'Красная площадь · Москва',
            actionLabel: 'Осмотреть Красную площадь',
            x: 0,
            z: -10,
          });
          if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
            // Kremlin wall, St. Basil's, GUM colliders (leave open square clear!)
            this.activeBuildings.push(
              { x: -48, z: -10, halfW: 5.5, halfD: 42, height: 22 },
              { x: 0, z: -58, halfW: 11.5, halfD: 8.5, height: 24 },
              { x: 49, z: -10, halfW: 5, halfD: 37, height: 15 },
            );
          }
        }

        if (isSerbosChunk) {
          this.serbosGroup.visible = true;
          this.specialSpots.push({
            id: 'serbos_house',
            kind: 'serbos_house',
            name: 'Дом Сербоса у озера',
            actionLabel: 'Зайти к Сербосу',
            x: -292,
            z: 288,
          });
          if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
            this.activeBuildings.push({
              x: -282,
              z: 274,
              halfW: 7.4,
              halfD: 6.0,
              height: 11,
            });
          }
        }

        if (isDomeEdgeChunk) {
          this.domeEdgeGroup.visible = true;
          this.specialSpots.push({
            id: 'dome_edge',
            kind: 'dome_edge',
            name: 'Край Земли · Проход за стену',
            actionLabel: 'Изучить Ледяной проход',
            x: 0,
            z: -974,
          });
          if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
            // Split wall into West & East wings so the central North-South highway drives cleanly through x=0!
            this.activeBuildings.push(
              { x: -128, z: -998, halfW: 102.5, halfD: 6.5, height: 26 },
              { x: 128, z: -998, halfW: 102.5, halfD: 6.5, height: 26 },
            );
          }
        }

        if (isReptiloidChunk) {
          this.reptiloidGroup.visible = true;
          this.specialSpots.push({
            id: 'reptiloid_city',
            kind: 'reptiloid_city',
            name: 'Город рептилоидов',
            actionLabel: 'Исследовать Город рептилоидов',
            x: 0,
            z: -1280,
          });
          if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
            this.activeBuildings.push(
              { x: -40, z: -1318, halfW: 12, halfD: 12, height: 34 },
              { x: 40, z: -1318, halfW: 12, halfD: 12, height: 34 },
              { x: -40, z: -1242, halfW: 12, halfD: 12, height: 34 },
              { x: 40, z: -1242, halfW: 12, halfD: 12, height: 34 },
            );
          }
        }

        // 'city' or 'park'
        const isPark = zone === 'park';
        if (isPark && !isSerbosChunk) {
          // Roadside park trees along the avenues
          for (let rz = -125; rz <= 125; rz += 32) {
            if (Math.abs(rz) < 26) continue;
            for (const side of [-23.5, 23.5]) {
              if (treeCount < MAX_TREE_INSTANCES) {
                const ts = 0.85 + hash2(cx, cz, rz + side) * 0.45;
                _dummy.position.set(originX + side, -0.1, originZ + rz);
                _dummy.rotation.set(0, hash2(cx, cz, rz * 3 + side) * Math.PI, 0);
                _dummy.scale.setScalar(ts);
                _dummy.updateMatrix();
                this.treeTrunkMesh.setMatrixAt(treeCount, _dummy.matrix);
                this.treeCanopyMesh.setMatrixAt(treeCount, _dummy.matrix);
                const fCol = foliagePalette[Math.floor(hash2(cx, cz, rz + 71) * 4) % 4];
                this.treeCanopyMesh.setColorAt(treeCount, _color.set(fCol));
                treeCount++;
              }
            }
          }
        }

        const quadOffsets =
          isRedSquareChunk || isReptiloidChunk
            ? []
            : isSerbosChunk
              ? [
                  [-92, -92],
                  [-92, 92],
                  [92, 92],
                ]
              : [
                  [-92, -92],
                  [92, -92],
                  [-92, 92],
                  [92, 92],
                ];

        for (let q = 0; q < quadOffsets.length; q++) {
          const [qx, qz] = quadOffsets[q];
          const bx = originX + qx;
          const bz = originZ + qz;
          const seedBase = q * 31;

          // In park districts, alternate low sleek villas with small park groves
          if (isPark && q % 2 === 1) {
            for (let t = 0; t < 6; t++) {
              if (treeCount >= MAX_TREE_INSTANCES) break;
              const tx = bx + (hash2(cx, cz, seedBase + 40 + t) - 0.5) * 84;
              const tz = bz + (hash2(cx, cz, seedBase + 50 + t) - 0.5) * 84;
              const ts = 0.85 + hash2(cx, cz, seedBase + 70 + t) * 0.7;
              _dummy.position.set(tx, -0.1, tz);
              _dummy.rotation.set(0, t * 1.1, 0);
              _dummy.scale.setScalar(ts);
              _dummy.updateMatrix();
              this.treeTrunkMesh.setMatrixAt(treeCount, _dummy.matrix);
              this.treeCanopyMesh.setMatrixAt(treeCount, _dummy.matrix);
              const fCol = foliagePalette[(t + q) % 4];
              this.treeCanopyMesh.setColorAt(treeCount, _color.set(fCol));
              treeCount++;
            }
            continue;
          }

          const rStyle = Math.floor(hash2(cx, cz, seedBase + 1) * 3) % 3;
          const rHeight = hash2(cx, cz, seedBase + 2);
          const rWidth = hash2(cx, cz, seedBase + 3);
          const rSpire = hash2(cx, cz, seedBase + 4);

          const heightMult = isPark ? 0.36 : 1.0;
          const baseW = (isPark ? 48 : 74) + rWidth * (isPark ? 22 : 36);
          const baseD = (isPark ? 48 : 74) + hash2(cx, cz, seedBase + 5) * (isPark ? 22 : 36);
          const tier1H = (55 + rHeight * 90) * biome.heightScale * heightMult;
          const tier2H = (35 + rSpire * 75) * biome.heightScale * heightMult;

          if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
            this.activeBuildings.push({
              x: bx,
              z: bz,
              halfW: baseW * 0.5,
              halfD: baseD * 0.5,
              height: tier1H + tier2H,
            });
          }

          const podiumFullH = tier1H + 95;
          if (towerCounts[rStyle] < MAX_TOWER_INSTANCES) {
            _dummy.position.set(bx, -95 + podiumFullH * 0.5, bz);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(baseW, podiumFullH, baseD);
            _dummy.updateMatrix();
            this.towerMeshes[rStyle].setMatrixAt(towerCounts[rStyle]++, _dummy.matrix);
          }

          const upperStyle = (rStyle + 1) % 3;
          if (towerCounts[upperStyle] < MAX_TOWER_INSTANCES) {
            const w2 = baseW * 0.64;
            const d2 = baseD * 0.64;
            _dummy.position.set(bx, tier1H + tier2H * 0.5, bz);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(w2, tier2H, d2);
            _dummy.updateMatrix();
            this.towerMeshes[upperStyle].setMatrixAt(towerCounts[upperStyle]++, _dummy.matrix);
          }

          const totalH = tier1H + tier2H;

          if (rSpire <= biome.domeChance && domeCount < MAX_DOME_INSTANCES) {
            const domeR = baseW * 0.27;
            _dummy.position.set(bx, totalH - 1, bz);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(domeR, domeR * 0.72, domeR);
            _dummy.updateMatrix();
            this.domeMesh.setMatrixAt(domeCount++, _dummy.matrix);
          }

          if (!isPark && rSpire > biome.domeChance && trimCount < MAX_ACCENT_INSTANCES) {
            const needleH = 18 + rSpire * 34;
            _dummy.position.set(bx, totalH + needleH * 0.5, bz);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(4.5, needleH, 4.5);
            _dummy.updateMatrix();
            this.trimMesh.setMatrixAt(trimCount++, _dummy.matrix);

            if (beaconCount < MAX_BEACON_INSTANCES) {
              _dummy.position.set(bx, totalH + needleH + 1.2, bz);
              _dummy.scale.setScalar(1.3);
              _dummy.updateMatrix();
              _color.set(rSpire > 0.7 ? biome.beaconColors[0] : biome.beaconColors[1]);
              this.beaconMesh.setMatrixAt(beaconCount, _dummy.matrix);
              this.beaconMesh.setColorAt(beaconCount, _color);
              beaconCount++;
            }
          }

          if (biome.showSigns && !isPark && Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
            const sIdx = Math.floor(hash2(cx, cz, seedBase + 11) * 4) % 4;
            if (signCounts[sIdx] < MAX_SIGN_PER_STYLE) {
              const faceTowardX = q % 2 === 0 ? 1 : -1;
              const signX = bx + faceTowardX * (baseW * 0.5 + 0.6);
              const signY = 12 + hash2(cx, cz, seedBase + 12) * 18;
              _dummy.position.set(signX, signY, bz);
              _dummy.rotation.set(0, faceTowardX > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
              _dummy.scale.set(1.1, 1.1, 1);
              _dummy.updateMatrix();
              this.signMeshes[sIdx].setMatrixAt(signCounts[sIdx]++, _dummy.matrix);
            }
          }
        }

        if (!isPark && hash2(cx, cz, 99) > 0.35 && bridgeCount < MAX_BRIDGE_INSTANCES) {
          const bh = 38 + hash2(cx, cz, 100) * 52;
          _dummy.position.set(originX, bh, originZ + 72);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(165, 6.5, 11);
          _dummy.updateMatrix();
          this.bridgeMesh.setMatrixAt(bridgeCount++, _dummy.matrix);
        }

        // Cozy roadside Aero-Café pavilion in city & park blocks
        if ((zone === 'city' || isPark) && !isRedSquareChunk && !isSerbosChunk && cafeCount < MAX_CAFE_INSTANCES) {
          const spawnCafe = (cx === 0 && cz === 0) || (isEarth && cx === 1 && cz === 0) || hash2(cx, cz, sOff + 513) > 0.36;
          if (spawnCafe) {
            const side = cx === 0 && cz === 0 ? 1 : hash2(cx, cz, sOff + 514) > 0.5 ? 1 : -1;
            const cafeX = originX + side * 27.5;
            const cafeZ = originZ - 48;
            _dummy.position.set(cafeX, 2.1, cafeZ);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.cafeBodyMesh.setMatrixAt(cafeCount, _dummy.matrix);

            _dummy.position.set(cafeX - side * 1.1, 4.3, cafeZ);
            _dummy.updateMatrix();
            this.cafeAwningMesh.setMatrixAt(cafeCount, _dummy.matrix);

            _dummy.position.set(cafeX - side * 4.35, 2.0, cafeZ);
            _dummy.updateMatrix();
            this.cafeGlowMesh.setMatrixAt(cafeCount, _dummy.matrix);

            if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
              this.activeBuildings.push({
                x: cafeX,
                z: cafeZ,
                halfW: 4.3,
                halfD: 6.3,
                height: 4.5,
              });
            }

            const cafeNames = isEarth
              ? ['Кофейня на Тверской', 'Московская кофейня', 'Булочная «У Кремля»']
              : ['Аэро-кафе «Горизонт»', 'Кафе «Неон 1313»', 'Терраса «Туманность»', 'Кофейня «Звёздный путь»'];
            const cName = cafeNames[Math.abs(cx * 3 + cz * 7 + sOff) % cafeNames.length];
            this.landmarks.push({
              id: `cafe_${cx}_${cz}`,
              type: 'cafe',
              name: cName,
              x: cafeX - side * 7.5,
              z: cafeZ,
            });
            cafeCount++;
          }
        }

        // Boutique Sky-Hotel along city & park avenues (enterable suite!)
        if ((zone === 'city' || isPark) && !isRedSquareChunk && !isSerbosChunk && hotelCount < MAX_HOTEL_INSTANCES) {
          const spawnHotel = (cx === 0 && cz === 0) || (isEarth && cx === 1 && cz === 0) || hash2(cx, cz, sOff + 613) > 0.45;
          if (spawnHotel) {
            const side = cx === 0 && cz === 0 ? -1 : hash2(cx, cz, sOff + 614) > 0.5 ? 1 : -1;
            const hotelX = originX + side * 30.5;
            const hotelZ = originZ - 82;
            _dummy.position.set(hotelX, 11.0, hotelZ);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.hotelBodyMesh.setMatrixAt(hotelCount, _dummy.matrix);

            _dummy.position.set(hotelX - side * 7.8, 3.6, hotelZ);
            _dummy.updateMatrix();
            this.hotelCanopyMesh.setMatrixAt(hotelCount, _dummy.matrix);

            _dummy.position.set(hotelX - side * 7.35, 11.2, hotelZ);
            _dummy.updateMatrix();
            this.hotelGlowMesh.setMatrixAt(hotelCount, _dummy.matrix);

            if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
              this.activeBuildings.push({
                x: hotelX,
                z: hotelZ,
                halfW: 7.3,
                halfD: 8.1,
                height: 22.0,
              });
            }

            const hotelNames = isEarth
              ? ['Отель «Метрополь»', 'Гранд-Отель «Москва»', 'Отель «Националь»']
              : ['Отель «Звёздное небо»', 'Гранд-Отель «Люмен»', 'Апарт-отель «Аврора»', 'Бутик-отель «Селена»'];
            const hName = hotelNames[Math.abs(cx * 5 + cz * 11 + sOff) % hotelNames.length];
            this.landmarks.push({
              id: `hotel_${cx}_${cz}`,
              type: 'hotel',
              name: hName,
              x: hotelX - side * 10.5,
              z: hotelZ,
            });
            hotelCount++;
          }
        }

        // Walk-in Star Observatory Dome in park & city districts
        if ((isPark || zone === 'city') && !isRedSquareChunk && !isSerbosChunk && obsCount < MAX_OBS_INSTANCES) {
          const spawnObs = (cx === 0 && cz === -1) || hash2(cx, cz, sOff + 733) > 0.62;
          if (spawnObs) {
            const side = cx === 0 && cz === -1 ? 1 : hash2(cx, cz, sOff + 734) > 0.5 ? 1 : -1;
            const obsX = originX + side * 29.5;
            const obsZ = originZ + 54;
            _dummy.position.set(obsX, 1.6, obsZ);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.obsBaseMesh.setMatrixAt(obsCount, _dummy.matrix);

            _dummy.position.set(obsX, 3.0, obsZ);
            _dummy.updateMatrix();
            this.obsDomeMesh.setMatrixAt(obsCount, _dummy.matrix);

            _dummy.position.set(obsX, 3.25, obsZ);
            _dummy.updateMatrix();
            this.obsRingMesh.setMatrixAt(obsCount, _dummy.matrix);

            if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
              this.activeBuildings.push({
                x: obsX,
                z: obsZ,
                halfW: 7.4,
                halfD: 7.4,
                height: 9.8,
              });
            }

            const obsNames = isEarth
              ? ['Московский планетарий', 'Купол наблюдений «Земля»']
              : ['Обсерватория «Зеркало неба»', 'Планетарий «Космос»', 'Звёздный купол «Вега»'];
            const oName = obsNames[Math.abs(cx * 7 + cz * 3 + sOff) % obsNames.length];
            this.landmarks.push({
              id: `obs_${cx}_${cz}`,
              type: 'observatory',
              name: oName,
              x: obsX - side * 10.0,
              z: obsZ,
            });
            obsCount++;
          }
        }

        // Hollow Drive-In & Fly-In Aero-Hangar straddling the avenue (open 26m x 15m interior!)
        if (hangarCount < MAX_HANGAR_INSTANCES && (zone === 'city' || isPark) && !isRedSquareChunk && !isSerbosChunk) {
          const spawnHangar = (cx === 0 && cz === 0) || hash2(cx, cz, sOff + 811) > 0.68;
          if (spawnHangar && arms.s) {
            const hx = originX;
            const hz = originZ + 96;
            const wallXOffset = 14.5;

            for (const side of [-1, 1]) {
              _dummy.position.set(hx + side * wallXOffset, 8.25, hz);
              _dummy.rotation.set(0, 0, 0);
              _dummy.scale.set(1, 1, 1);
              _dummy.updateMatrix();
              this.hangarWallMesh.setMatrixAt(hangarCount * 2 + (side === -1 ? 0 : 1), _dummy.matrix);

              if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
                this.activeBuildings.push({
                  x: hx + side * wallXOffset,
                  z: hz,
                  halfW: 1.5,
                  halfD: 24.0,
                  height: 17.0,
                });
              }
            }

            _dummy.position.set(hx, 16.5, hz);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.hangarRoofMesh.setMatrixAt(hangarCount, _dummy.matrix);

            // 4 glowing interior guide strips along deck & upper corners
            const stripOffsets: [number, number][] = [
              [-11.8, 0.2],
              [11.8, 0.2],
              [-12.2, 14.8],
              [12.2, 14.8],
            ];
            for (let si = 0; si < stripOffsets.length; si++) {
              _dummy.position.set(hx + stripOffsets[si][0], stripOffsets[si][1], hz);
              _dummy.rotation.set(0, 0, 0);
              _dummy.scale.set(1, 1, 1);
              _dummy.updateMatrix();
              this.hangarGlowMesh.setMatrixAt(hangarCount * 4 + si, _dummy.matrix);
            }

            const hNames = ['Аэро-Ангар №1', 'Небесный Док «Северный»', 'Терминал-Укрытие'];
            this.hangars.push({
              id: `hangar_${cx}_${cz}`,
              name: hNames[Math.abs(cx * 3 + cz * 5 + sOff) % hNames.length],
              x: hx,
              z: hz,
              halfW: 12.6,
              halfD: 23.5,
              roofY: 16.0,
            });
            hangarCount++;
          }
        }

        // Cloud-layer fly-through Sky-Gate rings
        if (skyGateCount < MAX_SKYGATE_INSTANCES && (hash2(cx, cz, sOff + 911) > 0.6 || (cx === 0 && cz === -1))) {
          const gy = 96 + (hash2(cx, cz, sOff + 912) - 0.5) * 18;
          const gz = originZ - 40;
          _dummy.position.set(originX, gy, gz);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          this.skyGateMesh.setMatrixAt(skyGateCount, _dummy.matrix);
          this.skyGates.push({
            id: `gate_${cx}_${cz}`,
            name: 'Небесные Врата',
            x: originX,
            y: gy,
            z: gz,
            radius: 16.0,
          });
          skyGateCount++;
        }

        // Street-level drive-through Energy Rings along boulevards (boost + credits!)
        if (
          roadGateCount < MAX_ROAD_GATE_INSTANCES &&
          !isRedSquareChunk &&
          !isSerbosChunk &&
          (hash2(cx, cz, sOff + 951) > 0.52 || (cx === 0 && cz === -1) || (cx === 1 && cz === 0))
        ) {
          const onEast = arms.e && (hash2(cx, cz, sOff + 952) > 0.5 || !arms.n);
          const rgx = onEast ? originX + 78 : originX;
          const rgz = onEast ? originZ : originZ - 78;
          _dummy.position.set(rgx, 2.2, rgz);
          _dummy.rotation.set(0, onEast ? Math.PI / 2 : 0, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          this.roadGateMesh.setMatrixAt(roadGateCount, _dummy.matrix);
          this.roadGates.push({
            id: `rgate_${cx}_${cz}`,
            name: 'Энерго-врата трассы',
            x: rgx,
            y: 2.2,
            z: rgz,
            radius: 5.2,
          });
          roadGateCount++;
        }
      }
    }

    for (let i = 0; i < this.towerMeshes.length; i++) {
      this.towerMeshes[i].count = towerCounts[i];
      this.towerMeshes[i].instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < this.signMeshes.length; i++) {
      this.signMeshes[i].count = signCounts[i];
      this.signMeshes[i].instanceMatrix.needsUpdate = true;
    }
    this.trimMesh.count = trimCount;
    this.trimMesh.instanceMatrix.needsUpdate = true;
    this.domeMesh.count = domeCount;
    this.domeMesh.instanceMatrix.needsUpdate = true;
    this.plazaMesh.count = plazaCount;
    this.plazaMesh.instanceMatrix.needsUpdate = true;
    this.fieldMesh.count = fieldCount;
    this.fieldMesh.instanceMatrix.needsUpdate = true;
    this.hillMesh.count = hillCount;
    this.hillMesh.instanceMatrix.needsUpdate = true;
    this.pondMesh.count = pondCount;
    this.pondMesh.instanceMatrix.needsUpdate = true;
    this.treeTrunkMesh.count = treeCount;
    this.treeTrunkMesh.instanceMatrix.needsUpdate = true;
    this.treeCanopyMesh.count = treeCount;
    this.treeCanopyMesh.instanceMatrix.needsUpdate = true;
    if (this.treeCanopyMesh.instanceColor) this.treeCanopyMesh.instanceColor.needsUpdate = true;
    this.roadMesh.count = roadCount;
    this.roadMesh.instanceMatrix.needsUpdate = true;
    this.bridgeMesh.count = bridgeCount;
    this.bridgeMesh.instanceMatrix.needsUpdate = true;
    this.lampPoleMesh.count = lampCount;
    this.lampPoleMesh.instanceMatrix.needsUpdate = true;
    this.lampGlowMesh.count = lampCount;
    this.lampGlowMesh.instanceMatrix.needsUpdate = true;
    this.cafeBodyMesh.count = cafeCount;
    this.cafeBodyMesh.instanceMatrix.needsUpdate = true;
    this.cafeAwningMesh.count = cafeCount;
    this.cafeAwningMesh.instanceMatrix.needsUpdate = true;
    this.cafeGlowMesh.count = cafeCount;
    this.cafeGlowMesh.instanceMatrix.needsUpdate = true;
    this.hotelBodyMesh.count = hotelCount;
    this.hotelBodyMesh.instanceMatrix.needsUpdate = true;
    this.hotelCanopyMesh.count = hotelCount;
    this.hotelCanopyMesh.instanceMatrix.needsUpdate = true;
    this.hotelGlowMesh.count = hotelCount;
    this.hotelGlowMesh.instanceMatrix.needsUpdate = true;
    this.obsBaseMesh.count = obsCount;
    this.obsBaseMesh.instanceMatrix.needsUpdate = true;
    this.obsDomeMesh.count = obsCount;
    this.obsDomeMesh.instanceMatrix.needsUpdate = true;
    this.obsRingMesh.count = obsCount;
    this.obsRingMesh.instanceMatrix.needsUpdate = true;
    this.hangarWallMesh.count = hangarCount * 2;
    this.hangarWallMesh.instanceMatrix.needsUpdate = true;
    this.hangarRoofMesh.count = hangarCount;
    this.hangarRoofMesh.instanceMatrix.needsUpdate = true;
    this.hangarGlowMesh.count = hangarCount * 4;
    this.hangarGlowMesh.instanceMatrix.needsUpdate = true;
    this.skyGateMesh.count = skyGateCount;
    this.skyGateMesh.instanceMatrix.needsUpdate = true;
    this.roadGateMesh.count = roadGateCount;
    this.roadGateMesh.instanceMatrix.needsUpdate = true;
    this.beaconMesh.count = beaconCount;
    this.beaconMesh.instanceMatrix.needsUpdate = true;
    if (this.beaconMesh.instanceColor) this.beaconMesh.instanceColor.needsUpdate = true;
  }

  public update(
    vehiclePos: THREE.Vector3,
    vehicleHeading: number,
    vehicleVel: THREE.Vector3,
    cameraQuat: THREE.Quaternion,
    nightFactor: number,
    cloudTint: THREE.Color,
    horizonColor: THREE.Color,
    weather: WeatherMode,
    spaceFactor: number,
    delta: number,
    elapsed: number,
    insideInterior = false,
    isWalking = false,
    shelteredInHangar = false,
  ): number {
    this.group.visible = !insideInterior && spaceFactor < 0.99;
    if (!this.group.visible) return 0;

    if (this.reptiloidBeaconRing) {
      this.reptiloidBeaconRing.rotation.y = elapsed * 1.4;
      this.reptiloidBeaconRing.rotation.x = Math.sin(elapsed * 0.9) * 0.45;
    }

    const biome = BIOMES[this.biomeId];
    const cx = Math.round(vehiclePos.x / CHUNK_SIZE);
    const cz = Math.round(vehiclePos.z / CHUNK_SIZE);
    if (cx !== this.lastChunkX || cz !== this.lastChunkZ) {
      this.rebuildChunks(cx, cz);
    }

    this.abyssFloor.position.x = vehiclePos.x;
    this.abyssFloor.position.z = vehiclePos.z;
    const groundMat = this.abyssFloor.material as THREE.MeshStandardMaterial;
    const currentZone = this.getZoneTypeAt(vehiclePos.x, vehiclePos.z);
    const baseFloorColor = currentZone === 'fields' || currentZone === 'park' ? biome.fieldColor : biome.plazaColor;
    groundMat.color.set(baseFloorColor);
    if (weather === 'snow' || this.season === 'winter') {
      groundMat.color.lerp(_color.set('#e2effa'), 0.72);
    } else if (this.season === 'autumn') {
      groundMat.color.lerp(_color.set('#965e28'), 0.35);
    }

    const cityGlow = 0.25 + nightFactor * 1.15;
    for (const mat of this.facadeMaterials) {
      mat.emissiveIntensity = cityGlow;
    }

    const isWet = weather === 'rain' || weather === 'storm';
    const isSnow = weather === 'snow' || this.season === 'winter';
    const targetRoughness = isWet ? 0.08 : isSnow ? 0.52 : 0.35;
    const targetMetalness = isWet ? 0.85 : isSnow ? 0.12 : 0.32;
    this.roadMaterial.roughness = THREE.MathUtils.damp(
      this.roadMaterial.roughness,
      targetRoughness,
      2.5,
      delta,
    );
    this.roadMaterial.metalness = THREE.MathUtils.damp(
      this.roadMaterial.metalness,
      targetMetalness,
      2.5,
      delta,
    );
    if (isWet) {
      this.roadMaterial.color.set('#1e293b');
    } else if (isSnow) {
      this.roadMaterial.color.set('#e2e8f0');
    } else {
      this.roadMaterial.color.set(biome.roadColor);
    }
    this.roadMaterial.emissiveIntensity = 0.35 + nightFactor * 0.85;
    this.roadMaterial.envMapIntensity = 1.4 - nightFactor * 0.65;
    this.pondMaterial.envMapIntensity = 1.5 - nightFactor * 0.75;

    // 1. Animate 3D Flying Cars + Thrusters (or Ground Street Cars on Earth/Moscow)
    const activeCars = spaceFactor > 0.72 ? 0 : Math.floor(biome.carCount * this.trafficScale);
    const isEarth = this.biomeId === 'earth';
    this.flyingCarMesh.visible = activeCars > 0;
    this.flyingCarGlowMesh.visible = activeCars > 0;
    if (activeCars > 0) {
      this.flyingCarMesh.count = activeCars;
      this.flyingCarGlowMesh.count = activeCars;
      const carWrap = 650;
      for (let i = 0; i < activeCars; i++) {
        const c = this.flyingCars[i];
        c.x += c.dirX * c.speed * delta;
        c.z += c.dirZ * c.speed * delta;

        if (c.x - vehiclePos.x > carWrap) c.x -= carWrap * 2;
        else if (c.x - vehiclePos.x < -carWrap) c.x += carWrap * 2;

        if (c.z - vehiclePos.z > carWrap) c.z -= carWrap * 2;
        else if (c.z - vehiclePos.z < -carWrap) c.z += carWrap * 2;

        const hoverY = c.y + Math.sin(elapsed * 1.8 + c.bobPhase) * 0.35;
        const yaw = c.dirX !== 0 ? (c.dirX > 0 ? Math.PI / 2 : -Math.PI / 2) : c.dirZ > 0 ? 0 : Math.PI;

        _dummy.position.set(c.x, hoverY, c.z);
        _dummy.rotation.set(0, yaw, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        this.flyingCarMesh.setMatrixAt(i, _dummy.matrix);

        _glowDummy.position.set(
          c.x - c.dirX * 2.65,
          hoverY - 0.05,
          c.z - c.dirZ * 2.65,
        );
        _glowDummy.rotation.set(0, yaw, 0);
        _glowDummy.scale.setScalar(1);
        _glowDummy.updateMatrix();
        this.flyingCarGlowMesh.setMatrixAt(i, _glowDummy.matrix);
      }
      this.flyingCarMesh.instanceMatrix.needsUpdate = true;
      this.flyingCarGlowMesh.instanceMatrix.needsUpdate = true;
    }

    const activeGroundCars =
      isEarth && vehiclePos.y < 140 ? Math.max(18, Math.floor(GROUND_CAR_COUNT * this.trafficScale)) : 0;
    this.groundCarMesh.visible = activeGroundCars > 0;
    this.groundCarGlowMesh.visible = activeGroundCars > 0;
    if (activeGroundCars > 0) {
      this.groundCarMesh.count = activeGroundCars;
      this.groundCarGlowMesh.count = activeGroundCars;
      const gWrap = 560;
      for (let i = 0; i < activeGroundCars; i++) {
        const c = this.groundCars[i];
        // Yield politely if player is walking close in front of the street car
        const dxP = vehiclePos.x - c.x;
        const dzP = vehiclePos.z - c.z;
        const ahead = dxP * c.dirX + dzP * c.dirZ;
        const lateral = Math.abs(dxP * -c.dirZ + dzP * c.dirX);
        const yieldStop = isWalking && ahead > 0 && ahead < 9.5 && lateral < 3.0;
        const effSpeed = yieldStop ? 0 : c.speed;

        c.x += c.dirX * effSpeed * delta;
        c.z += c.dirZ * effSpeed * delta;

        if (c.x - vehiclePos.x > gWrap) c.x -= gWrap * 2;
        else if (c.x - vehiclePos.x < -gWrap) c.x += gWrap * 2;

        if (c.z - vehiclePos.z > gWrap) c.z -= gWrap * 2;
        else if (c.z - vehiclePos.z < -gWrap) c.z += gWrap * 2;

        const yaw = c.dirX !== 0 ? (c.dirX > 0 ? Math.PI / 2 : -Math.PI / 2) : c.dirZ > 0 ? 0 : Math.PI;
        _dummy.position.set(c.x, 0, c.z);
        _dummy.rotation.set(0, yaw, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        this.groundCarMesh.setMatrixAt(i, _dummy.matrix);

        _glowDummy.position.set(c.x + c.dirX * 2.15, 0.56, c.z + c.dirZ * 2.15);
        _glowDummy.rotation.set(0, yaw, 0);
        _glowDummy.scale.setScalar(1);
        _glowDummy.updateMatrix();
        this.groundCarGlowMesh.setMatrixAt(i, _glowDummy.matrix);
      }
      this.groundCarMesh.instanceMatrix.needsUpdate = true;
      this.groundCarGlowMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Animate Street Pedestrians + Knockdown Physics on Player Vehicle Impact
    let newlyKnocked = 0;
    const activePeds = Math.floor(biome.pedCount * this.trafficScale);
    const canHitPeds = !insideInterior && !isWalking && vehiclePos.y < 2.2;
    const carSpeed = canHitPeds ? Math.hypot(vehicleVel.x, vehicleVel.z) : 0;

    if (vehiclePos.y < 45 && activePeds > 0) {
      this.pedestrianMesh.visible = true;
      this.pedestrianMesh.count = activePeds;
      const pedWrap = 320;
      for (let i = 0; i < activePeds; i++) {
        const p = this.pedestrians[i];

        if (!p.knocked && canHitPeds && carSpeed > 4.2) {
          const dx = p.x - vehiclePos.x;
          const dz = p.z - vehiclePos.z;
          if (dx * dx + dz * dz < 5.76) {
            p.knocked = true;
            p.knockedTimer = 3.2;
            const dLen = Math.max(0.4, Math.hypot(dx, dz));
            p.vx = vehicleVel.x * 1.15 + (dx / dLen) * 5.5;
            p.vz = vehicleVel.z * 1.15 + (dz / dLen) * 5.5;
            p.vy = 7.2 + Math.min(7.5, carSpeed * 0.25);
            p.spinX = (Math.random() - 0.5) * 14;
            p.spinZ = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 6);
            newlyKnocked++;
          }
        }

        if (p.knocked) {
          p.knockedTimer -= delta;
          p.x += p.vx * delta;
          p.z += p.vz * delta;
          p.vy -= 19.6 * delta;
          p.y += p.vy * delta;
          if (p.y < 0) {
            p.y = 0;
            p.vy = Math.abs(p.vy) * 0.25;
            p.vx *= 0.62;
            p.vz *= 0.62;
            p.spinX *= 0.5;
            p.spinZ *= 0.5;
          }
          p.rotX += p.spinX * delta;
          p.rotZ += p.spinZ * delta;
          if (p.knockedTimer <= 0) {
            p.knocked = false;
            p.y = 0;
            p.rotX = 0;
            p.rotZ = 0;
            p.x = vehiclePos.x + (Math.random() > 0.5 ? 1 : -1) * (150 + Math.random() * 80);
            p.z = vehiclePos.z + (Math.random() > 0.5 ? 1 : -1) * (150 + Math.random() * 80);
          }
          _dummy.position.set(p.x, p.y, p.z);
          _dummy.rotation.set(p.rotX, 0, p.rotZ);
          _dummy.scale.setScalar(p.scale);
          _dummy.updateMatrix();
          this.pedestrianMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }

        p.x += p.dirX * p.speed * delta;
        p.z += p.dirZ * p.speed * delta;

        if (p.x - vehiclePos.x > pedWrap) p.x -= pedWrap * 2;
        else if (p.x - vehiclePos.x < -pedWrap) p.x += pedWrap * 2;

        if (p.z - vehiclePos.z > pedWrap) p.z -= pedWrap * 2;
        else if (p.z - vehiclePos.z < -pedWrap) p.z += pedWrap * 2;

        const strideBob = Math.abs(Math.sin(elapsed * 6.2 + p.phase)) * 0.09;
        _dummy.position.set(p.x, strideBob, p.z);
        _dummy.rotation.set(0, p.dirX !== 0 ? Math.PI / 2 : 0, 0);
        _dummy.scale.setScalar(p.scale);
        _dummy.updateMatrix();
        this.pedestrianMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.pedestrianMesh.instanceMatrix.needsUpdate = true;
    } else {
      this.pedestrianMesh.visible = false;
    }

    // 3. Animate 3D Cloud Sea (fades out cleanly above 200m as you enter orbit)
    const cloudWrap = 680;
    const atmoMask = THREE.MathUtils.clamp(1 - spaceFactor * 1.35, 0, 1);
    const targetCloudOpacity =
      (weather === 'clear' ? 0.24 : weather === 'cloudy' ? 0.56 : weather === 'rain' ? 0.62 : 0.72) *
      atmoMask;
    this.cloudMaterial.opacity = THREE.MathUtils.damp(
      this.cloudMaterial.opacity,
      targetCloudOpacity,
      1.5,
      delta,
    );
    this.cloudMaterial.color.copy(cloudTint).lerp(_color.set(biome.cloudTint), 0.35);

    const visibleCloudRatio =
      (weather === 'clear' ? 0.42 : weather === 'cloudy' ? 0.9 : 1.0) * biome.cloudDensity * this.fxScale;
    const activeClouds = Math.min(CLOUD_COUNT, Math.floor(CLOUD_COUNT * visibleCloudRatio));
    this.cloudMesh.count = activeClouds;
    this.cloudMesh.visible = this.cloudMaterial.opacity > 0.01;

    if (this.cloudMesh.visible) {
      _quat.copy(cameraQuat);
      for (let i = 0; i < activeClouds; i++) {
        const p = this.cloudPuffs[i];
        p.ox += delta * (1.8 + p.layer * 0.9);
        const wx =
          vehiclePos.x +
          ((((p.ox - vehiclePos.x + cloudWrap) % (cloudWrap * 2)) + cloudWrap * 2) % (cloudWrap * 2) -
            cloudWrap);
        const wz =
          vehiclePos.z +
          ((((p.oz - vehiclePos.z + cloudWrap) % (cloudWrap * 2)) + cloudWrap * 2) % (cloudWrap * 2) -
            cloudWrap);

        _dummy.position.set(wx, p.oy + Math.sin(elapsed * 0.25 + i) * 1.2, wz);
        _dummy.quaternion.copy(_quat);
        _dummy.rotateZ(p.rot);
        _dummy.scale.set(p.scaleX, p.scaleY, 1);
        _dummy.updateMatrix();
        this.cloudMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.cloudMesh.instanceMatrix.needsUpdate = true;
    }

    // 4. Velocity-Reactive 3D Precipitation (Rain & Snow — NEVER in clear/cloudy weather or inside cockpit/hangar!)
    const isSnowWeather = weather === 'snow';
    const precipBase = isSnowWeather
      ? 0.72
      : weather === 'storm'
        ? 0.58
        : weather === 'rain'
          ? this.biomeId === 'coruscant'
            ? 0.38
            : 0.48
          : 0;
    const targetRainOpacity =
      (shelteredInHangar ? 0 : precipBase) * THREE.MathUtils.clamp(1 - spaceFactor * 1.5, 0, 1);
    this.rainMaterial.opacity = THREE.MathUtils.damp(
      this.rainMaterial.opacity,
      targetRainOpacity,
      2.2,
      delta,
    );
    this.rainMaterial.color.set(isSnowWeather ? '#f8fafc' : biome.precipColor);

    const activeRainCount = Math.floor(RAIN_COUNT * this.fxScale);
    if (this.rainMaterial.opacity > 0.01 && activeRainCount > 0) {
      this.rainLines.visible = true;
      this.rainLines.geometry.setDrawRange(0, activeRainCount * 2);
      const fallSpeed = isSnowWeather
        ? 4.8
        : (weather === 'storm' ? 42 : 30) * biome.precipSpeedScale;
      const precipLen = isSnowWeather ? 0.24 : biome.precipLength;
      const precipDrift = isSnowWeather ? 4.4 : biome.precipDrift;
      const halfBox = 29;
      const boxSpan = halfBox * 2;
      const boxH = 38;
      const cosH = Math.cos(vehicleHeading);
      const sinH = Math.sin(vehicleHeading);

      const hasDrift = precipDrift > 0.001;
      for (let i = 0; i < activeRainCount; i++) {
        const idx = i * 3;
        const driftX = hasDrift ? Math.sin(elapsed * 0.6 + i) * precipDrift : 0;
        const driftZ = hasDrift ? Math.cos(elapsed * 0.5 + i) * precipDrift : 0;
        this.rainOffsets[idx] -= (vehicleVel.x - driftX) * delta * 0.85;
        this.rainOffsets[idx + 1] -= fallSpeed * delta;
        this.rainOffsets[idx + 2] -= (vehicleVel.z - driftZ) * delta * 0.85;

        if (this.rainOffsets[idx] > halfBox) this.rainOffsets[idx] -= boxSpan;
        else if (this.rainOffsets[idx] < -halfBox) this.rainOffsets[idx] += boxSpan;

        if (this.rainOffsets[idx + 1] < -12) this.rainOffsets[idx + 1] += boxH;

        if (this.rainOffsets[idx + 2] > halfBox) this.rainOffsets[idx + 2] -= boxSpan;
        else if (this.rainOffsets[idx + 2] < -halfBox) this.rainOffsets[idx + 2] += boxSpan;

        let ox = this.rainOffsets[idx];
        const oy = this.rainOffsets[idx + 1] + 4;
        let oz = this.rainOffsets[idx + 2];

        let streakDx = isSnowWeather ? driftX * 0.04 : vehicleVel.x * 0.04;
        let streakDz = isSnowWeather ? driftZ * 0.04 : vehicleVel.z * 0.04;

        // Strictly exclude the entire vehicle cabin + hull envelope (including wide UFO disc & long Truck) so NO water or snow ever enters inside!
        if (!isWalking) {
          let lx = ox * cosH - oz * sinH;
          const lz = ox * sinH + oz * cosH;
          const endOx = ox + streakDx;
          const endOz = oz + streakDz;
          const endLx = endOx * cosH - endOz * sinH;
          const endLz = endOx * sinH + endOz * cosH;

          const startInside = Math.abs(lx) < 2.25 && lz > -3.4 && lz < 5.35 && oy > -1.4 && oy < 3.5;
          const endInside = Math.abs(endLx) < 2.25 && endLz > -3.4 && endLz < 5.35 && oy + precipLen > -1.4 && oy < 3.5;

          if (startInside || endInside) {
            lx = lx >= 0 ? 4.0 : -4.0;
            ox = lx * cosH + lz * sinH;
            oz = -lx * sinH + lz * cosH;
            streakDx = 0;
            streakDz = 0;
          }
        }

        const rx = vehiclePos.x + ox;
        const ry = vehiclePos.y + oy;
        const rz = vehiclePos.z + oz;

        const pIdx = i * 6;
        this.rainPositions[pIdx] = rx;
        this.rainPositions[pIdx + 1] = ry;
        this.rainPositions[pIdx + 2] = rz;

        this.rainPositions[pIdx + 3] = rx + streakDx;
        this.rainPositions[pIdx + 4] = ry + precipLen;
        this.rainPositions[pIdx + 5] = rz + streakDz;
      }
      this.rainLines.geometry.attributes.position.needsUpdate = true;
    } else {
      this.rainLines.visible = false;
    }

    return newlyKnocked;
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
