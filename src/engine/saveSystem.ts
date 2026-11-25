import type {
  CabinThemeId,
  PlanetId,
  QuestKind,
  SeasonId,
  SeasonSetting,
  TimePreset,
  VehicleFlightState,
  WeatherMode,
  WeatherSetting,
} from '../types/simulation';

const SAVE_STORAGE_KEY = 'coruscant_horizon_save_v1';

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
  goalValue: number;
  progressValue: number;
}

export interface GameSaveData {
  version: 1;
  savedAt: number;
  planetId: PlanetId;
  planetName: string;
  flightState: VehicleFlightState;
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
  visitedPlanets: PlanetId[];
  visitedSpecialSpots: string[];
  discoveredCloudLayer: boolean;
  discoveredCountryside: boolean;
  questSeq: number;
  activeQuest: QuestSaveItem | null;
  questPool: QuestSaveItem[];
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
