import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Armchair,
  ArrowDown,
  ArrowUp,
  BedDouble,
  Building2,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudRain,
  Code2,
  Coffee,
  Compass,
  Copy,
  Cpu,
  DoorOpen,
  Download,
  Eye,
  EyeOff,
  Footprints,
  Heart,
  Home,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  Moon,
  Orbit,
  Palette,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCw,
  Rocket,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Sun,
  Telescope,
  Tv,
  UserCheck,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import { getCafeMenu, getCafeSceneIntro } from '../engine/events';
import { generateStandaloneGameHtml } from '../engine/standaloneHtml';
import type {
  CabinThemeId,
  SeasonSetting,
  SimulationSnapshot,
  SteeringMode,
  TimePreset,
  WeatherMode,
  WeatherSetting,
} from '../types/simulation';

interface TouchControlsProps {
  snapshot: SimulationSnapshot;
  hudHidden: boolean;
  onToggleHud: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  journalOpen: boolean;
  onToggleJournal: () => void;
  cafeOpen: boolean;
  cafeReply: string | null;
  onOpenCafe: () => void;
  onCloseCafe: () => void;
  onOrderInCafe: (itemId: string) => void;
  onEnterCafe: () => void;
  onEnterHotel: () => void;
  onEnterObservatory: () => void;
  onEnterSerbos: () => void;
  onDrinkSerbosTea: () => void;
  onTalkSerbos: () => void;
  onTalkFromCage: () => void;
  onToggleHotelTv: () => void;
  onExitInterior: () => void;
  onSitInterior: () => void;
  onLieBed: () => void;
  onStandUp: () => void;
  onSleepHotel: () => void;
  onTalkCompanion: () => void;
  onKissCompanion: () => void;
  onToggleHoldHands: () => void;
  onSelectQuest: (id: string) => void;
  onSkipQuest: () => void;
  onSelectCabinTheme: (id: CabinThemeId) => void;
  onTriggerBoost: () => void;
  onToggleFlight: () => void;
  onLaunchToSpace: () => void;
  onEnterPlanet: () => void;
  onExitVehicle: () => void;
  onEnterVehicle: () => void;
  onToggleCompanion: () => void;
  timePreset: TimePreset;
  onSelectTimePreset: (preset: TimePreset) => void;
  onScrubTime: (value: number) => void;
  weatherSetting: WeatherSetting;
  onSelectWeather: (setting: WeatherSetting) => void;
  seasonSetting: SeasonSetting;
  onSelectSeason: (setting: SeasonSetting) => void;
  steeringMode: SteeringMode;
  onSelectSteeringMode: (mode: SteeringMode) => void;
  onCalibrateGyro: () => void;
  gyroSupported: boolean;
  gyroError: string | null;
  steerVisual: number;
  onSteerAxisChange: (axis: number) => void;
  onControlPress: (key: 'throttle' | 'brake' | 'boost' | 'climb' | 'descend', active: boolean) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const TIME_OPTIONS: { id: TimePreset; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'dawn', label: 'Рассвет' },
  { id: 'day', label: 'День' },
  { id: 'sunset', label: 'Закат' },
  { id: 'night', label: 'Ночь' },
];

const WEATHER_OPTIONS: { id: WeatherSetting; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'clear', label: 'Ясно' },
  { id: 'cloudy', label: 'Облачно' },
  { id: 'rain', label: 'Дождь' },
  { id: 'storm', label: 'Гроза' },
  { id: 'snow', label: 'Снег' },
];

const SEASON_OPTIONS: { id: SeasonSetting; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'spring', label: 'Весна' },
  { id: 'summer', label: 'Лето' },
  { id: 'autumn', label: 'Осень' },
  { id: 'winter', label: 'Зима' },
];

const WEATHER_LABELS: Record<WeatherMode, string> = {
  clear: 'Ясно',
  cloudy: 'Облачно',
  rain: 'Дождь',
  storm: 'Гроза',
  snow: 'Снег',
};

function WeatherIcon({ mode }: { mode: WeatherMode }) {
  if (mode === 'clear') return <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (mode === 'cloudy') return <Cloud className="w-3.5 h-3.5 text-slate-300 shrink-0" />;
  if (mode === 'rain') return <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  if (mode === 'snow') return <Snowflake className="w-3.5 h-3.5 text-sky-200 shrink-0" />;
  return <CloudLightning className="w-3.5 h-3.5 text-indigo-300 shrink-0" />;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  snapshot,
  hudHidden,
  onToggleHud,
  settingsOpen,
  onToggleSettings,
  journalOpen,
  onToggleJournal,
  cafeOpen,
  cafeReply,
  onOpenCafe,
  onCloseCafe,
  onOrderInCafe,
  onEnterCafe,
  onEnterHotel,
  onEnterObservatory,
  onEnterSerbos,
  onDrinkSerbosTea,
  onTalkSerbos,
  onTalkFromCage,
  onToggleHotelTv,
  onExitInterior,
  onSitInterior,
  onLieBed,
  onStandUp,
  onSleepHotel,
  onTalkCompanion,
  onKissCompanion,
  onToggleHoldHands,
  onSelectQuest,
  onSkipQuest,
  onSelectCabinTheme,
  onTriggerBoost,
  onToggleFlight,
  onLaunchToSpace,
  onEnterPlanet,
  onExitVehicle,
  onEnterVehicle,
  onToggleCompanion,
  timePreset,
  onSelectTimePreset,
  onScrubTime,
  weatherSetting,
  onSelectWeather,
  seasonSetting,
  onSelectSeason,
  steeringMode,
  onSelectSteeringMode,
  onCalibrateGyro,
  gyroSupported,
  gyroError,
  steerVisual,
  onSteerAxisChange,
  onControlPress,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const insideInterior = snapshot.interiorMode !== 'none';
  const isSeatedOrLying = insideInterior && snapshot.interiorPose !== 'stand';
  const isWalking = snapshot.isWalking;
  const isAir = snapshot.isFlying && !isWalking;
  const inSpace = snapshot.inSpace && !isWalking;
  const showVerticalArrows = isAir || inSpace;
  const boostActive = snapshot.boostRemainingSec > 0;
  const boostPct = Math.min(100, Math.max(0, (snapshot.boostRemainingSec / 4) * 100));
  const cafeMenu = getCafeMenu(snapshot.biomeId);

  const [companionOpen, setCompanionOpen] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopyHtml = async () => {
    try {
      const code = generateStandaloneGameHtml();
      let ok = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          ok = true;
        } catch {
          ok = false;
        }
      }
      if (!ok) {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setHtmlCopied(true);
      setCopyFeedback('Код игры скопирован! Вставьте в файл game.html и откройте в браузере ▶️');
      setTimeout(() => {
        setHtmlCopied(false);
        setCopyFeedback(null);
      }, 4000);
    } catch {
      setCopyFeedback('Используйте кнопку «Скачать game.html»');
      setTimeout(() => setCopyFeedback(null), 4000);
    }
  };

  const handleDownloadHtml = () => {
    try {
      const code = generateStandaloneGameHtml();
      const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cyber_horizon.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCopyFeedback('Файл cyber_horizon.html сохранён!');
      setTimeout(() => setCopyFeedback(null), 4000);
    } catch {
      // ignore
    }
  };

  const steerPadRef = useRef<HTMLDivElement | null>(null);
  const steerPointerIdRef = useRef<number | null>(null);

  const [pressedMap, setPressedMap] = useState<Record<string, boolean>>({});
  const activePointersRef = useRef<Map<number, 'throttle' | 'brake' | 'boost' | 'climb' | 'descend'>>(
    new Map(),
  );

  React.useEffect(() => {
    if (hudHidden || isSeatedOrLying) {
      activePointersRef.current.clear();
      setPressedMap({});
      steerPointerIdRef.current = null;
      onSteerAxisChange(0);
      onControlPress('throttle', false);
      onControlPress('brake', false);
      onControlPress('boost', false);
      onControlPress('climb', false);
      onControlPress('descend', false);
    }
  }, [hudHidden, isSeatedOrLying, onControlPress, onSteerAxisChange]);

  React.useEffect(() => {
    if (!showVerticalArrows) {
      for (const [pid, ctrl] of activePointersRef.current.entries()) {
        if (ctrl === 'climb' || ctrl === 'descend') {
          activePointersRef.current.delete(pid);
        }
      }
      setPressedMap((prev) =>
        prev.climb || prev.descend ? { ...prev, climb: false, descend: false } : prev,
      );
      onControlPress('climb', false);
      onControlPress('descend', false);
    }
  }, [showVerticalArrows, onControlPress]);

  React.useEffect(() => {
    if (steeringMode !== 'touch' && !isWalking) {
      steerPointerIdRef.current = null;
      onSteerAxisChange(0);
    }
  }, [steeringMode, isWalking, onSteerAxisChange]);

  React.useEffect(() => {
    if (settingsOpen || journalOpen || cafeOpen) {
      setCompanionOpen(false);
    }
  }, [settingsOpen, journalOpen, cafeOpen]);

  const updateSteerFromClientX = (clientX: number) => {
    const el = steerPadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const norm = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const clamped = Math.max(-1, Math.min(1, norm));
    const withDeadzone = Math.abs(clamped) < 0.08 ? 0 : clamped;
    onSteerAxisChange(-withDeadzone);
  };

  const handleSteerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (steerPointerIdRef.current !== null) return;
    steerPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }
    updateSteerFromClientX(e.clientX);
  };

  const handleSteerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (steerPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateSteerFromClientX(e.clientX);
  };

  const handleSteerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (steerPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    steerPointerIdRef.current = null;
    onSteerAxisChange(0);
  };

  const handleHoldStart =
    (control: 'throttle' | 'brake' | 'boost' | 'climb' | 'descend') =>
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
      activePointersRef.current.set(e.pointerId, control);
      setPressedMap((prev) => ({ ...prev, [control]: true }));
      onControlPress(control, true);
    };

  const handleHoldEnd =
    (control: 'throttle' | 'brake' | 'boost' | 'climb' | 'descend') =>
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (activePointersRef.current.get(e.pointerId) !== control) return;
      e.stopPropagation();
      activePointersRef.current.delete(e.pointerId);
      setPressedMap((prev) => ({ ...prev, [control]: false }));
      onControlPress(control, false);
    };

  const knobPercent = 50 + -steerVisual * 38;

  const renderContextualButtons = (compact: boolean) => {
    const btnCls = compact
      ? 'min-h-[44px] px-2.5 rounded-xl border text-[11px] font-semibold inline-flex items-center justify-center gap-1 shadow-lg active:scale-95 transition-transform whitespace-nowrap shrink-0'
      : 'min-h-[50px] px-3.5 rounded-2xl border text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform whitespace-nowrap shrink-0';
    const iconCls = compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0';

    if (insideInterior) {
      return (
        <>
          <button
            type="button"
            onClick={onExitInterior}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} ${
              snapshot.canExitInterior
                ? 'bg-emerald-500/35 border-emerald-300 text-white'
                : 'bg-[#090d14]/88 border-white/20 text-slate-100'
            }`}
          >
            <DoorOpen className={`${iconCls} text-emerald-300`} />
            <span>На улицу</span>
          </button>

          {snapshot.canSitNearby && (
            <button
              type="button"
              onClick={onSitInterior}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-amber-500/25 border-amber-400/55 text-amber-100`}
            >
              <Armchair className={`${iconCls} text-amber-300`} />
              <span>
                {snapshot.interiorMode === 'cafe'
                  ? 'Сесть за столик'
                  : snapshot.interiorMode === 'observatory'
                    ? 'На скамью'
                    : snapshot.interiorMode === 'serbos'
                      ? 'За стол пить чай'
                      : 'На диван'}
              </span>
            </button>
          )}

          {snapshot.canLieNearby && (
            <button
              type="button"
              onClick={onLieBed}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-rose-500/25 border-rose-400/55 text-rose-100`}
            >
              <BedDouble className={`${iconCls} text-rose-300`} />
              <span>Прилечь вдвоём</span>
            </button>
          )}

          {snapshot.interiorPose !== 'stand' && (
            <button
              type="button"
              onClick={onStandUp}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-sky-500/25 border-sky-400/55 text-sky-100`}
            >
              <Footprints className={`${iconCls} text-sky-300`} />
              <span>Встать</span>
            </button>
          )}

          {snapshot.interiorMode === 'cafe' && (
            <button
              type="button"
              onClick={onOpenCafe}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-rose-500/25 border-rose-400/55 text-rose-100`}
            >
              <Coffee className={`${iconCls} text-rose-300`} />
              <span>{compact ? 'Чай / Кофе' : 'Меню чая и кофе'}</span>
            </button>
          )}

          {snapshot.interiorMode === 'hotel' && (
            <>
              <button
                type="button"
                onClick={onToggleHotelTv}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${btnCls} ${
                  snapshot.hotelTvOn
                    ? 'bg-sky-500/35 border-sky-300 text-white'
                    : 'bg-[#090d14]/88 border-sky-400/45 text-sky-100'
                }`}
              >
                <Tv className={`${iconCls} text-sky-300`} />
                <span>{snapshot.hotelTvOn ? (compact ? 'ТВ вкл' : 'Переключить ТВ') : 'Смотреть ТВ'}</span>
              </button>

              {snapshot.hasCompanion && (
                <button
                  type="button"
                  onClick={onKissCompanion}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`${btnCls} bg-rose-500/30 border-rose-300/60 text-rose-100`}
                >
                  <Heart className={`${iconCls} text-rose-200 fill-rose-300`} />
                  <span>Поцеловать</span>
                </button>
              )}

              <button
                type="button"
                onClick={onSleepHotel}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${btnCls} bg-indigo-500/30 border-indigo-400/60 text-indigo-100`}
              >
                <Moon className={`${iconCls} text-indigo-300`} />
                <span>Поспать</span>
              </button>
            </>
          )}

          {snapshot.interiorMode === 'serbos' && (
            <>
              <button
                type="button"
                onClick={onDrinkSerbosTea}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${btnCls} bg-emerald-500/30 border-emerald-400/60 text-emerald-100`}
              >
                <Coffee className={`${iconCls} text-emerald-300`} />
                <span>{compact ? 'Выпить чаю' : 'Выпить чаю у Сербоса'}</span>
              </button>

              <button
                type="button"
                onClick={onTalkSerbos}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${btnCls} bg-cyan-500/25 border-cyan-400/55 text-cyan-100`}
              >
                <Cpu className={`${iconCls} text-cyan-300`} />
                <span>{compact ? 'Адамчик' : 'Сербос и Адамчик'}</span>
              </button>
            </>
          )}

          {snapshot.hasCompanion && (
            <button
              type="button"
              onClick={onTalkCompanion}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-rose-500/20 border-rose-300/45 text-rose-100`}
            >
              <MessageCircle className={`${iconCls} text-rose-300`} />
              <span>{snapshot.interiorMode === 'hotel' ? 'О виде и планете' : 'Поболтать'}</span>
            </button>
          )}
        </>
      );
    }

    return (
      <>
        {!inSpace && !isWalking && (
          <button
            type="button"
            onClick={onToggleFlight}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} ${
              isAir
                ? 'bg-sky-500/25 border-sky-400/55 text-sky-100'
                : 'bg-amber-500/25 border-amber-400/55 text-amber-100'
            }`}
          >
            {isAir ? (
              <>
                <PlaneLanding className={`${iconCls} text-sky-300`} />
                <span>На дорогу</span>
              </>
            ) : (
              <>
                <PlaneTakeoff className={`${iconCls} text-amber-300`} />
                <span>В облака</span>
              </>
            )}
          </button>
        )}

        {snapshot.canExitVehicle && (
          <button
            type="button"
            onClick={onExitVehicle}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-emerald-500/25 border-emerald-400/55 text-emerald-100`}
          >
            <Footprints className={`${iconCls} text-emerald-300`} />
            <span>Выйти</span>
          </button>
        )}

        {isWalking && (
          <button
            type="button"
            onClick={onEnterVehicle}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-amber-500/25 border-amber-400/55 text-amber-100`}
          >
            <Car className={`${iconCls} text-amber-300`} />
            <span>
              {snapshot.distanceToCarM > 6
                ? `В машину (${snapshot.distanceToCarM} м)`
                : 'В машину'}
            </span>
          </button>
        )}

        {isWalking && snapshot.hasCompanion && (
          <button
            type="button"
            onClick={onToggleHoldHands}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} ${
              snapshot.holdHands
                ? 'bg-rose-500/35 border-rose-300 text-white'
                : 'bg-[#090d14]/84 border-white/20 text-rose-100'
            }`}
          >
            <Heart className={`${iconCls} text-rose-300`} />
            <span>{snapshot.holdHands ? 'За руку ✓' : 'За руку'}</span>
          </button>
        )}

        {snapshot.nearbyCafeName && !inSpace && (
          <button
            type="button"
            onClick={onEnterCafe}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-rose-500/25 border-rose-400/55 text-rose-100`}
          >
            <Coffee className={`${iconCls} text-rose-300`} />
            <span>Кафе</span>
          </button>
        )}

        {snapshot.nearbyHotelName && !inSpace && (
          <button
            type="button"
            onClick={onEnterHotel}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-indigo-500/25 border-indigo-400/55 text-indigo-100`}
          >
            <Building2 className={`${iconCls} text-indigo-300`} />
            <span>Отель</span>
          </button>
        )}

        {snapshot.nearbyObservatoryName && !inSpace && (
          <button
            type="button"
            onClick={onEnterObservatory}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-cyan-500/25 border-cyan-400/55 text-cyan-100`}
          >
            <Telescope className={`${iconCls} text-cyan-300`} />
            <span>{compact ? 'Купол' : 'Обсерватория'}</span>
          </button>
        )}

        {snapshot.nearbySerbosName && !inSpace && (
          <>
            <button
              type="button"
              onClick={onEnterSerbos}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-emerald-500/30 border-emerald-400/60 text-emerald-100`}
            >
              <Home className={`${iconCls} text-emerald-300`} />
              <span>{compact ? 'К Сербосу' : 'Дом Сербоса'}</span>
            </button>
            <button
              type="button"
              onClick={onTalkSerbos}
              onPointerDown={(e) => e.stopPropagation()}
              className={`${btnCls} bg-teal-500/25 border-teal-400/55 text-teal-100`}
            >
              <MessageCircle className={`${iconCls} text-teal-300`} />
              <span>Сербос</span>
            </button>
          </>
        )}

        {snapshot.nearbyFromCageName && !inSpace && (
          <button
            type="button"
            onClick={onTalkFromCage}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-orange-500/30 border-orange-400/60 text-orange-100`}
          >
            <AlertTriangle className={`${iconCls} text-orange-300`} />
            <span>{compact ? 'Фром' : 'Клетка: Фром'}</span>
          </button>
        )}

        {snapshot.canLaunchToSpace && (
          <button
            type="button"
            onClick={onLaunchToSpace}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-violet-500/30 border-violet-400/60 text-violet-100`}
          >
            <Rocket className={`${iconCls} text-violet-300`} />
            <span>В космос</span>
          </button>
        )}

        {snapshot.canEnterPlanet && (
          <button
            type="button"
            onClick={onEnterPlanet}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${btnCls} bg-emerald-500/30 border-emerald-400/60 text-emerald-100`}
          >
            <Orbit className={`${iconCls} text-emerald-300`} />
            <span>{compact ? 'К планете' : `В облака · ${snapshot.nearestPlanetName}`}</span>
          </button>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none safe-area-hud box-border flex flex-col justify-between overflow-hidden">
      {/* Subtle Space Planet Markers */}
      {inSpace && !hudHidden && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {snapshot.planetMarkers.map((m) => {
            const leftPct = 50 + m.screenX * 44;
            const topPct = 50 - m.screenY * 38;
            const isQuestTarget = snapshot.activeQuest?.targetPlanetId === m.id;
            return (
              <div
                key={m.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-opacity"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  opacity: isQuestTarget ? 1 : m.inFront ? 0.9 : 0.42,
                }}
              >
                <div
                  className={`rounded-full border shadow-sm ${
                    isQuestTarget ? 'w-3.5 h-3.5 border-amber-300 ring-2 ring-amber-400/50' : 'w-2.5 h-2.5 border-white/70'
                  }`}
                  style={{ backgroundColor: m.color }}
                />
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                    isQuestTarget
                      ? 'bg-amber-500/30 border border-amber-300 text-amber-100'
                      : 'bg-[#090d14]/75 border border-white/15 text-white'
                  }`}
                >
                  {isQuestTarget ? '★ ' : ''}
                  {m.name} · {m.distanceKm} км
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtle Quest Waypoint Marker */}
      {!inSpace && !insideInterior && !hudHidden && snapshot.activeQuest?.hasMarker && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-opacity"
            style={{
              left: `${50 + snapshot.activeQuest.markerX * 42}%`,
              top: `${50 - snapshot.activeQuest.markerY * 36}%`,
              opacity: snapshot.activeQuest.markerInFront ? 0.92 : 0.45,
            }}
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/25 border border-amber-300/80 flex items-center justify-center shadow">
              <MapPin className="w-3.5 h-3.5 text-amber-200" />
            </div>
            {snapshot.activeQuest.distanceM !== null && (
              <span className="px-1.5 py-0.5 rounded bg-[#090d14]/85 border border-amber-400/35 text-[10px] font-mono-tabular text-amber-100 whitespace-nowrap">
                {snapshot.activeQuest.distanceM} м
              </span>
            )}
          </div>
        </div>
      )}

      {/* Gentle Meditative Event Toast */}
      {!hudHidden && snapshot.toastMessage && (
        <div className="pointer-events-none fixed top-20 sm:top-16 left-1/2 -translate-x-1/2 z-20 max-w-[90vw]">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#090d14]/92 border border-amber-400/35 text-xs font-medium text-amber-100 shadow-lg text-center truncate">
            {snapshot.toastMessage}
          </div>
        </div>
      )}

      {/* Cozy Companion Note Speech Bubble */}
      {!hudHidden && snapshot.companionNote && snapshot.hasCompanion && (
        <div className="pointer-events-none fixed top-28 sm:top-24 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] w-fit">
          <div className="px-3.5 py-2 rounded-2xl bg-[#130d16]/92 border border-rose-300/35 text-xs text-rose-100 shadow-xl text-center leading-snug">
            {snapshot.companionNote}
          </div>
        </div>
      )}

      {/* NPC Speech Banner: From (Angry), Serbos (Warm), or Adamchik AI */}
      {!hudHidden && snapshot.npcBanner && (
        <div
          className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 max-w-[92vw] w-fit ${
            snapshot.companionNote && snapshot.hasCompanion ? 'top-40 sm:top-36' : 'top-28 sm:top-24'
          }`}
        >
          <div
            className={`px-4 py-2 rounded-2xl border shadow-2xl text-center leading-snug ${
              snapshot.npcBanner.tone === 'angry'
                ? 'bg-[#1f0b0b]/95 border-orange-400/70 text-orange-100'
                : snapshot.npcBanner.tone === 'ai'
                  ? 'bg-[#091522]/95 border-cyan-400/65 text-cyan-100'
                  : 'bg-[#081c17]/95 border-emerald-400/65 text-emerald-100'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-85 mb-0.5">
              {snapshot.npcBanner.speaker}
            </div>
            <div className="text-xs font-medium">{snapshot.npcBanner.text}</div>
          </div>
        </div>
      )}

      {/* Top Row: Minimal Title + Telemetry + Credits/Quest Pill + Utility Buttons */}
      <div className="relative z-10 flex items-start justify-between gap-2 w-full min-w-0">
        <header className="pointer-events-none min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-xl font-semibold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] truncate">
            {inSpace ? 'Космос · Горизонт' : `${snapshot.planetName} · Горизонт`}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-200/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            <span className="truncate max-w-[190px] sm:max-w-none">{snapshot.zoneName}</span>
            {!inSpace && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular whitespace-nowrap">{snapshot.timeLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <WeatherIcon mode={snapshot.activeWeather} />
                  <span>{WEATHER_LABELS[snapshot.activeWeather]}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-200 whitespace-nowrap">{snapshot.seasonLabel}</span>
              </>
            )}
          </div>
          {!insideInterior && (
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
              <span className="font-mono-tabular font-semibold">{snapshot.speedKmh} км/ч</span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              {inSpace ? (
                <span className="font-mono-tabular font-semibold text-violet-200">
                  {snapshot.nearestPlanetName}: {snapshot.nearestPlanetDistKm} км
                </span>
              ) : (
                <span className="font-mono-tabular font-semibold">{snapshot.altitudeM} м</span>
              )}
              {snapshot.insideHangarName && (
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-[11px] font-medium text-sky-200">
                  Под крышей · {snapshot.insideHangarName}
                </span>
              )}
            </div>
          )}

          {!hudHidden && (
            <div className="mt-1.5 pointer-events-auto inline-flex max-w-full" onPointerDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={onToggleJournal}
                className={`min-h-[34px] max-w-[230px] sm:max-w-[340px] px-2.5 py-1 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                  journalOpen
                    ? 'bg-amber-500/25 border-amber-400/55 text-amber-100'
                    : 'bg-[#090d14]/84 border-white/15 text-slate-200 hover:bg-[#111824]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-mono-tabular text-amber-200 shrink-0">{snapshot.credits} ✦</span>
                {snapshot.activeQuest && (
                  <>
                    <span className="text-slate-500 shrink-0">·</span>
                    <span className="truncate">{snapshot.activeQuest.title}</span>
                    {snapshot.activeQuest.distanceM !== null ? (
                      <span className="font-mono-tabular text-slate-400 shrink-0">
                        {snapshot.activeQuest.distanceM}м
                      </span>
                    ) : snapshot.activeQuest.progressPct > 0 ? (
                      <span className="font-mono-tabular text-emerald-300 shrink-0">
                        {snapshot.activeQuest.progressPct}%
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            </div>
          )}
        </header>

        {/* Top-Right Compact Action Cluster */}
        <div
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!hudHidden && (
            <button
              type="button"
              onClick={() => {
                if (settingsOpen) onToggleSettings();
                if (journalOpen) onToggleJournal();
                if (cafeOpen) onCloseCafe();
                setCompanionOpen((prev) => !prev);
              }}
              className={`min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                companionOpen || snapshot.hasCompanion
                  ? 'bg-rose-500/25 border-rose-400/50 text-rose-100'
                  : 'bg-[#090d14]/88 border-white/15 text-slate-300 hover:bg-[#111824]'
              }`}
              aria-label="Действия вдвоём со спутницей"
              aria-expanded={companionOpen}
            >
              {snapshot.hasCompanion ? (
                <UserCheck className="w-4 h-4 text-rose-300 shrink-0" />
              ) : (
                <UserX className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="hidden sm:inline">Вдвоём</span>
            </button>
          )}

          {!hudHidden && (
            <button
              type="button"
              onClick={onToggleSettings}
              className={`min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                settingsOpen
                  ? 'bg-amber-500/25 border-amber-400/50 text-amber-100'
                  : 'bg-[#090d14]/88 border-white/15 text-slate-100 hover:bg-[#111824]'
              }`}
              aria-label="Атмосфера и настройки"
              aria-expanded={settingsOpen}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Атмосфера</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#090d14]/88 border border-white/15 text-slate-100 hover:bg-[#111824] inline-flex items-center justify-center transition-colors shrink-0"
            aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleHud}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#090d14]/88 border border-white/15 text-slate-100 hover:bg-[#111824] inline-flex items-center justify-center transition-colors shrink-0"
            aria-label={hudHidden ? 'Показать управление' : 'Скрыть управление'}
          >
            {hudHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Companion Together Drawer */}
      {companionOpen && !hudHidden && (
        <div
          className="relative z-10 pointer-events-auto self-center w-[min(440px,92vw)] max-h-[70dvh] overflow-y-auto touch-pan-y rounded-2xl bg-[#090d14]/95 border border-rose-300/25 shadow-2xl p-3.5 sm:p-4 flex flex-col gap-3 my-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-300 shrink-0" />
              <h2 className="font-display text-sm font-semibold text-white">Путешествие вдвоём</h2>
            </div>
            <button
              type="button"
              onClick={() => setCompanionOpen(false)}
              className="min-h-[40px] min-w-[40px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center"
              aria-label="Закрыть меню спутницы"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {snapshot.hasCompanion && (
              <button
                type="button"
                onClick={() => {
                  onTalkCompanion();
                  setCompanionOpen(false);
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-left flex items-center gap-2.5 text-xs font-medium text-rose-100"
              >
                <MessageCircle className="w-4 h-4 text-rose-300 shrink-0" />
                <div>
                  <div className="font-semibold">Поговорить по душам</div>
                  <div className="text-[11px] text-rose-200/75">
                    Услышать её мысли о месте, погоде и поездке
                  </div>
                </div>
              </button>
            )}

            {snapshot.hasCompanion && (
              <button
                type="button"
                onClick={() => {
                  onKissCompanion();
                  setCompanionOpen(false);
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/40 border border-rose-300/50 text-left flex items-center gap-2.5 text-xs font-medium text-rose-100"
              >
                <Heart className="w-4 h-4 text-rose-200 fill-rose-300 shrink-0" />
                <div>
                  <div className="font-semibold">Поцеловать спутницу</div>
                  <div className="text-[11px] text-rose-200/80">
                    Поделиться нежностью и услышать её добрые слова
                  </div>
                </div>
              </button>
            )}

            {snapshot.hasCompanion && isWalking && (
              <button
                type="button"
                onClick={() => {
                  onToggleHoldHands();
                  setCompanionOpen(false);
                }}
                className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl border text-left flex items-center gap-2.5 text-xs font-medium ${
                  snapshot.holdHands
                    ? 'bg-rose-500/30 border-rose-300 text-white'
                    : 'bg-black/40 hover:bg-white/5 border-white/10 text-slate-200'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-300 shrink-0" />
                <div>
                  <div className="font-semibold">
                    {snapshot.holdHands ? 'Отпустить руку' : 'Взяться за руки'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Идти совсем близко плечом к плечу
                  </div>
                </div>
              </button>
            )}

            {snapshot.nearbyCafeName && !insideInterior && (
              <button
                type="button"
                onClick={() => {
                  setCompanionOpen(false);
                  onEnterCafe();
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-left flex items-center gap-2.5 text-xs font-medium text-amber-100"
              >
                <Coffee className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="font-semibold">Зайти в {snapshot.nearbyCafeName}</div>
                  <div className="text-[11px] text-amber-200/75">
                    Присесть за столик на стулья и выпить кофе
                  </div>
                </div>
              </button>
            )}

            {snapshot.nearbyHotelName && !insideInterior && (
              <button
                type="button"
                onClick={() => {
                  setCompanionOpen(false);
                  onEnterHotel();
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-left flex items-center gap-2.5 text-xs font-medium text-indigo-100"
              >
                <Building2 className="w-4 h-4 text-indigo-300 shrink-0" />
                <div>
                  <div className="font-semibold">Зайти в {snapshot.nearbyHotelName}</div>
                  <div className="text-[11px] text-indigo-200/75">
                    Панорамный номер, диван и большая кровать для отдыха
                  </div>
                </div>
              </button>
            )}

            {snapshot.nearbyObservatoryName && !insideInterior && (
              <button
                type="button"
                onClick={() => {
                  setCompanionOpen(false);
                  onEnterObservatory();
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-left flex items-center gap-2.5 text-xs font-medium text-cyan-100"
              >
                <Telescope className="w-4 h-4 text-cyan-300 shrink-0" />
                <div>
                  <div className="font-semibold">Зайти в {snapshot.nearbyObservatoryName}</div>
                  <div className="text-[11px] text-cyan-200/75">
                    Стеклянный купол, голограмма галактики и скамья для двоих
                  </div>
                </div>
              </button>
            )}

            {snapshot.nearbySerbosName && !insideInterior && (
              <button
                type="button"
                onClick={() => {
                  setCompanionOpen(false);
                  onEnterSerbos();
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-left flex items-center gap-2.5 text-xs font-medium text-emerald-100"
              >
                <Home className="w-4 h-4 text-emerald-300 shrink-0" />
                <div>
                  <div className="font-semibold">Зайти к Сербосу ({snapshot.nearbySerbosName})</div>
                  <div className="text-[11px] text-emerald-200/75">
                    Много компьютеров, ИИ Адамчик и чай в домике у реки
                  </div>
                </div>
              </button>
            )}

            {snapshot.nearbyFromCageName && !insideInterior && (
              <button
                type="button"
                onClick={() => {
                  setCompanionOpen(false);
                  onTalkFromCage();
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-left flex items-center gap-2.5 text-xs font-medium text-orange-100"
              >
                <AlertTriangle className="w-4 h-4 text-orange-300 shrink-0" />
                <div>
                  <div className="font-semibold">Клетка · Злой землянин Фром</div>
                  <div className="text-[11px] text-orange-200/75">
                    Послушать, как Фром орёт и бегает по клетке
                  </div>
                </div>
              </button>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200">Спутница в поездке</span>
                <span className="text-[11px] text-slate-400">
                  Блондинка в кремовой куртке рядом с вами
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleCompanion}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  snapshot.hasCompanion
                    ? 'bg-rose-500/25 border-rose-400/50 text-rose-100'
                    : 'bg-white/5 border-white/15 text-slate-300'
                }`}
              >
                {snapshot.hasCompanion ? 'С вами' : 'Взять'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Journal, Gentle Quests & Cabin Ambient Themes Drawer */}
      {journalOpen && !hudHidden && (
        <div
          className="relative z-10 pointer-events-auto self-center w-[min(520px,92vw)] max-h-[70dvh] overflow-y-auto touch-pan-y rounded-2xl bg-[#090d14]/95 border border-white/15 shadow-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 my-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <h2 className="font-display text-sm font-semibold text-white">Маршруты и салон</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/35 text-xs font-mono-tabular font-semibold text-amber-200">
                {snapshot.credits} ✦
              </span>
              <button
                type="button"
                onClick={onToggleJournal}
                className="min-h-[40px] min-w-[40px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center"
                aria-label="Закрыть журнал"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {snapshot.activeQuest && (
            <div className="rounded-xl bg-white/5 border border-amber-400/30 p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-amber-300/90 font-semibold">
                    Текущее настроение поездки
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    {snapshot.activeQuest.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{snapshot.activeQuest.subtitle}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200 text-xs font-mono-tabular font-semibold shrink-0">
                  +{snapshot.activeQuest.reward} ✦
                </span>
              </div>

              {(snapshot.activeQuest.progressPct > 0 || snapshot.activeQuest.distanceM !== null) && (
                <div className="flex items-center gap-2">
                  {snapshot.activeQuest.progressPct > 0 && (
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${snapshot.activeQuest.progressPct}%` }}
                      />
                    </div>
                  )}
                  <span className="text-[11px] font-mono-tabular text-slate-300">
                    {snapshot.activeQuest.distanceM !== null
                      ? `Дистанция: ${snapshot.activeQuest.distanceM} м`
                      : `${snapshot.activeQuest.progressPct}%`}
                  </span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onSkipQuest}
                  className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Другой маршрут</span>
                </button>
              </div>
            </div>
          )}

          {snapshot.availableQuests.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Другие маршруты без таймера</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {snapshot.availableQuests.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onSelectQuest(q.id)}
                    className="text-left p-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/10 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white truncate">{q.title}</span>
                      <span className="text-[11px] font-mono-tabular text-amber-300 shrink-0">
                        +{q.reward} ✦
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-2">{q.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {snapshot.cabinThemes.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Palette className="w-3.5 h-3.5 text-sky-300" />
                <span>Подсветка салона и номера</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {snapshot.cabinThemes.map((t) => {
                  const isActive = snapshot.cabinTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectCabinTheme(t.id)}
                      className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                        isActive
                          ? 'bg-white/15 border-amber-400/60 text-white'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: t.hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {isActive ? 'Активно' : t.unlocked ? 'Доступно' : `${t.cost} ✦`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cozy Roadside Aero-Cafe Order Menu */}
      {cafeOpen && (snapshot.interiorMode === 'cafe' || snapshot.nearbyCafeName) && !inSpace && !hudHidden && (
        <div
          className="relative z-10 pointer-events-auto self-center w-[min(500px,92vw)] max-h-[72dvh] overflow-y-auto touch-pan-y rounded-2xl bg-[#090d14]/95 border border-rose-300/25 shadow-2xl p-3.5 sm:p-4 flex flex-col gap-3 my-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-rose-300 shrink-0" />
                <h2 className="font-display text-sm sm:text-base font-semibold text-white truncate">
                  {snapshot.interiorLabel ?? snapshot.nearbyCafeName ?? 'Аэро-кафе'}
                </h2>
              </div>
              <p className="text-[11px] text-rose-200/80 mt-0.5">
                {snapshot.hasCompanion
                  ? 'Закажите напиток — чашки появятся прямо на вашем столике'
                  : 'Тихая пауза с чашкой тёплого кофе'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/35 text-xs font-mono-tabular text-amber-200">
                {snapshot.credits} ✦
              </span>
              <button
                type="button"
                onClick={onCloseCafe}
                className="min-h-[40px] min-w-[40px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center"
                aria-label="Закрыть меню кафе"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-white/5 rounded-xl p-2.5 border border-white/10">
            {getCafeSceneIntro(snapshot.biomeId, snapshot.timeOfDay, snapshot.activeWeather)}
          </p>

          {cafeReply && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 p-2.5 text-xs text-rose-100 leading-relaxed">
              {snapshot.hasCompanion
                ? cafeReply
                : 'Тёплый напиток и спокойный вид из панорамного окна возвращают силы перед дорогой.'}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {cafeMenu.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOrderInCafe(item.id)}
                className="w-full text-left p-2.5 rounded-xl bg-black/45 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">{item.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-tabular font-semibold shrink-0 ${
                    item.cost === 0
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                  }`}
                >
                  {item.cost === 0 ? 'Пауза' : `${item.cost} ✦`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact Atmosphere & Gyro Settings Drawer */}
      {settingsOpen && !hudHidden && (
        <div
          className="relative z-10 pointer-events-auto self-center w-[min(520px,92vw)] max-h-[70dvh] overflow-y-auto touch-pan-y rounded-2xl bg-[#090d14]/95 border border-white/15 shadow-2xl p-3.5 sm:p-4 flex flex-col gap-3 my-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">Управление и атмосфера</h2>
            <button
              type="button"
              onClick={onToggleSettings}
              className="min-h-[40px] min-w-[40px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center"
              aria-label="Закрыть настройки"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Рулевое управление</span>
              {gyroError && <span className="text-[11px] text-rose-300">{gyroError}</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
                <button
                  type="button"
                  onClick={() => onSelectSteeringMode('touch')}
                  className={`min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    steeringMode === 'touch'
                      ? 'bg-amber-500/25 text-amber-100 border border-amber-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  Сенсорный руль
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSteeringMode('gyro')}
                  disabled={!gyroSupported}
                  className={`min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-40 ${
                    steeringMode === 'gyro'
                      ? 'bg-sky-500/25 text-sky-100 border border-sky-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  Гироскоп (наклон)
                </button>
              </div>
              {steeringMode === 'gyro' && (
                <button
                  type="button"
                  onClick={onCalibrateGyro}
                  className="min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/15 text-xs font-medium text-white whitespace-nowrap shrink-0"
                >
                  Центр
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Время суток</span>
              <span className="text-xs font-mono-tabular text-slate-200">{snapshot.timeLabel}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectTimePreset(opt.id)}
                  className={`min-h-[40px] rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                    timePreset === opt.id
                      ? 'bg-amber-500/25 text-amber-100 border border-amber-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={snapshot.timeOfDay}
              onChange={(e) => onScrubTime(parseFloat(e.target.value))}
              aria-label="Ползунок времени суток"
              className="horizon-slider w-full py-2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">Погодные условия</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
              {WEATHER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectWeather(opt.id)}
                  className={`min-h-[40px] rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                    weatherSetting === opt.id
                      ? 'bg-sky-500/25 text-sky-100 border border-sky-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Время года</span>
              <span className="text-xs text-slate-200">{snapshot.seasonLabel}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
              {SEASON_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectSeason(opt.id)}
                  className={`min-h-[40px] rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                    seasonSetting === opt.id
                      ? 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-200">Спутница в салоне</span>
              <span className="text-[11px] text-slate-400">
                Попутчица на пассажирском сиденье рядом
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleCompanion}
              className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                snapshot.hasCompanion
                  ? 'bg-rose-500/25 border-rose-400/50 text-rose-100'
                  : 'bg-white/5 border-white/15 text-slate-300'
              }`}
            >
              {snapshot.hasCompanion ? 'Едет с вами' : 'Ехать одному'}
            </button>
          </div>

          {/* Standalone HTML Game Code Export */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-white truncate">Код игры для запуска в HTML</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/25 shrink-0">
                Offline .html
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Скопируйте полный исходный код или скачайте готовый <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">cyber_horizon.html</code>. Игра работает автономно в любом браузере на ПК или смартфоне без интернета и серверов.
            </p>

            {copyFeedback && (
              <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 p-2 text-xs text-amber-100 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{copyFeedback}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyHtml}
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  htmlCopied
                    ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100'
                    : 'bg-amber-500/20 border-amber-400/40 text-amber-100 hover:bg-amber-500/30'
                }`}
              >
                {htmlCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Скопировано в буфер!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-300" />
                    <span>Скопировать код (HTML)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="min-h-[44px] px-3 rounded-xl border border-sky-400/40 bg-sky-500/20 hover:bg-sky-500/30 text-sky-100 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4 text-sky-300" />
                <span>Скачать cyber_horizon.html</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Natural Thumb Reach Zone — Guaranteed zero horizontal overflow on Poco F6 */}
      {!hudHidden && (
        <div className="relative z-10 w-full flex flex-col gap-2 min-w-0">
          {/* Upper Action Strip on Portrait (< 640px) */}
          <div className="flex items-center justify-between gap-1 w-full sm:hidden min-w-0">
            <div className="pointer-events-auto flex items-center gap-1 flex-wrap min-w-0">
              {renderContextualButtons(true)}
            </div>

            {!isSeatedOrLying && (
              <div className="pointer-events-auto flex items-center gap-1 shrink-0">
                {showVerticalArrows && (
                  <>
                    <button
                      type="button"
                      onPointerDown={handleHoldStart('descend')}
                      onPointerUp={handleHoldEnd('descend')}
                      onPointerCancel={handleHoldEnd('descend')}
                      onLostPointerCapture={handleHoldEnd('descend')}
                      className={`min-h-[44px] min-w-[38px] rounded-xl border inline-flex items-center justify-center active:scale-95 transition-transform touch-none ${
                        pressedMap.descend
                          ? 'bg-sky-500/35 border-sky-400 text-white'
                          : 'bg-[#090d14]/84 border-white/16 text-slate-200'
                      }`}
                      aria-label="Снизиться"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onPointerDown={handleHoldStart('climb')}
                      onPointerUp={handleHoldEnd('climb')}
                      onPointerCancel={handleHoldEnd('climb')}
                      onLostPointerCapture={handleHoldEnd('climb')}
                      className={`min-h-[44px] min-w-[38px] rounded-xl border inline-flex items-center justify-center active:scale-95 transition-transform touch-none ${
                        pressedMap.climb
                          ? 'bg-sky-500/35 border-sky-400 text-white'
                          : 'bg-[#090d14]/84 border-white/16 text-slate-200'
                      }`}
                      aria-label="Подняться выше"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </>
                )}

                {!insideInterior && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onTriggerBoost();
                    }}
                    className={`relative overflow-hidden min-h-[44px] px-2.5 rounded-xl border inline-flex items-center justify-center gap-1 text-[11px] font-semibold active:scale-95 transition-transform touch-none whitespace-nowrap ${
                      boostActive
                        ? 'bg-amber-500/35 border-amber-300 text-white shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                        : 'bg-[#090d14]/84 border-white/16 text-amber-200'
                    }`}
                    aria-label={isWalking ? 'Бег' : 'Форсаж'}
                  >
                    {boostActive && (
                      <span
                        className="absolute left-0 bottom-0 top-0 bg-amber-400/25 pointer-events-none"
                        style={{ width: `${boostPct}%` }}
                      />
                    )}
                    <Zap className="relative z-10 w-3.5 h-3.5 shrink-0" />
                    <span
                      className={`relative z-10 ${
                        showVerticalArrows && !boostActive ? 'hidden min-[380px]:inline' : 'inline'
                      }`}
                    >
                      {boostActive
                        ? `${snapshot.boostRemainingSec.toFixed(1)}с`
                        : isWalking
                          ? 'Бег'
                          : 'Форсаж'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* When sitting or lying inside Café/Hotel, show calm look hint on landscape instead of driving pedals */}
          {isSeatedOrLying ? (
            <div
              className="pointer-events-auto hidden sm:flex items-center justify-center gap-2.5 flex-wrap w-full py-1"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {renderContextualButtons(false)}
            </div>
          ) : (
            /* Main Bottom Row: Left Steering Pad + Center Context on sm+ + Right Pedals */
            <div className="flex items-end justify-between gap-2 sm:gap-4 w-full min-w-0">
              {/* LEFT THUMB: Analog Slide/Tap Steering Pad or Gyroscope Bar */}
              <div className="pointer-events-auto flex flex-col items-start min-w-0 flex-1 sm:flex-initial">
                {steeringMode === 'touch' || isWalking ? (
                  <div
                    ref={steerPadRef}
                    onPointerDown={handleSteerDown}
                    onPointerMove={handleSteerMove}
                    onPointerUp={handleSteerUp}
                    onPointerCancel={handleSteerUp}
                    onLostPointerCapture={handleSteerUp}
                    className="relative w-full max-w-[164px] sm:w-[210px] sm:max-w-none h-[64px] rounded-2xl bg-[#090d14]/84 border border-white/16 shadow-xl touch-none select-none flex items-center justify-between px-3 cursor-ew-resize"
                    role="slider"
                    aria-label={isWalking ? 'Поворот камеры' : 'Поворот руля'}
                    aria-valuemin={-100}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(-steerVisual * 100)}
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400 pointer-events-none shrink-0" />
                    <div className="relative flex-1 mx-1.5 h-2 rounded-full bg-white/10 pointer-events-none">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/25" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-xl bg-amber-400/30 border border-amber-300/75 shadow"
                        style={{ left: `${knobPercent}%` }}
                      />
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 pointer-events-none shrink-0" />
                  </div>
                ) : (
                  <div
                    className="w-full max-w-[164px] sm:w-[196px] sm:max-w-none h-[64px] rounded-2xl bg-[#090d14]/84 border border-sky-400/30 shadow-xl px-3 flex flex-col justify-center gap-1.5"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[11px] text-sky-200">
                      <span className="inline-flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Наклон</span>
                      </span>
                      <button
                        type="button"
                        onClick={onCalibrateGyro}
                        className="px-2 py-1 rounded-md bg-white/10 text-[10px] text-white"
                      >
                        Центр
                      </button>
                    </div>
                    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                      <div
                        className="absolute top-0 bottom-0 w-4 -translate-x-1/2 rounded-full bg-sky-400"
                        style={{ left: `${knobPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CENTER THUMB (Landscape / Desktop sm+): Flight / Walk / Cafe / Hotel / Space Controls */}
              <div
                className="pointer-events-auto hidden sm:flex items-center justify-center flex-wrap gap-2 min-w-0"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {renderContextualButtons(false)}
              </div>

              {/* RIGHT THUMB: Brake & Gas Pedals (or Walk Back/Forward) + Boost/Alt above on sm+ */}
              <div className="pointer-events-auto flex flex-col items-end gap-2 shrink-0">
                {!insideInterior && (
                  <div className="hidden sm:flex items-center gap-2">
                    {showVerticalArrows && (
                      <>
                        <button
                          type="button"
                          onPointerDown={handleHoldStart('descend')}
                          onPointerUp={handleHoldEnd('descend')}
                          onPointerCancel={handleHoldEnd('descend')}
                          onLostPointerCapture={handleHoldEnd('descend')}
                          className={`min-h-[44px] min-w-[46px] px-2.5 rounded-xl border inline-flex items-center justify-center text-xs font-medium active:scale-95 transition-transform touch-none ${
                            pressedMap.descend
                              ? 'bg-sky-500/35 border-sky-400 text-white'
                              : 'bg-[#090d14]/84 border-white/16 text-slate-200'
                          }`}
                          aria-label="Снизиться"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onPointerDown={handleHoldStart('climb')}
                          onPointerUp={handleHoldEnd('climb')}
                          onPointerCancel={handleHoldEnd('climb')}
                          onLostPointerCapture={handleHoldEnd('climb')}
                          className={`min-h-[44px] min-w-[46px] px-2.5 rounded-xl border inline-flex items-center justify-center text-xs font-medium active:scale-95 transition-transform touch-none ${
                            pressedMap.climb
                              ? 'bg-sky-500/35 border-sky-400 text-white'
                              : 'bg-[#090d14]/84 border-white/16 text-slate-200'
                          }`}
                          aria-label="Подняться выше"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onTriggerBoost();
                      }}
                      className={`relative overflow-hidden min-h-[44px] px-3 rounded-xl border inline-flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-transform touch-none whitespace-nowrap ${
                        boostActive
                          ? 'bg-amber-500/35 border-amber-300 text-white shadow-[0_0_18px_rgba(245,158,11,0.38)]'
                          : 'bg-[#090d14]/84 border-white/16 text-amber-200'
                      }`}
                      aria-label={isWalking ? 'Бег' : 'Форсаж'}
                    >
                      {boostActive && (
                        <span
                          className="absolute left-0 bottom-0 top-0 bg-amber-400/25 pointer-events-none"
                          style={{ width: `${boostPct}%` }}
                        />
                      )}
                      <Zap className="relative z-10 w-3.5 h-3.5" />
                      <span className="relative z-10">
                        {boostActive
                          ? `${isWalking ? 'Бег' : 'Форсаж'} ${snapshot.boostRemainingSec.toFixed(1)}с`
                          : isWalking
                            ? 'Бег 4с'
                            : 'Форсаж 4с'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onPointerDown={handleHoldStart('brake')}
                    onPointerUp={handleHoldEnd('brake')}
                    onPointerCancel={handleHoldEnd('brake')}
                    onLostPointerCapture={handleHoldEnd('brake')}
                    className={`h-[64px] w-[62px] sm:w-[78px] rounded-2xl border text-xs font-semibold inline-flex items-center justify-center shadow-xl active:scale-95 transition-transform touch-none shrink-0 ${
                      pressedMap.brake
                        ? 'bg-rose-500/40 border-rose-400 text-white'
                        : 'bg-[#090d14]/84 border-white/16 text-slate-200'
                    }`}
                  >
                    <span>{isWalking ? 'Назад' : 'Тормоз'}</span>
                  </button>

                  <button
                    type="button"
                    onPointerDown={handleHoldStart('throttle')}
                    onPointerUp={handleHoldEnd('throttle')}
                    onPointerCancel={handleHoldEnd('throttle')}
                    onLostPointerCapture={handleHoldEnd('throttle')}
                    className={`h-[64px] w-[74px] sm:w-[92px] rounded-2xl border text-sm font-semibold inline-flex items-center justify-center shadow-xl active:scale-95 transition-transform touch-none shrink-0 ${
                      pressedMap.throttle
                        ? isWalking
                          ? 'bg-emerald-500/45 border-emerald-300 text-white'
                          : inSpace
                            ? 'bg-violet-500/45 border-violet-300 text-white'
                            : isAir
                              ? 'bg-sky-500/45 border-sky-300 text-white'
                              : 'bg-amber-500/45 border-amber-300 text-white'
                        : 'bg-[#090d14]/84 border-white/20 text-white'
                    }`}
                  >
                    <span>{isWalking ? 'Идти' : 'Газ'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
