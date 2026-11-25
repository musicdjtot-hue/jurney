import * as THREE from 'three';
import type { VehicleFlightState, WeatherMode } from '../types/simulation';

export interface FacadeTextureSet {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createCoruscantFacadeTextures(maxAnisotropy: number): FacadeTextureSet[] {
  const styles = [
    {
      seed: 101,
      baseTop: '#1c222e',
      baseBottom: '#0e131b',
      ribColor: '#2a3342',
      windowColors: ['#ffcf70', '#ffa940', '#ffe8b3', '#7dd3fc'],
      slitStyle: 'terraced' as const,
    },
    {
      seed: 202,
      baseTop: '#131b26',
      baseBottom: '#090d14',
      ribColor: '#1f2b3d',
      windowColors: ['#38bdf8', '#7dd3fc', '#e0f2fe', '#fbbf24'],
      slitStyle: 'vertical' as const,
    },
    {
      seed: 303,
      baseTop: '#241f1c',
      baseBottom: '#110f0e',
      ribColor: '#362e29',
      windowColors: ['#fb923c', '#fdba74', '#fef08a', '#38bdf8'],
      slitStyle: 'industrial' as const,
    },
  ];

  return styles.map((style) => {
    const w = 512;
    const h = 1024;
    const rand = seededRand(style.seed);

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = w;
    albedoCanvas.height = h;
    const actx = albedoCanvas.getContext('2d')!;

    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = w;
    emissiveCanvas.height = h;
    const ectx = emissiveCanvas.getContext('2d')!;

    const grad = actx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, style.baseTop);
    grad.addColorStop(1, style.baseBottom);
    actx.fillStyle = grad;
    actx.fillRect(0, 0, w, h);

    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += 32) {
      actx.fillStyle = 'rgba(255,255,255,0.035)';
      actx.fillRect(0, y, w, 2);
      actx.fillStyle = 'rgba(0,0,0,0.28)';
      actx.fillRect(0, y + 2, w, 2);
    }

    const ribCount = style.slitStyle === 'vertical' ? 8 : 6;
    const ribSpacing = w / ribCount;
    for (let i = 0; i < ribCount; i++) {
      const rx = i * ribSpacing;
      actx.fillStyle = style.ribColor;
      actx.fillRect(rx, 0, 10, h);
      actx.fillStyle = 'rgba(0,0,0,0.35)';
      actx.fillRect(rx + 10, 0, 4, h);
    }

    const rows = 64;
    const cols = 32;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 1; r < rows - 1; r++) {
      const bandActive =
        style.slitStyle === 'terraced'
          ? r % 3 !== 0 && rand() > 0.15
          : style.slitStyle === 'industrial'
            ? r % 4 === 1 || r % 4 === 2
            : rand() > 0.2;

      if (!bandActive) continue;

      const rowTint = style.windowColors[Math.floor(rand() * style.windowColors.length)];

      for (let c = 0; c < cols; c++) {
        if (c % Math.floor(cols / ribCount) === 0) continue;

        const lit = rand() > 0.38;
        const wx = c * cellW + 2;
        const wy = r * cellH + 3;
        const ww = cellW - 4;
        const wh = style.slitStyle === 'vertical' ? cellH - 3 : cellH - 6;

        if (!lit) {
          actx.fillStyle = '#070a10';
          actx.fillRect(wx, wy, ww, wh);
          continue;
        }

        const brightness = 0.45 + rand() * 0.55;
        const color =
          rand() > 0.85
            ? style.windowColors[Math.floor(rand() * style.windowColors.length)]
            : rowTint;

        actx.fillStyle = color;
        actx.globalAlpha = 0.35 + brightness * 0.4;
        actx.fillRect(wx, wy, ww, wh);
        actx.globalAlpha = 1;

        ectx.fillStyle = color;
        ectx.globalAlpha = brightness;
        ectx.fillRect(wx, wy, ww, wh);
        ectx.globalAlpha = 1;
      }

      if (r % 16 === 0 && rand() > 0.35) {
        const bandColor = style.windowColors[Math.floor(rand() * style.windowColors.length)];
        ectx.fillStyle = bandColor;
        ectx.globalAlpha = 0.85;
        ectx.fillRect(0, r * cellH, w, 3);
        ectx.globalAlpha = 1;
      }
    }

    const map = new THREE.CanvasTexture(albedoCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = maxAnisotropy;

    const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;
    emissiveMap.anisotropy = maxAnisotropy;

    return { map, emissiveMap };
  });
}

export function createRoadTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 512;
  const rand = seededRand(777);

  const albedo = document.createElement('canvas');
  albedo.width = w;
  albedo.height = h;
  const actx = albedo.getContext('2d')!;

  const emissive = document.createElement('canvas');
  emissive.width = w;
  emissive.height = h;
  const ectx = emissive.getContext('2d')!;

  const rough = document.createElement('canvas');
  rough.width = w;
  rough.height = h;
  const rctx = rough.getContext('2d')!;

  actx.fillStyle = '#151922';
  actx.fillRect(0, 0, w, h);

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  rctx.fillStyle = '#a8a8a8';
  rctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6500; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const v = Math.floor(18 + rand() * 24);
    actx.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
    actx.fillRect(x, y, 2, 2);

    const rv = Math.floor(110 + rand() * 90);
    rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rctx.fillRect(x, y, 3, 4);
  }

  const trackPositions = [0.22, 0.38, 0.62, 0.78];
  for (const tp of trackPositions) {
    const gx = tp * w;
    const grad = rctx.createLinearGradient(gx - 28, 0, gx + 28, 0);
    grad.addColorStop(0, 'rgba(90,90,90,0)');
    grad.addColorStop(0.5, 'rgba(60,60,60,0.65)');
    grad.addColorStop(1, 'rgba(90,90,90,0)');
    rctx.fillStyle = grad;
    rctx.fillRect(gx - 28, 0, 56, h);
  }

  for (let y = 0; y < h; y += 128) {
    actx.fillStyle = 'rgba(0,0,0,0.45)';
    actx.fillRect(0, y, w, 3);
  }

  actx.fillStyle = '#38bdf8';
  actx.fillRect(18, 0, 5, h);
  actx.fillRect(w - 23, 0, 5, h);

  ectx.fillStyle = '#0ea5e9';
  ectx.fillRect(18, 0, 5, h);
  ectx.fillRect(w - 23, 0, 5, h);

  actx.fillStyle = '#f59e0b';
  ectx.fillStyle = '#d97706';
  for (let y = 16; y < h; y += 64) {
    actx.fillRect(w * 0.5 - 6, y, 3, 32);
    actx.fillRect(w * 0.5 + 3, y, 3, 32);
    ectx.fillStyle = '#f59e0b';
    ectx.fillRect(w * 0.5 - 6, y, 3, 32);
    ectx.fillRect(w * 0.5 + 3, y, 3, 32);
  }

  actx.fillStyle = 'rgba(203, 213, 225, 0.35)';
  for (let y = 0; y < h; y += 48) {
    actx.fillRect(w * 0.25 - 1, y, 2, 20);
    actx.fillRect(w * 0.75 - 1, y, 2, 20);
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(emissive);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rough);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, emissiveMap, roughnessMap };
}

export function createCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const lobes = [
    { x: 0.5, y: 0.52, r: 0.42, a: 0.42 },
    { x: 0.36, y: 0.54, r: 0.3, a: 0.36 },
    { x: 0.64, y: 0.55, r: 0.31, a: 0.36 },
    { x: 0.48, y: 0.4, r: 0.28, a: 0.34 },
    { x: 0.56, y: 0.45, r: 0.24, a: 0.28 },
  ];

  for (const lobe of lobes) {
    const cx = lobe.x * size;
    const cy = lobe.y * size;
    const rad = lobe.r * size;
    const g = ctx.createRadialGradient(cx, cy, rad * 0.08, cx, cy, rad);
    g.addColorStop(0, `rgba(255,255,255,${lobe.a})`);
    g.addColorStop(0.45, `rgba(248,250,252,${lobe.a * 0.65})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWindshieldRainTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRand(909);

  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < 220; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 8 + rand() * 28;
    const dx = (x - w * 0.5) * 0.06;
    const g = ctx.createLinearGradient(x, y, x + dx, y + len);
    g.addColorStop(0, 'rgba(186, 230, 253, 0)');
    g.addColorStop(0.5, 'rgba(224, 242, 254, 0.35)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + len);
    ctx.stroke();
  }

  for (let i = 0; i < 160; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 1 + rand() * 2.2;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.42)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class DashboardDisplay {
  public readonly texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastDraw = -1;

  constructor(maxAnisotropy: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 180;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;
    this.update(0, 0, 'road', 0, 0, 'clear', 0, false, false, 'Корускант');
  }

  public update(
    speedKmh: number,
    altitudeM: number,
    flightState: VehicleFlightState,
    rollRad: number,
    pitchRad: number,
    weather: WeatherMode,
    elapsed: number,
    inSpace: boolean,
    inOrbit: boolean,
    planetName: string,
  ): void {
    if (elapsed - this.lastDraw < 0.032 && this.lastDraw >= 0) return;
    this.lastDraw = elapsed;

    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const isOrbitPhase = flightState === 'orbit' || flightState === 'launching_orbit';
    const isSpace =
      inSpace || flightState === 'launching' || flightState === 'entering' || isOrbitPhase;
    const isAir = flightState !== 'road';
    const accent = isOrbitPhase ? '#38bdf8' : isSpace ? '#a78bfa' : isAir ? '#38bdf8' : '#f59e0b';

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = 0; y < h; y += 6) {
      ctx.fillRect(0, y, w, 1);
    }

    ctx.strokeStyle = isOrbitPhase
      ? 'rgba(56,189,248,0.55)'
      : isSpace
        ? 'rgba(167,139,250,0.45)'
        : isAir
          ? 'rgba(56,189,248,0.45)'
          : 'rgba(245,158,11,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Manrope", sans-serif';
    ctx.fillText('СКОРОСТЬ', 28, 38);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 58px "JetBrains Mono", monospace';
    ctx.fillText(String(Math.round(speedKmh)).padStart(3, '0'), 26, 102);

    ctx.fillStyle = accent;
    ctx.font = '600 18px "Manrope", sans-serif';
    ctx.fillText('КМ/Ч', 142, 102);

    const maxSpeed = isSpace ? 900 : isAir ? 360 : 260;
    const speedRatio = Math.min(1, Math.max(0, speedKmh / maxSpeed));
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(28, 124, 175, 10);
    ctx.fillStyle = accent;
    ctx.fillRect(28, 124, 175 * speedRatio, 10);

    const cx = w * 0.5;
    const cy = h * 0.52;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0c1626';
    ctx.fillRect(cx - 60, cy - 60, 120, 120);

    ctx.translate(cx, cy);
    ctx.rotate(-rollRad * 1.4);
    const pitchOffset = THREE.MathUtils.clamp(pitchRad * 120, -35, 35);
    ctx.fillStyle = isOrbitPhase
      ? 'rgba(56,189,248,0.2)'
      : isSpace
        ? 'rgba(167,139,250,0.18)'
        : isAir
          ? 'rgba(56,189,248,0.18)'
          : 'rgba(245,158,11,0.14)';
    ctx.fillRect(-70, pitchOffset, 140, 70);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-55, pitchOffset);
    ctx.lineTo(55, pitchOffset);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(226,232,240,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = '600 13px "Manrope", sans-serif';
    ctx.textAlign = 'center';
    const modeLabel =
      flightState === 'road'
        ? 'РЕЖИМ: ТРАССА'
        : flightState === 'ascending'
          ? 'РЕПУЛЬСОРЫ: ВЗЛЁТ'
          : flightState === 'descending'
            ? 'РЕПУЛЬСОРЫ: ПОСАДКА'
            : flightState === 'launching_orbit'
              ? 'ВЫХОД НА ОРБИТУ'
              : flightState === 'orbit'
                ? 'РЕЖИМ: ОРБИТА'
                : flightState === 'launching'
                  ? 'ПРЫЖОК В КОСМОС'
                  : flightState === 'entering'
                    ? 'ПОСАДКА В ГОРОД'
                    : flightState === 'space'
                      ? inOrbit
                        ? 'ОРБИТА ПЛАНЕТЫ'
                        : 'РЕЖИМ: КОСМОС'
                      : 'РЕЖИМ: ПОЛЁТ В ОБЛАКАХ';
    ctx.fillText(modeLabel, cx, 26);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Manrope", sans-serif';
    ctx.fillText(inSpace || isOrbitPhase ? 'СЕКТОР' : 'ВЫСОТА', 435, 38);

    if (inSpace || isOrbitPhase) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 22px "Exo 2", sans-serif';
      ctx.fillText(planetName.toUpperCase(), 435, 84);
      ctx.fillStyle = accent;
      ctx.font = '500 14px "Manrope", sans-serif';
      ctx.fillText(
        isOrbitPhase ? 'ОРБИТА · ВЫБОР ГОРОДА' : inOrbit ? 'ОРБИТАЛЬНАЯ ДУГА' : 'ГЛУБОКИЙ КОСМОС',
        435,
        134,
      );
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 46px "JetBrains Mono", monospace';
      ctx.fillText(`${Math.round(altitudeM)}`, 435, 92);

      ctx.fillStyle = accent;
      ctx.font = '600 18px "Manrope", sans-serif';
      ctx.fillText('М', 555, 92);

      const weatherNames: Record<WeatherMode, string> = {
        clear: 'ПОГОДА: ЯСНО',
        cloudy: 'ПОГОДА: ОБЛАЧНО',
        rain: 'ПОГОДА: ДОЖДЬ',
        storm: 'ПОГОДА: ГРОЗА',
        snow: 'ПОГОДА: СНЕГ',
      };
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 14px "Manrope", sans-serif';
      ctx.fillText(weatherNames[weather], 435, 134);
    }

    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

export function createNeonSignTextures(maxAnisotropy: number): THREE.CanvasTexture[] {
  const configs = [
    {
      bg: '#08101c',
      border: '#38bdf8',
      accent: '#f59e0b',
      title: 'СЕКТОР 44',
      sub: 'НЕБЕСНЫЙ ПОРТ · ТРАНЗИТ',
      glyphs: '◇ ◈ ◇',
    },
    {
      bg: '#140b18',
      border: '#f472b6',
      accent: '#38bdf8',
      title: 'КОРУС · СИНТЕЗ',
      sub: 'РЕПУЛЬСОР · СЕРВИС 24',
      glyphs: '◩ ◪ ◩',
    },
    {
      bg: '#140f08',
      border: '#fb923c',
      accent: '#fde047',
      title: 'АЭРО-КАФЕ',
      sub: 'УРОВЕНЬ 1313 · ОТКРЫТО',
      glyphs: '△ ▽ △',
    },
    {
      bg: '#071618',
      border: '#2dd4bf',
      accent: '#e0f2fe',
      title: 'ГАЛАКТИК-ТРЕЙД',
      sub: 'ГИПЕР-ЛИНИЯ · ЦЕНТР',
      glyphs: '◎ ◉ ◎',
    },
  ];

  return configs.map((cfg) => {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, w, h);

    // Scanline texture
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 0; y < h; y += 6) {
      ctx.fillRect(0, y, w, 2);
    }

    // Outer neon border
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Inner accent bars
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(24, 28, 12, h - 56);
    ctx.fillRect(w - 36, 28, 12, h - 56);

    // Geometric emblem
    ctx.fillStyle = cfg.accent;
    ctx.font = '700 28px "Exo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.glyphs, w * 0.5, 68);

    // Main glowing title
    ctx.shadowColor = cfg.border;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px "Exo 2", sans-serif';
    ctx.fillText(cfg.title, w * 0.5, 138);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = cfg.border;
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(cfg.sub, w * 0.5, 198);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  });
}

export function createFieldGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRand(7741);

  ctx.fillStyle = '#c8d6b8';
  ctx.fillRect(0, 0, size, size);

  // Broad organic field & meadow bands
  for (let i = 0; i < 18; i++) {
    const y = (i / 18) * size;
    const h = size / 18 + 6;
    const tone = i % 2 === 0 ? 'rgba(190, 212, 162, 0.34)' : 'rgba(155, 178, 128, 0.28)';
    ctx.fillStyle = tone;
    ctx.fillRect(0, y, size, h);
  }

  // Organic grass / wildflower / earth patches
  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 14;
    const shade = rand();
    ctx.fillStyle =
      shade > 0.72
        ? 'rgba(235, 224, 172, 0.22)'
        : shade > 0.35
          ? 'rgba(130, 168, 92, 0.24)'
          : 'rgba(98, 132, 72, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine blades / texture grain
  for (let i = 0; i < 3200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(40,56,28,0.18)';
    ctx.fillRect(x, y, 2, 5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}


