import type {
  PlanetId,
  RpgEffectStyle,
  RpgEquipMap,
  RpgItem,
  RpgItemTarget,
  RpgOwnerTarget,
  RpgRarity,
  RpgSlot,
  RpgStateSnapshot,
  RpgStatsSummary,
  RpgWeaponKind,
} from '../types/simulation';

export interface RpgItemTemplate {
  templateId: string;
  name: string;
  slot: RpgSlot;
  rarity: RpgRarity;
  ownerTarget: RpgItemTarget;
  effectStyle?: RpgEffectStyle;
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

export const RPG_RARITY_META: Record<
  RpgRarity,
  { label: string; borderCls: string; bgCls: string; textCls: string; hex: string }
> = {
  common: {
    label: 'Обычный',
    borderCls: 'border-slate-400/35',
    bgCls: 'bg-slate-500/15',
    textCls: 'text-slate-200',
    hex: '#94a3b8',
  },
  epic: {
    label: 'Эпический',
    borderCls: 'border-sky-400/60',
    bgCls: 'bg-sky-500/18',
    textCls: 'text-sky-300',
    hex: '#38bdf8',
  },
  legendary: {
    label: 'Легендарный',
    borderCls: 'border-purple-400/70',
    bgCls: 'bg-purple-500/20',
    textCls: 'text-purple-300',
    hex: '#a855f7',
  },
  mythic: {
    label: 'Оранжевый Редкий',
    borderCls: 'border-orange-400/90 shadow-[0_0_18px_rgba(249,115,22,0.34)]',
    bgCls: 'bg-gradient-to-br from-orange-500/25 via-amber-500/15 to-rose-500/12',
    textCls: 'text-orange-300',
    hex: '#f97316',
  },
};

export const RPG_SLOT_LABELS: Record<RpgSlot, string> = {
  head: 'Голова',
  torso: 'Одежда',
  legs: 'Ноги',
  earrings: 'Серьги',
  weapon: 'Оружие',
  gadget: 'Модуль',
};

export const RPG_CATALOG: RpgItemTemplate[] = [
  // HEAD — PLAYER
  {
    templateId: 'cap_travel',
    name: 'Кепка путешественника',
    slot: 'head',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#334155',
    accentHex: '#94a3b8',
    hpBonus: 10,
    armorBonus: 4,
    damageBonus: 0,
    desc: 'Лёгкая городская кепка для прогулок.',
  },
  {
    templateId: 'visor_sunset',
    name: 'Визор «Закат»',
    slot: 'head',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#1e293b',
    accentHex: '#f59e0b',
    hpBonus: 12,
    armorBonus: 5,
    damageBonus: 2,
    desc: 'Тонкие очки с тёплым фильтром.',
  },
  {
    templateId: 'helm_neon',
    name: 'Шлем «Неон-Сити»',
    slot: 'head',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0f172a',
    accentHex: '#38bdf8',
    hpBonus: 26,
    armorBonus: 10,
    damageBonus: 4,
    desc: 'Эпический визор-шлем с голубой подсветкой.',
  },
  {
    templateId: 'helm_recon',
    name: 'Тактический визор «Спектр»',
    slot: 'head',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#1e293b',
    accentHex: '#60a5fa',
    hpBonus: 28,
    armorBonus: 11,
    damageBonus: 6,
    desc: 'Усиленный шлем разведчика с баллистическим целеуказанием.',
  },
  {
    templateId: 'helm_commander',
    name: 'Шлем Командора «Космос»',
    slot: 'head',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#3b0764',
    accentHex: '#a855f7',
    hpBonus: 45,
    armorBonus: 16,
    damageBonus: 8,
    desc: 'Легендарный шлем с фиолетовым силовым контуром.',
  },

  // HEAD — COMPANION
  {
    templateId: 'ribbon_silk',
    name: 'Ободок «Шёлковый Бриз»',
    slot: 'head',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#f5d0fe',
    accentHex: '#f472b6',
    hpBonus: 12,
    armorBonus: 4,
    damageBonus: 1,
    healBonus: 5,
    desc: 'Нежный аксессуар для прогулок с лёгкой заботой.',
  },
  {
    templateId: 'diadem_aurora',
    name: 'Диадема «Аврора»',
    slot: 'head',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#1e3a8a',
    accentHex: '#38bdf8',
    hpBonus: 24,
    armorBonus: 8,
    damageBonus: 3,
    healBonus: 8,
    desc: 'Изящный синий обруч, усиливающий лечение и облик.',
  },
  {
    templateId: 'tiara_sapphire',
    name: 'Тиара «Сапфировая Звезда»',
    slot: 'head',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0284c7',
    accentHex: '#7dd3fc',
    hpBonus: 26,
    armorBonus: 9,
    damageBonus: 4,
    healBonus: 10,
    desc: 'Сияющая небесная тиара, ускоряющая поддержку в бою.',
  },
  {
    templateId: 'crown_amethyst',
    name: 'Венец «Звёздный Аметист»',
    slot: 'head',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#4c1d95',
    accentHex: '#c084fc',
    hpBonus: 42,
    armorBonus: 14,
    damageBonus: 6,
    healBonus: 16,
    desc: 'Легендарное украшение с королевской аурой исцеления.',
  },

  // TORSO — PLAYER
  {
    templateId: 'jacket_pilot',
    name: 'Куртка пилота',
    slot: 'torso',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#334155',
    accentHex: '#f59e0b',
    hpBonus: 15,
    armorBonus: 6,
    damageBonus: 0,
    desc: 'Удобная повседневная куртка водителя автодома.',
  },
  {
    templateId: 'vest_courier',
    name: 'Штормовка «Горизонт»',
    slot: 'torso',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#475569',
    accentHex: '#38bdf8',
    hpBonus: 18,
    armorBonus: 7,
    damageBonus: 2,
    desc: 'Практичная городская куртка с усиленными швами.',
  },
  {
    templateId: 'coat_cobalt',
    name: 'Куртка «Кобальт-7»',
    slot: 'torso',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#1d4ed8',
    accentHex: '#38bdf8',
    hpBonus: 35,
    armorBonus: 14,
    damageBonus: 4,
    desc: 'Эпическая усиленная куртка синего отлива.',
  },
  {
    templateId: 'exo_vanguard',
    name: 'Экзо-куртка «Авангард»',
    slot: 'torso',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0f766e',
    accentHex: '#2dd4bf',
    hpBonus: 40,
    armorBonus: 15,
    damageBonus: 6,
    desc: 'Бронированный тактический корпус с энерго-пластинами.',
  },
  {
    templateId: 'armor_galaxy',
    name: 'Бронеплащ «Галактика»',
    slot: 'torso',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#6b21a8',
    accentHex: '#c084fc',
    hpBonus: 62,
    armorBonus: 22,
    damageBonus: 9,
    desc: 'Легендарный фиолетовый плащ космического стража.',
  },

  // TORSO — COMPANION
  {
    templateId: 'jacket_cream',
    name: 'Кремовая куртка',
    slot: 'torso',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#ebe4d7',
    accentHex: '#d7cebe',
    hpBonus: 15,
    armorBonus: 6,
    damageBonus: 0,
    healBonus: 4,
    desc: 'Мягкий светлый жакет для путешествий вдвоём.',
  },
  {
    templateId: 'dress_velvet',
    name: 'Платье «Нежный Шёлк»',
    slot: 'torso',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#fbcfe8',
    accentHex: '#f472b6',
    hpBonus: 18,
    armorBonus: 6,
    damageBonus: 2,
    healBonus: 7,
    desc: 'Лёгкий романтичный наряд в нежно-розовых тонах.',
  },
  {
    templateId: 'bomber_electra',
    name: 'Бомбер «Электро-блюз»',
    slot: 'torso',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0284c7',
    accentHex: '#7dd3fc',
    hpBonus: 32,
    armorBonus: 12,
    damageBonus: 5,
    healBonus: 9,
    desc: 'Стильная синяя куртка со встроенным микро-щитом.',
  },
  {
    templateId: 'dress_moonlight',
    name: 'Костюм «Лунная Валькирия»',
    slot: 'torso',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#312e81',
    accentHex: '#38bdf8',
    hpBonus: 36,
    armorBonus: 13,
    damageBonus: 6,
    healBonus: 12,
    desc: 'Элегантный голубой боевой костюм с наплечниками.',
  },
  {
    templateId: 'suit_stardust',
    name: 'Костюм «Аметистовая звезда»',
    slot: 'torso',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#7e22ce',
    accentHex: '#e879f9',
    hpBonus: 58,
    armorBonus: 20,
    damageBonus: 7,
    healBonus: 18,
    desc: 'Легендарный наряд, усиливающий боевую ауру и лечение.',
  },

  // LEGS — PLAYER & COMPANION
  {
    templateId: 'pants_road',
    name: 'Дорожные брюки',
    slot: 'legs',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#1e293b',
    accentHex: '#64748b',
    hpBonus: 10,
    armorBonus: 4,
    damageBonus: 0,
    desc: 'Прочные удобные брюки для долгих прогулок.',
  },
  {
    templateId: 'greaves_azure',
    name: 'Поножи «Лазурный шаг»',
    slot: 'legs',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#1e40af',
    accentHex: '#38bdf8',
    hpBonus: 24,
    armorBonus: 10,
    damageBonus: 3,
    desc: 'Эпические лёгкие синие брюки-поножи.',
  },
  {
    templateId: 'boots_titan',
    name: 'Ботинки «Звёздный Рывок»',
    slot: 'legs',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#4c1d95',
    accentHex: '#c084fc',
    hpBonus: 44,
    armorBonus: 17,
    damageBonus: 7,
    desc: 'Легендарная гравитационная обувь пилота.',
  },
  {
    templateId: 'skirt_boots',
    name: 'Юбка и сапоги',
    slot: 'legs',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#161926',
    accentHex: '#94a3b8',
    hpBonus: 10,
    armorBonus: 4,
    damageBonus: 0,
    desc: 'Классический стиль спутницы.',
  },
  {
    templateId: 'boots_cryo_heel',
    name: 'Ботфорты «Крио-Лёд»',
    slot: 'legs',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0369a1',
    accentHex: '#7dd3fc',
    hpBonus: 24,
    armorBonus: 9,
    damageBonus: 3,
    healBonus: 6,
    desc: 'Элегантные высокие синие сапоги с крио-подсветкой.',
  },
  {
    templateId: 'boots_selene',
    name: 'Сапоги «Селена»',
    slot: 'legs',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#581c87',
    accentHex: '#a855f7',
    hpBonus: 42,
    armorBonus: 16,
    damageBonus: 6,
    healBonus: 8,
    desc: 'Легендарные фиолетовые сапоги с силовой отделкой.',
  },

  // GADGETS — PLAYER & COMPANION
  {
    templateId: 'chip_shield',
    name: 'Модуль «Искра-Щит»',
    slot: 'gadget',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#475569',
    accentHex: '#94a3b8',
    hpBonus: 12,
    armorBonus: 5,
    damageBonus: 2,
    desc: 'Простой генератор лёгкой защиты.',
  },
  {
    templateId: 'core_kinetic',
    name: 'Реактор «Кинетик-Про»',
    slot: 'gadget',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0284c7',
    accentHex: '#38bdf8',
    hpBonus: 28,
    armorBonus: 11,
    damageBonus: 7,
    desc: 'Силовой модуль, повышающий щиты и мощь бластера.',
  },
  {
    templateId: 'aura_aegis',
    name: 'Генератор «Эгида»',
    slot: 'gadget',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#6d28d9',
    accentHex: '#c084fc',
    hpBonus: 48,
    armorBonus: 15,
    damageBonus: 9,
    healBonus: 12,
    desc: 'Легендарный фиолетовый амулет хранителя.',
  },
  {
    templateId: 'band_care',
    name: 'Мед-браслет «Забота»',
    slot: 'gadget',
    rarity: 'common',
    ownerTarget: 'both',
    colorHex: '#10b981',
    accentHex: '#6ee7b7',
    hpBonus: 8,
    armorBonus: 2,
    damageBonus: 0,
    healBonus: 10,
    desc: 'Помогает спутнице быстрее лечить вас.',
  },
  {
    templateId: 'core_aqua',
    name: 'Аква-реактор щита',
    slot: 'gadget',
    rarity: 'epic',
    ownerTarget: 'both',
    colorHex: '#0369a1',
    accentHex: '#38bdf8',
    hpBonus: 26,
    armorBonus: 10,
    damageBonus: 5,
    healBonus: 15,
    desc: 'Эпический синий модуль здоровья и защиты спутницы.',
  },
  {
    templateId: 'halo_angel',
    name: 'Крылья-модуль «Серафим»',
    slot: 'gadget',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#7e22ce',
    accentHex: '#f0abfc',
    hpBonus: 44,
    armorBonus: 14,
    damageBonus: 8,
    healBonus: 24,
    desc: 'Световой нимб-модуль, превращающий спутницу в мощного хиллера.',
  },

  // WEAPONS: BLASTERS (PLAYER)
  {
    templateId: 'blaster_spark',
    name: 'Карманный бластер «Искра»',
    slot: 'weapon',
    rarity: 'common',
    ownerTarget: 'player',
    weaponKind: 'blaster',
    colorHex: '#475569',
    accentHex: '#38bdf8',
    hpBonus: 0,
    armorBonus: 0,
    damageBonus: 18,
    desc: 'Компактный плазменный бластер для самообороны.',
  },
  {
    templateId: 'blaster_street',
    name: 'Бластер «Янтарь»',
    slot: 'weapon',
    rarity: 'common',
    ownerTarget: 'player',
    weaponKind: 'blaster',
    colorHex: '#78350f',
    accentHex: '#f59e0b',
    hpBonus: 0,
    armorBonus: 0,
    damageBonus: 22,
    desc: 'Надёжный уличный бластер с тёплым лучом.',
  },
  {
    templateId: 'blaster_comet',
    name: 'Бластер «Комета»',
    slot: 'weapon',
    rarity: 'epic',
    ownerTarget: 'player',
    weaponKind: 'blaster',
    colorHex: '#0284c7',
    accentHex: '#38bdf8',
    hpBonus: 8,
    armorBonus: 0,
    damageBonus: 34,
    desc: 'Эпический синий импульсный бластер.',
  },
  {
    templateId: 'blaster_pulse_heavy',
    name: 'Карабин «Синий Шторм»',
    slot: 'weapon',
    rarity: 'epic',
    ownerTarget: 'player',
    weaponKind: 'blaster',
    colorHex: '#1d4ed8',
    accentHex: '#60a5fa',
    hpBonus: 12,
    armorBonus: 2,
    damageBonus: 38,
    desc: 'Скорострельный плазменный карабин спецотряда.',
  },
  {
    templateId: 'blaster_aurora',
    name: 'Плазмоган «Аврора-Х»',
    slot: 'weapon',
    rarity: 'legendary',
    ownerTarget: 'player',
    weaponKind: 'blaster',
    colorHex: '#7e22ce',
    accentHex: '#c084fc',
    hpBonus: 15,
    armorBonus: 4,
    damageBonus: 52,
    desc: 'Легендарный фиолетовый бластер высокой мощности.',
  },

  // EARRINGS — COMPANION ONLY
  {
    templateId: 'earrings_pearl',
    name: 'Жемчужные серьги «Луна»',
    slot: 'earrings',
    rarity: 'common',
    ownerTarget: 'companion',
    colorHex: '#f8fafc',
    accentHex: '#fde68a',
    hpBonus: 10,
    armorBonus: 3,
    damageBonus: 2,
    healBonus: 6,
    desc: 'Изящные серьги для спутницы, усиливающие лечение и стойкость.',
  },
  {
    templateId: 'earrings_sapphire',
    name: 'Серьги «Сапфировая Капля»',
    slot: 'earrings',
    rarity: 'epic',
    ownerTarget: 'companion',
    colorHex: '#0284c7',
    accentHex: '#38bdf8',
    hpBonus: 22,
    armorBonus: 7,
    damageBonus: 6,
    healBonus: 12,
    desc: 'Эпические голубые серьги с сиянием сапфиров.',
  },
  {
    templateId: 'earrings_amethyst',
    name: 'Серьги «Аметистовое Сияние»',
    slot: 'earrings',
    rarity: 'legendary',
    ownerTarget: 'companion',
    colorHex: '#7e22ce',
    accentHex: '#e879f9',
    hpBonus: 38,
    armorBonus: 12,
    damageBonus: 11,
    healBonus: 20,
    desc: 'Легендарные серьги с фиолетовыми кристаллами и сильной аурой хиллера.',
  },
  {
    templateId: 'earrings_phoenix',
    name: 'Серьги «Огонь Феникса»',
    slot: 'earrings',
    rarity: 'mythic',
    ownerTarget: 'companion',
    effectStyle: 'solar',
    colorHex: '#f97316',
    accentHex: '#fde047',
    hpBonus: 68,
    armorBonus: 18,
    damageBonus: 18,
    healBonus: 34,
    isUnique: true,
    desc: 'Редкие оранжевые серьги спутницы с солнечными искрами и мощным лечением.',
  },

  // WEAPONS: LIGHTSABERS (COMPANION ONLY)
  {
    templateId: 'saber_train',
    name: 'Световой меч «Искра»',
    slot: 'weapon',
    rarity: 'common',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#38bdf8',
    accentHex: '#7dd3fc',
    hpBonus: 5,
    armorBonus: 2,
    damageBonus: 24,
    desc: 'Базовый световой меч спутницы с голубым клинком.',
  },
  {
    templateId: 'saber_companion_rose',
    name: 'Клинок спутницы «Алая Роза»',
    slot: 'weapon',
    rarity: 'epic',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#fb7185',
    accentHex: '#fda4af',
    hpBonus: 15,
    armorBonus: 5,
    damageBonus: 36,
    healBonus: 10,
    desc: 'Изящный розовый клинок защиты для вашей спутницы.',
  },
  {
    templateId: 'saber_kryos',
    name: 'Световой меч «Криос»',
    slot: 'weapon',
    rarity: 'epic',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#38bdf8',
    accentHex: '#bae6fd',
    hpBonus: 16,
    armorBonus: 6,
    damageBonus: 38,
    desc: 'Эпический ледяной голубой клинок с планеты Неон-Криос.',
  },
  {
    templateId: 'saber_verdant',
    name: 'Световой меч «Вердана»',
    slot: 'weapon',
    rarity: 'epic',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#34d399',
    accentHex: '#6ee7b7',
    hpBonus: 18,
    armorBonus: 6,
    damageBonus: 38,
    healBonus: 14,
    desc: 'Эпический изумрудный клинок с гармонией жизни.',
  },
  {
    templateId: 'saber_solaris',
    name: 'Световой меч «Солярис»',
    slot: 'weapon',
    rarity: 'epic',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#fbbf24',
    accentHex: '#fde047',
    hpBonus: 14,
    armorBonus: 5,
    damageBonus: 42,
    desc: 'Эпический солнечный клинок из золотых каньонов.',
  },
  {
    templateId: 'saber_amethyst',
    name: 'Световой меч «Аметист»',
    slot: 'weapon',
    rarity: 'legendary',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#a855f7',
    accentHex: '#e879f9',
    hpBonus: 30,
    armorBonus: 10,
    damageBonus: 56,
    healBonus: 14,
    desc: 'Легендарный фиолетовый световой меч редкой чистоты.',
  },
  {
    templateId: 'saber_horizon',
    name: 'Световой меч «Горизонт Души»',
    slot: 'weapon',
    rarity: 'legendary',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#c084fc',
    accentHex: '#f0abfc',
    hpBonus: 36,
    armorBonus: 12,
    damageBonus: 64,
    healBonus: 10,
    desc: 'Легендарный фиолетовый клинок странника галактик.',
  },

  // UNIQUE BOSS ITEMS (LEGENDARY PURPLE — WEARABLES FIT BOTH)
  {
    templateId: 'boss_helm_overlord',
    name: 'Шлем «Владыка Тени»',
    slot: 'head',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#4c1d95',
    accentHex: '#e879f9',
    hpBonus: 68,
    armorBonus: 22,
    damageBonus: 12,
    isUnique: true,
    desc: 'Уникальный трофей главного босса с силовой короной. Подходит обоим персонажам.',
  },
  {
    templateId: 'boss_coat_sovereign',
    name: 'Бронеплащ «Звёздный Суверен»',
    slot: 'torso',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#581c87',
    accentHex: '#f0abfc',
    hpBonus: 88,
    armorBonus: 28,
    damageBonus: 14,
    healBonus: 14,
    isUnique: true,
    desc: 'Уникальный боевой плащ главаря синдиката. Подходит обоим персонажам.',
  },
  {
    templateId: 'boss_boots_phantom',
    name: 'Сапоги «Фантом Прыжка»',
    slot: 'legs',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#3b0764',
    accentHex: '#c084fc',
    hpBonus: 58,
    armorBonus: 20,
    damageBonus: 10,
    healBonus: 10,
    isUnique: true,
    desc: 'Уникальные грави-сапоги с фиолетовым шлейфом. Подходят обоим персонажам.',
  },
  {
    templateId: 'boss_blaster_nova',
    name: 'Плазмобластер «Сверхновая Босса»',
    slot: 'weapon',
    rarity: 'legendary',
    ownerTarget: 'player',
    weaponKind: 'blaster',
    colorHex: '#6d28d9',
    accentHex: '#e879f9',
    hpBonus: 24,
    armorBonus: 8,
    damageBonus: 68,
    isUnique: true,
    desc: 'Уникальный перегруженный бластер для игрока, выбитый из босса.',
  },
  {
    templateId: 'boss_saber_eclipse',
    name: 'Световой меч «Затмение Босса»',
    slot: 'weapon',
    rarity: 'legendary',
    ownerTarget: 'companion',
    weaponKind: 'lightsaber',
    colorHex: '#a855f7',
    accentHex: '#f5d0fe',
    hpBonus: 42,
    armorBonus: 14,
    damageBonus: 76,
    healBonus: 16,
    isUnique: true,
    desc: 'Уникальный фиолетовый клинок тёмного командира для спутницы.',
  },
  {
    templateId: 'boss_core_immortal',
    name: 'Артефакт «Сердце Небес»',
    slot: 'gadget',
    rarity: 'legendary',
    ownerTarget: 'both',
    colorHex: '#7e22ce',
    accentHex: '#f0abfc',
    hpBonus: 64,
    armorBonus: 18,
    damageBonus: 14,
    healBonus: 26,
    isUnique: true,
    desc: 'Уникальный модуль босса: мощная защита и ускоренное исцеление. Подходит обоим.',
  },

  // RARE ORANGE MYTHIC ITEMS (BOSS / MONSTER / SPECIAL QUESTS ONLY — WEARABLES FIT BOTH)
  {
    templateId: 'mythic_coat_phoenix',
    name: 'Плащ Феникса «Огненный Горизонт»',
    slot: 'torso',
    rarity: 'mythic',
    ownerTarget: 'both',
    effectStyle: 'ember',
    colorHex: '#c2410c',
    accentHex: '#fb923c',
    hpBonus: 120,
    armorBonus: 34,
    damageBonus: 22,
    healBonus: 18,
    isUnique: true,
    desc: 'Редкий оранжевый бронеплащ с вихрем пламени. Подходит обоим персонажам.',
  },
  {
    templateId: 'mythic_blaster_solar',
    name: 'Пушка «Солнечный Шторм»',
    slot: 'weapon',
    rarity: 'mythic',
    ownerTarget: 'player',
    effectStyle: 'solar',
    weaponKind: 'blaster',
    colorHex: '#ea580c',
    accentHex: '#fdba74',
    hpBonus: 40,
    armorBonus: 12,
    damageBonus: 92,
    isUnique: true,
    desc: 'Редкий оранжевый гипер-бластер игрока с солнечной вспышкой.',
  },
  {
    templateId: 'mythic_helm_nova',
    name: 'Шлем «Корона Сверхновой»',
    slot: 'head',
    rarity: 'mythic',
    ownerTarget: 'both',
    effectStyle: 'nova',
    colorHex: '#9a3412',
    accentHex: '#fb923c',
    hpBonus: 95,
    armorBonus: 28,
    damageBonus: 18,
    healBonus: 14,
    isUnique: true,
    desc: 'Редкий оранжевый шлем со светящимся ореолом сверхновой. Подходит обоим.',
  },
  {
    templateId: 'mythic_boots_magma',
    name: 'Ботинки «Огненный Шаг»',
    slot: 'legs',
    rarity: 'mythic',
    ownerTarget: 'both',
    effectStyle: 'ember',
    colorHex: '#7c2d12',
    accentHex: '#f97316',
    hpBonus: 82,
    armorBonus: 24,
    damageBonus: 16,
    healBonus: 12,
    isUnique: true,
    desc: 'Редкие оранжевые грави-ботинки с огненной аурой. Подходят обоим.',
  },
  {
    templateId: 'mythic_dress_solstice',
    name: 'Наряд «Заря Галактики»',
    slot: 'torso',
    rarity: 'mythic',
    ownerTarget: 'both',
    effectStyle: 'solar',
    colorHex: '#ea580c',
    accentHex: '#fde047',
    hpBonus: 108,
    armorBonus: 30,
    damageBonus: 18,
    healBonus: 30,
    isUnique: true,
    desc: 'Редкий оранжевый наряд с сияющей мантией и огненной аурой. Подходит обоим.',
  },
  {
    templateId: 'mythic_crown_seraph',
    name: 'Корона «Огненный Рассвет»',
    slot: 'head',
    rarity: 'mythic',
    ownerTarget: 'both',
    effectStyle: 'nova',
    colorHex: '#c2410c',
    accentHex: '#fed7aa',
    hpBonus: 86,
    armorBonus: 24,
    damageBonus: 14,
    healBonus: 26,
    isUnique: true,
    desc: 'Сияющая оранжевая корона с ореолом звёздного света. Подходит обоим.',
  },
  {
    templateId: 'mythic_halo_phoenix',
    name: 'Нимб «Сердце Солнца»',
    slot: 'gadget',
    rarity: 'mythic',
    ownerTarget: 'both',
    effectStyle: 'solar',
    colorHex: '#f97316',
    accentHex: '#fef08a',
    hpBonus: 92,
    armorBonus: 26,
    damageBonus: 20,
    healBonus: 38,
    isUnique: true,
    desc: 'Редкий оранжевый артефакт с орбитальными огненными искрами. Подходит обоим.',
  },
  {
    templateId: 'mythic_saber_sunfire',
    name: 'Клинок «Пламя Сверхновой»',
    slot: 'weapon',
    rarity: 'mythic',
    ownerTarget: 'companion',
    effectStyle: 'ember',
    weaponKind: 'lightsaber',
    colorHex: '#f97316',
    accentHex: '#fde047',
    hpBonus: 60,
    armorBonus: 16,
    damageBonus: 96,
    healBonus: 24,
    isUnique: true,
    desc: 'Редкий оранжевый световой меч спутницы с огненным сиянием.',
  },
];

let uidCounter = 1;

export function canEquipOnTarget(item: RpgItem, target: RpgOwnerTarget): boolean {
  if (item.slot === 'earrings') {
    return target === 'companion';
  }
  if (item.slot === 'weapon') {
    if (item.weaponKind === 'blaster') return target === 'player';
    if (item.weaponKind === 'lightsaber') return target === 'companion';
  }
  return true;
}

export function isSharedWearable(item: RpgItem): boolean {
  return (
    item.slot === 'head' ||
    item.slot === 'torso' ||
    item.slot === 'legs' ||
    item.slot === 'gadget'
  );
}

export function inferOwnerTarget(item: RpgItem): RpgOwnerTarget {
  if (item.slot === 'earrings' || item.weaponKind === 'lightsaber') {
    return 'companion';
  }
  if (item.weaponKind === 'blaster') {
    return 'player';
  }
  if (item.ownerTarget === 'player' || item.ownerTarget === 'companion') {
    return item.ownerTarget;
  }
  const n = item.name.toLowerCase();
  if (
    n.includes('диадем') ||
    n.includes('венец') ||
    n.includes('корон') ||
    n.includes('плать') ||
    n.includes('юбк') ||
    n.includes('сапог') ||
    n.includes('ботфор') ||
    n.includes('мед-') ||
    n.includes('нимб') ||
    n.includes('крылья') ||
    n.includes('спутниц') ||
    n.includes('серьг') ||
    (item.healBonus ?? 0) >= 8
  ) {
    return 'companion';
  }
  return 'player';
}

export function createRpgItemFromTemplate(templateId: string): RpgItem {
  const tpl = RPG_CATALOG.find((t) => t.templateId === templateId) ?? RPG_CATALOG[0];
  return {
    uid: `rpg_${Date.now().toString(36)}_${uidCounter++}_${Math.floor(Math.random() * 999)}`,
    templateId: tpl.templateId,
    name: tpl.name,
    slot: tpl.slot,
    rarity: tpl.rarity,
    ownerTarget: tpl.ownerTarget,
    effectStyle: tpl.effectStyle,
    weaponKind: tpl.weaponKind,
    colorHex: tpl.colorHex,
    accentHex: tpl.accentHex,
    hpBonus: tpl.hpBonus,
    armorBonus: tpl.armorBonus,
    damageBonus: tpl.damageBonus,
    healBonus: tpl.healBonus,
    isUnique: tpl.isUnique,
    desc: tpl.desc,
  };
}

export function createMythicOrangeLoot(preferredOwner?: RpgOwnerTarget): RpgItem {
  const pool = RPG_CATALOG.filter(
    (t) =>
      t.rarity === 'mythic' &&
      (!preferredOwner || t.ownerTarget === 'both' || t.ownerTarget === preferredOwner),
  );
  const fallback = RPG_CATALOG.filter((t) => t.rarity === 'mythic');
  const list = pool.length > 0 ? pool : fallback;
  const pick = list[Math.floor(Math.random() * list.length)] ?? RPG_CATALOG[0];
  return createRpgItemFromTemplate(pick.templateId);
}

export function createUniqueBossLoot(): RpgItem {
  // Bounty bosses always drop unique loot; 45% chance to drop rare orange mythic!
  if (Math.random() < 0.45) {
    return createMythicOrangeLoot();
  }
  const bossPool = RPG_CATALOG.filter((t) => t.isUnique && t.rarity === 'legendary');
  const pick = bossPool[Math.floor(Math.random() * bossPool.length)] ?? bossPool[0];
  return createRpgItemFromTemplate(pick.templateId);
}

export function createEmptyEquipMap(): RpgEquipMap {
  return {
    head: null,
    torso: null,
    legs: null,
    earrings: null,
    weapon: null,
    gadget: null,
  };
}

export function createStarterRpgData(): {
  hp: number;
  playerInventory: RpgItem[];
  companionInventory: RpgItem[];
  playerEquipped: RpgEquipMap;
  companionEquipped: RpgEquipMap;
} {
  const playerEquipped: RpgEquipMap = {
    head: null,
    torso: createRpgItemFromTemplate('jacket_pilot'),
    legs: createRpgItemFromTemplate('pants_road'),
    earrings: null,
    weapon: createRpgItemFromTemplate('blaster_spark'),
    gadget: null,
  };

  const companionEquipped: RpgEquipMap = {
    head: null,
    torso: createRpgItemFromTemplate('jacket_cream'),
    legs: createRpgItemFromTemplate('skirt_boots'),
    earrings: null,
    weapon: null,
    gadget: createRpgItemFromTemplate('band_care'),
  };

  const playerInventory: RpgItem[] = [
    createRpgItemFromTemplate('cap_travel'),
  ];

  const companionInventory: RpgItem[] = [
    createRpgItemFromTemplate('saber_train'),
    createRpgItemFromTemplate('earrings_pearl'),
    createRpgItemFromTemplate('ribbon_silk'),
  ];

  return {
    hp: 125,
    playerInventory,
    companionInventory,
    playerEquipped,
    companionEquipped,
  };
}

export function computeRpgStats(
  equipped: RpgEquipMap,
  companionEquipped?: RpgEquipMap,
): RpgStatsSummary {
  let maxHp = 100;
  let armorPct = 0;
  let attackDmg = 12;
  let weaponKind: RpgWeaponKind = 'fists';
  let weaponColor = '#f59e0b';
  let healPower = 28;

  const slots: RpgSlot[] = ['head', 'torso', 'legs', 'earrings', 'weapon', 'gadget'];
  for (const s of slots) {
    const item = equipped[s];
    if (!item) continue;
    maxHp += item.hpBonus;
    armorPct += item.armorBonus;
    attackDmg += item.damageBonus;
    healPower += item.healBonus ?? 0;
    if (s === 'weapon' && item.weaponKind) {
      weaponKind = item.weaponKind;
      weaponColor = item.weaponKind === 'lightsaber' ? item.colorHex : item.accentHex;
    }
  }

  if (companionEquipped) {
    for (const s of slots) {
      const cItem = companionEquipped[s];
      if (!cItem) continue;
      healPower += cItem.healBonus ?? 0;
      if (s === 'gadget' || s === 'earrings') {
        maxHp += Math.round(cItem.hpBonus * 0.5);
      }
    }
  }

  return {
    maxHp,
    armorPct: Math.min(72, armorPct),
    attackDmg,
    weaponKind,
    weaponColor,
    healPower,
  };
}

export function createDefaultRpgState(): RpgStateSnapshot {
  const starter = createStarterRpgData();
  const playerStats = computeRpgStats(starter.playerEquipped, starter.companionEquipped);
  const companionStats = computeRpgStats(starter.companionEquipped);
  return {
    hp: starter.hp,
    maxHp: playerStats.maxHp,
    walkStreakSec: 0,
    playerInventory: starter.playerInventory,
    companionInventory: starter.companionInventory,
    playerEquipped: starter.playerEquipped,
    companionEquipped: starter.companionEquipped,
    playerStats,
    companionStats,
    weaponHolstered: false,
    gopniksActive: 0,
    rallyActiveCount: 0,
    rallyTotalCount: 10,
    policeWanted: false,
    policeOfficersAlive: 0,
    policeEscapeProgress: 0,
    policeDispatchSec: 0,
    bountyBossActive: false,
    bountyBossHp: 0,
    bountyBossMaxHp: 5200,
    planetMonsterActive: false,
    planetMonsterHp: 0,
    planetMonsterMaxHp: 8400,
    planetMonsterAlert: null,
    activeThreatLabel: null,
    nearbySaberName: null,
  };
}

export function rollLootDrop(source: 'gopnik' | 'police' | 'rally' | 'pedestrian'): RpgItem | null {
  const dropChance =
    source === 'police'
      ? 0.72
      : source === 'rally'
        ? 0.65
        : source === 'gopnik'
          ? 0.52
          : 0.25;

  if (Math.random() > dropChance) return null;

  const r = Math.random();
  let targetRarity: RpgRarity = 'common';
  // NOTE: 'mythic' (rare orange) NEVER drops from normal enemies/pedestrians!
  if (source === 'police' || source === 'rally') {
    targetRarity = r > 0.74 ? 'legendary' : r > 0.34 ? 'epic' : 'common';
  } else if (source === 'gopnik') {
    targetRarity = r > 0.84 ? 'legendary' : r > 0.45 ? 'epic' : 'common';
  } else {
    targetRarity = r > 0.86 ? 'epic' : 'common';
  }

  const pool = RPG_CATALOG.filter(
    (t) =>
      !t.isUnique &&
      t.rarity !== 'mythic' &&
      t.rarity === targetRarity &&
      (source === 'gopnik' ? t.weaponKind !== 'lightsaber' : true),
  );
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? RPG_CATALOG[0];
  return createRpgItemFromTemplate(pick.templateId);
}

export function getLightsaberForPlanet(planetId: PlanetId): RpgItemTemplate {
  if (planetId === 'kryos') {
    return RPG_CATALOG.find((t) => t.templateId === 'saber_kryos')!;
  }
  if (planetId === 'verdant') {
    return RPG_CATALOG.find((t) => t.templateId === 'saber_verdant')!;
  }
  if (planetId === 'solaris') {
    return RPG_CATALOG.find((t) => t.templateId === 'saber_solaris')!;
  }
  if (planetId === 'amethyst') {
    return RPG_CATALOG.find((t) => t.templateId === 'saber_amethyst')!;
  }
  if (planetId === 'crimson' || planetId === 'earth') {
    return RPG_CATALOG.find((t) => t.templateId === 'saber_horizon')!;
  }
  return RPG_CATALOG.find((t) => t.templateId === 'saber_kryos')!;
}
