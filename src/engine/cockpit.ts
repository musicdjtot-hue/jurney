import * as THREE from 'three';
import { BlondePassengerRig } from './companion';
import { DashboardDisplay } from './textures';
import type { CabinThemeId, VehicleFlightState, WeatherMode } from '../types/simulation';

const DRIVER_X = -0.36;
const PASSENGER_X = 0.36;

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

        vec2 d = (gv - vec2(dropX, dropY)) * vec2(1.0, 1.55);
        float bead = smoothstep(0.16, 0.04, length(d));

        float aboveMask = smoothstep(dropY - 0.02, dropY + 0.05, gv.y) * smoothstep(0.49, 0.25, gv.y);
        float trailDist = abs(gv.x - dropX);
        float trailWidth = mix(0.06, 0.015, clamp((gv.y - dropY) * 1.6, 0.0, 1.0));
        float trail = smoothstep(trailWidth, 0.0, trailDist) * aboveMask * 0.65;

        float spec = smoothstep(0.11, 0.02, length(d - vec2(-0.02, -0.04))) * 0.75;

        float vis = step(0.32, n);
        return vec2((bead + trail) * vis, spec * vis);
      }

      float snowLayer(vec2 uv, float scale, float t) {
        vec2 st = uv * vec2(scale * 1.9, scale);
        st.y += t * 0.14;
        st.x += sin(t * 0.7 + uv.y * 6.0) * 0.22;
        vec2 gv = fract(st) - 0.5;
        float n = hash21(floor(st));
        vec2 off = vec2(n - 0.5, fract(n * 17.3) - 0.5) * 0.48;
        float flake = smoothstep(0.22, 0.04, length(gv - off));
        return flake * step(0.48, n);
      }

      void main() {
        if (uRain <= 0.005 && uSnow <= 0.005) discard;

        vec2 uv = vUv;
        uv.x += (1.0 - uv.y) * uSteer * 0.045;

        float t = uTime * (0.9 + clamp(uSpeed / 180.0, 0.0, 0.85));
        vec2 l1 = rainLayer(uv, 11.0, t);
        vec2 l2 = rainLayer(uv + vec2(0.37, 0.19), 18.0, t * 1.25);

        vec2 mst = uv * vec2(52.0, 28.0);
        vec2 mgv = fract(mst) - 0.5;
        float mn = hash21(floor(mst));
        float micro = smoothstep(0.19, 0.05, length(mgv)) * step(0.62, mn) * 0.35;

        float rainMask = clamp((l1.x * 0.85 + l2.x * 0.65 + micro) * uRain, 0.0, 0.82);
        float highlight = clamp((l1.y + l2.y * 0.7) * uRain, 0.0, 0.9);

        float sn1 = snowLayer(vUv, 14.0, uTime * (0.5 + clamp(uSpeed / 220.0, 0.0, 0.6)));
        float sn2 = snowLayer(vUv + vec2(0.41, 0.23), 24.0, uTime * 0.65);
        float edgeFrost = smoothstep(0.35, 0.0, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y))) * 0.22;
        float snowMask = clamp((sn1 * 0.75 + sn2 * 0.55 + edgeFrost) * uSnow, 0.0, 0.78);

        float totalAlpha = clamp(rainMask + snowMask, 0.0, 0.86);
        vec3 rainCol = mix(uTint * 0.72, vec3(1.0), highlight * 0.75);
        vec3 snowCol = vec3(0.92, 0.97, 1.0);
        vec3 col = mix(rainCol, snowCol, snowMask / max(0.001, totalAlpha));
        gl_FragColor = vec4(col, totalAlpha);
      }
    `,
  });
}

export class CockpitRig {
  public readonly group = new THREE.Group();
  public readonly companion: BlondePassengerRig;
  private steeringWheelGroup = new THREE.Group();
  private drivePrism: THREE.Mesh;
  private display: DashboardDisplay;
  private accentMaterials: THREE.MeshStandardMaterial[] = [];
  private accentColorRoad = new THREE.Color('#f59e0b');
  private accentColorAir = new THREE.Color('#38bdf8');
  private accentColorSpace = new THREE.Color('#a78bfa');
  private accentColorCustom = new THREE.Color('#f59e0b');
  private currentAccent = new THREE.Color('#f59e0b');
  private windshieldRainMat: THREE.ShaderMaterial;
  private rainGlass: THREE.Mesh;
  private rainBaseTint = new THREE.Color('#e0f2fe');
  private rainLevel = 0;
  private snowLevel = 0;
  private interiorLight: THREE.PointLight;
  private disposables: { dispose: () => void }[] = [];

  constructor(maxAnisotropy: number, isSoftwareGl: boolean) {
    this.display = new DashboardDisplay(maxAnisotropy);
    this.companion = new BlondePassengerRig(maxAnisotropy);
    this.disposables.push(this.display, this.companion);

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x0e131b,
      roughness: 0.72,
      metalness: 0.24,
    });
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x475569,
      roughness: 0.2,
      metalness: 0.92,
      anisotropy: isSoftwareGl ? 0 : 0.8,
    });
    const hullPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0x161f2e,
      roughness: 0.16,
      metalness: 0.84,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
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
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.08,
      metalness: 0.14,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
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

    // Sealed front cowl bar joining hood & base of windshield with zero gap
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

    // Floating holographic HUD glass pane above driver dash
    const hudGlassGeo = new THREE.PlaneGeometry(0.36, 0.11);
    const hudGlass = new THREE.Mesh(hudGlassGeo, holoGlassMat);
    hudGlass.position.set(DRIVER_X, 0.985, -0.56);
    hudGlass.rotation.x = -0.22;
    hudGlass.renderOrder = 4;
    this.group.add(hudGlass);

    // Passenger-side futuristic holo-console glass bar
    const passHoloGeo = new THREE.PlaneGeometry(0.46, 0.08);
    const passHolo = new THREE.Mesh(passHoloGeo, holoGlassMat);
    passHolo.position.set(PASSENGER_X, 0.85, -0.46);
    passHolo.rotation.x = -0.25;
    passHolo.renderOrder = 4;
    this.group.add(passHolo);
    this.disposables.push(hudGlassGeo, passHoloGeo);

    // Full floorboard + firewall + floating futuristic center bridge console
    const floorGeo = new THREE.BoxGeometry(1.92, 0.1, 2.38);
    const floorMesh = new THREE.Mesh(floorGeo, leatherGripMat);
    floorMesh.position.set(0, 0.14, 0.04);
    this.group.add(floorMesh);

    const firewallGeo = new THREE.BoxGeometry(1.86, 0.56, 0.14);
    const firewallMesh = new THREE.Mesh(firewallGeo, carbonMat);
    firewallMesh.position.set(0, 0.44, -0.96);
    this.group.add(firewallMesh);

    const consoleGeo = new THREE.BoxGeometry(0.24, 0.22, 1.44);
    const consoleMesh = new THREE.Mesh(consoleGeo, carbonMat);
    consoleMesh.position.set(0, 0.39, -0.04);
    this.group.add(consoleMesh);

    const bridgeSlopeGeo = new THREE.BoxGeometry(0.22, 0.05, 0.52);
    const bridgeSlope = new THREE.Mesh(bridgeSlopeGeo, titaniumMat);
    bridgeSlope.position.set(0, 0.56, -0.34);
    bridgeSlope.rotation.x = -0.34;
    this.group.add(bridgeSlope);

    const consoleLidGeo = new THREE.BoxGeometry(0.2, 0.04, 0.58);
    const consoleLid = new THREE.Mesh(consoleLidGeo, seatBolsterMat);
    consoleLid.position.set(0, 0.51, 0.14);
    this.group.add(consoleLid);

    const consoleGlowGeo = new THREE.BoxGeometry(0.012, 0.012, 1.15);
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(consoleGlowGeo, accentMat);
      strip.position.set(side * 0.124, 0.49, -0.06);
      this.group.add(strip);
    }

    // Floating rotating holo-drive prism on center console
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
    const colMesh = new THREE.Mesh(colGeo, carbonMat);
    colMesh.position.set(DRIVER_X, 0.77, -0.46);
    colMesh.rotation.x = -0.24;
    this.group.add(colMesh);

    this.group.add(this.steeringWheelGroup);
    this.disposables.push(yokeLowerGeo, gripGeo, hubGeo, hubCoreGeo, colGeo);

    // 4. Sculpted Futuristic Cyber-Sport Bucket Seats (Driver & Passenger)
    const seatCushionGeo = new THREE.BoxGeometry(0.46, 0.12, 0.48);
    const cushionBolsterGeo = new THREE.BoxGeometry(0.08, 0.15, 0.46);
    const backrestGeo = new THREE.BoxGeometry(0.42, 0.62, 0.1);
    const backBolsterGeo = new THREE.BoxGeometry(0.085, 0.56, 0.15);
    const headrestGeo = new THREE.BoxGeometry(0.24, 0.18, 0.085);
    const seatAccentGeo = new THREE.BoxGeometry(0.014, 0.26, 0.016);

    for (const seatX of [DRIVER_X, PASSENGER_X]) {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(seatX, 0, 0);

      const base = new THREE.Mesh(seatCushionGeo, seatLeatherMat);
      base.position.set(0, 0.34, -0.06);
      base.rotation.x = -0.06;
      seatGroup.add(base);

      for (const side of [-1, 1]) {
        const b1 = new THREE.Mesh(cushionBolsterGeo, seatBolsterMat);
        b1.position.set(side * 0.22, 0.37, -0.06);
        b1.rotation.z = side * -0.18;
        seatGroup.add(b1);
      }

      const backPivot = new THREE.Group();
      backPivot.position.set(0, 0.39, 0.14);
      backPivot.rotation.x = 0.22;

      const back = new THREE.Mesh(backrestGeo, seatLeatherMat);
      back.position.set(0, 0.31, 0);
      backPivot.add(back);

      for (const side of [-1, 1]) {
        const b2 = new THREE.Mesh(backBolsterGeo, seatBolsterMat);
        b2.position.set(side * 0.21, 0.29, -0.02);
        b2.rotation.y = side * -0.22;
        backPivot.add(b2);

        const sAccent = new THREE.Mesh(seatAccentGeo, accentMat);
        sAccent.position.set(side * 0.215, 0.42, -0.08);
        backPivot.add(sAccent);
      }

      const headrest = new THREE.Mesh(headrestGeo, titaniumMat);
      headrest.position.set(0, 0.72, -0.01);
      backPivot.add(headrest);

      seatGroup.add(backPivot);
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

    // 5. Watertight Cabin Canopy Frame & Flush-Fitted Window Glazing
    // Shared exact corner points guarantee zero gaps between metal pillars, roof, sills, and glass
    const wsBL = new THREE.Vector3(-0.845, 0.815, -0.82);
    const wsBR = new THREE.Vector3(0.845, 0.815, -0.82);
    const wsTL = new THREE.Vector3(-0.725, 1.515, -0.125);
    const wsTR = new THREE.Vector3(0.725, 1.515, -0.125);

    const bBL = new THREE.Vector3(-0.855, 0.815, 0.48);
    const bBR = new THREE.Vector3(0.855, 0.815, 0.48);
    const bTL = new THREE.Vector3(-0.725, 1.515, 0.48);
    const bTR = new THREE.Vector3(0.725, 1.515, 0.48);

    const rTL = new THREE.Vector3(-0.725, 1.515, 0.66);
    const rTR = new THREE.Vector3(0.725, 1.515, 0.66);
    const rBL = new THREE.Vector3(-0.87, 0.835, 1.24);
    const rBR = new THREE.Vector3(0.87, 0.835, 1.24);

    // A-pillars, B-pillars, C-pillars, and roof headers exactly spanning the corners
    createStrutBetween(wsBL, wsTL, 0.056, 0.068, titaniumMat, this.group, this.disposables);
    createStrutBetween(wsBR, wsTR, 0.056, 0.068, titaniumMat, this.group, this.disposables);
    createStrutBetween(bBL, bTL, 0.075, 0.11, carbonMat, this.group, this.disposables);
    createStrutBetween(bBR, bTR, 0.075, 0.11, carbonMat, this.group, this.disposables);
    createStrutBetween(rTL, rBL, 0.075, 0.095, carbonMat, this.group, this.disposables);
    createStrutBetween(rTR, rBR, 0.075, 0.095, carbonMat, this.group, this.disposables);

    const headerGeo = new THREE.BoxGeometry(1.52, 0.055, 0.12);
    const roofHeader = new THREE.Mesh(headerGeo, carbonMat);
    roofHeader.position.set(0, 1.52, -0.125);

    const rearHeader = new THREE.Mesh(headerGeo, carbonMat);
    rearHeader.position.set(0, 1.52, 0.66);

    const roofRailGeo = new THREE.BoxGeometry(0.08, 0.058, 0.86);
    const leftRoofRail = new THREE.Mesh(roofRailGeo, carbonMat);
    leftRoofRail.position.set(-0.725, 1.518, 0.27);
    const rightRoofRail = new THREE.Mesh(roofRailGeo, carbonMat);
    rightRoofRail.position.set(0.725, 1.518, 0.27);

    // Flush panoramic roof glass + central structural spine with LED rail
    const roofGlassGeo = createQuadGeometry(wsTL, wsTR, rTR, rTL);
    const roofGlass = new THREE.Mesh(roofGlassGeo, glassMat);
    roofGlass.renderOrder = 4;

    const spineGeo = new THREE.BoxGeometry(0.12, 0.045, 0.82);
    const roofSpine = new THREE.Mesh(spineGeo, titaniumMat);
    roofSpine.position.set(0, 1.528, 0.27);

    const spineLedGeo = new THREE.BoxGeometry(0.018, 0.012, 0.74);
    const spineLed = new THREE.Mesh(spineLedGeo, accentMat);
    spineLed.position.set(0, 1.502, 0.27);

    // Sealed door sills, lower doors, and armrests
    const sillGeo = new THREE.BoxGeometry(0.12, 0.22, 1.48);
    const leftSill = new THREE.Mesh(sillGeo, carbonMat);
    leftSill.position.set(-0.87, 0.72, -0.14);
    const rightSill = new THREE.Mesh(sillGeo, carbonMat);
    rightSill.position.set(0.87, 0.72, -0.14);

    const doorLowerGeo = new THREE.BoxGeometry(0.12, 0.5, 1.48);
    const armrestGeo = new THREE.BoxGeometry(0.095, 0.06, 0.74);
    const doorGlowGeo = new THREE.BoxGeometry(0.014, 0.012, 0.96);

    for (const side of [-1, 1]) {
      const doorLower = new THREE.Mesh(doorLowerGeo, doorTrimMat);
      doorLower.position.set(side * 0.88, 0.42, -0.12);
      this.group.add(doorLower);

      const armrest = new THREE.Mesh(armrestGeo, seatBolsterMat);
      armrest.position.set(side * 0.83, 0.56, 0.02);
      this.group.add(armrest);

      const doorGlow = new THREE.Mesh(doorGlowGeo, accentMat);
      doorGlow.position.set(side * 0.835, 0.67, -0.05);
      this.group.add(doorGlow);
    }

    // Flush-fitted left & right door windows + rear quarter glass (strictly in window openings)
    const leftDoorGlassGeo = createQuadGeometry(bBL, wsBL, wsTL, bTL);
    const rightDoorGlassGeo = createQuadGeometry(wsBR, bBR, bTR, wsTR);
    const leftQuarterGlassGeo = createQuadGeometry(rBL, bBL, bTL, rTL);
    const rightQuarterGlassGeo = createQuadGeometry(bBR, rBR, rTR, bTR);

    for (const g of [leftDoorGlassGeo, rightDoorGlassGeo, leftQuarterGlassGeo, rightQuarterGlassGeo]) {
      const pane = new THREE.Mesh(g, glassMat);
      pane.renderOrder = 4;
      this.group.add(pane);
    }

    // Sealed rear deck & sloped rear glass
    const rearShelfGeo = new THREE.BoxGeometry(1.78, 0.28, 0.86);
    const rearShelf = new THREE.Mesh(rearShelfGeo, carbonMat);
    rearShelf.position.set(0, 0.72, 0.88);

    const rearGlassGeo = createQuadGeometry(rBL, rBR, rTR, rTL);
    const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
    rearGlass.renderOrder = 4;

    // Sleek Blade Side Camera-Mirrors & Frameless Rearview Mirror
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.04, 0.08);
    const leftMirror = new THREE.Mesh(mirrorGeo, titaniumMat);
    leftMirror.position.set(-1.01, 0.87, -0.58);
    leftMirror.rotation.y = 0.22;
    const rightMirror = new THREE.Mesh(mirrorGeo, titaniumMat);
    rightMirror.position.set(1.01, 0.87, -0.58);
    rightMirror.rotation.y = -0.22;

    const rearMirrorGeo = new THREE.BoxGeometry(0.24, 0.05, 0.018);
    const rearMirror = new THREE.Mesh(rearMirrorGeo, titaniumMat);
    rearMirror.position.set(0, 1.38, -0.22);

    this.group.add(
      roofHeader,
      rearHeader,
      roofGlass,
      roofSpine,
      spineLed,
      leftRoofRail,
      rightRoofRail,
      leftSill,
      rightSill,
      rearShelf,
      rearGlass,
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
      leftQuarterGlassGeo,
      rightQuarterGlassGeo,
      rearShelfGeo,
      rearGlassGeo,
      mirrorGeo,
      rearMirrorGeo,
    );

    // 6. Futuristic Aero-Speeder Exterior Body Shell (for Walking View)
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

    const sideBodyGeo = new THREE.BoxGeometry(0.22, 0.52, 3.76);
    const sideSkirtGeo = new THREE.BoxGeometry(0.26, 0.14, 3.45);
    const sideIntakeGlowGeo = new THREE.BoxGeometry(0.02, 0.025, 2.3);
    for (const side of [-1, 1]) {
      const sb = new THREE.Mesh(sideBodyGeo, hullPaintMat);
      sb.position.set(side * 0.99, 0.49, -0.45);
      this.group.add(sb);

      const sk = new THREE.Mesh(sideSkirtGeo, carbonMat);
      sk.position.set(side * 1.02, 0.21, -0.42);
      this.group.add(sk);

      const ig = new THREE.Mesh(sideIntakeGlowGeo, accentMat);
      ig.position.set(side * 1.105, 0.44, -0.35);
      this.group.add(ig);
    }

    const rearBodyGeo = new THREE.BoxGeometry(1.98, 0.58, 0.68);
    const rearBody = new THREE.Mesh(rearBodyGeo, hullPaintMat);
    rearBody.position.set(0, 0.54, 1.28);
    this.group.add(rearBody);

    const rearFinGeo = new THREE.BoxGeometry(0.07, 0.24, 0.65);
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(rearFinGeo, titaniumMat);
      fin.position.set(side * 0.88, 0.88, 1.22);
      fin.rotation.z = side * -0.22;
      this.group.add(fin);
    }

    const rearDiffuserGeo = new THREE.BoxGeometry(1.86, 0.18, 0.28);
    const rearDiffuser = new THREE.Mesh(rearDiffuserGeo, carbonMat);
    rearDiffuser.position.set(0, 0.22, 1.48);
    this.group.add(rearDiffuser);

    // Twin glowing rear ion thruster vents
    const jetVentGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16);
    jetVentGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const vent = new THREE.Mesh(jetVentGeo, accentMat);
      vent.position.set(side * 0.48, 0.38, 1.59);
      this.group.add(vent);
    }

    const taillightBarGeo = new THREE.BoxGeometry(1.84, 0.036, 0.04);
    const taillightBar = new THREE.Mesh(taillightBarGeo, taillightMat);
    taillightBar.position.set(0, 0.69, 1.595);
    this.group.add(taillightBar);

    // 4 Shrouded Futuristic Repulsor-Turbine Pods with Glowing Energy Rings
    const podShroudGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 24);
    podShroudGeo.rotateZ(Math.PI / 2);
    const podCoreGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 18);
    podCoreGeo.rotateZ(Math.PI / 2);
    const podGlowRingGeo = new THREE.TorusGeometry(0.24, 0.018, 8, 24);
    podGlowRingGeo.rotateY(Math.PI / 2);

    const podCoords: [number, number, number][] = [
      [-1.06, 0.35, -1.5],
      [1.06, 0.35, -1.5],
      [-1.08, 0.35, 0.88],
      [1.08, 0.35, 0.88],
    ];
    for (const [wx, wy, wz] of podCoords) {
      const shroud = new THREE.Mesh(podShroudGeo, carbonMat);
      shroud.position.set(wx, wy, wz);
      this.group.add(shroud);

      const core = new THREE.Mesh(podCoreGeo, titaniumMat);
      core.position.set(wx, wy, wz);
      this.group.add(core);

      const ring = new THREE.Mesh(podGlowRingGeo, accentMat);
      ring.position.set(wx + Math.sign(wx) * 0.138, wy, wz);
      this.group.add(ring);
    }

    this.disposables.push(
      frontNoseGeo,
      splitterGeo,
      chinGlowGeo,
      headlightBarGeo,
      sideBodyGeo,
      sideSkirtGeo,
      sideIntakeGlowGeo,
      rearBodyGeo,
      rearFinGeo,
      rearDiffuserGeo,
      jetVentGeo,
      taillightBarGeo,
      podShroudGeo,
      podCoreGeo,
      podGlowRingGeo,
    );

    // 7. Properly Sloped, Flush-Sealed Windshield + Exterior Rain & Snow Shader
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
    this.disposables.push(windshieldGeo, this.windshieldRainMat);

    // 8. Seated Blonde Passenger Companion on Right Seat
    this.companion.group.position.set(PASSENGER_X, 0, 0);
    this.group.add(this.companion.group);

    this.interiorLight = new THREE.PointLight(0xf59e0b, 0.72, 3.8, 2);
    this.interiorLight.position.set(0, 1.32, -0.05);
    this.group.add(this.interiorLight);
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
  ): void {
    const targetWheelAngle = steerInput * 0.72;
    this.steeringWheelGroup.rotation.z = THREE.MathUtils.damp(
      this.steeringWheelGroup.rotation.z,
      targetWheelAngle,
      10,
      delta,
    );

    this.drivePrism.rotation.y = elapsed * (boostActive ? 4.2 : 1.4);
    this.drivePrism.rotation.x = Math.sin(elapsed * 0.9) * 0.25;

    const isOrbitState = flightState === 'orbit' || flightState === 'launching_orbit';
    const isSpaceMode = inSpace || flightState === 'launching' || flightState === 'entering';
    const isAir = flightState !== 'road';
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
    this.interiorLight.color.copy(this.currentAccent);
    this.interiorLight.intensity = boostActive ? 1.05 : 0.72;

    const shelterMul = sheltered ? 0.0 : 1.0;
    const atmoMul = THREE.MathUtils.clamp(1 - spaceFactor * 1.4, 0, 1) * shelterMul;
    const weatherRain = weather === 'rain' ? 0.72 : weather === 'storm' ? 1.0 : 0.0;
    const weatherSnow = weather === 'snow' ? 0.85 : 0.0;

    this.rainLevel = THREE.MathUtils.damp(this.rainLevel, weatherRain * atmoMul, 2.5, delta);
    this.snowLevel = THREE.MathUtils.damp(this.snowLevel, weatherSnow * atmoMul, 2.5, delta);

    if (this.rainLevel > 0.008 || this.snowLevel > 0.008) {
      this.rainGlass.visible = true;
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
    }

    this.companion.update(
      elapsed,
      delta,
      steerInput,
      speedKmh,
      showSeatedCompanion,
      driverLookingAtCompanion,
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
    );
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
