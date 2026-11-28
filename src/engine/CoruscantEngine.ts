import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AmbientCabinAudio, type AudioFrameInput } from './ambientAudio';
import { CockpitRig } from './cockpit';
import { BlondeWalkerRig, type CompanionPose } from './companion';
import { QuestManager } from './events';
import { InteriorScene, type InteriorSeatAnchor } from './interior';
import { VehiclePhysics, type BuildingFootprint } from './physics';
import {
  STARTER_PLANETS,
  SpaceSystem,
  getActiveSpacePlanets,
  getLandingSiteSpaceWorldPos,
  getPlanetConfig,
  getPlanetLandingSites,
  type PlanetConfig,
} from './planets';
import {
  clearGameSave,
  formatSaveTimeLabel,
  readAudioSettings,
  readGameSave,
  readGameplaySettings,
  readGraphicsQuality,
  writeAudioSettings,
  writeGameSave,
  writeGameplaySettings,
  writeGraphicsQuality,
  type GameSaveData,
} from './saveSystem';
import { SkyAtmosphere } from './sky';
import { CoruscantWorld, getChunkRoadArms, type RooftopClubInfo } from './world';
import { RpgCombatSystem } from './rpgCombat';
import {
  canEquipOnTarget,
  computeRpgStats,
  createMythicOrangeLoot,
  createRpgItemFromTemplate,
  createStarterRpgData,
  createUniqueBossLoot,
  getLightsaberForPlanet,
  inferOwnerTarget,
  isSharedWearable,
  rollLootDrop,
} from './rpgCatalog';
import type {
  AudioSettings,
  CabinThemeId,
  CompanionLocation,
  ControlInputs,
  GameplaySettings,
  InteriorMode,
  InteriorPose,
  LandingSite,
  LootAutoCollectSettings,
  PassengerQuestState,
  PlanetId,
  PlanetMarker,
  RoadsideChatState,
  RpgEquipMap,
  RpgItem,
  RpgOwnerTarget,
  RpgSlot,
  RpgStateSnapshot,
  RvPose,
  RvStationKind,
  SaveMetaSnapshot,
  SeasonId,
  SeasonSetting,
  SimulationSnapshot,
  SpecialSpotInfo,
  TimePreset,
  VehicleFlightState,
  WeatherMode,
  WeatherSetting,
} from '../types/simulation';

const _velVec = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _projVec = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _beaconWorldPos = new THREE.Vector3();
const _apSpaceVec = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _aimTarget = new THREE.Vector3();
const _boltDir = new THREE.Vector3();

const SEASON_CYCLE: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_LABELS: Record<SeasonId, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
};

function getTimeLabel(t: number): string {
  const norm = ((t % 1) + 1) % 1;
  const totalMinutes = Math.floor(norm * 24 * 60);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  if (norm >= 0.21 && norm < 0.34) return `${hh}:${mm} · Рассвет`;
  if (norm >= 0.34 && norm < 0.66) return `${hh}:${mm} · День`;
  if (norm >= 0.66 && norm < 0.82) return `${hh}:${mm} · Закат`;
  return `${hh}:${mm} · Ночь`;
}

export class CoruscantEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private isLowTierGpu: boolean;
  private isTouchDevice: boolean;
  private baseMaxDpr: number;
  private minAdaptiveDpr: number;
  private currentDpr: number;
  private lastPerfSampleMs = 0;
  private perfFrameCount = 0;
  private perfAccumMs = 0;
  private fastFramesStreak = 0;

  private vehicleGroup = new THREE.Group();
  private walkerGroup = new THREE.Group();
  private cockpit: CockpitRig;
  private walkerCompanion: BlondeWalkerRig;
  private interior: InteriorScene;
  private sky: SkyAtmosphere;
  private world: CoruscantWorld;
  private space: SpaceSystem;
  private physics = new VehiclePhysics();
  private quests = new QuestManager();
  private rpgCombat: RpgCombatSystem;
  private rpgHp = 100;
  private playerInventory: RpgItem[] = createStarterRpgData().playerInventory;
  private companionInventory: RpgItem[] = createStarterRpgData().companionInventory;
  private playerEquipped = createStarterRpgData().playerEquipped;
  private companionEquipped = createStarterRpgData().companionEquipped;
  private weaponHolstered = false;
  private gameplaySettings: GameplaySettings = readGameplaySettings();
  private planetMonsterCooldown = this.gameplaySettings.bossSpawnIntervalMin * 60;
  private planetMonsterCoord: { planetId: PlanetId; key: string; x: number; z: number } | null = null;
  private walkStreakSec = 0;
  private gopnikCooldown = 35;
  private healCooldown = 0;
  private policeCooldown = 0;
  private policeDispatchTimer = 0;
  private companionAttackCooldown = 0;
  private roadsideChat: RoadsideChatState | null = null;
  private roadsideCooldown = 9;
  private passengerFarewellTimer = 0;
  private passengerFarewellX = 0;
  private passengerFarewellZ = 0;
  private passengerFarewellName = '';
  private graphicsQuality = readGraphicsQuality();
  private audioSettings: AudioSettings = readAudioSettings();
  private audio = new AmbientCabinAudio(this.audioSettings);
  private readonly audioInput: AudioFrameInput = {
    mode: 'road',
    flightState: 'road',
    speedKmh: 0,
    altitudeM: 0,
    zoneType: 'city',
    weather: 'clear',
    weatherBlend: 1,
    isWalking: false,
    interiorMode: 'none',
    inRvCabin: false,
    windowOpen: false,
    engineRunning: true,
    boostActive: false,
    insideHangar: false,
    planetBiome: 'coruscant',
    delta: 0.016,
    elapsed: 0,
  };
  private headlight: THREE.SpotLight;

  private clock = new THREE.Clock();
  private rafId = 0;
  private timerId = 0;
  private disposed = false;
  private contextLost = false;

  public inputs: ControlInputs = {
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    steerAxis: 0,
    climb: false,
    descend: false,
    boost: false,
  };

  private hasCompanion = true;
  private timePreset: TimePreset = 'auto';
  private timeOfDay = 0.69;
  private weatherSetting: WeatherSetting = 'auto';
  private activeWeather: WeatherMode = 'clear';
  private weatherTimer = 0;
  private weatherIndex = 0;
  private weatherBlend = 1;

  private seasonSetting: SeasonSetting = 'auto';
  private activeSeason: SeasonId = 'summer';
  private seasonTimer = 0;
  private lastHangarId: string | null = null;
  private lastSkyGateId: string | null = null;
  private lastRoadGateId: string | null = null;

  private lookPointerId: number | null = null;
  private lookYaw = 0;
  private lookPitch = 0;
  private targetLookYaw = 0;
  private targetLookPitch = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private interiorMode: InteriorMode = 'none';
  private interiorPose: InteriorPose = 'stand';
  private interiorLabel: string | null = null;
  private activeSeat: InteriorSeatAnchor | null = null;
  private enteredFromCar = false;
  private savedOutdoorWalkPos = new THREE.Vector3();
  private savedOutdoorWalkHeading = 0;
  private savedOutdoorCompanionPos = new THREE.Vector3();
  private savedOutdoorCompanionHeading = 0;
  private sleepAnimTimer = 0;
  private sleepFade = 0;
  private sleepMidpointApplied = false;

  private onSnapshot: (snap: SimulationSnapshot) => void;
  private onContextError: (lost: boolean) => void;
  private lastUiEmit = 0;
  private autoSaveTimer = 0;
  private lastSavedAt: number | null = null;
  private lastSavedPlanetName: string | null = null;
  private prevFlightState: VehicleFlightState = 'road';
  private activeSpacePlanets: PlanetConfig[] = STARTER_PLANETS;
  private nearestPlanet: PlanetConfig = STARTER_PLANETS[0];
  private nearestPlanetDist = 0;
  private prevForwardSpeed = 0;
  private prevThrottleOrBoost = false;
  private prevBoostInput = false;

  private autopilotActive = false;
  private autopilotQuestId: string | null = null;
  private autopilotArrivingStop = false;
  private autopilotStatusText: string | null = null;
  private autopilotStuckTimer = 0;
  private autopilotLastPosX = 0;
  private autopilotLastPosZ = 0;
  private autopilotAvoidDir = 0;
  private autopilotAvoidTimer = 0;
  private autopilotDirIndex = 0;
  private autopilotLastIntersectionKey = '';
  private autopilotInputs: ControlInputs = {
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    steerAxis: 0,
    climb: false,
    descend: false,
    boost: false,
  };
  private readonly rvIdleInputs: ControlInputs = {
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    steerAxis: 0,
    climb: false,
    descend: false,
    boost: false,
  };
  private cabinTintDark = false;
  private cabinRoofLight = false;
  private cabinSeatsReclined = false;
  private cabinMonitorOpen = false;
  private engineRunning = true;
  private engineHintCooldown = 0;
  private leftWindowOpen = false;
  private rightWindowOpen = false;
  private serbosCoffeeServed = false;
  private serbosDialogLine: string | null = null;
  private serbosDialogTimer = 0;

  // RV Mini-Home state & Companion RV autonomy
  private isInRvCabin = false;
  private rvPose: RvPose = 'stand';
  private rvPlayerLocalPos = new THREE.Vector3(0, 0.195, 1.15);
  private rvLookYaw = Math.PI;
  private rvLookPitch = 0;
  private rvWalkBob = 0;
  private rvLightsOn = true;
  private rvTvOn = false;
  private rvShowerOn = false;
  private rvCoffeeBrewed = false;
  private rvWindowTinted = false;
  private rvFridgeOpen = false;
  private rvSunroofOpen = false;
  private companionLocation: CompanionLocation = 'cab';
  private rvCompLocalPos = new THREE.Vector3(0.22, 0.195, 1.85);
  private rvCompHeading = 0;
  private rvCompTargetIdx = 0;
  private rvCompPauseTimer = 1.5;
  private rvCompActivity: string | null = null;

  constructor(
    container: HTMLElement,
    onSnapshot: (snap: SimulationSnapshot) => void,
    onContextError: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onSnapshot = onSnapshot;
    this.onContextError = onContextError;

    const gpuProbe = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return { software: true, lowTier: true };
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      const software = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      const lowTier =
        software ||
        /Adreno.*(610|612|616|618|619|50[0-9]|51[0-9]|530|4[0-9]{2})\b|Mali-G5[127]|Mali-G31|Mali-T|PowerVR/i.test(
          gpu,
        );
      return { software, lowTier };
    })();
    this.isSoftwareGl = gpuProbe.software;
    this.isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const hwCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
    const devMem =
      typeof navigator !== 'undefined'
        ? ((navigator as { deviceMemory?: number }).deviceMemory ?? 8)
        : 8;
    this.isLowTierGpu =
      gpuProbe.lowTier || (this.isTouchDevice && (devMem <= 4 || hwCores <= 6));

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isLowTierGpu,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.baseMaxDpr = this.isSoftwareGl
      ? 1
      : this.isLowTierGpu
        ? 1.0
        : this.isTouchDevice
          ? 1.25
          : 1.75;
    this.minAdaptiveDpr = this.isSoftwareGl
      ? 1
      : this.isLowTierGpu
        ? 0.72
        : this.isTouchDevice
          ? 0.9
          : 1.1;
    this.currentDpr = Math.min(window.devicePixelRatio || 1, this.baseMaxDpr);
    this.renderer.setPixelRatio(this.currentDpr);
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !this.isLowTierGpu;
    this.renderer.shadowMap.type =
      this.isTouchDevice || this.isLowTierGpu ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    this.scene = new THREE.Scene();
    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(64, aspect, 0.1, 2800);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const rawMaxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const maxAnisotropy = this.isLowTierGpu
      ? 1
      : this.isTouchDevice
        ? Math.min(2, rawMaxAniso)
        : Math.min(4, rawMaxAniso);

    this.sky = new SkyAtmosphere(this.scene, this.isSoftwareGl, this.isLowTierGpu);
    this.world = new CoruscantWorld(
      this.scene,
      maxAnisotropy,
      this.isLowTierGpu || this.isSoftwareGl,
      this.isTouchDevice,
    );
    this.space = new SpaceSystem(this.scene, maxAnisotropy);
    this.interior = new InteriorScene(this.scene);
    this.cockpit = new CockpitRig(maxAnisotropy, this.isSoftwareGl || this.isLowTierGpu);
    this.walkerCompanion = new BlondeWalkerRig(maxAnisotropy);
    this.walkerCompanion.group.visible = false;
    this.rpgCombat = new RpgCombatSystem(this.scene);
    this.camera.add(this.rpgCombat.heldWeaponGroup);
    this.applyGraphicsQuality(this.graphicsQuality, false);

    this.physics.setOnPlanetSwitch((planetId: PlanetId, centerX = 0, centerZ = 0) => {
      const cfg = getPlanetConfig(planetId);
      this.sky.setPlanetId(cfg.biome);
      this.world.setPlanetBiome(cfg, centerX, centerZ);
      if (this.seasonSetting === 'auto') {
        const nextSeason: SeasonId =
          cfg.biome === 'kryos'
            ? 'winter'
            : cfg.biome === 'verdant'
              ? 'spring'
              : cfg.biome === 'crimson' || cfg.biome === 'amethyst'
                ? 'autumn'
                : SEASON_CYCLE[Math.abs(cfg.seed) % SEASON_CYCLE.length];
        this.activeSeason = nextSeason;
        this.seasonTimer = 0;
        this.world.setSeason(nextSeason);
      }
      if (this.weatherSetting === 'auto') {
        const pool = this.getSeasonalWeatherPool(cfg.biome, this.activeSeason);
        this.weatherIndex = 0;
        this.activeWeather = pool[0];
        this.weatherTimer = 0;
        this.weatherBlend = 0.25;
      }
      this.policeDispatchTimer = 0;
      this.roadsideChat = null;
      this.rpgCombat.setRoadsideNpc(false);
      this.quests.onPlanetEntered(planetId);
    });

    this.vehicleGroup.add(this.cockpit.group);
    this.camera.position.set(-0.42, 1.13, 0.08);
    this.vehicleGroup.add(this.camera);

    this.headlight = new THREE.SpotLight(0xe0f2fe, 4.5, 160, Math.PI / 5, 0.45, 1.3);
    this.headlight.position.set(0, 0.72, -1.8);
    this.headlight.target.position.set(0, -1.5, -36);
    this.vehicleGroup.add(this.headlight);
    this.vehicleGroup.add(this.headlight.target);

    this.scene.add(this.vehicleGroup);
    this.scene.add(this.walkerGroup);
    this.scene.add(this.walkerCompanion.group);

    this.physics.forwardSpeed = 14;

    const existingSave = readGameSave();
    if (existingSave) {
      this.applySaveData(existingSave, false);
    } else {
      this.syncRpgAppearance();
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);

    this.tick();
  }

  public toggleFlight(): void {
    if (this.interiorMode !== 'none' || this.isInRvCabin) return;
    if (this.physics.flightState === 'road' && !this.engineRunning) {
      this.quests.showToast('Двигатель заглушён — запустите во вкладке «Салон»', 2.6);
      return;
    }
    this.autopilotActive = false;
    this.physics.toggleFlight();
  }

  public enterOrbitFromFlight(): void {
    if (this.interiorMode !== 'none' || this.isInRvCabin) return;
    if (!this.engineRunning) {
      this.quests.showToast('Двигатель заглушён — запустите во вкладке «Салон»', 2.6);
      return;
    }
    this.autopilotActive = false;
    this.physics.launchToOrbit();
  }

  public launchToSpace(): void {
    if (this.interiorMode !== 'none' || this.isInRvCabin) return;
    if (!this.engineRunning) {
      this.quests.showToast('Двигатель заглушён — запустите во вкладке «Салон»', 2.6);
      return;
    }
    this.autopilotActive = false;
    if (this.physics.flightState === 'orbit') {
      this.physics.launchFromOrbitToSpace();
    } else {
      this.physics.launchToSpace();
    }
  }

  private syncRpgAppearance(): void {
    const stats = computeRpgStats(this.playerEquipped, this.companionEquipped);
    this.rpgCombat.syncPlayerWeapon(stats.weaponKind, stats.weaponColor);
    this.rpgCombat.setWeaponHolstered(this.weaponHolstered);
    this.walkerCompanion.applyRpgOutfit(
      this.companionEquipped.torso?.colorHex ?? '#ebe4d7',
      this.companionEquipped.torso?.accentHex ?? '#d7cebe',
      this.companionEquipped.legs?.colorHex ?? '#1e293b',
      this.companionEquipped.head?.colorHex ?? '#334155',
      this.companionEquipped,
    );
    this.cockpit.applyCompanionOutfit(
      this.companionEquipped.torso?.colorHex ?? '#ebe4d7',
      this.companionEquipped.torso?.accentHex ?? '#d7cebe',
      this.companionEquipped.legs?.colorHex ?? '#1e293b',
      this.companionEquipped.head?.colorHex ?? '#334155',
      this.companionEquipped,
    );
  }

  public toggleWeaponHolstered(): void {
    this.weaponHolstered = !this.weaponHolstered;
    this.rpgCombat.setWeaponHolstered(this.weaponHolstered);
    this.audio.playDoorLatch(!this.weaponHolstered);
    this.quests.showToast(
      this.weaponHolstered ? 'Оружие убрано · Режим свободных рук' : 'Активное оружие в руках',
      2.2,
    );
  }

  private addLootItemToBag(item: RpgItem): RpgOwnerTarget {
    if (item.slot === 'earrings' || item.weaponKind === 'lightsaber') {
      this.companionInventory.push(item);
      return 'companion';
    }
    if (item.weaponKind === 'blaster') {
      this.playerInventory.push(item);
      return 'player';
    }
    if (isSharedWearable(item)) {
      const preferCompanion =
        this.companionInventory.length < this.playerInventory.length ||
        (this.companionInventory.length === this.playerInventory.length &&
          inferOwnerTarget(item) === 'companion');
      if (preferCompanion) {
        this.companionInventory.push(item);
        return 'companion';
      }
      this.playerInventory.push(item);
      return 'player';
    }
    const target = inferOwnerTarget(item);
    if (target === 'companion') {
      this.companionInventory.push(item);
    } else {
      this.playerInventory.push(item);
    }
    return target;
  }

  public updateGameplaySettings(
    partial: Partial<GameplaySettings> & { lootAutoCollect?: Partial<LootAutoCollectSettings> },
  ): void {
    const nextMin =
      typeof partial.bossSpawnIntervalMin === 'number' && Number.isFinite(partial.bossSpawnIntervalMin)
        ? Math.max(5, Math.min(60, Math.round(partial.bossSpawnIntervalMin)))
        : this.gameplaySettings.bossSpawnIntervalMin;
    this.gameplaySettings = {
      bossSpawnIntervalMin: nextMin,
      lootAutoCollect: {
        ...this.gameplaySettings.lootAutoCollect,
        ...(partial.lootAutoCollect ?? {}),
      },
    };
    writeGameplaySettings(this.gameplaySettings);
    this.planetMonsterCooldown = Math.min(this.planetMonsterCooldown, nextMin * 60);
  }

  private handleEnemyDefeated = (
    kind: 'gopnik' | 'rally' | 'police' | 'boss' | 'monster',
    x: number,
    y: number,
    z: number,
  ): void => {
    const coinGain =
      kind === 'monster'
        ? 260
        : kind === 'boss'
          ? Math.round(90 + Math.random() * 50)
          : kind === 'police'
            ? Math.round(30 + Math.random() * 15)
            : kind === 'gopnik'
              ? Math.round(15 + Math.random() * 12)
              : 10;
    const dropped =
      kind === 'monster'
        ? createMythicOrangeLoot()
        : kind === 'boss'
          ? (Math.random() < 0.65 ? createMythicOrangeLoot() : createUniqueBossLoot())
          : rollLootDrop(kind);
    this.rpgCombat.spawnLootPouch(x, z, dropped, coinGain, y);
    this.audio.playLootDrop(
      kind === 'monster' ||
        kind === 'boss' ||
        dropped?.rarity === 'mythic' ||
        dropped?.rarity === 'legendary' ||
        dropped?.rarity === 'epic',
    );

    if (kind === 'monster') {
      this.quests.onPlanetMonsterDefeated();
      this.planetMonsterCoord = null;
      this.planetMonsterCooldown = this.gameplaySettings.bossSpawnIntervalMin * 60;
      this.quests.showToast(
        'Гигантский монстр повержен! На земле редкий оранжевый лут с эффектами!',
        4.6,
      );
    } else if (kind === 'boss') {
      this.quests.onBountyBossDefeated();
      this.quests.showToast(
        dropped?.rarity === 'mythic'
          ? 'Босс повержен! На земле редкий оранжевый мешочек с эффектами!'
          : 'Босс повержен! На земле светится уникальный фиолетовый мешочек!',
        4.0,
      );
    } else {
      this.quests.showToast('Враг повержен · На земле выпал мешочек с лутом и монетами', 2.8);
    }
    if (kind === 'rally') {
      this.quests.onRallyProtesterDispersed(
        this.rpgCombat.getRallyActiveCount(),
        this.rpgCombat.rallyTotalCount,
      );
    }
  };

  private schedulePoliceDispatch(): void {
    if (this.rpgCombat.policeWanted || this.policeDispatchTimer > 0 || this.policeCooldown > 0) {
      return;
    }
    this.policeDispatchTimer = 30.0;
    this.audio.playPoliceBeep();
    this.quests.showToast('Тревога! Патруль полиции прибудет через 30 сек.', 3.6);
  }

  public performPlayerAttack(): void {
    if (
      this.interiorMode !== 'none' ||
      this.isInRvCabin ||
      !this.physics.isWalking ||
      this.physics.spaceFactor > 0.1
    ) {
      return;
    }
    const stats = computeRpgStats(this.playerEquipped, this.companionEquipped);
    const activeWeaponKind = this.weaponHolstered ? 'fists' : stats.weaponKind;
    const activeAttackDmg = this.weaponHolstered ? 12 : stats.attackDmg;

    if (activeWeaponKind === 'lightsaber') {
      this.audio.playSaberSwing(stats.weaponColor === '#a855f7' || stats.weaponColor === '#f97316');
    } else if (activeWeaponKind === 'blaster') {
      this.audio.playBlasterShot();
    } else {
      this.audio.playPunchHit();
    }

    this.camera.getWorldPosition(_camPos);
    this.camera.getWorldDirection(_camForward);

    let originX = this.physics.walkerPos.x;
    let originY = this.physics.walkerPos.y + 1.4;
    let originZ = this.physics.walkerPos.z;
    let dirX = _camForward.x;
    let dirY = _camForward.y;
    let dirZ = _camForward.z;
    let exactOrigin = false;

    if (activeWeaponKind === 'blaster') {
      _aimTarget.copy(_camPos).addScaledVector(_camForward, 44);
      if (this.rpgCombat.getBlasterMuzzleWorldPos(_muzzlePos)) {
        originX = _muzzlePos.x;
        originY = _muzzlePos.y;
        originZ = _muzzlePos.z;
        _boltDir.copy(_aimTarget).sub(_muzzlePos).normalize();
        dirX = _boltDir.x;
        dirY = _boltDir.y;
        dirZ = _boltDir.z;
        exactOrigin = true;
      } else {
        originX = _camPos.x;
        originY = _camPos.y - 0.12;
        originZ = _camPos.z;
        exactOrigin = true;
      }
    }

    const atkRes = this.rpgCombat.performPlayerAttack(
      originX,
      originY,
      originZ,
      dirX,
      dirY,
      dirZ,
      activeAttackDmg,
      activeWeaponKind,
      {
        onPlayerDamaged: (_rawDmg: number, _attackerLabel: string) => {},
        onEnemyDefeated: this.handleEnemyDefeated,
        onPoliceCleared: (_reason: 'defeated' | 'escaped' | 'hidden') => {},
        onSaberPickupClaimed: () => {},
        onGopnikTaunt: (_line: string) => {},
      },
      exactOrigin,
    );

    if (atkRes.hitEnemy && activeWeaponKind !== 'blaster') {
      this.audio.playPunchHit();
    }

    if (this.physics.activeFloorY < 1) {
      const horizLen = Math.hypot(dirX, dirZ) || 1;
      const pedDirX = dirX / horizLen;
      const pedDirZ = dirZ / horizLen;
      const hitRes = this.world.hitPedestrianAt(
        this.physics.walkerPos.x,
        this.physics.walkerPos.z,
        pedDirX,
        pedDirZ,
        activeWeaponKind === 'blaster' ? 26 : 3.8,
        1.85,
      );
      if (hitRes.count > 0) {
        this.quests.onPedestrianHit(hitRes.count);
        const coinGain = Math.round(10 + Math.random() * 15);
        const dropped = rollLootDrop('pedestrian');
        this.rpgCombat.spawnLootPouch(hitRes.hitX, hitRes.hitZ, dropped, coinGain, 0);
        this.audio.playLootDrop(dropped?.rarity === 'epic' || dropped?.rarity === 'legendary');
        this.quests.showToast('Удар по прохожему · На земле остался мешочек', 2.8);
        this.schedulePoliceDispatch();
      }
    }
  }

  public attackCombat(): void {
    this.performPlayerAttack();
  }

  public equipRpgItem(uid: string, target: RpgOwnerTarget): void {
    const preferredBag = target === 'player' ? this.playerInventory : this.companionInventory;
    const secondaryBag = target === 'player' ? this.companionInventory : this.playerInventory;
    let sourceBag = preferredBag;
    let idx = sourceBag.findIndex((i) => i.uid === uid);
    if (idx < 0) {
      sourceBag = secondaryBag;
      idx = sourceBag.findIndex((i) => i.uid === uid);
    }
    if (idx < 0) return;

    const item = sourceBag[idx];
    if (!canEquipOnTarget(item, target)) {
      this.quests.showToast(
        target === 'player'
          ? 'Серьги и световые мечи может надевать только спутница'
          : 'Бластеры может использовать только игрок',
        2.8,
      );
      return;
    }

    const targetEquipped = target === 'player' ? this.playerEquipped : this.companionEquipped;
    const prev = targetEquipped[item.slot];
    targetEquipped[item.slot] = item;
    sourceBag.splice(idx, 1);
    if (prev) {
      preferredBag.push(prev);
    }
    if (target === 'player' && item.slot === 'weapon' && this.weaponHolstered) {
      this.weaponHolstered = false;
    }
    this.syncRpgAppearance();
    this.quests.showToast(
      `Экипировано: ${item.name} (${target === 'player' ? 'Игрок' : 'Спутница'})`,
      2.6,
    );
    this.saveGame(false);
  }

  public transferRpgItem(uid: string, toTarget: RpgOwnerTarget): void {
    const fromBag = toTarget === 'companion' ? this.playerInventory : this.companionInventory;
    const toBag = toTarget === 'companion' ? this.companionInventory : this.playerInventory;
    const idx = fromBag.findIndex((i) => i.uid === uid);
    if (idx < 0) return;
    const item = fromBag[idx];
    if (!isSharedWearable(item) && !canEquipOnTarget(item, toTarget)) {
      this.quests.showToast('Эту вещь нельзя передать другому владельцу', 2.4);
      return;
    }
    fromBag.splice(idx, 1);
    toBag.push(item);
    this.quests.showToast(
      `Передано (${toTarget === 'companion' ? 'Спутнице' : 'Игроку'}): ${item.name}`,
      2.4,
    );
    this.saveGame(false);
  }

  public unequipRpgSlot(target: RpgOwnerTarget, slot: RpgSlot): void {
    const targetEquipped = target === 'player' ? this.playerEquipped : this.companionEquipped;
    const item = targetEquipped[slot];
    if (!item) return;
    targetEquipped[slot] = null;
    if (target === 'companion') {
      this.companionInventory.push(item);
    } else {
      this.playerInventory.push(item);
    }
    this.syncRpgAppearance();
    this.quests.showToast(`Снято: ${item.name}`, 2.2);
    this.saveGame(false);
  }

  public deleteRpgItem(uid: string): void {
    let idx = this.playerInventory.findIndex((i) => i.uid === uid);
    if (idx >= 0) {
      const removed = this.playerInventory.splice(idx, 1)[0];
      this.quests.showToast(`Удалено: ${removed.name}`, 2.0);
      this.saveGame(false);
      return;
    }
    idx = this.companionInventory.findIndex((i) => i.uid === uid);
    if (idx >= 0) {
      const removed = this.companionInventory.splice(idx, 1)[0];
      this.quests.showToast(`Удалено: ${removed.name}`, 2.0);
      this.saveGame(false);
    }
  }

  public startQuestAutopilot(questId?: string): void {
    if (questId) {
      this.selectQuest(questId);
    }
    if (!this.autopilotActive) {
      this.toggleAutopilot();
      return;
    }
    this.autopilotArrivingStop = false;
    this.autopilotQuestId = this.quests.getActiveQuestId();
    this.autopilotStuckTimer = 0;
    this.autopilotAvoidTimer = 0;
    const g = this.quests.getActiveQuestGuidance(
      this.physics.activePlanetId,
      this.physics.position,
      this.world.getLandmarks(),
    );
    this.quests.showToast(
      g ? `Автопилот перенаправлен: ${g.targetName}` : 'Автопилот обновлён',
      3.0,
    );
  }

  public toggleAutopilot(): void {
    if (this.interiorMode !== 'none' || this.physics.isWalking) {
      this.autopilotActive = false;
      this.autopilotArrivingStop = false;
      this.autopilotStatusText = null;
      return;
    }
    if (this.autopilotActive) {
      this.autopilotActive = false;
      this.autopilotArrivingStop = false;
      this.autopilotStatusText = null;
      this.quests.showToast('Автопилот отключён', 2.2);
      return;
    }
    const pos = this.physics.position;
    const cx = Math.round(pos.x / 320);
    const cz = Math.round(pos.z / 320);
    const arms = getChunkRoadArms(cx, cz, this.world.getWorldSeed());
    const fwdX = -Math.sin(this.physics.heading);
    const fwdZ = -Math.cos(this.physics.heading);
    const dirs = [
      { idx: 0, ok: arms.n, fx: 0, fz: -1 },
      { idx: 1, ok: arms.e, fx: 1, fz: 0 },
      { idx: 2, ok: arms.s, fx: 0, fz: 1 },
      { idx: 3, ok: arms.w, fx: -1, fz: 0 },
    ];
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (const d of dirs) {
      if (!d.ok) continue;
      const dot = fwdX * d.fx + fwdZ * d.fz;
      if (dot > bestScore) {
        bestScore = dot;
        bestIdx = d.idx;
      }
    }
    if (!this.engineRunning) {
      this.engineRunning = true;
      this.audio.playEngineIgnition(true);
    }
    this.autopilotDirIndex = bestIdx;
    this.autopilotLastIntersectionKey = '';
    this.autopilotActive = true;
    this.autopilotArrivingStop = false;
    this.autopilotQuestId = this.quests.getActiveQuestId();
    this.autopilotStuckTimer = 0;
    this.autopilotAvoidTimer = 0;
    this.autopilotLastPosX = pos.x;
    this.autopilotLastPosZ = pos.z;

    const guidance = this.quests.getActiveQuestGuidance(
      this.physics.activePlanetId,
      pos,
      this.world.getLandmarks(),
    );
    this.quests.showToast(
      guidance
        ? `Автопилот: ведём к метке «${guidance.targetName}»`
        : 'Автопилот включён · Смотрите по сторонам',
      3.4,
    );
  }

  public toggleCabinTint(): void {
    this.cabinTintDark = !this.cabinTintDark;
    if (this.cabinTintDark) {
      this.roadsideChat = null;
      this.rpgCombat.setRoadsideNpc(false);
    }
    this.quests.showToast(
      this.cabinTintDark ? 'Полная тонировка для сна включена' : 'Стёкла салона снова прозрачные',
      2.4,
    );
    this.saveGame(false);
  }

  public toggleCabinRoofLight(): void {
    this.cabinRoofLight = !this.cabinRoofLight;
    this.quests.showToast(
      this.cabinRoofLight ? 'Свет на крыше в салоне включён' : 'Свет на крыше выключен',
      2.2,
    );
    this.saveGame(false);
  }

  public toggleCabinSeatsRecline(): void {
    this.cabinSeatsReclined = !this.cabinSeatsReclined;
    this.quests.showToast(
      this.cabinSeatsReclined
        ? 'Сиденья разложены для сна и отдыха'
        : 'Сиденья возвращены в обычное положение',
      2.6,
    );
    if (this.cabinSeatsReclined && this.cabinMonitorOpen && this.hasCompanion) {
      this.quests.setCompanionNote(
        '«Как уютно лежать вдвоём… И фильм, и тёплый салон!»',
        4.8,
      );
    }
    this.saveGame(false);
  }

  public toggleCabinMonitor(): void {
    this.cabinMonitorOpen = !this.cabinMonitorOpen;
    this.quests.showToast(
      this.cabinMonitorOpen
        ? 'Выдвижной монитор: фильм «Звёздный горизонт»'
        : 'Выдвижной монитор убран',
      2.6,
    );
    if (this.cabinMonitorOpen && this.hasCompanion) {
      this.quests.setCompanionNote(
        '«Включил фильм на потолочном экране! Давай посмотрим вместе».',
        4.6,
      );
    }
    this.saveGame(false);
  }

  private getLookingAtDoorSide(): 'left' | 'right' | null {
    if (this.interiorMode !== 'none' || this.physics.isWalking || this.isInRvCabin) return null;
    if (this.lookYaw > 0.46) return 'left';
    if (this.lookYaw < -0.58) return 'right';
    return null;
  }

  public enterRvCabin(): boolean {
    const allowedState =
      this.physics.flightState === 'road' ||
      this.physics.flightState === 'ascending' ||
      this.physics.flightState === 'flight' ||
      this.physics.flightState === 'orbit' ||
      this.physics.flightState === 'space';
    if (
      this.interiorMode !== 'none' ||
      this.physics.isWalking ||
      this.isInRvCabin ||
      !allowedState
    ) {
      if (
        this.physics.flightState === 'entering' ||
        this.physics.flightState === 'descending' ||
        this.physics.flightState === 'launching' ||
        this.physics.flightState === 'launching_orbit'
      ) {
        this.quests.showToast('Дождитесь завершения манёвра, чтобы пройти в мини-дом', 2.4);
      }
      return false;
    }
    if (this.physics.flightState === 'ascending') {
      this.physics.targetFlightAltitude = Math.max(76, this.physics.position.y);
    }
    this.roadsideChat = null;
    this.rpgCombat.setRoadsideNpc(false);
    this.isInRvCabin = true;
    this.rvPose = 'stand';
    this.rvPlayerLocalPos.set(0, 0.195, 1.05);
    this.rvLookYaw = Math.PI;
    this.rvLookPitch = 0;
    this.rvWalkBob = 0;
    this.camera.position.set(0, 1.66, 1.05);
    this.camera.rotation.set(0, Math.PI, 0);
    this.vehicleGroup.add(this.camera);

    const enterToast = this.autopilotActive
      ? 'Мини-дом · Автопилот ведёт автодом к цели'
      : this.physics.flightState === 'orbit'
        ? 'Мини-дом на орбите планеты'
        : this.physics.flightState === 'space'
          ? 'Мини-дом в открытом космосе'
          : this.physics.flightState === 'flight' || this.physics.flightState === 'ascending'
            ? 'Мини-дом · Автодом парит над облаками'
            : 'Вы вошли в мини-дом в задней части авто';
    this.quests.showToast(enterToast, 3.0);
    return true;
  }

  public returnToDriverSeat(): void {
    if (!this.isInRvCabin) return;
    this.isInRvCabin = false;
    this.rvPose = 'stand';
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;
    this.camera.position.set(
      -0.42,
      this.cabinSeatsReclined ? 0.87 : 1.13,
      this.cabinSeatsReclined ? 0.28 : 0.08,
    );
    this.camera.rotation.set(0, 0, 0);
    this.vehicleGroup.add(this.camera);
    this.quests.showToast('Вы вернулись за руль кабины', 2.2);
  }

  public toggleRvLights(): void {
    this.rvLightsOn = !this.rvLightsOn;
    this.quests.showToast(
      this.rvLightsOn ? 'Освещение мини-дома включено' : 'Освещение мини-дома выключено',
      2.2,
    );
    this.saveGame(false);
  }

  public toggleRvTv(): void {
    this.rvTvOn = !this.rvTvOn;
    this.quests.showToast(
      this.rvTvOn ? 'Телевизор в мини-доме включён' : 'Телевизор выключен',
      2.4,
    );
    this.saveGame(false);
  }

  public brewRvCoffee(): void {
    this.rvCoffeeBrewed = !this.rvCoffeeBrewed;
    if (this.rvCoffeeBrewed) {
      this.quests.showToast('Кофеварка: свежесваренный кофе готов!', 2.8);
      if (this.hasCompanion) {
        this.quests.setCompanionNote(
          '«Ммм, какой аромат кофе по всему мини-дому! Идеальный перерыв в пути».',
          4.6,
        );
      }
    } else {
      this.quests.showToast('Чашки убраны со стойки', 2.0);
    }
    this.saveGame(false);
  }

  public toggleRvShower(): void {
    this.rvShowerOn = !this.rvShowerOn;
    this.quests.showToast(
      this.rvShowerOn ? 'Тёплый душ включён' : 'Душ выключен',
      2.4,
    );
    this.saveGame(false);
  }

  public useRvToilet(): void {
    this.cockpit.triggerToiletFlush();
    this.quests.showToast('Санузел: вода смыта · Полный комфорт', 2.4);
  }

  public toggleRvBedPose(): void {
    if (!this.isInRvCabin) return;
    if (this.rvPose === 'lie') {
      this.rvPose = 'stand';
      this.rvPlayerLocalPos.set(-0.18, 0.195, 3.65);
      this.rvLookYaw = Math.PI * 0.5;
      this.rvLookPitch = 0;
      this.quests.showToast('Вы встали с кровати', 2.0);
    } else {
      this.rvPose = 'lie';
      this.rvLookYaw = 0.22;
      this.rvLookPitch = 0.08;
      this.quests.showToast('Вы легли на кровать в мини-доме', 2.6);
    }
  }

  public toggleRvWindowTint(): void {
    this.rvWindowTinted = !this.rvWindowTinted;
    if (this.rvWindowTinted) {
      this.roadsideChat = null;
      this.rpgCombat.setRoadsideNpc(false);
    }
    this.quests.showToast(
      this.rvWindowTinted ? 'Окна мини-дома затонированы' : 'Окна мини-дома снова прозрачные',
      2.4,
    );
    this.saveGame(false);
  }

  public toggleRvSunroof(): void {
    this.rvSunroofOpen = !this.rvSunroofOpen;
    this.audio.playChime('hatch');
    this.quests.showToast(
      this.rvSunroofOpen
        ? 'Панорамный люк открыт · Посмотрите вверх на небо'
        : 'Шторка панорамного люка закрыта',
      2.6,
    );
    this.saveGame(false);
  }

  public useRvFridge(): void {
    this.rvFridgeOpen = !this.rvFridgeOpen;
    this.audio.playChime('fridge');
    if (this.rvFridgeOpen) {
      this.quests.showToast('Мини-бар открыт · Прохладный галактический нектар', 2.8);
      if (this.hasCompanion) {
        this.quests.setCompanionNote(
          '«О, там как раз охлаждённые напитки! Идеально освежиться в полёте».',
          4.5,
        );
      }
    } else {
      this.quests.showToast('Дверца мини-холодильника закрыта', 2.0);
    }
  }

  public serveRvCoffeeToCompanion(): void {
    if (!this.hasCompanion) return;
    if (!this.rvCoffeeBrewed) {
      this.rvCoffeeBrewed = true;
    }
    this.audio.playChime('coffee');
    this.quests.credits += 10;
    this.quests.setCompanionNote(
      '«Спасибо за горячий кофе! С тобой даже среди далёких звёзд чувствуешь себя дома».',
      5.2,
    );
    this.quests.showToast('Угостили спутницу горячим кофе (+10 ✦)', 3.0);
    this.quests.advanceCoupleMoments();
    this.saveGame(false);
  }

  public setGraphicsQuality(quality: number): void {
    this.applyGraphicsQuality(quality, true);
  }

  private applyGraphicsQuality(quality: number, persist: boolean): void {
    const q = THREE.MathUtils.clamp(quality, 0, 1);
    this.graphicsQuality = q;

    const defaultMaxDpr = this.isSoftwareGl
      ? 1
      : this.isLowTierGpu
        ? 1.0
        : this.isTouchDevice
          ? 1.25
          : 1.75;
    const defaultMinDpr = this.isSoftwareGl
      ? 1
      : this.isLowTierGpu
        ? 0.72
        : this.isTouchDevice
          ? 0.9
          : 1.1;

    if (q <= 0.5) {
      const t = q / 0.5;
      this.baseMaxDpr = this.isSoftwareGl ? 1 : THREE.MathUtils.lerp(0.65, defaultMaxDpr, t);
      this.minAdaptiveDpr = this.isSoftwareGl ? 1 : THREE.MathUtils.lerp(0.55, defaultMinDpr, t);
    } else {
      const t = (q - 0.5) / 0.5;
      const hiMax = this.isSoftwareGl ? 1 : this.isTouchDevice ? 1.85 : 2.0;
      const hiMin = this.isSoftwareGl ? 1 : this.isTouchDevice ? 1.1 : 1.35;
      this.baseMaxDpr = THREE.MathUtils.lerp(defaultMaxDpr, hiMax, t);
      this.minAdaptiveDpr = THREE.MathUtils.lerp(defaultMinDpr, hiMin, t);
    }

    this.currentDpr = Math.min(window.devicePixelRatio || 1, this.baseMaxDpr);
    this.renderer.setPixelRatio(this.currentDpr);

    const allowShadows = !this.isSoftwareGl && (this.isLowTierGpu ? q >= 0.72 : q >= 0.35);
    this.renderer.shadowMap.enabled = allowShadows;
    this.sky.sunLight.castShadow = allowShadows;

    this.sky.setQualityScale(q);
    this.world.setQualityProfile(q, this.isLowTierGpu || this.isSoftwareGl, this.isTouchDevice);
    this.cockpit.setWeatherDetail(q < 0.3 ? 0 : 1);

    if (persist) {
      writeGraphicsQuality(q);
    }
  }

  public toggleCabinAudio(): void {
    const on = this.audio.toggle();
    this.quests.showToast(
      on ? 'Радио салона: космическая медитативная волна' : 'Радио салона выключено',
      2.6,
    );
  }

  public toggleEngineIgnition(): void {
    this.audio.unlockFromGesture();
    this.engineRunning = !this.engineRunning;
    if (!this.engineRunning) {
      this.autopilotActive = false;
      this.autopilotArrivingStop = false;
      this.autopilotStatusText = null;
      if (this.physics.flightState === 'flight' || this.physics.flightState === 'ascending') {
        this.physics.flightState = 'descending';
      }
      this.audio.playEngineIgnition(false);
      this.quests.showToast('Двигатель заглушён · Можно запустить во вкладке «Салон»', 2.8);
    } else {
      this.audio.playEngineIgnition(true);
      this.quests.showToast('Двигатель запущен · Приятного пути', 2.4);
    }
    this.saveGame(false);
  }

  public updateAudioSettings(partial: Partial<AudioSettings>): void {
    this.audio.unlockFromGesture();
    this.audioSettings = {
      ...this.audioSettings,
      ...partial,
    };
    this.audio.setSettings(this.audioSettings);
    writeAudioSettings(this.audioSettings);
  }

  public toggleAudioMute(): void {
    this.updateAudioSettings({ muted: !this.audioSettings.muted });
  }

  public unlockAudioFromUi(): void {
    this.audio.unlockFromGesture();
  }

  public callCompanionToCab(): void {
    if (!this.hasCompanion || this.companionLocation === 'cab') return;
    this.companionLocation = 'cab';
    this.rvCompActivity = null;
    this.quests.setCompanionNote('«Уже иду обратно в кабину! Люблю сидеть рядом с тобой в дороге».', 4.8);
    this.quests.showToast('Спутница вернулась в кабину', 2.6);
    this.saveGame(false);
  }

  public sendCompanionToRv(): void {
    if (!this.hasCompanion || this.companionLocation === 'rv') return;
    this.companionLocation = 'rv';
    this.rvCompLocalPos.set(0.18, 0.195, 1.35);
    this.rvCompHeading = Math.PI;
    this.rvCompTargetIdx = 0;
    this.rvCompPauseTimer = 0.6;
    this.rvCompActivity = 'Готовит кофе на кухне';
    this.quests.setCompanionNote('«Пойду пройдусь в мини-дом — заглядывай ко мне на автопилоте!»', 4.8);
    this.quests.showToast('Спутница ушла в мини-дом', 2.6);
    this.saveGame(false);
  }

  public toggleDoorWindow(): void {
    const inSpaceLike =
      this.physics.flightState === 'space' ||
      this.physics.flightState === 'orbit' ||
      this.physics.spaceFactor > 0.25;
    if (inSpaceLike) {
      this.quests.showToast('В космосе окна заблокированы — салон герметичен (+22°C)', 3.2);
      return;
    }
    const side = this.getLookingAtDoorSide();
    if (!side) return;
    if (side === 'left') {
      this.leftWindowOpen = !this.leftWindowOpen;
      this.audio.playWindowSlide(this.leftWindowOpen);
      this.quests.showToast(
        this.leftWindowOpen ? 'Левое окно открыто · Слышен город и ветер' : 'Левое окно закрыто · Тишина в салоне',
        2.4,
      );
    } else {
      this.rightWindowOpen = !this.rightWindowOpen;
      this.audio.playWindowSlide(this.rightWindowOpen);
      this.quests.showToast(
        this.rightWindowOpen ? 'Правое окно открыто · Слышен город и ветер' : 'Правое окно закрыто · Тишина в салоне',
        2.4,
      );
    }
  }

  public enterNearestPlanet(): void {
    if (this.physics.flightState !== 'space') return;
    if (this.nearestPlanetDist <= this.nearestPlanet.orbitRange * 1.35) {
      const sites = getPlanetLandingSites(this.nearestPlanet.id);
      this.physics.enterPlanetOrbit(this.nearestPlanet, sites[0]?.id ?? null);
      this.quests.onOrbitEntered();
      this.quests.showToast(`Орбита · ${this.nearestPlanet.name} — выберите точку посадки`, 3.6);
      this.saveGame(false);
    }
  }

  public selectLandingSite(siteId: string): void {
    if (this.physics.flightState !== 'orbit') return;
    this.physics.selectedLandingSiteId = siteId;
    const planet = getPlanetConfig(this.physics.activePlanetId);
    const site = getPlanetLandingSites(planet.id).find((s) => s.id === siteId);
    if (site) {
      getLandingSiteSpaceWorldPos(planet, site, _beaconWorldPos);
      const dx = _beaconWorldPos.x - planet.spacePos.x;
      const dz = _beaconWorldPos.z - planet.spacePos.z;
      if (Math.hypot(dx, dz) > 8) {
        this.physics.orbitTheta = Math.atan2(dx, dz);
      }
      this.quests.showToast(`Выбрана посадка: ${site.name}`, 2.4);
    }
  }

  public descendToSelectedSite(siteId?: string): void {
    if (this.physics.flightState !== 'orbit') return;
    const sites = getPlanetLandingSites(this.physics.activePlanetId);
    const targetId = siteId ?? this.physics.selectedLandingSiteId ?? sites[0]?.id;
    const site = sites.find((s) => s.id === targetId) ?? sites[0];
    if (!site) return;

    const spawnX = site.approachX ?? site.x;
    const spawnZ = site.approachZ ?? site.z;
    const lookX = site.lookAtX ?? site.x;
    const lookZ = site.lookAtZ ?? site.z;

    this.physics.selectedLandingSiteId = site.id;
    this.physics.descendToSite(spawnX, spawnZ, lookX, lookZ);
    this.quests.onOrbitLandingCompleted(this.physics.activePlanetId, site.name);
    this.quests.showToast(`Вход в атмосферу · ${site.name}`, 3.5);
    this.saveGame(false);
  }

  public interactNearbySpecialSpot(): boolean {
    if (
      this.interiorMode !== 'none' ||
      this.physics.flightState === 'space' ||
      this.physics.flightState === 'orbit' ||
      this.physics.position.y >= 8
    ) {
      return false;
    }
    const refPos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    const hit = this.world.getNearestSpecialSpot(refPos.x, refPos.z);
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (!hit || hit.distance > 34 || (!this.physics.isWalking && speedKmh >= 34)) {
      return false;
    }
    this.quests.onSpecialSpotInteracted(hit.spot);
    this.saveGame(false);
    return true;
  }

  public saveGame(manual = true): boolean {
    const cfg = getPlanetConfig(this.physics.activePlanetId);
    const pState = this.physics.exportSaveState();
    const qState = this.quests.exportSaveState();
    const now = Date.now();
    const data: GameSaveData = {
      version: 1,
      savedAt: now,
      planetId: pState.planetId,
      planetName: cfg.name,
      flightState: pState.flightState,
      vehicleId: pState.vehicleId,
      pedestriansHitCount: qState.pedestriansHitCount,
      position: pState.position,
      heading: pState.heading,
      forwardSpeed: pState.forwardSpeed,
      targetFlightAltitude: pState.targetFlightAltitude,
      spacePos: pState.spacePos,
      spacePitch: pState.spacePitch,
      spaceSpeed: pState.spaceSpeed,
      orbitTheta: pState.orbitTheta,
      orbitElev: pState.orbitElev,
      orbitDistFactor: pState.orbitDistFactor,
      selectedLandingSiteId: pState.selectedLandingSiteId,
      isWalking: pState.isWalking,
      walkerPos: pState.walkerPos,
      walkerHeading: pState.walkerHeading,
      companionPos: pState.companionPos,
      companionHeading: pState.companionHeading,
      hasCompanion: this.hasCompanion,
      holdHands: qState.holdHands,
      timePreset: this.timePreset,
      timeOfDay: this.timeOfDay,
      weatherSetting: this.weatherSetting,
      activeWeather: this.activeWeather,
      seasonSetting: this.seasonSetting,
      activeSeason: this.activeSeason,
      credits: qState.credits,
      cabinTheme: qState.cabinTheme,
      unlockedThemes: qState.unlockedThemes,
      visitedPlanets: qState.visitedPlanets,
      visitedSpecialSpots: qState.visitedSpecialSpots,
      discoveredCloudLayer: qState.discoveredCloudLayer,
      discoveredCountryside: qState.discoveredCountryside,
      questSeq: qState.questSeq,
      activeQuest: qState.activeQuest,
      questPool: qState.questPool,
      cabinTintDark: this.cabinTintDark,
      cabinRoofLight: this.cabinRoofLight,
      cabinSeatsReclined: this.cabinSeatsReclined,
      cabinMonitorOpen: this.cabinMonitorOpen,
      engineRunning: this.engineRunning,
      rvLightsOn: this.rvLightsOn,
      rvTvOn: this.rvTvOn,
      rvShowerOn: this.rvShowerOn,
      rvCoffeeBrewed: this.rvCoffeeBrewed,
      rvWindowTinted: this.rvWindowTinted,
      rvSunroofOpen: this.rvSunroofOpen,
      companionLocation: this.companionLocation,
      rpgState: {
        hp: this.rpgHp,
        playerInventory: this.playerInventory,
        companionInventory: this.companionInventory,
        playerEquipped: this.playerEquipped,
        companionEquipped: this.companionEquipped,
        weaponHolstered: this.weaponHolstered,
      },
    };
    const ok = writeGameSave(data);
    if (ok) {
      this.lastSavedAt = now;
      this.lastSavedPlanetName = cfg.name;
      if (manual) {
        this.quests.showToast(`Игра сохранена · ${cfg.name}`, 3.0);
      }
    } else if (manual) {
      this.quests.showToast('Не удалось сохранить в память браузера', 3.0);
    }
    return ok;
  }

  public loadLastSave(): boolean {
    const save = readGameSave();
    if (!save) {
      this.quests.showToast('Сохранённая игра пока не найдена', 2.8);
      return false;
    }
    this.applySaveData(save, true);
    return true;
  }

  public resetProgress(): void {
    clearGameSave();
    this.lastSavedAt = null;
    this.lastSavedPlanetName = null;
    if (this.interiorMode !== 'none') {
      this.interior.setMode('none');
      this.interiorMode = 'none';
      this.interiorPose = 'stand';
      this.interiorLabel = null;
    }
    this.quests = new QuestManager();
    const defRpg = createStarterRpgData();
    this.rpgHp = defRpg.hp;
    this.playerInventory = [...defRpg.playerInventory];
    this.companionInventory = [...defRpg.companionInventory];
    this.playerEquipped = { ...defRpg.playerEquipped };
    this.companionEquipped = { ...defRpg.companionEquipped };
    this.weaponHolstered = false;
    this.planetMonsterCoord = null;
    this.planetMonsterCooldown = this.gameplaySettings.bossSpawnIntervalMin * 60;
    this.syncRpgAppearance();
    this.rpgCombat.clearAllEncounters(true);
    this.rpgCombat.clearPlanetMonster();
    this.policeDispatchTimer = 0;
    this.policeCooldown = 0;
    this.companionAttackCooldown = 0;
    this.roadsideChat = null;
    this.roadsideCooldown = 9;
    this.passengerFarewellTimer = 0;
    this.hasCompanion = true;
    this.autopilotActive = false;
    this.autopilotArrivingStop = false;
    this.autopilotStatusText = null;
    this.isInRvCabin = false;
    this.rvPose = 'stand';
    this.rvLightsOn = true;
    this.rvTvOn = false;
    this.rvShowerOn = false;
    this.rvCoffeeBrewed = false;
    this.rvWindowTinted = false;
    this.rvFridgeOpen = false;
    this.rvSunroofOpen = false;
    this.companionLocation = 'cab';
    this.rvCompActivity = null;
    this.cabinTintDark = false;
    this.cabinRoofLight = false;
    this.cabinSeatsReclined = false;
    this.cabinMonitorOpen = false;
    this.engineRunning = true;
    this.leftWindowOpen = false;
    this.rightWindowOpen = false;
    this.serbosCoffeeServed = false;
    this.serbosDialogLine = null;
    this.serbosDialogTimer = 0;
    this.timePreset = 'auto';
    this.timeOfDay = 0.69;
    this.weatherSetting = 'auto';
    this.activeWeather = 'clear';
    this.seasonSetting = 'auto';
    this.activeSeason = 'summer';
    const cor = getPlanetConfig('coruscant');
    this.sky.setPlanetId(cor.biome);
    this.world.setSeason('summer');
    this.world.setPlanetBiome(cor, 0, 0);
    this.physics.applySaveState({
      planetId: 'coruscant',
      flightState: 'road',
      vehicleId: 'coupe',
      position: { x: 0, y: 0, z: 0 },
      heading: 0,
      forwardSpeed: 14,
      targetFlightAltitude: 104,
      spacePos: { x: 0, y: 260, z: 0 },
      spacePitch: 0,
      spaceSpeed: 0,
      orbitTheta: 0.55,
      orbitElev: 0.62,
      orbitDistFactor: 2.0,
      selectedLandingSiteId: null,
      isWalking: false,
      walkerPos: { x: 0, y: 0, z: 0 },
      walkerHeading: 0,
      companionPos: { x: 0, y: 0, z: 0 },
      companionHeading: 0,
    });
    this.cockpit.setVehicleModel('coupe');
    this.camera.position.set(-0.42, 1.13, 0.08);
    this.camera.rotation.set(0, 0, 0);
    this.vehicleGroup.add(this.camera);
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;
    this.quests.showToast('Начата новая поездка · Корускант', 3.0);
  }

  private applySaveData(save: GameSaveData, showToast: boolean): void {
    if (this.interiorMode !== 'none') {
      this.interior.setMode('none');
      this.interiorMode = 'none';
      this.interiorPose = 'stand';
      this.interiorLabel = null;
      this.activeSeat = null;
    }
    this.autopilotActive = false;
    this.autopilotArrivingStop = false;
    this.autopilotStatusText = null;
    this.isInRvCabin = false;
    this.rvPose = 'stand';
    this.leftWindowOpen = false;
    this.rightWindowOpen = false;
    this.serbosCoffeeServed = false;
    this.serbosDialogLine = null;
    this.serbosDialogTimer = 0;
    this.rpgCombat.clearAllEncounters(true);
    this.policeDispatchTimer = 0;
    this.policeCooldown = 0;
    this.companionAttackCooldown = 0;
    this.roadsideChat = null;
    this.roadsideCooldown = 9;
    this.passengerFarewellTimer = 0;
    this.cabinTintDark = Boolean(save.cabinTintDark);
    this.cabinRoofLight = Boolean(save.cabinRoofLight);
    this.cabinSeatsReclined = Boolean(save.cabinSeatsReclined);
    this.cabinMonitorOpen = Boolean(save.cabinMonitorOpen);
    this.engineRunning = save.engineRunning ?? true;
    this.rvLightsOn = save.rvLightsOn ?? true;
    this.rvTvOn = Boolean(save.rvTvOn);
    this.rvShowerOn = Boolean(save.rvShowerOn);
    this.rvCoffeeBrewed = Boolean(save.rvCoffeeBrewed);
    this.rvWindowTinted = Boolean(save.rvWindowTinted);
    this.rvFridgeOpen = false;
    this.rvSunroofOpen = Boolean(save.rvSunroofOpen);
    this.companionLocation = save.companionLocation ?? 'cab';
    this.hasCompanion = save.hasCompanion ?? true;
    this.timePreset = save.timePreset ?? 'auto';
    this.timeOfDay = typeof save.timeOfDay === 'number' ? save.timeOfDay : 0.69;
    this.weatherSetting = save.weatherSetting ?? 'auto';
    this.activeWeather = save.activeWeather ?? 'clear';
    this.seasonSetting = save.seasonSetting ?? 'auto';
    this.activeSeason = save.activeSeason ?? 'summer';
    this.quests.importSaveState(save);
    this.physics.applySaveState(save);
    this.rpgCombat.clearPlanetMonster();
    this.planetMonsterCoord = null;
    this.planetMonsterCooldown = this.gameplaySettings.bossSpawnIntervalMin * 60;
    const initRpg = createStarterRpgData();
    const rpgData = save.rpgState;
    if (rpgData) {
      this.rpgHp = rpgData.hp ?? initRpg.hp;
      if (rpgData.playerInventory || rpgData.companionInventory) {
        this.playerInventory = [...(rpgData.playerInventory ?? initRpg.playerInventory)];
        this.companionInventory = [...(rpgData.companionInventory ?? initRpg.companionInventory)];
      } else if (rpgData.inventory) {
        this.playerInventory = [];
        this.companionInventory = [];
        for (const it of rpgData.inventory) {
          this.addLootItemToBag(it);
        }
      } else {
        this.playerInventory = [...initRpg.playerInventory];
        this.companionInventory = [...initRpg.companionInventory];
      }
      this.playerEquipped = {
        ...rpgData.playerEquipped,
        earrings: rpgData.playerEquipped?.earrings ?? null,
      };
      this.companionEquipped = {
        ...rpgData.companionEquipped,
        earrings: rpgData.companionEquipped?.earrings ?? null,
      };
      // Migrate legacy equipped role-locked gear to proper bags
      if (this.playerEquipped.weapon && !canEquipOnTarget(this.playerEquipped.weapon, 'player')) {
        this.companionInventory.push(this.playerEquipped.weapon);
        this.playerEquipped.weapon = null;
      }
      if (this.playerEquipped.earrings) {
        this.companionInventory.push(this.playerEquipped.earrings);
        this.playerEquipped.earrings = null;
      }
      if (this.companionEquipped.weapon && !canEquipOnTarget(this.companionEquipped.weapon, 'companion')) {
        this.playerInventory.push(this.companionEquipped.weapon);
        this.companionEquipped.weapon = null;
      }
      this.weaponHolstered = Boolean(rpgData.weaponHolstered);
    } else {
      this.rpgHp = initRpg.hp;
      this.playerInventory = [...initRpg.playerInventory];
      this.companionInventory = [...initRpg.companionInventory];
      this.playerEquipped = { ...initRpg.playerEquipped };
      this.companionEquipped = { ...initRpg.companionEquipped };
      this.weaponHolstered = false;
    }
    this.syncRpgAppearance();
    this.cockpit.setVehicleModel('coupe');
    this.prevFlightState = this.physics.flightState;

    const cfg = getPlanetConfig(this.physics.activePlanetId);
    this.sky.setPlanetId(cfg.biome);
    this.world.setSeason(this.activeSeason);
    this.world.setPlanetBiome(cfg, save.position.x, save.position.z);

    if (this.physics.isWalking) {
      this.walkerGroup.position.copy(this.physics.walkerPos);
      this.walkerGroup.rotation.set(0, this.physics.walkerHeading, 0);
      this.camera.position.set(0, 1.66, 0);
      this.camera.rotation.set(0, 0, 0);
      this.walkerGroup.add(this.camera);
    } else {
      this.camera.position.set(
        -0.42,
        this.cabinSeatsReclined ? 0.87 : 1.13,
        this.cabinSeatsReclined ? 0.28 : 0.08,
      );
      this.camera.rotation.set(0, 0, 0);
      this.vehicleGroup.add(this.camera);
    }
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;

    this.lastSavedAt = save.savedAt;
    this.lastSavedPlanetName = cfg.name;
    if (showToast) {
      this.quests.showToast(`Загружено сохранение · ${cfg.name}`, 3.4);
    }
  }

  public toggleCompanion(): void {
    this.hasCompanion = !this.hasCompanion;
    if (!this.hasCompanion && this.quests.holdHands) {
      this.quests.holdHands = false;
    }
  }

  public toggleHoldHands(): void {
    if (!this.hasCompanion || !this.physics.isWalking) return;
    this.quests.toggleHoldHands();
  }

  public talkWithCompanion(): void {
    if (!this.hasCompanion) return;
    const cfg = getPlanetConfig(this.physics.activePlanetId);
    const inSpace = this.physics.flightState === 'space';
    const inOrbitMode = this.physics.flightState === 'orbit';
    const isFlying =
      this.physics.flightState === 'ascending' ||
      this.physics.flightState === 'flight' ||
      this.physics.flightState === 'launching_orbit' ||
      this.physics.flightState === 'launching' ||
      this.physics.flightState === 'entering';

    this.quests.talkTogether(
      cfg.biome,
      cfg.name,
      inSpace,
      inOrbitMode,
      isFlying,
      this.interiorMode,
      this.interiorPose,
      this.activeWeather,
      this.timeOfDay,
      this.activeSeason,
    );
  }

  public kissGirl(): { reply: string } {
    if (!this.hasCompanion) return { reply: '' };
    return this.quests.kissGirl();
  }

  public celebrateCoupleMoment(): void {
    if (!this.hasCompanion) return;
    const cfg = getPlanetConfig(this.physics.activePlanetId);
    const inSpace =
      this.physics.flightState === 'space' || this.physics.flightState === 'orbit';
    this.audio.playChime('coffee');
    this.quests.celebrateCoupleMoment(
      cfg.name,
      this.activeWeather,
      inSpace,
      this.isInRvCabin,
    );
    this.saveGame(false);
  }

  public cuddleWithCompanion(): void {
    if (!this.hasCompanion) return;
    this.audio.playChime('coffee');
    this.quests.cuddleWithCompanion(this.isInRvCabin, this.rvPose === 'lie');
    this.saveGame(false);
  }

  public replyRoadsideChat(optionId: string): void {
    if (!this.roadsideChat) return;
    const opt = this.roadsideChat.options.find((o) => o.id === optionId);
    if (!opt) return;
    this.roadsideChat = {
      ...this.roadsideChat,
      repliedText: opt.reply,
    };
    this.quests.credits += 10;
    this.quests.showToast('Приятная беседа у дороги · +10 ✦', 2.6);
  }

  public dismissRoadsideChat(): void {
    this.roadsideChat = null;
    this.rpgCombat.setRoadsideNpc(false);
  }

  public interactPassengerQuest(): void {
    const pq = this.quests.getPassengerQuestState();
    if (!pq) return;
    if (pq.phase === 'to_pickup') {
      if (this.quests.advancePassengerToRv()) {
        this.audio.playDoorLatch(false);
        this.rpgCombat.setPassengerNpc(false);
        this.saveGame(false);
      }
    } else if (pq.phase === 'in_rv') {
      const pName = pq.passengerName;
      const dX = pq.dropoffX;
      const dZ = pq.dropoffZ;
      if (this.quests.completePassengerTransport()) {
        this.audio.playDoorLatch(true);
        this.passengerFarewellTimer = 4.6;
        this.passengerFarewellX = this.physics.position.x + 2.2;
        this.passengerFarewellZ = this.physics.position.z + 1.2;
        this.passengerFarewellName = pName;
        this.quests.setCompanionNote(
          `«${pName} поблагодарил нас и пошёл по своим делам! Отличный рейс к ${Math.round(Math.hypot(dX, dZ)) > 0 ? pq.dropoffName : 'цели'}!»`,
          5.0,
        );
        this.saveGame(false);
      }
    }
  }

  public exitVehicle(): void {
    if (this.interiorMode !== 'none') return;
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (this.isInRvCabin && (this.autopilotActive || speedKmh >= 18)) {
      this.quests.showToast('Остановите автодом перед выходом на улицу', 2.8);
      return;
    }

    let rooftopClub: RooftopClubInfo | null = null;
    if (this.physics.flightState === 'flight') {
      rooftopClub = this.world.getRooftopClubUnder(
        this.physics.position.x,
        this.physics.position.z,
        this.physics.position.y,
        4.5,
      );
      if (!rooftopClub) {
        this.quests.showToast('Зависните над крышей клуба с бассейном, чтобы выйти в небе', 2.8);
        return;
      }
      if (speedKmh >= 16) {
        this.quests.showToast('Притормозите автодом над крышей перед выходом', 2.6);
        return;
      }
    }

    this.roadsideChat = null;
    this.rpgCombat.setRoadsideNpc(false);
    this.autopilotActive = false;
    this.isInRvCabin = false;
    this.rvPose = 'stand';
    const exited = rooftopClub
      ? this.physics.exitVehicle({
          allowHoverExit: true,
          floorY: rooftopClub.y,
          clampRect: {
            x: rooftopClub.x,
            z: rooftopClub.z,
            halfW: rooftopClub.halfW,
            halfD: rooftopClub.halfD,
          },
        })
      : this.physics.exitVehicle();
    if (!exited) return;

    this.audio.playDoorLatch(true);
    this.walkerGroup.position.copy(this.physics.walkerPos);
    this.walkerGroup.rotation.set(0, this.physics.walkerHeading, 0);
    this.camera.position.set(0, 1.66, 0);
    this.camera.rotation.set(0, 0, 0);
    this.walkerGroup.add(this.camera);
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;
    if (rooftopClub) {
      this.quests.showToast(
        `Вы на крыше: ${rooftopClub.name} · Автодом парит рядом`,
        3.4,
      );
    }
  }

  public enterVehicle(): void {
    if (this.interiorMode !== 'none') return;
    if (!this.physics.enterVehicle()) return;
    this.audio.playDoorLatch(false);
    this.isInRvCabin = false;
    this.rvPose = 'stand';
    this.quests.holdHands = false;
    this.camera.position.set(
      -0.42,
      this.cabinSeatsReclined ? 0.87 : 1.13,
      this.cabinSeatsReclined ? 0.28 : 0.08,
    );
    this.camera.rotation.set(0, 0, 0);
    this.vehicleGroup.add(this.camera);
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;
  }

  public toggleWalkVehicle(): void {
    if (this.interiorMode !== 'none') {
      this.exitInterior();
      return;
    }
    if (this.physics.isWalking) {
      this.enterVehicle();
    } else {
      this.exitVehicle();
    }
  }

  public enterNearbyCafe(): boolean {
    if (this.interiorMode !== 'none' || this.physics.flightState === 'space' || this.physics.position.y >= 8) {
      return false;
    }
    const refPos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    const nearest = this.world.getNearestCafe(refPos.x, refPos.z);
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (!nearest || nearest.distance > 32 || (!this.physics.isWalking && speedKmh >= 32)) {
      return false;
    }
    this.enterInterior('cafe', nearest.landmark.name);
    this.quests.onCafeVisited();
    return true;
  }

  public enterNearbyHotel(): boolean {
    if (this.interiorMode !== 'none' || this.physics.flightState === 'space' || this.physics.position.y >= 8) {
      return false;
    }
    const refPos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    const nearest = this.world.getNearestHotel(refPos.x, refPos.z);
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (!nearest || nearest.distance > 36 || (!this.physics.isWalking && speedKmh >= 32)) {
      return false;
    }
    this.enterInterior('hotel', nearest.landmark.name);
    this.quests.onHotelVisited();
    return true;
  }

  public enterNearbyObservatory(): boolean {
    if (this.interiorMode !== 'none' || this.physics.flightState === 'space' || this.physics.position.y >= 8) {
      return false;
    }
    const refPos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    const nearest = this.world.getNearestObservatory(refPos.x, refPos.z);
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (!nearest || nearest.distance > 32 || (!this.physics.isWalking && speedKmh >= 32)) {
      return false;
    }
    this.enterInterior('observatory', nearest.landmark.name);
    this.quests.onObservatoryVisit(nearest.landmark.id, nearest.landmark.name);
    return true;
  }

  public scanObservatorySky(): void {
    if (this.interiorMode !== 'observatory') return;
    const cfg = getPlanetConfig(this.physics.activePlanetId);
    this.audio.playChime('coffee');
    this.quests.onObservatoryGalaxyScanned(cfg.name);
    this.saveGame(false);
  }

  public enterNearbySerbos(): boolean {
    if (
      this.interiorMode !== 'none' ||
      this.physics.flightState === 'space' ||
      this.physics.flightState === 'orbit' ||
      this.physics.position.y >= 8
    ) {
      return false;
    }
    const refPos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    const nearest = this.world.getNearestSerbosHouse(refPos.x, refPos.z);
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (!nearest || nearest.distance > 34 || (!this.physics.isWalking && speedKmh >= 34)) {
      return false;
    }
    this.enterInterior('serbos', nearest.name);
    this.quests.onSerbosEntered();
    this.serbosCoffeeServed = false;
    this.serbosDialogLine =
      'Сербос: «Добро пожаловать! Я люблю всех вас, а это мой любимый сынок Адамчик ИИ!»';
    this.serbosDialogTimer = 7.0;
    return true;
  }

  public talkToSerbos(): void {
    if (this.interiorMode !== 'serbos') return;
    this.serbosDialogLine = this.quests.talkToSerbos();
    this.serbosDialogTimer = 7.0;
  }

  public lookAtAdamchik(): void {
    if (this.interiorMode !== 'serbos') return;
    this.serbosDialogLine = this.quests.lookAtAdamchik();
    this.serbosDialogTimer = 7.0;
  }

  public drinkCoffeeWithSerbos(): void {
    if (this.interiorMode !== 'serbos') return;
    if (this.interiorPose === 'stand') {
      this.sitAtNearbySeat();
    }
    this.serbosCoffeeServed = true;
    this.interior.setSerbosCoffeeServed(true);
    this.serbosDialogLine = this.quests.drinkCoffeeWithSerbos();
    this.serbosDialogTimer = 7.0;
  }

  public startCafeSideQuest(): void {
    const basePos = this.interiorMode !== 'none' || this.physics.isWalking
      ? this.savedOutdoorWalkPos
      : this.physics.position;
    this.quests.startCafeSpecialQuest(this.physics.activePlanetId, basePos);
    this.saveGame(false);
  }

  public startSerbosMission(): void {
    const basePos = this.interiorMode !== 'none' || this.physics.isWalking
      ? this.savedOutdoorWalkPos
      : this.physics.position;
    this.quests.startSerbosMission(this.physics.activePlanetId, basePos);
    this.serbosDialogLine =
      'Сербос: «Доставьте это ядро на маяк — от нас с Адамчиком ИИ ждёт редкая оранжевая награда!»';
    this.serbosDialogTimer = 7.0;
    this.saveGame(false);
  }

  public startMonsterHuntAutopilot(): void {
    if (this.interiorMode !== 'none') {
      this.exitInterior();
    }
    if (this.physics.isWalking) {
      this.enterVehicle();
    }
    if (this.physics.isWalking) {
      this.quests.showToast('Сядьте в автодом для автопилота к монстру', 2.8);
      return;
    }
    const pId = this.physics.activePlanetId;
    if (!this.planetMonsterCoord || this.planetMonsterCoord.planetId !== pId) {
      const mx = Math.round(this.physics.position.x / 320) * 320 + 225;
      const mz = Math.round(this.physics.position.z / 320) * 320 - 215;
      const key = `monster_${pId}_${Date.now()}`;
      this.planetMonsterCoord = { planetId: pId, key, x: mx, z: mz };
      this.rpgCombat.ensurePlanetMonsterAt(key, mx, mz);
    }
    this.quests.activateMonsterHuntQuest(
      pId,
      this.planetMonsterCoord.x,
      this.planetMonsterCoord.z,
    );
    this.startQuestAutopilot();
  }

  private enterInterior(mode: 'cafe' | 'hotel' | 'observatory' | 'serbos', label: string): void {
    this.autopilotActive = false;
    if (!this.physics.isWalking) {
      if (!this.physics.exitVehicle()) return;
      this.enteredFromCar = true;
    } else {
      this.enteredFromCar = false;
    }

    this.savedOutdoorWalkPos.copy(this.physics.walkerPos);
    this.savedOutdoorWalkHeading = this.physics.walkerHeading;
    this.savedOutdoorCompanionPos.copy(this.physics.companionPos);
    this.savedOutdoorCompanionHeading = this.physics.companionHeading;

    const spawn = this.interior.getEntrySpawn(mode);
    this.interiorMode = mode;
    this.interiorPose = 'stand';
    this.interiorLabel = label;
    this.activeSeat = null;
    this.interior.setMode(mode);

    this.physics.walkerPos.copy(spawn.playerPos);
    this.physics.walkerHeading = spawn.heading;
    this.physics.walkerPitch = 0;
    this.physics.companionPos.copy(spawn.companionPos);
    this.physics.companionHeading = spawn.heading;
    this.physics.companionMoveSpeed = 0;

    this.walkerGroup.position.copy(spawn.playerPos);
    this.walkerGroup.rotation.set(0, spawn.heading, 0);
    this.camera.position.set(0, 1.66, 0);
    this.camera.rotation.set(0, 0, 0);
    this.walkerGroup.add(this.camera);

    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;

    if (mode === 'cafe') {
      this.quests.showToast(`Вы зашли в ${label}`, 2.8);
      if (this.hasCompanion) {
        this.quests.setCompanionNote('«Как тут уютно! Пойдём займём столик у окна?»', 4.5);
      }
    } else if (mode === 'serbos') {
      this.quests.showToast('Дом Сербоса у озера', 3.0);
    } else if (mode === 'observatory') {
      this.quests.showToast(`Обсерватория · ${label}`, 3.0);
      if (this.hasCompanion) {
        this.quests.setCompanionNote('«Какой красивый купол и живая голограмма галактики! Посидим на скамье?»', 4.8);
      }
    } else {
      this.quests.showToast(`Номер отеля · ${label}`, 3.0);
      if (this.hasCompanion) {
        this.quests.setCompanionNote('«Какой просторный номер… Посмотри на вид из окна и на эту кровать!»', 4.8);
      }
    }
  }

  public exitInterior(): void {
    if (this.interiorMode === 'none') return;
    this.interior.setMode('none');
    this.interiorMode = 'none';
    this.interiorPose = 'stand';
    this.interiorLabel = null;
    this.activeSeat = null;
    this.serbosCoffeeServed = false;
    this.serbosDialogLine = null;
    this.serbosDialogTimer = 0;
    this.sleepAnimTimer = 0;
    this.sleepFade = 0;
    this.sleepMidpointApplied = false;

    this.physics.walkerPos.copy(this.savedOutdoorWalkPos);
    this.physics.walkerHeading = this.savedOutdoorWalkHeading;
    this.physics.walkerPitch = 0;
    this.physics.companionPos.copy(this.savedOutdoorCompanionPos);
    this.physics.companionHeading = this.savedOutdoorCompanionHeading;
    this.physics.companionMoveSpeed = 0;

    this.walkerGroup.position.copy(this.physics.walkerPos);
    this.walkerGroup.rotation.set(0, this.physics.walkerHeading, 0);
    this.camera.position.set(0, 1.66, 0);
    this.camera.rotation.set(0, 0, 0);
    this.walkerGroup.add(this.camera);

    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;

    if (this.enteredFromCar) {
      this.enteredFromCar = false;
      this.enterVehicle();
    }
    this.quests.showToast('Вы вышли на улицу', 2.2);
  }

  public sitAtNearbySeat(): boolean {
    if (this.interiorMode === 'none') return false;
    const seat = this.interior.getNearestSeat(
      this.interiorMode,
      this.physics.walkerPos.x,
      this.physics.walkerPos.z,
    );
    if (!seat) return false;

    this.activeSeat = seat;
    this.interiorPose = 'sit';
    this.physics.walkerPos.set(seat.playerPos.x, 0, seat.playerPos.z);
    this.physics.walkerHeading = seat.playerLookYaw;
    this.physics.walkerPitch = 0;
    this.physics.companionPos.copy(seat.companionPos);
    this.physics.companionHeading = seat.companionYaw;
    this.physics.companionMoveSpeed = 0;

    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;

    if (this.hasCompanion) {
      this.quests.setCompanionNote(
        this.interiorMode === 'cafe'
          ? '«Я напротив! Выбирай кофе, а я пока посмотрю в окно».'
          : this.interiorMode === 'serbos'
            ? '«Как хорошо сидеть у Сербоса за одним столом у озера! Попьём кофе вместе?»'
            : this.interiorMode === 'observatory'
              ? '«Как здорово смотреть на звёзды и голограмму галактики вместе с тобой».'
              : '«Удобный диван… Люблю просто сидеть так рядом с тобой».',
        4.6,
      );
    }
    return true;
  }

  public lieOnBed(): boolean {
    if (this.interiorMode !== 'hotel') return false;
    if (!this.interior.isNearBed('hotel', this.physics.walkerPos.x, this.physics.walkerPos.z)) {
      return false;
    }
    const bed = this.interior.getBedAnchor();
    this.activeSeat = null;
    this.interiorPose = 'lie';
    this.physics.walkerPos.set(bed.playerPos.x, 0, bed.playerPos.z);
    this.physics.walkerHeading = bed.playerLookYaw;
    this.physics.walkerPitch = bed.playerLookPitch;
    this.physics.companionPos.copy(bed.companionPos);
    this.physics.companionHeading = bed.companionYaw;
    this.physics.companionMoveSpeed = 0;

    this.lookYaw = 0;
    this.lookPitch = bed.playerLookPitch;
    this.targetLookYaw = 0;
    this.targetLookPitch = bed.playerLookPitch;

    if (this.hasCompanion) {
      this.quests.setCompanionNote(
        '«Кровать такая мягкая… Можно просто полежать вдвоём и посмотреть на небо».',
        5.0,
      );
    }
    return true;
  }

  public standUpFromPose(): void {
    if (this.interiorMode === 'none' || this.interiorPose === 'stand') return;
    if (this.interiorPose === 'lie') {
      // Step onto the open rug beside the bed so we don't overlap the bed collider
      this.physics.walkerPos.set(0.1, 0, 1.45);
      this.physics.walkerHeading = -Math.PI / 2;
      this.physics.companionPos.set(0.35, 0, 2.25);
      this.physics.companionHeading = -Math.PI / 2;
    } else if (this.activeSeat) {
      if (this.interiorMode === 'observatory') {
        this.physics.walkerPos.set(0, 0, 3.25);
        this.physics.companionPos.set(0.85, 0, 3.3);
      } else if (this.interiorMode === 'serbos') {
        this.physics.walkerPos.set(-0.6, 0, 0.9);
        this.physics.companionPos.set(0.55, 0, 0.95);
      } else if (this.activeSeat.tableIndex >= 0) {
        // Café table: step back behind the chair clear of table collider
        this.physics.walkerPos.set(
          this.activeSeat.playerPos.x,
          0,
          Math.min(4.5, this.activeSeat.playerPos.z + 0.92),
        );
        this.physics.companionPos.set(this.activeSeat.playerPos.x + 0.9, 0, this.activeSeat.playerPos.z + 0.92);
      } else {
        // Hotel sofa: step forward/side onto rug
        this.physics.walkerPos.set(-0.9, 0, -0.4);
        this.physics.companionPos.set(-0.8, 0, 0.5);
      }
    }
    this.activeSeat = null;
    this.interiorPose = 'stand';
    this.physics.walkerPitch = 0;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.targetLookYaw = 0;
    this.targetLookPitch = 0;
    this.camera.position.set(0, 1.66, 0);
  }

  public sleepInHotelBed(): void {
    if (this.interiorMode !== 'hotel' || this.sleepAnimTimer > 0) return;
    if (this.interiorPose !== 'lie') {
      const bed = this.interior.getBedAnchor();
      this.activeSeat = null;
      this.interiorPose = 'lie';
      this.physics.walkerPos.set(bed.playerPos.x, 0, bed.playerPos.z);
      this.physics.walkerHeading = bed.playerLookYaw;
      this.physics.walkerPitch = bed.playerLookPitch;
      this.physics.companionPos.copy(bed.companionPos);
      this.physics.companionHeading = bed.companionYaw;
      this.physics.companionMoveSpeed = 0;
      this.lookYaw = 0;
      this.lookPitch = bed.playerLookPitch;
      this.targetLookYaw = 0;
      this.targetLookPitch = bed.playerLookPitch;
    }
    this.sleepAnimTimer = 2.8;
    this.sleepMidpointApplied = false;
  }

  public triggerBoost(): void {
    if (this.interiorMode !== 'none') return;
    if (!this.physics.isWalking && !this.engineRunning) {
      this.quests.showToast('Двигатель заглушён — запустите во вкладке «Салон»', 2.8);
      return;
    }
    this.physics.triggerBoost();
    if (!this.physics.isWalking) {
      this.audio.playBoostWhoosh();
    }
  }

  public selectQuest(id: string): void {
    const pos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    this.quests.selectQuest(
      id,
      this.physics.activePlanetId,
      pos,
      this.physics.spacePos,
      this.world.getLandmarks(),
    );
  }

  public skipQuest(): void {
    const pos = this.physics.isWalking ? this.physics.walkerPos : this.physics.position;
    this.quests.skipActiveQuest(
      this.physics.activePlanetId,
      pos,
      this.physics.spacePos,
      this.world.getLandmarks(),
    );
  }

  public orderInCafe(itemId: string): { ok: boolean; reply: string } {
    const cfg = getPlanetConfig(this.physics.activePlanetId);
    const res = this.quests.orderInCafe(cfg.biome, itemId);
    if (res.ok && this.interiorMode === 'cafe') {
      const tableIdx = this.activeSeat && this.activeSeat.tableIndex >= 0 ? this.activeSeat.tableIndex : 0;
      this.interior.setCoffeeServed(tableIdx, true);
    }
    return res;
  }

  public selectCabinTheme(id: CabinThemeId): boolean {
    return this.quests.selectOrBuyTheme(id);
  }

  public setTimePreset(preset: TimePreset): void {
    this.timePreset = preset;
    if (preset === 'dawn') this.timeOfDay = 0.27;
    else if (preset === 'day') this.timeOfDay = 0.5;
    else if (preset === 'sunset') this.timeOfDay = 0.72;
    else if (preset === 'night') this.timeOfDay = 0.96;
  }

  public setTimeOfDayManual(val: number): void {
    this.timePreset = 'auto';
    this.timeOfDay = ((val % 1) + 1) % 1;
  }

  public setWeatherSetting(setting: WeatherSetting): void {
    this.weatherSetting = setting;
    if (setting !== 'auto') {
      this.activeWeather = setting;
      this.weatherBlend = 0.35;
    }
  }

  public setSeasonSetting(setting: SeasonSetting): void {
    this.seasonSetting = setting;
    if (setting !== 'auto') {
      this.activeSeason = setting;
      this.world.setSeason(setting);
      if (this.weatherSetting === 'auto') {
        if (setting === 'winter' && (this.activeWeather === 'rain' || this.activeWeather === 'storm')) {
          this.activeWeather = 'snow';
          this.weatherBlend = 0.25;
        } else if (setting === 'summer' && this.activeWeather === 'snow') {
          this.activeWeather = 'clear';
          this.weatherBlend = 0.25;
        }
      }
    }
  }

  private getSeasonalWeatherPool(biome: string, season: SeasonId): WeatherMode[] {
    if (biome === 'kryos' || season === 'winter') {
      return ['clear', 'cloudy', 'snow', 'snow'];
    }
    if (season === 'autumn') {
      return ['clear', 'cloudy', 'rain', 'storm'];
    }
    if (season === 'spring') {
      return ['clear', 'cloudy', 'rain', 'clear'];
    }
    return ['clear', 'cloudy', 'rain', 'storm'];
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    this.onContextError(true);
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
    this.onContextError(false);
    this.tick();
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.audio.unlockFromGesture();
    if (this.lookPointerId !== null) return;
    this.lookPointerId = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.lookPointerId !== e.pointerId) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.physics.isWalking) {
      if (this.interiorMode !== 'none' && this.interiorPose !== 'stand') {
        this.targetLookYaw = THREE.MathUtils.clamp(this.targetLookYaw - dx * 0.0042, -1.65, 1.65);
        this.targetLookPitch = THREE.MathUtils.clamp(this.targetLookPitch - dy * 0.0036, -0.55, 0.85);
        return;
      }
      this.physics.walkerHeading -= dx * 0.0042;
      this.physics.walkerPitch = THREE.MathUtils.clamp(
        this.physics.walkerPitch - dy * 0.0036,
        -1.05,
        1.05,
      );
      return;
    }

    if (this.isInRvCabin) {
      this.rvLookYaw -= dx * 0.0042;
      this.rvLookPitch = THREE.MathUtils.clamp(this.rvLookPitch - dy * 0.0036, -0.95, 0.95);
      return;
    }

    const isAirOrSpace = this.physics.flightState !== 'road';
    const maxYaw = isAirOrSpace ? 1.85 : 1.35;
    const minPitch = isAirOrSpace ? -0.42 : -0.35;
    const maxPitch = isAirOrSpace ? 0.72 : 0.52;
    this.targetLookYaw = THREE.MathUtils.clamp(this.targetLookYaw - dx * 0.0042, -1.85, maxYaw);
    this.targetLookPitch = THREE.MathUtils.clamp(
      this.targetLookPitch - dy * 0.0034,
      minPitch,
      maxPitch,
    );
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.lookPointerId !== e.pointerId) return;
    this.lookPointerId = null;
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.timerId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.timerId = window.setTimeout(cb, 80);
      }
    };
    this.timerId = window.setTimeout(poll, 5);
  }

  private computeNearestPlanet(): void {
    let best = this.activeSpacePlanets[0] ?? STARTER_PLANETS[0];
    let bestDist = Infinity;
    for (let i = 0; i < this.activeSpacePlanets.length; i++) {
      const p = this.activeSpacePlanets[i];
      const d = this.physics.spacePos.distanceTo(p.spacePos);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    this.nearestPlanet = best;
    this.nearestPlanetDist = bestDist;
  }

  private computePlanetMarkers(): PlanetMarker[] {
    if (this.physics.flightState !== 'space') return [];

    this.camera.getWorldDirection(_camForward);
    const markers: PlanetMarker[] = [];

    // Show closest 9 planets so HUD stays uncluttered while flying endlessly in any direction
    const maxMarkers = Math.min(9, this.activeSpacePlanets.length);
    for (let i = 0; i < maxMarkers; i++) {
      const p = this.activeSpacePlanets[i];
      _toTarget.subVectors(p.spacePos, this.physics.spacePos);
      const distUnits = _toTarget.length();
      const inFront = _toTarget.dot(_camForward) > 0;

      _projVec.copy(p.spacePos).project(this.camera);
      let sx = _projVec.x;
      let sy = _projVec.y;
      if (!inFront) {
        sx = -sx;
        sy = -sy;
      }

      markers.push({
        id: p.id,
        name: p.name,
        color: p.accentHex,
        distanceKm: Math.max(0, Math.round((distUnits - p.radius) * 0.12)),
        screenX: THREE.MathUtils.clamp(sx, -0.92, 0.92),
        screenY: THREE.MathUtils.clamp(sy, -0.82, 0.82),
        inFront,
        isOrbiting: distUnits <= p.orbitRange,
      });
    }

    return markers;
  }

  private tick = (): void => {
    if (this.disposed || this.contextLost) return;

    const nowMs = performance.now();
    if (this.lastPerfSampleMs > 0 && !this.isSoftwareGl) {
      const frameMs = nowMs - this.lastPerfSampleMs;
      if (frameMs < 250) {
        this.perfAccumMs += frameMs;
        this.perfFrameCount++;
        if (this.perfFrameCount >= 45) {
          const avgMs = this.perfAccumMs / this.perfFrameCount;
          this.perfAccumMs = 0;
          this.perfFrameCount = 0;

          if (avgMs > 38) {
            this.fastFramesStreak = 0;
            if (this.currentDpr > this.minAdaptiveDpr + 0.02) {
              this.currentDpr = Math.max(this.minAdaptiveDpr, Number((this.currentDpr - 0.12).toFixed(2)));
              this.renderer.setPixelRatio(this.currentDpr);
            } else if (avgMs > 46 && this.renderer.shadowMap.enabled) {
              this.renderer.shadowMap.enabled = false;
              this.sky.sunLight.castShadow = false;
            }
          } else if (avgMs < 21) {
            this.fastFramesStreak++;
            const targetMax = Math.min(window.devicePixelRatio || 1, this.baseMaxDpr);
            if (this.fastFramesStreak >= 3 && this.currentDpr < targetMax - 0.02) {
              this.fastFramesStreak = 0;
              this.currentDpr = Math.min(targetMax, Number((this.currentDpr + 0.08).toFixed(2)));
              this.renderer.setPixelRatio(this.currentDpr);
            }
          } else {
            this.fastFramesStreak = 0;
          }
        }
      }
    }
    this.lastPerfSampleMs = nowMs;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.timePreset === 'auto') {
      this.timeOfDay = (this.timeOfDay + delta / 140) % 1;
    }

    if (this.sleepAnimTimer > 0) {
      this.sleepAnimTimer = Math.max(0, this.sleepAnimTimer - delta);
      const p = 1 - this.sleepAnimTimer / 2.8;
      if (p < 0.42) {
        this.sleepFade = p / 0.42;
      } else if (p < 0.58) {
        this.sleepFade = 1;
        if (!this.sleepMidpointApplied) {
          this.sleepMidpointApplied = true;
          this.timePreset = 'auto';
          const norm = ((this.timeOfDay % 1) + 1) % 1;
          this.timeOfDay = norm >= 0.34 && norm < 0.68 ? 0.71 : 0.28;
          this.quests.onHotelSleep();
        }
      } else {
        this.sleepFade = Math.max(0, 1 - (p - 0.58) / 0.42);
      }
      if (this.sleepAnimTimer === 0) {
        this.sleepFade = 0;
        this.sleepMidpointApplied = false;
      }
    }

    const activeCfg = getPlanetConfig(this.physics.activePlanetId);
    if (this.seasonSetting === 'auto' && this.physics.flightState !== 'space') {
      this.seasonTimer += delta;
      if (this.seasonTimer > 58) {
        this.seasonTimer = 0;
        const idx = (SEASON_CYCLE.indexOf(this.activeSeason) + 1) % SEASON_CYCLE.length;
        this.activeSeason = SEASON_CYCLE[idx];
        this.world.setSeason(this.activeSeason);
        this.quests.showToast(`Смена сезона: ${SEASON_LABELS[this.activeSeason]}`, 3.2);
      }
    }

    if (this.weatherSetting === 'auto') {
      this.weatherTimer += delta;
      if (this.weatherTimer > 32) {
        this.weatherTimer = 0;
        const pool = this.getSeasonalWeatherPool(activeCfg.biome, this.activeSeason);
        this.weatherIndex = (this.weatherIndex + 1) % pool.length;
        this.activeWeather = pool[this.weatherIndex];
        this.weatherBlend = 0;
      }
    }
    this.weatherBlend = Math.min(1, this.weatherBlend + delta * 0.35);

    if (this.serbosDialogTimer > 0) {
      this.serbosDialogTimer = Math.max(0, this.serbosDialogTimer - delta);
      if (this.serbosDialogTimer === 0) {
        this.serbosDialogLine = null;
      }
    }

    const insideInterior = this.interiorMode !== 'none';
    const isWalking = this.physics.isWalking;
    const inSpace = this.physics.flightState === 'space';
    const inOrbitMode = this.physics.flightState === 'orbit';
    const inSpaceView = inSpace || inOrbitMode;

    if (isWalking && !insideInterior && !this.isInRvCabin && !inSpaceView) {
      this.walkStreakSec += delta;
    } else {
      this.walkStreakSec = 0;
    }

    if (this.gopnikCooldown > 0) this.gopnikCooldown = Math.max(0, this.gopnikCooldown - delta);
    if (this.healCooldown > 0) this.healCooldown = Math.max(0, this.healCooldown - delta);
    if (this.policeCooldown > 0) this.policeCooldown = Math.max(0, this.policeCooldown - delta);
    if (this.companionAttackCooldown > 0) {
      this.companionAttackCooldown = Math.max(0, this.companionAttackCooldown - delta);
    }

    const playerStats = computeRpgStats(this.playerEquipped, this.companionEquipped);
    const maxHp = playerStats.maxHp;
    if (this.rpgHp > maxHp) this.rpgHp = maxHp;

    if (
      this.hasCompanion &&
      !insideInterior &&
      !inSpaceView &&
      this.rpgHp > 0 &&
      this.rpgHp < maxHp * 0.5 &&
      this.healCooldown <= 0
    ) {
      this.healCooldown = 6.5;
      const healAmt = Math.max(32, playerStats.healPower);
      this.rpgHp = Math.min(maxHp, this.rpgHp + healAmt);
      this.audio.playHealChime();
      this.quests.setCompanionNote(
        '«Я подлечила тебя, держись! Не позволяй им портить наше путешествие».',
        5.0,
      );
      this.quests.showToast(`Спутница подлечила вас (+${healAmt} HP)`, 3.0);
    }

    if (this.rpgHp < maxHp && this.rpgCombat.getGopniksActiveCount() === 0 && !this.rpgCombat.policeWanted && !this.rpgCombat.isBountyBossAlive()) {
      this.rpgHp = Math.min(maxHp, this.rpgHp + delta * 2.2);
    }

    let activePos = insideInterior
      ? this.savedOutdoorWalkPos
      : isWalking
        ? this.physics.walkerPos
        : (inSpaceView ? this.physics.spacePos : this.physics.position);

    if (this.policeDispatchTimer > 0) {
      if (inSpaceView || insideInterior) {
        if (inSpaceView) this.policeDispatchTimer = 0;
      } else {
        this.policeDispatchTimer = Math.max(0, this.policeDispatchTimer - delta);
        if (this.policeDispatchTimer === 0) {
          this.rpgCombat.triggerPoliceAlert(activePos.x, activePos.z);
          this.audio.playPoliceBeep();
          this.quests.showToast('Прибыл патруль полиции (2–3 офицера)! Открыт огонь!', 3.8);
        }
      }
    }

    if (
      this.walkStreakSec >= 60 &&
      this.gopnikCooldown <= 0 &&
      this.rpgCombat.getGopniksActiveCount() === 0 &&
      !this.rpgCombat.policeWanted &&
      isWalking &&
      !insideInterior &&
      !this.isInRvCabin &&
      !inSpaceView &&
      this.physics.activeFloorY < 1
    ) {
      this.rpgCombat.spawnGopnikTrio(activePos.x, activePos.z, this.physics.walkerHeading);
      this.gopnikCooldown = 110;
      this.quests.showToast('На улице подошли 3 гопника! Требуется бой или уход', 3.6);
    }

    const activeQKind = this.quests.getActiveQuestKind();
    const guidanceForTick = this.quests.getActiveQuestGuidance(
      this.physics.activePlanetId,
      activePos,
      this.world.getLandmarks(),
    );

    if (activeQKind === 'rally_dispersal' && !inSpaceView) {
      const park = this.world.findNearestParkCenter(activePos.x, activePos.z);
      if (park) {
        this.rpgCombat.ensureRallyAt(park.x, park.z);
      }
    } else {
      this.rpgCombat.resetRallyForNewQuest();
    }

    if (
      activeQKind === 'bounty_hunt' &&
      !inSpaceView &&
      guidanceForTick &&
      guidanceForTick.targetPlanet === this.physics.activePlanetId
    ) {
      this.rpgCombat.ensureBountyBossAt(
        guidanceForTick.questId,
        guidanceForTick.targetX ?? activePos.x + 190,
        guidanceForTick.targetZ ?? activePos.z - 170,
      );
    } else {
      this.rpgCombat.clearBountyBoss();
    }

    if (activeQKind === 'lightsaber_hunt' && !inSpaceView) {
      const saberCfg = getLightsaberForPlanet(this.physics.activePlanetId);
      this.rpgCombat.setSaberBeacon(true, 96, -124, saberCfg.colorHex);
    } else {
      this.rpgCombat.setSaberBeacon(false);
    }

    // Giant Planet Monster periodic alert & quest tracking
    if (
      inSpaceView ||
      (this.planetMonsterCoord && this.planetMonsterCoord.planetId !== this.physics.activePlanetId)
    ) {
      this.rpgCombat.clearPlanetMonster();
      this.planetMonsterCoord = null;
    } else if (!insideInterior && !inSpaceView) {
      if (
        activeQKind === 'monster_hunt' &&
        guidanceForTick &&
        guidanceForTick.targetPlanet === this.physics.activePlanetId
      ) {
        if (!this.planetMonsterCoord) {
          const mx = guidanceForTick.targetX ?? Math.round(activePos.x / 320) * 320 + 225;
          const mz = guidanceForTick.targetZ ?? Math.round(activePos.z / 320) * 320 - 215;
          this.planetMonsterCoord = {
            planetId: this.physics.activePlanetId,
            key: guidanceForTick.questId,
            x: mx,
            z: mz,
          };
          this.rpgCombat.ensurePlanetMonsterAt(guidanceForTick.questId, mx, mz);
        }
      } else if (!this.planetMonsterCoord) {
        this.planetMonsterCooldown -= delta;
        if (this.planetMonsterCooldown <= 0) {
          this.planetMonsterCooldown = this.gameplaySettings.bossSpawnIntervalMin * 60;
          const mx = Math.round(activePos.x / 320) * 320 + 225;
          const mz = Math.round(activePos.z / 320) * 320 - 215;
          const key = `monster_${this.physics.activePlanetId}_${Math.round(elapsed)}`;
          this.planetMonsterCoord = {
            planetId: this.physics.activePlanetId,
            key,
            x: mx,
            z: mz,
          };
          this.rpgCombat.ensurePlanetMonsterAt(key, mx, mz);
          this.quests.activateMonsterHuntQuest(this.physics.activePlanetId, mx, mz);
          this.audio.playPoliceBeep();
          this.quests.showToast('⚠️ ТРЕВОГА НА ПЛАНЕТЕ: Появился гигантский монстр!', 5.0);
        }
      }
      if (this.planetMonsterCoord && this.rpgCombat.isPlanetMonsterAlive()) {
        const mHp = this.rpgCombat.getPlanetMonsterHp();
        this.quests.updateMonsterProgress(mHp.hp, mHp.maxHp);
      }
    }

    // Passenger NPC visual marker at pickup or farewell walk after dropoff
    const pQuest = this.quests.getPassengerQuestState();
    if (this.passengerFarewellTimer > 0) {
      this.passengerFarewellTimer = Math.max(0, this.passengerFarewellTimer - delta);
      this.passengerFarewellX += delta * 1.45;
      this.passengerFarewellZ += delta * 0.85;
      if (this.passengerFarewellTimer > 0 && !inSpaceView && !insideInterior) {
        this.rpgCombat.setPassengerNpc(
          true,
          this.passengerFarewellX,
          0,
          this.passengerFarewellZ,
          Math.atan2(1.45, 0.85),
          1.65,
          elapsed,
        );
      } else {
        this.rpgCombat.setPassengerNpc(false);
      }
    } else if (
      pQuest &&
      pQuest.phase === 'to_pickup' &&
      pQuest.pickupPlanet === this.physics.activePlanetId &&
      !inSpaceView &&
      !insideInterior
    ) {
      const dxP = this.physics.position.x - pQuest.pickupX;
      const dzP = this.physics.position.z - pQuest.pickupZ;
      this.rpgCombat.setPassengerNpc(
        true,
        pQuest.pickupX,
        0,
        pQuest.pickupZ,
        Math.atan2(dxP, dzP),
        0,
        elapsed,
      );
    } else {
      this.rpgCombat.setPassengerNpc(false);
    }

    const walkObstacles = insideInterior
      ? this.interior.getObstacles(this.interiorMode)
      : this.world.getNearbyBuildings();

    this.rpgCombat.update(
      delta,
      elapsed,
      isWalking,
      isWalking ? Math.abs(this.physics.forwardSpeed) : 0,
      insideInterior || this.isInRvCabin,
      inSpaceView,
      activePos.x,
      activePos.y,
      activePos.z,
      this.physics.position.x,
      this.physics.position.z,
      playerStats.armorPct,
      walkObstacles,
      {
        onPlayerDamaged: (rawDmg: number, attackerLabel: string) => {
          const reduced = Math.max(1, Math.round(rawDmg * (1 - playerStats.armorPct / 140)));
          this.rpgHp = Math.max(0, this.rpgHp - reduced);
          this.audio.playPunchHit();

          if (
            this.hasCompanion &&
            this.rpgHp < maxHp * 0.5 &&
            this.healCooldown <= 0 &&
            this.rpgHp > 0
          ) {
            this.healCooldown = 6.5;
            const healAmt = Math.max(32, playerStats.healPower);
            this.rpgHp = Math.min(maxHp, this.rpgHp + healAmt);
            this.audio.playHealChime();
            this.quests.setCompanionNote(
              '«Я подлечила тебя, держись! Не позволяй им портить наше путешествие».',
              5.2,
            );
            this.quests.showToast('Спутница применила мед-набор и подлечила вас!', 3.4);
          }

          if (this.rpgHp <= 0) {
            this.rpgHp = Math.round(maxHp * 0.7);
            this.rpgCombat.clearAllEncounters(true);
            this.policeDispatchTimer = 0;
            this.audio.playHealChime();
            this.quests.setCompanionNote(
              '«Ой! Я вовремя успела увести тебя в укрытие. Отдохни немного».',
              5.5,
            );
            this.quests.showToast('Спутница оказала первую помощь и спасла вас!', 4.0);
          } else {
            this.quests.showToast(`Урон от ${attackerLabel}: -${reduced} HP`, 2.2);
          }
        },
        onEnemyDefeated: this.handleEnemyDefeated,
        onPoliceCleared: (reason: 'defeated' | 'escaped' | 'hidden') => {
          this.policeCooldown = 18;
          this.policeDispatchTimer = 0;
          const msg =
            reason === 'defeated'
              ? 'Полиция побеждена · Подберите ценный лут на земле!'
              : reason === 'escaped'
                ? 'Вы успешно оторвались от погони полиции!'
                : 'Полиция потеряла вас из виду в укрытии.';
          this.quests.showToast(msg, 3.8);
        },
        onSaberPickupClaimed: () => {
          const saberItem = createRpgItemFromTemplate(getLightsaberForPlanet(this.physics.activePlanetId).templateId);
          const bagOwner = this.addLootItemToBag(saberItem);
          this.audio.playLootDrop(true);
          this.quests.onLightsaberClaimed(this.physics.activePlanetId);
          this.quests.setCompanionNote(
            `«Световой меч (${saberItem.name}) у нас! Настоящая легенда!»`,
            5.2,
          );
          this.quests.showToast(
            `Найден легендарный меч: ${saberItem.name} (${bagOwner === 'companion' ? 'Спутнице' : 'Игроку'})!`,
            4.2,
          );
          this.saveGame(false);
        },
        onGopnikTaunt: (line: string) => {
          this.quests.showToast(line, 3.0);
        },
        onRallyShout: (line: string) => {
          this.quests.showToast(line, 2.8);
        },
        onLootCollected: (item: RpgItem | null, coins: number) => {
          this.quests.credits += coins;
          let bagLabel = '';
          if (item) {
            const bagOwner = this.addLootItemToBag(item);
            bagLabel = bagOwner === 'companion' ? ' · В сумку спутницы' : ' · В ваш инвентарь';
          }
          this.audio.playLootDrop(
            Boolean(
              item &&
                (item.rarity === 'mythic' ||
                  item.rarity === 'legendary' ||
                  item.rarity === 'epic'),
            ),
          );
          this.quests.showToast(
            item
              ? `Подобрано: ${item.name}${item.isUnique ? ' [Уникальный]' : ''}${bagLabel} · +${coins} ✦`
              : `Подобран мешочек: +${coins} ✦`,
            3.2,
          );
          this.saveGame(false);
        },
      },
      this.gameplaySettings.lootAutoCollect,
    );

    // Cancel autopilot ONLY on manual driver controls, walking outside, or entering interior
    // NOTE: Flying, entering orbit/space, and walking around the rear RV mini-home NEVER cancel autopilot!
    if (this.autopilotActive) {
      const manualDriverInput =
        !this.isInRvCabin &&
        (this.inputs.throttle ||
          this.inputs.brake ||
          this.inputs.steerLeft ||
          this.inputs.steerRight ||
          Math.abs(this.inputs.steerAxis) > 0.16);
      if (manualDriverInput || insideInterior || this.physics.isWalking) {
        this.autopilotActive = false;
        this.autopilotArrivingStop = false;
        this.autopilotStatusText = null;
        if (manualDriverInput) {
          this.quests.showToast('Автопилот передал управление вам', 2.0);
        }
      }
    }

    if (this.engineHintCooldown > 0) {
      this.engineHintCooldown = Math.max(0, this.engineHintCooldown - delta);
    }
    if (
      !this.engineRunning &&
      !insideInterior &&
      !this.physics.isWalking &&
      !this.isInRvCabin &&
      (this.inputs.throttle || this.inputs.boost) &&
      this.engineHintCooldown <= 0
    ) {
      this.engineHintCooldown = 3.5;
      this.quests.showToast('Двигатель заглушён — запустите его во вкладке «Салон»', 2.8);
    }

    let driveInputs: ControlInputs = this.isInRvCabin ? this.rvIdleInputs : this.inputs;
    if (this.autopilotActive) {
      this.updateAutopilot(delta, activeCfg, walkObstacles);
      driveInputs = this.autopilotInputs;
    } else {
      this.autopilotStatusText = null;
    }

    this.physics.update(
      delta,
      driveInputs,
      this.activeWeather,
      elapsed,
      walkObstacles,
      insideInterior ? undefined : (wx, wz) => this.world.canWalkAt(wx, wz),
      insideInterior
        ? {
            holdHands: this.quests.holdHands && this.hasCompanion,
            freezeWalking: this.interiorPose !== 'stand',
            skipCarCollision: true,
            clampWalkBounds: (pos) => this.interior.clampPlayerPosition(this.interiorMode, pos),
            engineRunning: this.engineRunning,
          }
        : {
            holdHands: this.quests.holdHands && this.hasCompanion,
            engineRunning: this.engineRunning,
          },
    );

    if ((inSpaceView || this.physics.spaceFactor > 0.25) && (this.leftWindowOpen || this.rightWindowOpen)) {
      this.leftWindowOpen = false;
      this.rightWindowOpen = false;
      this.quests.showToast('Окна автоматически закрыты — герметизация (+22°C)', 3.0);
    }

    if (this.prevFlightState !== 'orbit' && inOrbitMode) {
      const sites = getPlanetLandingSites(this.physics.activePlanetId);
      if (!this.physics.selectedLandingSiteId && sites[0]) {
        this.physics.selectedLandingSiteId = sites[0].id;
      }
      this.quests.onOrbitEntered();
      this.quests.showToast(
        `Орбита · ${getPlanetConfig(this.physics.activePlanetId).name} — выберите точку посадки`,
        3.6,
      );
      this.saveGame(false);
    }
    this.prevFlightState = this.physics.flightState;

    if (!insideInterior) {
      this.autoSaveTimer += delta;
      if (this.autoSaveTimer >= 15) {
        this.autoSaveTimer = 0;
        this.saveGame(false);
      }
    }

    if (
      !insideInterior &&
      !isWalking &&
      !inSpaceView &&
      this.physics.flightState === 'road' &&
      this.world.isViaductOnlyAt(this.physics.position.x, this.physics.position.z)
    ) {
      const cx = Math.round(this.physics.position.x / 320);
      const cz = Math.round(this.physics.position.z / 320);
      const lx = this.physics.position.x - cx * 320;
      const lz = this.physics.position.z - cz * 320;
      const curb = 14.5;
      if (Math.abs(lx) > curb && Math.abs(lz) > curb) {
        if (Math.abs(lx) < Math.abs(lz)) {
          this.physics.position.x = cx * 320 + Math.sign(lx) * curb;
        } else {
          this.physics.position.z = cz * 320 + Math.sign(lz) * curb;
        }
      }
    }

    const refPos = inSpaceView ? this.physics.spacePos : this.physics.position;

    // Hide exterior car when inside café or hotel room (both sit at world origin)
    this.vehicleGroup.visible = !insideInterior;
    this.vehicleGroup.position.set(
      refPos.x,
      refPos.y + this.physics.suspensionHeave,
      refPos.z,
    );
    this.vehicleGroup.rotation.order = 'YXZ';
    this.vehicleGroup.rotation.y = this.physics.heading;
    this.vehicleGroup.rotation.x = this.physics.pitch;
    this.vehicleGroup.rotation.z = this.physics.roll;

    if (this.inputs.boost && !this.prevBoostInput && !insideInterior && !this.isInRvCabin) {
      this.physics.triggerBoost();
    }
    this.prevBoostInput = this.inputs.boost;

    const speedDelta = Math.abs(this.physics.forwardSpeed) - Math.abs(this.prevForwardSpeed);
    this.prevForwardSpeed = this.physics.forwardSpeed;
    const boostActive = !insideInterior && (this.physics.boostTimer > 0 || (this.inputs.boost && !this.isInRvCabin));
    const throttleOrBoost = (!this.isInRvCabin && this.inputs.throttle) || boostActive;
    const throttleJustPressed = throttleOrBoost && !this.prevThrottleOrBoost;
    this.prevThrottleOrBoost = throttleOrBoost;

    if (isWalking) {
      if (insideInterior && this.interiorPose === 'sit' && this.activeSeat) {
        this.lookYaw = THREE.MathUtils.damp(this.lookYaw, this.targetLookYaw, 10, delta);
        this.lookPitch = THREE.MathUtils.damp(this.lookPitch, this.targetLookPitch, 10, delta);
        this.walkerGroup.position.copy(this.activeSeat.playerPos);
        this.walkerGroup.rotation.set(0, this.activeSeat.playerLookYaw, 0);
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.lookYaw;
        this.camera.rotation.x = this.lookPitch;
      } else if (insideInterior && this.interiorPose === 'lie') {
        const bed = this.interior.getBedAnchor();
        this.lookYaw = THREE.MathUtils.damp(this.lookYaw, this.targetLookYaw, 10, delta);
        this.lookPitch = THREE.MathUtils.damp(this.lookPitch, this.targetLookPitch, 10, delta);
        this.walkerGroup.position.copy(bed.playerPos);
        this.walkerGroup.rotation.set(0, bed.playerLookYaw, 0);
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.lookYaw;
        this.camera.rotation.x = this.lookPitch;
      } else {
        this.walkerGroup.position.copy(this.physics.walkerPos);
        this.walkerGroup.rotation.order = 'YXZ';
        this.walkerGroup.rotation.y = this.physics.walkerHeading;
        this.walkerGroup.rotation.x = 0;
        this.walkerGroup.rotation.z = 0;
        this.camera.position.set(0, 1.66 + this.physics.walkBob, 0);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = 0;
        this.camera.rotation.x = this.physics.walkerPitch;
      }
    } else if (this.isInRvCabin) {
      if (this.rvPose === 'lie') {
        const anchor = this.cockpit.getRvBedCameraAnchor();
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, anchor.pos.x, 8, delta);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, anchor.pos.y, 8, delta);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, anchor.pos.z, 8, delta);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rvLookYaw;
        this.camera.rotation.x = this.rvLookPitch;
      } else {
        const digitalTurn = (this.inputs.steerLeft ? 1 : 0) - (this.inputs.steerRight ? 1 : 0);
        const turnInput = THREE.MathUtils.clamp(digitalTurn + this.inputs.steerAxis, -1, 1);
        this.rvLookYaw += turnInput * 2.0 * delta;

        const moveInput = (this.inputs.throttle ? 1 : 0) - (this.inputs.brake ? 0.72 : 0);
        const stepSpeed = moveInput * 2.15;
        if (Math.abs(stepSpeed) > 0.01) {
          this.rvPlayerLocalPos.x -= Math.sin(this.rvLookYaw) * stepSpeed * delta;
          this.rvPlayerLocalPos.z -= Math.cos(this.rvLookYaw) * stepSpeed * delta;
          this.cockpit.clampRvPlayerPos(this.rvPlayerLocalPos);
          this.rvWalkBob = THREE.MathUtils.damp(
            this.rvWalkBob,
            Math.sin(elapsed * 8.6) * 0.025,
            14,
            delta,
          );
        } else {
          this.rvWalkBob = THREE.MathUtils.damp(this.rvWalkBob, 0, 10, delta);
        }

        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.rvPlayerLocalPos.x, 12, delta);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 1.66 + this.rvWalkBob, 12, delta);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.rvPlayerLocalPos.z, 12, delta);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rvLookYaw;
        this.camera.rotation.x = this.rvLookPitch;
      }
    } else {
      const shouldAutoCenter =
        !this.autopilotActive &&
        (throttleJustPressed ||
          (this.lookPointerId === null &&
            (throttleOrBoost || (speedDelta > 0.05 && Math.abs(this.physics.forwardSpeed) > 6))));

      if (shouldAutoCenter) {
        this.targetLookYaw = 0;
        this.targetLookPitch = 0;
      }

      const lookSpeed =
        throttleOrBoost && this.lookPointerId === null ? 8.2 : this.lookPointerId !== null ? 14 : 4.5;
      this.lookYaw = THREE.MathUtils.damp(this.lookYaw, this.targetLookYaw, lookSpeed, delta);
      this.lookPitch = THREE.MathUtils.damp(this.lookPitch, this.targetLookPitch, lookSpeed, delta);

      const camTargetY = this.cabinSeatsReclined ? 0.87 : 1.13;
      const camTargetZ = this.cabinSeatsReclined ? 0.28 : 0.08;
      this.camera.position.x = -0.42;
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camTargetY, 6, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camTargetZ, 6, delta);

      const basePitch = this.cabinSeatsReclined ? 0.14 : -0.025;
      const turnLook = this.physics.steerAngle * 0.075;
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.lookYaw + turnLook;
      this.camera.rotation.x = this.lookPitch + basePitch;
    }

    const companionPose: CompanionPose =
      insideInterior && this.interiorPose === 'lie'
        ? 'lie'
        : insideInterior && this.interiorPose === 'sit'
          ? 'sit'
          : 'walk';

    let companionDefending = false;
    if (
      this.hasCompanion &&
      isWalking &&
      !insideInterior &&
      !this.isInRvCabin &&
      !inSpaceView
    ) {
      const threat = this.rpgCombat.getNearestHostileThreat(
        this.physics.companionPos.x,
        this.physics.companionPos.z,
      );
      if (threat && threat.dist < 26) {
        companionDefending = true;
        const dxT = threat.x - this.physics.companionPos.x;
        const dzT = threat.z - this.physics.companionPos.z;
        const dT = Math.max(0.001, Math.hypot(dxT, dzT));
        const desiredH = Math.atan2(-dxT, -dzT);
        let hDiff = ((desiredH - this.physics.companionHeading + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (hDiff < -Math.PI) hDiff += Math.PI * 2;
        this.physics.companionHeading += hDiff * Math.min(1, delta * 10);

        if (dT > 1.75) {
          const rush = Math.min(dT - 1.65, 5.8 * delta);
          this.physics.companionPos.x += (dxT / dT) * rush;
          this.physics.companionPos.z += (dzT / dT) * rush;
          this.physics.companionMoveSpeed = 5.6;
        } else {
          this.physics.companionMoveSpeed = 0;
        }
        this.physics.companionPos.y = this.physics.activeFloorY;
        if (this.physics.walkClampRect) {
          const r = this.physics.walkClampRect;
          this.physics.companionPos.x = THREE.MathUtils.clamp(this.physics.companionPos.x, r.x - r.halfW, r.x + r.halfW);
          this.physics.companionPos.z = THREE.MathUtils.clamp(this.physics.companionPos.z, r.z - r.halfD, r.z + r.halfD);
        }

        if (dT <= 2.45 && this.companionAttackCooldown <= 0) {
          this.companionAttackCooldown = 0.72;
          const compStats = computeRpgStats(this.companionEquipped);
          const compDmg = Math.max(20, compStats.attackDmg);
          this.audio.playSaberSwing(true);
          this.rpgCombat.damageThreatAt(threat.x, threat.z, 2.6, compDmg, {
            onPlayerDamaged: () => {},
            onEnemyDefeated: this.handleEnemyDefeated,
            onPoliceCleared: () => {},
            onSaberPickupClaimed: () => {},
            onGopnikTaunt: () => {},
          });
        }
      }
    }

    this.walkerCompanion.setLightsaberColor(
      this.companionEquipped.weapon?.colorHex ?? '#38bdf8',
    );
    this.walkerCompanion.group.position.copy(this.physics.companionPos);
    this.walkerCompanion.group.rotation.y = this.physics.companionHeading;
    this.walkerCompanion.update(
      elapsed,
      delta,
      this.physics.companionMoveSpeed,
      isWalking && this.hasCompanion,
      companionPose,
      companionDefending,
    );

    const speedKmh = insideInterior ? 0 : Math.abs(this.physics.forwardSpeed) * 3.6;
    const targetFov = isWalking
      ? 68
      : inSpaceView
        ? 68 + THREE.MathUtils.clamp(speedKmh / 900, 0, 1) * 14
        : 63 + THREE.MathUtils.clamp(speedKmh / 280, 0, 1) * 12;
    const targetFar = inSpaceView || this.physics.spaceFactor > 0.05 ? 8000 : 2800;
    const fovDiff = Math.abs(this.camera.fov - targetFov);
    const farDiff = Math.abs(this.camera.far - targetFar);
    if (fovDiff > 0.05 || farDiff > 10) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, delta);
      this.camera.far = targetFar;
      this.camera.updateProjectionMatrix();
    }

    activePos = insideInterior
      ? this.savedOutdoorWalkPos
      : isWalking
        ? this.physics.walkerPos
        : refPos;

    const { nightFactor } = this.sky.update(
      this.timeOfDay,
      this.activeWeather,
      this.weatherBlend,
      activePos,
      inSpaceView ? 500 : activePos.y,
      this.physics.spaceFactor,
      delta,
      this.activeSeason,
    );

    const hangarHit =
      !insideInterior && !inSpaceView
        ? this.world.getHangarAt(activePos.x, activePos.y, activePos.z)
        : null;
    if (hangarHit) {
      if (this.lastHangarId !== hangarHit.id) {
        this.lastHangarId = hangarHit.id;
        this.quests.onHangarEntered(hangarHit.id, hangarHit.name);
      }
    } else {
      this.lastHangarId = null;
    }

    const gateHit =
      !insideInterior && !inSpaceView && !isWalking && this.physics.position.y > 45
        ? this.world.getSkyGateAt(activePos.x, activePos.y, activePos.z)
        : null;
    if (gateHit) {
      if (this.lastSkyGateId !== gateHit.id) {
        this.lastSkyGateId = gateHit.id;
        this.quests.onSkyGatePassed(gateHit.id, gateHit.name);
      }
    } else {
      this.lastSkyGateId = null;
    }

    const roadGateHit =
      !insideInterior && !inSpaceView && !isWalking && this.physics.position.y < 8
        ? this.world.getRoadGateAt(activePos.x, activePos.y, activePos.z)
        : null;
    if (roadGateHit) {
      if (this.lastRoadGateId !== roadGateHit.id) {
        this.lastRoadGateId = roadGateHit.id;
        this.physics.triggerBoost();
        this.quests.onRoadGatePassed(roadGateHit.id);
      }
    } else {
      this.lastRoadGateId = null;
    }

    const roadGlowMask =
      inSpaceView || insideInterior ? 0 : THREE.MathUtils.clamp(1 - this.physics.position.y / 25, 0, 1);
    const stormHeadlight =
      this.activeWeather === 'storm' || this.activeWeather === 'rain' || this.activeWeather === 'snow'
        ? 0.55
        : 0;
    this.headlight.intensity = Math.max(nightFactor, stormHeadlight) * 5.2 * roadGlowMask;
    this.headlight.visible = this.headlight.intensity > 0.03;

    const sinH = Math.sin(this.physics.heading);
    const cosH = Math.cos(this.physics.heading);
    if (isWalking) {
      _velVec.set(0, 0, 0);
    } else {
      _velVec.set(
        -sinH * this.physics.forwardSpeed,
        this.physics.verticalSpeed,
        -cosH * this.physics.forwardSpeed,
      );
    }
    this.camera.getWorldQuaternion(_worldQuat);

    const knockedPeds = this.world.update(
      insideInterior ? this.savedOutdoorWalkPos : isWalking ? this.physics.walkerPos : this.physics.position,
      isWalking ? this.physics.walkerHeading : this.physics.heading,
      _velVec,
      _worldQuat,
      nightFactor,
      this.sky.cloudTint,
      this.sky.horizonColor,
      this.activeWeather,
      this.physics.spaceFactor,
      delta,
      elapsed,
      insideInterior,
      isWalking,
      Boolean(hangarHit),
      this.physics.position,
      this.physics.heading,
    );
    if (knockedPeds > 0) {
      this.quests.onPedestrianHit(knockedPeds);
      this.physics.suspensionHeave = -0.09;
      this.rpgCombat.spawnLootPouch(
        this.physics.position.x + 2.4,
        this.physics.position.z + 1.8,
        rollLootDrop('pedestrian'),
        Math.round(10 + Math.random() * 14),
        0,
      );
      this.schedulePoliceDispatch();
    }

    if (insideInterior) {
      this.interior.animate(elapsed);
      const themeOpt = this.quests.getCabinThemeOptions().find((t) => t.id === this.quests.cabinTheme);
      this.interior.updateAtmosphere(
        this.interiorMode,
        this.sky.horizonColor,
        nightFactor,
        themeOpt ? themeOpt.hex : '#f59e0b',
        this.sleepFade,
      );
    }

    const activePlanetCfg = getPlanetConfig(this.physics.activePlanetId);
    const orbitLandingSites: LandingSite[] = inOrbitMode
      ? getPlanetLandingSites(activePlanetCfg.id)
      : [];

    this.activeSpacePlanets = getActiveSpacePlanets(this.physics.spacePos, 24);
    this.space.update(
      this.physics.spaceFactor,
      activePos,
      this.activeSpacePlanets,
      delta,
      inOrbitMode,
      activePlanetCfg,
      orbitLandingSites,
      this.physics.selectedLandingSiteId,
      this.timeOfDay,
    );

    if (inSpace) {
      this.computeNearestPlanet();
    } else {
      this.nearestPlanet = activePlanetCfg;
      this.nearestPlanetDist = 0;
    }

    const inOrbit = inOrbitMode || (inSpace && this.nearestPlanetDist <= this.nearestPlanet.orbitRange);
    const canEnterPlanet = inSpace && this.nearestPlanetDist <= this.nearestPlanet.orbitRange * 1.35;
    const canLaunchToOrbit =
      !insideInterior &&
      !isWalking &&
      (this.physics.flightState === 'flight' || this.physics.flightState === 'ascending');
    const canLaunchToSpace = !insideInterior && !isWalking && inOrbitMode;
    const speedKmhHover = insideInterior ? 0 : Math.abs(this.physics.forwardSpeed) * 3.6;
    const hoverClubUnder =
      !insideInterior && !isWalking && !inSpaceView && this.physics.flightState === 'flight'
        ? this.world.getRooftopClubUnder(
            this.physics.position.x,
            this.physics.position.z,
            this.physics.position.y,
            4.5,
          )
        : null;
    const canHoverExitOnRooftop = Boolean(hoverClubUnder && speedKmhHover < 16);
    const canExitVehicle =
      !insideInterior &&
      !isWalking &&
      !inSpaceView &&
      (this.physics.flightState === 'road' || canHoverExitOnRooftop);

    // Roadside car window conversation (ONLY on road when stationary, in front cab, and windows NOT tinted)
    const canRoadsideTalk =
      !insideInterior &&
      !isWalking &&
      !this.isInRvCabin &&
      !inSpaceView &&
      this.physics.flightState === 'road' &&
      speedKmhHover < 3.0 &&
      !this.cabinTintDark &&
      !this.rvWindowTinted &&
      !this.rpgCombat.policeWanted &&
      this.world.isInCityAt(this.physics.position.x, this.physics.position.z);

    if (!canRoadsideTalk) {
      this.roadsideChat = null;
      this.rpgCombat.setRoadsideNpc(false);
    } else {
      const cosC = Math.cos(this.physics.heading);
      const sinC = Math.sin(this.physics.heading);
      const winX = this.physics.position.x - cosC * 1.65;
      const winZ = this.physics.position.z + sinC * 1.65;
      if (!this.roadsideChat) {
        this.roadsideCooldown -= delta;
        if (this.roadsideCooldown <= 0) {
          this.roadsideCooldown = 28 + Math.random() * 14;
          const prompts: Omit<RoadsideChatState, 'repliedText'>[] = [
            {
              npcName: 'Прохожий Артём',
              prompt: '«Привет! Ого, какой крутой автодом! Подскажите, вы далеко направляетесь?»',
              options: [
                { id: 'space', label: 'На орбиту и другие планеты!', reply: '«Круто! Передавайте привет звёздам и удачной дороги!»' },
                { id: 'coffee', label: 'Просто катаемся по городу', reply: '«Правильный настрой! Загляните на крышу клуба с бассейном!»' },
              ],
            },
            {
              npcName: 'Горожанка Лера',
              prompt: '«Извините, а внутри сзади правда полноценный мини-дом с душем и кроватью?»',
              options: [
                { id: 'yes', label: 'Да, и даже панорамный люк!', reply: '«Фантастика! Настоящая квартира с крыльями!»' },
                { id: 'wave', label: 'Хотите пожелать хорошего пути?', reply: '«Счастливого пути вам обоим! Берегите друг друга!»' },
              ],
            },
            {
              npcName: 'Механик Кирилл',
              prompt: `«На ${activePlanetCfg.name} сегодня атмосферно! Проверить давление репульсоров?»`,
              options: [
                { id: 'ok', label: 'Всё в норме, спасибо!', reply: '«Тогда счастливого полёта, кэп!»' },
                { id: 'club', label: 'Где тут можно отдохнуть?', reply: '«Зависни над плоской крышей высотки — там клубы с бассейнами!»' },
              ],
            },
          ];
          const picked = prompts[Math.floor(Math.random() * prompts.length)];
          this.roadsideChat = { ...picked, repliedText: null };
        }
      }
      if (this.roadsideChat) {
        this.rpgCombat.setRoadsideNpc(true, winX, 0, winZ, this.physics.heading + Math.PI / 2, 0, elapsed);
      } else {
        this.rpgCombat.setRoadsideNpc(false);
      }
    }

    const zoneType = this.world.getZoneTypeAt(activePos.x, activePos.z);
    this.quests.update(
      delta,
      this.physics.activePlanetId,
      activePos,
      this.physics.spacePos,
      this.physics.flightState,
      isWalking && !insideInterior,
      isWalking && !insideInterior ? this.physics.forwardSpeed : 0,
      zoneType,
      this.world.getLandmarks(),
      this.timeOfDay,
    );

    if (!insideInterior && !inSpaceView && isWalking && this.physics.activeFloorY > 5) {
      const clubNow = this.world.getRooftopClubUnder(
        this.physics.walkerPos.x,
        this.physics.walkerPos.z,
        this.physics.walkerPos.y,
        6,
      );
      if (clubNow) {
        this.quests.onRooftopClubVisited(clubNow.name);
      }
    }

    const completedSpecial = this.quests.consumeLastCompletedSpecialQuest();
    if (completedSpecial) {
      const rewardItem = createMythicOrangeLoot();
      const dest = this.addLootItemToBag(rewardItem);
      this.audio.playLootDrop(true);
      this.quests.showToast(
        `Особая награда (${dest === 'companion' ? 'спутнице' : 'вам'}): ${rewardItem.name} [Редкий оранжевый]!`,
        4.6,
      );
      this.saveGame(false);
    }

    const driverLookingAtCompanion = !isWalking && !this.isInRvCabin && this.lookYaw < -0.36;

    // Companion inside RV mini-home autonomy
    const showRvCompanion = this.hasCompanion && !isWalking && !insideInterior && this.companionLocation === 'rv';
    if (showRvCompanion) {
      const rvWaypoints: { x: number; z: number; heading: number; pose: CompanionPose; label: string }[] = [
        { x: -0.18, z: 1.42, heading: Math.PI / 2, pose: 'walk', label: 'Готовит кофе в мини-доме' },
        { x: 0.34, z: 1.52, heading: -Math.PI / 2, pose: 'sit', label: 'Смотрит телевизор' },
        { x: 0.25, z: 2.55, heading: -Math.PI / 2, pose: 'walk', label: 'Любуется видом из окна' },
        { x: 0.42, z: 3.65, heading: 0, pose: 'sit', label: 'Отдыхает на кровати' },
      ];
      const wp = rvWaypoints[this.rvCompTargetIdx % rvWaypoints.length];
      const dx = wp.x - this.rvCompLocalPos.x;
      const dz = wp.z - this.rvCompLocalPos.z;
      const dist = Math.hypot(dx, dz);
      let rvCompSpeed = 0;
      let rvCompPose: CompanionPose = 'walk';
      if (dist > 0.08) {
        const moveDist = Math.min(dist, 0.85 * delta);
        this.rvCompLocalPos.x += (dx / dist) * moveDist;
        this.rvCompLocalPos.z += (dz / dist) * moveDist;
        const desiredH = Math.atan2(-dx, -dz);
        let diff = ((desiredH - this.rvCompHeading + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        this.rvCompHeading += diff * Math.min(1, delta * 6);
        rvCompSpeed = 1.6;
        this.rvCompActivity = 'Идёт по мини-дому';
      } else {
        let diff = ((wp.heading - this.rvCompHeading + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        this.rvCompHeading += diff * Math.min(1, delta * 4.5);
        rvCompPose = wp.pose;
        this.rvCompActivity = wp.label;
        this.rvCompPauseTimer -= delta;
        if (this.rvCompPauseTimer <= 0) {
          this.rvCompTargetIdx = (this.rvCompTargetIdx + 1) % rvWaypoints.length;
          this.rvCompPauseTimer = 4.5 + (this.rvCompTargetIdx % 3) * 1.6;
        }
      }
      this.cockpit.rvCompanion.group.position.copy(this.rvCompLocalPos);
      this.cockpit.rvCompanion.group.rotation.y = this.rvCompHeading;
      this.cockpit.rvCompanion.update(elapsed, delta, rvCompSpeed, true, rvCompPose);
    } else {
      this.cockpit.rvCompanion.update(elapsed, delta, 0, false, 'walk');
    }

    if (!insideInterior) {
      this.cockpit.update(
        this.physics.steerAngle,
        isWalking ? 0 : speedKmh,
        this.physics.position.y,
        this.physics.flightState,
        this.physics.roll,
        this.physics.pitch,
        this.activeWeather,
        elapsed,
        delta,
        inSpaceView,
        inOrbit,
        inSpace ? this.nearestPlanet.name : activePlanetCfg.name,
        this.physics.spaceFactor,
        this.sky.horizonColor,
        this.hasCompanion && !isWalking && this.companionLocation === 'cab',
        driverLookingAtCompanion,
        this.quests.cabinTheme,
        boostActive,
        Boolean(hangarHit),
        {
          cabinTintDark: this.cabinTintDark,
          cabinRoofLight: this.cabinRoofLight,
          cabinSeatsReclined: this.cabinSeatsReclined,
          cabinMonitorOpen: this.cabinMonitorOpen,
          leftWindowOpen: this.leftWindowOpen,
          rightWindowOpen: this.rightWindowOpen,
          rvLightsOn: this.rvLightsOn,
          rvTvOn: this.rvTvOn,
          rvShowerOn: this.rvShowerOn,
          rvCoffeeBrewed: this.rvCoffeeBrewed,
          rvWindowTinted: this.rvWindowTinted,
          rvFridgeOpen: this.rvFridgeOpen,
          rvSunroofOpen: this.rvSunroofOpen,
          isInRvCabin: this.isInRvCabin,
          rvPassengerActive: Boolean(pQuest && pQuest.phase === 'in_rv'),
        },
      );
    }

    this.audioInput.mode = this.isInRvCabin
      ? 'rv'
      : inSpace
        ? 'space'
        : inOrbitMode
          ? 'orbit'
          : this.physics.flightState !== 'road'
            ? 'flight'
            : 'road';
    this.audioInput.flightState = this.physics.flightState;
    this.audioInput.speedKmh = speedKmh;
    this.audioInput.altitudeM = inSpaceView ? 12000 : Math.max(0, this.physics.position.y);
    this.audioInput.zoneType = zoneType;
    this.audioInput.weather = this.activeWeather;
    this.audioInput.weatherBlend = this.weatherBlend;
    this.audioInput.isWalking = isWalking;
    this.audioInput.interiorMode = this.interiorMode;
    this.audioInput.inRvCabin = this.isInRvCabin;
    this.audioInput.windowOpen = this.leftWindowOpen || this.rightWindowOpen;
    this.audioInput.engineRunning = this.engineRunning;
    this.audioInput.boostActive = boostActive;
    this.audioInput.insideHangar = Boolean(hangarHit);
    this.audioInput.planetBiome = activePlanetCfg.biome;
    this.audioInput.delta = delta;
    this.audioInput.elapsed = elapsed;
    this.audio.update(this.audioInput);

    this.renderer.render(this.scene, this.camera);

    if (elapsed - this.lastUiEmit >= 0.065) {
      this.lastUiEmit = elapsed;
      const activeHeading = isWalking ? this.physics.walkerHeading : this.physics.heading;
      const deg = (((-activeHeading * 180) / Math.PI) % 360 + 360) % 360;
      const distToCarM =
        isWalking && !insideInterior
          ? Math.round(this.physics.walkerPos.distanceTo(this.physics.position))
          : 0;

      const nearestCafe =
        !insideInterior && !inSpaceView && this.physics.position.y < 8
          ? this.world.getNearestCafe(activePos.x, activePos.z)
          : null;
      const nearbyCafeName =
        nearestCafe && nearestCafe.distance <= 32 && (isWalking || speedKmh < 32)
          ? nearestCafe.landmark.name
          : null;

      const nearestHotel =
        !insideInterior && !inSpaceView && this.physics.position.y < 8
          ? this.world.getNearestHotel(activePos.x, activePos.z)
          : null;
      const nearbyHotelName =
        nearestHotel && nearestHotel.distance <= 36 && (isWalking || speedKmh < 32)
          ? nearestHotel.landmark.name
          : null;

      const nearestObs =
        !insideInterior && !inSpaceView && this.physics.position.y < 8
          ? this.world.getNearestObservatory(activePos.x, activePos.z)
          : null;
      const nearbyObservatoryName =
        nearestObs && nearestObs.distance <= 32 && (isWalking || speedKmh < 32)
          ? nearestObs.landmark.name
          : null;

      const nearestSpecial =
        !insideInterior && !inSpaceView && this.physics.position.y < 8
          ? this.world.getNearestSpecialSpot(activePos.x, activePos.z)
          : null;
      const nearbySpecialSpot: SpecialSpotInfo | null =
        nearestSpecial && nearestSpecial.distance <= 34 && (isWalking || speedKmh < 34)
          ? nearestSpecial.spot
          : null;

      const nearestSerbos =
        !insideInterior && !inSpaceView && this.physics.position.y < 8
          ? this.world.getNearestSerbosHouse(activePos.x, activePos.z)
          : null;
      const nearbySerbosName =
        nearestSerbos && nearestSerbos.distance <= 34 && (isWalking || speedKmh < 34)
          ? nearestSerbos.name
          : null;

      const lookingAtDoorSide = this.getLookingAtDoorSide();
      const canEnterRvCabin =
        !insideInterior &&
        !isWalking &&
        !this.isInRvCabin &&
        (this.physics.flightState === 'road' ||
          this.physics.flightState === 'ascending' ||
          this.physics.flightState === 'flight' ||
          this.physics.flightState === 'orbit' ||
          this.physics.flightState === 'space');
      const canToggleAutopilot = !insideInterior && !isWalking;
      const canOpenWindow =
        !insideInterior &&
        !isWalking &&
        !this.isInRvCabin &&
        !inSpaceView &&
        this.physics.spaceFactor <= 0.25 &&
        lookingAtDoorSide !== null;

      const rvNearbyStation: RvStationKind | null =
        this.isInRvCabin && !insideInterior && !isWalking
          ? this.cockpit.getNearestRvStation(this.rvPlayerLocalPos)
          : null;

      const canSitNearby =
        insideInterior &&
        this.interiorPose === 'stand' &&
        Boolean(
          this.interior.getNearestSeat(
            this.interiorMode,
            this.physics.walkerPos.x,
            this.physics.walkerPos.z,
          ),
        );

      const canLieNearby =
        this.interiorMode === 'hotel' &&
        this.interiorPose === 'stand' &&
        this.interior.isNearBed('hotel', this.physics.walkerPos.x, this.physics.walkerPos.z);

      const canExitInterior =
        insideInterior &&
        this.interiorPose === 'stand' &&
        this.interior.isNearExitDoor(
          this.interiorMode,
          this.physics.walkerPos.x,
          this.physics.walkerPos.z,
        );

      this.camera.getWorldDirection(_camForward);
      const questSnaps = this.quests.getSnapshots(
        activePos,
        this.camera,
        _camForward,
        _projVec,
        _toTarget,
        inSpaceView || insideInterior,
      );

      // Project orbital landing sites to screen space for the orbital HUD overlay
      const projectedLandingSites: LandingSite[] = inOrbitMode
        ? orbitLandingSites.map((s) => {
            getLandingSiteSpaceWorldPos(activePlanetCfg, s, _beaconWorldPos);
            _toTarget.subVectors(_beaconWorldPos, this.physics.spacePos);
            const inFront = _toTarget.dot(_camForward) > 0;
            _projVec.copy(_beaconWorldPos).project(this.camera);
            const sx = THREE.MathUtils.clamp(inFront ? _projVec.x : -_projVec.x, -0.88, 0.88);
            const sy = THREE.MathUtils.clamp(inFront ? _projVec.y : -_projVec.y, -0.78, 0.78);
            return {
              ...s,
              screenX: sx,
              screenY: sy,
              inFront,
            };
          })
        : [];

      const saveMeta: SaveMetaSnapshot = {
        hasSave: this.lastSavedAt !== null,
        savedAtLabel: this.lastSavedAt !== null ? formatSaveTimeLabel(this.lastSavedAt) : null,
        planetName: this.lastSavedPlanetName,
      };

      const walkClub =
        !insideInterior && !inSpaceView && isWalking && this.physics.activeFloorY > 5
          ? this.world.getRooftopClubUnder(
              this.physics.walkerPos.x,
              this.physics.walkerPos.z,
              this.physics.walkerPos.y,
              6,
            )
          : null;
      const nearbyRooftopClubName = walkClub?.name ?? hoverClubUnder?.name ?? null;
      const isOnRooftopClub = Boolean(walkClub);

      let passengerQuestSnap: PassengerQuestState | null = null;
      if (pQuest && !insideInterior && !inSpaceView) {
        const refP = isWalking ? this.physics.walkerPos : this.physics.position;
        if (pQuest.phase === 'to_pickup') {
          const distM =
            pQuest.pickupPlanet === this.physics.activePlanetId
              ? Math.round(Math.hypot(refP.x - pQuest.pickupX, refP.z - pQuest.pickupZ))
              : 9999;
          passengerQuestSnap = {
            questId: pQuest.questId,
            passengerName: pQuest.passengerName,
            phase: 'to_pickup',
            dropoffName: pQuest.dropoffName,
            distanceM: distM,
            canInteract:
              pQuest.pickupPlanet === this.physics.activePlanetId &&
              distM <= 16 &&
              speedKmh < 15,
          };
        } else {
          const distM =
            pQuest.dropoffPlanet === this.physics.activePlanetId
              ? Math.round(Math.hypot(refP.x - pQuest.dropoffX, refP.z - pQuest.dropoffZ))
              : 9999;
          passengerQuestSnap = {
            questId: pQuest.questId,
            passengerName: pQuest.passengerName,
            phase: 'in_rv',
            dropoffName: pQuest.dropoffName,
            distanceM: distM,
            canInteract:
              pQuest.dropoffPlanet === this.physics.activePlanetId &&
              distM <= 20 &&
              speedKmh < 15,
          };
        }
      }

      this.onSnapshot({
        speedKmh: Math.round(speedKmh),
        altitudeM: inSpaceView ? 12000 : Math.max(0, Math.round(this.physics.position.y)),
        flightState: this.physics.flightState,
        isFlying:
          this.physics.flightState === 'ascending' ||
          this.physics.flightState === 'flight' ||
          this.physics.flightState === 'launching_orbit' ||
          this.physics.flightState === 'launching' ||
          this.physics.flightState === 'entering',
        inSpace,
        inOrbit,
        inOrbitMode,
        canLaunchToOrbit,
        canLaunchToSpace,
        canEnterPlanet,
        planetId: activePlanetCfg.id,
        biomeId: activePlanetCfg.biome,
        planetName: activePlanetCfg.name,
        nearestPlanetId: this.nearestPlanet.id,
        nearestPlanetName: this.nearestPlanet.name,
        nearestPlanetDistKm: Math.max(
          0,
          Math.round((this.nearestPlanetDist - this.nearestPlanet.radius) * 0.12),
        ),
        planetMarkers: this.computePlanetMarkers(),
        landingSites: projectedLandingSites,
        selectedLandingSiteId: this.physics.selectedLandingSiteId,
        timeOfDay: this.timeOfDay,
        timeLabel: getTimeLabel(this.timeOfDay),
        activeWeather: this.activeWeather,
        season: this.activeSeason,
        seasonLabel: SEASON_LABELS[this.activeSeason],
        zoneName: inOrbitMode
          ? `Орбита · ${activePlanetCfg.name}`
          : inSpace
            ? inOrbit
              ? `Сближение · ${this.nearestPlanet.name}`
              : 'Бесконечный космос'
            : insideInterior
              ? `${activePlanetCfg.name} · ${this.interiorLabel ?? 'Интерьер'}`
              : isOnRooftopClub && walkClub
                ? `${activePlanetCfg.name} · ${walkClub.name}`
                : this.isInRvCabin
                  ? `${activePlanetCfg.name} · Мини-дом на колёсах`
                  : isWalking
                    ? `${activePlanetCfg.name} · Пешая прогулка`
                    : this.world.getZoneLabel(this.physics.position),
        headingDeg: Math.round(deg),
        isWalking,
        canExitVehicle,
        distanceToCarM: distToCarM,
        hasCompanion: this.hasCompanion,
        boostRemainingSec: Number(this.physics.boostTimer.toFixed(1)),
        credits: this.quests.credits,
        activeQuest: questSnaps.active,
        availableQuests: questSnaps.available,
        nearbyCafeName,
        nearbyHotelName,
        nearbyObservatoryName,
        nearbySerbosName,
        nearbySpecialSpot,
        nearbyRooftopClubName,
        isOnRooftopClub,
        canHoverExitOnRooftop,
        insideHangarName: hangarHit ? hangarHit.name : null,
        interiorMode: this.interiorMode,
        interiorPose: this.interiorPose,
        interiorLabel: this.interiorLabel,
        canSitNearby,
        canLieNearby,
        canExitInterior,
        serbosCoffeeServed: this.serbosCoffeeServed,
        serbosDialogLine: this.serbosDialogLine,
        holdHands: this.quests.holdHands && this.hasCompanion,
        sleepFade: this.sleepFade,
        companionNote: this.quests.getCompanionNote(),
        cabinTheme: this.quests.cabinTheme,
        cabinThemes: this.quests.getCabinThemeOptions(),
        vehicleId: this.physics.vehicleId,
        vehicleName: this.quests.getCurrentVehicleName(),
        canEnterRvCabin,
        isInRvCabin: this.isInRvCabin,
        rvPose: this.rvPose,
        rvNearbyStation,
        rvLightsOn: this.rvLightsOn,
        rvTvOn: this.rvTvOn,
        rvShowerOn: this.rvShowerOn,
        rvCoffeeBrewed: this.rvCoffeeBrewed,
        rvWindowTinted: this.rvWindowTinted,
        rvFridgeOpen: this.rvFridgeOpen,
        rvSunroofOpen: this.rvSunroofOpen,
        companionLocation: this.companionLocation,
        companionRvActivity: this.companionLocation === 'rv' ? this.rvCompActivity : null,
        pedestriansHitCount: this.quests.pedestriansHitCount,
        autopilotActive: this.autopilotActive,
        canToggleAutopilot,
        autopilotStatusText: this.autopilotStatusText,
        cabinTempC: 22,
        cabinTintDark: this.cabinTintDark,
        cabinRoofLight: this.cabinRoofLight,
        cabinSeatsReclined: this.cabinSeatsReclined,
        cabinMonitorOpen: this.cabinMonitorOpen,
        cabinAudioOn: this.audio.isEnabled(),
        engineRunning: this.engineRunning,
        audioSettings: this.audioSettings,
        graphicsQuality: this.graphicsQuality,
        gameplaySettings: this.gameplaySettings,
        lookingAtDoorSide,
        leftWindowOpen: this.leftWindowOpen,
        rightWindowOpen: this.rightWindowOpen,
        canOpenWindow,
        roadsideChat: this.roadsideChat,
        passengerQuest: passengerQuestSnap,
        toastMessage: this.quests.getToast(),
        saveMeta,
        rpg: {
          hp: Math.round(this.rpgHp),
          maxHp: playerStats.maxHp,
          walkStreakSec: Math.round(this.walkStreakSec),
          playerInventory: this.playerInventory,
          companionInventory: this.companionInventory,
          playerEquipped: this.playerEquipped,
          companionEquipped: this.companionEquipped,
          playerStats,
          companionStats: computeRpgStats(this.companionEquipped),
          weaponHolstered: this.weaponHolstered,
          gopniksActive: this.rpgCombat.getGopniksActiveCount(),
          rallyActiveCount: this.rpgCombat.getRallyActiveCount(),
          rallyTotalCount: this.rpgCombat.rallyTotalCount,
          policeWanted: this.rpgCombat.policeWanted,
          policeOfficersAlive: this.rpgCombat.getPoliceAliveCount(),
          policeEscapeProgress: this.rpgCombat.getPoliceEscapeProgress(),
          policeDispatchSec: Math.ceil(this.policeDispatchTimer),
          bountyBossActive: this.rpgCombat.isBountyBossAlive(),
          bountyBossHp: this.rpgCombat.getBountyBossHp().hp,
          bountyBossMaxHp: this.rpgCombat.getBountyBossHp().maxHp,
          planetMonsterActive: this.rpgCombat.isPlanetMonsterAlive(),
          planetMonsterHp: this.rpgCombat.getPlanetMonsterHp().hp,
          planetMonsterMaxHp: this.rpgCombat.getPlanetMonsterHp().maxHp,
          planetMonsterAlert: this.rpgCombat.isPlanetMonsterAlive()
            ? '⚠️ На планете замечен гигантский монстр!'
            : null,
          activeThreatLabel: this.rpgCombat.getActiveThreatLabel(),
          nearbySaberName: this.rpgCombat.getNearbySaberName(),
        },
      });
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  private pickAutopilotSite(
    sites: LandingSite[],
    preferredSiteId?: string,
    tx?: number,
    tz?: number,
  ): LandingSite | null {
    if (sites.length === 0) return null;
    if (preferredSiteId) {
      const exact = sites.find((s) => s.id === preferredSiteId);
      if (exact) return exact;
    }
    if (tx !== undefined && tz !== undefined) {
      let best = sites[0];
      let bestDist = Infinity;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        const sx = s.approachX ?? s.x;
        const sz = s.approachZ ?? s.z;
        const d = Math.hypot(sx - tx, sz - tz);
        if (d < bestDist) {
          bestDist = d;
          best = s;
        }
      }
      return best;
    }
    return sites[0];
  }

  private runRoadCruiseFallback(): void {
    const pos = this.physics.position;
    const cx = Math.round(pos.x / 320);
    const cz = Math.round(pos.z / 320);
    const centerDist = Math.hypot(pos.x - cx * 320, pos.z - cz * 320);
    const arms = getChunkRoadArms(cx, cz, this.world.getWorldSeed());
    const dirs = [
      { idx: 0, ok: arms.n, fx: 0, fz: -1, heading: 0 },
      { idx: 1, ok: arms.e, fx: 1, fz: 0, heading: -Math.PI / 2 },
      { idx: 2, ok: arms.s, fx: 0, fz: 1, heading: Math.PI },
      { idx: 3, ok: arms.w, fx: -1, fz: 0, heading: Math.PI / 2 },
    ];
    const interKey = `${cx},${cz}`;
    if (centerDist < 22 && this.autopilotLastIntersectionKey !== interKey) {
      this.autopilotLastIntersectionKey = interKey;
      const opposite = (this.autopilotDirIndex + 2) % 4;
      const forwardOk = dirs[this.autopilotDirIndex].ok;
      const turns = dirs.filter(
        (d) => d.ok && d.idx !== opposite && d.idx !== this.autopilotDirIndex,
      );
      if (!forwardOk || (turns.length > 0 && Math.abs(cx * 7 + cz * 13) % 5 === 0)) {
        const pick =
          turns[Math.abs(cx + cz) % Math.max(1, turns.length)] ??
          dirs.find((d) => d.ok) ??
          dirs[0];
        this.autopilotDirIndex = pick.idx;
      }
    } else if (centerDist > 42) {
      this.autopilotLastIntersectionKey = '';
    }

    const activeDir = dirs[this.autopilotDirIndex];
    const rx = -activeDir.fz;
    const rz = activeDir.fx;
    const laneRefX = cx * 320 + rx * 8.5;
    const laneRefZ = cz * 320 + rz * 8.5;
    const crossTrackErr = (pos.x - laneRefX) * rx + (pos.z - laneRefZ) * rz;
    const desiredHeading =
      activeDir.heading + THREE.MathUtils.clamp(crossTrackErr * 0.085, -0.45, 0.45);
    let headingErr = desiredHeading - this.physics.heading;
    while (headingErr > Math.PI) headingErr -= Math.PI * 2;
    while (headingErr < -Math.PI) headingErr += Math.PI * 2;

    const speedNowKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    this.autopilotInputs.throttle = speedNowKmh < 64;
    this.autopilotInputs.brake = speedNowKmh > 74;
    this.autopilotInputs.steerAxis = THREE.MathUtils.clamp(headingErr * 2.1, -1, 1);
    this.autopilotStatusText = 'Автопилот · Круиз по проспекту';
  }

  private updateAutopilot(
    delta: number,
    activeCfg: PlanetConfig,
    walkObstacles: BuildingFootprint[],
  ): void {
    const inp = this.autopilotInputs;
    inp.throttle = false;
    inp.brake = false;
    inp.steerLeft = false;
    inp.steerRight = false;
    inp.steerAxis = 0;
    inp.climb = false;
    inp.descend = false;
    inp.boost = false;

    const fs = this.physics.flightState;
    const curQId = this.quests.getActiveQuestId();
    if (this.autopilotQuestId && curQId !== this.autopilotQuestId) {
      this.autopilotArrivingStop = true;
    }

    if (this.autopilotArrivingStop) {
      this.autopilotStatusText = 'Прибыли к метке · Остановка';
      if (fs === 'space') {
        if (Math.abs(this.physics.spaceSpeed) > 3) {
          inp.brake = this.physics.spaceSpeed > 0;
          inp.throttle = this.physics.spaceSpeed < 0;
        } else {
          this.physics.spaceSpeed = 0;
          this.physics.forwardSpeed = 0;
          this.autopilotActive = false;
          this.autopilotArrivingStop = false;
          this.autopilotStatusText = null;
          this.audio.playChime('arrived');
          this.quests.showToast('Автопилот: прибыли к точке назначения', 3.2);
        }
        return;
      }
      if (fs === 'flight' || fs === 'ascending') {
        if (this.physics.forwardSpeed > 2.2) {
          inp.brake = true;
        } else {
          this.physics.forwardSpeed = 0;
          this.autopilotActive = false;
          this.autopilotArrivingStop = false;
          this.autopilotStatusText = null;
          this.audio.playChime('arrived');
          this.quests.showToast('Автопилот: прибыли к точке и зависли', 3.4);
        }
        return;
      }
      if (fs === 'road') {
        if (this.physics.forwardSpeed > 0.45) {
          inp.brake = true;
        } else {
          this.physics.forwardSpeed = 0;
          this.autopilotActive = false;
          this.autopilotArrivingStop = false;
          this.autopilotStatusText = null;
          this.audio.playChime('arrived');
          this.quests.showToast('Автопилот: прибыли к метке квеста и остановились', 3.6);
        }
      }
      return;
    }

    const pos = this.physics.position;
    const guidance = this.quests.getActiveQuestGuidance(
      this.physics.activePlanetId,
      pos,
      this.world.getLandmarks(),
    );
    if (!guidance) {
      if (fs === 'road') {
        this.runRoadCruiseFallback();
      } else {
        this.autopilotStatusText = 'Автопилот · Стабилизация курса';
      }
      return;
    }

    let tx = guidance.targetX;
    let tz = guidance.targetZ;
    let targetLabel = guidance.targetName;

    if (guidance.kind === 'road_rings') {
      const gates = this.world.getRoadGates();
      let bestDist = Infinity;
      for (let i = 0; i < gates.length; i++) {
        const g = gates[i];
        if (this.quests.hasPassedRoadGate(g.id)) continue;
        const d = Math.hypot(g.x - pos.x, g.z - pos.z);
        if (d < bestDist) {
          bestDist = d;
          tx = g.x;
          tz = g.z;
          targetLabel = 'Энерго-врата трассы';
        }
      }
    } else if (guidance.kind === 'countryside') {
      const fc = this.world.getNearestFieldCenter(pos.x, pos.z);
      if (fc) {
        tx = fc.x;
        tz = fc.z;
        targetLabel = 'Поля и луга';
      }
    } else if (guidance.kind === 'city_walk' && tx === undefined) {
      const cafe = this.world.getNearestCafe(pos.x, pos.z);
      if (cafe) {
        tx = cafe.landmark.x;
        tz = cafe.landmark.z;
        targetLabel = cafe.landmark.name;
      }
    }

    const needPlanetId = guidance.targetPlanet ?? this.physics.activePlanetId;
    const onTargetPlanet = this.physics.activePlanetId === needPlanetId;
    const targetPlanetCfg = getPlanetConfig(needPlanetId);

    // Phase 1: Interplanetary Transfer (need another planet or currently in deep space / orbit)
    if (!onTargetPlanet || fs === 'space' || fs === 'orbit' || fs === 'launching' || fs === 'launching_orbit') {
      if (!onTargetPlanet) {
        if (fs === 'road' || fs === 'descending') {
          this.autopilotStatusText = `Взлёт к ${targetPlanetCfg.name}`;
          if (this.physics.forwardSpeed < 18) {
            inp.throttle = true;
          } else {
            this.physics.toggleFlight();
          }
          return;
        }
        if (fs === 'ascending' || fs === 'flight') {
          this.autopilotStatusText = `Подъём в космос · курс ${targetPlanetCfg.name}`;
          inp.throttle = true;
          inp.boost = true;
          if (pos.y >= 72) {
            this.physics.launchToSpace();
          }
          return;
        }
        if (fs === 'orbit') {
          this.autopilotStatusText = `Отстыковка от ${activeCfg.name}…`;
          this.physics.launchFromOrbitToSpace();
          return;
        }
        if (fs === 'launching' || fs === 'launching_orbit' || fs === 'entering') {
          this.autopilotStatusText = `Выход на гипертрассу к ${targetPlanetCfg.name}…`;
          inp.throttle = true;
          inp.boost = true;
          return;
        }
      }

      if (fs === 'space') {
        _apSpaceVec.subVectors(targetPlanetCfg.spacePos, this.physics.spacePos);
        const distToPlanet = _apSpaceVec.length();
        const horiz = Math.max(0.001, Math.hypot(_apSpaceVec.x, _apSpaceVec.z));
        const desiredHeading = Math.atan2(-_apSpaceVec.x, -_apSpaceVec.z);
        const desiredPitch = THREE.MathUtils.clamp(
          Math.atan2(_apSpaceVec.y, horiz),
          -1.0,
          1.0,
        );
        let headingErr = desiredHeading - this.physics.heading;
        while (headingErr > Math.PI) headingErr -= Math.PI * 2;
        while (headingErr < -Math.PI) headingErr += Math.PI * 2;
        const pitchErr = desiredPitch - this.physics.spacePitch;

        inp.steerAxis = THREE.MathUtils.clamp(headingErr * 2.35, -1, 1);
        inp.climb = pitchErr > 0.04;
        inp.descend = pitchErr < -0.04;

        const aligned = Math.abs(headingErr) < 0.72 && Math.abs(pitchErr) < 0.72;
        if (aligned || this.physics.spaceSpeed < 10) {
          inp.throttle = true;
          inp.boost = aligned && distToPlanet > targetPlanetCfg.orbitRange * 2.1;
        }

        const kmLeft = Math.max(0, Math.round((distToPlanet - targetPlanetCfg.radius) * 0.12));
        this.autopilotStatusText = `Перелёт к ${targetPlanetCfg.name} · ${kmLeft} км`;

        if (distToPlanet <= targetPlanetCfg.orbitRange * 1.25) {
          const sites = getPlanetLandingSites(targetPlanetCfg.id);
          const bestSite = this.pickAutopilotSite(sites, guidance.preferredSiteId, tx, tz);
          this.physics.enterPlanetOrbit(targetPlanetCfg, bestSite?.id ?? null);
          this.quests.onOrbitEntered();
          this.quests.showToast(`Орбита · ${targetPlanetCfg.name} — автопосадка`, 3.0);
        }
        return;
      }

      if (fs === 'orbit') {
        const sites = getPlanetLandingSites(activeCfg.id);
        const site = this.pickAutopilotSite(sites, guidance.preferredSiteId, tx, tz);
        if (site) {
          const spawnX = site.approachX ?? site.x;
          const spawnZ = site.approachZ ?? site.z;
          const lookX = site.lookAtX ?? site.x;
          const lookZ = site.lookAtZ ?? site.z;
          this.physics.selectedLandingSiteId = site.id;
          this.physics.descendToSite(spawnX, spawnZ, lookX, lookZ);
          this.quests.onOrbitLandingCompleted(this.physics.activePlanetId, site.name);
          this.autopilotStatusText = `Посадка: ${site.name}`;
          this.quests.showToast(`Автопилот: вход в атмосферу · ${site.name}`, 3.2);
        }
        return;
      }
    }

    // Phase 2: Entering atmosphere from orbit
    if (fs === 'entering') {
      this.autopilotStatusText = `Спуск в атмосферу · ${targetLabel}`;
      if (tx !== undefined && tz !== undefined) {
        const dx = tx - pos.x;
        const dz = tz - pos.z;
        const desiredHeading = Math.atan2(-dx, -dz);
        let headingErr = desiredHeading - this.physics.heading;
        while (headingErr > Math.PI) headingErr -= Math.PI * 2;
        while (headingErr < -Math.PI) headingErr += Math.PI * 2;
        inp.steerAxis = THREE.MathUtils.clamp(headingErr * 1.6, -1, 1);
      }
      inp.throttle = this.physics.forwardSpeed < 28;
      return;
    }

    // Phase 3: Cloud Glide Quest
    if (guidance.kind === 'cloud_glide') {
      if (fs === 'road' || fs === 'descending') {
        if (this.physics.forwardSpeed < 16) {
          inp.throttle = true;
        } else {
          this.physics.toggleFlight();
        }
        this.autopilotStatusText = 'Взлёт в облачный слой…';
        return;
      }
      this.autopilotStatusText = 'Полёт над облаками (квест)';
      inp.throttle = this.physics.forwardSpeed < 44;
      inp.steerAxis = 0.24;
      return;
    }

    // Phase 4: Planet Visit (just land gently on the road and stop)
    if (tx === undefined || tz === undefined) {
      if (fs === 'flight' || fs === 'ascending') {
        this.autopilotStatusText = `Снижение на поверхность ${activeCfg.name}`;
        this.physics.toggleFlight();
        inp.throttle = this.physics.forwardSpeed < 18;
      } else if (fs === 'descending') {
        this.autopilotStatusText = `Мягкая посадка на ${activeCfg.name}`;
        inp.brake = this.physics.forwardSpeed > 18;
      } else {
        this.autopilotArrivingStop = true;
      }
      return;
    }

    // Phase 5: Surface / Low-Altitude Hop to Target (tx, tz)
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.hypot(dx, dz);
    const desiredHeading = Math.atan2(-dx, -dz);
    let headingErr = desiredHeading - this.physics.heading;
    while (headingErr > Math.PI) headingErr -= Math.PI * 2;
    while (headingErr < -Math.PI) headingErr += Math.PI * 2;

    if (fs === 'road' && dist > 380 && guidance.kind !== 'road_rings') {
      this.autopilotStatusText = `Перелёт по воздуху · ${Math.round(dist)} м`;
      if (this.physics.forwardSpeed < 16) {
        inp.throttle = true;
        inp.steerAxis = THREE.MathUtils.clamp(headingErr * 1.8, -1, 1);
      } else {
        this.physics.toggleFlight();
      }
      return;
    }

    if (fs === 'ascending' || fs === 'flight') {
      this.autopilotStatusText = `Курс в небе: ${targetLabel} · ${Math.round(dist)} м`;
      inp.steerAxis = THREE.MathUtils.clamp(headingErr * 2.0, -1, 1);
      const speedNow = this.physics.forwardSpeed;
      const wantSpeed = dist > 260 ? 78 : 34;
      inp.throttle = speedNow < wantSpeed;
      inp.brake = speedNow > wantSpeed + 12;
      inp.boost = dist > 480 && Math.abs(headingErr) < 0.35;
      if (dist < 165) {
        this.physics.toggleFlight();
      }
      return;
    }

    if (fs === 'descending') {
      this.autopilotStatusText = `Заход на посадку: ${targetLabel} · ${Math.round(dist)} м`;
      inp.steerAxis = THREE.MathUtils.clamp(headingErr * 1.8, -1, 1);
      const wantSpeed = THREE.MathUtils.clamp(dist * 0.3, 8, 28);
      inp.throttle = this.physics.forwardSpeed < wantSpeed;
      inp.brake = this.physics.forwardSpeed > wantSpeed + 6;
      return;
    }

    // On road: Drive toward (tx, tz) with obstacle lookahead & clean stop at marker
    this.autopilotStatusText = `К метке «${targetLabel}» · ${Math.round(dist)} м`;
    if (dist <= 11.5) {
      this.autopilotArrivingStop = true;
      if (guidance.requiresWalk) {
        this.quests.showToast(
          `Автопилот: прибыли к «${targetLabel}» — можно выйти из авто`,
          3.8,
        );
      }
      return;
    }

    // Obstacle avoidance lookahead
    if (this.autopilotAvoidTimer > 0) {
      this.autopilotAvoidTimer = Math.max(0, this.autopilotAvoidTimer - delta);
    } else {
      const fwdX = -Math.sin(this.physics.heading);
      const fwdZ = -Math.cos(this.physics.heading);
      const rightX = Math.cos(this.physics.heading);
      const rightZ = -Math.sin(this.physics.heading);
      for (let i = 0; i < walkObstacles.length; i++) {
        const b = walkObstacles[i];
        const bdx = b.x - pos.x;
        const bdz = b.z - pos.z;
        const ahead = bdx * fwdX + bdz * fwdZ;
        const lateral = bdx * rightX + bdz * rightZ;
        const clearW = b.halfW + 6.5;
        const clearL = b.halfD + 17.5;
        if (ahead > 0 && ahead < clearL && Math.abs(lateral) < clearW) {
          this.autopilotAvoidDir = lateral >= 0 ? 1 : -1;
          this.autopilotAvoidTimer = 0.85;
          break;
        }
      }
    }

    // Stuck recovery: hop cleanly over obstacle if blocked for >1.4s
    const movedSince = Math.hypot(pos.x - this.autopilotLastPosX, pos.z - this.autopilotLastPosZ);
    const speedKmh = Math.abs(this.physics.forwardSpeed) * 3.6;
    if (movedSince < 0.45 && speedKmh < 8 && dist > 20) {
      this.autopilotStuckTimer += delta;
      if (this.autopilotStuckTimer > 1.4) {
        this.autopilotStuckTimer = 0;
        this.physics.forwardSpeed = Math.max(this.physics.forwardSpeed, 17);
        this.physics.toggleFlight();
        return;
      }
    } else {
      this.autopilotStuckTimer = 0;
      this.autopilotLastPosX = pos.x;
      this.autopilotLastPosZ = pos.z;
    }

    let steerCmd = THREE.MathUtils.clamp(headingErr * 2.15, -1, 1);
    if (this.autopilotAvoidTimer > 0) {
      steerCmd = this.autopilotAvoidDir * 0.85;
    }
    inp.steerAxis = steerCmd;

    const targetKmh =
      dist > 140 ? 64 : dist > 60 ? 44 : dist > 26 ? 24 : 13;
    inp.throttle = speedKmh < targetKmh - 1.5;
    inp.brake = speedKmh > targetKmh + 5;
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.timerId);
    this.audio.dispose();

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    canvas.removeEventListener('pointerdown', this.handlePointerDown);

    this.cockpit.dispose();
    this.walkerCompanion.dispose();
    this.interior.dispose();
    this.world.dispose();
    this.space.dispose();
    this.sky.dispose();
    if (this.scene.environment) this.scene.environment.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
