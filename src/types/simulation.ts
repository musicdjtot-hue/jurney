export type WeatherMode = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';

export type WeatherSetting = 'auto' | WeatherMode;

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonSetting = 'auto' | SeasonId;

export type TimePreset = 'auto' | 'dawn' | 'day' | 'sunset' | 'night';

export type BiomeId = 'coruscant' | 'earth' | 'kryos' | 'solaris' | 'verdant' | 'amethyst' | 'crimson';

export type PlanetId = string;

export type CabinThemeId = 'auto' | 'amber' | 'ice' | 'emerald' | 'rose' | 'violet';

export type InteriorMode = 'none' | 'cafe' | 'hotel' | 'observatory' | 'serbos';

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
  approachX?: number;
  approachZ?: number;
  lookAtX?: number;
  lookAtZ?: number;
  accentHex: string;
  screenX: number;
  screenY: number;
  inFront: boolean;
}

export type VehicleTypeId = 'coupe';

export type RvPose = 'stand' | 'lie';

export type RvStationKind =
  | 'bed'
  | 'tv'
  | 'coffee'
  | 'shower'
  | 'toilet'
  | 'fridge'
  | 'sunroof'
  | 'cab'
  | 'exit';

export type CompanionLocation = 'cab' | 'rv';

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
  | 'road_rings'
  | 'couple_moments'
  | 'night_cruise'
  | 'observatory_scan'
  | 'rally_dispersal'
  | 'lightsaber_hunt'
  | 'bounty_hunt'
  | 'passenger_transport';

export type RpgRarity = 'common' | 'epic' | 'legendary';

export type RpgSlot = 'head' | 'torso' | 'legs' | 'weapon' | 'gadget';

export type RpgWeaponKind = 'fists' | 'blaster' | 'lightsaber';

export type RpgOwnerTarget = 'player' | 'companion';

export interface RpgItem {
  uid: string;
  templateId: string;
  name: string;
  slot: RpgSlot;
  rarity: RpgRarity;
  weaponKind?: RpgWeaponKind;
  colorHex: string;
  accentHex: string;
  hpBonus: number;
  armorBonus: number;
  damageBonus: number;
  healBonus?: number;
  isUnique?: boolean;
  desc: string;
}

export type RpgEquipMap = Record<RpgSlot, RpgItem | null>;

export interface RpgStatsSummary {
  maxHp: number;
  armorPct: number;
  attackDmg: number;
  weaponKind: RpgWeaponKind;
  weaponColor: string;
  healPower: number;
}

export interface RpgStateSnapshot {
  hp: number;
  maxHp: number;
  walkStreakSec: number;
  inventory: RpgItem[];
  playerEquipped: RpgEquipMap;
  companionEquipped: RpgEquipMap;
  playerStats: RpgStatsSummary;
  companionStats: RpgStatsSummary;
  gopniksActive: number;
  rallyActiveCount: number;
  rallyTotalCount: number;
  policeWanted: boolean;
  policeOfficersAlive: number;
  policeEscapeProgress: number;
  policeDispatchSec: number;
  bountyBossActive: boolean;
  activeThreatLabel: string | null;
  nearbySaberName: string | null;
}

export interface RoadsideChatOption {
  id: string;
  label: string;
  reply: string;
}

export interface RoadsideChatState {
  npcName: string;
  prompt: string;
  options: RoadsideChatOption[];
  repliedText: string | null;
}

export interface PassengerQuestState {
  questId: string;
  passengerName: string;
  phase: 'to_pickup' | 'in_rv';
  dropoffName: string;
  distanceM: number;
  canInteract: boolean;
}

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

export interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  engineVolume: number;
  radioVolume: number;
  worldVolume: number;
  sfxVolume: number;
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
  nearbySerbosName: string | null;
  nearbySpecialSpot: SpecialSpotInfo | null;
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
  serbosCoffeeServed: boolean;
  serbosDialogLine: string | null;
  autopilotActive: boolean;
  canToggleAutopilot: boolean;
  autopilotStatusText: string | null;
  cabinTempC: number;
  cabinTintDark: boolean;
  cabinRoofLight: boolean;
  cabinSeatsReclined: boolean;
  cabinMonitorOpen: boolean;
  cabinAudioOn: boolean;
  engineRunning: boolean;
  audioSettings: AudioSettings;
  lookingAtDoorSide: 'left' | 'right' | null;
  leftWindowOpen: boolean;
  rightWindowOpen: boolean;
  canOpenWindow: boolean;
  cabinTheme: CabinThemeId;
  cabinThemes: CabinThemeOption[];
  vehicleId: VehicleTypeId;
  vehicleName: string;
  canEnterRvCabin: boolean;
  isInRvCabin: boolean;
  rvPose: RvPose;
  rvNearbyStation: RvStationKind | null;
  rvLightsOn: boolean;
  rvTvOn: boolean;
  rvShowerOn: boolean;
  rvCoffeeBrewed: boolean;
  rvWindowTinted: boolean;
  rvFridgeOpen: boolean;
  rvSunroofOpen: boolean;
  companionLocation: CompanionLocation;
  companionRvActivity: string | null;
  pedestriansHitCount: number;
  graphicsQuality: number;
  roadsideChat: RoadsideChatState | null;
  passengerQuest: PassengerQuestState | null;
  nearbyRooftopClubName: string | null;
  isOnRooftopClub: boolean;
  canHoverExitOnRooftop: boolean;
  rpg: RpgStateSnapshot;
  toastMessage: string | null;
  saveMeta: SaveMetaSnapshot;
}
