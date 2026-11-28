import type {
  AudioSettings,
  CabinThemeId,
  CompanionLocation,
  PlanetId,
  QuestKind,
  RpgEquipMap,
  RpgItem,
  SeasonId,
  SeasonSetting,
  TimePreset,
  VehicleFlightState,
  VehicleTypeId,
  WeatherMode,
  WeatherSetting,
} from '../types/simulation';

const SAVE_STORAGE_KEY = 'coruscant_horizon_save_v1';
const AUDIO_STORAGE_KEY = 'coruscant_horizon_audio_v1';
const GRAPHICS_QUALITY_KEY = 'coruscant_horizon_gfx_v1';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  masterVolume: 0.78,
  engineVolume: 0.68,
  radioVolume: 0.72,
  worldVolume: 0.76,
  sfxVolume: 0.75,
};

export interface Vec3Save {
  x: number;
  y: number;
  z: number;
}

export interface QuestSaveItem {
  id: string;
  kind: QuestKind;
  title: string;
  subtitle: string;
  reward: number;
  targetPlanet?: PlanetId;
  targetX?: number;
  targetZ?: number;
  targetName?: string;
  pickupPlanet?: PlanetId;
  pickupX?: number;
  pickupZ?: number;
  dropoffPlanet?: PlanetId;
  dropoffX?: number;
  dropoffZ?: number;
  dropoffName?: string;
  passengerName?: string;
  passengerPhase?: 'to_pickup' | 'in_rv';
  goalValue: number;
  progressValue: number;
}

export interface RpgSaveData {
  hp: number;
  inventory: RpgItem[];
  playerEquipped: RpgEquipMap;
  companionEquipped: RpgEquipMap;
}

export interface GameSaveData {
  version: 1;
  savedAt: number;
  planetId: PlanetId;
  planetName: string;
  flightState: VehicleFlightState;
  vehicleId?: VehicleTypeId;
  pedestriansHitCount?: number;
  position: Vec3Save;
  heading: number;
  forwardSpeed: number;
  targetFlightAltitude: number;
  spacePos: Vec3Save;
  spacePitch: number;
  spaceSpeed: number;
  orbitTheta: number;
  orbitElev: number;
  orbitDistFactor: number;
  selectedLandingSiteId: string | null;
  isWalking: boolean;
  walkerPos: Vec3Save;
  walkerHeading: number;
  companionPos: Vec3Save;
  companionHeading: number;
  hasCompanion: boolean;
  holdHands: boolean;
  timePreset: TimePreset;
  timeOfDay: number;
  weatherSetting: WeatherSetting;
  activeWeather: WeatherMode;
  seasonSetting: SeasonSetting;
  activeSeason: SeasonId;
  credits: number;
  cabinTheme: CabinThemeId;
  unlockedThemes: CabinThemeId[];
  cabinTintDark?: boolean;
  cabinRoofLight?: boolean;
  cabinSeatsReclined?: boolean;
  cabinMonitorOpen?: boolean;
  engineRunning?: boolean;
  rvLightsOn?: boolean;
  rvTvOn?: boolean;
  rvShowerOn?: boolean;
  rvCoffeeBrewed?: boolean;
  rvWindowTinted?: boolean;
  rvSunroofOpen?: boolean;
  companionLocation?: CompanionLocation;
  visitedPlanets: PlanetId[];
  visitedSpecialSpots: string[];
  discoveredCloudLayer: boolean;
  discoveredCountryside: boolean;
  questSeq: number;
  activeQuest: QuestSaveItem | null;
  questPool: QuestSaveItem[];
  rpgState?: RpgSaveData;
}

export function formatSaveTimeLabel(ts: number): string {
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mo} ${hh}:${mm}`;
  } catch {
    return 'Недавно';
  }
}

export function writeGameSave(data: GameSaveData): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readGameSave(): GameSaveData | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameSaveData>;
    if (!parsed || parsed.version !== 1 || !parsed.planetId || !parsed.position || !parsed.spacePos) {
      return null;
    }
    return parsed as GameSaveData;
  } catch {
    return null;
  }
}

export function clearGameSave(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readAudioSettings(): AudioSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const p = JSON.parse(raw) as Partial<AudioSettings>;
    const clamp01 = (v: unknown, fb: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
    return {
      muted: Boolean(p.muted),
      masterVolume: clamp01(p.masterVolume, DEFAULT_AUDIO_SETTINGS.masterVolume),
      engineVolume: clamp01(p.engineVolume, DEFAULT_AUDIO_SETTINGS.engineVolume),
      radioVolume: clamp01(p.radioVolume, DEFAULT_AUDIO_SETTINGS.radioVolume),
      worldVolume: clamp01(p.worldVolume, DEFAULT_AUDIO_SETTINGS.worldVolume),
      sfxVolume: clamp01(p.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function writeAudioSettings(settings: AudioSettings): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function readGraphicsQuality(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0.5;
    const raw = window.localStorage.getItem(GRAPHICS_QUALITY_KEY);
    if (!raw) return 0.5;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0.5;
    return Math.max(0, Math.min(1, parsed));
  } catch {
    return 0.5;
  }
}

export function writeGraphicsQuality(quality: number): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const clamped = Math.max(0, Math.min(1, quality));
    window.localStorage.setItem(GRAPHICS_QUALITY_KEY, clamped.toFixed(2));
  } catch {
    // Ignore storage errors
  }
}
