import * as THREE from 'three';
import type { BiomeId, SeasonId, WeatherMode } from '../types/simulation';

const _zenith = new THREE.Color();
const _horizon = new THREE.Color();
const _groundGlow = new THREE.Color();
const _sunColor = new THREE.Color();
const _stormTint = new THREE.Color();
const _whiteColor = new THREE.Color('#ffffff');
const _nightCloudColor = new THREE.Color('#27334a');
const _deepSpaceColor = new THREE.Color('#020309');
const _planetHorizonTint = new THREE.Color();
const _planetZenithTint = new THREE.Color();
const _lightDir = new THREE.Vector3();

interface SkyPalette {
  zenith: THREE.Color;
  horizon: THREE.Color;
  groundGlow: THREE.Color;
  sun: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
}

const PLANET_SKY_TINTS: Record<
  BiomeId,
  { zenithTint: string; horizonTint: string; sunTint: string; tintStrength: number }
> = {
  coruscant: {
    zenithTint: '#1e3a8a',
    horizonTint: '#f59e0b',
    sunTint: '#fff5e0',
    tintStrength: 0.0,
  },
  earth: {
    zenithTint: '#1d4ed8',
    horizonTint: '#bae6fd',
    sunTint: '#fffbeb',
    tintStrength: 0.42,
  },
  kryos: {
    zenithTint: '#0c2d48',
    horizonTint: '#7dd3fc',
    sunTint: '#e0f2fe',
    tintStrength: 0.42,
  },
  solaris: {
    zenithTint: '#451a03',
    horizonTint: '#fb923c',
    sunTint: '#fde68a',
    tintStrength: 0.48,
  },
  verdant: {
    zenithTint: '#064e3b',
    horizonTint: '#6ee7b7',
    sunTint: '#fef9c3',
    tintStrength: 0.44,
  },
  amethyst: {
    zenithTint: '#2e1065',
    horizonTint: '#e879f9',
    sunTint: '#fae8ff',
    tintStrength: 0.46,
  },
  crimson: {
    zenithTint: '#450a0a',
    horizonTint: '#fb7185',
    sunTint: '#fed7aa',
    tintStrength: 0.46,
  },
};

const KEYFRAMES: { t: number; p: SkyPalette }[] = [
  {
    t: 0.0,
    p: {
      zenith: new THREE.Color('#040712'),
      horizon: new THREE.Color('#131b30'),
      groundGlow: new THREE.Color('#2d1b12'),
      sun: new THREE.Color('#93c5fd'),
      hemiSky: new THREE.Color('#1e293b'),
      hemiGround: new THREE.Color('#1a120d'),
    },
  },
  {
    t: 0.22,
    p: {
      zenith: new THREE.Color('#0d1633'),
      horizon: new THREE.Color('#5b3256'),
      groundGlow: new THREE.Color('#4a2518'),
      sun: new THREE.Color('#fb923c'),
      hemiSky: new THREE.Color('#475569'),
      hemiGround: new THREE.Color('#291b14'),
    },
  },
  {
    t: 0.28,
    p: {
      zenith: new THREE.Color('#254b7c'),
      horizon: new THREE.Color('#f59e6c'),
      groundGlow: new THREE.Color('#6b3b24'),
      sun: new THREE.Color('#fdba74'),
      hemiSky: new THREE.Color('#93c5fd'),
      hemiGround: new THREE.Color('#3b2a22'),
    },
  },
  {
    t: 0.5,
    p: {
      zenith: new THREE.Color('#1e5799'),
      horizon: new THREE.Color('#b6d8f2'),
      groundGlow: new THREE.Color('#5a6778'),
      sun: new THREE.Color('#fff5e0'),
      hemiSky: new THREE.Color('#bae6fd'),
      hemiGround: new THREE.Color('#334155'),
    },
  },
  {
    t: 0.72,
    p: {
      zenith: new THREE.Color('#1e254d'),
      horizon: new THREE.Color('#e8743b'),
      groundGlow: new THREE.Color('#5c2414'),
      sun: new THREE.Color('#ff8c42'),
      hemiSky: new THREE.Color('#fb923c'),
      hemiGround: new THREE.Color('#2a1812'),
    },
  },
  {
    t: 0.82,
    p: {
      zenith: new THREE.Color('#0b1026'),
      horizon: new THREE.Color('#432447'),
      groundGlow: new THREE.Color('#381d14'),
      sun: new THREE.Color('#a78bfa'),
      hemiSky: new THREE.Color('#334155'),
      hemiGround: new THREE.Color('#1f1512'),
    },
  },
  {
    t: 1.0,
    p: {
      zenith: new THREE.Color('#040712'),
      horizon: new THREE.Color('#131b30'),
      groundGlow: new THREE.Color('#2d1b12'),
      sun: new THREE.Color('#93c5fd'),
      hemiSky: new THREE.Color('#1e293b'),
      hemiGround: new THREE.Color('#1a120d'),
    },
  },
];

export class SkyAtmosphere {
  public readonly dome: THREE.Mesh;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  public readonly fog: THREE.FogExp2;
  public readonly sunDir = new THREE.Vector3(0.4, 0.5, -0.7);
  public readonly horizonColor = new THREE.Color('#131b30');
  public readonly sunColor = new THREE.Color('#fff5e0');
  public nightFactor = 0.5;
  public cloudTint = new THREE.Color('#ffffff');

  private skyMaterial: THREE.ShaderMaterial;
  private starPoints: THREE.Points;
  private starMaterial: THREE.PointsMaterial;
  private lightningFlash = 0;
  private planetId: BiomeId = 'coruscant';

  constructor(scene: THREE.Scene, isSoftwareGl: boolean, isLowTierGpu = false) {
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#040712') },
        uHorizon: { value: new THREE.Color('#131b30') },
        uGroundGlow: { value: new THREE.Color('#2d1b12') },
        uSunDir: { value: new THREE.Vector3(0.4, 0.5, -0.7) },
        uSunColor: { value: new THREE.Color('#fff5e0') },
        uNightFactor: { value: 0.5 },
        uOvercast: { value: 0.0 },
        uLightning: { value: 0.0 },
        uSpaceFactor: { value: 0.0 },
        uFlatDome: { value: 0.0 },
        uEarthMoonDir: { value: new THREE.Vector3(-0.4, 0.55, 0.65) },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uGroundGlow;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uNightFactor;
        uniform float uOvercast;
        uniform float uLightning;
        uniform float uSpaceFactor;
        uniform float uFlatDome;
        uniform vec3 uEarthMoonDir;
        varying vec3 vWorldDir;

        void main() {
          if (uSpaceFactor > 0.992) {
            gl_FragColor = vec4(0.008, 0.012, 0.032, 1.0);
            return;
          }
          vec3 dir = normalize(vWorldDir);
          float h = dir.y;

          float skyT = pow(clamp(h, 0.0, 1.0), 0.52);
          vec3 sky = mix(uHorizon, uZenith, skyT);

          float lowT = pow(clamp(-h, 0.0, 1.0), 0.45);
          sky = mix(sky, uGroundGlow, lowT);

          float atmoVis = 1.0 - uSpaceFactor;
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunHalo = pow(sunDot, 10.0) * 0.42 * (1.0 - uOvercast * 0.75) * atmoVis;
          float sunCore = smoothstep(0.9978, 0.9993, sunDot) * (1.0 - uOvercast * 0.85) * (1.0 - uNightFactor * (1.0 - uFlatDome * 0.45) * 0.7) * atmoVis;
          sky += uSunColor * (sunHalo + sunCore * 2.2);

          if (uFlatDome > 0.5) {
            // Flat Earth visible Moon & subtle firmament dome lattice overhead
            float emDot = max(dot(dir, normalize(uEarthMoonDir)), 0.0);
            float emHalo = pow(emDot, 24.0) * 0.25 * (1.0 - uOvercast * 0.7) * atmoVis;
            float emCore = smoothstep(0.9984, 0.9993, emDot) * (1.0 - uOvercast * 0.85) * atmoVis;
            sky += vec3(0.86, 0.93, 1.0) * (emHalo + emCore * 1.35);

            if (h > 0.05) {
              float az = atan(dir.z, dir.x);
              float meridians = smoothstep(0.985, 0.998, abs(cos(az * 6.0))) * smoothstep(0.05, 0.45, h);
              float rings = smoothstep(0.988, 0.999, abs(cos(h * 18.0))) * smoothstep(0.06, 0.5, h);
              float domeGrid = clamp(meridians + rings, 0.0, 1.0) * 0.11 * atmoVis;
              sky += vec3(0.45, 0.78, 1.0) * domeGrid;
            }
          } else if (uNightFactor > 0.02) {
            vec3 moon1Dir = normalize(vec3(-0.55, 0.42, -0.72));
            vec3 moon2Dir = normalize(vec3(-0.44, 0.28, -0.85));
            float m1 = smoothstep(0.9991, 0.9995, max(dot(dir, moon1Dir), 0.0));
            float m2 = smoothstep(0.99955, 0.99975, max(dot(dir, moon2Dir), 0.0));
            float moonVis = clamp(uNightFactor * 1.1, 0.0, 1.0) * (1.0 - uOvercast * 0.85) * atmoVis;
            sky += vec3(0.82, 0.90, 1.0) * m1 * 0.95 * moonVis;
            sky += vec3(0.98, 0.84, 0.68) * m2 * 0.75 * moonVis;
          }

          sky += vec3(0.65, 0.78, 1.0) * uLightning * (0.2 + 0.5 * (1.0 - abs(h))) * atmoVis;
          sky = mix(sky, vec3(0.008, 0.012, 0.032), clamp(uSpaceFactor, 0.0, 1.0));

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });

    this.dome = new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 20), this.skyMaterial);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.05 + Math.random() * 0.95);
      const r = 1950;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 3.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      fog: false,
    });
    this.starPoints = new THREE.Points(starGeo, this.starMaterial);
    this.starPoints.frustumCulled = false;
    scene.add(this.starPoints);

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 2.3);
    this.sunLight.position.set(120, 180, -140);
    if (!isSoftwareGl && !isLowTierGpu) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      const d = 100;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 420;
      this.sunLight.shadow.bias = -0.0006;
      this.sunLight.shadow.normalBias = 0.03;
    }
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x2a1812, 0.75);
    scene.add(this.hemiLight);

    this.fog = new THREE.FogExp2(0x131b30, 0.0014);
    scene.fog = this.fog;
  }

  public setPlanetId(id: BiomeId): void {
    this.planetId = id;
  }

  public update(
    timeOfDay: number,
    weather: WeatherMode,
    weatherBlend: number,
    refPos: THREE.Vector3,
    altitudeM: number,
    spaceFactor: number,
    delta: number,
    season: SeasonId = 'summer',
  ): { nightFactor: number; lightning: number } {
    const t = ((timeOfDay % 1) + 1) % 1;

    let k0 = KEYFRAMES[0];
    let k1 = KEYFRAMES[1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (t >= KEYFRAMES[i].t && t <= KEYFRAMES[i + 1].t) {
        k0 = KEYFRAMES[i];
        k1 = KEYFRAMES[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, k1.t - k0.t);
    const alpha = THREE.MathUtils.smoothstep((t - k0.t) / span, 0, 1);

    _zenith.copy(k0.p.zenith).lerp(k1.p.zenith, alpha);
    _horizon.copy(k0.p.horizon).lerp(k1.p.horizon, alpha);
    _groundGlow.copy(k0.p.groundGlow).lerp(k1.p.groundGlow, alpha);
    _sunColor.copy(k0.p.sun).lerp(k1.p.sun, alpha);

    // Apply per-planet atmospheric palette tint
    const pTint = PLANET_SKY_TINTS[this.planetId];
    if (pTint.tintStrength > 0) {
      _planetZenithTint.set(pTint.zenithTint);
      _planetHorizonTint.set(pTint.horizonTint);
      _zenith.lerp(_planetZenithTint, pTint.tintStrength);
      _horizon.lerp(_planetHorizonTint, pTint.tintStrength * 0.85);
      _groundGlow.lerp(_planetZenithTint, pTint.tintStrength * 0.6);
    }

    // Subtle seasonal atmosphere tinting
    if (season === 'winter') {
      _zenith.lerp(_planetZenithTint.set('#1e3a5f'), 0.22);
      _horizon.lerp(_planetHorizonTint.set('#cbd5e1'), 0.2);
    } else if (season === 'autumn') {
      _horizon.lerp(_planetHorizonTint.set('#f59e0b'), 0.14);
    } else if (season === 'spring') {
      _horizon.lerp(_planetHorizonTint.set('#a7f3d0'), 0.1);
    }

    const dayAmount = Math.max(0, Math.sin((t - 0.2) * Math.PI * 1.666));
    const sunElev = Math.sin((t - 0.25) * Math.PI * 2);
    this.nightFactor = THREE.MathUtils.clamp(1 - (sunElev + 0.15) / 0.75, 0, 1);

    const overcastTarget =
      weather === 'clear'
        ? 0.0
        : weather === 'cloudy'
          ? 0.55
          : weather === 'snow'
            ? 0.45
            : weather === 'rain'
              ? 0.72
              : 0.88;
    const overcast = overcastTarget * (0.4 + 0.6 * weatherBlend) * (1 - spaceFactor);

    if (weather === 'storm' && spaceFactor < 0.3 && Math.random() < delta * 0.28) {
      this.lightningFlash = 0.75 + Math.random() * 0.25;
    }
    this.lightningFlash = THREE.MathUtils.damp(this.lightningFlash, 0, 7.5, delta);

    _stormTint.set(
      weather === 'snow'
        ? this.nightFactor > 0.5
          ? '#24344d'
          : '#94a3b8'
        : this.nightFactor > 0.5
          ? '#121a28'
          : '#4a5568',
    );
    _zenith.lerp(_stormTint, overcast * 0.75);
    _horizon.lerp(_stormTint, overcast * 0.68);
    this.horizonColor.copy(_horizon);
    this.sunColor.copy(_sunColor);

    const sunAngle = (t - 0.25) * Math.PI * 2;
    if (this.planetId === 'earth') {
      // On Flat Earth, both Sun & Moon circle visibly overhead under the dome
      this.sunDir
        .set(Math.cos(sunAngle) * 0.72, 0.42 + Math.sin(sunAngle) * 0.26, Math.sin(sunAngle) * 0.72)
        .normalize();
      this.skyMaterial.uniforms.uEarthMoonDir.value
        .set(Math.cos(sunAngle + Math.PI) * 0.74, 0.36 - Math.sin(sunAngle) * 0.22, Math.sin(sunAngle + Math.PI) * 0.74)
        .normalize();
      this.skyMaterial.uniforms.uFlatDome.value = 1.0;
    } else {
      this.sunDir
        .set(Math.cos(sunAngle) * 0.75, Math.max(-0.25, Math.sin(sunAngle)), -0.65)
        .normalize();
      this.skyMaterial.uniforms.uFlatDome.value = 0.0;
    }

    this.dome.position.copy(refPos);
    this.starPoints.position.copy(refPos);

    this.skyMaterial.uniforms.uZenith.value.copy(_zenith);
    this.skyMaterial.uniforms.uHorizon.value.copy(_horizon);
    this.skyMaterial.uniforms.uGroundGlow.value.copy(_groundGlow);
    this.skyMaterial.uniforms.uSunDir.value.copy(this.sunDir);
    this.skyMaterial.uniforms.uSunColor.value.copy(_sunColor);
    this.skyMaterial.uniforms.uNightFactor.value = this.nightFactor;
    this.skyMaterial.uniforms.uOvercast.value = overcast;
    this.skyMaterial.uniforms.uLightning.value = this.lightningFlash;
    this.skyMaterial.uniforms.uSpaceFactor.value = spaceFactor;

    const atmoStarOpacity =
      THREE.MathUtils.clamp((this.nightFactor - 0.25) * 1.1, 0, 0.85) * (1 - overcast * 0.9);
    this.starMaterial.opacity = atmoStarOpacity * (1 - spaceFactor * 0.75);

    if (spaceFactor > 0.5) {
      _lightDir.set(0.55, 0.4, 0.72).normalize();
      this.sunLight.position.copy(refPos).addScaledVector(_lightDir, 900);
      this.sunLight.target.position.copy(refPos);
      this.sunLight.target.updateMatrixWorld();
      this.sunLight.color.set('#fff7ed');
      this.sunLight.intensity = THREE.MathUtils.lerp(1.4, 2.2, spaceFactor);
    } else {
      _lightDir.copy(this.sunDir);
      if (_lightDir.y < 0.12) {
        _lightDir.set(-0.55, 0.45, -0.7).normalize();
      }
      this.sunLight.position.copy(refPos).addScaledVector(_lightDir, 220);
      this.sunLight.target.position.copy(refPos);
      this.sunLight.target.updateMatrixWorld();

      this.sunLight.color.copy(_sunColor);
      const baseSunIntensity =
        this.nightFactor > 0.7 ? 0.7 : THREE.MathUtils.lerp(2.65, 0.88, this.nightFactor);
      this.sunLight.intensity = baseSunIntensity * (1 - overcast * 0.55) + this.lightningFlash * 1.8;
    }

    this.hemiLight.color
      .copy(k0.p.hemiSky)
      .lerp(k1.p.hemiSky, alpha)
      .lerp(_stormTint, overcast * 0.45)
      .lerp(_planetHorizonTint, pTint.tintStrength * 0.35);
    this.hemiLight.groundColor.copy(k0.p.hemiGround).lerp(k1.p.hemiGround, alpha);
    this.hemiLight.intensity =
      (THREE.MathUtils.lerp(0.95, 0.42, this.nightFactor) +
        dayAmount * 0.1 +
        this.lightningFlash * 0.5) *
      (1 - spaceFactor * 0.45);

    const baseFog =
      weather === 'clear'
        ? 0.00105
        : weather === 'cloudy'
          ? 0.00145
          : weather === 'snow'
            ? 0.00175
            : weather === 'rain'
              ? 0.00195
              : 0.00245;
    const altRelief = THREE.MathUtils.clamp((altitudeM - 55) / 140, 0, 0.65);
    this.fog.color
      .copy(_horizon)
      .offsetHSL(0, 0, this.lightningFlash * 0.12)
      .lerp(_deepSpaceColor, spaceFactor);
    this.fog.density = baseFog * (1 - altRelief) * THREE.MathUtils.clamp(1 - spaceFactor * 1.15, 0, 1);

    this.cloudTint
      .copy(_horizon)
      .lerp(_whiteColor, 0.45 * (1 - this.nightFactor))
      .lerp(_nightCloudColor, this.nightFactor * 0.55)
      .offsetHSL(0, 0, this.lightningFlash * 0.35);

    return { nightFactor: this.nightFactor, lightning: this.lightningFlash };
  }

  public dispose(): void {
    this.dome.geometry.dispose();
    this.skyMaterial.dispose();
    this.starPoints.geometry.dispose();
    this.starMaterial.dispose();
  }
}
