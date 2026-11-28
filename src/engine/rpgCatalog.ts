import type {
  PlanetId,
  RpgEquipMap,
  RpgItem,
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
};

export const RPG_SLOT_LABELS: Record<RpgSlot, string> = {
  head: 'Голова',
  torso: 'Одежда',
  legs: 'Ноги',
  weapon: 'Оружие',
  gadget: 'Модуль',
};

export const RPG_CATALOG: RpgItemTemplate[] = [
  // HEAD
  {
    templateId: 'cap_travel',
    name: 'Кепка путешественника',
    slot: 'head',
    rarity: 'common',
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
    colorHex: '#0f172a',
    accentHex: '#38bdf8',
    hpBonus: 26,
    armorBonus: 10,
    damageBonus: 4,
    desc: 'Эпический визор-шлем с голубой подсветкой.',
  },
  {
    templateId: 'diadem_aurora',
    name: 'Диадема «Аврора»',
    slot: 'head',
    rarity: 'epic',
    colorHex: '#1e3a8a',
    accentHex: '#38bdf8',
    hpBonus: 24,
    armorBonus: 8,
    damageBonus: 3,
    healBonus: 6,
    desc: 'Изящный синий обруч, усиливающий лечение.',
  },
  {
    templateId: 'helm_commander',
    name: 'Шлем Командора «Космос»',
    slot: 'head',
    rarity: 'legendary',
    colorHex: '#3b0764',
    accentHex: '#a855f7',
    hpBonus: 45,
    armorBonus: 16,
    damageBonus: 8,
    desc: 'Легендарный шлем с фиолетовым силовым контуром.',
  },
  {
    templateId: 'crown_amethyst',
    name: 'Венец «Звёздный Аметист»',
    slot: 'head',
    rarity: 'legendary',
    colorHex: '#4c1d95',
    accentHex: '#c084fc',
    hpBonus: 42,
    armorBonus: 14,
    damageBonus: 6,
    healBonus: 14,
    desc: 'Легендарное украшение с аурой исцеления.',
  },

  // TORSO
  {
    templateId: 'jacket_pilot',
    name: 'Куртка пилота',
    slot: 'torso',
    rarity: 'common',
    colorHex: '#334155',
    accentHex: '#f59e0b',
    hpBonus: 15,
    armorBonus: 6,
    damageBonus: 0,
    desc: 'Удобная повседневная куртка водителя автодома.',
  },
  {
    templateId: 'jacket_cream',
    name: 'Кремовая куртка',
    slot: 'torso',
    rarity: 'common',
    colorHex: '#ebe4d7',
    accentHex: '#d7cebe',
    hpBonus: 15,
    armorBonus: 6,
    damageBonus: 0,
    healBonus: 4,
    desc: 'Мягкий светлый жакет для путешествий вдвоём.',
  },
  {
    templateId: 'coat_cobalt',
    name: 'Куртка «Кобальт-7»',
    slot: 'torso',
    rarity: 'epic',
    colorHex: '#1d4ed8',
    accentHex: '#38bdf8',
    hpBonus: 35,
    armorBonus: 14,
    damageBonus: 4,
    desc: 'Эпическая усиленная куртка синего отлива.',
  },
  {
    templateId: 'bomber_electra',
    name: 'Бомбер «Электро-блюз»',
    slot: 'torso',
    rarity: 'epic',
    colorHex: '#0284c7',
    accentHex: '#7dd3fc',
    hpBonus: 32,
    armorBonus: 12,
    damageBonus: 5,
    healBonus: 7,
    desc: 'Стильная синяя куртка со встроенным микро-щитом.',
  },
  {
    templateId: 'armor_galaxy',
    name: 'Бронеплащ «Галактика»',
    slot: 'torso',
    rarity: 'legendary',
    colorHex: '#6b21a8',
    accentHex: '#c084fc',
    hpBonus: 62,
    armorBonus: 22,
    damageBonus: 9,
    desc: 'Легендарный фиолетовый плащ космического стража.',
  },
  {
    templateId: 'suit_stardust',
    name: 'Костюм «Аметистовая звезда»',
    slot: 'torso',
    rarity: 'legendary',
    colorHex: '#7e22ce',
    accentHex: '#e879f9',
    hpBonus: 58,
    armorBonus: 20,
    damageBonus: 7,
    healBonus: 16,
    desc: 'Легендарный наряд, усиливающий боевую ауру и лечение.',
  },

  // LEGS
  {
    templateId: 'pants_road',
    name: 'Дорожные брюки',
    slot: 'legs',
    rarity: 'common',
    colorHex: '#1e293b',
    accentHex: '#64748b',
    hpBonus: 10,
    armorBonus: 4,
    damageBonus: 0,
    desc: 'Прочные удобные брюки для долгих прогулок.',
  },
  {
    templateId: 'skirt_boots',
    name: 'Юбка и сапоги',
    slot: 'legs',
    rarity: 'common',
    colorHex: '#161926',
    accentHex: '#94a3b8',
    hpBonus: 10,
    armorBonus: 4,
    damageBonus: 0,
    desc: 'Классический стиль спутницы.',
  },
  {
    templateId: 'greaves_azure',
    name: 'Поножи «Лазурный шаг»',
    slot: 'legs',
    rarity: 'epic',
    colorHex: '#1e40af',
    accentHex: '#38bdf8',
    hpBonus: 24,
    armorBonus: 10,
    damageBonus: 3,
    desc: 'Эпические лёгкие синие брюки-поножи.',
  },
  {
    templateId: 'boots_selene',
    name: 'Сапоги «Селена»',
    slot: 'legs',
    rarity: 'legendary',
    colorHex: '#581c87',
    accentHex: '#a855f7',
    hpBonus: 42,
    armorBonus: 16,
    damageBonus: 6,
    healBonus: 6,
    desc: 'Легендарные фиолетовые сапоги и брюки.',
  },

  // GADGETS
  {
    templateId: 'band_care',
    name: 'Мед-браслет «Забота»',
    slot: 'gadget',
    rarity: 'common',
    colorHex: '#10b981',
    accentHex: '#6ee7b7',
    hpBonus: 8,
    armorBonus: 2,
    damageBonus: 0,
    healBonus: 8,
    desc: 'Помогает спутнице быстрее лечить вас.',
  },
  {
    templateId: 'chip_shield',
    name: 'Модуль «Искра-Щит»',
    slot: 'gadget',
    rarity: 'common',
    colorHex: '#475569',
    accentHex: '#94a3b8',
    hpBonus: 12,
    armorBonus: 5,
    damageBonus: 2,
    desc: 'Простой генератор лёгкой защиты.',
  },
  {
    templateId: 'core_aqua',
    name: 'Аква-реактор щита',
    slot: 'gadget',
    rarity: 'epic',
    colorHex: '#0369a1',
    accentHex: '#38bdf8',
    hpBonus: 26,
    armorBonus: 10,
    damageBonus: 5,
    healBonus: 12,
    desc: 'Эпический синий модуль здоровья и защиты.',
  },
  {
    templateId: 'aura_aegis',
    name: 'Генератор «Эгида»',
    slot: 'gadget',
    rarity: 'legendary',
    colorHex: '#6d28d9',
    accentHex: '#c084fc',
    hpBonus: 48,
    armorBonus: 15,
    damageBonus: 9,
    healBonus: 20,
    desc: 'Легендарный фиолетовый амулет хранителя.',
  },

  // WEAPONS: BLASTERS
  {
    templateId: 'blaster_spark',
    name: 'Карманный бластер «Искра»',
    slot: 'weapon',
    rarity: 'common',
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
    weaponKind: 'blaster',
    colorHex: '#78350f',
    accentHex: '#f59e0b',
    hpBonus: 0,
    armorBonus: 0,
    damageBonus: 21,
    desc: 'Надёжный уличный бластер с тёплым лучом.',
  },
  {
    templateId: 'blaster_comet',
    name: 'Бластер «Комета»',
    slot: 'weapon',
    rarity: 'epic',
    weaponKind: 'blaster',
    colorHex: '#0284c7',
    accentHex: '#38bdf8',
    hpBonus: 8,
    armorBonus: 0,
    damageBonus: 32,
    desc: 'Эпический синий импульсный бластер.',
  },
  {
    templateId: 'blaster_aurora',
    name: 'Плазмоган «Аврора-Х»',
    slot: 'weapon',
    rarity: 'legendary',
    weaponKind: 'blaster',
    colorHex: '#7e22ce',
    accentHex: '#c084fc',
    hpBonus: 15,
    armorBonus: 4,
    damageBonus: 48,
    desc: 'Легендарный фиолетовый бластер высокой мощности.',
  },

  // WEAPONS: LIGHTSABERS
  {
    templateId: 'saber_train',
    name: 'Световой меч «Искра»',
    slot: 'weapon',
    rarity: 'common',
    weaponKind: 'lightsaber',
    colorHex: '#38bdf8',
    accentHex: '#7dd3fc',
    hpBonus: 5,
    armorBonus: 2,
    damageBonus: 24,
    desc: 'Базовый учебный световой меч с голубым клинком.',
  },
  {
    templateId: 'saber_kryos',
    name: 'Световой меч «Криос»',
    slot: 'weapon',
    rarity: 'epic',
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
    weaponKind: 'lightsaber',
    colorHex: '#34d399',
    accentHex: '#6ee7b7',
    hpBonus: 18,
    armorBonus: 6,
    damageBonus: 36,
    healBonus: 8,
    desc: 'Эпический изумрудный клинок с гармонией жизни.',
  },
  {
    templateId: 'saber_solaris',
    name: 'Световой меч «Солярис»',
    slot: 'weapon',
    rarity: 'epic',
    weaponKind: 'lightsaber',
    colorHex: '#fbbf24',
    accentHex: '#fde047',
    hpBonus: 14,
    armorBonus: 5,
    damageBonus: 40,
    desc: 'Эпический солнечный клинок из золотых каньонов.',
  },
  {
    templateId: 'saber_amethyst',
    name: 'Световой меч «Аметист»',
    slot: 'weapon',
    rarity: 'legendary',
    weaponKind: 'lightsaber',
    colorHex: '#a855f7',
    accentHex: '#e879f9',
    hpBonus: 30,
    armorBonus: 10,
    damageBonus: 56,
    desc: 'Легендарный фиолетовый световой меч редкой чистоты.',
  },
  {
    templateId: 'saber_horizon',
    name: 'Световой меч «Горизонт Души»',
    slot: 'weapon',
    rarity: 'legendary',
    weaponKind: 'lightsaber',
    colorHex: '#c084fc',
    accentHex: '#f0abfc',
    hpBonus: 36,
    armorBonus: 12,
    damageBonus: 62,
    healBonus: 10,
    desc: 'Легендарный фиолетовый клинок странника галактик.',
  },

  // UNIQUE BOSS ITEMS
  {
    templateId: 'boss_helm_overlord',
    name: 'Шлем «Владыка Тени»',
    slot: 'head',
    rarity: 'legendary',
    colorHex: '#4c1d95',
    accentHex: '#e879f9',
    hpBonus: 68,
    armorBonus: 22,
    damageBonus: 12,
    isUnique: true,
    desc: 'Уникальный трофей главного босса с силовой короной.',
  },
  {
    templateId: 'boss_coat_sovereign',
    name: 'Бронеплащ «Звёздный Суверен»',
    slot: 'torso',
    rarity: 'legendary',
    colorHex: '#581c87',
    accentHex: '#f0abfc',
    hpBonus: 88,
    armorBonus: 28,
    damageBonus: 14,
    healBonus: 14,
    isUnique: true,
    desc: 'Уникальный боевой плащ главаря синдиката.',
  },
  {
    templateId: 'boss_boots_phantom',
    name: 'Сапоги «Фантом Прыжка»',
    slot: 'legs',
    rarity: 'legendary',
    colorHex: '#3b0764',
    accentHex: '#c084fc',
    hpBonus: 58,
    armorBonus: 20,
    damageBonus: 10,
    isUnique: true,
    desc: 'Уникальные грави-сапоги с фиолетовым шлейфом.',
  },
  {
    templateId: 'boss_blaster_nova',
    name: 'Плазмобластер «Сверхновая Босса»',
    slot: 'weapon',
    rarity: 'legendary',
    weaponKind: 'blaster',
    colorHex: '#6d28d9',
    accentHex: '#e879f9',
    hpBonus: 24,
    armorBonus: 8,
    damageBonus: 68,
    isUnique: true,
    desc: 'Уникальный перегруженный бластер, выбитый из босса.',
  },
  {
    templateId: 'boss_saber_eclipse',
    name: 'Световой меч «Затмение Босса»',
    slot: 'weapon',
    rarity: 'legendary',
    weaponKind: 'lightsaber',
    colorHex: '#a855f7',
    accentHex: '#f5d0fe',
    hpBonus: 42,
    armorBonus: 14,
    damageBonus: 76,
    healBonus: 12,
    isUnique: true,
    desc: 'Уникальный фиолетовый клинок тёмного командира.',
  },
  {
    templateId: 'boss_core_immortal',
    name: 'Артефакт «Сердце Небес»',
    slot: 'gadget',
    rarity: 'legendary',
    colorHex: '#7e22ce',
    accentHex: '#f0abfc',
    hpBonus: 64,
    armorBonus: 18,
    damageBonus: 14,
    healBonus: 26,
    isUnique: true,
    desc: 'Уникальный модуль босса: мощная защита и ускоренное исцеление.',
  },
];

let uidCounter = 1;

export function createRpgItemFromTemplate(templateId: string): RpgItem {
  const tpl = RPG_CATALOG.find((t) => t.templateId === templateId) ?? RPG_CATALOG[0];
  return {
    uid: `rpg_${Date.now().toString(36)}_${uidCounter++}_${Math.floor(Math.random() * 999)}`,
    templateId: tpl.templateId,
    name: tpl.name,
    slot: tpl.slot,
    rarity: tpl.rarity,
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

export function createUniqueBossLoot(): RpgItem {
  const bossPool = RPG_CATALOG.filter((t) => t.isUnique);
  const pick = bossPool[Math.floor(Math.random() * bossPool.length)] ?? bossPool[0];
  return createRpgItemFromTemplate(pick.templateId);
}

export function createEmptyEquipMap(): RpgEquipMap {
  return {
    head: null,
    torso: null,
    legs: null,
    weapon: null,
    gadget: null,
  };
}

export function createStarterRpgData(): {
  hp: number;
  inventory: RpgItem[];
  playerEquipped: RpgEquipMap;
  companionEquipped: RpgEquipMap;
} {
  const playerEquipped: RpgEquipMap = {
    head: null,
    torso: createRpgItemFromTemplate('jacket_pilot'),
    legs: createRpgItemFromTemplate('pants_road'),
    weapon: createRpgItemFromTemplate('blaster_spark'),
    gadget: null,
  };

  const companionEquipped: RpgEquipMap = {
    head: null,
    torso: createRpgItemFromTemplate('jacket_cream'),
    legs: createRpgItemFromTemplate('skirt_boots'),
    weapon: null,
    gadget: createRpgItemFromTemplate('band_care'),
  };

  const inventory: RpgItem[] = [
    createRpgItemFromTemplate('saber_train'),
    createRpgItemFromTemplate('cap_travel'),
  ];

  return {
    hp: 125,
    inventory,
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

  const slots: RpgSlot[] = ['head', 'torso', 'legs', 'weapon', 'gadget'];
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
      if (s === 'gadget') {
        maxHp += Math.round(cItem.hpBonus * 0.5);
      }
    }
  }

  return {
    maxHp,
    armorPct: Math.min(68, armorPct),
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
    inventory: starter.inventory,
    playerEquipped: starter.playerEquipped,
    companionEquipped: starter.companionEquipped,
    playerStats,
    companionStats,
    gopniksActive: 0,
    rallyActiveCount: 0,
    rallyTotalCount: 8,
    policeWanted: false,
    policeOfficersAlive: 0,
    policeEscapeProgress: 0,
    policeDispatchSec: 0,
    bountyBossActive: false,
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
          ? 0.48
          : 0.22;

  if (Math.random() > dropChance) return null;

  const r = Math.random();
  let targetRarity: RpgRarity = 'common';
  if (source === 'police' || source === 'rally') {
    targetRarity = r > 0.74 ? 'legendary' : r > 0.34 ? 'epic' : 'common';
  } else if (source === 'gopnik') {
    targetRarity = r > 0.85 ? 'legendary' : r > 0.48 ? 'epic' : 'common';
  } else {
    targetRarity = r > 0.88 ? 'epic' : 'common';
  }

  const pool = RPG_CATALOG.filter(
    (t) =>
      !t.isUnique &&
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
