import * as THREE from 'three';

const FACE_PHOTO_URL =
  (typeof window !== 'undefined' &&
    (window as unknown as { __COMPANION_FACE_DATA_URI__?: string }).__COMPANION_FACE_DATA_URI__) ||
  '/assets/aistudio/1791008464301_391386f9.jpg';

function paintFallbackFace(ctx: CanvasRenderingContext2D): void {
  const skinGrad = ctx.createRadialGradient(256, 250, 40, 256, 256, 270);
  skinGrad.addColorStop(0, '#e8c2ab');
  skinGrad.addColorStop(0.65, '#dab097');
  skinGrad.addColorStop(1, '#c6987e');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#6f533c';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(218, 215);
  ctx.quadraticCurveTo(231, 208, 244, 214);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(294, 215);
  ctx.quadraticCurveTo(281, 208, 268, 214);
  ctx.stroke();

  for (const ex of [231, 281]) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(ex, 232, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b948e';
    ctx.beginPath();
    ctx.arc(ex, 232, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ex, 232, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#c8737f';
  ctx.beginPath();
  ctx.ellipse(256, 298, 14, 5, 0, 0, Math.PI * 2);
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
      off.width = 256;
      off.height = 256;
      const octx = off.getContext('2d')!;

      // Include forehead, eyebrows, eyes, nose, cheeks, and smile cleanly
      const sx = w * 0.235;
      const sy = h * 0.215;
      const sw = w * 0.51;
      const sh = h * 0.465;
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);

      // Sample cheek/forehead skin tone from the decoded photo for seamless sphere wrap
      let skinCenter = 'rgb(223,192,170)';
      let skinMid = 'rgb(207,166,141)';
      let skinEdge = 'rgb(186,142,116)';
      try {
        const sample = octx.getImageData(72, 146, 16, 16).data;
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
        skinCenter = `rgb(${Math.min(255, r + 8)},${Math.min(255, g + 6)},${Math.min(255, b + 5)})`;
        skinMid = `rgb(${r},${g},${b})`;
        skinEdge = `rgb(${Math.max(0, r - 20)},${Math.max(0, g - 22)},${Math.max(0, b - 22)})`;
      } catch {
        // Fallback warm skin palette if image data cannot be read
      }

      const baseGrad = ctx.createRadialGradient(256, 252, 30, 256, 256, 260);
      baseGrad.addColorStop(0, skinCenter);
      baseGrad.addColorStop(0.55, skinMid);
      baseGrad.addColorStop(1, skinEdge);
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Wide elliptical feather mask keeping forehead, brows, and eyes at full opacity
      octx.globalCompositeOperation = 'destination-in';
      const maskGrad = octx.createRadialGradient(128, 122, 82, 128, 126, 124);
      maskGrad.addColorStop(0, 'rgba(0,0,0,1)');
      maskGrad.addColorStop(0.68, 'rgba(0,0,0,0.95)');
      maskGrad.addColorStop(0.9, 'rgba(0,0,0,0.42)');
      maskGrad.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = maskGrad;
      octx.fillRect(0, 0, 256, 256);

      // Equirectangular aspect compensation on SphereGeometry, positioned cleanly across front face
      ctx.drawImage(off, 256 - 58, 256 - 120, 116, 244);
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
  jacketMat: THREE.MeshPhysicalMaterial;
  topMat: THREE.MeshStandardMaterial;
  skirtMat: THREE.MeshStandardMaterial;
  bootMat: THREE.MeshPhysicalMaterial;
  jewelryMat: THREE.MeshPhysicalMaterial;
  disposables: { dispose: () => void }[];
}

function createCompanionPalette(maxAnisotropy: number): CompanionPalette {
  const faceHandle = acquireSharedFaceTexture(maxAnisotropy);
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdab097,
    roughness: 0.58,
    metalness: 0.02,
  });
  const headFaceMat = new THREE.MeshStandardMaterial({
    map: faceHandle.texture,
    roughness: 0.55,
    metalness: 0.02,
  });
  // Warm ash-blonde / light chestnut matching the reference portrait
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x9b7c58,
    roughness: 0.44,
    metalness: 0.08,
  });
  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: 0xb7966e,
    roughness: 0.38,
    metalness: 0.1,
  });
  // Light cream-beige jacket & black top matching the photo
  const jacketMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6dfd3,
    roughness: 0.5,
    metalness: 0.06,
    clearcoat: 0.14,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x14161e,
    roughness: 0.74,
    metalness: 0.06,
  });
  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x151824,
    roughness: 0.65,
    metalness: 0.12,
  });
  const bootMat = new THREE.MeshPhysicalMaterial({
    color: 0x10131c,
    roughness: 0.32,
    metalness: 0.25,
    clearcoat: 0.45,
  });
  const jewelryMat = new THREE.MeshPhysicalMaterial({
    color: 0xfde68a,
    roughness: 0.18,
    metalness: 0.92,
  });

  return {
    skinMat,
    headFaceMat,
    hairMat,
    hairHighlightMat,
    jacketMat,
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
      jacketMat,
      topMat,
      skirtMat,
      bootMat,
      jewelryMat,
    ],
  };
}

function buildHeadAndHair(p: CompanionPalette): THREE.Group {
  const headPivot = new THREE.Group();

  const headGeo = new THREE.SphereGeometry(0.102, 28, 24);
  headGeo.scale(0.92, 1.07, 0.96);
  const head = new THREE.Mesh(headGeo, p.headFaceMat);
  head.rotation.y = Math.PI / 2;
  headPivot.add(head);

  const crownGeo = new THREE.SphereGeometry(0.106, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
  crownGeo.scale(0.97, 1.06, 1.02);
  const crown = new THREE.Mesh(crownGeo, p.hairMat);
  crown.position.set(0, 0.026, 0.028);
  crown.rotation.x = 0.48;
  headPivot.add(crown);

  // Back hair waterfall cascading past neck & shoulders
  const backHairGeo = new THREE.CylinderGeometry(
    0.105,
    0.138,
    0.36,
    18,
    1,
    false,
    -Math.PI * 0.56,
    Math.PI * 1.12,
  );
  const backHair = new THREE.Mesh(backHairGeo, p.hairMat);
  backHair.rotation.y = Math.PI;
  backHair.position.set(0, -0.11, 0.044);
  backHair.rotation.x = 0.12;
  headPivot.add(backHair);

  // Side-parted straight hair framing upper temples without covering forehead or brows
  const partLeftGeo = new THREE.SphereGeometry(0.06, 12, 10);
  partLeftGeo.scale(0.78, 0.44, 0.68);
  const partLeft = new THREE.Mesh(partLeftGeo, p.hairHighlightMat);
  partLeft.position.set(-0.058, 0.09, -0.022);
  partLeft.rotation.z = 0.56;
  partLeft.rotation.y = 0.28;
  headPivot.add(partLeft);

  const partRight = new THREE.Mesh(partLeftGeo, p.hairHighlightMat);
  partRight.position.set(0.062, 0.088, -0.02);
  partRight.rotation.z = -0.56;
  partRight.rotation.y = -0.28;
  headPivot.add(partRight);

  // Long straight locks falling neatly beside cheeks and over jacket lapels
  const lockGeo = new THREE.CapsuleGeometry(0.032, 0.28, 8, 10);
  for (const side of [-1, 1]) {
    const sideLock = new THREE.Mesh(lockGeo, side < 0 ? p.hairHighlightMat : p.hairMat);
    sideLock.position.set(side * 0.095, -0.1, -0.022);
    sideLock.rotation.z = side * 0.1;
    sideLock.rotation.x = -0.12;
    headPivot.add(sideLock);

    const backSideLock = new THREE.Mesh(lockGeo, p.hairMat);
    backSideLock.position.set(side * 0.09, -0.13, 0.036);
    backSideLock.rotation.z = side * 0.08;
    headPivot.add(backSideLock);
  }

  p.disposables.push(headGeo, crownGeo, backHairGeo, partLeftGeo, lockGeo);
  return headPivot;
}

export class BlondePassengerRig {
  public readonly group = new THREE.Group();
  private torsoPivot = new THREE.Group();
  private headPivot: THREE.Group;
  private disposables: { dispose: () => void }[] = [];

  private nextGlanceTime = 3.2;
  private glanceDuration = 0;
  private glanceTarget = 0;

  constructor(maxAnisotropy: number) {
    const p = createCompanionPalette(maxAnisotropy);
    this.disposables.push(...p.disposables);

    const pelvisGeo = new THREE.SphereGeometry(0.145, 16, 12);
    pelvisGeo.scale(1.12, 0.72, 0.96);
    const pelvis = new THREE.Mesh(pelvisGeo, p.skirtMat);
    pelvis.position.set(0, 0.46, 0.02);
    this.group.add(pelvis);

    const skirtGeo = new THREE.CylinderGeometry(0.14, 0.175, 0.22, 18);
    skirtGeo.rotateX(Math.PI / 2 - 0.18);
    const skirt = new THREE.Mesh(skirtGeo, p.skirtMat);
    skirt.position.set(0, 0.45, -0.09);
    this.group.add(skirt);

    const thighGeo = new THREE.CapsuleGeometry(0.066, 0.26, 8, 12);
    thighGeo.rotateX(Math.PI / 2);
    const calfGeo = new THREE.CapsuleGeometry(0.048, 0.27, 8, 12);
    const bootGeo = new THREE.BoxGeometry(0.088, 0.068, 0.17);

    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(thighGeo, p.skinMat);
      thigh.position.set(side * 0.082, 0.455, -0.17);
      thigh.rotation.x = 0.08;
      thigh.rotation.y = side * -0.04;
      this.group.add(thigh);

      const kneeGeo = new THREE.SphereGeometry(0.056, 10, 10);
      const knee = new THREE.Mesh(kneeGeo, p.skinMat);
      knee.position.set(side * 0.088, 0.44, -0.33);
      this.group.add(knee);
      this.disposables.push(kneeGeo);

      const calf = new THREE.Mesh(calfGeo, p.skinMat);
      calf.position.set(side * 0.088, 0.3, -0.37);
      calf.rotation.x = -0.22;
      this.group.add(calf);

      const bootCuffGeo = new THREE.CylinderGeometry(0.054, 0.05, 0.14, 12);
      const bootCuff = new THREE.Mesh(bootCuffGeo, p.bootMat);
      bootCuff.position.set(side * 0.088, 0.24, -0.39);
      bootCuff.rotation.x = -0.22;
      this.group.add(bootCuff);
      this.disposables.push(bootCuffGeo);

      const foot = new THREE.Mesh(bootGeo, p.bootMat);
      foot.position.set(side * 0.088, 0.195, -0.44);
      this.group.add(foot);
    }
    this.disposables.push(pelvisGeo, skirtGeo, thighGeo, calfGeo, bootGeo);

    this.torsoPivot.position.set(0, 0.5, 0.04);
    this.torsoPivot.rotation.x = 0.16;
    this.group.add(this.torsoPivot);

    const waistGeo = new THREE.CylinderGeometry(0.105, 0.125, 0.2, 16);
    const waist = new THREE.Mesh(waistGeo, p.topMat);
    waist.scale.set(1.12, 1, 0.78);
    waist.position.set(0, 0.1, 0);
    this.torsoPivot.add(waist);

    const chestGeo = new THREE.SphereGeometry(0.132, 16, 14);
    chestGeo.scale(1.12, 1.05, 0.78);
    const chest = new THREE.Mesh(chestGeo, p.topMat);
    chest.position.set(0, 0.25, -0.01);
    this.torsoPivot.add(chest);

    const jacketBackGeo = new THREE.CylinderGeometry(
      0.135,
      0.118,
      0.28,
      16,
      1,
      false,
      -Math.PI * 0.42,
      Math.PI * 1.84,
    );
    const jacketBack = new THREE.Mesh(jacketBackGeo, p.jacketMat);
    jacketBack.scale.set(1.18, 1, 0.84);
    jacketBack.rotation.y = Math.PI * 0.5;
    jacketBack.position.set(0, 0.21, 0.015);
    this.torsoPivot.add(jacketBack);

    const lapelGeo = new THREE.BoxGeometry(0.055, 0.25, 0.035);
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(lapelGeo, p.jacketMat);
      lapel.position.set(side * 0.075, 0.22, -0.095);
      lapel.rotation.y = side * 0.26;
      lapel.rotation.z = side * -0.12;
      this.torsoPivot.add(lapel);
    }

    const upperArmGeo = new THREE.CapsuleGeometry(0.042, 0.2, 8, 10);
    const forearmGeo = new THREE.CapsuleGeometry(0.034, 0.19, 8, 10);
    const handGeo = new THREE.SphereGeometry(0.036, 10, 8);
    handGeo.scale(0.85, 0.65, 1.25);

    for (const side of [-1, 1]) {
      const shoulderGeo = new THREE.SphereGeometry(0.052, 10, 10);
      const shoulder = new THREE.Mesh(shoulderGeo, p.jacketMat);
      shoulder.position.set(side * 0.165, 0.32, 0.01);
      this.torsoPivot.add(shoulder);
      this.disposables.push(shoulderGeo);

      const upperArm = new THREE.Mesh(upperArmGeo, p.jacketMat);
      upperArm.position.set(side * 0.18, 0.2, -0.02);
      upperArm.rotation.x = -0.35;
      upperArm.rotation.z = side * -0.12;
      this.torsoPivot.add(upperArm);

      const forearm = new THREE.Mesh(forearmGeo, p.skinMat);
      forearm.position.set(side * 0.145, 0.07, -0.12);
      forearm.rotation.x = -1.18;
      forearm.rotation.z = side * 0.32;
      this.torsoPivot.add(forearm);

      const hand = new THREE.Mesh(handGeo, p.skinMat);
      hand.position.set(side * 0.078, 0.01, -0.21);
      this.torsoPivot.add(hand);
    }

    const neckGeo = new THREE.CylinderGeometry(0.042, 0.048, 0.11, 14);
    const neck = new THREE.Mesh(neckGeo, p.skinMat);
    neck.position.set(0, 0.4, 0.005);
    this.torsoPivot.add(neck);

    this.disposables.push(
      waistGeo,
      chestGeo,
      jacketBackGeo,
      lapelGeo,
      upperArmGeo,
      forearmGeo,
      handGeo,
      neckGeo,
    );

    this.headPivot = buildHeadAndHair(p);
    this.headPivot.position.set(0, 0.48, -0.005);
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
  ): void {
    this.group.visible = visible;
    if (!visible) return;

    const breath = Math.sin(elapsed * 1.85);
    this.torsoPivot.position.y = 0.5 + breath * 0.0035;
    this.torsoPivot.rotation.x = 0.16 - breath * 0.008;

    const leanZ = THREE.MathUtils.clamp(
      steerAngle * 0.065 * Math.min(1, speedKmh / 45),
      -0.07,
      0.07,
    );
    this.torsoPivot.rotation.z = THREE.MathUtils.damp(this.torsoPivot.rotation.z, leanZ, 6, delta);

    let targetHeadYaw = Math.sin(elapsed * 0.42) * 0.07;
    let targetHeadPitch = -0.14 + Math.sin(elapsed * 0.55) * 0.025;
    let targetHeadRoll = Math.sin(elapsed * 0.35) * 0.03;

    if (driverLookingAtMe) {
      targetHeadYaw = 1.42;
      targetHeadPitch = -0.04;
      targetHeadRoll = 0.05;
    } else {
      if (elapsed >= this.nextGlanceTime) {
        if (this.glanceDuration <= 0) {
          this.glanceDuration = 2.2 + Math.sin(elapsed * 1.3) * 0.5;
          this.glanceTarget = 0.48;
        }
        this.glanceDuration -= delta;
        if (this.glanceDuration <= 0) {
          this.glanceTarget = 0;
          this.nextGlanceTime = elapsed + 7 + (Math.sin(elapsed * 2.7) + 1) * 3.5;
        }
      }
      if (this.glanceTarget > 0) {
        targetHeadYaw = this.glanceTarget;
        targetHeadRoll = 0.05;
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
  private disposables: { dispose: () => void }[] = [];
  private walkCycle = 0;

  constructor(maxAnisotropy: number) {
    const p = createCompanionPalette(maxAnisotropy);
    this.disposables.push(...p.disposables);

    this.group.add(this.bodyGroup);

    const pelvisGeo = new THREE.SphereGeometry(0.135, 16, 12);
    pelvisGeo.scale(1.08, 0.72, 0.88);
    const pelvis = new THREE.Mesh(pelvisGeo, p.skirtMat);
    pelvis.position.set(0, 0.9, 0);
    this.bodyGroup.add(pelvis);

    const skirtGeo = new THREE.CylinderGeometry(0.125, 0.18, 0.28, 18);
    const skirt = new THREE.Mesh(skirtGeo, p.skirtMat);
    skirt.position.set(0, 0.79, 0);
    this.bodyGroup.add(skirt);

    const thighGeo = new THREE.CapsuleGeometry(0.056, 0.3, 8, 12);
    const shinGeo = new THREE.CapsuleGeometry(0.044, 0.3, 8, 12);
    const bootCuffGeo = new THREE.CylinderGeometry(0.05, 0.046, 0.16, 12);
    const footGeo = new THREE.BoxGeometry(0.084, 0.065, 0.175);

    const legPivots = [this.leftLegPivot, this.rightLegPivot];
    const kneePivots = [this.leftKneePivot, this.rightKneePivot];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const lp = legPivots[i];
      const kp = kneePivots[i];
      lp.position.set(side * 0.085, 0.86, 0);

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
      foot.position.set(0, -0.455, -0.035);
      kp.add(foot);

      lp.add(kp);
      this.bodyGroup.add(lp);
    }

    this.torsoPivot.position.set(0, 0.94, 0);
    this.bodyGroup.add(this.torsoPivot);

    const waistGeo = new THREE.CylinderGeometry(0.102, 0.12, 0.2, 16);
    const waist = new THREE.Mesh(waistGeo, p.topMat);
    waist.scale.set(1.1, 1, 0.76);
    waist.position.set(0, 0.1, 0);
    this.torsoPivot.add(waist);

    const chestGeo = new THREE.SphereGeometry(0.128, 16, 14);
    chestGeo.scale(1.12, 1.04, 0.78);
    const chest = new THREE.Mesh(chestGeo, p.topMat);
    chest.position.set(0, 0.24, -0.008);
    this.torsoPivot.add(chest);

    const jacketBackGeo = new THREE.CylinderGeometry(
      0.132,
      0.114,
      0.27,
      16,
      1,
      false,
      -Math.PI * 0.42,
      Math.PI * 1.84,
    );
    const jacketBack = new THREE.Mesh(jacketBackGeo, p.jacketMat);
    jacketBack.scale.set(1.16, 1, 0.82);
    jacketBack.rotation.y = Math.PI * 0.5;
    jacketBack.position.set(0, 0.21, 0.012);
    this.torsoPivot.add(jacketBack);

    const lapelGeo = new THREE.BoxGeometry(0.052, 0.24, 0.032);
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(lapelGeo, p.jacketMat);
      lapel.position.set(side * 0.072, 0.22, -0.09);
      lapel.rotation.y = side * 0.24;
      this.torsoPivot.add(lapel);
    }

    const upperArmGeo = new THREE.CapsuleGeometry(0.04, 0.21, 8, 10);
    const forearmGeo = new THREE.CapsuleGeometry(0.032, 0.19, 8, 10);
    const handGeo = new THREE.SphereGeometry(0.034, 10, 8);
    handGeo.scale(0.82, 1.1, 0.72);

    const armPivots = [this.leftArmPivot, this.rightArmPivot];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const ap = armPivots[i];
      ap.position.set(side * 0.165, 0.31, 0);

      const shoulderGeo = new THREE.SphereGeometry(0.048, 10, 10);
      const shoulder = new THREE.Mesh(shoulderGeo, p.jacketMat);
      ap.add(shoulder);
      this.disposables.push(shoulderGeo);

      const upperArm = new THREE.Mesh(upperArmGeo, p.jacketMat);
      upperArm.position.set(side * 0.01, -0.12, 0);
      upperArm.rotation.z = side * 0.08;
      ap.add(upperArm);

      const forearm = new THREE.Mesh(forearmGeo, p.skinMat);
      forearm.position.set(side * 0.022, -0.34, -0.02);
      forearm.rotation.x = -0.12;
      ap.add(forearm);

      const hand = new THREE.Mesh(handGeo, p.skinMat);
      hand.position.set(side * 0.026, -0.46, -0.035);
      ap.add(hand);

      this.torsoPivot.add(ap);
    }

    const neckGeo = new THREE.CylinderGeometry(0.04, 0.046, 0.1, 14);
    const neck = new THREE.Mesh(neckGeo, p.skinMat);
    neck.position.set(0, 0.39, 0);
    this.torsoPivot.add(neck);

    this.headPivot = buildHeadAndHair(p);
    this.headPivot.position.set(0, 0.48, -0.005);
    this.torsoPivot.add(this.headPivot);

    this.disposables.push(
      pelvisGeo,
      skirtGeo,
      thighGeo,
      shinGeo,
      bootCuffGeo,
      footGeo,
      waistGeo,
      chestGeo,
      jacketBackGeo,
      lapelGeo,
      upperArmGeo,
      forearmGeo,
      handGeo,
      neckGeo,
    );
  }

  public update(
    elapsed: number,
    delta: number,
    moveSpeed: number,
    visible: boolean,
    pose: CompanionPose = 'walk',
  ): void {
    this.group.visible = visible;
    if (!visible) return;

    if (pose === 'sit') {
      this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, 0, 10, delta);
      this.bodyGroup.position.y = THREE.MathUtils.damp(this.bodyGroup.position.y, -0.39, 10, delta);
      this.bodyGroup.position.z = THREE.MathUtils.damp(this.bodyGroup.position.z, 0, 10, delta);
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
      // Lying relaxed on back on bed (head toward -Z pillow, turning warmly toward player beside her on -X)
      this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, -Math.PI * 0.48, 8, delta);
      this.bodyGroup.position.y = THREE.MathUtils.damp(this.bodyGroup.position.y, 0.69, 8, delta);
      this.bodyGroup.position.z = THREE.MathUtils.damp(this.bodyGroup.position.z, 0.34, 8, delta);
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
      // Turn head gently toward partner on the right side of the bed
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
    this.leftArmPivot.rotation.z = THREE.MathUtils.damp(this.leftArmPivot.rotation.z, 0, 10, delta);
    this.rightArmPivot.rotation.z = THREE.MathUtils.damp(this.rightArmPivot.rotation.z, 0, 10, delta);
    this.headPivot.rotation.z = THREE.MathUtils.damp(this.headPivot.rotation.z, 0, 8, delta);

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
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, -swing * 0.72, 12, delta);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, swing * 0.72, 12, delta);
      this.bodyGroup.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.035;
      this.torsoPivot.rotation.x = THREE.MathUtils.damp(this.torsoPivot.rotation.x, 0.04, 8, delta);
    } else {
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0, 10, delta);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0, 10, delta);
      this.leftKneePivot.rotation.x = THREE.MathUtils.damp(this.leftKneePivot.rotation.x, 0, 10, delta);
      this.rightKneePivot.rotation.x = THREE.MathUtils.damp(this.rightKneePivot.rotation.x, 0, 10, delta);
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0, 10, delta);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, 0, 10, delta);
      this.bodyGroup.position.y = THREE.MathUtils.damp(this.bodyGroup.position.y, 0, 10, delta);
      this.torsoPivot.rotation.x = THREE.MathUtils.damp(
        this.torsoPivot.rotation.x,
        Math.sin(elapsed * 1.8) * 0.012,
        6,
        delta,
      );
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

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
