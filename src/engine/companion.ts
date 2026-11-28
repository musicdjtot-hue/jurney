import * as THREE from 'three';

const FACE_PHOTO_URL =
  (typeof window !== 'undefined' &&
    (window as unknown as { __COMPANION_FACE_DATA_URI__?: string }).__COMPANION_FACE_DATA_URI__) ||
  '/assets/aistudio/1791008464301_391386f9.jpg';

function paintFallbackFace(ctx: CanvasRenderingContext2D): void {
  const skinGrad = ctx.createRadialGradient(256, 250, 40, 256, 256, 270);
  skinGrad.addColorStop(0, '#eac4ad');
  skinGrad.addColorStop(0.65, '#dcb298');
  skinGrad.addColorStop(1, '#c6987e');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#6b4f3a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(214, 214);
  ctx.quadraticCurveTo(230, 206, 245, 213);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(298, 214);
  ctx.quadraticCurveTo(282, 206, 267, 213);
  ctx.stroke();

  for (const ex of [230, 282]) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(ex, 232, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6f9b93';
    ctx.beginPath();
    ctx.arc(ex, 232, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ex, 232, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 1.5, 230.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#c8737f';
  ctx.beginPath();
  ctx.ellipse(256, 298, 15, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

let sharedFaceTex: THREE.CanvasTexture | null = null;
let sharedFaceRefCount = 0;

function acquireSharedFaceTexture(maxAnisotropy: number): {
  texture: THREE.CanvasTexture;
  release: () => void;
} {
  if (!sharedFaceTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    paintFallbackFace(ctx);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    sharedFaceTex = tex;

    const img = new Image();
    if (!FACE_PHOTO_URL.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (!sharedFaceTex) return;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return;

      const off = document.createElement('canvas');
      off.width = 384;
      off.height = 384;
      const octx = off.getContext('2d')!;

      // Tight portrait crop covering forehead, brows, bright green-grey eyes, nose, cheeks, and smile
      const sx = w * 0.215;
      const sy = h * 0.205;
      const sw = w * 0.56;
      const sh = h * 0.455;
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, 384, 384);

      // Sample cheek skin tone for seamless sphere skin wrap around jaw/ears/neck
      let skinCenter = 'rgb(228,196,174)';
      let skinMid = 'rgb(212,172,147)';
      let skinEdge = 'rgb(190,148,122)';
      try {
        const sample = octx.getImageData(108, 224, 24, 24).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        const pxCount = sample.length / 4;
        for (let i = 0; i < sample.length; i += 4) {
          rSum += sample[i];
          gSum += sample[i + 1];
          bSum += sample[i + 2];
        }
        const r = Math.round(rSum / pxCount);
        const g = Math.round(gSum / pxCount);
        const b = Math.round(bSum / pxCount);
        skinCenter = `rgb(${Math.min(255, r + 9)},${Math.min(255, g + 7)},${Math.min(255, b + 5)})`;
        skinMid = `rgb(${r},${g},${b})`;
        skinEdge = `rgb(${Math.max(0, r - 18)},${Math.max(0, g - 20)},${Math.max(0, b - 20)})`;
      } catch {
        // Fallback warm skin palette
      }

      const baseGrad = ctx.createRadialGradient(256, 252, 34, 256, 256, 260);
      baseGrad.addColorStop(0, skinCenter);
      baseGrad.addColorStop(0.55, skinMid);
      baseGrad.addColorStop(1, skinEdge);
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Smooth elliptical feather mask preserving crisp facial features with zero hard seams
      octx.globalCompositeOperation = 'destination-in';
      const maskGrad = octx.createRadialGradient(192, 186, 118, 192, 190, 184);
      maskGrad.addColorStop(0, 'rgba(0,0,0,1)');
      maskGrad.addColorStop(0.68, 'rgba(0,0,0,0.96)');
      maskGrad.addColorStop(0.88, 'rgba(0,0,0,0.45)');
      maskGrad.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = maskGrad;
      octx.fillRect(0, 0, 384, 384);

      // Equirectangular UV projection tuned to SphereGeometry proportions (natural width, un-squished smile)
      ctx.drawImage(off, 256 - 78, 256 - 118, 156, 236);
      tex.needsUpdate = true;
    };
    img.src = FACE_PHOTO_URL;
  }

  sharedFaceRefCount++;
  const texRef = sharedFaceTex;
  let released = false;
  return {
    texture: texRef,
    release: () => {
      if (released) return;
      released = true;
      sharedFaceRefCount = Math.max(0, sharedFaceRefCount - 1);
      if (sharedFaceRefCount === 0 && sharedFaceTex === texRef) {
        texRef.dispose();
        sharedFaceTex = null;
      }
    },
  };
}

interface CompanionPalette {
  skinMat: THREE.MeshStandardMaterial;
  headFaceMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  hairHighlightMat: THREE.MeshStandardMaterial;
  hairDeepMat: THREE.MeshStandardMaterial;
  jacketMat: THREE.MeshStandardMaterial;
  jacketTrimMat: THREE.MeshStandardMaterial;
  topMat: THREE.MeshStandardMaterial;
  skirtMat: THREE.MeshStandardMaterial;
  bootMat: THREE.MeshStandardMaterial;
  jewelryMat: THREE.MeshStandardMaterial;
  disposables: { dispose: () => void }[];
}

function createCompanionPalette(maxAnisotropy: number): CompanionPalette {
  const faceHandle = acquireSharedFaceTexture(maxAnisotropy);
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdcb39a,
    roughness: 0.56,
    metalness: 0.02,
  });
  const headFaceMat = new THREE.MeshStandardMaterial({
    map: faceHandle.texture,
    roughness: 0.54,
    metalness: 0.02,
  });
  // Layered ash-blonde / warm light-chestnut tones matching reference photo
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x8f6f4d,
    roughness: 0.42,
    metalness: 0.1,
  });
  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: 0xb99970,
    roughness: 0.36,
    metalness: 0.12,
  });
  const hairDeepMat = new THREE.MeshStandardMaterial({
    color: 0x6f5338,
    roughness: 0.48,
    metalness: 0.08,
  });
  // Tailored cream-beige jacket & soft dark-ribbed inner top
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0xebe4d7,
    roughness: 0.46,
    metalness: 0.05,
  });
  const jacketTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd7cebe,
    roughness: 0.42,
    metalness: 0.08,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x13161f,
    roughness: 0.72,
    metalness: 0.05,
  });
  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x161926,
    roughness: 0.6,
    metalness: 0.1,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x10131d,
    roughness: 0.24,
    metalness: 0.28,
  });
  const jewelryMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.18,
    metalness: 0.9,
  });

  return {
    skinMat,
    headFaceMat,
    hairMat,
    hairHighlightMat,
    hairDeepMat,
    jacketMat,
    jacketTrimMat,
    topMat,
    skirtMat,
    bootMat,
    jewelryMat,
    disposables: [
      { dispose: faceHandle.release },
      skinMat,
      headFaceMat,
      hairMat,
      hairHighlightMat,
      hairDeepMat,
      jacketMat,
      jacketTrimMat,
      topMat,
      skirtMat,
      bootMat,
      jewelryMat,
    ],
  };
}

function buildHeadAndHair(p: CompanionPalette): THREE.Group {
  const headPivot = new THREE.Group();

  // Slightly refined oval head proportions
  const headGeo = new THREE.SphereGeometry(0.101, 28, 24);
  headGeo.scale(0.94, 1.09, 0.96);
  const head = new THREE.Mesh(headGeo, p.headFaceMat);
  head.rotation.y = Math.PI / 2;
  headPivot.add(head);

  // Seamless upper hair cap + back skull coverage (no bald gaps from any angle)
  const crownGeo = new THREE.SphereGeometry(0.106, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
  crownGeo.scale(0.98, 1.07, 1.03);
  const crown = new THREE.Mesh(crownGeo, p.hairMat);
  crown.position.set(0, 0.022, 0.022);
  crown.rotation.x = 0.44;
  headPivot.add(crown);

  const napeFillGeo = new THREE.SphereGeometry(0.098, 16, 12);
  napeFillGeo.scale(0.98, 1.05, 0.85);
  const napeFill = new THREE.Mesh(napeFillGeo, p.hairDeepMat);
  napeFill.position.set(0, -0.015, 0.032);
  headPivot.add(napeFill);

  // Center-parted natural curtain waves framing upper temples softly
  const waveGeo = new THREE.SphereGeometry(0.056, 14, 10);
  waveGeo.scale(0.86, 0.42, 0.82);
  for (const side of [-1, 1]) {
    const wave = new THREE.Mesh(waveGeo, p.hairHighlightMat);
    wave.position.set(side * 0.054, 0.092, -0.022);
    wave.rotation.z = side * 0.54;
    wave.rotation.y = side * -0.22;
    wave.rotation.x = 0.14;
    headPivot.add(wave);
  }

  // Smooth cascading back hair waterfall (open-ended shell curving behind head/shoulders)
  const backHairGeo = new THREE.CylinderGeometry(
    0.106,
    0.138,
    0.37,
    18,
    1,
    true,
    -Math.PI * 0.58,
    Math.PI * 1.16,
  );
  const backHair = new THREE.Mesh(backHairGeo, p.hairMat);
  backHair.rotation.y = 0;
  backHair.position.set(0, -0.115, 0.036);
  backHair.rotation.x = 0.08;
  headPivot.add(backHair);

  // Tapered natural side strands (replaces thick capsule tubes with sleek tapered waves)
  const frontStrandGeo = new THREE.CylinderGeometry(0.024, 0.012, 0.31, 10);
  const midStrandGeo = new THREE.CylinderGeometry(0.03, 0.016, 0.34, 10);
  const earStudGeo = new THREE.SphereGeometry(0.0085, 8, 8);

  for (const side of [-1, 1]) {
    const frontStrand = new THREE.Mesh(frontStrandGeo, p.hairHighlightMat);
    frontStrand.position.set(side * 0.088, -0.085, -0.024);
    frontStrand.rotation.z = side * 0.11;
    frontStrand.rotation.x = -0.14;
    headPivot.add(frontStrand);

    const midStrand = new THREE.Mesh(midStrandGeo, p.hairMat);
    midStrand.position.set(side * 0.092, -0.115, 0.024);
    midStrand.rotation.z = side * 0.07;
    midStrand.rotation.x = 0.04;
    headPivot.add(midStrand);

    const stud = new THREE.Mesh(earStudGeo, p.jewelryMat);
    stud.position.set(side * 0.094, -0.015, 0.004);
    headPivot.add(stud);
  }

  p.disposables.push(
    headGeo,
    crownGeo,
    napeFillGeo,
    waveGeo,
    backHairGeo,
    frontStrandGeo,
    midStrandGeo,
    earStudGeo,
  );
  return headPivot;
}

function buildTailoredTorso(
  p: CompanionPalette,
  target: THREE.Group,
  disposables: { dispose: () => void }[],
): void {
  const waistGeo = new THREE.CylinderGeometry(0.098, 0.118, 0.21, 16);
  const waist = new THREE.Mesh(waistGeo, p.topMat);
  waist.scale.set(1.12, 1, 0.76);
  waist.position.set(0, 0.105, 0);
  target.add(waist);

  const chestGeo = new THREE.SphereGeometry(0.128, 16, 14);
  chestGeo.scale(1.14, 1.04, 0.77);
  const chest = new THREE.Mesh(chestGeo, p.topMat);
  chest.position.set(0, 0.248, -0.01);
  target.add(chest);

  const jacketBackGeo = new THREE.CylinderGeometry(
    0.133,
    0.115,
    0.285,
    18,
    1,
    true,
    -Math.PI * 0.92,
    Math.PI * 1.84,
  );
  const jacketBack = new THREE.Mesh(jacketBackGeo, p.jacketMat);
  jacketBack.scale.set(1.18, 1, 0.84);
  jacketBack.rotation.y = 0;
  jacketBack.position.set(0, 0.212, 0.014);
  target.add(jacketBack);

  // Soft collar wrapping back of neck
  const collarGeo = new THREE.TorusGeometry(0.072, 0.018, 8, 16, Math.PI * 1.25);
  const collar = new THREE.Mesh(collarGeo, p.jacketTrimMat);
  collar.position.set(0, 0.352, 0.012);
  collar.rotation.x = Math.PI / 2 - 0.18;
  collar.rotation.z = -Math.PI * 0.125;
  target.add(collar);

  // Tapered notched lapels & zipper trim
  const lapelGeo = new THREE.BoxGeometry(0.048, 0.245, 0.024);
  const zipGeo = new THREE.BoxGeometry(0.008, 0.21, 0.008);
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(lapelGeo, p.jacketTrimMat);
    lapel.position.set(side * 0.073, 0.22, -0.093);
    lapel.rotation.y = side * 0.28;
    lapel.rotation.z = side * -0.11;
    target.add(lapel);

    const zip = new THREE.Mesh(zipGeo, p.jewelryMat);
    zip.position.set(side * 0.056, 0.205, -0.104);
    zip.rotation.z = side * -0.11;
    target.add(zip);
  }

  // Smooth neck + delicate gold necklace & pendant charm
  const neckGeo = new THREE.CylinderGeometry(0.04, 0.047, 0.11, 14);
  const neck = new THREE.Mesh(neckGeo, p.skinMat);
  neck.position.set(0, 0.398, 0.004);
  target.add(neck);

  const chainGeo = new THREE.TorusGeometry(0.049, 0.0032, 6, 18);
  const chain = new THREE.Mesh(chainGeo, p.jewelryMat);
  chain.position.set(0, 0.358, -0.006);
  chain.rotation.x = Math.PI / 2 + 0.24;
  target.add(chain);

  const pendantGeo = new THREE.SphereGeometry(0.0075, 8, 8);
  const pendant = new THREE.Mesh(pendantGeo, p.jewelryMat);
  pendant.position.set(0, 0.342, -0.055);
  target.add(pendant);

  disposables.push(waistGeo, chestGeo, jacketBackGeo, collarGeo, lapelGeo, zipGeo, neckGeo, chainGeo, pendantGeo);
}

export class BlondePassengerRig {
  public readonly group = new THREE.Group();
  private torsoPivot = new THREE.Group();
  private headPivot: THREE.Group;
  private palette: CompanionPalette;
  private disposables: { dispose: () => void }[] = [];

  private nextGlanceTime = 3.2;
  private glanceDuration = 0;
  private glanceTarget = 0;

  constructor(maxAnisotropy: number) {
    const p = createCompanionPalette(maxAnisotropy);
    this.palette = p;
    this.disposables.push(...p.disposables);

    const pelvisGeo = new THREE.SphereGeometry(0.144, 16, 12);
    pelvisGeo.scale(1.12, 0.72, 0.96);
    const pelvis = new THREE.Mesh(pelvisGeo, p.skirtMat);
    pelvis.position.set(0, 0.46, 0.02);
    this.group.add(pelvis);

    const skirtGeo = new THREE.CylinderGeometry(0.138, 0.172, 0.22, 18);
    skirtGeo.rotateX(Math.PI / 2 - 0.18);
    const skirt = new THREE.Mesh(skirtGeo, p.skirtMat);
    skirt.position.set(0, 0.45, -0.09);
    this.group.add(skirt);

    const thighGeo = new THREE.CapsuleGeometry(0.064, 0.26, 8, 12);
    thighGeo.rotateX(Math.PI / 2);
    const calfGeo = new THREE.CapsuleGeometry(0.046, 0.27, 8, 12);
    const bootCuffGeo = new THREE.CylinderGeometry(0.053, 0.049, 0.145, 12);
    const footGeo = new THREE.CapsuleGeometry(0.041, 0.095, 8, 10);
    footGeo.rotateX(Math.PI / 2);
    footGeo.scale(0.95, 0.75, 1.08);

    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(thighGeo, p.skinMat);
      thigh.position.set(side * 0.08, 0.455, -0.17);
      thigh.rotation.x = 0.08;
      thigh.rotation.y = side * -0.04;
      this.group.add(thigh);

      const kneeGeo = new THREE.SphereGeometry(0.054, 10, 10);
      const knee = new THREE.Mesh(kneeGeo, p.skinMat);
      knee.position.set(side * 0.086, 0.44, -0.33);
      this.group.add(knee);
      this.disposables.push(kneeGeo);

      const calf = new THREE.Mesh(calfGeo, p.skinMat);
      calf.position.set(side * 0.086, 0.3, -0.37);
      calf.rotation.x = -0.22;
      this.group.add(calf);

      const bootCuff = new THREE.Mesh(bootCuffGeo, p.bootMat);
      bootCuff.position.set(side * 0.086, 0.24, -0.39);
      bootCuff.rotation.x = -0.22;
      this.group.add(bootCuff);

      const foot = new THREE.Mesh(footGeo, p.bootMat);
      foot.position.set(side * 0.086, 0.195, -0.445);
      this.group.add(foot);
    }
    this.disposables.push(pelvisGeo, skirtGeo, thighGeo, calfGeo, bootCuffGeo, footGeo);

    this.torsoPivot.position.set(0, 0.5, 0.04);
    this.torsoPivot.rotation.x = 0.16;
    this.group.add(this.torsoPivot);

    buildTailoredTorso(p, this.torsoPivot, this.disposables);

    const upperArmGeo = new THREE.CapsuleGeometry(0.041, 0.2, 8, 10);
    const cuffGeo = new THREE.CylinderGeometry(0.039, 0.037, 0.04, 10);
    const forearmGeo = new THREE.CapsuleGeometry(0.033, 0.19, 8, 10);
    const handGeo = new THREE.SphereGeometry(0.034, 10, 8);
    handGeo.scale(0.85, 0.62, 1.25);
    const shoulderGeo = new THREE.SphereGeometry(0.051, 10, 10);

    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(shoulderGeo, p.jacketMat);
      shoulder.position.set(side * 0.162, 0.32, 0.01);
      this.torsoPivot.add(shoulder);

      const upperArm = new THREE.Mesh(upperArmGeo, p.jacketMat);
      upperArm.position.set(side * 0.178, 0.2, -0.02);
      upperArm.rotation.x = -0.35;
      upperArm.rotation.z = side * -0.12;
      this.torsoPivot.add(upperArm);

      const cuff = new THREE.Mesh(cuffGeo, p.jacketTrimMat);
      cuff.position.set(side * 0.184, 0.108, -0.068);
      cuff.rotation.x = -0.35;
      this.torsoPivot.add(cuff);

      const forearm = new THREE.Mesh(forearmGeo, p.skinMat);
      forearm.position.set(side * 0.145, 0.07, -0.12);
      forearm.rotation.x = -1.18;
      forearm.rotation.z = side * 0.32;
      this.torsoPivot.add(forearm);

      const hand = new THREE.Mesh(handGeo, p.skinMat);
      hand.position.set(side * 0.076, 0.01, -0.21);
      this.torsoPivot.add(hand);
    }

    this.disposables.push(shoulderGeo, upperArmGeo, cuffGeo, forearmGeo, handGeo);

    this.headPivot = buildHeadAndHair(p);
    this.headPivot.position.set(0, 0.482, -0.005);
    this.headPivot.rotation.x = -0.14;
    this.torsoPivot.add(this.headPivot);
  }

  public update(
    elapsed: number,
    delta: number,
    steerAngle: number,
    speedKmh: number,
    visible: boolean,
    driverLookingAtMe: boolean,
    seatsReclined = false,
    monitorOpen = false,
  ): void {
    this.group.visible = visible;
    if (!visible) return;

    const breath = Math.sin(elapsed * 1.85);
    const targetTorsoY = (seatsReclined ? 0.48 : 0.5) + breath * 0.0035;
    const targetTorsoRotX = (seatsReclined ? 0.72 : 0.16) - breath * 0.008;
    this.torsoPivot.position.y = THREE.MathUtils.damp(this.torsoPivot.position.y, targetTorsoY, 5.5, delta);
    this.torsoPivot.rotation.x = THREE.MathUtils.damp(this.torsoPivot.rotation.x, targetTorsoRotX, 5.5, delta);

    const leanZ = seatsReclined
      ? 0.02
      : THREE.MathUtils.clamp(steerAngle * 0.065 * Math.min(1, speedKmh / 45), -0.07, 0.07);
    this.torsoPivot.rotation.z = THREE.MathUtils.damp(this.torsoPivot.rotation.z, leanZ, 6, delta);

    let targetHeadYaw = Math.sin(elapsed * 0.42) * 0.07;
    let targetHeadPitch = (seatsReclined ? (monitorOpen ? -0.32 : -0.24) : -0.14) + Math.sin(elapsed * 0.55) * 0.025;
    let targetHeadRoll = Math.sin(elapsed * 0.35) * 0.03;

    if (seatsReclined && monitorOpen && !driverLookingAtMe) {
      targetHeadYaw = 0.24 + Math.sin(elapsed * 0.55) * 0.04;
      targetHeadPitch = -0.30 + Math.sin(elapsed * 0.9) * 0.02;
    }

    if (driverLookingAtMe) {
      targetHeadYaw = seatsReclined ? 1.24 : 1.42;
      targetHeadPitch = seatsReclined ? -0.12 : -0.04;
      targetHeadRoll = 0.05;
    } else {
      if (elapsed >= this.nextGlanceTime) {
        if (this.glanceDuration <= 0) {
          this.glanceDuration = 2.4 + Math.sin(elapsed * 1.3) * 0.5;
          this.glanceTarget = seatsReclined ? 1.16 : 0.48;
        }
        this.glanceDuration -= delta;
        if (this.glanceDuration <= 0) {
          this.glanceTarget = 0;
          this.nextGlanceTime = elapsed + (seatsReclined ? 5.2 : 7) + (Math.sin(elapsed * 2.7) + 1) * 3.0;
        }
      }
      if (this.glanceTarget > 0) {
        targetHeadYaw = this.glanceTarget;
        targetHeadRoll = 0.06;
        if (seatsReclined) {
          targetHeadPitch = -0.14;
        }
      }
    }

    const headSpeed = driverLookingAtMe ? 5.2 : 2.5;
    this.headPivot.rotation.y = THREE.MathUtils.damp(
      this.headPivot.rotation.y,
      targetHeadYaw,
      headSpeed,
      delta,
    );
    this.headPivot.rotation.x = THREE.MathUtils.damp(
      this.headPivot.rotation.x,
      targetHeadPitch,
      headSpeed,
      delta,
    );
    this.headPivot.rotation.z = THREE.MathUtils.damp(
      this.headPivot.rotation.z,
      targetHeadRoll,
      headSpeed,
      delta,
    );
  }

  public applyRpgOutfit(
    torsoHex = '#ebe4d7',
    trimHex = '#d7cebe',
    legsHex = '#161926',
    accentHex = '#fde68a',
  ): void {
    this.palette.jacketMat.color.set(torsoHex);
    this.palette.jacketTrimMat.color.set(trimHex);
    this.palette.skirtMat.color.set(legsHex);
    this.palette.bootMat.color.set(legsHex).multiplyScalar(0.85);
    this.palette.jewelryMat.color.set(accentHex);
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

export type CompanionPose = 'walk' | 'sit' | 'lie';

export class BlondeWalkerRig {
  public readonly group = new THREE.Group();
  private bodyGroup = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private leftKneePivot = new THREE.Group();
  private rightKneePivot = new THREE.Group();
  private leftArmPivot = new THREE.Group();
  private rightArmPivot = new THREE.Group();
  private torsoPivot = new THREE.Group();
  private headPivot: THREE.Group;
  private saberGroup = new THREE.Group();
  private saberBladeMat: THREE.MeshBasicMaterial;
  private saberGlowMat: THREE.MeshBasicMaterial;
  private palette: CompanionPalette;
  private disposables: { dispose: () => void }[] = [];
  private walkCycle = 0;

  constructor(maxAnisotropy: number) {
    const p = createCompanionPalette(maxAnisotropy);
    this.palette = p;
    this.disposables.push(...p.disposables);

    this.group.add(this.bodyGroup);

    const pelvisGeo = new THREE.SphereGeometry(0.135, 16, 12);
    pelvisGeo.scale(1.08, 0.72, 0.88);
    const pelvis = new THREE.Mesh(pelvisGeo, p.skirtMat);
    pelvis.position.set(0, 0.9, 0);
    this.bodyGroup.add(pelvis);

    const skirtGeo = new THREE.CylinderGeometry(0.122, 0.175, 0.28, 18);
    const skirt = new THREE.Mesh(skirtGeo, p.skirtMat);
    skirt.position.set(0, 0.79, 0);
    this.bodyGroup.add(skirt);

    const thighGeo = new THREE.CapsuleGeometry(0.055, 0.3, 8, 12);
    const shinGeo = new THREE.CapsuleGeometry(0.043, 0.3, 8, 12);
    const bootCuffGeo = new THREE.CylinderGeometry(0.049, 0.045, 0.165, 12);
    const footGeo = new THREE.CapsuleGeometry(0.039, 0.095, 8, 10);
    footGeo.rotateX(Math.PI / 2);
    footGeo.scale(0.95, 0.72, 1.1);

    const legPivots = [this.leftLegPivot, this.rightLegPivot];
    const kneePivots = [this.leftKneePivot, this.rightKneePivot];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const lp = legPivots[i];
      const kp = kneePivots[i];
      lp.position.set(side * 0.084, 0.86, 0);

      const thigh = new THREE.Mesh(thighGeo, p.skinMat);
      thigh.position.set(0, -0.18, 0);
      lp.add(thigh);

      kp.position.set(0, -0.37, 0);
      const shin = new THREE.Mesh(shinGeo, p.skinMat);
      shin.position.set(0, -0.16, 0);
      kp.add(shin);

      const bootCuff = new THREE.Mesh(bootCuffGeo, p.bootMat);
      bootCuff.position.set(0, -0.31, 0);
      kp.add(bootCuff);

      const foot = new THREE.Mesh(footGeo, p.bootMat);
      foot.position.set(0, -0.455, -0.04);
      kp.add(foot);

      lp.add(kp);
      this.bodyGroup.add(lp);
    }

    this.torsoPivot.position.set(0, 0.94, 0);
    this.bodyGroup.add(this.torsoPivot);

    buildTailoredTorso(p, this.torsoPivot, this.disposables);

    const shoulderGeo = new THREE.SphereGeometry(0.048, 10, 10);
    const upperArmGeo = new THREE.CapsuleGeometry(0.039, 0.21, 8, 10);
    const cuffGeo = new THREE.CylinderGeometry(0.037, 0.035, 0.038, 10);
    const forearmGeo = new THREE.CapsuleGeometry(0.031, 0.19, 8, 10);
    const handGeo = new THREE.SphereGeometry(0.032, 10, 8);
    handGeo.scale(0.82, 1.1, 0.72);

    const armPivots = [this.leftArmPivot, this.rightArmPivot];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const ap = armPivots[i];
      ap.position.set(side * 0.162, 0.31, 0);

      const shoulder = new THREE.Mesh(shoulderGeo, p.jacketMat);
      ap.add(shoulder);

      const upperArm = new THREE.Mesh(upperArmGeo, p.jacketMat);
      upperArm.position.set(side * 0.01, -0.12, 0);
      upperArm.rotation.z = side * 0.08;
      ap.add(upperArm);

      const cuff = new THREE.Mesh(cuffGeo, p.jacketTrimMat);
      cuff.position.set(side * 0.018, -0.225, -0.005);
      ap.add(cuff);

      const forearm = new THREE.Mesh(forearmGeo, p.skinMat);
      forearm.position.set(side * 0.022, -0.34, -0.02);
      forearm.rotation.x = -0.12;
      ap.add(forearm);

      const hand = new THREE.Mesh(handGeo, p.skinMat);
      hand.position.set(side * 0.026, -0.46, -0.035);
      ap.add(hand);

      this.torsoPivot.add(ap);
    }

    this.headPivot = buildHeadAndHair(p);
    this.headPivot.position.set(0, 0.482, -0.005);
    this.torsoPivot.add(this.headPivot);

    // Companion Lightsaber sub-rig attached cleanly to right hand
    const hiltGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.18, 8);
    const bladeGeo = new THREE.CylinderGeometry(0.011, 0.012, 0.72, 8);
    const glowGeo = new THREE.CylinderGeometry(0.024, 0.026, 0.74, 8);
    this.saberBladeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    this.saberGlowMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.38,
      toneMapped: false,
    });
    const hiltMesh = new THREE.Mesh(hiltGeo, p.bootMat);
    const bladeMesh = new THREE.Mesh(bladeGeo, this.saberBladeMat);
    bladeMesh.position.set(0, 0.44, 0);
    const glowMesh = new THREE.Mesh(glowGeo, this.saberGlowMat);
    glowMesh.position.set(0, 0.44, 0);
    this.saberGroup.add(hiltMesh, bladeMesh, glowMesh);
    this.saberGroup.position.set(0.026, -0.46, -0.055);
    this.saberGroup.rotation.set(Math.PI * 0.42, 0, -0.14);
    this.saberGroup.visible = false;
    this.rightArmPivot.add(this.saberGroup);

    this.disposables.push(
      pelvisGeo,
      skirtGeo,
      thighGeo,
      shinGeo,
      bootCuffGeo,
      footGeo,
      shoulderGeo,
      upperArmGeo,
      cuffGeo,
      forearmGeo,
      handGeo,
      hiltGeo,
      bladeGeo,
      glowGeo,
      this.saberBladeMat,
      this.saberGlowMat,
    );
  }

  public setLightsaberColor(colorHex: string): void {
    this.saberBladeMat.color.set(colorHex);
    this.saberGlowMat.color.set(colorHex);
  }

  public update(
    elapsed: number,
    delta: number,
    moveSpeed: number,
    visible: boolean,
    pose: CompanionPose = 'walk',
    defending = false,
  ): void {
    this.group.visible = visible;
    this.saberGroup.visible = visible && defending && pose === 'walk';
    if (!visible) return;

    if (pose === 'sit') {
      this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, 0, 10, delta);
      this.bodyGroup.position.y = THREE.MathUtils.damp(this.bodyGroup.position.y, -0.39, 10, delta);
      this.bodyGroup.position.z = THREE.MathUtils.damp(this.bodyGroup.position.z, 0, 10, delta);
      this.torsoPivot.rotation.z = THREE.MathUtils.damp(this.torsoPivot.rotation.z, 0, 8, delta);
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 1.42, 10, delta);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 1.42, 10, delta);
      this.leftKneePivot.rotation.x = THREE.MathUtils.damp(this.leftKneePivot.rotation.x, -1.42, 10, delta);
      this.rightKneePivot.rotation.x = THREE.MathUtils.damp(this.rightKneePivot.rotation.x, -1.42, 10, delta);
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0.68, 10, delta);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, 0.68, 10, delta);
      this.leftArmPivot.rotation.z = THREE.MathUtils.damp(this.leftArmPivot.rotation.z, 0.14, 10, delta);
      this.rightArmPivot.rotation.z = THREE.MathUtils.damp(this.rightArmPivot.rotation.z, -0.14, 10, delta);
      this.torsoPivot.rotation.x = THREE.MathUtils.damp(
        this.torsoPivot.rotation.x,
        0.06 + Math.sin(elapsed * 1.5) * 0.015,
        8,
        delta,
      );
      this.headPivot.rotation.y = THREE.MathUtils.damp(
        this.headPivot.rotation.y,
        Math.sin(elapsed * 0.45) * 0.12,
        6,
        delta,
      );
      this.headPivot.rotation.x = THREE.MathUtils.damp(
        this.headPivot.rotation.x,
        -0.05 + Math.sin(elapsed * 0.7) * 0.025,
        6,
        delta,
      );
      this.headPivot.rotation.z = THREE.MathUtils.damp(this.headPivot.rotation.z, 0.03, 6, delta);
      return;
    }

    if (pose === 'lie') {
      this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, -Math.PI * 0.48, 8, delta);
      this.bodyGroup.position.y = THREE.MathUtils.damp(this.bodyGroup.position.y, 0.69, 8, delta);
      this.bodyGroup.position.z = THREE.MathUtils.damp(this.bodyGroup.position.z, 0.34, 8, delta);
      this.torsoPivot.rotation.z = THREE.MathUtils.damp(this.torsoPivot.rotation.z, 0, 8, delta);
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0.08, 8, delta);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0.12, 8, delta);
      this.leftKneePivot.rotation.x = THREE.MathUtils.damp(this.leftKneePivot.rotation.x, -0.14, 8, delta);
      this.rightKneePivot.rotation.x = THREE.MathUtils.damp(this.rightKneePivot.rotation.x, -0.18, 8, delta);
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0.12, 8, delta);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, 0.08, 8, delta);
      this.leftArmPivot.rotation.z = THREE.MathUtils.damp(this.leftArmPivot.rotation.z, -0.14, 8, delta);
      this.rightArmPivot.rotation.z = THREE.MathUtils.damp(this.rightArmPivot.rotation.z, 0.14, 8, delta);
      this.torsoPivot.rotation.x = THREE.MathUtils.damp(
        this.torsoPivot.rotation.x,
        Math.sin(elapsed * 1.2) * 0.014,
        6,
        delta,
      );
      this.headPivot.rotation.y = THREE.MathUtils.damp(
        this.headPivot.rotation.y,
        -0.55 + Math.sin(elapsed * 0.4) * 0.06,
        5,
        delta,
      );
      this.headPivot.rotation.x = THREE.MathUtils.damp(this.headPivot.rotation.x, 0.08, 5, delta);
      this.headPivot.rotation.z = THREE.MathUtils.damp(this.headPivot.rotation.z, -0.1, 5, delta);
      return;
    }

    // Default 'walk' pose
    this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, 0, 12, delta);
    this.bodyGroup.position.z = THREE.MathUtils.damp(this.bodyGroup.position.z, 0, 12, delta);
    this.leftArmPivot.rotation.z = THREE.MathUtils.damp(this.leftArmPivot.rotation.z, 0.04, 10, delta);
    this.rightArmPivot.rotation.z = THREE.MathUtils.damp(this.rightArmPivot.rotation.z, -0.04, 10, delta);
    this.headPivot.rotation.z = THREE.MathUtils.damp(this.headPivot.rotation.z, Math.sin(elapsed * 0.45) * 0.03, 8, delta);

    const isMoving = moveSpeed > 0.25;
    if (isMoving) {
      this.walkCycle += delta * (4.8 + moveSpeed * 0.85);
      const swing = Math.sin(this.walkCycle) * 0.42;
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, swing, 12, delta);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, -swing, 12, delta);
      this.leftKneePivot.rotation.x = THREE.MathUtils.damp(
        this.leftKneePivot.rotation.x,
        Math.min(0, -swing * 0.45),
        12,
        delta,
      );
      this.rightKneePivot.rotation.x = THREE.MathUtils.damp(
        this.rightKneePivot.rotation.x,
        Math.min(0, swing * 0.45),
        12,
        delta,
      );
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, -swing * 0.68, 12, delta);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
        this.rightArmPivot.rotation.x,
        defending ? -1.45 + Math.sin(elapsed * 11.5) * 0.52 : swing * 0.68,
        14,
        delta,
      );
      this.bodyGroup.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.032;
      this.torsoPivot.rotation.x = THREE.MathUtils.damp(this.torsoPivot.rotation.x, defending ? 0.1 : 0.04, 8, delta);
      this.torsoPivot.rotation.z = THREE.MathUtils.damp(
        this.torsoPivot.rotation.z,
        Math.cos(this.walkCycle) * 0.028,
        10,
        delta,
      );
    } else {
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0, 10, delta);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0, 10, delta);
      this.leftKneePivot.rotation.x = THREE.MathUtils.damp(this.leftKneePivot.rotation.x, 0, 10, delta);
      this.rightKneePivot.rotation.x = THREE.MathUtils.damp(this.rightKneePivot.rotation.x, 0, 10, delta);
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0, 10, delta);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
        this.rightArmPivot.rotation.x,
        defending ? -1.42 + Math.sin(elapsed * 10.5) * 0.6 : 0,
        12,
        delta,
      );
      this.bodyGroup.position.y = THREE.MathUtils.damp(this.bodyGroup.position.y, 0, 10, delta);
      this.torsoPivot.rotation.x = THREE.MathUtils.damp(
        this.torsoPivot.rotation.x,
        Math.sin(elapsed * 1.8) * 0.012,
        6,
        delta,
      );
      this.torsoPivot.rotation.z = THREE.MathUtils.damp(this.torsoPivot.rotation.z, 0, 8, delta);
    }

    this.headPivot.rotation.y = THREE.MathUtils.damp(
      this.headPivot.rotation.y,
      Math.sin(elapsed * 0.65) * 0.1,
      8,
      delta,
    );
    this.headPivot.rotation.x = THREE.MathUtils.damp(
      this.headPivot.rotation.x,
      Math.sin(elapsed * 0.9) * 0.03,
      8,
      delta,
    );
  }

  public applyRpgOutfit(
    torsoHex = '#ebe4d7',
    trimHex = '#d7cebe',
    legsHex = '#161926',
    accentHex = '#fde68a',
  ): void {
    this.palette.jacketMat.color.set(torsoHex);
    this.palette.jacketTrimMat.color.set(trimHex);
    this.palette.skirtMat.color.set(legsHex);
    this.palette.bootMat.color.set(legsHex).multiplyScalar(0.85);
    this.palette.jewelryMat.color.set(accentHex);
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
