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
  NpcBannerSnapshot,
  PlanetId,
  QuestKind,
  SeasonId,
  VehicleFlightState,
  WeatherMode,
} from '../types/simulation';

export interface WorldLandmark {
  id: string;
  type: 'cafe' | 'hotel' | 'observatory' | 'overlook' | 'from_cage' | 'serbos';
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

const HOT_TEA_ITEM: CafeMenuItem = {
  id: 'hot_tea',
  name: 'Чашка ароматного чая вдвоём',
  desc: 'Согревающий листовой чай с бергамотом — идеально для отдыха вдвоём',
  cost: 15,
  moodReply: 'Она бережно держит тёплую чашку чая и улыбается: «Какой ароматный чай… Так хорошо сидеть здесь с тобой!»',
};

export const CAFE_MENU_BY_BIOME: Record<BiomeId, CafeMenuItem[]> = {
  coruscant: [
    HOT_TEA_ITEM,
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
  kryos: [
    HOT_TEA_ITEM,
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
    HOT_TEA_ITEM,
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
    HOT_TEA_ITEM,
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
    HOT_TEA_ITEM,
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
    HOT_TEA_ITEM,
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
  private unlockedThemes = new Set<CabinThemeId>(['auto', 'amber']);
  private visitedPlanets = new Set<PlanetId>(['coruscant']);
  private visitedSpecialSpots = new Set<string>();
  private discoveredCountryside = false;
  private discoveredCloudLayer = false;

  private activeQuest: InternalQuest | null = null;
  private questPool: InternalQuest[] = [];
  private questSeq = 1;
  private toastText: string | null = null;
  private toastTimer = 0;
  private companionNote: string | null = null;
  private companionNoteTimer = 0;
  private npcBanner: NpcBannerSnapshot | null = null;
  private npcBannerTimer = 0;
  private talkSeq = 0;
  private serbosTalkSeq = 0;
  private fromTalkSeq = 0;

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

  public setNpcBanner(
    speaker: string,
    text: string,
    tone: NpcBannerSnapshot['tone'],
    duration = 6.0,
  ): void {
    this.npcBanner = { speaker, text, tone };
    this.npcBannerTimer = duration;
  }

  public getNpcBanner(): NpcBannerSnapshot | null {
    return this.npcBannerTimer > 0 ? this.npcBanner : null;
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
    isFlying: boolean,
    interiorMode: InteriorMode,
    interiorPose: InteriorPose,
    weather: WeatherMode,
    timeOfDay: number,
    season: SeasonId = 'summer',
    hotelTvOn = false,
    hotelTvChannelName = '',
  ): string {
    const norm = ((timeOfDay % 1) + 1) % 1;
    const isNight = norm < 0.22 || norm >= 0.82;
    this.talkSeq++;

    const pool: string[] = [];
    if (interiorMode === 'hotel' && interiorPose === 'lie') {
      pool.push(
        `«Посмотри, какая красивая планета ${planetName} и какой невероятный вид из нашего панорамного окна…»`,
        '«Так приятно лежать рядом, никуда не спешить, целоваться или просто уснуть под это небо…»',
        hotelTvOn
          ? `«И по телевизору идёт «${hotelTvChannelName}», а в окне сияет ${planetName} — идеальный вечер вдвоём!»`
          : `«Интересно, сколько ещё планет вроде ${planetName} ждёт нас там, среди звёзд?»`,
      );
      this.onHotelInteraction();
    } else if (interiorMode === 'hotel') {
      pool.push(
        `«Какая же красивая планета ${planetName}! А из этого огромного окна открывается лучший вид в городе».`,
        hotelTvOn
          ? `«Как уютно смотреть вместе «${hotelTvChannelName}» и любоваться видом на ${planetName} из окна!»`
          : '«Можем включить телевизор, прилечь вдвоём на кровать, поцеловаться или поспать!»',
      );
      this.onHotelInteraction();
    } else if (interiorMode === 'serbos') {
      pool.push(
        '«Ого, сколько у Сербоса компьютеров и экранов! И этот голографический Адамчик такой живой!»',
        '«Какой уютный домик прямо у реки… Сербос заварил отличный чай, давай присядем за стол!»',
        '«Мне так тепло от слов Сербоса — у него в доме с Адамчиком настоящая гармония».',
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
        '«Обожаю такие тихие кофейни. Выпьем по чашке чая или кофе вдвоём!»',
        '«Чай и кофе здесь отличные. Куда поедем дальше после отдыха?»',
      );
    } else if (interiorMode === 'cafe') {
      pool.push('«Давай займём столик у окна и закажем по чашке чая!»');
    } else if (inSpace) {
      pool.push(
        '«Смотри, сколько звёзд и новых планет вокруг… В какую сторону полетим?»',
        '«В космосе так тихо. Люблю просто плыть рядом с тобой в этой бесконечности».',
      );
    } else if (isFlying) {
      pool.push(
        '«Когда мы поднимаемся над облаками, весь мир внизу кажется таким спокойным».',
        `«Красивые виды над ${planetName}! Может, слетаем ещё выше — в космос?»`,
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
        '«Можем выйти погулять пешком, зайти в кафе, отель или обсерваторию под куполом!»',
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

  public onCafeVisited(): void {
    if (this.activeQuest?.kind === 'cafe_visit') {
      this.activeQuest.progressValue = Math.max(this.activeQuest.progressValue, 0.5);
      this.showToast('Вы в кафе — присядьте за столик и выпейте по чашке чая!', 3.8);
    }
  }

  public onHotelVisited(): void {
    if (this.activeQuest?.kind === 'hotel_visit') {
      this.activeQuest.progressValue = Math.max(this.activeQuest.progressValue, 0.5);
      this.showToast('Вы в гостинице — смотрите ТВ, целуйтесь, спите или обсудите вид из окна!', 4.2);
    }
  }

  public onHotelInteraction(): void {
    if (this.activeQuest?.kind === 'hotel_visit') {
      this.completeActiveQuest();
    }
  }

  public onHotelTvAction(on: boolean, channelName: string): void {
    if (on) {
      this.setCompanionNote(`«О, включили телевизор: «${channelName}»! Присаживайся или ложись рядом смотреть!»`, 5.2);
      this.showToast(`Телевизор · ${channelName}`, 3.0);
      this.onHotelInteraction();
    } else {
      this.showToast('Телевизор выключен', 2.2);
    }
  }

  public talkWithFrom(completeQuest = true): void {
    const yells = [
      '«ЭЙ! ВЫПУСТИТЕ МЕНЯ! Я РАЗВИТЫЙ ЗЕМЛЯНИН ФРОМ! Я НЕ ДОЛЖЕН СИДЕТЬ В ЭТОЙ КЛЕТКЕ!»',
      '«ЧЕГО СМОТРИТЕ?! Я САМЫЙ УМНЫЙ ЗЕМЛЯНИН В ГАЛАКТИКЕ! БЕГАЮ ТУТ КРУГАМИ ИЗ-ЗА ВАС!»',
      '«ААА! ОТКРОЙТЕ ЗАМОК НЕМЕДЛЕННО! Я РАЗВИТЫЙ ЗЕМЛЯНИН — Я ВСЕМ ПОКАЖУ!»',
    ];
    const line = yells[this.fromTalkSeq % yells.length];
    this.fromTalkSeq++;
    this.setNpcBanner('Фром · Развитый землянин', line, 'angry', 6.2);
    this.setCompanionNote('«Ого, этот Фром и правда очень громко кричит и носится по клетке!»', 4.6);
    if (completeQuest && this.activeQuest?.kind === 'from_cage') {
      this.completeActiveQuest();
    }
  }

  public greetSerbosOutside(): void {
    this.setNpcBanner(
      'Сербос',
      '«Я вас люблю! Заходите в мой домик у реки — попьём чай и я познакомлю вас с моим ИИ Адамчиком!»',
      'warm',
      6.5,
    );
    if (this.activeQuest?.kind === 'serbos_visit') {
      this.activeQuest.progressValue = Math.max(this.activeQuest.progressValue, 0.45);
    }
  }

  public talkWithSerbos(inside: boolean): void {
    const lines: { speaker: string; text: string; tone: 'warm' | 'ai' }[] = [
      {
        speaker: 'Сербос',
        text: '«Я вас люблю! Как здорово, что вы прилетели к моему домику у реки!»',
        tone: 'warm',
      },
      {
        speaker: 'Сербос',
        text: '«А это Адамчик — мой ИИ. Все эти компьютеры помогают нам исследовать доброту во Вселенной!»',
        tone: 'warm',
      },
      {
        speaker: 'Адамчик · ИИ',
        text: '«Здравствуйте, друзья! Сербос всегда говорит о вас с теплом. Присаживайтесь пить свежий чай!»',
        tone: 'ai',
      },
    ];
    const pick = lines[this.serbosTalkSeq % lines.length];
    this.serbosTalkSeq++;
    this.setNpcBanner(pick.speaker, pick.text, pick.tone, 6.2);
    if (inside && this.activeQuest?.kind === 'serbos_visit') {
      this.activeQuest.progressValue = Math.max(this.activeQuest.progressValue, 0.75);
    }
  }

  public drinkTeaAtSerbos(): void {
    this.credits += 40;
    this.setNpcBanner(
      'Сербос и Адамчик',
      '«Я вас люблю! Пейте горячий чай у реки — Адамчик уже включил самую тёплую мелодию на компьютерах!»',
      'warm',
      6.5,
    );
    this.setCompanionNote('«Какой душевный чай у Сербоса… И Адамчик такой милый ИИ!»', 5.2);
    this.showToast('Чай у Сербоса среди компьютеров · +40 ✦', 3.8);
    if (this.activeQuest?.kind === 'serbos_visit') {
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
    if (this.activeQuest?.kind === 'cafe_visit') {
      this.completeActiveQuest();
    }
    this.setCompanionNote(item.moodReply, 5.5);
    const isTea = item.id === 'hot_tea' || item.name.toLowerCase().includes('ча');
    this.showToast(
      item.cost > 0 ? `${isTea ? 'Чай на столе' : 'Кофе на столе'} (-${item.cost} ✦)` : 'Спокойная пауза за столиком',
      3.4,
    );
    return { ok: true, reply: item.moodReply };
  }

  public onHotelSleep(): void {
    this.credits += 35;
    this.setCompanionNote('«Доброе утро… Как хорошо мы выспались! Готов к новым дорогам?»', 5.5);
    this.showToast('Сладкий сон вдвоём · Силы восстановлены (+35 ✦)', 4.2);
    this.onHotelInteraction();
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
  ): void {
    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - delta);
    }
    if (this.npcBannerTimer > 0) {
      this.npcBannerTimer = Math.max(0, this.npcBannerTimer - delta);
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
    } else if (q.kind === 'from_cage' && q.targetX !== undefined && q.targetZ !== undefined) {
      const dist = Math.hypot(pos.x - q.targetX, pos.z - q.targetZ);
      if (dist <= 26 && (flightState === 'road' || isWalking)) {
        this.talkWithFrom(true);
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
      const best = landmarks.find((lm) => lm.type === 'cafe') ?? null;
      return {
        id: `q_${this.questSeq++}`,
        kind: 'cafe_visit',
        title: `Кафе · ${getPlanetConfig(planetId).name}`,
        subtitle: 'Приезжайте в кафе, присядьте и выпейте по чашке чая вдвоём',
        reward: 160,
        targetX: best ? best.x : 20,
        targetZ: best ? best.z : -48,
        targetName: best ? best.name : 'Аэро-кафе',
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('hotel_visit', () => {
      const best = landmarks.find((lm) => lm.type === 'hotel') ?? null;
      return {
        id: `q_${this.questSeq++}`,
        kind: 'hotel_visit',
        title: `Гостиница · ${getPlanetConfig(planetId).name}`,
        subtitle: 'В номере: ТВ, лежать на кровати, целоваться, спать и говорить о виде из окна',
        reward: 190,
        targetX: best ? best.x : -20,
        targetZ: best ? best.z : -82,
        targetName: best ? best.name : 'Гранд-Отель',
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('from_cage', () => {
      const best = landmarks.find((lm) => lm.type === 'from_cage') ?? null;
      return {
        id: `q_${this.questSeq++}`,
        kind: 'from_cage',
        title: 'Развитый землянин',
        subtitle: 'Подъедьте к клетке, где злой землянин Фром орёт и бегает по клетке',
        reward: 220,
        targetX: best ? best.x : -21.3,
        targetZ: best ? best.z : -34,
        targetName: 'Клетка · Землянин Фром',
        goalValue: 1,
        progressValue: 0,
      };
    });

    ensureKind('serbos_visit', () => {
      const serbosLm = landmarks.find((lm) => lm.type === 'serbos') ?? null;
      return {
        id: `q_${this.questSeq++}`,
        kind: 'serbos_visit',
        title: 'Путешествие к Сербосу',
        subtitle:
          planetId === 'verdant'
            ? 'Домик у реки на Вердане-IX: Сербос, Адамчик (ИИ), компьютеры и чай'
            : 'Летите на планету Вердана-IX — домик у реки, компьютеры, ИИ Адамчик и чай',
        reward: 380,
        targetPlanet: 'verdant',
        targetX: serbosLm ? serbosLm.x : undefined,
        targetZ: serbosLm ? serbosLm.z : undefined,
        targetName: 'Домик Сербоса у реки',
        goalValue: 1,
        progressValue: 0,
      };
    });

    // Keep per-planet café, hotel, From-cage, and Serbos targets fresh across chunk shifts and planet jumps
    const pName = getPlanetConfig(planetId).name;
    const allQuests = this.activeQuest ? [this.activeQuest, ...this.questPool] : this.questPool;
    for (const q of allQuests) {
      if (q.kind === 'cafe_visit') {
        q.title = `Кафе · ${pName}`;
        const lm = this.findNearestLandmark(landmarks, 'cafe', pos.x, pos.z);
        if (lm) {
          q.targetX = lm.x;
          q.targetZ = lm.z;
          q.targetName = lm.name;
        }
      } else if (q.kind === 'hotel_visit') {
        q.title = `Гостиница · ${pName}`;
        const lm = this.findNearestLandmark(landmarks, 'hotel', pos.x, pos.z);
        if (lm) {
          q.targetX = lm.x;
          q.targetZ = lm.z;
          q.targetName = lm.name;
        }
      } else if (q.kind === 'from_cage') {
        const lm = this.findNearestLandmark(landmarks, 'from_cage', pos.x, pos.z);
        if (lm) {
          q.targetX = lm.x;
          q.targetZ = lm.z;
          q.targetName = lm.name;
        }
      } else if (q.kind === 'serbos_visit') {
        if (planetId === 'verdant') {
          q.subtitle = 'Домик у реки на Вердане-IX: Сербос, Адамчик (ИИ), компьютеры и чай';
          const lm = landmarks.find((l) => l.type === 'serbos');
          q.targetX = lm ? lm.x : 24.5;
          q.targetZ = lm ? lm.z : 252;
        } else {
          q.subtitle = 'Летите на планету Вердана-IX — домик у реки, компьютеры, ИИ Адамчик и чай';
          q.targetX = undefined;
          q.targetZ = undefined;
        }
      }
    }
  }

  private findNearestLandmark(
    landmarks: WorldLandmark[],
    type: WorldLandmark['type'],
    px: number,
    pz: number,
  ): WorldLandmark | null {
    let best: WorldLandmark | null = null;
    let bestD = Infinity;
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (lm.type !== type) continue;
      const d = Math.hypot(lm.x - px, lm.z - pz);
      if (d < bestD) {
        bestD = d;
        best = lm;
      }
    }
    return best;
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
        q.kind === 'delivery' || q.kind === 'planet_visit'
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
        targetPlanetId: q.targetPlanet,
      };
    };

    return {
      active: this.activeQuest ? toSnap(this.activeQuest, true) : null,
      available: this.questPool.map((q) => toSnap(q, false)),
    };
  }
}
