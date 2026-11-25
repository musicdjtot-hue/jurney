export type WeatherMode = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';

export type WeatherSetting = 'auto' | WeatherMode;

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonSetting = 'auto' | SeasonId;

export type TimePreset = 'auto' | 'dawn' | 'day' | 'sunset' | 'night';

export type BiomeId = 'coruscant' | 'kryos' | 'solaris' | 'verdant' | 'amethyst' | 'crimson';

export type PlanetId = string;

export type CabinThemeId = 'auto' | 'amber' | 'ice' | 'emerald' | 'rose' | 'violet';

export type InteriorMode = 'none' | 'cafe' | 'hotel' | 'observatory' | 'serbos';

export type InteriorPose = 'stand' | 'sit' | 'lie';

export type VehicleFlightState =
  | 'road'
  | 'ascending'
  | 'flight'
  | 'descending'
  | 'launching'
  | 'space'
  | 'entering';

export type SteeringMode = 'touch' | 'gyro';

export interface PlanetMarker {
  id: PlanetId;
  name: string;
  color: string;
  distanceKm: number;
  screenX: number; // -1..1 normalized screen X
  screenY: number; // -1..1 normalized screen Y
  inFront: boolean;
  isOrbiting: boolean;
}

export type QuestKind =
  | 'delivery'
  | 'cloud_glide'
  | 'planet_visit'
  | 'city_walk'
  | 'countryside'
  | 'cafe_visit'
  | 'hotel_visit'
  | 'from_cage'
  | 'serbos_visit';

export interface ActiveQuestSnapshot {
  id: string;
  kind: QuestKind;
  title: string;
  subtitle: string;
  reward: number;
  progressPct: number;
  distanceM: number | null;
  hasMarker: boolean;
  markerX: number;
  markerY: number;
  markerInFront: boolean;
  targetPlanetId?: PlanetId;
}

export interface NpcBannerSnapshot {
  speaker: string;
  text: string;
  tone: 'warm' | 'angry' | 'ai';
}

export interface CafeMenuItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  moodReply: string;
}

export interface CabinThemeOption {
  id: CabinThemeId;
  name: string;
  hex: string;
  cost: number;
  unlocked: boolean;
}

export interface ControlInputs {
  throttle: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  steerAxis: number;
  climb: boolean;
  descend: boolean;
  boost: boolean;
}

export interface SimulationSnapshot {
  speedKmh: number;
  altitudeM: number;
  flightState: VehicleFlightState;
  isFlying: boolean;
  inSpace: boolean;
  inOrbit: boolean;
  canLaunchToSpace: boolean;
  canEnterPlanet: boolean;
  planetId: PlanetId;
  biomeId: BiomeId;
  planetName: string;
  nearestPlanetId: PlanetId;
  nearestPlanetName: string;
  nearestPlanetDistKm: number;
  planetMarkers: PlanetMarker[];
  timeOfDay: number;
  timeLabel: string;
  activeWeather: WeatherMode;
  season: SeasonId;
  seasonLabel: string;
  zoneName: string;
  headingDeg: number;
  isWalking: boolean;
  canExitVehicle: boolean;
  distanceToCarM: number;
  hasCompanion: boolean;
  boostRemainingSec: number;
  credits: number;
  activeQuest: ActiveQuestSnapshot | null;
  availableQuests: ActiveQuestSnapshot[];
  nearbyCafeName: string | null;
  nearbyHotelName: string | null;
  nearbyObservatoryName: string | null;
  nearbySerbosName: string | null;
  nearbyFromCageName: string | null;
  insideHangarName: string | null;
  interiorMode: InteriorMode;
  interiorPose: InteriorPose;
  interiorLabel: string | null;
  canSitNearby: boolean;
  canLieNearby: boolean;
  canExitInterior: boolean;
  hotelTvOn: boolean;
  hotelTvChannelName: string;
  holdHands: boolean;
  sleepFade: number;
  companionNote: string | null;
  npcBanner: NpcBannerSnapshot | null;
  cabinTheme: CabinThemeId;
  cabinThemes: CabinThemeOption[];
  toastMessage: string | null;
}
