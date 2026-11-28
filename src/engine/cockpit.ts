import * as THREE from 'three';
import { BlondePassengerRig, BlondeWalkerRig } from './companion';
import { DashboardDisplay, MovieScreenDisplay } from './textures';
import type {
  CabinThemeId,
  RpgEquipMap,
  RvStationKind,
  VehicleFlightState,
  VehicleTypeId,
  WeatherMode,
} from '../types/simulation';

const DRIVER_X = -0.42;
const PASSENGER_X = 0.42;

function createQuadGeometry(
  bl: THREE.Vector3,
  br: THREE.Vector3,
  tr: THREE.Vector3,
  tl: THREE.Vector3,
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    bl.x, bl.y, bl.z,
    br.x, br.y, br.z,
    tr.x, tr.y, tr.z,
    tl.x, tl.y, tl.z,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

function createStrutBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  width: number,
  depth: number,
  mat: THREE.Material,
  parent: THREE.Group,
  disposables: { dispose: () => void }[],
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const geo = new THREE.BoxGeometry(width, len, depth);
  disposables.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.addVectors(p1, p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
  return mesh;
}

function createWindshieldWeatherShader(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uRain: { value: 0 },
      uSnow: { value: 0 },
      uSteer: { value: 0 },
      uSpeed: { value: 0 },
      uDetail: { value: 1.0 },
      uTint: { value: new THREE.Color('#dbeafe') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uRain;
      uniform float uSnow;
      uniform float uSteer;
      uniform float uSpeed;
      uniform float uDetail;
      uniform vec3 uTint;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      vec2 rainLayer(vec2 uv, float scale, float t) {
        vec2 aspect = vec2(2.4, 1.0);
        vec2 st = uv * scale * aspect;
        float colShift = hash21(vec2(floor(st.x), scale));
        st.y += t * (0.45 + colShift * 0.35);

        vec2 gv = fract(st) - 0.5;
        vec2 id = floor(st);
        float n = hash21(id);

        float phase = t * (1.8 + n * 1.4) + n * 6.2831;
        float dropY = 0.38 - fract(phase * 0.25) * 0.78;
        float wiggle = sin(uv.y * 28.0 + n * 14.0 + uSteer * 2.5) * 0.08;
        float dropX = (n - 0.5) * 0.52 + wiggle;

        vec2 d = (gv - vec2(dropX, dropY)) * vec2(1.0, 1.45);
        float bead = smoothstep(0.18, 0.03, length(d)) * 1.35;

        float aboveMask = smoothstep(dropY - 0.02, dropY + 0.06, gv.y) * smoothstep(0.49, 0.22, gv.y);
        float trailDist = abs(gv.x - dropX);
        float trailWidth = mix(0.065, 0.016, clamp((gv.y - dropY) * 1.5, 0.0, 1.0));
        float trail = smoothstep(trailWidth, 0.0, trailDist) * aboveMask * 0.78;

        float spec = smoothstep(0.12, 0.01, length(d - vec2(-0.025, -0.045))) * 1.25;

        float vis = step(0.30, n);
        return vec2((bead + trail) * vis, spec * vis);
      }

      float snowLayer(vec2 uv, float scale, float t) {
        vec2 st = uv * vec2(scale * 1.9, scale);
        st.y += t * 0.14;
        st.x += sin(t * 0.7 + uv.y * 6.0) * 0.22;
        vec2 gv = fract(st) - 0.5;
        float n = hash21(floor(st));
        vec2 off = vec2(n - 0.5, fract(n * 17.3) - 0.5) * 0.48;
        float flake = smoothstep(0.24, 0.03, length(gv - off));
        return flake * step(0.46, n);
      }

      void main() {
        if (uRain <= 0.005 && uSnow <= 0.005) discard;

        vec2 uv = vUv;
        uv.x += (1.0 - uv.y) * uSteer * 0.045;

        float t = uTime * (0.95 + clamp(uSpeed / 180.0, 0.0, 0.85));
        float rainMask = 0.0;
        float highlight = 0.0;
        if (uRain > 0.005) {
          vec2 l1 = rainLayer(uv, 11.0, t);
          vec2 l2 = rainLayer(uv + vec2(0.37, 0.19), 18.0, t * 1.25);

          float micro = 0.0;
          if (uDetail > 0.5) {
            vec2 mst = uv * vec2(52.0, 28.0);
            vec2 mgv = fract(mst) - 0.5;
            float mn = hash21(floor(mst));
            micro = smoothstep(0.20, 0.04, length(mgv)) * step(0.58, mn) * 0.45;
          }

          rainMask = clamp((l1.x * 0.9 + l2.x * 0.7 + micro) * uRain, 0.0, 0.88);
          highlight = clamp((l1.y + l2.y * 0.8) * uRain, 0.0, 1.0);
        }

        float snowMask = 0.0;
        if (uSnow > 0.005) {
          float sn1 = snowLayer(vUv, 14.0, uTime * (0.5 + clamp(uSpeed / 220.0, 0.0, 0.6)));
          float sn2 = snowLayer(vUv + vec2(0.41, 0.23), 24.0, uTime * 0.65);
          float edgeFrost = smoothstep(0.35, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y))) * 0.25;
          snowMask = clamp((sn1 * 0.8 + sn2 * 0.6 + edgeFrost) * uSnow, 0.0, 0.82);
        }

        float totalAlpha = clamp(rainMask + snowMask, 0.0, 0.90);
        vec3 rainCol = mix(uTint * 0.82 + vec3(0.08), vec3(1.0), highlight * 0.85);
        vec3 snowCol = vec3(0.94, 0.98, 1.0);
        vec3 col = mix(rainCol, snowCol, snowMask / max(0.001, totalAlpha));
        gl_FragColor = vec4(col, totalAlpha);
      }
    `,
  });
}

export interface CockpitCabinOptions {
  cabinTintDark?: boolean;
  cabinRoofLight?: boolean;
  cabinSeatsReclined?: boolean;
  cabinMonitorOpen?: boolean;
  leftWindowOpen?: boolean;
  rightWindowOpen?: boolean;
  rvLightsOn?: boolean;
  rvTvOn?: boolean;
  rvShowerOn?: boolean;
  rvCoffeeBrewed?: boolean;
  rvWindowTinted?: boolean;
  rvFridgeOpen?: boolean;
  rvSunroofOpen?: boolean;
  isInRvCabin?: boolean;
  rvPassengerActive?: boolean;
}

interface ShowerDropMeta {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  phase: number;
}

const _domeLightTint = new THREE.Color(0xfffbeb);
const _tvLightTint = new THREE.Color(0x7dd3fc);
const _rvWarmTint = new THREE.Color(0xfff4d6);

export class CockpitRig {
  public readonly group = new THREE.Group();
  public readonly companion: BlondePassengerRig;
  public readonly rvCompanion: BlondeWalkerRig;
  private steeringWheelGroup = new THREE.Group();
  private drivePrism: THREE.Mesh;
  private display: DashboardDisplay;
  private movieDisplay: MovieScreenDisplay;
  private accentMaterials: THREE.MeshStandardMaterial[] = [];
  private accentColorRoad = new THREE.Color('#f59e0b');
  private accentColorAir = new THREE.Color('#38bdf8');
  private accentColorSpace = new THREE.Color('#a78bfa');
  private accentColorCustom = new THREE.Color('#f59e0b');
  private currentAccent = new THREE.Color('#f59e0b');
  private windshieldRainMat: THREE.ShaderMaterial;
  private rainGlass: THREE.Mesh;
  private leftDoorRainGlass!: THREE.Mesh;
  private rightDoorRainGlass!: THREE.Mesh;
  private rvWeatherGlassGroup = new THREE.Group();
  private rainBaseTint = new THREE.Color('#e0f2fe');
  private rainLevel = 0;
  private snowLevel = 0;
  private frontCabinLight: THREE.PointLight;
  private roofDomeGlow = 0;
  private movieScreenGlow = 0;
  private roofDomeLampMat!: THREE.MeshStandardMaterial;
  private cabinGlassMat!: THREE.MeshStandardMaterial;
  private rvGlassMat!: THREE.MeshStandardMaterial;
  private glassClearColor = new THREE.Color('#dbeafe');
  private glassTintColor = new THREE.Color('#04070d');
  private leftDoorWindowMesh!: THREE.Mesh;
  private rightDoorWindowMesh!: THREE.Mesh;
  private seatBackPivots: THREE.Group[] = [];
  private movieMonitorPivot = new THREE.Group();
  private wheelPivots: { pivot: THREE.Group; core: THREE.Mesh; ring: THREE.Mesh; side: number }[] = [];

  // RV Mini-Home interactive fixtures
  private rvCabinLight!: THREE.PointLight;
  private rvCeilingGlow = 0;
  private rvTvGlow = 0;
  private rvCeilingLampMat!: THREE.MeshStandardMaterial;
  private rvTvScreenMesh!: THREE.Mesh;
  private rvCoffeeCupsGroup = new THREE.Group();
  private rvCoffeeLedMat!: THREE.MeshStandardMaterial;
  private rvSteamDots: THREE.Mesh[] = [];
  private rvShowerDrops: ShowerDropMeta[] = [];
  private rvToiletFlushMat!: THREE.MeshStandardMaterial;
  private toiletFlushTimer = 0;
  private rvFridgeDoorPivot = new THREE.Group();
  private rvSunroofShutter!: THREE.Mesh;
  private rvPassengerGroup = new THREE.Group();

  private vehicleModel: VehicleTypeId = 'coupe';
  private disposables: { dispose: () => void }[] = [];

  constructor(maxAnisotropy: number, _isSoftwareGl: boolean) {
    this.display = new DashboardDisplay(maxAnisotropy);
    this.movieDisplay = new MovieScreenDisplay(maxAnisotropy);
    this.companion = new BlondePassengerRig(maxAnisotropy);
    this.rvCompanion = new BlondeWalkerRig(maxAnisotropy);
    this.disposables.push(this.display, this.movieDisplay, this.companion, this.rvCompanion);

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x0e131b,
      roughness: 0.72,
      metalness: 0.24,
    });
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.22,
      metalness: 0.9,
    });
    const hullPaintMat = new THREE.MeshStandardMaterial({
      color: 0x161f2e,
      roughness: 0.16,
      metalness: 0.86,
    });
    const leatherGripMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d14,
      roughness: 0.88,
      metalness: 0.06,
    });
    const seatLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.68,
      metalness: 0.12,
    });
    const seatBolsterMat = new THREE.MeshStandardMaterial({
      color: 0x263144,
      roughness: 0.52,
      metalness: 0.28,
    });
    const doorTrimMat = new THREE.MeshStandardMaterial({
      color: 0x111722,
      roughness: 0.7,
      metalness: 0.22,
    });
    this.cabinGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.08,
      metalness: 0.14,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.rvGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.08,
      metalness: 0.16,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glassMat = this.cabinGlassMat;
    const holoGlassMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const headlightMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      toneMapped: false,
    });
    const taillightMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      toneMapped: false,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.55,
      roughness: 0.24,
      metalness: 0.28,
    });
    this.accentMaterials.push(accentMat);

    this.disposables.push(
      carbonMat,
      titaniumMat,
      hullPaintMat,
      leatherGripMat,
      seatLeatherMat,
      seatBolsterMat,
      doorTrimMat,
      glassMat,
      this.rvGlassMat,
      holoGlassMat,
      headlightMat,
      taillightMat,
      accentMat,
    );

    // 1. Futuristic Sculpted Airspeeder Hood & Twin Energy Strakes
    const hoodShape = new THREE.Shape();
    hoodShape.moveTo(-0.92, 0);
    hoodShape.lineTo(0.92, 0);
    hoodShape.lineTo(0.58, 1.48);
    hoodShape.lineTo(0.24, 1.62);
    hoodShape.lineTo(-0.24, 1.62);
    hoodShape.lineTo(-0.58, 1.48);
    hoodShape.closePath();

    const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelSize: 0.045,
      bevelThickness: 0.04,
      bevelSegments: 2,
    });
    hoodGeo.rotateX(-Math.PI / 2 - 0.075);
    const hoodMesh = new THREE.Mesh(hoodGeo, hullPaintMat);
    hoodMesh.position.set(0, 0.66, -1.0);
    this.group.add(hoodMesh);
    this.disposables.push(hoodGeo);

    const ridgeGeo = new THREE.BoxGeometry(0.12, 0.055, 1.42);
    const strakeGlowGeo = new THREE.BoxGeometry(0.022, 0.015, 1.18);
    for (const side of [-1, 1]) {
      const fender = new THREE.Mesh(ridgeGeo, titaniumMat);
      fender.position.set(side * 0.67, 0.71, -1.66);
      fender.rotation.y = side * 0.14;
      fender.rotation.x = 0.07;
      this.group.add(fender);

      const strake = new THREE.Mesh(strakeGlowGeo, accentMat);
      strake.position.set(side * 0.62, 0.742, -1.64);
      strake.rotation.y = side * 0.14;
      strake.rotation.x = 0.07;
      this.group.add(strake);
    }
    this.disposables.push(ridgeGeo, strakeGlowGeo);

    // 2. Futuristic Dual-Zone Cockpit Dash, Cowl Seal & Holographic Visor
    const dashGeo = new THREE.BoxGeometry(1.76, 0.24, 0.56);
    const dashMesh = new THREE.Mesh(dashGeo, carbonMat);
    dashMesh.position.set(0, 0.7, -0.68);
    this.group.add(dashMesh);
    this.disposables.push(dashGeo);

    const cowlGeo = new THREE.BoxGeometry(1.76, 0.12, 0.24);
    const cowlMesh = new THREE.Mesh(cowlGeo, hullPaintMat);
    cowlMesh.position.set(0, 0.77, -0.88);
    this.group.add(cowlMesh);
    this.disposables.push(cowlGeo);

    const visorGeo = new THREE.BoxGeometry(0.62, 0.036, 0.24);
    const visorMesh = new THREE.Mesh(visorGeo, titaniumMat);
    visorMesh.position.set(DRIVER_X, 0.94, -0.58);
    visorMesh.rotation.x = 0.14;
    this.group.add(visorMesh);
    this.disposables.push(visorGeo);

    const trimGeo = new THREE.BoxGeometry(1.74, 0.024, 0.04);
    const trimMesh = new THREE.Mesh(trimGeo, titaniumMat);
    trimMesh.position.set(0, 0.825, -0.43);
    this.group.add(trimMesh);
    this.disposables.push(trimGeo);

    const ledGeo = new THREE.BoxGeometry(1.68, 0.01, 0.016);
    const ledMesh = new THREE.Mesh(ledGeo, accentMat);
    ledMesh.position.set(0, 0.81, -0.405);
    this.group.add(ledMesh);
    this.disposables.push(ledGeo);

    const screenGeo = new THREE.PlaneGeometry(0.5, 0.14);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.display.texture,
      toneMapped: false,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(DRIVER_X, 0.855, -0.54);
    screenMesh.rotation.x = -0.18;
    this.group.add(screenMesh);
    this.disposables.push(screenGeo, screenMat);

    const hudGlassGeo = new THREE.PlaneGeometry(0.36, 0.11);
    const hudGlass = new THREE.Mesh(hudGlassGeo, holoGlassMat);
    hudGlass.position.set(DRIVER_X, 0.985, -0.56);
    hudGlass.rotation.x = -0.22;
    hudGlass.renderOrder = 4;
    this.group.add(hudGlass);

    const passHoloGeo = new THREE.PlaneGeometry(0.46, 0.08);
    const passHolo = new THREE.Mesh(passHoloGeo, holoGlassMat);
    passHolo.position.set(PASSENGER_X, 0.85, -0.46);
    passHolo.rotation.x = -0.25;
    passHolo.renderOrder = 4;
    this.group.add(passHolo);
    this.disposables.push(hudGlassGeo, passHoloGeo);

    // Full floorboard spanning cab + RV mini-home (z = -1.04 .. +4.86), plus open walk-through console
    const floorGeo = new THREE.BoxGeometry(2.12, 0.1, 5.9);
    const floorMesh = new THREE.Mesh(floorGeo, leatherGripMat);
    floorMesh.position.set(0, 0.14, 1.91);
    this.group.add(floorMesh);

    const firewallGeo = new THREE.BoxGeometry(1.86, 0.56, 0.14);
    const firewallMesh = new THREE.Mesh(firewallGeo, carbonMat);
    firewallMesh.position.set(0, 0.44, -0.96);
    this.group.add(firewallMesh);

    // Shortened center console (z = -0.76 .. +0.08) so aisle between seats is open to walk into RV!
    const consoleGeo = new THREE.BoxGeometry(0.2, 0.22, 0.84);
    const consoleMesh = new THREE.Mesh(consoleGeo, carbonMat);
    consoleMesh.position.set(0, 0.39, -0.34);
    this.group.add(consoleMesh);

    const bridgeSlopeGeo = new THREE.BoxGeometry(0.18, 0.05, 0.46);
    const bridgeSlope = new THREE.Mesh(bridgeSlopeGeo, titaniumMat);
    bridgeSlope.position.set(0, 0.55, -0.46);
    bridgeSlope.rotation.x = -0.34;
    this.group.add(bridgeSlope);

    const consoleLidGeo = new THREE.BoxGeometry(0.18, 0.04, 0.32);
    const consoleLid = new THREE.Mesh(consoleLidGeo, seatBolsterMat);
    consoleLid.position.set(0, 0.51, -0.1);
    this.group.add(consoleLid);

    const consoleGlowGeo = new THREE.BoxGeometry(0.012, 0.012, 0.74);
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(consoleGlowGeo, accentMat);
      strip.position.set(side * 0.105, 0.49, -0.34);
      this.group.add(strip);
    }

    const prismGeo = new THREE.OctahedronGeometry(0.028, 0);
    this.drivePrism = new THREE.Mesh(prismGeo, accentMat);
    this.drivePrism.position.set(0, 0.575, -0.26);
    this.group.add(this.drivePrism);

    this.disposables.push(
      floorGeo,
      firewallGeo,
      consoleGeo,
      bridgeSlopeGeo,
      consoleLidGeo,
      consoleGlowGeo,
      prismGeo,
    );

    // 3. Futuristic Open-Top Cyber-Flight Yoke Steering Control (Left-Hand Drive)
    this.steeringWheelGroup.position.set(DRIVER_X, 0.79, -0.34);
    this.steeringWheelGroup.rotation.x = -0.24;

    const yokeLowerGeo = new THREE.TorusGeometry(0.155, 0.016, 10, 28, Math.PI * 1.15);
    const yokeLower = new THREE.Mesh(yokeLowerGeo, titaniumMat);
    yokeLower.rotation.z = Math.PI * 0.925;
    this.steeringWheelGroup.add(yokeLower);

    const gripGeo = new THREE.CapsuleGeometry(0.021, 0.11, 8, 12);
    for (const side of [-1, 1]) {
      const grip = new THREE.Mesh(gripGeo, leatherGripMat);
      grip.position.set(side * 0.165, 0.018, 0);
      grip.rotation.z = side * -0.14;
      this.steeringWheelGroup.add(grip);

      const wingSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.02), titaniumMat);
      wingSpoke.position.set(side * 0.095, -0.01, 0);
      wingSpoke.rotation.z = side * 0.12;
      this.steeringWheelGroup.add(wingSpoke);
      this.disposables.push(wingSpoke.geometry);
    }

    const hubGeo = new THREE.CylinderGeometry(0.048, 0.054, 0.036, 6);
    hubGeo.rotateX(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, carbonMat);
    hubMesh.position.z = 0.008;
    this.steeringWheelGroup.add(hubMesh);

    const hubCoreGeo = new THREE.BoxGeometry(0.056, 0.012, 0.012);
    const hubCore = new THREE.Mesh(hubCoreGeo, accentMat);
    hubCore.position.z = 0.028;
    this.steeringWheelGroup.add(hubCore);

    const colGeo = new THREE.CylinderGeometry(0.034, 0.04, 0.28, 12);
    colGeo.rotateX(Math.PI / 2);
    const steeringCol = new THREE.Mesh(colGeo, carbonMat);
    steeringCol.position.set(DRIVER_X, 0.77, -0.46);
    steeringCol.rotation.x = -0.24;
    this.group.add(steeringCol);

    this.group.add(this.steeringWheelGroup);
    this.disposables.push(yokeLowerGeo, gripGeo, hubGeo, hubCoreGeo, colGeo);

    // 4. Sculpted Futuristic Cyber-Sport Bucket Seats (Driver & Passenger) — wide walk-through aisle between them
    const seatCushionGeo = new THREE.BoxGeometry(0.42, 0.12, 0.46);
    const cushionBolsterGeo = new THREE.BoxGeometry(0.075, 0.15, 0.44);
    const backrestGeo = new THREE.BoxGeometry(0.38, 0.58, 0.09);
    const backBolsterGeo = new THREE.BoxGeometry(0.075, 0.52, 0.13);
    const headrestGeo = new THREE.BoxGeometry(0.22, 0.16, 0.08);
    const seatAccentGeo = new THREE.BoxGeometry(0.014, 0.24, 0.016);

    for (const seatX of [DRIVER_X, PASSENGER_X]) {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(seatX, 0, 0);

      const base = new THREE.Mesh(seatCushionGeo, seatLeatherMat);
      base.position.set(0, 0.34, -0.06);
      base.rotation.x = -0.06;
      seatGroup.add(base);

      for (const side of [-1, 1]) {
        const b1 = new THREE.Mesh(cushionBolsterGeo, seatBolsterMat);
        b1.position.set(side * 0.2, 0.37, -0.06);
        b1.rotation.z = side * -0.18;
        seatGroup.add(b1);
      }

      const backPivot = new THREE.Group();
      backPivot.position.set(0, 0.39, 0.13);
      backPivot.rotation.x = 0.22;

      const back = new THREE.Mesh(backrestGeo, seatLeatherMat);
      back.position.set(0, 0.29, 0);
      backPivot.add(back);

      for (const side of [-1, 1]) {
        const b2 = new THREE.Mesh(backBolsterGeo, seatBolsterMat);
        b2.position.set(side * 0.19, 0.27, -0.02);
        b2.rotation.y = side * -0.22;
        backPivot.add(b2);

        const sAccent = new THREE.Mesh(seatAccentGeo, accentMat);
        sAccent.position.set(side * 0.195, 0.4, -0.07);
        backPivot.add(sAccent);
      }

      const headrest = new THREE.Mesh(headrestGeo, titaniumMat);
      headrest.position.set(0, 0.67, -0.01);
      backPivot.add(headrest);

      seatGroup.add(backPivot);
      this.seatBackPivots.push(backPivot);
      this.group.add(seatGroup);
    }
    this.disposables.push(
      seatCushionGeo,
      cushionBolsterGeo,
      backrestGeo,
      backBolsterGeo,
      headrestGeo,
      seatAccentGeo,
    );

    // 5. Watertight Front Cabin Canopy Frame (Open behind seats straight into RV living room!)
    const wsBL = new THREE.Vector3(-0.845, 0.815, -0.82);
    const wsBR = new THREE.Vector3(0.845, 0.815, -0.82);
    const wsTL = new THREE.Vector3(-0.725, 1.515, -0.125);
    const wsTR = new THREE.Vector3(0.725, 1.515, -0.125);

    const bBL = new THREE.Vector3(-0.855, 0.815, 0.48);
    const bBR = new THREE.Vector3(0.855, 0.815, 0.48);
    const bTL = new THREE.Vector3(-0.725, 1.515, 0.48);
    const bTR = new THREE.Vector3(0.725, 1.515, 0.48);

    createStrutBetween(wsBL, wsTL, 0.056, 0.068, titaniumMat, this.group, this.disposables);
    createStrutBetween(wsBR, wsTR, 0.056, 0.068, titaniumMat, this.group, this.disposables);
    createStrutBetween(bBL, bTL, 0.085, 0.11, carbonMat, this.group, this.disposables);
    createStrutBetween(bBR, bTR, 0.085, 0.11, carbonMat, this.group, this.disposables);

    const headerGeo = new THREE.BoxGeometry(1.54, 0.06, 0.12);
    const roofHeader = new THREE.Mesh(headerGeo, carbonMat);
    roofHeader.position.set(0, 1.52, -0.125);

    const roofRailGeo = new THREE.BoxGeometry(0.085, 0.058, 0.66);
    const leftRoofRail = new THREE.Mesh(roofRailGeo, carbonMat);
    leftRoofRail.position.set(-0.725, 1.518, 0.18);
    const rightRoofRail = new THREE.Mesh(roofRailGeo, carbonMat);
    rightRoofRail.position.set(0.725, 1.518, 0.18);

    // Flush panoramic cab roof glass + structural spine
    const roofGlassGeo = createQuadGeometry(wsTL, wsTR, bTR, bTL);
    const roofGlass = new THREE.Mesh(roofGlassGeo, glassMat);
    roofGlass.renderOrder = 4;

    const spineGeo = new THREE.BoxGeometry(0.12, 0.045, 0.62);
    const roofSpine = new THREE.Mesh(spineGeo, titaniumMat);
    roofSpine.position.set(0, 1.528, 0.18);

    const spineLedGeo = new THREE.BoxGeometry(0.018, 0.012, 0.56);
    const spineLed = new THREE.Mesh(spineLedGeo, accentMat);
    spineLed.position.set(0, 1.502, 0.18);

    // Sealed door sills, lower doors, and armrests
    const sillGeo = new THREE.BoxGeometry(0.14, 0.22, 1.48);
    const leftSill = new THREE.Mesh(sillGeo, carbonMat);
    leftSill.position.set(-0.88, 0.72, -0.14);
    const rightSill = new THREE.Mesh(sillGeo, carbonMat);
    rightSill.position.set(0.88, 0.72, -0.14);

    const doorLowerGeo = new THREE.BoxGeometry(0.14, 0.5, 1.48);
    const armrestGeo = new THREE.BoxGeometry(0.095, 0.06, 0.74);
    const doorGlowGeo = new THREE.BoxGeometry(0.014, 0.012, 0.96);

    for (const side of [-1, 1]) {
      const doorLower = new THREE.Mesh(doorLowerGeo, doorTrimMat);
      doorLower.position.set(side * 0.9, 0.42, -0.12);
      this.group.add(doorLower);

      const armrest = new THREE.Mesh(armrestGeo, seatBolsterMat);
      armrest.position.set(side * 0.84, 0.56, 0.02);
      this.group.add(armrest);

      const doorGlow = new THREE.Mesh(doorGlowGeo, accentMat);
      doorGlow.position.set(side * 0.845, 0.67, -0.05);
      this.group.add(doorGlow);
    }

    // Flush-fitted sliding left & right door windows
    const leftDoorGlassGeo = createQuadGeometry(bBL, wsBL, wsTL, bTL);
    const rightDoorGlassGeo = createQuadGeometry(wsBR, bBR, bTR, wsTR);

    this.leftDoorWindowMesh = new THREE.Mesh(leftDoorGlassGeo, glassMat);
    this.leftDoorWindowMesh.renderOrder = 4;
    this.group.add(this.leftDoorWindowMesh);

    this.rightDoorWindowMesh = new THREE.Mesh(rightDoorGlassGeo, glassMat);
    this.rightDoorWindowMesh.renderOrder = 4;
    this.group.add(this.rightDoorWindowMesh);

    // Blade Side Camera-Mirrors & Rearview Mirror
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.04, 0.08);
    const leftMirror = new THREE.Mesh(mirrorGeo, titaniumMat);
    leftMirror.position.set(-1.05, 0.87, -0.58);
    leftMirror.rotation.y = 0.22;
    const rightMirror = new THREE.Mesh(mirrorGeo, titaniumMat);
    rightMirror.position.set(1.05, 0.87, -0.58);
    rightMirror.rotation.y = -0.22;

    const rearMirrorGeo = new THREE.BoxGeometry(0.24, 0.05, 0.018);
    const rearMirror = new THREE.Mesh(rearMirrorGeo, titaniumMat);
    rearMirror.position.set(0, 1.38, -0.22);

    this.group.add(
      roofHeader,
      roofGlass,
      roofSpine,
      spineLed,
      leftRoofRail,
      rightRoofRail,
      leftSill,
      rightSill,
      leftMirror,
      rightMirror,
      rearMirror,
    );
    this.disposables.push(
      headerGeo,
      roofGlassGeo,
      spineGeo,
      spineLedGeo,
      roofRailGeo,
      sillGeo,
      doorLowerGeo,
      armrestGeo,
      doorGlowGeo,
      leftDoorGlassGeo,
      rightDoorGlassGeo,
      mirrorGeo,
      rearMirrorGeo,
    );

    // 6. Luxury Futuristic RV Motorhome Exterior Shell («Автодом Горизонт»)
    const frontNoseGeo = new THREE.BoxGeometry(1.78, 0.3, 0.76);
    const frontNose = new THREE.Mesh(frontNoseGeo, hullPaintMat);
    frontNose.position.set(0, 0.44, -2.14);
    this.group.add(frontNose);

    const splitterGeo = new THREE.BoxGeometry(2.04, 0.065, 0.56);
    const splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.21, -2.26);
    this.group.add(splitter);

    const chinGlowGeo = new THREE.BoxGeometry(1.3, 0.018, 0.03);
    const chinGlow = new THREE.Mesh(chinGlowGeo, accentMat);
    chinGlow.position.set(0, 0.23, -2.53);
    this.group.add(chinGlow);

    const headlightBarGeo = new THREE.BoxGeometry(0.56, 0.032, 0.06);
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(headlightBarGeo, headlightMat);
      hl.position.set(side * 0.62, 0.52, -2.48);
      hl.rotation.y = side * -0.24;
      this.group.add(hl);
    }

    // Front lower side skirts & aero wheel arches
    const sideBodyFrontGeo = new THREE.BoxGeometry(0.22, 0.52, 2.35);
    const sideSkirtGeo = new THREE.BoxGeometry(0.24, 0.14, 6.85);
    const sideIntakeGlowGeo = new THREE.BoxGeometry(0.02, 0.025, 4.95);
    for (const side of [-1, 1]) {
      const sb = new THREE.Mesh(sideBodyFrontGeo, hullPaintMat);
      sb.position.set(side * 1.0, 0.49, -1.18);
      this.group.add(sb);

      const sk = new THREE.Mesh(sideSkirtGeo, carbonMat);
      sk.position.set(side * 1.04, 0.21, 1.35);
      this.group.add(sk);

      const ig = new THREE.Mesh(sideIntakeGlowGeo, accentMat);
      ig.position.set(side * 1.115, 0.44, 1.35);
      this.group.add(ig);
    }

    // Watertight sloped aero roof bridge sealing cab roof to RV roof (z = -0.14 .. 0.72, y = 1.52 .. 2.09)
    const aeroSlopeLen = Math.sqrt(0.86 * 0.86 + 0.57 * 0.57); // ~1.03m
    const aeroSlopeAngle = -Math.atan2(0.57, 0.86);
    const aeroRoofGeo = new THREE.BoxGeometry(2.14, 0.08, aeroSlopeLen);
    const aeroRoof = new THREE.Mesh(aeroRoofGeo, hullPaintMat);
    aeroRoof.position.set(0, 1.805, 0.29);
    aeroRoof.rotation.x = aeroSlopeAngle;
    this.group.add(aeroRoof);

    // Front visor cap over windshield header sealing the nose
    const browVisorGeo = new THREE.BoxGeometry(1.96, 0.09, 0.24);
    const browVisorMesh = new THREE.Mesh(browVisorGeo, carbonMat);
    browVisorMesh.position.set(0, 1.545, -0.16);
    this.group.add(browVisorMesh);

    // Overcab aero brow lightbar
    const browLightGeo = new THREE.BoxGeometry(1.64, 0.028, 0.04);
    const browLight = new THREE.Mesh(browLightGeo, headlightMat);
    browLight.position.set(0, 1.545, -0.275);
    this.group.add(browLight);

    // Side triangular cheek walls closing cab-to-RV flanks (z = -0.14 .. 0.72, y = 1.48 .. 2.09)
    const cheekProfile = new THREE.Shape();
    cheekProfile.moveTo(-0.16, 1.48);
    cheekProfile.lineTo(0.72, 1.48);
    cheekProfile.lineTo(0.72, 2.09);
    cheekProfile.lineTo(-0.16, 1.54);
    cheekProfile.closePath();
    const cheekGeo = new THREE.ExtrudeGeometry(cheekProfile, {
      depth: 0.12,
      bevelEnabled: false,
      curveSegments: 1,
    });
    cheekGeo.translate(0, 0, -0.06);
    cheekGeo.rotateY(-Math.PI / 2);

    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo, hullPaintMat);
      cheek.position.set(side * 1.01, 0, 0);
      this.group.add(cheek);

      const bPillarFillGeo = new THREE.BoxGeometry(0.18, 0.72, 0.24);
      const bPillarFill = new THREE.Mesh(bPillarFillGeo, carbonMat);
      bPillarFill.position.set(side * 0.94, 1.16, 0.52);
      this.group.add(bPillarFill);
    }

    const rvCeilingMat = new THREE.MeshStandardMaterial({
      color: 0xd8dee9,
      roughness: 0.76,
      metalness: 0.08,
    });

    // Interior headliner ceiling sealing the cab overhead into RV living room
    const cabHeadlinerGeo = new THREE.BoxGeometry(1.62, 0.035, 0.68);
    const cabHeadliner = new THREE.Mesh(cabHeadlinerGeo, rvCeilingMat);
    cabHeadliner.position.set(0, 1.515, 0.18);
    this.group.add(cabHeadliner);

    this.disposables.push(aeroRoofGeo, browVisorGeo, browLightGeo, cheekGeo, cabHeadlinerGeo, rvCeilingMat);

    // RV Roof Cap (z = 0.72 .. 4.86, y = 2.09) with real Panoramic Skylight Opening (x ∈ [-0.54, 0.54], z ∈ [2.35, 3.65])
    const rvRoofFrontGeo = new THREE.BoxGeometry(2.14, 0.1, 1.67);
    const rvRoofFront = new THREE.Mesh(rvRoofFrontGeo, hullPaintMat);
    rvRoofFront.position.set(0, 2.09, 1.515);
    this.group.add(rvRoofFront);

    const rvRoofRearGeo = new THREE.BoxGeometry(2.14, 0.1, 1.25);
    const rvRoofRear = new THREE.Mesh(rvRoofRearGeo, hullPaintMat);
    rvRoofRear.position.set(0, 2.09, 4.275);
    this.group.add(rvRoofRear);

    const rvRoofSideGeo = new THREE.BoxGeometry(0.53, 0.1, 1.3);
    for (const side of [-1, 1]) {
      const rs = new THREE.Mesh(rvRoofSideGeo, hullPaintMat);
      rs.position.set(side * 0.805, 2.09, 3.0);
      this.group.add(rs);
    }

    const rvCeilFrontGeo = new THREE.BoxGeometry(1.98, 0.03, 1.61);
    const rvCeilFront = new THREE.Mesh(rvCeilFrontGeo, rvCeilingMat);
    rvCeilFront.position.set(0, 2.035, 1.545);
    this.group.add(rvCeilFront);

    const rvCeilRearGeo = new THREE.BoxGeometry(1.98, 0.03, 1.17);
    const rvCeilRear = new THREE.Mesh(rvCeilRearGeo, rvCeilingMat);
    rvCeilRear.position.set(0, 2.035, 4.235);
    this.group.add(rvCeilRear);

    const rvCeilSlopeGeo = new THREE.BoxGeometry(1.94, 0.028, 0.62);
    const rvCeilSlope = new THREE.Mesh(rvCeilSlopeGeo, rvCeilingMat);
    rvCeilSlope.position.set(0, 1.768, 0.63);
    rvCeilSlope.rotation.x = -Math.atan2(0.535, 0.30);
    this.group.add(rvCeilSlope);

    const rvCeilSideGeo = new THREE.BoxGeometry(0.45, 0.03, 1.3);
    for (const side of [-1, 1]) {
      const cs = new THREE.Mesh(rvCeilSideGeo, rvCeilingMat);
      cs.position.set(side * 0.765, 2.035, 3.0);
      this.group.add(cs);
    }

    // Skylight Trim Frame + Glass Pane + Sliding Motorized Shutter
    const skylightFrameGeo = new THREE.BoxGeometry(1.12, 0.06, 0.04);
    for (const fz of [2.35, 3.65]) {
      const bar = new THREE.Mesh(skylightFrameGeo, carbonMat);
      bar.position.set(0, 2.06, fz);
      this.group.add(bar);
    }
    const skylightPaneGeo = new THREE.PlaneGeometry(1.08, 1.3);
    skylightPaneGeo.rotateX(Math.PI / 2);
    const skylightPane = new THREE.Mesh(skylightPaneGeo, this.rvGlassMat);
    skylightPane.position.set(0, 2.11, 3.0);
    skylightPane.renderOrder = 4;
    this.group.add(skylightPane);

    const shutterGeo = new THREE.BoxGeometry(1.06, 0.028, 1.28);
    this.rvSunroofShutter = new THREE.Mesh(shutterGeo, rvCeilingMat);
    this.rvSunroofShutter.position.set(0, 2.036, 3.0);
    this.group.add(this.rvSunroofShutter);

    // RV Sidewalls with real panoramic window openings (z = 0.46 .. 4.84)
    const rvWallPanelMat = new THREE.MeshStandardMaterial({
      color: 0x1a2232,
      roughness: 0.65,
      metalness: 0.2,
    });
    const rvLowerWallGeo = new THREE.BoxGeometry(0.1, 0.76, 4.38);
    const rvUpperWallGeo = new THREE.BoxGeometry(0.1, 0.34, 4.10);
    const rvFrontPostGeo = new THREE.BoxGeometry(0.12, 0.68, 0.32);
    const rvMidPostGeo = new THREE.BoxGeometry(0.12, 0.92, 1.16);
    const rvRearPostGeo = new THREE.BoxGeometry(0.12, 0.92, 0.46);
    const rvSideWinGeo = new THREE.PlaneGeometry(1.38, 0.84);
    rvSideWinGeo.rotateY(Math.PI / 2);

    for (const side of [-1, 1]) {
      const lw = new THREE.Mesh(rvLowerWallGeo, hullPaintMat);
      lw.position.set(side * 1.03, 0.56, 2.65);
      this.group.add(lw);

      const lwInner = new THREE.Mesh(rvLowerWallGeo, rvWallPanelMat);
      lwInner.position.set(side * 0.99, 0.56, 2.65);
      this.group.add(lwInner);

      const uw = new THREE.Mesh(rvUpperWallGeo, hullPaintMat);
      uw.position.set(side * 1.03, 1.9, 2.79);
      this.group.add(uw);

      const fp = new THREE.Mesh(rvFrontPostGeo, carbonMat);
      fp.position.set(side * 1.03, 1.24, 0.64);
      this.group.add(fp);

      const mp = new THREE.Mesh(rvMidPostGeo, hullPaintMat);
      mp.position.set(side * 1.03, 1.36, 2.72);
      this.group.add(mp);

      const rp = new THREE.Mesh(rvRearPostGeo, hullPaintMat);
      rp.position.set(side * 1.03, 1.36, 4.62);
      this.group.add(rp);

      // Front RV panoramic window (z = 1.48) & Rear RV panoramic window (z = 3.85)
      for (const wz of [1.48, 3.85]) {
        const winMesh = new THREE.Mesh(rvSideWinGeo, this.rvGlassMat);
        winMesh.position.set(side * 1.03, 1.36, wz);
        winMesh.renderOrder = 4;
        this.group.add(winMesh);
      }
    }

    // Rear RV Wall (z = 4.84) with Rear Panoramic Window + Bumper + Taillights + Thrusters
    const rearLowerGeo = new THREE.BoxGeometry(2.14, 0.78, 0.12);
    const rearLower = new THREE.Mesh(rearLowerGeo, hullPaintMat);
    rearLower.position.set(0, 0.56, 4.84);
    this.group.add(rearLower);

    const rearUpperGeo = new THREE.BoxGeometry(2.14, 0.36, 0.12);
    const rearUpper = new THREE.Mesh(rearUpperGeo, hullPaintMat);
    rearUpper.position.set(0, 1.9, 4.84);
    this.group.add(rearUpper);

    const rearCornerGeo = new THREE.BoxGeometry(0.28, 0.92, 0.12);
    for (const side of [-1, 1]) {
      const rc = new THREE.Mesh(rearCornerGeo, hullPaintMat);
      rc.position.set(side * 0.93, 1.36, 4.84);
      this.group.add(rc);
    }

    const rearWinGeo = new THREE.PlaneGeometry(1.58, 0.84);
    const rearWin = new THREE.Mesh(rearWinGeo, this.rvGlassMat);
    rearWin.position.set(0, 1.36, 4.84);
    rearWin.renderOrder = 4;
    this.group.add(rearWin);

    const rearDiffuserGeo = new THREE.BoxGeometry(1.94, 0.2, 0.24);
    const rearDiffuser = new THREE.Mesh(rearDiffuserGeo, carbonMat);
    rearDiffuser.position.set(0, 0.22, 4.86);
    this.group.add(rearDiffuser);

    const jetVentGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.12, 16);
    jetVentGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(jetVentGeo, accentMat);
      vent.position.set(side * 0.56, 0.36, 4.92);
      this.group.add(vent);
    }

    const taillightBarGeo = new THREE.BoxGeometry(1.94, 0.045, 0.04);
    const taillightBar = new THREE.Mesh(taillightBarGeo, taillightMat);
    taillightBar.position.set(0, 0.72, 4.92);
    this.group.add(taillightBar);

    // 4 Shrouded Repulsor-Turbine Wheels (Front & Rear Motorhome Axle)
    const podShroudGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 24);
    podShroudGeo.rotateZ(Math.PI / 2);
    const podCoreGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.27, 18);
    podCoreGeo.rotateZ(Math.PI / 2);
    const podGlowRingGeo = new THREE.TorusGeometry(0.25, 0.018, 8, 24);
    podGlowRingGeo.rotateY(Math.PI / 2);

    const podCoords: [number, number, number][] = [
      [-1.08, 0.36, -1.5],
      [1.08, 0.36, -1.5],
      [-1.08, 0.36, 3.65],
      [1.08, 0.36, 3.65],
    ];
    for (const [wx, wy, wz] of podCoords) {
      const side = Math.sign(wx);
      const pivot = new THREE.Group();
      pivot.position.set(wx, wy, wz);

      const shroud = new THREE.Mesh(podShroudGeo, carbonMat);
      pivot.add(shroud);

      const core = new THREE.Mesh(podCoreGeo, titaniumMat);
      pivot.add(core);

      const ring = new THREE.Mesh(podGlowRingGeo, accentMat);
      ring.position.set(side * 0.138, 0, 0);
      pivot.add(ring);

      this.group.add(pivot);
      this.wheelPivots.push({ pivot, core, ring, side });
    }

    this.disposables.push(
      frontNoseGeo,
      splitterGeo,
      chinGlowGeo,
      headlightBarGeo,
      sideBodyFrontGeo,
      sideSkirtGeo,
      sideIntakeGlowGeo,
      rvRoofFrontGeo,
      rvRoofRearGeo,
      rvRoofSideGeo,
      rvCeilingMat,
      rvCeilFrontGeo,
      rvCeilRearGeo,
      rvCeilSlopeGeo,
      rvCeilSideGeo,
      skylightFrameGeo,
      skylightPaneGeo,
      shutterGeo,
      rvWallPanelMat,
      rvLowerWallGeo,
      rvUpperWallGeo,
      rvFrontPostGeo,
      rvMidPostGeo,
      rvRearPostGeo,
      rvSideWinGeo,
      rearLowerGeo,
      rearUpperGeo,
      rearCornerGeo,
      rearWinGeo,
      rearDiffuserGeo,
      jetVentGeo,
      taillightBarGeo,
      podShroudGeo,
      podCoreGeo,
      podGlowRingGeo,
    );

    // 7. RV MINI-HOME INTERIOR FIXTURES (Floor y = 0.19, Ceiling y = 2.02)
    this.buildRvMiniHomeInterior(carbonMat, titaniumMat, seatBolsterMat, accentMat);

    // 8. Properly Sloped, Flush-Sealed Windshield + Exterior Rain & Snow Shader on ALL windows
    const windshieldGeo = createQuadGeometry(wsBL, wsBR, wsTR, wsTL);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.renderOrder = 4;
    this.group.add(windshield);

    this.windshieldRainMat = createWindshieldWeatherShader();
    this.rainGlass = new THREE.Mesh(windshieldGeo, this.windshieldRainMat);
    this.rainGlass.position.set(0, 0.002, -0.003);
    this.rainGlass.renderOrder = 5;
    this.rainGlass.visible = false;
    this.group.add(this.rainGlass);

    // Door windows rain/snow overlays (attached to sliding glass so droplets move with window)
    this.leftDoorRainGlass = new THREE.Mesh(leftDoorGlassGeo, this.windshieldRainMat);
    this.leftDoorRainGlass.position.set(-0.004, 0, 0);
    this.leftDoorRainGlass.renderOrder = 5;
    this.leftDoorRainGlass.visible = false;
    this.leftDoorWindowMesh.add(this.leftDoorRainGlass);

    this.rightDoorRainGlass = new THREE.Mesh(rightDoorGlassGeo, this.windshieldRainMat);
    this.rightDoorRainGlass.position.set(0.004, 0, 0);
    this.rightDoorRainGlass.renderOrder = 5;
    this.rightDoorRainGlass.visible = false;
    this.rightDoorWindowMesh.add(this.rightDoorRainGlass);

    // Cab panoramic roof, RV side windows, rear window & skylight rain/snow overlays
    const cabRoofRainGlass = new THREE.Mesh(roofGlassGeo, this.windshieldRainMat);
    cabRoofRainGlass.position.set(0, 0.004, 0);
    cabRoofRainGlass.renderOrder = 5;
    this.rvWeatherGlassGroup.add(cabRoofRainGlass);

    for (const side of [-1, 1]) {
      for (const wz of [1.48, 3.85]) {
        const sideRain = new THREE.Mesh(rvSideWinGeo, this.windshieldRainMat);
        sideRain.position.set(side * 1.036, 1.36, wz);
        sideRain.renderOrder = 5;
        this.rvWeatherGlassGroup.add(sideRain);
      }
    }

    const rearRain = new THREE.Mesh(rearWinGeo, this.windshieldRainMat);
    rearRain.position.set(0, 1.36, 4.846);
    rearRain.renderOrder = 5;
    this.rvWeatherGlassGroup.add(rearRain);

    const skylightRain = new THREE.Mesh(skylightPaneGeo, this.windshieldRainMat);
    skylightRain.position.set(0, 2.116, 3.0);
    skylightRain.renderOrder = 5;
    this.rvWeatherGlassGroup.add(skylightRain);

    this.rvWeatherGlassGroup.visible = false;
    this.group.add(this.rvWeatherGlassGroup);
    this.disposables.push(windshieldGeo, this.windshieldRainMat);

    // 9. Blonde Companion (Seated in Front Seat OR Walking/Living Inside RV Mini-Home)
    this.companion.group.position.set(PASSENGER_X, 0, 0);
    this.group.add(this.companion.group);
    this.rvCompanion.group.position.set(0.2, 0.195, 1.8);
    this.rvCompanion.group.visible = false;
    this.group.add(this.rvCompanion.group);

    this.frontCabinLight = new THREE.PointLight(0xf59e0b, 0.72, 4.4, 1.8);
    this.frontCabinLight.position.set(0, 1.36, 0.04);
    this.group.add(this.frontCabinLight);

    // 10. Front Roof Cabin Dome Light + Retractable Overhead Movie Monitor
    this.roofDomeLampMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfde68a,
      emissiveIntensity: 0.05,
      roughness: 0.25,
    });
    const domeGeo = new THREE.BoxGeometry(0.22, 0.022, 0.12);
    const domeLamp = new THREE.Mesh(domeGeo, this.roofDomeLampMat);
    domeLamp.position.set(0, 1.495, 0.18);
    this.group.add(domeLamp);

    this.movieMonitorPivot.position.set(0, 1.485, -0.11);
    this.movieMonitorPivot.rotation.x = -Math.PI * 0.48;
    const monitorFrameGeo = new THREE.BoxGeometry(0.56, 0.32, 0.022);
    const monitorFrame = new THREE.Mesh(monitorFrameGeo, carbonMat);
    monitorFrame.position.set(0, -0.17, 0);
    this.movieMonitorPivot.add(monitorFrame);

    const monitorScreenGeo = new THREE.PlaneGeometry(0.52, 0.29);
    const monitorScreenMat = new THREE.MeshBasicMaterial({
      map: this.movieDisplay.texture,
      toneMapped: false,
    });
    const monitorScreen = new THREE.Mesh(monitorScreenGeo, monitorScreenMat);
    monitorScreen.position.set(0, -0.17, 0.013);
    this.movieMonitorPivot.add(monitorScreen);

    this.group.add(this.movieMonitorPivot);
    this.disposables.push(
      this.roofDomeLampMat,
      domeGeo,
      monitorFrameGeo,
      monitorScreenGeo,
      monitorScreenMat,
    );
  }

  private buildRvMiniHomeInterior(
    carbonMat: THREE.Material,
    titaniumMat: THREE.Material,
    seatBolsterMat: THREE.Material,
    accentMat: THREE.Material,
  ): void {
    const woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x5c3d28,
      roughness: 0.62,
      metalness: 0.08,
    });
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x262f3f,
      roughness: 0.48,
      metalness: 0.25,
    });
    const counterTopMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.24,
      metalness: 0.18,
    });
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.06,
    });
    const mattressMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.85,
    });
    const blanketMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d6b,
      roughness: 0.88,
    });
    const pillowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.82,
    });
    const showerTileMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.2,
    });
    const showerGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.08,
      metalness: 0.14,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const waterDropMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.78,
    });
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.45,
    });

    // Warm wood composite floor in RV module (y = 0.193)
    const rvFloorGeo = new THREE.BoxGeometry(1.94, 0.02, 4.18);
    const rvFloor = new THREE.Mesh(rvFloorGeo, woodFloorMat);
    rvFloor.position.set(0, 0.193, 2.7);
    this.group.add(rvFloor);

    // 1) Kitchenette Counter & Working Coffee Maker (left front: x = -0.72, z = 1.42)
    const kBaseGeo = new THREE.BoxGeometry(0.56, 0.72, 1.12);
    const kBase = new THREE.Mesh(kBaseGeo, cabinetMat);
    kBase.position.set(-0.7, 0.56, 1.42);
    this.group.add(kBase);

    const kTopGeo = new THREE.BoxGeometry(0.6, 0.045, 1.16);
    const kTop = new THREE.Mesh(kTopGeo, counterTopMat);
    kTop.position.set(-0.69, 0.94, 1.42);
    this.group.add(kTop);

    const coffeeBodyGeo = new THREE.BoxGeometry(0.2, 0.28, 0.22);
    const coffeeBody = new THREE.Mesh(coffeeBodyGeo, carbonMat);
    coffeeBody.position.set(-0.72, 1.1, 1.42);
    this.group.add(coffeeBody);

    const coffeeSpoutGeo = new THREE.BoxGeometry(0.08, 0.06, 0.09);
    const coffeeSpout = new THREE.Mesh(coffeeSpoutGeo, titaniumMat);
    coffeeSpout.position.set(-0.59, 1.14, 1.42);
    this.group.add(coffeeSpout);

    this.rvCoffeeLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.4,
    });
    const coffeeLedGeo = new THREE.BoxGeometry(0.02, 0.025, 0.06);
    const coffeeLed = new THREE.Mesh(coffeeLedGeo, this.rvCoffeeLedMat);
    coffeeLed.position.set(-0.615, 1.2, 1.42);
    this.group.add(coffeeLed);

    // Ceramic mugs & steam visible after brewing
    const mugGeo = new THREE.CylinderGeometry(0.036, 0.032, 0.075, 12);
    for (const mz of [1.34, 1.5]) {
      const mug = new THREE.Mesh(mugGeo, ceramicMat);
      mug.position.set(-0.56, 1.0, mz);
      this.rvCoffeeCupsGroup.add(mug);
    }
    const steamGeo = new THREE.SphereGeometry(0.018, 6, 6);
    for (let i = 0; i < 4; i++) {
      const dot = new THREE.Mesh(steamGeo, steamMat);
      dot.position.set(-0.56, 1.08 + i * 0.05, i % 2 === 0 ? 1.34 : 1.5);
      this.rvCoffeeCupsGroup.add(dot);
      this.rvSteamDots.push(dot);
    }
    this.rvCoffeeCupsGroup.visible = false;
    this.group.add(this.rvCoffeeCupsGroup);

    // 1b) Compact RV Mini-Fridge beside Kitchenette (x = -0.70, z = 0.66)
    const fridgeBodyGeo = new THREE.BoxGeometry(0.52, 0.74, 0.36);
    const fridgeBody = new THREE.Mesh(fridgeBodyGeo, cabinetMat);
    fridgeBody.position.set(-0.7, 0.57, 0.66);
    this.group.add(fridgeBody);

    const fridgeCoolGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const fridgeRecessGeo = new THREE.PlaneGeometry(0.32, 0.62);
    fridgeRecessGeo.rotateY(Math.PI / 2);
    const fridgeRecess = new THREE.Mesh(fridgeRecessGeo, fridgeCoolGlowMat);
    fridgeRecess.position.set(-0.438, 0.57, 0.66);
    this.group.add(fridgeRecess);

    const bottleGeo = new THREE.CylinderGeometry(0.028, 0.03, 0.16, 8);
    for (const bz of [0.58, 0.73]) {
      const bottle = new THREE.Mesh(bottleGeo, showerGlassMat);
      bottle.position.set(-0.5, 0.56, bz);
      this.group.add(bottle);
    }

    this.rvFridgeDoorPivot.position.set(-0.43, 0.57, 0.49);
    const fridgeDoorGeo = new THREE.BoxGeometry(0.032, 0.72, 0.35);
    const fridgeDoor = new THREE.Mesh(fridgeDoorGeo, titaniumMat);
    fridgeDoor.position.set(0, 0, 0.175);
    this.rvFridgeDoorPivot.add(fridgeDoor);
    const fridgeHandleGeo = new THREE.BoxGeometry(0.025, 0.2, 0.025);
    const fridgeHandle = new THREE.Mesh(fridgeHandleGeo, accentMat);
    fridgeHandle.position.set(0.022, 0.12, 0.3);
    this.rvFridgeDoorPivot.add(fridgeHandle);
    this.group.add(this.rvFridgeDoorPivot);

    // 2) Wall-Mounted TV on Right RV Wall (x = +0.94, y = 1.38, z = 1.52 facing -X)
    const tvBezelGeo = new THREE.BoxGeometry(0.04, 0.5, 0.86);
    const tvBezel = new THREE.Mesh(tvBezelGeo, carbonMat);
    tvBezel.position.set(0.96, 1.38, 1.52);
    this.group.add(tvBezel);

    const tvScreenGeo = new THREE.PlaneGeometry(0.8, 0.44);
    tvScreenGeo.rotateY(-Math.PI / 2);
    const tvScreenMat = new THREE.MeshBasicMaterial({
      map: this.movieDisplay.texture,
      toneMapped: false,
    });
    this.rvTvScreenMesh = new THREE.Mesh(tvScreenGeo, tvScreenMat);
    this.rvTvScreenMesh.position.set(0.938, 1.38, 1.52);
    this.rvTvScreenMesh.visible = false;
    this.group.add(this.rvTvScreenMesh);

    // Compact bench / lounge shelf under TV
    const loungeBenchGeo = new THREE.BoxGeometry(0.42, 0.34, 0.96);
    const loungeBench = new THREE.Mesh(loungeBenchGeo, seatBolsterMat);
    loungeBench.position.set(0.76, 0.37, 1.52);
    this.group.add(loungeBench);

    // Seated RV passenger NPC rig (shown during passenger_transport quests)
    const pCoatMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.65 });
    const pPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
    const pSkinMat = new THREE.MeshStandardMaterial({ color: 0xf1c2a0, roughness: 0.6 });
    const pTorsoGeo = new THREE.BoxGeometry(0.32, 0.44, 0.2);
    const pHeadGeo = new THREE.SphereGeometry(0.115, 10, 8);
    const pLegGeo = new THREE.BoxGeometry(0.12, 0.12, 0.36);
    const pCoat = new THREE.Mesh(pTorsoGeo, pCoatMat);
    pCoat.position.set(0, 0.26, 0);
    const pHead = new THREE.Mesh(pHeadGeo, pSkinMat);
    pHead.position.set(0, 0.61, 0);
    const pLegL = new THREE.Mesh(pLegGeo, pPantsMat);
    pLegL.position.set(-0.08, 0.04, 0.14);
    const pLegR = new THREE.Mesh(pLegGeo, pPantsMat);
    pLegR.position.set(0.08, 0.04, 0.14);
    this.rvPassengerGroup.add(pCoat, pHead, pLegL, pLegR);
    this.rvPassengerGroup.position.set(0.7, 0.56, 1.24);
    this.rvPassengerGroup.rotation.y = -Math.PI / 2;
    this.rvPassengerGroup.visible = false;
    this.group.add(this.rvPassengerGroup);
    this.disposables.push(pCoatMat, pPantsMat, pSkinMat, pTorsoGeo, pHeadGeo, pLegGeo);

    // 3) Corner Glass Shower Stall (left mid: x = -0.66, z = 2.46)
    const trayGeo = new THREE.BoxGeometry(0.68, 0.08, 0.82);
    const showerTray = new THREE.Mesh(trayGeo, ceramicMat);
    showerTray.position.set(-0.65, 0.24, 2.46);
    this.group.add(showerTray);

    const wetWallGeo = new THREE.BoxGeometry(0.04, 1.72, 0.82);
    const wetWall = new THREE.Mesh(wetWallGeo, showerTileMat);
    wetWall.position.set(-0.97, 1.12, 2.46);
    this.group.add(wetWall);

    const glassSideGeo = new THREE.PlaneGeometry(0.68, 1.64);
    const glassFrontWall = new THREE.Mesh(glassSideGeo, showerGlassMat);
    glassFrontWall.position.set(-0.65, 1.1, 2.05);
    this.group.add(glassFrontWall);

    const glassInnerGeo = new THREE.PlaneGeometry(0.82, 1.64);
    glassInnerGeo.rotateY(Math.PI / 2);
    const glassInner = new THREE.Mesh(glassInnerGeo, showerGlassMat);
    glassInner.position.set(-0.32, 1.1, 2.46);
    this.group.add(glassInner);

    const showerPipeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8);
    showerPipeGeo.rotateZ(Math.PI / 2);
    const showerPipe = new THREE.Mesh(showerPipeGeo, titaniumMat);
    showerPipe.position.set(-0.84, 1.9, 2.46);
    this.group.add(showerPipe);

    const showerHeadGeo = new THREE.CylinderGeometry(0.09, 0.06, 0.03, 14);
    const showerHead = new THREE.Mesh(showerHeadGeo, titaniumMat);
    showerHead.position.set(-0.68, 1.88, 2.46);
    this.group.add(showerHead);

    // Animated falling water droplet streaks inside shower stall
    const dropGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.14, 5);
    for (let i = 0; i < 14; i++) {
      const drop = new THREE.Mesh(dropGeo, waterDropMat);
      const bx = -0.82 + (i % 4) * 0.09 + ((i % 2) * 0.02 - 0.01);
      const bz = 2.32 + Math.floor(i / 4) * 0.09;
      drop.position.set(bx, 0.5 + (i % 5) * 0.28, bz);
      drop.visible = false;
      this.group.add(drop);
      this.rvShowerDrops.push({ mesh: drop, baseX: bx, baseZ: bz, phase: i * 0.37 });
    }

    // 4) Compact RV Toilet Pod (left rear: x = -0.68, z = 3.36)
    const dividerGeo = new THREE.BoxGeometry(0.66, 1.25, 0.05);
    const toiletDivider = new THREE.Mesh(dividerGeo, cabinetMat);
    toiletDivider.position.set(-0.66, 0.82, 2.9);
    this.group.add(toiletDivider);

    const tBaseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.34, 14);
    const tBase = new THREE.Mesh(tBaseGeo, ceramicMat);
    tBase.position.set(-0.68, 0.37, 3.34);
    this.group.add(tBase);

    const tBowlGeo = new THREE.TorusGeometry(0.15, 0.045, 10, 18);
    tBowlGeo.rotateX(Math.PI / 2);
    const tBowl = new THREE.Mesh(tBowlGeo, ceramicMat);
    tBowl.position.set(-0.66, 0.55, 3.34);
    this.group.add(tBowl);

    const tTankGeo = new THREE.BoxGeometry(0.18, 0.38, 0.32);
    const tTank = new THREE.Mesh(tTankGeo, ceramicMat);
    tTank.position.set(-0.88, 0.72, 3.34);
    this.group.add(tTank);

    this.rvToiletFlushMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
    });
    const flushBtnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10);
    const flushBtn = new THREE.Mesh(flushBtnGeo, this.rvToiletFlushMat);
    flushBtn.position.set(-0.88, 0.92, 3.34);
    this.group.add(flushBtn);

    // 5) Cozy Bed (right rear: x = +0.46, z = 3.88, headboard at z = 4.68 facing forward toward TV)
    const bedFrameGeo = new THREE.BoxGeometry(0.96, 0.28, 1.62);
    const bedFrame = new THREE.Mesh(bedFrameGeo, cabinetMat);
    bedFrame.position.set(0.47, 0.34, 3.92);
    this.group.add(bedFrame);

    const mattressGeo = new THREE.BoxGeometry(0.92, 0.14, 1.56);
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.set(0.47, 0.54, 3.92);
    this.group.add(mattress);

    const blanketGeo = new THREE.BoxGeometry(0.94, 0.08, 1.08);
    const blanket = new THREE.Mesh(blanketGeo, blanketMat);
    blanket.position.set(0.47, 0.61, 3.68);
    this.group.add(blanket);

    const pillowGeo = new THREE.BoxGeometry(0.36, 0.1, 0.24);
    for (const px of [0.27, 0.67]) {
      const pillow = new THREE.Mesh(pillowGeo, pillowMat);
      pillow.position.set(px, 0.65, 4.48);
      pillow.rotation.x = 0.16;
      this.group.add(pillow);
    }

    // Subtle bedside glow trim
    const bedTrimGeo = new THREE.BoxGeometry(0.015, 0.018, 1.54);
    const bedTrim = new THREE.Mesh(bedTrimGeo, accentMat);
    bedTrim.position.set(-0.01, 0.28, 3.92);
    this.group.add(bedTrim);

    // 6) RV Mini-Home Warm Ceiling Light Panels + PointLight
    this.rvCeilingLampMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfde68a,
      emissiveIntensity: 0.05,
      roughness: 0.24,
    });
    const rvLampGeo = new THREE.BoxGeometry(0.56, 0.025, 0.28);
    for (const lz of [1.65, 4.18]) {
      const panel = new THREE.Mesh(rvLampGeo, this.rvCeilingLampMat);
      panel.position.set(0, 2.015, lz);
      this.group.add(panel);
    }
    this.rvCabinLight = new THREE.PointLight(0xfff4d6, 0, 6.2, 1.4);
    this.rvCabinLight.position.set(0, 1.88, 2.55);
    this.group.add(this.rvCabinLight);

    this.disposables.push(
      woodFloorMat,
      cabinetMat,
      counterTopMat,
      ceramicMat,
      mattressMat,
      blanketMat,
      pillowMat,
      showerTileMat,
      showerGlassMat,
      waterDropMat,
      steamMat,
      rvFloorGeo,
      kBaseGeo,
      kTopGeo,
      coffeeBodyGeo,
      coffeeSpoutGeo,
      this.rvCoffeeLedMat,
      coffeeLedGeo,
      mugGeo,
      steamGeo,
      fridgeBodyGeo,
      fridgeCoolGlowMat,
      fridgeRecessGeo,
      bottleGeo,
      fridgeDoorGeo,
      fridgeHandleGeo,
      tvBezelGeo,
      tvScreenGeo,
      tvScreenMat,
      loungeBenchGeo,
      trayGeo,
      wetWallGeo,
      glassSideGeo,
      glassFrontWall.geometry,
      glassInnerGeo,
      showerPipeGeo,
      showerHeadGeo,
      dropGeo,
      dividerGeo,
      tBaseGeo,
      tBowlGeo,
      tTankGeo,
      this.rvToiletFlushMat,
      flushBtnGeo,
      bedFrameGeo,
      mattressGeo,
      blanketGeo,
      pillowGeo,
      bedTrimGeo,
      this.rvCeilingLampMat,
      rvLampGeo,
    );
  }

  public triggerToiletFlush(): void {
    this.toiletFlushTimer = 1.4;
  }

  public setVehicleModel(_id: VehicleTypeId): void {
    this.vehicleModel = 'coupe';
  }

  public getVehicleModel(): VehicleTypeId {
    return this.vehicleModel;
  }

  public clampRvPlayerPos(localPos: THREE.Vector3): void {
    localPos.y = 0.195;
    localPos.x = THREE.MathUtils.clamp(localPos.x, -0.84, 0.84);
    localPos.z = THREE.MathUtils.clamp(localPos.z, -0.1, 4.48);

    // Prevent passing through front seats; keep open center aisle x ∈ [-0.18, 0.18]
    if (localPos.z < 0.44 && Math.abs(localPos.x) > 0.18) {
      if (localPos.z < 0.25) {
        localPos.x = THREE.MathUtils.clamp(localPos.x, -0.18, 0.18);
      } else {
        localPos.z = 0.44;
      }
    }

    // Left Kitchenette counter + Mini-fridge (x < -0.30, z ∈ [0.46, 1.98])
    if (localPos.x < -0.3 && localPos.z > 0.46 && localPos.z < 1.98) {
      localPos.x = -0.3;
    }

    // Left Shower stall + Toilet pod (x < -0.26, z ∈ [1.98, 3.72])
    if (localPos.x < -0.25 && localPos.z >= 1.98 && localPos.z <= 3.74) {
      localPos.x = -0.25;
    }

    // Right Lounge bench under TV (x > 0.44, z ∈ [1.0, 2.02])
    if (localPos.x > 0.44 && localPos.z > 1.0 && localPos.z < 2.02) {
      localPos.x = 0.44;
    }

    // Right Bed footprint (x > -0.1, z > 3.04)
    if (localPos.x > -0.08 && localPos.z > 3.04) {
      const penX = localPos.x - -0.08;
      const penZ = localPos.z - 3.04;
      if (penX < penZ) {
        localPos.x = -0.08;
      } else {
        localPos.z = 3.04;
      }
    }
  }

  public getNearestRvStation(localPos: THREE.Vector3): RvStationKind | null {
    if (localPos.z < 0.56) return 'cab';
    const dFridge = Math.hypot(localPos.x - -0.25, localPos.z - 0.68);
    const dCoffee = Math.hypot(localPos.x - -0.32, localPos.z - 1.42);
    const dTv = Math.hypot(localPos.x - 0.36, localPos.z - 1.52);
    const dShower = Math.hypot(localPos.x - -0.25, localPos.z - 2.46);
    const dSunroof = Math.hypot(localPos.x - 0.06, localPos.z - 2.9);
    const dToilet = Math.hypot(localPos.x - -0.28, localPos.z - 3.34);
    const dBed = Math.hypot(localPos.x - -0.04, localPos.z - 3.65);

    let best: RvStationKind | null = null;
    let bestDist = 0.88;
    const checks: [RvStationKind, number][] = [
      ['fridge', dFridge],
      ['coffee', dCoffee],
      ['tv', dTv],
      ['shower', dShower],
      ['toilet', dToilet],
      ['bed', dBed],
      ['sunroof', dSunroof + 0.16],
    ];
    for (const [kind, d] of checks) {
      if (d < bestDist) {
        bestDist = d;
        best = kind;
      }
    }
    return best;
  }

  public getRvBedCameraAnchor(): { pos: THREE.Vector3; lookYaw: number; lookPitch: number } {
    return {
      pos: new THREE.Vector3(0.45, 0.88, 4.26),
      lookYaw: 0.22,
      lookPitch: 0.08,
    };
  }

  public setWeatherDetail(detail: number): void {
    this.windshieldRainMat.uniforms.uDetail.value = detail > 0.5 ? 1.0 : 0.0;
  }

  public update(
    steerInput: number,
    speedKmh: number,
    altitudeM: number,
    flightState: VehicleFlightState,
    rollRad: number,
    pitchRad: number,
    weather: WeatherMode,
    elapsed: number,
    delta: number,
    inSpace: boolean,
    inOrbit: boolean,
    planetName: string,
    spaceFactor: number,
    horizonColor: THREE.Color,
    showSeatedCompanion: boolean,
    driverLookingAtCompanion: boolean,
    cabinTheme: CabinThemeId = 'auto',
    boostActive = false,
    sheltered = false,
    cabinOpts?: CockpitCabinOptions,
  ): void {
    const tintDark = Boolean(cabinOpts?.cabinTintDark);
    const roofLightOn = Boolean(cabinOpts?.cabinRoofLight);
    const seatsReclined = Boolean(cabinOpts?.cabinSeatsReclined);
    const monitorOpen = Boolean(cabinOpts?.cabinMonitorOpen);
    const leftWinOpen = Boolean(cabinOpts?.leftWindowOpen);
    const rightWinOpen = Boolean(cabinOpts?.rightWindowOpen);
    const rvLightsOn = Boolean(cabinOpts?.rvLightsOn);
    const rvTvOn = Boolean(cabinOpts?.rvTvOn);
    const rvShowerOn = Boolean(cabinOpts?.rvShowerOn);
    const rvCoffeeBrewed = Boolean(cabinOpts?.rvCoffeeBrewed);
    const rvWindowTinted = Boolean(cabinOpts?.rvWindowTinted);
    const rvFridgeOpen = Boolean(cabinOpts?.rvFridgeOpen);
    const rvSunroofOpen = Boolean(cabinOpts?.rvSunroofOpen);

    const targetWheelAngle = steerInput * 0.72;
    this.steeringWheelGroup.rotation.z = THREE.MathUtils.damp(
      this.steeringWheelGroup.rotation.z,
      targetWheelAngle,
      10,
      delta,
    );

    this.drivePrism.rotation.y = elapsed * (boostActive ? 4.2 : 1.4);
    this.drivePrism.rotation.x = Math.sin(elapsed * 0.9) * 0.25;

    // Front cab glass tint & sliding door panes
    this.cabinGlassMat.color.lerp(
      tintDark ? this.glassTintColor : this.glassClearColor,
      1 - Math.exp(-5.5 * delta),
    );
    this.cabinGlassMat.opacity = THREE.MathUtils.damp(
      this.cabinGlassMat.opacity,
      tintDark ? 0.94 : 0.09,
      6.5,
      delta,
    );

    // RV mini-home windows tint
    this.rvGlassMat.color.lerp(
      rvWindowTinted ? this.glassTintColor : this.glassClearColor,
      1 - Math.exp(-5.5 * delta),
    );
    this.rvGlassMat.opacity = THREE.MathUtils.damp(
      this.rvGlassMat.opacity,
      rvWindowTinted ? 0.94 : 0.11,
      6.5,
      delta,
    );

    this.leftDoorWindowMesh.position.y = THREE.MathUtils.damp(
      this.leftDoorWindowMesh.position.y,
      leftWinOpen ? -0.58 : 0,
      8.5,
      delta,
    );
    this.rightDoorWindowMesh.position.y = THREE.MathUtils.damp(
      this.rightDoorWindowMesh.position.y,
      rightWinOpen ? -0.58 : 0,
      8.5,
      delta,
    );

    // Reclined front seat angle tuned cleanly so head never clips
    const targetBackAngle = seatsReclined ? 0.78 : 0.22;
    for (const bp of this.seatBackPivots) {
      bp.rotation.x = THREE.MathUtils.damp(bp.rotation.x, targetBackAngle, 6, delta);
    }

    this.roofDomeGlow = THREE.MathUtils.damp(
      this.roofDomeGlow,
      roofLightOn ? 2.15 : 0,
      7,
      delta,
    );
    this.roofDomeLampMat.emissiveIntensity = THREE.MathUtils.damp(
      this.roofDomeLampMat.emissiveIntensity,
      roofLightOn ? 1.9 : 0.05,
      7,
      delta,
    );

    this.movieMonitorPivot.rotation.x = THREE.MathUtils.damp(
      this.movieMonitorPivot.rotation.x,
      monitorOpen ? 0.18 : -Math.PI * 0.48,
      7,
      delta,
    );
    this.movieScreenGlow = THREE.MathUtils.damp(
      this.movieScreenGlow,
      monitorOpen ? 0.72 : 0,
      6,
      delta,
    );
    this.movieDisplay.update(elapsed, monitorOpen || rvTvOn);

    // RV Mini-Home Fixtures animation
    this.rvCeilingGlow = THREE.MathUtils.damp(
      this.rvCeilingGlow,
      rvLightsOn ? 2.65 : 0.18,
      6.5,
      delta,
    );
    this.rvCeilingLampMat.emissiveIntensity = THREE.MathUtils.damp(
      this.rvCeilingLampMat.emissiveIntensity,
      rvLightsOn ? 1.85 : 0.08,
      6.5,
      delta,
    );

    this.rvTvScreenMesh.visible = rvTvOn;
    this.rvTvGlow = THREE.MathUtils.damp(this.rvTvGlow, rvTvOn ? 1.05 : 0, 6, delta);
    const rvTotalGlow = this.rvCeilingGlow + this.rvTvGlow * 0.8;
    this.rvCabinLight.intensity = rvTotalGlow;
    this.rvCabinLight.color
      .copy(_rvWarmTint)
      .lerp(_tvLightTint, rvTvOn && !rvLightsOn ? 0.65 : rvTvOn ? 0.18 : 0);
    this.rvCabinLight.visible = Boolean(cabinOpts?.isInRvCabin) || rvLightsOn || rvTvOn;
    this.rvPassengerGroup.visible = Boolean(cabinOpts?.rvPassengerActive);

    this.rvCoffeeCupsGroup.visible = rvCoffeeBrewed;
    this.rvCoffeeLedMat.emissiveIntensity = rvCoffeeBrewed ? 1.65 : 0.3;
    if (rvCoffeeBrewed) {
      for (let i = 0; i < this.rvSteamDots.length; i++) {
        const dot = this.rvSteamDots[i];
        const cycle = (elapsed * 0.8 + i * 0.25) % 1;
        dot.position.y = 1.06 + cycle * 0.22;
        dot.scale.setScalar(0.6 + cycle * 0.7);
      }
    }

    for (let i = 0; i < this.rvShowerDrops.length; i++) {
      const sd = this.rvShowerDrops[i];
      sd.mesh.visible = rvShowerOn;
      if (rvShowerOn) {
        const t = (elapsed * 1.9 + sd.phase) % 1;
        sd.mesh.position.set(sd.baseX, 1.8 - t * 1.48, sd.baseZ);
      }
    }

    if (this.toiletFlushTimer > 0) {
      this.toiletFlushTimer = Math.max(0, this.toiletFlushTimer - delta);
      this.rvToiletFlushMat.emissiveIntensity = 1.8;
    } else {
      this.rvToiletFlushMat.emissiveIntensity = 0.32;
    }

    this.rvFridgeDoorPivot.rotation.y = THREE.MathUtils.damp(
      this.rvFridgeDoorPivot.rotation.y,
      rvFridgeOpen ? 1.32 : 0,
      7.5,
      delta,
    );
    this.rvSunroofShutter.position.z = THREE.MathUtils.damp(
      this.rvSunroofShutter.position.z,
      rvSunroofOpen ? 1.72 : 3.0,
      6.5,
      delta,
    );

    const isOrbitState = flightState === 'orbit' || flightState === 'launching_orbit';
    const isSpaceMode = inSpace || flightState === 'launching' || flightState === 'entering';
    const isAir = flightState !== 'road';

    // Back-to-the-Future repulsor wheel tilt on takeoff/hover
    const targetWheelY = isAir ? 0.28 : 0.36;
    const roadWheelSpin = !isAir ? (speedKmh / 3.6) * delta * 2.4 : 0;
    const hoverPulse = isAir ? 1 + Math.sin(elapsed * 8.5) * 0.08 : 1;
    for (let i = 0; i < this.wheelPivots.length; i++) {
      const wp = this.wheelPivots[i];
      const targetRotZ = isAir ? -wp.side * (Math.PI * 0.5) : 0;
      wp.pivot.rotation.z = THREE.MathUtils.damp(wp.pivot.rotation.z, targetRotZ, 6.5, delta);
      wp.pivot.position.y = THREE.MathUtils.damp(wp.pivot.position.y, targetWheelY, 6.5, delta);
      if (!isAir) {
        wp.core.rotation.x -= roadWheelSpin;
      } else {
        wp.ring.scale.setScalar(hoverPulse);
      }
      if (!isAir) {
        wp.ring.scale.setScalar(1);
      }
    }
    let targetAccent = isOrbitState
      ? this.accentColorAir
      : isSpaceMode
        ? this.accentColorSpace
        : isAir
          ? this.accentColorAir
          : this.accentColorRoad;
    if (cabinTheme !== 'auto') {
      const hex =
        cabinTheme === 'amber'
          ? '#f59e0b'
          : cabinTheme === 'ice'
            ? '#38bdf8'
            : cabinTheme === 'emerald'
              ? '#34d399'
              : cabinTheme === 'rose'
                ? '#fb7185'
                : '#a78bfa';
      this.accentColorCustom.set(hex);
      targetAccent = this.accentColorCustom;
    }
    this.currentAccent.lerp(targetAccent, 1 - Math.exp(-3.5 * delta));
    const glowScale = boostActive ? 2.15 : 1.55;
    for (const mat of this.accentMaterials) {
      mat.color.copy(this.currentAccent);
      mat.emissive.copy(this.currentAccent);
      mat.emissiveIntensity = glowScale;
    }
    const baseCabinGlow = boostActive ? 1.05 : 0.72;
    const totalFrontGlow = Math.max(baseCabinGlow, this.roofDomeGlow + this.movieScreenGlow * 0.65);
    this.frontCabinLight.color.copy(this.currentAccent);
    if (this.roofDomeGlow > 0.05) {
      this.frontCabinLight.color.lerp(_domeLightTint, THREE.MathUtils.clamp(this.roofDomeGlow / 2.15, 0, 0.85));
    }
    if (this.movieScreenGlow > 0.05) {
      this.frontCabinLight.color.lerp(_tvLightTint, THREE.MathUtils.clamp(this.movieScreenGlow * 0.6, 0, 0.45));
    }
    this.frontCabinLight.intensity = totalFrontGlow;

    const shelterMul = sheltered ? 0.0 : 1.0;
    const atmoMul = THREE.MathUtils.clamp(1 - spaceFactor * 1.4, 0, 1) * shelterMul;
    const weatherRain = weather === 'rain' ? 0.72 : weather === 'storm' ? 1.0 : 0.0;
    const weatherSnow = weather === 'snow' ? 0.85 : 0.0;

    this.rainLevel = THREE.MathUtils.damp(this.rainLevel, weatherRain * atmoMul, 2.5, delta);
    this.snowLevel = THREE.MathUtils.damp(this.snowLevel, weatherSnow * atmoMul, 2.5, delta);

    if (this.rainLevel > 0.008 || this.snowLevel > 0.008) {
      this.rainGlass.visible = true;
      this.leftDoorRainGlass.visible = true;
      this.rightDoorRainGlass.visible = true;
      this.rvWeatherGlassGroup.visible = true;
      this.windshieldRainMat.uniforms.uTime.value = elapsed;
      this.windshieldRainMat.uniforms.uRain.value = this.rainLevel;
      this.windshieldRainMat.uniforms.uSnow.value = this.snowLevel;
      this.windshieldRainMat.uniforms.uSteer.value = steerInput;
      this.windshieldRainMat.uniforms.uSpeed.value = speedKmh;
      this.windshieldRainMat.uniforms.uTint.value
        .copy(horizonColor)
        .lerp(this.rainBaseTint, 0.65);
    } else {
      this.rainGlass.visible = false;
      this.leftDoorRainGlass.visible = false;
      this.rightDoorRainGlass.visible = false;
      this.rvWeatherGlassGroup.visible = false;
    }

    this.companion.update(
      elapsed,
      delta,
      steerInput,
      speedKmh,
      showSeatedCompanion,
      driverLookingAtCompanion,
      seatsReclined,
      monitorOpen,
    );

    this.display.update(
      speedKmh,
      altitudeM,
      flightState,
      rollRad,
      pitchRad,
      weather,
      elapsed,
      inSpace,
      inOrbit,
      planetName,
      !cabinOpts?.isInRvCabin,
    );
  }

  public applyCompanionOutfit(
    torsoHex: string,
    trimHex: string,
    legsHex: string,
    accentHex: string,
    equip?: RpgEquipMap,
  ): void {
    this.companion.applyRpgOutfit(torsoHex, trimHex, legsHex, accentHex, equip);
    this.rvCompanion.applyRpgOutfit(torsoHex, trimHex, legsHex, accentHex, equip);
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
