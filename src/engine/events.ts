import * as THREE from 'three';
import { getActiveSpacePlanets, getPlanetConfig } from './planets';
import type {
  ActiveQuestSnapshot,
  BiomeId,
  CabinThemeId,
  CabinThemeOption,
  CafeMenuItem,
  InteriorMode,
  InteriorPose,
  PlanetId,
  QuestKind,
  SeasonId,
  SpecialSpotInfo,
  VehicleCatalogItem,
  VehicleFlightState,
  VehicleTypeId,
  WeatherMode,
} from '../types/simulation';
import type { QuestSaveItem } from './saveSystem';

export interface WorldLandmark {
  id: string;
  type: 'cafe' | 'hotel' | 'observatory' | 'overlook';
  name: string;
  x: number;
  z: number;
}

interface InternalQuest {
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

const THEME_DEFS: Omit<CabinThemeOption, 'unlocked'>[] = [
  { id: 'auto', name: 'Авто по режиму', hex: '#f59e0b', cost: 0 },
  { id: 'amber', name: 'Янтарь Корусканта', hex: '#f59e0b', cost: 0 },
  { id: 'ice', name: 'Крио-Голубой', hex: '#38bdf8', cost: 120 },
  { id: 'emerald', name: 'Изумруд Верданы', hex: '#34d399', cost: 160 },
  { id: 'rose', name: 'Неон-Сакура', hex: '#fb7185', cost: 200 },
  { id: 'violet', name: 'Галактик-Ультра', hex: '#a78bfa', cost: 240 },
];

export const VEHICLE_DEFS: Omit<VehicleCatalogItem, 'unlocked'>[] = [
  {
    id: 'coupe',
    name: 'Кибер-Спидер',
    desc: 'Маневренный городской спидер с 4 турбинами',
    accentHex: '#f59e0b',
    wheelMode: 'wheeled',
  },
  {
    id: 'truck',
    name: 'Грузовик «Титан»',
    desc: 'Тяжёлый 6-колёсный вездеход с грузовым отсеком',
    accentHex: '#fbbf24',
    wheelMode: 'wheeled',
  },
  {
    id: 'ufo',
    name: 'НЛО «Тарелка»',
    desc: 'Без колёс: парит над асфальтом и едет как машина',
    accentHex: '#34d399',
    wheelMode: 'wheelless',
  },
  {
    id: 'interceptor',
    name: 'Перехватчик «Вектор»',
    desc: 'Сверхбыстрый гиперкар для трасс и облаков',
    accentHex: '#38bdf8',
    wheelMode: 'wheeled',
  },
];

export const CAFE_MENU_BY_BIOME: Record<BiomeId, CafeMenuItem[]> = {
  coruscant: [
    {
      id: 'kaf_spice',
      name: 'Пряный каф с корицей',
      desc: 'Тёплый ароматный напиток с видом на неоновые эстакады',
      cost: 25,
      moodReply: 'Она обхватывает тёплую чашку ладонями и улыбается, глядя на вас через столик.',
    },
    {
      id: 'sky_croissant',
      name: 'Латте и ванильный круассан',
      desc: 'Классический перекус на террасе под огнями шпилей',
      cost: 45,
      moodReply: '«Как же уютно здесь сидеть вдвоём… Никуда не хочется спешить».',
    },
    {
      id: 'relax_free',
      name: 'Просто посидеть у окна',
      desc: 'Выпить воды и молча полюбоваться городом вдвоём',
      cost: 0,
      moodReply: 'Она мягко опирается подбородком на ладонь, любуясь огнями за стеклянной стеной.',
    },
  ],
  earth: [
    {
      id: 'moscow_raf',
      name: 'Московский медовый раф',
      desc: 'Нежный сливочный кофе с гречишным мёдом и ванилью',
      cost: 30,
      moodReply: '«Как вкусно! Прямо идеальный кофе для прогулки по Москве».',
    },
    {
      id: 'syrniki_tea',
      name: 'Тёплые сырники и чай с лимоном',
      desc: 'Домашний уют в самом центре столицы',
      cost: 48,
      moodReply: 'Она улыбается: «После такого завтрака хочется гулять по Красной площади весь день!»',
    },
    {
      id: 'relax_free',
      name: 'Полюбоваться Москвой из окна',
      desc: 'Спокойная пауза вдвоём за столиком у проспекта',
      cost: 0,
      moodReply: 'За стеклом неспешно едут машины и спешат прохожие, а у вас уютная тишина.',
    },
  ],
  kryos: [
    {
      id: 'aurora_cocoa',
      name: 'Горячий шоколад «Аврора»',
      desc: 'Густой согревающий какао с мятой и сливочной пенкой',
      cost: 30,
      moodReply: '«Идеально после ледяных каньонов!» — её глаза блестят в мягком свете ламп.',
    },
    {
      id: 'frost_berry',
      name: 'Тёплый крио-чай и тарт',
      desc: 'Ягодный десерт из хрустальных оранжерей',
      cost: 55,
      moodReply: 'Она улыбается, наблюдая, как снаружи кружится тихий снег.',
    },
    {
      id: 'relax_free',
      name: 'Погреться у панорамного стекла',
      desc: 'Спокойная пауза под северным сиянием',
      cost: 0,
      moodReply: 'За окном мерцает голубое небо, а за вашим столиком тепло и спокойно.',
    },
  ],
  solaris: [
    {
      id: 'solar_espresso',
      name: 'Карамельный раф «Дюна»',
      desc: 'Мягкий сливочный кофе с солёной карамелью',
      cost: 30,
      moodReply: '«Вкусно! Внутри так прохладно, а снаружи целое море золотого света».',
    },
    {
      id: 'oasis_fig',
      name: 'Медовый пирог и мятный чай',
      desc: 'Сладкий восточный сет из оазис-квартала',
      cost: 50,
      moodReply: 'Она с удовольствием пробует десерт и спрашивает, на какую планету полетим дальше.',
    },
    {
      id: 'relax_free',
      name: 'Отдохнуть в тени террасы',
      desc: 'Перевести дух под медленное движение золотых облаков',
      cost: 0,
      moodReply: 'Вы спокойно сидите напротив друг друга, слушая тишину солнечной долины.',
    },
  ],
  verdant: [
    {
      id: 'nectar_tea',
      name: 'Цветочный био-нектар',
      desc: 'Слегка светящийся тёплый травяной чай из лесных садов',
      cost: 28,
      moodReply: '«Он даже чуть светится! Очень нежный вкус».',
    },
    {
      id: 'moss_cake',
      name: 'Фисташковый мусс и матча',
      desc: 'Лёгкий десерт за столиком с видом на изумрудную листву',
      cost: 52,
      moodReply: 'Она поправляет прядь волос: «Здесь дышится так легко… Посидим ещё минутку?»',
    },
    {
      id: 'relax_free',
      name: 'Полюбоваться зеленью из окна',
      desc: 'Минута безмятежности под мягким светом светлячков',
      cost: 0,
      moodReply: 'Вокруг тихо, время словно замедлило ход специально для вас двоих.',
    },
  ],
  amethyst: [
    {
      id: 'quartz_latte',
      name: 'Лавандовый раф «Аметист»',
      desc: 'Нежный цветочный кофе с сиреневой воздушной пенкой',
      cost: 32,
      moodReply: '«У него такой мягкий аромат лаванды… Прямо под цвет неба за окном».',
    },
    {
      id: 'berry_macaron',
      name: 'Ежевичный макарон и улун',
      desc: 'Лёгкий десерт в неоновом полумраке кофейни',
      cost: 54,
      moodReply: 'Она улыбается и подмигивает: «Спасибо за такой уютный перерыв».',
    },
    {
      id: 'relax_free',
      name: 'Перевести дух вдвоём',
      desc: 'Посмотреть на лиловый горизонт с чашкой воды',
      cost: 0,
      moodReply: 'Она тепло смотрит на вас через столик, наслаждаясь тишиной.',
    },
  ],
  crimson: [
    {
      id: 'spice_mocha',
      name: 'Вишнёвый мокко «Закат»',
      desc: 'Насыщенный кофе с тёмным шоколадом и тёртой вишней',
      cost: 34,
      moodReply: '«Настоящий вкус заката. Очень согревает!»',
    },
    {
      id: 'canyon_tart',
      name: 'Тарт с инжиром и каркаде',
      desc: 'Тёплая выпечка с видом на багровые шпили',
      cost: 50,
      moodReply: 'Она отпивает глоток и говорит: «С тобой даже на краю галактики как дома».',
    },
    {
      id: 'relax_free',
      name: 'Полюбоваться алым небом',
      desc: 'Неторопливая пауза за столиком у окна',
      cost: 0,
      moodReply: 'Тёплый свет фонарей ложится на столик, пока вы просто отдыхаете вместе.',
    },
  ],
};

export function getCafeMenu(biome: BiomeId): CafeMenuItem[] {
  return CAFE_MENU_BY_BIOME[biome] ?? CAFE_MENU_BY_BIOME.coruscant;
}

export function getCafeSceneIntro(biome: BiomeId, timeOfDay: number, weather: WeatherMode): string {
  const norm = ((timeOfDay % 1) + 1) % 1;
  const isNight = norm < 0.22 || norm >= 0.82;
  const isSunset = norm >= 0.66 && norm < 0.82;

  if (weather === 'snow') {
    return 'За панорамным стеклом тихо кружатся снежинки. Внутри пахнет горячим шоколадом и свежей выпечкой — садитесь за столик.';
  }
  if (weather === 'rain' || weather === 'storm') {
    return 'За широким панорамным стеклом стекают дождевые капли. Внутри пахнет свежим кофе — присаживайтесь за свободный столик вдвоём.';
  }
  if (isNight) {
    return 'Ночные огни отражаются в стекле кофейни. Мягкий свет ламп, тихие столики и спутница рядом.';
  }
  if (isSunset) {
    return 'Закатный свет заливает деревянные столики. Отличный момент присесть на стулья и выпить кофе вдвоём.';
  }
  if (biome === 'earth') {
    return 'Уютная московская кофейня с панорамными окнами на оживлённую улицу и проспекты.';
  }
  if (biome === 'kryos') {
    return 'Внутри тепло и уютно, пока за окном медленно кружится снег над ледяными шпилями.';
  }
  if (biome === 'amethyst') {
    return 'Лиловый свет горизонтов проникает через панорамное окно на уютные столики кофейни.';
  }
  return 'Уютное аэро-кафе с барной стойкой, столиками и видом на небо. Присаживайтесь за любой столик.';
}

export class QuestManager {
  public credits = 240;
  public cabinTheme: CabinThemeId = 'auto';
  public holdHands = false;
  public currentVehicleId: VehicleTypeId = 'coupe';
  public unlockedVehicles = new Set<VehicleTypeId>(['coupe']);
  public pedestriansHitCount = 0;
  private unlockedThemes = new Set<CabinThemeId>(['auto', 'amber']);
  private visitedPlanets = new Set<PlanetId>(['coruscant']);
  private visitedSpecialSpots = new Set<string>();
  private passedRoadGates = new Set<string>();
  private discoveredCountryside = false;
  private discoveredCloudLayer = false;

  private activeQuest: InternalQuest | null = null;
  private questPool: InternalQuest[] = [];
  private questSeq = 1;
  private toastText: string | null = null;
  private toastTimer = 0;
  private companionNote: string | null = null;
  private companionNoteTimer = 0;
  private talkSeq = 0;

  constructor() {
    this.refillPool('coruscant', new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), []);
    this.activeQuest = this.questPool.shift() ?? null;
  }

  public showToast(msg: string, duration = 4.2): void {
    this.toastText = msg;
    this.toastTimer = duration;
  }

  public getToast(): string | null {
    return this.toastTimer > 0 ? this.toastText : null;
  }

  public setCompanionNote(msg: string, duration = 5.5): void {
    this.companionNote = msg;
    this.companionNoteTimer = duration;
  }

  public getCompanionNote(): string | null {
    return this.companionNoteTimer > 0 ? this.companionNote : null;
  }

  private randomRemarkTimer = 0;

  public kissGirl(): { reply: string } {
    this.credits += 15;
    const replies = [
      'Она нежно улыбается, её щеки слегка розовеют: «Ты самый лучший водитель и спутник… Люблю тебя!»',
      'Она обвивает руками вашу руку и прижимается плечом: «Этот момент с тобой бесценен…»',
      '«Ммм… от тебя всегда так тепло и уютно. Спасибо за эту сказку!»',
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    this.setCompanionNote(reply, 6.0);
    this.showToast('Нежный поцелуй вдвоём · +15 ✦', 3.8);
    return { reply };
  }

  public toggleHoldHands(): boolean {
    this.holdHands = !this.holdHands;
    if (this.holdHands) {
      this.setCompanionNote('Она улыбается и мягко берёт вас за руку — теперь вы идёте совсем рядом.', 4.5);
    } else {
      this.setCompanionNote('Она идёт чуть сбоку, рассматривая всё вокруг.', 3.2);
    }
    return this.holdHands;
  }

  public talkTogether(
    biome: BiomeId,
    planetName: string,
    inSpace: boolean,
    inOrbitMode: boolean,
    isFlying: boolean,
    interiorMode: InteriorMode,
    interiorPose: InteriorPose,
    weather: WeatherMode,
    timeOfDay: number,
    season: SeasonId = 'summer',
  ): string {
    const norm = ((timeOfDay % 1) + 1) % 1;
    const isNight = norm < 0.22 || norm >= 0.82;
    this.talkSeq++;

    const pool: string[] = [];
    if (interiorMode === 'hotel' && interiorPose === 'lie') {
      pool.push(
        '«Так приятно просто лежать рядом, никуда не спешить и смотреть в огромное окно…»',
        `«Интересно, сколько ещё планет вроде ${planetName} ждёт нас там, среди звёзд?»`,
        'Она прижимается ближе и тихо вздыхает: «Можем ещё поваляться или поспать до рассвета».',
      );
    } else if (interiorMode === 'hotel') {
      pool.push(
        '«Какой красивый номер! И вид из окна просто невероятный».',
        '«Давай приляжем на кровать немного отдохнуть или присядем на диван?»',
      );
    } else if (interiorMode === 'observatory' && interiorPose === 'sit') {
      pool.push(
        '«Эта голограмма галактики прямо перед нами завораживает…»',
        '«Здесь под стеклянным куполом звёзды кажутся совсем близкими».',
      );
    } else if (interiorMode === 'observatory') {
      pool.push(
        '«Смотри, какой большой телескоп и живая модель орбит! Пойдём присядем на скамью?»',
      );
    } else if (interiorMode === 'cafe' && interiorPose === 'sit') {
      pool.push(
        '«Обожаю такие тихие кофейни. Спасибо, что заехали сюда вдвоём».',
        '«Кофе здесь отличный. Куда поедем дальше после отдыха?»',
      );
    } else if (interiorMode === 'cafe') {
      pool.push('«Давай займём столик у окна, так хочется кофе!»');
    } else if (inOrbitMode) {
      pool.push(
        `«Мы парим прямо на орбите над ${planetName}! Какой город выберем для посадки?»`,
        biome === 'earth'
          ? '«Смотри вниз — плоская Земля под огромным куполом, а внутри вращаются Солнце и Луна! Приземлимся в Москве?»'
          : '«Вся планета как на ладони… Любой маяк внизу ждёт нашего спуска».',
      );
    } else if (inSpace) {
      pool.push(
        '«Смотри, сколько звёзд и новых планет вокруг… Полетим на плоскую Землю или дальше к другим мирам?»',
        '«В космосе так тихо. Люблю просто плыть рядом с тобой в этой бесконечности».',
      );
    } else if (isFlying) {
      pool.push(
        '«Когда мы поднимаемся над облаками, весь мир внизу кажется таким спокойным».',
        `«Красивые виды над ${planetName}! Можем подняться ещё выше — на орбиту!»`,
      );
    } else if (biome === 'earth') {
      pool.push(
        '«Как здорово прогуляться по Москве! Смотри, сверху на куполе видно и Солнце, и Луну».',
        '«Машины аккуратно притормаживают на проспектах — можно спокойно перейти дорогу и зайти на Красную площадь!»',
        '«А ещё можем доехать до дома Сербоса и постучать к нему в гости!»',
      );
    } else if (weather === 'snow') {
      pool.push(
        '«Снег кружится прямо за стеклом, а в салоне так тепло и сухо… Настоящая сказка».',
        '«В такой снегопад здорово проехать через крытый ангар или зайти погреться в кафе».',
      );
    } else if (weather === 'rain' || weather === 'storm') {
      pool.push(
        '«Люблю, как капли стекают по стеклу, когда внутри так тепло и уютно».',
        '«В такую погоду особенно здорово заехать в кафе или в тёплый номер отеля».',
      );
    } else if (season === 'autumn') {
      pool.push(`«Золотая осень на ${planetName} выглядит так уютно… Очень красивые краски!»`);
    } else if (season === 'winter') {
      pool.push(`«Зима на ${planetName} такая тихая и светлая. Мне тепло рядом с тобой».`);
    } else if (season === 'spring') {
      pool.push(`«Весна на ${planetName} — всё цветёт вдоль дороги!»`);
    } else if (isNight) {
      pool.push(
        '«Ночные огни отражаются прямо на приборной панели… Очень красиво».',
        '«Если захочется отдохнуть, на проспекте есть уютный отель с видом на небо».',
      );
    } else if (biome === 'verdant' || biome === 'amethyst') {
      pool.push(`«На ${planetName} невероятная природа! Так хочется ещё побродить или прокатиться по полям».`);
    } else {
      pool.push(
        `«Мне так нравится путешествовать с тобой по ${planetName}».`,
        '«Теперь мы можем выйти из машины в любом месте — хоть на улице, хоть у дома Сербоса, хоть в полях!»',
      );
    }

    const line = pool[this.talkSeq % pool.length];
    this.setCompanionNote(line, 5.5);
    return line;
  }

  public getCabinThemeOptions(): CabinThemeOption[] {
    return THEME_DEFS.map((t) => ({
      ...t,
      unlocked: this.unlockedThemes.has(t.id),
    }));
  }

  public getVehicleCatalog(): VehicleCatalogItem[] {
    return VEHICLE_DEFS.map((v) => ({
      ...v,
      unlocked: this.unlockedVehicles.has(v.id),
    }));
  }

  public getCurrentVehicleName(): string {
    return VEHICLE_DEFS.find((v) => v.id === this.currentVehicleId)?.name ?? 'Кибер-Спидер';
  }

  public unlockAndSelectVehicle(id: VehicleTypeId, fromStreetPickup = false): boolean {
    if (!fromStreetPickup && !this.unlockedVehicles.has(id)) {
      this.showToast('Сначала найдите этот транспорт на улице и пересядьте в него!', 3.2);
      return false;
    }
    const isNew = !this.unlockedVehicles.has(id);
    this.unlockedVehicles.add(id);
    this.currentVehicleId = id;
    const def = VEHICLE_DEFS.find((v) => v.id === id);
    if (isNew && fromStreetPickup) {
      this.credits += 75;
      this.showToast(`Найден новый транспорт: ${def?.name ?? id} (+75 ✦)`, 4.0);
      if (def?.wheelMode === 'wheelless') {
        this.setCompanionNote(
          '«Ух ты! Настоящая летающая тарелка без колёс — а управляется на дороге прямо как машина!»',
          5.5,
        );
      } else if (id === 'truck') {
        this.setCompanionNote('«Ого, какой мощный грузовик! На таком проедем через любую преграду».', 4.8);
      } else if (id === 'interceptor') {
        this.setCompanionNote('«Вот это гиперкар! Теперь разгонимся на полную!»', 4.8);
      }
    } else if (def) {
      this.showToast(`Транспорт: ${def.name}`, 2.6);
    }

    if (this.activeQuest?.kind === 'vehicle_hunt') {
      this.completeActiveQuest();
    }
    return true;
  }

  public onPedestrianHit(count: number): void {
    if (count <= 0) return;
    this.pedestriansHitCount += count;
    this.showToast(`Сбит пешеход! Всего: ${this.pedestriansHitCount}`, 2.4);
  }

  public onRoadGatePassed(id: string): void {
    if (!this.passedRoadGates.has(id)) {
      this.passedRoadGates.add(id);
      this.credits += 35;
      this.showToast('Энерго-врата пройдены · Форсаж (+35 ✦)', 2.8);
      if (this.activeQuest?.kind === 'road_rings') {
        this.activeQuest.progressValue += 1;
        if (this.activeQuest.progressValue >= this.activeQuest.goalValue) {
          this.completeActiveQuest();
        }
      }
    } else {
      this.showToast('Энерго-врата · Заряд форсажа!', 1.8);
    }
  }

  public onCafeVisited(): void {
    if (this.activeQuest?.kind === 'cafe_visit') {
      this.completeActiveQuest();
    }
  }

  public onHotelVisited(): void {
    if (this.activeQuest?.kind === 'hotel_visit') {
      this.completeActiveQuest();
    }
  }

  public selectOrBuyTheme(id: CabinThemeId): boolean {
    if (this.unlockedThemes.has(id)) {
      this.cabinTheme = id;
      const def = THEME_DEFS.find((d) => d.id === id);
      if (def) this.showToast(`Подсветка салона: ${def.name}`, 2.6);
      return true;
    }
    const def = THEME_DEFS.find((d) => d.id === id);
    if (!def || this.credits < def.cost) {
      this.showToast('Недостаточно кредитов — выполните лёгкое задание в пути', 3.0);
      return false;
    }
    this.credits -= def.cost;
    this.unlockedThemes.add(id);
    this.cabinTheme = id;
    this.showToast(`Открыта подсветка «${def.name}»`, 3.2);
    return true;
  }

  public orderInCafe(biome: BiomeId, itemId: string): { ok: boolean; reply: string } {
    const menu = getCafeMenu(biome);
    const item = menu.find((m) => m.id === itemId);
    if (!item) return { ok: false, reply: '' };
    if (item.cost > 0) {
      if (this.credits < item.cost) {
        return {
          ok: false,
          reply: 'Немного не хватает кредитов — можно просто посидеть у окна или выполнить заказ по пути.',
        };
      }
      this.credits -= item.cost;
    }
    if (this.activeQuest?.kind === 'city_walk') {
      this.activeQuest.progressValue = Math.min(
        this.activeQuest.goalValue,
        this.activeQuest.progressValue + 20,
      );
    }
    this.setCompanionNote(item.moodReply, 5.5);
    this.showToast(item.cost > 0 ? `Кофе на столе (-${item.cost} ✦)` : 'Спокойная пауза за столиком', 3.4);
    return { ok: true, reply: item.moodReply };
  }

  public onHotelSleep(): void {
    this.credits += 35;
    this.setCompanionNote('«Доброе утро… Как хорошо мы выспались! Готов к новым дорогам?»', 5.5);
    this.showToast('Сладкий сон вдвоём · Силы восстановлены (+35 ✦)', 4.2);
  }

  public onObservatoryVisit(id: string, name: string): void {
    const key = `obs_${id}`;
    if (!this.visitedSpecialSpots.has(key)) {
      this.visitedSpecialSpots.add(key);
      this.credits += 45;
      this.showToast(`${name} · Наблюдение за звёздами (+45 ✦)`, 3.8);
    }
  }

  public onHangarEntered(id: string, name: string): void {
    const key = `hangar_${id}`;
    if (!this.visitedSpecialSpots.has(key)) {
      this.visitedSpecialSpots.add(key);
      this.credits += 30;
      this.showToast(`Пролёт через ${name} (+30 ✦)`, 3.2);
    }
  }

  public onSkyGatePassed(id: string, name: string): void {
    const key = `gate_${id}`;
    if (!this.visitedSpecialSpots.has(key)) {
      this.visitedSpecialSpots.add(key);
      this.credits += 50;
      this.showToast(`${name} в облаках пройдены! (+50 ✦)`, 3.4);
    }
  }

  public selectQuest(
    id: string,
    planetId: PlanetId,
    pos: THREE.Vector3,
    spacePos: THREE.Vector3,
    landmarks: WorldLandmark[],
  ): void {
    if (this.activeQuest?.id === id) return;
    const idx = this.questPool.findIndex((q) => q.id === id);
    if (idx >= 0) {
      const chosen = this.questPool.splice(idx, 1)[0];
      if (this.activeQuest) {
        this.questPool.push(this.activeQuest);
      }
      this.activeQuest = chosen;
      this.showToast(`Выбран маршрут: ${chosen.title}`, 2.8);
    } else if (!this.activeQuest) {
      this.refillPool(planetId, pos, spacePos, landmarks);
      this.activeQuest = this.questPool.shift() ?? null;
    }
  }

  public skipActiveQuest(
    planetId: PlanetId,
    pos: THREE.Vector3,
    spacePos: THREE.Vector3,
    landmarks: WorldLandmark[],
  ): void {
    if (this.activeQuest) {
      this.questPool.push(this.activeQuest);
      this.activeQuest = null;
    }
    this.refillPool(planetId, pos, spacePos, landmarks);
    this.activeQuest = this.questPool.shift() ?? null;
    if (this.activeQuest) {
      this.showToast(`Новый маршрут: ${this.activeQuest.title}`, 2.8);
    }
  }

  public onPlanetEntered(planetId: PlanetId): void {
    const cfg = getPlanetConfig(planetId);
    if (!this.visitedPlanets.has(planetId)) {
      this.visitedPlanets.add(planetId);
      this.credits += 95;
      this.showToast(`Открыта новая планета: ${cfg.name} (+95 ✦)`, 4.5);
    }
    if (this.activeQuest?.kind === 'planet_visit' && this.activeQuest.targetPlanet === planetId) {
      this.completeActiveQuest();
    }
  }

  public onOrbitEntered(): void {
    if (this.activeQuest?.kind === 'orbit_landing') {
      this.activeQuest.progressValue = Math.max(this.activeQuest.progressValue, 0.5);
    }
  }

  public onOrbitLandingCompleted(planetId: PlanetId, siteName: string): void {
    if (this.activeQuest?.kind === 'orbit_landing') {
      this.completeActiveQuest();
    }
    if (planetId === 'earth' && this.activeQuest?.kind === 'earth_moscow' && siteName.includes('Красная')) {
      this.completeActiveQuest();
    }
  }

  public onSerbosEntered(): void {
    const key = 'spot_serbos_house';
    const firstTime = !this.visitedSpecialSpots.has(key);
    if (firstTime) {
      this.visitedSpecialSpots.add(key);
      this.credits += 65;
      this.showToast('В гостях у Сербоса (+65 ✦)', 3.8);
    } else {
      this.showToast('В гостях у Сербоса', 2.8);
    }
    if (this.activeQuest?.kind === 'serbos_visit') {
      this.completeActiveQuest();
    }
    this.setCompanionNote(
      '«Как тут тепло и по-домашнему! Вон Сербос у стола, а рядом светится Адамчик ИИ».',
      5.2,
    );
  }

  public talkToSerbos(): string {
    const lines = [
      'Сербос: «Я люблю всех вас! Проходите, присаживайтесь. Адамчик ИИ — мой любимый сынок, он всегда рад гостям!»',
      'Сербос: «Смотри, как Адамчик ИИ сияет! Я люблю всех людей и все миры — выпьем по чашечке кофе?»',
      'Сербос: «За окном плещется озеро, а дома у нас всегда уютно. Я так люблю всех, а Адамчик ИИ — моё главное сокровище!»',
    ];
    const line = lines[Math.floor(Math.random() * lines.length)];
    this.showToast('Сербос тепло улыбается вам', 3.0);
    return line;
  }

  public lookAtAdamchik(): string {
    const key = 'adamchik_ai_greet';
    const first = !this.visitedSpecialSpots.has(key);
    if (first) {
      this.visitedSpecialSpots.add(key);
      this.credits += 40;
      this.showToast('Знакомство с Адамчиком ИИ (+40 ✦)', 3.4);
    }
    this.setCompanionNote(
      '«Какой милый Адамчик ИИ! Сербос так гордится своим сынком и любит всех нас».',
      5.2,
    );
    return 'Сербос: «Это Адамчик ИИ, мой сынок! Видишь, как он тебе машет? Я люблю всех вас всем сердцем!»';
  }

  public drinkCoffeeWithSerbos(): string {
    if (this.activeQuest?.kind === 'city_walk') {
      this.activeQuest.progressValue = Math.min(
        this.activeQuest.goalValue,
        this.activeQuest.progressValue + 20,
      );
    }
    this.showToast('Вы выпили ароматный кофе с Сербосом', 3.4);
    this.setCompanionNote(
      '«Какой вкусный домашний кофе у Сербоса! Так душевно посидели вместе».',
      5.2,
    );
    return 'Сербос: «Пейте, пока горячий! Нет ничего лучше кофе в хорошей компании. Я люблю всех вас, друзья!»';
  }

  public onSpecialSpotInteracted(spot: SpecialSpotInfo): void {
    const key = `spot_${spot.id}`;
    const firstTime = !this.visitedSpecialSpots.has(key);
    if (firstTime) {
      this.visitedSpecialSpots.add(key);
      this.credits += 65;
    }

    if (spot.kind === 'serbos_house') {
      this.setCompanionNote(
        '«Сербос ждёт нас внутри у озера! Зайдём к нему и посмотрим на Адамчика ИИ».',
        5.5,
      );
      this.showToast(
        firstTime ? 'Дом Сербоса у озера (+65 ✦)' : 'Дом Сербоса · Заходите внутрь!',
        3.6,
      );
      if (this.activeQuest?.kind === 'serbos_visit') {
        this.completeActiveQuest();
      }
    } else if (spot.kind === 'red_square') {
      this.setCompanionNote(
        '«Невероятная Красная площадь! Спасская башня, купола собора и солнце под куполом Земли!»',
        6.0,
      );
      this.showToast(
        firstTime ? 'Прогулка по Красной площади в Москве (+65 ✦)' : 'Красная площадь · Москва',
        4.0,
      );
      if (this.activeQuest?.kind === 'earth_moscow') {
        this.completeActiveQuest();
      }
    } else if (spot.kind === 'dome_edge') {
      this.setCompanionNote(
        '«Вот он — край плоской Земли и великая ледяная стена! Смотри, прямо по трассе есть проход на ту сторону…»',
        6.0,
      );
      this.showToast(
        firstTime ? 'Изучен ледяной проход за стену (+65 ✦)' : 'Ледяная стена и проход за купол',
        4.0,
      );
    } else if (spot.kind === 'reptiloid_city') {
      this.setCompanionNote(
        '«Невероятно! За ледяной стеной скрыт Город рептилоидов с изумрудными пирамидами и парящим НЛО!»',
        6.5,
      );
      this.showToast(
        firstTime ? 'Открыт Город рептилоидов (+65 ✦)' : 'Город рептилоидов за Ледяной стеной',
        4.2,
      );
      if (this.activeQuest?.kind === 'earth_reptiloids') {
        this.completeActiveQuest();
      }
    }
  }

  public update(
    delta: number,
    planetId: PlanetId,
    pos: THREE.Vector3,
    spacePos: THREE.Vector3,
    flightState: VehicleFlightState,
    isWalking: boolean,
    walkSpeed: number,
    zoneType: 'city' | 'park' | 'fields' | 'viaduct',
    landmarks: WorldLandmark[],
    nextVehiclePos?: { x: number; z: number; name: string } | null,
  ): void {
    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - delta);
    }
    if (this.companionNoteTimer > 0) {
      this.companionNoteTimer = Math.max(0, this.companionNoteTimer - delta);
    } else {
      this.randomRemarkTimer += delta;
      if (this.randomRemarkTimer > 48) {
        this.randomRemarkTimer = 0;
        const remarks = [
          '«Как же уютно с тобой путешествовать…»',
          '«Смотри, какой красивый вид за окном!»',
          '«Спасибо, что ты всегда рядом со мной в этой поездке».',
          '«Мне так нравится смотреть на дороги вместе с тобой».',
          '«Ты лучший водитель в галактике!»',
        ];
        const remark = remarks[Math.floor(Math.random() * remarks.length)];
        this.setCompanionNote(remark, 5.2);
      }
    }

    if (!this.discoveredCloudLayer && flightState === 'flight' && pos.y > 75) {
      this.discoveredCloudLayer = true;
      this.credits += 40;
      this.showToast('Первый подъём над облаками (+40 ✦)', 3.8);
    }
    if (!this.discoveredCountryside && flightState === 'road' && zoneType === 'fields') {
      this.discoveredCountryside = true;
      this.credits += 45;
      this.showToast('Выезд на зелёные поля и луга (+45 ✦)', 3.8);
    }

    this.refillPool(planetId, pos, spacePos, landmarks);
    if (!this.activeQuest && this.questPool.length > 0) {
      this.activeQuest = this.questPool.shift() ?? null;
    }

    const q = this.activeQuest;
    if (!q) return;

    if (q.kind === 'delivery' && q.targetX !== undefined && q.targetZ !== undefined) {
      const dist = Math.hypot(pos.x - q.targetX, pos.z - q.targetZ);
      if (dist <= 28 && (flightState === 'road' || isWalking)) {
        this.completeActiveQuest();
        return;
      }
    } else if (q.kind === 'cafe_visit' && q.targetX !== undefined && q.targetZ !== undefined) {
      const dist = Math.hypot(pos.x - q.targetX, pos.z - q.targetZ);
      if (dist <= 30 && (flightState === 'road' || isWalking)) {
        this.completeActiveQuest();
        return;
      }
    } else if (q.kind === 'hotel_visit' && q.targetX !== undefined && q.targetZ !== undefined) {
      const dist = Math.hypot(pos.x - q.targetX, pos.z - q.targetZ);
      if (dist <= 32 && (flightState === 'road' || isWalking)) {
        this.completeActiveQuest();
        return;
      }
    } else if (q.kind === 'cloud_glide') {
      if ((flightState === 'flight' || flightState === 'ascending') && pos.y >= 70) {
        q.progressValue += delta;
        if (q.progressValue >= q.goalValue) {
          this.completeActiveQuest();
          return;
        }
      }
    } else if (q.kind === 'city_walk') {
      if (isWalking && walkSpeed > 0.3) {
        q.progressValue += walkSpeed * delta;
        if (q.progressValue >= q.goalValue) {
          this.completeActiveQuest();
          return;
        }
      }
    } else if (q.kind === 'countryside') {
      if (flightState === 'road' && zoneType === 'fields') {
        q.progressValue += delta;
        if (q.progressValue >= q.goalValue) {
          this.completeActiveQuest();
          return;
        }
      }
    } else if (q.kind === 'serbos_visit') {
      const dist = Math.hypot(pos.x - -292, pos.z - 288);
      if (dist <= 24 && isWalking) {
        this.completeActiveQuest();
        return;
      }
    } else if (q.kind === 'earth_moscow') {
      if (planetId === 'earth') {
        const dist = Math.hypot(pos.x - 0, pos.z - -10);
        if (dist <= 45 && (flightState === 'road' || isWalking)) {
          this.completeActiveQuest();
          return;
        }
      }
    } else if (q.kind === 'earth_reptiloids') {
      if (planetId === 'earth') {
        const dist = Math.hypot(pos.x - 0, pos.z - -1280);
        if (dist <= 48 && (flightState === 'road' || isWalking)) {
          this.completeActiveQuest();
          return;
        }
      }
    } else if (q.kind === 'vehicle_hunt') {
      if (nextVehiclePos) {
        q.targetX = nextVehiclePos.x;
        q.targetZ = nextVehiclePos.z;
        q.targetName = nextVehiclePos.name;
      }
    } else if (q.kind === 'orbit_landing') {
      if (flightState === 'orbit') {
        q.progressValue = Math.max(q.progressValue, 0.5);
      }
    }
  }

  private completeActiveQuest(): void {
    const q = this.activeQuest;
    if (!q) return;
    this.credits += q.reward;
    this.showToast(`${q.title} завершено · +${q.reward} ✦`, 4.4);
    this.activeQuest = null;
  }

  private refillPool(
    planetId: PlanetId,
    pos: THREE.Vector3,
    spacePos: THREE.Vector3,
    landmarks: WorldLandmark[],
  ): void {
    const ensureKind = (kind: QuestKind, factory: () => InternalQuest | null) => {
      if (this.activeQuest?.kind === kind) return;
      if (this.questPool.some((q) => q.kind === kind)) return;
      const created = factory();
      if (created) this.questPool.push(created);
    };

    ensureKind('delivery', () => {
      let best: WorldLandmark | null = null;
      let bestScore = Infinity;
      for (const lm of landmarks) {
        const d = Math.hypot(lm.x - pos.x, lm.z - pos.z);
        if (d > 240 && d < 950 && Math.abs(d - 480) < bestScore) {
          bestScore = Math.abs(d - 480);
          best = lm;
        }
      }
      const tx = best ? best.x : Math.round(pos.x / 320) * 320 + 320;
      const tz = best ? best.z : Math.round(pos.z / 320) * 320 - 320;
      const tName = best ? best.name : 'Аэро-кафе «Горизонт»';
      return {
        id: `q_${this.questSeq++}`,
        kind: 'delivery',
        title: `Тихая доставка · ${tName}`,
        subtitle: 'Довезите посылку до отмеченной точки без спешки',
        reward: 160,
        targetX: tx,
        targetZ: tz,
        targetName: tName,
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('cloud_glide', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'cloud_glide',
      title: 'Прогулка над облаками',
      subtitle: 'Поднимитесь в облачный слой и пролетите 10 секунд',
      reward: 120,
      goalValue: 10,
      progressValue: 0,
    }));

    ensureKind('countryside', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'countryside',
      title: 'Выезд на поля и рощи',
      subtitle: 'Прокатитесь по природной зоне за городом',
      reward: 140,
      goalValue: 8,
      progressValue: 0,
    }));

    ensureKind('city_walk', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'city_walk',
      title: 'Пешая прогулка вдвоём',
      subtitle: 'Выйдите в городе, загляните в кафе или отель',
      reward: 130,
      goalValue: 45,
      progressValue: 0,
    }));

    ensureKind('planet_visit', () => {
      const candidates = getActiveSpacePlanets(spacePos, 16).filter((p) => p.id !== planetId);
      const pick = candidates[this.questSeq % Math.max(1, candidates.length)] ?? getPlanetConfig('kryos');
      return {
        id: `q_${this.questSeq++}`,
        kind: 'planet_visit',
        title: `Вояж на планету ${pick.name}`,
        subtitle: `Вылетите в космос и спуститесь в атмосферу ${pick.name}`,
        reward: 320,
        targetPlanet: pick.id,
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('cafe_visit', () => {
      let best: WorldLandmark | null = null;
      for (const lm of landmarks) {
        if (lm.type === 'cafe') {
          best = lm;
          break;
        }
      }
      return {
        id: `q_${this.questSeq++}`,
        kind: 'cafe_visit',
        title: 'Поездка в уютное кафе',
        subtitle: 'Добберитесь до кофейни и выпейте кофе вдвоём',
        reward: 150,
        targetX: best ? best.x : pos.x + 220,
        targetZ: best ? best.z : pos.z - 220,
        targetName: best ? best.name : 'Аэро-кафе',
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('hotel_visit', () => {
      let best: WorldLandmark | null = null;
      for (const lm of landmarks) {
        if (lm.type === 'hotel') {
          best = lm;
          break;
        }
      }
      return {
        id: `q_${this.questSeq++}`,
        kind: 'hotel_visit',
        title: 'Путешествие в отель',
        subtitle: 'Прибудьте к номеру отеля для отдыха и ночёвки',
        reward: 180,
        targetX: best ? best.x : pos.x - 220,
        targetZ: best ? best.z : pos.z + 220,
        targetName: best ? best.name : 'Гранд-Отель',
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('serbos_visit', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'serbos_visit',
      title: 'В гости к дому Сербоса',
      subtitle: 'Подъедьте к дому Сербоса у озера и зайдите в гости к Сербосу и Адамчику ИИ',
      reward: 190,
      targetX: -292,
      targetZ: 288,
      targetName: 'Дом Сербоса у озера',
      goalValue: 1,
      progressValue: 0,
    }));

    ensureKind('earth_moscow', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'earth_moscow',
      title: 'Плоская Земля и Москва',
      subtitle: 'Отправляйтесь на плоскую Землю под куполом и приземлитесь на Красную площадь',
      reward: 350,
      targetPlanet: 'earth',
      targetX: planetId === 'earth' ? 0 : undefined,
      targetZ: planetId === 'earth' ? -10 : undefined,
      targetName: 'Красная площадь',
      goalValue: 1,
      progressValue: 0,
    }));

    ensureKind('earth_reptiloids', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'earth_reptiloids',
      title: 'Город рептилоидов за стеной',
      subtitle: 'На плоской Земле проезжайте через Ледяную стену на север до Города рептилоидов',
      reward: 380,
      targetPlanet: 'earth',
      targetX: planetId === 'earth' ? 0 : undefined,
      targetZ: planetId === 'earth' ? -1280 : undefined,
      targetName: 'Город рептилоидов',
      goalValue: 1,
      progressValue: 0,
    }));

    ensureKind('vehicle_hunt', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'vehicle_hunt',
      title: 'Охота за новым транспортом',
      subtitle: 'Найдите припаркованный грузовик или НЛО без колёс на улице и пересядьте',
      reward: 210,
      targetX: 58,
      targetZ: -30,
      targetName: 'Грузовик «Титан»',
      goalValue: 1,
      progressValue: 0,
    }));

    ensureKind('road_rings', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'road_rings',
      title: 'Энерго-врата на трассах',
      subtitle: 'Проедьте через 3 светящихся зелёных кольца прямо на дорогах',
      reward: 165,
      goalValue: 3,
      progressValue: 0,
    }));

    ensureKind('orbit_landing', () => ({
      id: `q_${this.questSeq++}`,
      kind: 'orbit_landing',
      title: 'Орбита и выбор города',
      subtitle: 'Поднимитесь на орбиту планеты и выберите точку для посадки',
      reward: 220,
      goalValue: 1,
      progressValue: 0,
    }));
  }

  public exportSaveState() {
    const serialize = (q: InternalQuest): QuestSaveItem => ({ ...q });
    return {
      credits: this.credits,
      cabinTheme: this.cabinTheme,
      holdHands: this.holdHands,
      vehicleId: this.currentVehicleId,
      unlockedVehicles: Array.from(this.unlockedVehicles),
      pedestriansHitCount: this.pedestriansHitCount,
      unlockedThemes: Array.from(this.unlockedThemes),
      visitedPlanets: Array.from(this.visitedPlanets),
      visitedSpecialSpots: Array.from(this.visitedSpecialSpots),
      discoveredCloudLayer: this.discoveredCloudLayer,
      discoveredCountryside: this.discoveredCountryside,
      questSeq: this.questSeq,
      activeQuest: this.activeQuest ? serialize(this.activeQuest) : null,
      questPool: this.questPool.map(serialize),
    };
  }

  public importSaveState(save: {
    credits: number;
    cabinTheme: CabinThemeId;
    holdHands: boolean;
    vehicleId?: VehicleTypeId;
    unlockedVehicles?: VehicleTypeId[];
    pedestriansHitCount?: number;
    unlockedThemes: CabinThemeId[];
    visitedPlanets: PlanetId[];
    visitedSpecialSpots: string[];
    discoveredCloudLayer: boolean;
    discoveredCountryside: boolean;
    questSeq: number;
    activeQuest: QuestSaveItem | null;
    questPool: QuestSaveItem[];
  }): void {
    this.credits = save.credits ?? 240;
    this.cabinTheme = save.cabinTheme ?? 'auto';
    this.holdHands = Boolean(save.holdHands);
    this.currentVehicleId = save.vehicleId ?? 'coupe';
    this.unlockedVehicles = new Set(save.unlockedVehicles?.length ? save.unlockedVehicles : ['coupe']);
    this.unlockedVehicles.add(this.currentVehicleId);
    this.pedestriansHitCount = save.pedestriansHitCount ?? 0;
    this.unlockedThemes = new Set(save.unlockedThemes?.length ? save.unlockedThemes : ['auto', 'amber']);
    this.visitedPlanets = new Set(save.visitedPlanets?.length ? save.visitedPlanets : ['coruscant']);
    this.visitedSpecialSpots = new Set(save.visitedSpecialSpots ?? []);
    this.discoveredCloudLayer = Boolean(save.discoveredCloudLayer);
    this.discoveredCountryside = Boolean(save.discoveredCountryside);
    this.questSeq = save.questSeq || 1;
    this.activeQuest = save.activeQuest ? { ...save.activeQuest } : null;
    this.questPool = (save.questPool ?? []).map((q) => ({ ...q }));
  }

  public getSnapshots(
    pos: THREE.Vector3,
    camera: THREE.Camera,
    camForward: THREE.Vector3,
    projVec: THREE.Vector3,
    toTarget: THREE.Vector3,
    inSpace: boolean,
  ): { active: ActiveQuestSnapshot | null; available: ActiveQuestSnapshot[] } {
    const toSnap = (q: InternalQuest, computeMarker: boolean): ActiveQuestSnapshot => {
      let distanceM: number | null = null;
      let hasMarker = false;
      let markerX = 0;
      let markerY = 0;
      let markerInFront = true;

      if (!inSpace && q.targetX !== undefined && q.targetZ !== undefined) {
        distanceM = Math.round(Math.hypot(q.targetX - pos.x, q.targetZ - pos.z));
        if (computeMarker) {
          hasMarker = true;
          toTarget.set(q.targetX - pos.x, 8 - pos.y, q.targetZ - pos.z);
          markerInFront = toTarget.dot(camForward) > 0;
          projVec.set(q.targetX, 8, q.targetZ).project(camera);
          markerX = THREE.MathUtils.clamp(markerInFront ? projVec.x : -projVec.x, -0.9, 0.9);
          markerY = THREE.MathUtils.clamp(markerInFront ? projVec.y : -projVec.y, -0.78, 0.78);
        }
      }

      const progressPct =
        q.kind === 'delivery' ||
        q.kind === 'planet_visit' ||
        q.kind === 'serbos_visit' ||
        q.kind === 'earth_moscow' ||
        q.kind === 'earth_reptiloids' ||
        q.kind === 'vehicle_hunt'
          ? 0
          : Math.min(100, Math.round((q.progressValue / Math.max(1, q.goalValue)) * 100));

      return {
        id: q.id,
        kind: q.kind,
        title: q.title,
        subtitle: q.subtitle,
        reward: q.reward,
        progressPct,
        distanceM,
        hasMarker,
        markerX,
        markerY,
        markerInFront,
      };
    };

    return {
      active: this.activeQuest ? toSnap(this.activeQuest, true) : null,
      available: this.questPool.slice(0, 6).map((q) => toSnap(q, false)),
    };
  }
}
