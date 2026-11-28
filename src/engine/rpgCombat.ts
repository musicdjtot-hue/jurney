import * as THREE from 'three';
import type { BuildingFootprint } from './physics';
import type { LootAutoCollectSettings, RpgItem, RpgRarity, RpgWeaponKind } from '../types/simulation';

export interface CombatCallbacks {
  onPlayerDamaged: (rawDamage: number, attackerLabel: string) => void;
  onEnemyDefeated: (kind: 'gopnik' | 'rally' | 'police' | 'boss' | 'monster', x: number, y: number, z: number) => void;
  onPoliceCleared: (reason: 'defeated' | 'escaped' | 'hidden') => void;
  onSaberPickupClaimed: () => void;
  onGopnikTaunt: (line: string) => void;
  onRallyShout?: (line: string) => void;
  onLootCollected?: (item: RpgItem | null, coins: number) => void;
}

interface HumanNpcActor {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  signMesh?: THREE.Mesh;
  signPivot?: THREE.Group;
  active: boolean;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  z: number;
  floorY: number;
  yaw: number;
  attackCooldown: number;
  knockedOut: boolean;
  knockTimer: number;
  vx: number;
  vy: number;
  vz: number;
  phase: number;
}

interface BoltSlot {
  mesh: THREE.Mesh;
  active: boolean;
  fromPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  damage: number;
}

interface LootBagSlot {
  group: THREE.Group;
  sackMat: THREE.MeshStandardMaterial;
  glowMat: THREE.MeshBasicMaterial;
  active: boolean;
  x: number;
  y: number;
  z: number;
  floorY: number;
  rarity: RpgRarity;
  item: RpgItem | null;
  coins: number;
  life: number;
  phase: number;
}

const GOPNIK_TAUNTS = [
  'Гопник: «Эй, братан, мелочь на проезд найдётся?»',
  'Гопник: «Чё по сторонам смотришь? Поясни за район!»',
  'Гопник: «Слышь, стоять! Мы тут гуляем вообще-то!»',
];

const RALLY_SHOUTS = [
  'Митинг в парке: «Свободу Навальному!»',
  'Толпа с плакатами: «Свободу Навальному! Мы не уйдём!»',
  'Участники митинга: «Свободу Навальному!»',
];

const _boltForward = new THREE.Vector3(0, 0, 1);
const _boltTargetDir = new THREE.Vector3();

export class RpgCombatSystem {
  public readonly worldGroup = new THREE.Group();
  public readonly heldWeaponGroup = new THREE.Group();

  private blasterRig = new THREE.Group();
  private blasterTipMesh!: THREE.Mesh;
  private blasterTipMat: THREE.MeshBasicMaterial;
  private saberRig = new THREE.Group();
  private saberBladeMat: THREE.MeshBasicMaterial;
  private saberGlowMat: THREE.MeshBasicMaterial;
  private attackSwingTimer = 0;
  private activeWeaponKind: RpgWeaponKind = 'blaster';
  private weaponHolstered = false;

  private gopniks: HumanNpcActor[] = [];
  private rallyCrowd: HumanNpcActor[] = [];
  private policeOfficers: HumanNpcActor[] = [];
  private bountyBoss!: HumanNpcActor;
  private bossRingMesh!: THREE.Mesh;
  private bossRingMat!: THREE.MeshBasicMaterial;
  private bossSpawnedKey: string | null = null;
  private bossDefeated = false;

  // Giant Planet Monster Boss (3400 HP, ~4.6m tall)
  private planetMonster!: {
    group: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    head: THREE.Group;
    coreMesh: THREE.Mesh;
    coreMat: THREE.MeshBasicMaterial;
    auraRing: THREE.Mesh;
    auraMat: THREE.MeshBasicMaterial;
    active: boolean;
    hp: number;
    maxHp: number;
    x: number;
    y: number;
    z: number;
    floorY: number;
    attackCooldown: number;
    knockedOut: boolean;
    knockTimer: number;
    vx: number;
    vy: number;
    vz: number;
    key: string | null;
    defeated: boolean;
  };

  private passengerNpc!: HumanNpcActor;
  private roadsideNpc!: HumanNpcActor;

  private lootPouches: LootBagSlot[] = [];

  private policeCarGroup = new THREE.Group();
  private policeCarActive = false;
  private policeCarX = 0;
  private policeCarZ = 0;
  private policeCarYaw = 0;
  private policeBarRedMat: THREE.MeshBasicMaterial;
  private policeBarBlueMat: THREE.MeshBasicMaterial;

  private saberBeaconGroup = new THREE.Group();
  private saberBeaconBladeMat: THREE.MeshBasicMaterial;
  private saberBeaconActive = false;
  private saberBeaconX = 0;
  private saberBeaconZ = 0;

  private bolts: BoltSlot[] = [];
  private playerBoltMat: THREE.MeshBasicMaterial;
  private enemyBoltMat: THREE.MeshBasicMaterial;

  public policeWanted = false;
  public policeHideTimer = 0;
  public rallyTotalCount = 10;
  public rallySpawnedCenter: { x: number; z: number } | null = null;
  private rallyCompleted = false;
  private rallyShoutTimer = 1.5;

  private disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.worldGroup);

    // 1. First-person Held Weapon Rig (attached to camera by engine)
    this.heldWeaponGroup.position.set(0.28, -0.25, -0.44);
    this.heldWeaponGroup.visible = false;

    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.78 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.28, metalness: 0.84 });
    this.blasterTipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    this.saberBladeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    this.saberGlowMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.35,
      toneMapped: false,
    });

    // Blaster sub-rig
    const gripGeo = new THREE.BoxGeometry(0.042, 0.11, 0.055);
    const barrelGeo = new THREE.BoxGeometry(0.048, 0.052, 0.24);
    const tipGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.045, 8);
    tipGeo.rotateX(Math.PI / 2);

    const grip = new THREE.Mesh(gripGeo, handleMat);
    grip.position.set(0, -0.04, 0.04);
    grip.rotation.x = 0.24;
    const barrel = new THREE.Mesh(barrelGeo, bodyMat);
    barrel.position.set(0, 0.02, -0.04);
    const tip = new THREE.Mesh(tipGeo, this.blasterTipMat);
    tip.position.set(0, 0.02, -0.175);
    this.blasterTipMesh = tip;
    this.blasterRig.add(grip, barrel, tip);
    this.heldWeaponGroup.add(this.blasterRig);

    // Lightsaber sub-rig
    const hiltGeo = new THREE.CylinderGeometry(0.021, 0.024, 0.22, 10);
    const emitterGeo = new THREE.CylinderGeometry(0.027, 0.022, 0.04, 10);
    const bladeGeo = new THREE.CylinderGeometry(0.012, 0.013, 0.72, 8);
    const glowGeo = new THREE.CylinderGeometry(0.028, 0.03, 0.74, 8);

    const hilt = new THREE.Mesh(hiltGeo, bodyMat);
    const emitter = new THREE.Mesh(emitterGeo, handleMat);
    emitter.position.set(0, 0.125, 0);
    const blade = new THREE.Mesh(bladeGeo, this.saberBladeMat);
    blade.position.set(0, 0.5, 0);
    const glow = new THREE.Mesh(glowGeo, this.saberGlowMat);
    glow.position.set(0, 0.5, 0);

    this.saberRig.add(hilt, emitter, blade, glow);
    this.saberRig.rotation.set(-0.38, 0.14, 0.26);
    this.saberRig.visible = false;
    this.heldWeaponGroup.add(this.saberRig);

    this.disposables.push(
      handleMat,
      bodyMat,
      this.blasterTipMat,
      this.saberBladeMat,
      this.saberGlowMat,
      gripGeo,
      barrelGeo,
      tipGeo,
      hiltGeo,
      emitterGeo,
      bladeGeo,
      glowGeo,
    );

    // 2. Pooled Human NPC Builder (shared unit geometries)
    const torsoGeo = new THREE.BoxGeometry(0.46, 0.58, 0.26);
    const stripeGeo = new THREE.BoxGeometry(0.48, 0.055, 0.27);
    const headGeo = new THREE.SphereGeometry(0.145, 10, 8);
    const capGeo = new THREE.CylinderGeometry(0.14, 0.155, 0.075, 10);
    const armGeo = new THREE.BoxGeometry(0.13, 0.46, 0.13);
    const legGeo = new THREE.BoxGeometry(0.17, 0.62, 0.17);
    const signPoleGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.05, 6);
    const signBoardGeo = new THREE.BoxGeometry(0.78, 0.44, 0.045);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdcb49a, roughness: 0.6 });
    const darkTrackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.72 });
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const darkPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
    const policeBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.52 });
    const policeBadgeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, toneMapped: false });
    const bossArmorMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.3, metalness: 0.72 });
    const bossTrimMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, toneMapped: false });
    const passengerCoatMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.58 });
    const roadsideCoatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });

    const createActor = (
      style: 'gopnik' | 'rally' | 'police' | 'boss' | 'passenger' | 'roadside',
      index: number,
    ): HumanNpcActor => {
      const g = new THREE.Group();
      g.visible = false;

      const jacketMat =
        style === 'gopnik'
          ? darkTrackMat
          : style === 'police'
            ? policeBlueMat
            : style === 'boss'
              ? bossArmorMat
              : style === 'passenger'
                ? passengerCoatMat
                : style === 'roadside'
                  ? roadsideCoatMat
                  : new THREE.MeshStandardMaterial({
                      color: [0x334155, 0x991b1b, 0x065f46, 0x92400e, 0x3730a3][index % 5],
                      roughness: 0.72,
                    });
      if (style === 'rally') this.disposables.push(jacketMat);

      const torso = new THREE.Mesh(torsoGeo, jacketMat);
      torso.position.set(0, 0.94, 0);
      g.add(torso);

      if (style === 'gopnik') {
        const s1 = new THREE.Mesh(stripeGeo, whiteStripeMat);
        s1.position.set(0, 1.08, 0);
        const s2 = new THREE.Mesh(stripeGeo, whiteStripeMat);
        s2.position.set(0, 0.96, 0);
        g.add(s1, s2);
      } else if (style === 'police') {
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.03), policeBadgeMat);
        badge.position.set(0.11, 1.05, -0.14);
        g.add(badge);
        this.disposables.push(badge.geometry);
      } else if (style === 'boss') {
        g.scale.setScalar(1.24);
        const crest = new THREE.Mesh(stripeGeo, bossTrimMat);
        crest.position.set(0, 1.12, 0);
        g.add(crest);
        const ringGeoB = new THREE.TorusGeometry(0.68, 0.045, 6, 20);
        ringGeoB.rotateX(Math.PI / 2);
        this.bossRingMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, toneMapped: false });
        this.bossRingMesh = new THREE.Mesh(ringGeoB, this.bossRingMat);
        this.bossRingMesh.position.set(0, 0.05, 0);
        g.add(this.bossRingMesh);
        this.disposables.push(ringGeoB, this.bossRingMat);
      }

      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.set(0, 1.4, 0);
      g.add(head);

      if (style === 'gopnik' || style === 'police' || style === 'boss') {
        const cap = new THREE.Mesh(
          capGeo,
          style === 'police' ? policeBlueMat : style === 'boss' ? bossTrimMat : darkPantsMat,
        );
        cap.position.set(0, 1.51, -0.01);
        g.add(cap);
      }

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.3, 1.15, 0);
      const laMesh = new THREE.Mesh(armGeo, jacketMat);
      laMesh.position.set(0, -0.2, 0);
      leftArm.add(laMesh);
      g.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.3, 1.15, 0);
      const raMesh = new THREE.Mesh(armGeo, jacketMat);
      raMesh.position.set(0, -0.2, 0);
      rightArm.add(raMesh);

      let signMesh: THREE.Mesh | undefined;
      let signPivot: THREE.Group | undefined;
      if (style === 'rally') {
        const bgColors = ['#fef3c7', '#fee2e2', '#e0f2fe'];
        const slogans = ['СВОБОДУ!', 'МЫ ВМЕСТЕ!', 'ПРАВДА!'];
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 144;
        const ctx = canvas.getContext('2d');
        let signMat: THREE.MeshStandardMaterial;
        if (ctx) {
          ctx.fillStyle = bgColors[index % bgColors.length];
          ctx.fillRect(0, 0, 256, 144);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 10;
          ctx.strokeRect(5, 5, 246, 134);
          ctx.fillStyle = '#991b1b';
          ctx.font = 'bold 34px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(slogans[index % slogans.length], 128, 72);
          const signTex = new THREE.CanvasTexture(canvas);
          signTex.colorSpace = THREE.SRGBColorSpace;
          signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.72 });
          this.disposables.push(signTex, signMat);
        } else {
          signMat = new THREE.MeshStandardMaterial({
            color: index % 3 === 0 ? 0xfef3c7 : index % 3 === 1 ? 0xfee2e2 : 0xe0f2fe,
            roughness: 0.78,
          });
          this.disposables.push(signMat);
        }
        signPivot = new THREE.Group();
        signPivot.position.set(0, -0.42, -0.02);
        const pole = new THREE.Mesh(signPoleGeo, darkPantsMat);
        pole.position.set(0, 0.44, 0);
        const board = new THREE.Mesh(signBoardGeo, signMat);
        board.position.set(0, 1.05, 0);
        signPivot.add(pole, board);
        rightArm.add(signPivot);
        signMesh = board;
      }
      g.add(rightArm);

      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.12, 0.62, 0);
      const llMesh = new THREE.Mesh(legGeo, darkPantsMat);
      llMesh.position.set(0, -0.31, 0);
      leftLeg.add(llMesh);
      g.add(leftLeg);

      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.12, 0.62, 0);
      const rlMesh = new THREE.Mesh(legGeo, darkPantsMat);
      rlMesh.position.set(0, -0.31, 0);
      rightLeg.add(rlMesh);
      g.add(rightLeg);

      this.worldGroup.add(g);
      return {
        group: g,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        signMesh,
        signPivot,
        active: false,
        hp: 45,
        maxHp: 45,
        x: 0,
        y: 0,
        z: 0,
        floorY: 0,
        yaw: 0,
        attackCooldown: 0,
        knockedOut: false,
        knockTimer: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        phase: index * 1.17,
      };
    };

    for (let i = 0; i < 3; i++) this.gopniks.push(createActor('gopnik', i));
    for (let i = 0; i < 10; i++) this.rallyCrowd.push(createActor('rally', i));
    for (let i = 0; i < 3; i++) this.policeOfficers.push(createActor('police', i));
    this.bountyBoss = createActor('boss', 0);
    this.passengerNpc = createActor('passenger', 0);
    this.roadsideNpc = createActor('roadside', 0);

    // 2a. Build Giant Planet Monster Boss (pooled once)
    const mGroup = new THREE.Group();
    mGroup.visible = false;
    const mArmorMat = new THREE.MeshStandardMaterial({ color: 0x1e1b24, roughness: 0.42, metalness: 0.68 });
    const mPlateMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.35, metalness: 0.45 });
    const mCoreMat = new THREE.MeshBasicMaterial({ color: 0xf97316, toneMapped: false });
    const mEyeMat = new THREE.MeshBasicMaterial({ color: 0xfde047, toneMapped: false });
    const mAuraMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.8, toneMapped: false });

    const mTorsoGeo = new THREE.BoxGeometry(1.9, 2.0, 1.25);
    const mTorso = new THREE.Mesh(mTorsoGeo, mArmorMat);
    mTorso.position.set(0, 2.35, 0);
    const mChestPlateGeo = new THREE.BoxGeometry(2.12, 0.72, 1.38);
    const mChestPlate = new THREE.Mesh(mChestPlateGeo, mPlateMat);
    mChestPlate.position.set(0, 2.75, 0);
    const mCoreGeo = new THREE.SphereGeometry(0.42, 14, 12);
    const mCoreMesh = new THREE.Mesh(mCoreGeo, mCoreMat);
    mCoreMesh.position.set(0, 2.48, -0.56);

    const mLegGeo = new THREE.BoxGeometry(0.62, 1.45, 0.68);
    for (const side of [-1, 1]) {
      const mLeg = new THREE.Mesh(mLegGeo, mArmorMat);
      mLeg.position.set(side * 0.56, 0.72, 0);
      mGroup.add(mLeg);
    }

    const mHeadPivot = new THREE.Group();
    mHeadPivot.position.set(0, 3.65, -0.08);
    const mHeadGeo = new THREE.BoxGeometry(0.92, 0.82, 0.88);
    const mHeadMesh = new THREE.Mesh(mHeadGeo, mArmorMat);
    const mHornGeo = new THREE.ConeGeometry(0.18, 0.78, 8);
    const mEyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(mHornGeo, mPlateMat);
      horn.position.set(side * 0.42, 0.55, 0);
      horn.rotation.z = side * -0.38;
      const eye = new THREE.Mesh(mEyeGeo, mEyeMat);
      eye.position.set(side * 0.22, 0.08, -0.44);
      mHeadPivot.add(horn, eye);
    }
    mHeadPivot.add(mHeadMesh);

    const mArmGeo = new THREE.BoxGeometry(0.56, 1.78, 0.58);
    const mClawGeo = new THREE.ConeGeometry(0.24, 0.55, 6);
    const buildMonsterArm = (side: number) => {
      const ap = new THREE.Group();
      ap.position.set(side * 1.32, 3.05, 0);
      const armMesh = new THREE.Mesh(mArmGeo, mPlateMat);
      armMesh.position.set(0, -0.78, 0);
      const clawMesh = new THREE.Mesh(mClawGeo, mCoreMat);
      clawMesh.position.set(0, -1.75, -0.08);
      clawMesh.rotation.x = Math.PI;
      ap.add(armMesh, clawMesh);
      mGroup.add(ap);
      return ap;
    };
    const mLeftArm = buildMonsterArm(-1);
    const mRightArm = buildMonsterArm(1);

    const mAuraGeo = new THREE.TorusGeometry(2.55, 0.11, 8, 32);
    mAuraGeo.rotateX(Math.PI / 2);
    const mAuraRing = new THREE.Mesh(mAuraGeo, mAuraMat);
    mAuraRing.position.set(0, 0.08, 0);

    mGroup.add(mTorso, mChestPlate, mCoreMesh, mHeadPivot, mAuraRing);
    this.worldGroup.add(mGroup);

    this.planetMonster = {
      group: mGroup,
      leftArm: mLeftArm,
      rightArm: mRightArm,
      head: mHeadPivot,
      coreMesh: mCoreMesh,
      coreMat: mCoreMat,
      auraRing: mAuraRing,
      auraMat: mAuraMat,
      active: false,
      hp: 8400,
      maxHp: 8400,
      x: 0,
      y: 0,
      z: 0,
      floorY: 0,
      attackCooldown: 1.5,
      knockedOut: false,
      knockTimer: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      key: null,
      defeated: false,
    };

    this.disposables.push(
      torsoGeo,
      stripeGeo,
      headGeo,
      capGeo,
      armGeo,
      legGeo,
      signPoleGeo,
      signBoardGeo,
      skinMat,
      darkTrackMat,
      whiteStripeMat,
      darkPantsMat,
      policeBlueMat,
      policeBadgeMat,
      bossArmorMat,
      bossTrimMat,
      passengerCoatMat,
      roadsideCoatMat,
      mArmorMat,
      mPlateMat,
      mCoreMat,
      mEyeMat,
      mAuraMat,
      mTorsoGeo,
      mChestPlateGeo,
      mCoreGeo,
      mLegGeo,
      mHeadGeo,
      mHornGeo,
      mEyeGeo,
      mArmGeo,
      mClawGeo,
      mAuraGeo,
    );

    // 2b. Pooled Ground Loot Pouches (16 slots: white common, blue epic, larger glowing purple legendary/unique)
    const sackGeo = new THREE.SphereGeometry(0.22, 10, 8);
    sackGeo.scale(1.0, 0.85, 1.0);
    const neckGeo = new THREE.ConeGeometry(0.11, 0.14, 8);
    neckGeo.rotateX(Math.PI);
    const lootRingGeo = new THREE.TorusGeometry(0.32, 0.032, 6, 18);
    lootRingGeo.rotateX(Math.PI / 2);
    this.disposables.push(sackGeo, neckGeo, lootRingGeo);

    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      g.visible = false;
      const sackMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x94a3b8,
        emissiveIntensity: 0.4,
        roughness: 0.45,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      });
      const sack = new THREE.Mesh(sackGeo, sackMat);
      sack.position.set(0, 0.2, 0);
      const neck = new THREE.Mesh(neckGeo, sackMat);
      neck.position.set(0, 0.36, 0);
      const ring = new THREE.Mesh(lootRingGeo, glowMat);
      ring.position.set(0, 0.04, 0);
      g.add(sack, neck, ring);
      this.worldGroup.add(g);
      this.disposables.push(sackMat, glowMat);
      this.lootPouches.push({
        group: g,
        sackMat,
        glowMat,
        active: false,
        x: 0,
        y: 0,
        z: 0,
        floorY: 0,
        rarity: 'common',
        item: null,
        coins: 0,
        life: 0,
        phase: i * 0.7,
      });
    }

    // 3. Police Patrol Cruiser (zero extra PointLights!)
    this.policeCarGroup.visible = false;
    const pHullGeo = new THREE.BoxGeometry(2.05, 0.68, 4.5);
    const pCabGeo = new THREE.BoxGeometry(1.75, 0.58, 2.2);
    const pDoorStripeGeo = new THREE.BoxGeometry(2.08, 0.56, 1.55);
    const pWheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
    pWheelGeo.rotateZ(Math.PI / 2);
    const pLightBarGeo = new THREE.BoxGeometry(0.55, 0.14, 0.28);

    const pBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.32, metalness: 0.65 });
    const pWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.36, metalness: 0.25 });
    this.policeBarRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444, toneMapped: false });
    this.policeBarBlueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false });

    const pHull = new THREE.Mesh(pHullGeo, pBlackMat);
    pHull.position.set(0, 0.62, 0);
    const pDoor = new THREE.Mesh(pDoorStripeGeo, pWhiteMat);
    pDoor.position.set(0, 0.65, 0);
    const pCab = new THREE.Mesh(pCabGeo, pWhiteMat);
    pCab.position.set(0, 1.2, 0.1);
    const barR = new THREE.Mesh(pLightBarGeo, this.policeBarRedMat);
    barR.position.set(-0.3, 1.56, 0.1);
    const barB = new THREE.Mesh(pLightBarGeo, this.policeBarBlueMat);
    barB.position.set(0.3, 1.56, 0.1);
    this.policeCarGroup.add(pHull, pDoor, pCab, barR, barB);

    for (const [wx, wz] of [
      [-0.98, -1.35],
      [0.98, -1.35],
      [-0.98, 1.35],
      [0.98, 1.35],
    ]) {
      const w = new THREE.Mesh(pWheelGeo, pBlackMat);
      w.position.set(wx, 0.36, wz);
      this.policeCarGroup.add(w);
    }
    this.worldGroup.add(this.policeCarGroup);
    this.disposables.push(
      pHullGeo,
      pCabGeo,
      pDoorStripeGeo,
      pWheelGeo,
      pLightBarGeo,
      pBlackMat,
      pWhiteMat,
      this.policeBarRedMat,
      this.policeBarBlueMat,
    );

    // 4. Planetary Lightsaber Pickup Beacon
    this.saberBeaconGroup.visible = false;
    const pedGeo = new THREE.CylinderGeometry(0.95, 1.2, 0.3, 16);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 });
    const ringGeo = new THREE.TorusGeometry(1.1, 0.07, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    this.saberBeaconBladeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, toneMapped: false });

    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(0, 0.15, 0);
    const ring = new THREE.Mesh(ringGeo, this.saberBeaconBladeMat);
    ring.position.set(0, 0.34, 0);
    const floatHilt = new THREE.Mesh(hiltGeo, bodyMat);
    floatHilt.position.set(0, 1.35, 0);
    floatHilt.rotation.z = 0.22;
    const floatBlade = new THREE.Mesh(bladeGeo, this.saberBeaconBladeMat);
    floatBlade.position.set(-0.11, 1.82, 0);
    floatBlade.rotation.z = 0.22;

    this.saberBeaconGroup.add(ped, ring, floatHilt, floatBlade);
    this.worldGroup.add(this.saberBeaconGroup);
    this.disposables.push(pedGeo, pedMat, ringGeo, this.saberBeaconBladeMat);

    // 5. Pooled Blaster Bolts (20 slots)
    const boltGeo = new THREE.BoxGeometry(0.08, 0.08, 0.72);
    this.playerBoltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    this.enemyBoltMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, toneMapped: false });
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(boltGeo, this.playerBoltMat);
      m.visible = false;
      this.worldGroup.add(m);
      this.bolts.push({
        mesh: m,
        active: false,
        fromPlayer: true,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        damage: 15,
      });
    }
    this.disposables.push(boltGeo, this.playerBoltMat, this.enemyBoltMat);
  }

  public setWeaponHolstered(holstered: boolean): void {
    this.weaponHolstered = holstered;
  }

  public getBlasterMuzzleWorldPos(out: THREE.Vector3): boolean {
    if (!this.heldWeaponGroup.visible || !this.blasterRig.visible) return false;
    this.heldWeaponGroup.updateMatrixWorld(true);
    this.blasterTipMesh.getWorldPosition(out);
    return true;
  }

  public syncPlayerWeapon(kind: RpgWeaponKind, colorHex: string): void {
    this.activeWeaponKind = kind;
    this.blasterRig.visible = kind === 'blaster';
    this.saberRig.visible = kind === 'lightsaber';
    this.blasterTipMat.color.set(colorHex);
    this.saberBladeMat.color.set(colorHex);
    this.saberGlowMat.color.set(colorHex);
    this.playerBoltMat.color.set(colorHex);
  }

  public spawnLootPouch(
    x: number,
    z: number,
    item: RpgItem | null,
    coins: number,
    floorY = 0,
  ): void {
    const rarity: RpgRarity = item ? item.rarity : 'common';
    for (let i = 0; i < this.lootPouches.length; i++) {
      const p = this.lootPouches[i];
      if (p.active) continue;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.9;
      p.z = z + (Math.random() - 0.5) * 0.9;
      p.floorY = floorY;
      p.y = floorY;
      p.rarity = rarity;
      p.item = item;
      p.coins = coins;
      p.life = 90;

      if (rarity === 'mythic') {
        p.sackMat.color.set('#f97316');
        p.sackMat.emissive.set('#fb923c');
        p.sackMat.emissiveIntensity = 1.85;
        p.glowMat.color.set('#fde047');
        p.group.scale.setScalar(1.7);
      } else if (rarity === 'legendary') {
        p.sackMat.color.set('#a855f7');
        p.sackMat.emissive.set('#c084fc');
        p.sackMat.emissiveIntensity = item?.isUnique ? 1.4 : 0.95;
        p.glowMat.color.set('#e879f9');
        p.group.scale.setScalar(item?.isUnique ? 1.52 : 1.35);
      } else if (rarity === 'epic') {
        p.sackMat.color.set('#0284c7');
        p.sackMat.emissive.set('#38bdf8');
        p.sackMat.emissiveIntensity = 0.72;
        p.glowMat.color.set('#7dd3fc');
        p.group.scale.setScalar(1.12);
      } else {
        p.sackMat.color.set('#f8fafc');
        p.sackMat.emissive.set('#cbd5e1');
        p.sackMat.emissiveIntensity = 0.35;
        p.glowMat.color.set('#ffffff');
        p.group.scale.setScalar(0.96);
      }

      p.group.position.set(p.x, p.y, p.z);
      p.group.visible = true;
      return;
    }
  }

  public clearLootPouches(): void {
    for (const p of this.lootPouches) {
      p.active = false;
      p.item = null;
      p.group.visible = false;
    }
  }

  public spawnGopnikTrio(playerX: number, playerZ: number, heading: number, floorY = 0): void {
    const baseAngle = heading;
    for (let i = 0; i < this.gopniks.length; i++) {
      const g = this.gopniks[i];
      const angle = baseAngle + (i - 1) * 0.58;
      const dist = 16 + i * 2.5;
      g.active = true;
      g.knockedOut = false;
      g.knockTimer = 0;
      g.hp = 42;
      g.maxHp = 42;
      g.x = playerX - Math.sin(angle) * dist;
      g.floorY = floorY;
      g.y = floorY;
      g.z = playerZ - Math.cos(angle) * dist;
      g.attackCooldown = 1.2 + i * 0.45;
      g.group.visible = true;
      g.group.position.set(g.x, floorY, g.z);
      g.group.rotation.set(0, 0, 0);
    }
  }

  public ensureRallyAt(x: number, z: number): void {
    if (this.rallyCompleted) return;
    if (
      this.rallySpawnedCenter &&
      Math.hypot(this.rallySpawnedCenter.x - x, this.rallySpawnedCenter.z - z) < 12
    ) {
      return;
    }
    this.rallySpawnedCenter = { x, z };
    for (let i = 0; i < this.rallyCrowd.length; i++) {
      const a = this.rallyCrowd[i];
      const ang = (i / this.rallyCrowd.length) * Math.PI * 2 + (i % 2) * 0.22;
      const rad = 3.2 + (i % 3) * 2.6;
      a.active = true;
      a.knockedOut = false;
      a.knockTimer = 0;
      a.hp = 24;
      a.maxHp = 24;
      a.x = x + Math.cos(ang) * rad;
      a.floorY = 0;
      a.y = 0;
      a.z = z + Math.sin(ang) * rad;
      a.yaw = Math.atan2(-Math.cos(ang), -Math.sin(ang));
      a.group.visible = true;
      a.group.position.set(a.x, 0, a.z);
      a.group.rotation.set(0, a.yaw, 0);
    }
  }

  public resetRallyForNewQuest(): void {
    this.rallyCompleted = false;
    this.rallySpawnedCenter = null;
    for (const r of this.rallyCrowd) {
      r.active = false;
      r.group.visible = false;
    }
  }

  public ensureBountyBossAt(questKey: string, x: number, z: number): void {
    if (this.bossDefeated && this.bossSpawnedKey === questKey) return;
    if (this.bossSpawnedKey === questKey && this.bountyBoss.active) return;

    this.bossSpawnedKey = questKey;
    this.bossDefeated = false;
    const b = this.bountyBoss;
    b.active = true;
    b.knockedOut = false;
    b.knockTimer = 0;
    b.hp = 5200;
    b.maxHp = 5200;
    b.x = x;
    b.floorY = 0;
    b.y = 0;
    b.z = z;
    b.attackCooldown = 1.3;
    b.group.visible = true;
    b.group.position.set(x, 0, z);
    b.group.rotation.set(0, 0, 0);
  }

  public clearBountyBoss(): void {
    this.bossSpawnedKey = null;
    this.bossDefeated = false;
    this.bountyBoss.active = false;
    this.bountyBoss.group.visible = false;
  }

  public isBountyBossAlive(): boolean {
    return this.bountyBoss.active && !this.bountyBoss.knockedOut;
  }

  public getBountyBossHp(): { hp: number; maxHp: number } {
    return {
      hp: Math.max(0, Math.round(this.bountyBoss.hp)),
      maxHp: this.bountyBoss.maxHp,
    };
  }

  public ensurePlanetMonsterAt(key: string, x: number, z: number): void {
    if (this.planetMonster.defeated && this.planetMonster.key === key) return;
    if (this.planetMonster.key === key && this.planetMonster.active) return;
    const m = this.planetMonster;
    m.key = key;
    m.defeated = false;
    m.active = true;
    m.knockedOut = false;
    m.knockTimer = 0;
    m.maxHp = 8400;
    m.hp = 8400;
    m.x = x;
    m.floorY = 0;
    m.y = 0;
    m.z = z;
    m.attackCooldown = 1.5;
    m.group.visible = true;
    m.group.position.set(x, 0, z);
    m.group.rotation.set(0, 0, 0);
  }

  public clearPlanetMonster(): void {
    this.planetMonster.key = null;
    this.planetMonster.defeated = false;
    this.planetMonster.active = false;
    this.planetMonster.group.visible = false;
  }

  public isPlanetMonsterAlive(): boolean {
    return this.planetMonster.active && !this.planetMonster.knockedOut;
  }

  public getPlanetMonsterHp(): { hp: number; maxHp: number } {
    return {
      hp: Math.max(0, Math.round(this.planetMonster.hp)),
      maxHp: this.planetMonster.maxHp,
    };
  }

  public getPlanetMonsterPos(): { x: number; z: number } | null {
    if (!this.isPlanetMonsterAlive()) return null;
    return { x: this.planetMonster.x, z: this.planetMonster.z };
  }

  public setSaberBeacon(active: boolean, x = 0, z = 0, colorHex = '#a855f7'): void {
    this.saberBeaconActive = active;
    this.saberBeaconX = x;
    this.saberBeaconZ = z;
    this.saberBeaconGroup.visible = active;
    if (active) {
      this.saberBeaconGroup.position.set(x, 0, z);
      this.saberBeaconBladeMat.color.set(colorHex);
    }
  }

  public setPassengerNpc(
    visible: boolean,
    x = 0,
    y = 0,
    z = 0,
    yaw = 0,
    moveSpeed = 0,
    elapsed = 0,
  ): void {
    const p = this.passengerNpc;
    p.active = visible;
    p.group.visible = visible;
    if (!visible) return;
    p.x = x;
    p.y = y;
    p.z = z;
    p.group.position.set(x, y, z);
    p.group.rotation.set(0, yaw, 0);
    if (moveSpeed > 0.15) {
      const swing = Math.sin(elapsed * 7.5) * 0.45;
      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
      p.leftArm.rotation.x = -swing * 0.6;
      p.rightArm.rotation.x = swing * 0.6;
    } else {
      p.leftLeg.rotation.x = 0;
      p.rightLeg.rotation.x = 0;
      p.leftArm.rotation.x = 0;
      p.rightArm.rotation.x = Math.sin(elapsed * 2.4) * 0.08;
    }
  }

  public setRoadsideNpc(
    visible: boolean,
    x = 0,
    y = 0,
    z = 0,
    yaw = 0,
    moveSpeed = 0,
    elapsed = 0,
  ): void {
    const r = this.roadsideNpc;
    r.active = visible;
    r.group.visible = visible;
    if (!visible) return;
    r.x = x;
    r.y = y;
    r.z = z;
    r.group.position.set(x, y, z);
    r.group.rotation.set(0, yaw, 0);
    if (moveSpeed > 0.15) {
      const swing = Math.sin(elapsed * 7.5) * 0.45;
      r.leftLeg.rotation.x = swing;
      r.rightLeg.rotation.x = -swing;
      r.leftArm.rotation.x = -swing * 0.55;
      r.rightArm.rotation.x = swing * 0.55;
    } else {
      r.leftLeg.rotation.x = 0;
      r.rightLeg.rotation.x = 0;
      r.leftArm.rotation.x = 0;
      r.rightArm.rotation.x = -0.35 + Math.sin(elapsed * 2.2) * 0.1;
    }
  }

  public triggerPoliceAlert(incidentX: number, incidentZ: number): void {
    if (this.policeWanted) return;
    this.policeWanted = true;
    this.policeHideTimer = 0;

    const spawnAngle = Math.random() * Math.PI * 2;
    this.policeCarX = incidentX + Math.sin(spawnAngle) * 34;
    this.policeCarZ = incidentZ + Math.cos(spawnAngle) * 34;
    this.policeCarYaw = Math.atan2(this.policeCarX - incidentX, this.policeCarZ - incidentZ);
    this.policeCarActive = true;
    this.policeCarGroup.visible = true;
    this.policeCarGroup.position.set(this.policeCarX, 0, this.policeCarZ);
    this.policeCarGroup.rotation.y = this.policeCarYaw;

    const count = Math.random() < 0.5 ? 2 : 3;
    const offsets = [-2.5, 2.5, 0];
    for (let i = 0; i < this.policeOfficers.length; i++) {
      const o = this.policeOfficers[i];
      if (i >= count) {
        o.active = false;
        o.group.visible = false;
        continue;
      }
      o.active = true;
      o.knockedOut = false;
      o.knockTimer = 0;
      o.hp = 54;
      o.maxHp = 54;
      o.x = this.policeCarX + offsets[i];
      o.floorY = 0;
      o.y = 0;
      o.z = this.policeCarZ + (i === 2 ? -2.2 : 1.5);
      o.attackCooldown = 1.4 + i * 0.55;
      o.group.visible = true;
      o.group.position.set(o.x, 0, o.z);
      o.group.rotation.set(0, 0, 0);
    }
  }

  public clearAllEncounters(clearPolice = true): void {
    for (const g of this.gopniks) {
      g.active = false;
      g.group.visible = false;
    }
    if (clearPolice) {
      this.policeWanted = false;
      this.policeHideTimer = 0;
      this.policeCarActive = false;
      this.policeCarGroup.visible = false;
      for (const o of this.policeOfficers) {
        o.active = false;
        o.group.visible = false;
      }
    }
    for (const b of this.bolts) {
      b.active = false;
      b.mesh.visible = false;
    }
  }

  public getNearestHostileThreat(
    x: number,
    z: number,
  ): { kind: 'gopnik' | 'police' | 'boss' | 'monster'; x: number; z: number; dist: number } | null {
    let best: { kind: 'gopnik' | 'police' | 'boss' | 'monster'; x: number; z: number; dist: number } | null = null;
    let bestDist = Infinity;
    const check = (a: HumanNpcActor, kind: 'gopnik' | 'police' | 'boss') => {
      if (!a.active || a.knockedOut) return;
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < 28 && d < bestDist) {
        bestDist = d;
        best = { kind, x: a.x, z: a.z, dist: d };
      }
    };
    for (const g of this.gopniks) check(g, 'gopnik');
    for (const o of this.policeOfficers) check(o, 'police');
    check(this.bountyBoss, 'boss');
    if (this.planetMonster.active && !this.planetMonster.knockedOut) {
      const dm = Math.hypot(this.planetMonster.x - x, this.planetMonster.z - z);
      if (dm < 36 && dm < bestDist) {
        bestDist = dm;
        best = { kind: 'monster', x: this.planetMonster.x, z: this.planetMonster.z, dist: dm };
      }
    }
    return best;
  }

  public damageThreatAt(
    x: number,
    z: number,
    radius: number,
    damage: number,
    callbacks: CombatCallbacks,
  ): boolean {
    const tryHit = (a: HumanNpcActor, kind: 'gopnik' | 'police' | 'boss'): boolean => {
      if (!a.active || a.knockedOut) return false;
      const dx = a.x - x;
      const dz = a.z - z;
      const d = Math.hypot(dx, dz);
      if (d > radius) return false;
      a.hp -= damage;
      const invD = 1 / Math.max(0.25, d);
      if (a.hp <= 0) {
        this.knockOutActor(a, dx * invD, dz * invD);
        if (kind === 'boss') this.bossDefeated = true;
        callbacks.onEnemyDefeated(kind, a.x, a.floorY, a.z);
      } else {
        a.x += dx * invD * 0.55;
        a.z += dz * invD * 0.55;
      }
      return true;
    };

    for (const g of this.gopniks) {
      if (tryHit(g, 'gopnik')) return true;
    }
    for (const o of this.policeOfficers) {
      if (tryHit(o, 'police')) return true;
    }
    if (tryHit(this.bountyBoss, 'boss')) return true;

    const m = this.planetMonster;
    if (m.active && !m.knockedOut) {
      const dx = m.x - x;
      const dz = m.z - z;
      const d = Math.hypot(dx, dz);
      if (d <= Math.max(radius, 2.85)) {
        m.hp -= damage;
        if (m.hp <= 0) {
          m.knockedOut = true;
          m.knockTimer = 1.6;
          m.vx = (dx / Math.max(0.4, d)) * 4.2;
          m.vy = 5.4;
          m.vz = (dz / Math.max(0.4, d)) * 4.2;
          m.defeated = true;
          callbacks.onEnemyDefeated('monster', m.x, m.floorY, m.z);
        }
        return true;
      }
    }
    return false;
  }

  public getGopniksActiveCount(): number {
    let n = 0;
    for (const g of this.gopniks) {
      if (g.active && !g.knockedOut) n++;
    }
    return n;
  }

  public getRallyActiveCount(): number {
    let n = 0;
    for (const r of this.rallyCrowd) {
      if (r.active && !r.knockedOut) n++;
    }
    return n;
  }

  public getPoliceAliveCount(): number {
    let n = 0;
    for (const o of this.policeOfficers) {
      if (o.active && !o.knockedOut) n++;
    }
    return n;
  }

  public getPoliceEscapeProgress(): number {
    return this.policeWanted ? THREE.MathUtils.clamp(this.policeHideTimer / 6.0, 0, 1) : 0;
  }

  public getNearbySaberName(): string | null {
    return this.saberBeaconActive ? 'Световой меч' : null;
  }

  public getActiveThreatLabel(): string | null {
    if (this.policeWanted) {
      const alive = this.getPoliceAliveCount();
      return alive > 0 ? `Розыск полиции (${alive} патрульных)` : 'Погоня полиции';
    }
    if (this.isPlanetMonsterAlive()) {
      return `Монстр планеты (${Math.max(1, Math.round(this.planetMonster.hp))} HP)`;
    }
    if (this.isBountyBossAlive()) {
      return `Босс-цель (${Math.max(1, Math.round(this.bountyBoss.hp))} HP)`;
    }
    const gopniks = this.getGopniksActiveCount();
    if (gopniks > 0) {
      return `Гопники нападают (${gopniks})`;
    }
    const rally = this.getRallyActiveCount();
    if (rally > 0 && !this.rallyCompleted) {
      return `Митинг в парке (${rally} участников)`;
    }
    return null;
  }

  private fireBolt(
    fromPlayer: boolean,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    speed: number,
    damage: number,
  ): void {
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      if (b.active) continue;
      b.active = true;
      b.fromPlayer = fromPlayer;
      b.x = ox;
      b.y = oy;
      b.z = oz;
      b.vx = dx * speed;
      b.vy = dy * speed;
      b.vz = dz * speed;
      b.life = 1.65;
      b.damage = damage;
      b.mesh.material = fromPlayer ? this.playerBoltMat : this.enemyBoltMat;
      b.mesh.position.set(ox, oy, oz);
      _boltTargetDir.set(dx, dy, dz).normalize();
      b.mesh.quaternion.setFromUnitVectors(_boltForward, _boltTargetDir);
      b.mesh.visible = true;
      return;
    }
  }

  public performPlayerAttack(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    damage: number,
    weaponKind: RpgWeaponKind,
    callbacks: CombatCallbacks,
    exactOrigin = false,
  ): { hitEnemy: boolean; hitPolice: boolean; hitRally: boolean } {
    this.attackSwingTimer = 0.28;

    let hitEnemy = false;
    let hitPolice = false;
    let hitRally = false;

    if (weaponKind === 'blaster') {
      const sx = exactOrigin ? originX : originX + dirX * 0.55;
      const sy = exactOrigin ? originY : originY - 0.18;
      const sz = exactOrigin ? originZ : originZ + dirZ * 0.55;
      this.fireBolt(true, sx, sy, sz, dirX, dirY, dirZ, 56, damage);
      return { hitEnemy: false, hitPolice: false, hitRally: false };
    }

    // Melee / Lightsaber cleave
    const range = weaponKind === 'lightsaber' ? 4.4 : 2.8;
    const coneWidth = weaponKind === 'lightsaber' ? 2.2 : 1.35;

    const hitActorList = (list: HumanNpcActor[], kind: 'gopnik' | 'rally' | 'police' | 'boss') => {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a.active || a.knockedOut) continue;
        const dx = a.x - originX;
        const dz = a.z - originZ;
        const fwd = dx * dirX + dz * dirZ;
        if (fwd < -0.5 || fwd > range) continue;
        const side = Math.abs(dx * -dirZ + dz * dirX);
        if (side > coneWidth) continue;

        a.hp -= damage;
        hitEnemy = true;
        if (kind === 'police') hitPolice = true;
        if (kind === 'rally') hitRally = true;

        if (a.hp <= 0) {
          this.knockOutActor(a, dirX, dirZ);
          if (kind === 'boss') this.bossDefeated = true;
          callbacks.onEnemyDefeated(kind, a.x, a.floorY, a.z);
          if (kind === 'rally' && this.getRallyActiveCount() === 0) {
            this.rallyCompleted = true;
          }
        } else {
          a.x += dirX * 0.65;
          a.z += dirZ * 0.65;
        }
      }
    };

    hitActorList(this.gopniks, 'gopnik');
    hitActorList(this.rallyCrowd, 'rally');
    hitActorList(this.policeOfficers, 'police');
    hitActorList([this.bountyBoss], 'boss');

    const m = this.planetMonster;
    if (m.active && !m.knockedOut) {
      const dxM = m.x - originX;
      const dzM = m.z - originZ;
      const fwdM = dxM * dirX + dzM * dirZ;
      const sideM = Math.abs(dxM * -dirZ + dzM * dirX);
      if (fwdM >= -0.6 && fwdM <= range + 2.0 && sideM <= coneWidth + 1.65) {
        m.hp -= damage;
        hitEnemy = true;
        if (m.hp <= 0) {
          m.knockedOut = true;
          m.knockTimer = 1.6;
          m.vx = dirX * 4.4;
          m.vy = 5.4;
          m.vz = dirZ * 4.4;
          m.defeated = true;
          callbacks.onEnemyDefeated('monster', m.x, m.floorY, m.z);
        }
      }
    }

    return { hitEnemy, hitPolice, hitRally };
  }

  private knockOutActor(a: HumanNpcActor, dirX: number, dirZ: number): void {
    a.knockedOut = true;
    a.knockTimer = 1.4;
    a.vx = dirX * 5.2;
    a.vy = 4.6;
    a.vz = dirZ * 5.2;
  }

  public update(
    delta: number,
    elapsed: number,
    isWalking: boolean,
    walkSpeed: number,
    insideInterior: boolean,
    inSpaceView: boolean,
    playerX: number,
    playerY: number,
    playerZ: number,
    carX: number,
    carZ: number,
    armorPct: number,
    walkObstacles: BuildingFootprint[],
    callbacks: CombatCallbacks,
    lootAutoCollect?: LootAutoCollectSettings,
  ): void {
    const onSurface = !insideInterior && !inSpaceView;
    this.worldGroup.visible = onSurface;
    this.heldWeaponGroup.visible =
      isWalking &&
      !insideInterior &&
      !inSpaceView &&
      !this.weaponHolstered &&
      this.activeWeaponKind !== 'fists';

    if (this.heldWeaponGroup.visible) {
      if (this.attackSwingTimer > 0) {
        this.attackSwingTimer = Math.max(0, this.attackSwingTimer - delta);
      }
      const p = this.attackSwingTimer / 0.28;
      const swayX = Math.sin(elapsed * 5.5) * (walkSpeed > 0.3 ? 0.016 : 0.004);
      const swayY = Math.cos(elapsed * 11) * (walkSpeed > 0.3 ? 0.012 : 0.003);
      if (this.activeWeaponKind === 'lightsaber') {
        this.heldWeaponGroup.position.set(0.28 + swayX - p * 0.24, -0.25 + swayY, -0.44 - p * 0.14);
        this.heldWeaponGroup.rotation.set(-p * 1.15, p * 0.65, p * 0.45);
      } else {
        this.heldWeaponGroup.position.set(0.27 + swayX, -0.24 + swayY, -0.44 + p * 0.09);
        this.heldWeaponGroup.rotation.set(p * 0.22, 0, 0);
      }
    }

    if (!onSurface) return;

    // 0. Ground Loot Pouches (bob, magnet & auto-collect respecting quality filters)
    for (let i = 0; i < this.lootPouches.length; i++) {
      const p = this.lootPouches[i];
      if (!p.active) continue;
      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        p.item = null;
        p.group.visible = false;
        continue;
      }

      const canAutoCollect = !p.item || !lootAutoCollect || lootAutoCollect[p.item.rarity];
      const checkActive = isWalking || Math.hypot(carX - p.x, carZ - p.z) < 24;
      if (canAutoCollect && checkActive && Math.abs(playerY - p.floorY) < 6.0) {
        const targetX = isWalking ? playerX : carX;
        const targetZ = isWalking ? playerZ : carZ;
        const dx = targetX - p.x;
        const dz = targetZ - p.z;
        const dist = Math.hypot(dx, dz);
        const collectRadius = isWalking ? 2.15 : 12.0;
        const magnetRadius = isWalking ? 5.5 : 24.0;
        if (dist < collectRadius) {
          p.active = false;
          p.group.visible = false;
          const colItem = p.item;
          const colCoins = p.coins;
          p.item = null;
          callbacks.onLootCollected?.(colItem, colCoins);
          continue;
        } else if (dist < magnetRadius) {
          const pull = 14.0 * delta;
          p.x += (dx / dist) * pull;
          p.z += (dz / dist) * pull;
        }
      }

      const bob = Math.sin(elapsed * 3.8 + p.phase) * 0.07;
      p.group.position.set(p.x, p.floorY + 0.04 + bob, p.z);
      p.group.rotation.y = elapsed * 1.8 + p.phase;
    }

    // Beacon animation & pickup check
    if (this.saberBeaconActive) {
      this.saberBeaconGroup.rotation.y = elapsed * 1.3;
      const dxB = playerX - this.saberBeaconX;
      const dzB = playerZ - this.saberBeaconZ;
      if (dxB * dxB + dzB * dzB < 100 && playerY < 8) {
        this.saberBeaconActive = false;
        this.saberBeaconGroup.visible = false;
        callbacks.onSaberPickupClaimed();
      }
    }

    // Update knocked out animations cleanly
    const updateKnocked = (a: HumanNpcActor) => {
      if (!a.active || !a.knockedOut) return false;
      a.knockTimer -= delta;
      a.x += a.vx * delta;
      a.z += a.vz * delta;
      a.vy -= 18 * delta;
      a.y = Math.max(a.floorY, a.y + a.vy * delta);
      a.group.position.set(a.x, a.y, a.z);
      a.group.rotation.x += delta * 6.5;
      if (a.knockTimer <= 0) {
        a.active = false;
        a.group.visible = false;
      }
      return true;
    };

    // 1. Gopniks AI
    for (let i = 0; i < this.gopniks.length; i++) {
      const g = this.gopniks[i];
      if (!g.active) continue;
      if (updateKnocked(g)) continue;

      if (!isWalking) {
        if (Math.hypot(g.x - carX, g.z - carZ) > 38) {
          g.active = false;
          g.group.visible = false;
        }
        continue;
      }

      const dx = playerX - g.x;
      const dz = playerZ - g.z;
      const dist = Math.hypot(dx, dz);
      g.group.rotation.y = Math.atan2(-dx, -dz);

      if (dist > 2.2) {
        const spd = 2.55;
        g.x += (dx / dist) * spd * delta;
        g.z += (dz / dist) * spd * delta;
        const swing = Math.sin(elapsed * 7 + g.phase) * 0.45;
        g.leftLeg.rotation.x = swing;
        g.rightLeg.rotation.x = -swing;
        g.leftArm.rotation.x = -swing * 0.6;
        g.rightArm.rotation.x = swing * 0.6;
      } else {
        g.leftLeg.rotation.x = 0;
        g.rightLeg.rotation.x = 0;
        g.attackCooldown -= delta;
        if (g.attackCooldown <= 0) {
          g.attackCooldown = 1.65;
          g.rightArm.rotation.x = -1.25;
          const raw = 4 + Math.floor(Math.random() * 3);
          const reduced = Math.max(2, Math.round(raw * (1 - armorPct / 100)));
          callbacks.onPlayerDamaged(reduced, 'Гопник');
          if (Math.random() < 0.4) {
            callbacks.onGopnikTaunt(GOPNIK_TAUNTS[i % GOPNIK_TAUNTS.length]);
          }
        } else {
          g.rightArm.rotation.x = THREE.MathUtils.damp(g.rightArm.rotation.x, -0.35, 6, delta);
        }
      }
      g.group.position.set(g.x, g.floorY, g.z);
    }

    // 2. Rally Protesters animation + upright placards ABOVE head
    let activeRallyNear = 0;
    for (let i = 0; i < this.rallyCrowd.length; i++) {
      const r = this.rallyCrowd[i];
      if (!r.active) continue;
      if (updateKnocked(r)) continue;
      activeRallyNear++;
      const wave = Math.sin(elapsed * 5.2 + r.phase);
      r.rightArm.rotation.x = 2.32 + wave * 0.28;
      if (r.signPivot) {
        r.signPivot.rotation.x = -r.rightArm.rotation.x;
      }
      r.leftArm.rotation.x = 0.65 + wave * 0.22;
      r.group.position.set(r.x, Math.abs(wave) * 0.08, r.z);
    }
    if (activeRallyNear > 0 && this.rallySpawnedCenter) {
      const distRally = Math.hypot(playerX - this.rallySpawnedCenter.x, playerZ - this.rallySpawnedCenter.z);
      if (distRally < 44) {
        this.rallyShoutTimer -= delta;
        if (this.rallyShoutTimer <= 0) {
          this.rallyShoutTimer = 4.6;
          const line = RALLY_SHOUTS[Math.floor(Math.random() * RALLY_SHOUTS.length)];
          callbacks.onRallyShout?.(line);
        }
      }
    }

    // 2b. Bounty Boss AI
    if (this.bountyBoss.active) {
      const b = this.bountyBoss;
      if (!updateKnocked(b)) {
        const dx = playerX - b.x;
        const dz = playerZ - b.z;
        const dist = Math.hypot(dx, dz);
        b.group.rotation.y = Math.atan2(-dx, -dz);

        if (isWalking && dist < 38) {
          if (dist > 6.5) {
            const spd = 2.8;
            b.x += (dx / dist) * spd * delta;
            b.z += (dz / dist) * spd * delta;
            const swing = Math.sin(elapsed * 6.5) * 0.42;
            b.leftLeg.rotation.x = swing;
            b.rightLeg.rotation.x = -swing;
          } else {
            b.leftLeg.rotation.x = 0;
            b.rightLeg.rotation.x = 0;
          }
          b.attackCooldown -= delta;
          if (b.attackCooldown <= 0) {
            b.attackCooldown = 1.45;
            b.rightArm.rotation.x = -1.45;
            if (dist < 2.6) {
              const reduced = Math.max(5, Math.round(15 * (1 - armorPct / 100)));
              callbacks.onPlayerDamaged(reduced, 'Босс');
            } else {
              this.fireBolt(false, b.x, 1.5, b.z, dx / dist, 0, dz / dist, 27, 12);
            }
          } else {
            b.rightArm.rotation.x = THREE.MathUtils.damp(b.rightArm.rotation.x, -0.45, 5, delta);
          }
        } else {
          b.leftLeg.rotation.x = 0;
          b.rightLeg.rotation.x = 0;
          b.rightArm.rotation.x = THREE.MathUtils.damp(b.rightArm.rotation.x, 0, 5, delta);
        }
        b.group.position.set(b.x, 0, b.z);
        this.bossRingMesh.rotation.z = elapsed * 2.2;
      }
    }

    // 2c. Giant Planet Monster Boss AI
    if (this.planetMonster.active) {
      const m = this.planetMonster;
      if (m.knockedOut) {
        m.knockTimer -= delta;
        m.x += m.vx * delta;
        m.z += m.vz * delta;
        m.vy -= 18 * delta;
        m.y = Math.max(m.floorY, m.y + m.vy * delta);
        m.group.position.set(m.x, m.y, m.z);
        m.group.rotation.x += delta * 4.5;
        if (m.knockTimer <= 0) {
          m.active = false;
          m.group.visible = false;
        }
      } else {
        const dx = playerX - m.x;
        const dz = playerZ - m.z;
        const dist = Math.hypot(dx, dz);
        m.group.rotation.y = Math.atan2(-dx, -dz);
        m.coreMesh.scale.setScalar(1 + Math.sin(elapsed * 6.5) * 0.14);
        m.auraRing.rotation.z = -elapsed * 1.9;
        m.head.rotation.y = Math.sin(elapsed * 1.7) * 0.18;

        if (isWalking && dist < 56) {
          if (dist > 3.6) {
            const spd = 2.65;
            m.x += (dx / dist) * spd * delta;
            m.z += (dz / dist) * spd * delta;
            const swing = Math.sin(elapsed * 4.6) * 0.48;
            m.leftArm.rotation.x = swing;
            m.rightArm.rotation.x = -swing;
          } else {
            m.leftArm.rotation.x = THREE.MathUtils.damp(m.leftArm.rotation.x, 0.4, 5, delta);
          }

          m.attackCooldown -= delta;
          if (m.attackCooldown <= 0) {
            m.attackCooldown = 1.65;
            m.rightArm.rotation.x = 1.65;
            if (dist < 4.1) {
              const reduced = Math.max(6, Math.round(18 * (1 - armorPct / 100)));
              callbacks.onPlayerDamaged(reduced, 'Монстр планеты');
            } else {
              this.fireBolt(false, m.x, 2.4, m.z, dx / dist, -0.04, dz / dist, 26, 14);
            }
          } else {
            m.rightArm.rotation.x = THREE.MathUtils.damp(m.rightArm.rotation.x, 0.3, 5, delta);
          }
        } else {
          m.leftArm.rotation.x = Math.sin(elapsed * 2.1) * 0.14;
          m.rightArm.rotation.x = -Math.sin(elapsed * 2.1) * 0.14;
        }
        m.group.position.set(m.x, m.floorY, m.z);
      }
    }

    // 3. Police Cruiser + 2..3 Officers & 3-way Clear Logic
    if (this.policeWanted) {
      const flash = Math.floor(elapsed * 6) % 2 === 0;
      this.policeBarRedMat.color.setHex(flash ? 0xff2222 : 0x450a0a);
      this.policeBarBlueMat.color.setHex(flash ? 0x172554 : 0x3b82f6);

      const targetX = isWalking ? playerX : carX;
      const targetZ = isWalking ? playerZ : carZ;

      if (this.policeCarActive) {
        const dxC = targetX - this.policeCarX;
        const dzC = targetZ - this.policeCarZ;
        const dCar = Math.hypot(dxC, dzC);
        if (dCar > 19 && dCar < 95) {
          this.policeCarX += (dxC / dCar) * 11 * delta;
          this.policeCarZ += (dzC / dCar) * 11 * delta;
          this.policeCarYaw = Math.atan2(-dxC, -dzC);
          this.policeCarGroup.position.set(this.policeCarX, 0, this.policeCarZ);
          this.policeCarGroup.rotation.y = this.policeCarYaw;
        }
      }

      let aliveCount = 0;
      let minPoliceDist = Infinity;
      let anyHasLos = false;

      for (let i = 0; i < this.policeOfficers.length; i++) {
        const o = this.policeOfficers[i];
        if (!o.active) continue;
        if (updateKnocked(o)) continue;
        aliveCount++;

        const dx = targetX - o.x;
        const dz = targetZ - o.z;
        const dist = Math.hypot(dx, dz);
        if (dist < minPoliceDist) minPoliceDist = dist;

        o.group.rotation.y = Math.atan2(-dx, -dz);

        if (isWalking && dist > 11 && dist < 85) {
          const spd = 3.1;
          o.x += (dx / dist) * spd * delta;
          o.z += (dz / dist) * spd * delta;
          const swing = Math.sin(elapsed * 8 + o.phase) * 0.45;
          o.leftLeg.rotation.x = swing;
          o.rightLeg.rotation.x = -swing;
        } else {
          o.leftLeg.rotation.x = 0;
          o.rightLeg.rotation.x = 0;
        }
        o.group.position.set(o.x, 0, o.z);

        const losClear =
          isWalking && dist < 44 && this.hasLineOfSight(o.x, o.z, targetX, targetZ, walkObstacles);
        if (losClear) anyHasLos = true;

        o.attackCooldown -= delta;
        if (losClear && o.attackCooldown <= 0) {
          o.attackCooldown = 2.0;
          o.rightArm.rotation.x = -1.45;
          this.fireBolt(false, o.x, 1.25, o.z, dx / Math.max(0.5, dist), 0, dz / Math.max(0.5, dist), 22, 6);
        } else {
          o.rightArm.rotation.x = THREE.MathUtils.damp(o.rightArm.rotation.x, -0.6, 5, delta);
        }
      }

      if (aliveCount === 0) {
        this.policeWanted = false;
        this.policeHideTimer = 0;
        this.policeCarActive = false;
        this.policeCarGroup.visible = false;
        callbacks.onPoliceCleared('defeated');
      } else if (minPoliceDist > 115) {
        this.clearAllEncounters(true);
        callbacks.onPoliceCleared('escaped');
      } else {
        if (!isWalking || !anyHasLos) {
          this.policeHideTimer += delta;
          if (this.policeHideTimer >= 6.0) {
            this.clearAllEncounters(true);
            callbacks.onPoliceCleared('hidden');
          }
        } else {
          this.policeHideTimer = Math.max(0, this.policeHideTimer - delta * 0.6);
        }
      }
    }

    // 4. Pooled Blaster Bolts Simulation & Hits
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      if (!b.active) continue;
      b.life -= delta;
      b.x += b.vx * delta;
      b.y += b.vy * delta;
      b.z += b.vz * delta;
      b.mesh.position.set(b.x, b.y, b.z);

      if (b.life <= 0 || b.y < -1) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      if (b.fromPlayer) {
        let consumed = false;
        const checkBoltHit = (list: HumanNpcActor[], kind: 'gopnik' | 'rally' | 'police' | 'boss') => {
          for (let j = 0; j < list.length; j++) {
            const a = list[j];
            if (!a.active || a.knockedOut) continue;
            const hitR = kind === 'boss' ? 1.25 : 0.95;
            if (Math.hypot(a.x - b.x, a.z - b.z) < hitR && Math.abs(b.y - (a.floorY + 1.0)) < 1.25) {
              a.hp -= b.damage;
              consumed = true;
              if (a.hp <= 0) {
                const dLen = Math.max(0.1, Math.hypot(b.vx, b.vz));
                this.knockOutActor(a, b.vx / dLen, b.vz / dLen);
                if (kind === 'boss') this.bossDefeated = true;
                callbacks.onEnemyDefeated(kind, a.x, a.floorY, a.z);
                if (kind === 'rally' && this.getRallyActiveCount() === 0) {
                  this.rallyCompleted = true;
                }
              }
              break;
            }
          }
        };
        checkBoltHit(this.gopniks, 'gopnik');
        if (!consumed) checkBoltHit(this.rallyCrowd, 'rally');
        if (!consumed) checkBoltHit(this.policeOfficers, 'police');
        if (!consumed) checkBoltHit([this.bountyBoss], 'boss');
        if (!consumed && this.planetMonster.active && !this.planetMonster.knockedOut) {
          const m = this.planetMonster;
          if (
            Math.hypot(m.x - b.x, m.z - b.z) < 2.25 &&
            b.y >= m.floorY &&
            b.y <= m.floorY + 4.8
          ) {
            m.hp -= b.damage;
            consumed = true;
            if (m.hp <= 0) {
              const dLen = Math.max(0.1, Math.hypot(b.vx, b.vz));
              m.knockedOut = true;
              m.knockTimer = 1.6;
              m.vx = (b.vx / dLen) * 4.2;
              m.vy = 5.4;
              m.vz = (b.vz / dLen) * 4.2;
              m.defeated = true;
              callbacks.onEnemyDefeated('monster', m.x, m.floorY, m.z);
            }
          }
        }

        if (consumed) {
          b.active = false;
          b.mesh.visible = false;
        }
      } else if (isWalking) {
        if (Math.hypot(playerX - b.x, playerZ - b.z) < 0.85 && Math.abs(playerY + 1.0 - b.y) < 1.3) {
          const reduced = Math.max(2, Math.round(b.damage * (1 - armorPct / 100)));
          callbacks.onPlayerDamaged(reduced, 'Патрульный');
          b.active = false;
          b.mesh.visible = false;
        }
      }
    }
  }

  private hasLineOfSight(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    obstacles: BuildingFootprint[],
  ): boolean {
    const steps = 4;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = ax + (bx - ax) * t;
      const sz = az + (bz - az) * t;
      for (let i = 0; i < obstacles.length; i++) {
        const ob = obstacles[i];
        if (Math.abs(sx - ob.x) <= ob.halfW && Math.abs(sz - ob.z) <= ob.halfD) {
          return false;
        }
      }
    }
    return true;
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
