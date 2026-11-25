import { useCallback, useEffect, useRef, useState } from 'react';
import { TouchControls } from './components/TouchControls';
import { CoruscantEngine } from './engine/CoruscantEngine';
import type {
  CabinThemeId,
  SeasonSetting,
  SimulationSnapshot,
  SteeringMode,
  TimePreset,
  WeatherSetting,
} from './types/simulation';

const INITIAL_SNAPSHOT: SimulationSnapshot = {
  speedKmh: 50,
  altitudeM: 0,
  flightState: 'road',
  isFlying: false,
  inSpace: false,
  inOrbit: false,
  canLaunchToSpace: false,
  canEnterPlanet: false,
  planetId: 'coruscant',
  biomeId: 'coruscant',
  planetName: 'Корускант',
  nearestPlanetId: 'coruscant',
  nearestPlanetName: 'Корускант',
  nearestPlanetDistKm: 0,
  planetMarkers: [],
  timeOfDay: 0.69,
  timeLabel: '16:33 · Закат',
  activeWeather: 'clear',
  season: 'summer',
  seasonLabel: 'Лето',
  zoneName: 'Корускант · Центральные шпили',
  headingDeg: 0,
  isWalking: false,
  canExitVehicle: true,
  distanceToCarM: 0,
  hasCompanion: true,
  boostRemainingSec: 0,
  credits: 240,
  activeQuest: null,
  availableQuests: [],
  nearbyCafeName: null,
  nearbyHotelName: null,
  nearbyObservatoryName: null,
  nearbySerbosName: null,
  nearbyFromCageName: null,
  insideHangarName: null,
  interiorMode: 'none',
  interiorPose: 'stand',
  interiorLabel: null,
  canSitNearby: false,
  canLieNearby: false,
  canExitInterior: false,
  hotelTvOn: false,
  hotelTvChannelName: 'Выключен',
  holdHands: false,
  sleepFade: 0,
  companionNote: null,
  npcBanner: null,
  cabinTheme: 'auto',
  cabinThemes: [],
  toastMessage: null,
};

function hapticTap(ms = 12): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore on restricted environments
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CoruscantEngine | null>(null);

  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(INITIAL_SNAPSHOT);
  const [hudHidden, setHudHidden] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [cafeOpen, setCafeOpen] = useState(false);
  const [cafeReply, setCafeReply] = useState<string | null>(null);
  const [timePreset, setTimePreset] = useState<TimePreset>('auto');
  const [weatherSetting, setWeatherSetting] = useState<WeatherSetting>('auto');
  const [seasonSetting, setSeasonSetting] = useState<SeasonSetting>('auto');
  const [steeringMode, setSteeringMode] = useState<SteeringMode>('touch');
  const [steerVisual, setSteerVisual] = useState(0);
  const [gyroError, setGyroError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const gyroSupported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  const gyroZeroRef = useRef<number | null>(null);
  const latestRawAngleRef = useRef<number>(0);
  const lastSteerVisualRef = useRef<number>(0);

  const updateSteerVisualSmooth = useCallback((axis: number) => {
    if (Math.abs(axis - lastSteerVisualRef.current) > 0.025 || (axis === 0 && lastSteerVisualRef.current !== 0)) {
      lastSteerVisualRef.current = axis;
      setSteerVisual(axis);
    }
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new CoruscantEngine(
      mount,
      (nextSnap) => setSnapshot(nextSnap),
      (lost) => setContextLost(lost),
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cafeOpen && (snapshot.inSpace || (snapshot.interiorMode !== 'cafe' && !snapshot.nearbyCafeName))) {
      setCafeOpen(false);
    }
  }, [cafeOpen, snapshot.interiorMode, snapshot.nearbyCafeName, snapshot.inSpace]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (steeringMode !== 'gyro') {
      if (engineRef.current) {
        engineRef.current.inputs.steerAxis = 0;
      }
      updateSteerVisualSmooth(0);
      gyroZeroRef.current = null;
      return;
    }

    const onOrientation = (e: DeviceOrientationEvent) => {
      const angle = window.screen?.orientation?.angle ?? 0;
      let rawTilt = 0;

      if (angle === 90) {
        rawTilt = e.beta ?? 0;
      } else if (angle === 270 || angle === -90) {
        rawTilt = -(e.beta ?? 0);
      } else if (angle === 180) {
        rawTilt = -(e.gamma ?? 0);
      } else {
        rawTilt = e.gamma ?? 0;
      }

      latestRawAngleRef.current = rawTilt;
      if (gyroZeroRef.current === null) {
        gyroZeroRef.current = rawTilt;
      }

      const deltaDeg = rawTilt - gyroZeroRef.current;
      const deadzone = 3;
      const maxTilt = 32;

      let axis = 0;
      if (Math.abs(deltaDeg) > deadzone) {
        const effective = deltaDeg - Math.sign(deltaDeg) * deadzone;
        axis = Math.max(-1, Math.min(1, -effective / (maxTilt - deadzone)));
      }

      if (engineRef.current) {
        engineRef.current.inputs.steerAxis = axis;
      }
      updateSteerVisualSmooth(axis);
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, [steeringMode, updateSteerVisualSmooth]);

  useEffect(() => {
    const setKeyState = (code: string, pressed: boolean): boolean => {
      const engine = engineRef.current;
      if (!engine) return false;

      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          engine.inputs.throttle = pressed;
          return true;
        case 'KeyS':
        case 'ArrowDown':
          engine.inputs.brake = pressed;
          return true;
        case 'KeyA':
        case 'ArrowLeft':
          engine.inputs.steerLeft = pressed;
          return true;
        case 'KeyD':
        case 'ArrowRight':
          engine.inputs.steerRight = pressed;
          return true;
        case 'KeyQ':
        case 'Space':
          engine.inputs.climb = pressed;
          return true;
        case 'KeyE':
        case 'KeyC':
          engine.inputs.descend = pressed;
          return true;
        case 'ShiftLeft':
        case 'ShiftRight':
          engine.inputs.boost = pressed;
          return true;
        default:
          return false;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!e.repeat && e.code === 'KeyF') {
        e.preventDefault();
        engineRef.current?.toggleFlight();
        return;
      }

      if (!e.repeat && e.code === 'KeyG') {
        e.preventDefault();
        engineRef.current?.launchToSpace();
        engineRef.current?.enterNearestPlanet();
        return;
      }

      if (!e.repeat && e.code === 'KeyR') {
        e.preventDefault();
        engineRef.current?.toggleWalkVehicle();
        return;
      }

      if (!e.repeat && e.code === 'KeyH') {
        e.preventDefault();
        setHudHidden((prev) => !prev);
        return;
      }

      if (setKeyState(e.code, true)) {
        if (e.code === 'Space' || e.code.startsWith('Arrow')) {
          e.preventDefault();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      setKeyState(e.code, false);
    };

    const onBlur = () => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.inputs.throttle = false;
      engine.inputs.brake = false;
      engine.inputs.steerLeft = false;
      engine.inputs.steerRight = false;
      engine.inputs.steerAxis = 0;
      engine.inputs.climb = false;
      engine.inputs.descend = false;
      engine.inputs.boost = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const handleToggleFlight = useCallback(() => {
    hapticTap(16);
    engineRef.current?.toggleFlight();
  }, []);

  const handleLaunchToSpace = useCallback(() => {
    hapticTap(18);
    engineRef.current?.launchToSpace();
  }, []);

  const handleEnterPlanet = useCallback(() => {
    hapticTap(18);
    engineRef.current?.enterNearestPlanet();
  }, []);

  const handleExitVehicle = useCallback(() => {
    hapticTap(14);
    engineRef.current?.exitVehicle();
  }, []);

  const handleEnterVehicle = useCallback(() => {
    hapticTap(14);
    engineRef.current?.enterVehicle();
  }, []);

  const handleEnterCafe = useCallback(() => {
    hapticTap(14);
    setSettingsOpen(false);
    setJournalOpen(false);
    setCafeOpen(false);
    setCafeReply(null);
    engineRef.current?.enterNearbyCafe();
  }, []);

  const handleEnterHotel = useCallback(() => {
    hapticTap(14);
    setSettingsOpen(false);
    setJournalOpen(false);
    setCafeOpen(false);
    engineRef.current?.enterNearbyHotel();
  }, []);

  const handleEnterObservatory = useCallback(() => {
    hapticTap(14);
    setSettingsOpen(false);
    setJournalOpen(false);
    setCafeOpen(false);
    engineRef.current?.enterNearbyObservatory();
  }, []);

  const handleEnterSerbos = useCallback(() => {
    hapticTap(14);
    setSettingsOpen(false);
    setJournalOpen(false);
    setCafeOpen(false);
    engineRef.current?.enterNearbySerbos();
  }, []);

  const handleDrinkSerbosTea = useCallback(() => {
    hapticTap(14);
    engineRef.current?.drinkTeaWithSerbos();
  }, []);

  const handleTalkSerbos = useCallback(() => {
    hapticTap(10);
    engineRef.current?.talkWithSerbos();
  }, []);

  const handleTalkFromCage = useCallback(() => {
    hapticTap(12);
    engineRef.current?.talkWithFromCage();
  }, []);

  const handleToggleHotelTv = useCallback(() => {
    hapticTap(12);
    engineRef.current?.toggleHotelTv();
  }, []);

  const handleExitInterior = useCallback(() => {
    hapticTap(14);
    setCafeOpen(false);
    engineRef.current?.exitInterior();
  }, []);

  const handleSitInterior = useCallback(() => {
    hapticTap(12);
    engineRef.current?.sitAtNearbySeat();
  }, []);

  const handleLieBed = useCallback(() => {
    hapticTap(12);
    engineRef.current?.lieOnBed();
  }, []);

  const handleStandUp = useCallback(() => {
    hapticTap(10);
    engineRef.current?.standUpFromPose();
  }, []);

  const handleSleepHotel = useCallback(() => {
    hapticTap(16);
    engineRef.current?.sleepInHotelBed();
  }, []);

  const handleTalkCompanion = useCallback(() => {
    hapticTap(10);
    engineRef.current?.talkWithCompanion();
  }, []);

  const handleKissCompanion = useCallback(() => {
    hapticTap(14);
    engineRef.current?.kissGirl();
  }, []);

  const handleToggleHoldHands = useCallback(() => {
    hapticTap(12);
    engineRef.current?.toggleHoldHands();
  }, []);

  const handleToggleCompanion = useCallback(() => {
    hapticTap(10);
    engineRef.current?.toggleCompanion();
  }, []);

  const handleTriggerBoost = useCallback(() => {
    hapticTap(18);
    engineRef.current?.triggerBoost();
  }, []);

  const handleOpenCafeMenu = useCallback(() => {
    hapticTap(10);
    setSettingsOpen(false);
    setJournalOpen(false);
    setCafeReply(null);
    setCafeOpen(true);
  }, []);

  const handleCloseCafeMenu = useCallback(() => {
    hapticTap(8);
    setCafeOpen(false);
  }, []);

  const handleOrderInCafe = useCallback((itemId: string) => {
    hapticTap(12);
    const res = engineRef.current?.orderInCafe(itemId);
    if (res?.reply) {
      setCafeReply(res.reply);
    }
  }, []);

  const handleSelectQuest = useCallback((id: string) => {
    hapticTap(10);
    engineRef.current?.selectQuest(id);
  }, []);

  const handleSkipQuest = useCallback(() => {
    hapticTap(10);
    engineRef.current?.skipQuest();
  }, []);

  const handleSelectCabinTheme = useCallback((id: CabinThemeId) => {
    hapticTap(12);
    engineRef.current?.selectCabinTheme(id);
  }, []);

  const handleSelectTimePreset = useCallback((preset: TimePreset) => {
    hapticTap(8);
    setTimePreset(preset);
    engineRef.current?.setTimePreset(preset);
  }, []);

  const handleScrubTime = useCallback((val: number) => {
    setTimePreset('auto');
    engineRef.current?.setTimeOfDayManual(val);
  }, []);

  const handleSelectWeather = useCallback((setting: WeatherSetting) => {
    hapticTap(8);
    setWeatherSetting(setting);
    engineRef.current?.setWeatherSetting(setting);
  }, []);

  const handleSelectSeason = useCallback((setting: SeasonSetting) => {
    hapticTap(8);
    setSeasonSetting(setting);
    engineRef.current?.setSeasonSetting(setting);
  }, []);

  const handleSelectSteeringMode = useCallback(async (mode: SteeringMode) => {
    hapticTap(10);
    setGyroError(null);
    if (mode === 'gyro') {
      const devOrient = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof devOrient?.requestPermission === 'function') {
        try {
          const res = await devOrient.requestPermission();
          if (res !== 'granted') {
            setGyroError('Нет доступа к гироскопу');
            return;
          }
        } catch {
          setGyroError('Гироскоп недоступен');
          return;
        }
      }
      gyroZeroRef.current = null;
    }
    setSteeringMode(mode);
  }, []);

  const handleCalibrateGyro = useCallback(() => {
    hapticTap(10);
    gyroZeroRef.current = latestRawAngleRef.current;
    if (engineRef.current) {
      engineRef.current.inputs.steerAxis = 0;
    }
    setSteerVisual(0);
  }, []);

  const handleSteerAxisChange = useCallback((axis: number) => {
    if (engineRef.current) {
      engineRef.current.inputs.steerAxis = axis;
    }
    setSteerVisual(axis);
  }, []);

  const handleControlPress = useCallback(
    (key: 'throttle' | 'brake' | 'boost' | 'climb' | 'descend', active: boolean) => {
      if (active) hapticTap(8);
      if (engineRef.current) {
        engineRef.current.inputs[key] = active;
      }
    },
    [],
  );

  const handleToggleFullscreen = useCallback(async () => {
    hapticTap(10);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if iframe restricts Fullscreen API
    }
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#06090f]">
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full touch-none cursor-grab active:cursor-grabbing"
      />

      {snapshot.sleepFade > 0.01 && (
        <div
          className="fixed inset-0 z-40 pointer-events-none bg-[#04060c] flex items-center justify-center"
          style={{ opacity: snapshot.sleepFade }}
        >
          <span className="text-sm sm:text-base font-display tracking-wide text-amber-100/90">
            Спокойный отдых вдвоём…
          </span>
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#06090f]/95 text-center px-6">
          <div className="max-w-md space-y-2">
            <h2 className="font-display text-xl font-semibold text-white">
              Восстановление графического контекста
            </h2>
            <p className="text-sm text-slate-400">
              WebGL-сцена приостановлена и возобновится автоматически.
            </p>
          </div>
        </div>
      )}

      <TouchControls
        snapshot={snapshot}
        hudHidden={hudHidden}
        onToggleHud={() => {
          hapticTap(8);
          setHudHidden((prev) => !prev);
        }}
        settingsOpen={settingsOpen}
        onToggleSettings={() => {
          hapticTap(8);
          setJournalOpen(false);
          setCafeOpen(false);
          setSettingsOpen((prev) => !prev);
        }}
        journalOpen={journalOpen}
        onToggleJournal={() => {
          hapticTap(8);
          setSettingsOpen(false);
          setCafeOpen(false);
          setJournalOpen((prev) => !prev);
        }}
        cafeOpen={cafeOpen}
        cafeReply={cafeReply}
        onOpenCafe={handleOpenCafeMenu}
        onCloseCafe={handleCloseCafeMenu}
        onOrderInCafe={handleOrderInCafe}
        onEnterCafe={handleEnterCafe}
        onEnterHotel={handleEnterHotel}
        onEnterObservatory={handleEnterObservatory}
        onEnterSerbos={handleEnterSerbos}
        onDrinkSerbosTea={handleDrinkSerbosTea}
        onTalkSerbos={handleTalkSerbos}
        onTalkFromCage={handleTalkFromCage}
        onToggleHotelTv={handleToggleHotelTv}
        onExitInterior={handleExitInterior}
        onSitInterior={handleSitInterior}
        onLieBed={handleLieBed}
        onStandUp={handleStandUp}
        onSleepHotel={handleSleepHotel}
        onTalkCompanion={handleTalkCompanion}
        onKissCompanion={handleKissCompanion}
        onToggleHoldHands={handleToggleHoldHands}
        onSelectQuest={handleSelectQuest}
        onSkipQuest={handleSkipQuest}
        onSelectCabinTheme={handleSelectCabinTheme}
        onTriggerBoost={handleTriggerBoost}
        onToggleFlight={handleToggleFlight}
        onLaunchToSpace={handleLaunchToSpace}
        onEnterPlanet={handleEnterPlanet}
        onExitVehicle={handleExitVehicle}
        onEnterVehicle={handleEnterVehicle}
        onToggleCompanion={handleToggleCompanion}
        timePreset={timePreset}
        onSelectTimePreset={handleSelectTimePreset}
        onScrubTime={handleScrubTime}
        weatherSetting={weatherSetting}
        onSelectWeather={handleSelectWeather}
        seasonSetting={seasonSetting}
        onSelectSeason={handleSelectSeason}
        steeringMode={steeringMode}
        onSelectSteeringMode={handleSelectSteeringMode}
        onCalibrateGyro={handleCalibrateGyro}
        gyroSupported={gyroSupported}
        gyroError={gyroError}
        steerVisual={steerVisual}
        onSteerAxisChange={handleSteerAxisChange}
        onControlPress={handleControlPress}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />
    </div>
  );
}
