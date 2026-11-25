export type WeatherMode = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';

export type WeatherSetting = 'auto' | WeatherMode;

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonSetting = 'auto' | SeasonId;

export type TimePreset = 'auto' | 'dawn' | 'day' | 'sunset' | 'night';

export type BiomeId = 'coruscant' | 'earth' | 'kryos' | 'solaris' | 'verdant' | 'amethyst' | 'crimson';

export type PlanetId = string;

export type CabinThemeId = 'auto' | 'amber' | 'ice' | 'emerald' | 'rose' | 'violet';

export type InteriorMode = 'none' | 'cafe' | 'hotel' | 'observatory';

export type InteriorPose = 'stand' | 'sit' | 'lie';

export type VehicleFlightState =
  | 'road'
  | 'ascending'
  | 'flight'
  | 'descending'
  | 'launching_orbit'
  | 'orbit'
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

export interface LandingSite {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  accentHex: string;
  screenX: number;
  screenY: number;
  inFront: boolean;
}

export type VehicleTypeId = 'coupe' | 'truck' | 'ufo' | 'interceptor';

export interface VehicleCatalogItem {
  id: VehicleTypeId;
  name: string;
  desc: string;
  accentHex: string;
  unlocked: boolean;
  wheelMode: 'wheeled' | 'wheelless';
}

export interface NearbyVehiclePickup {
  id: string;
  vehicleId: VehicleTypeId;
  name: string;
  desc: string;
  wheelMode: 'wheeled' | 'wheelless';
  x: number;
  z: number;
}

export type SpecialSpotKind = 'serbos_house' | 'red_square' | 'dome_edge' | 'reptiloid_city';

export interface SpecialSpotInfo {
  id: string;
  kind: SpecialSpotKind;
  name: string;
  actionLabel: string;
  x: number;
  z: number;
}

export type QuestKind =
  | 'delivery'
  | 'cloud_glide'
  | 'planet_visit'
  | 'city_walk'
  | 'countryside'
  | 'cafe_visit'
  | 'hotel_visit'
  | 'serbos_visit'
  | 'earth_moscow'
  | 'earth_reptiloids'
  | 'orbit_landing'
  | 'vehicle_hunt'
  | 'road_rings';

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

export interface SaveMetaSnapshot {
  hasSave: boolean;
  savedAtLabel: string | null;
  planetName: string | null;
}

export interface SimulationSnapshot {
  speedKmh: number;
  altitudeM: number;
  flightState: VehicleFlightState;
  isFlying: boolean;
  inSpace: boolean;
  inOrbit: boolean;
  inOrbitMode: boolean;
  canLaunchToOrbit: boolean;
  canLaunchToSpace: boolean;
  canEnterPlanet: boolean;
  planetId: PlanetId;
  biomeId: BiomeId;
  planetName: string;
  nearestPlanetId: PlanetId;
  nearestPlanetName: string;
  nearestPlanetDistKm: number;
  planetMarkers: PlanetMarker[];
  landingSites: LandingSite[];
  selectedLandingSiteId: string | null;
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
  nearbySpecialSpot: SpecialSpotInfo | null;
  nearbyVehiclePickup: NearbyVehiclePickup | null;
  insideHangarName: string | null;
  interiorMode: InteriorMode;
  interiorPose: InteriorPose;
  interiorLabel: string | null;
  canSitNearby: boolean;
  canLieNearby: boolean;
  canExitInterior: boolean;
  holdHands: boolean;
  sleepFade: number;
  companionNote: string | null;
  cabinTheme: CabinThemeId;
  cabinThemes: CabinThemeOption[];
  vehicleId: VehicleTypeId;
  vehicleName: string;
  availableVehicles: VehicleCatalogItem[];
  pedestriansHitCount: number;
  toastMessage: string | null;
  saveMeta: SaveMetaSnapshot;
}
