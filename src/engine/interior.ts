import * as THREE from 'three';
import type { BuildingFootprint } from './physics';
import type { InteriorMode } from '../types/simulation';

export interface InteriorSeatAnchor {
  id: string;
  label: string;
  playerPos: THREE.Vector3;
  playerLookYaw: number;
  companionPos: THREE.Vector3;
  companionYaw: number;
  tableIndex: number; // -1 if lounge sofa
}

export interface InteriorBedAnchor {
  playerPos: THREE.Vector3;
  playerLookYaw: number;
  playerLookPitch: number;
  companionPos: THREE.Vector3;
  companionYaw: number;
}

const CAFE_BOUNDS = { minX: -5.8, maxX: 5.8, minZ: -4.8, maxZ: 4.9 };
const HOTEL_BOUNDS = { minX: -5.4, maxX: 5.4, minZ: -4.7, maxZ: 4.4 };
const OBS_BOUNDS = { minX: -6.0, maxX: 6.0, minZ: -5.2, maxZ: 5.1 };

export class InteriorScene {
  public readonly group = new THREE.Group();
  private cafeGroup = new THREE.Group();
  private hotelGroup = new THREE.Group();
  private observatoryGroup = new THREE.Group();
  private orreryPlanets: { pivot: THREE.Group; speed: number }[] = [];

  private cafeSeats: InteriorSeatAnchor[] = [];
  private hotelSeats: InteriorSeatAnchor[] = [];
  private obsSeats: InteriorSeatAnchor[] = [];
  private hotelBed: InteriorBedAnchor;

  private cafeCoffeeGroups: THREE.Group[] = [];
  private cafeObstacles: BuildingFootprint[] = [];
  private hotelObstacles: BuildingFootprint[] = [];
  private obsObstacles: BuildingFootprint[] = [];

  private interiorKeyLight: THREE.PointLight;
  private interiorFillLight: THREE.PointLight;
  private hotelLampLight: THREE.PointLight;
  private hotelCoveMat: THREE.MeshBasicMaterial;
  private skyViewMat: THREE.MeshBasicMaterial;

  private disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene) {
    this.group.visible = false;
    scene.add(this.group);

    this.interiorKeyLight = new THREE.PointLight(0xffdfb0, 3.2, 26, 1.1);
    this.interiorKeyLight.position.set(0, 3.4, -0.5);
    this.group.add(this.interiorKeyLight);

    this.interiorFillLight = new THREE.PointLight(0x93c5fd, 1.4, 24, 1.2);
    this.interiorFillLight.position.set(-2.5, 2.8, 2.5);
    this.group.add(this.interiorFillLight);

    this.hotelLampLight = new THREE.PointLight(0xfde68a, 2.2, 16, 1.3);
    this.hotelLampLight.position.set(2.4, 1.9, 2.2);
    this.hotelGroup.add(this.hotelLampLight);

    this.hotelCoveMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, toneMapped: false });
    this.skyViewMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.disposables.push(this.hotelCoveMat, this.skyViewMat);

    this.group.add(this.cafeGroup);
    this.group.add(this.hotelGroup);
    this.group.add(this.observatoryGroup);

    this.buildCafeRoom();
    this.hotelBed = this.buildHotelRoom();
    this.buildObservatoryRoom();
  }

  private addBox(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    this.disposables.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  private buildCafeRoom(): void {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 0.58, metalness: 0.12 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.72, metalness: 0.18 });
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.45, metalness: 0.15 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.25, metalness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5b3f2b, roughness: 0.42, metalness: 0.08 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x8b3a4a, roughness: 0.75, metalness: 0.05 });
    const glowAmber = new THREE.MeshBasicMaterial({ color: 0xfde68a, toneMapped: false });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.05 });
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x3c2010, roughness: 0.12 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x2f855a, roughness: 0.78 });
    this.disposables.push(
      floorMat,
      wallMat,
      counterMat,
      brassMat,
      woodMat,
      cushionMat,
      glowAmber,
      glowCyan,
      cupMat,
      coffeeMat,
      plantMat,
    );

    // Floor & ceiling
    this.addBox(this.cafeGroup, 13.6, 0.2, 11.8, 0, -0.1, 0, floorMat);
    this.addBox(this.cafeGroup, 13.6, 0.2, 11.8, 0, 4.1, 0, wallMat);

    // Side & back walls (front Z=-5.6 has panoramic glass window!)
    this.addBox(this.cafeGroup, 0.3, 4.2, 11.8, -6.65, 2.0, 0, wallMat);
    this.addBox(this.cafeGroup, 0.3, 4.2, 11.8, 6.65, 2.0, 0, wallMat);
    // Back wall with exit doorway gap at x in [-1.1, 1.1]
    this.addBox(this.cafeGroup, 5.4, 4.2, 0.3, -3.9, 2.0, 5.75, wallMat);
    this.addBox(this.cafeGroup, 5.4, 4.2, 0.3, 3.9, 2.0, 5.75, wallMat);
    this.addBox(this.cafeGroup, 2.4, 1.4, 0.3, 0, 3.4, 5.75, wallMat);
    // Exit door glow strip
    this.addBox(this.cafeGroup, 2.1, 0.12, 0.14, 0, 2.65, 5.58, glowCyan);

    // Panoramic window frame & subtle glass
    this.addBox(this.cafeGroup, 13.6, 0.75, 0.3, 0, 0.37, -5.75, wallMat);
    this.addBox(this.cafeGroup, 13.6, 0.55, 0.3, 0, 3.8, -5.75, wallMat);
    for (const px of [-3.3, 0, 3.3]) {
      this.addBox(this.cafeGroup, 0.18, 3.2, 0.24, px, 2.15, -5.75, wallMat);
    }
    this.addBox(this.cafeGroup, 13.0, 2.8, 0.04, 0, 2.15, -5.72, this.skyViewMat);

    // Bar counter on left (-X)
    this.addBox(this.cafeGroup, 1.4, 1.05, 6.4, -4.6, 0.525, -0.4, counterMat);
    this.addBox(this.cafeGroup, 1.56, 0.08, 6.6, -4.6, 1.08, -0.4, brassMat);
    // Espresso machine & glowing menu board on left wall
    this.addBox(this.cafeGroup, 0.65, 0.65, 1.2, -4.9, 1.44, -1.5, brassMat);
    this.addBox(this.cafeGroup, 0.1, 1.3, 3.8, -6.42, 2.45, -0.5, glowAmber);
    this.cafeObstacles.push({ x: -4.6, z: -0.4, halfW: 0.9, halfD: 3.4, height: 2 });

    // Potted café plants near window corners
    for (const px of [-5.5, 5.5]) {
      this.addBox(this.cafeGroup, 0.55, 0.55, 0.55, px, 0.275, -4.8, brassMat);
      this.addBox(this.cafeGroup, 0.72, 1.1, 0.72, px, 1.0, -4.8, plantMat);
    }

    // 3 Cozy Tables + 2 Chairs each + Hidden Coffee Cups Group
    const tableCoords: [number, number][] = [
      [0.4, -2.9],
      [3.9, -2.1],
      [2.5, 1.7],
    ];

    const tableTopGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20);
    const tableLegGeo = new THREE.CylinderGeometry(0.06, 0.16, 0.74, 12);
    const chairSeatGeo = new THREE.BoxGeometry(0.46, 0.07, 0.46);
    const chairBackGeo = new THREE.BoxGeometry(0.46, 0.46, 0.06);
    const chairLegGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.45, 8);
    const cupGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.09, 12);
    const saucerGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.02, 12);
    const coffeeTopGeo = new THREE.CircleGeometry(0.048, 10);
    coffeeTopGeo.rotateX(-Math.PI / 2);
    this.disposables.push(tableTopGeo, tableLegGeo, chairSeatGeo, chairBackGeo, chairLegGeo, cupGeo, saucerGeo, coffeeTopGeo);

    tableCoords.forEach(([tx, tz], idx) => {
      const top = new THREE.Mesh(tableTopGeo, woodMat);
      top.position.set(tx, 0.75, tz);
      this.cafeGroup.add(top);

      const leg = new THREE.Mesh(tableLegGeo, brassMat);
      leg.position.set(tx, 0.37, tz);
      this.cafeGroup.add(leg);

      // Warm pendant lamp above table
      this.addBox(this.cafeGroup, 0.34, 0.14, 0.34, tx, 2.95, tz, glowAmber);
      this.addBox(this.cafeGroup, 0.03, 1.1, 0.03, tx, 3.55, tz, brassMat);

      // 2 Chairs facing across Z (-Z side = companion, +Z side = player facing window & companion!)
      for (const side of [-1, 1]) {
        const cz = tz + side * 0.86;
        const seat = new THREE.Mesh(chairSeatGeo, cushionMat);
        seat.position.set(tx, 0.45, cz);
        this.cafeGroup.add(seat);

        const back = new THREE.Mesh(chairBackGeo, woodMat);
        back.position.set(tx, 0.68, cz + side * 0.21);
        this.cafeGroup.add(back);

        for (const lx of [-0.18, 0.18]) {
          for (const lz of [-0.18, 0.18]) {
            const cLeg = new THREE.Mesh(chairLegGeo, brassMat);
            cLeg.position.set(tx + lx, 0.225, cz + lz);
            this.cafeGroup.add(cLeg);
          }
        }
      }

      // Coffee cups & saucers on table (visible once ordered)
      const cupsGroup = new THREE.Group();
      cupsGroup.visible = false;
      for (const side of [-1, 1]) {
        const saucer = new THREE.Mesh(saucerGeo, cupMat);
        saucer.position.set(tx + side * 0.08, 0.79, tz + side * 0.26);
        cupsGroup.add(saucer);

        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.set(tx + side * 0.08, 0.84, tz + side * 0.26);
        cupsGroup.add(cup);

        const drink = new THREE.Mesh(coffeeTopGeo, coffeeMat);
        drink.position.set(tx + side * 0.08, 0.884, tz + side * 0.26);
        cupsGroup.add(drink);
      }
      this.cafeGroup.add(cupsGroup);
      this.cafeCoffeeGroups.push(cupsGroup);

      this.cafeObstacles.push({ x: tx, z: tz, halfW: 0.75, halfD: 1.08, height: 1.5 });

      this.cafeSeats.push({
        id: `cafe_table_${idx}`,
        label: 'Сесть за столик',
        playerPos: new THREE.Vector3(tx, 1.15, tz + 0.86),
        playerLookYaw: 0, // faces -Z across table toward companion & panoramic window
        companionPos: new THREE.Vector3(tx, 0, tz - 0.86),
        companionYaw: Math.PI, // faces +Z toward player!
        tableIndex: idx,
      });
    });
  }

  private buildHotelRoom(): InteriorBedAnchor {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x33241c, roughness: 0.5, metalness: 0.1 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x181c26, roughness: 0.75, metalness: 0.12 });
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x2c3347, roughness: 0.92, metalness: 0.02 });
    const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x3b2d26, roughness: 0.55, metalness: 0.1 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.82, metalness: 0.02 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x4b556e, roughness: 0.86, metalness: 0.04 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x4f3b4a, roughness: 0.82, metalness: 0.04 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4c3728, roughness: 0.45, metalness: 0.08 });
    const lampShadeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, toneMapped: false });

    this.disposables.push(
      floorMat,
      wallMat,
      rugMat,
      bedFrameMat,
      sheetMat,
      blanketMat,
      pillowMat,
      sofaMat,
      woodMat,
      lampShadeMat,
    );

    // Floor, rug & ceiling
    this.addBox(this.hotelGroup, 12.6, 0.2, 11.2, 0, -0.1, 0, floorMat);
    this.addBox(this.hotelGroup, 6.4, 0.03, 5.2, 0.2, 0.015, 0.2, rugMat);
    this.addBox(this.hotelGroup, 12.6, 0.2, 11.2, 0, 3.7, 0, wallMat);
    // Ambient ceiling cove LED strip
    this.addBox(this.hotelGroup, 9.6, 0.06, 0.12, 0, 3.56, -4.6, this.hotelCoveMat);
    this.addBox(this.hotelGroup, 9.6, 0.06, 0.12, 0, 3.56, 3.8, this.hotelCoveMat);

    // Side & back walls (front Z=-5.4 is huge panoramic sky window)
    this.addBox(this.hotelGroup, 0.3, 3.8, 11.2, -6.15, 1.8, 0, wallMat);
    this.addBox(this.hotelGroup, 0.3, 3.8, 11.2, 6.15, 1.8, 0, wallMat);
    this.addBox(this.hotelGroup, 5.0, 3.8, 0.3, -3.65, 1.8, 5.35, wallMat);
    this.addBox(this.hotelGroup, 5.0, 3.8, 0.3, 3.65, 1.8, 5.35, wallMat);
    this.addBox(this.hotelGroup, 2.4, 1.2, 0.3, 0, 3.1, 5.35, wallMat);
    this.addBox(this.hotelGroup, 2.1, 0.1, 0.12, 0, 2.48, 5.18, this.hotelCoveMat);

    // Panoramic window
    this.addBox(this.hotelGroup, 12.6, 0.55, 0.3, 0, 0.275, -5.45, wallMat);
    this.addBox(this.hotelGroup, 12.6, 0.45, 0.3, 0, 3.45, -5.45, wallMat);
    for (const px of [-3.1, 0, 3.1]) {
      this.addBox(this.hotelGroup, 0.16, 2.8, 0.22, px, 1.9, -5.45, wallMat);
    }
    this.addBox(this.hotelGroup, 12.0, 2.7, 0.04, 0, 1.9, -5.42, this.skyViewMat);

    // Lounge Sofa facing panoramic window (left side of suite)
    const sx = -2.8;
    const sz = -0.8;
    this.addBox(this.hotelGroup, 2.4, 0.4, 1.0, sx, 0.24, sz, sofaMat);
    this.addBox(this.hotelGroup, 2.4, 0.56, 0.22, sx, 0.68, sz + 0.42, sofaMat);
    this.addBox(this.hotelGroup, 0.22, 0.45, 1.0, sx - 1.1, 0.52, sz, sofaMat);
    this.addBox(this.hotelGroup, 0.22, 0.45, 1.0, sx + 1.1, 0.52, sz, sofaMat);
    // Coffee table in front of sofa
    this.addBox(this.hotelGroup, 1.5, 0.08, 0.78, sx, 0.44, sz - 1.35, woodMat);
    this.addBox(this.hotelGroup, 0.25, 0.4, 0.25, sx, 0.2, sz - 1.35, bedFrameMat);
    this.hotelObstacles.push({ x: sx, z: sz - 0.5, halfW: 1.3, halfD: 1.25, height: 1.5 });

    this.hotelSeats.push({
      id: 'hotel_sofa',
      label: 'Присесть на диван',
      playerPos: new THREE.Vector3(sx + 0.45, 1.08, sz),
      playerLookYaw: 0, // looks out the panoramic window
      companionPos: new THREE.Vector3(sx - 0.55, 0, sz + 0.05),
      companionYaw: -0.25,
      tableIndex: -1,
    });

    // King-Size Double Bed on right side, oriented so pillows are at +Z and you look out at the window (-Z)!
    const bx = 2.4;
    const bz = 1.45;
    // Frame + headboard at +Z (z = 2.68)
    this.addBox(this.hotelGroup, 2.46, 0.34, 2.48, bx, 0.17, bz, bedFrameMat);
    this.addBox(this.hotelGroup, 2.54, 1.18, 0.18, bx, 0.74, bz + 1.24, bedFrameMat);
    // Mattress + sheet
    this.addBox(this.hotelGroup, 2.26, 0.24, 2.28, bx, 0.46, bz - 0.02, sheetMat);
    // Folded soft blanket over lower 2/3 of bed
    this.addBox(this.hotelGroup, 2.3, 0.06, 1.45, bx, 0.59, bz - 0.44, blanketMat);
    // Two fluffy pillows at +Z head of bed
    this.addBox(this.hotelGroup, 0.76, 0.14, 0.48, bx - 0.54, 0.63, bz + 0.82, pillowMat);
    this.addBox(this.hotelGroup, 0.76, 0.14, 0.48, bx + 0.54, 0.63, bz + 0.82, pillowMat);

    // Nightstands + glowing bedside lamps
    for (const nx of [bx - 1.56, bx + 1.56]) {
      this.addBox(this.hotelGroup, 0.52, 0.54, 0.48, nx, 0.27, bz + 0.96, woodMat);
      this.addBox(this.hotelGroup, 0.06, 0.24, 0.06, nx, 0.66, bz + 0.96, bedFrameMat);
      this.addBox(this.hotelGroup, 0.24, 0.2, 0.24, nx, 0.84, bz + 0.96, lampShadeMat);
    }

    this.hotelObstacles.push({ x: bx, z: bz, halfW: 1.85, halfD: 1.38, height: 1.4 });

    return {
      // Player lies on right side of bed (looking slightly up at sky/window & left toward companion)
      playerPos: new THREE.Vector3(bx + 0.54, 0.96, bz + 0.78),
      playerLookYaw: 0.28,
      playerLookPitch: 0.22,
      // Companion lies on left side of bed facing +Z (head toward pillow at bz+0.82, turning toward player at +X)
      companionPos: new THREE.Vector3(bx - 0.52, 0, bz - 0.25),
      companionYaw: Math.PI,
    };
  }

  private buildObservatoryRoom(): void {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.32, metalness: 0.35 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x141b2b, roughness: 0.65, metalness: 0.25 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.22, metalness: 0.85 });
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x2b364f, roughness: 0.75, metalness: 0.08 });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
    const glowGold = new THREE.MeshBasicMaterial({ color: 0xfde047, toneMapped: false });
    const glowRose = new THREE.MeshBasicMaterial({ color: 0xf472b6, toneMapped: false });
    const glowEmerald = new THREE.MeshBasicMaterial({ color: 0x34d399, toneMapped: false });
    const domeGlassMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.disposables.push(
      floorMat,
      wallMat,
      brassMat,
      benchMat,
      glowCyan,
      glowGold,
      glowRose,
      glowEmerald,
      domeGlassMat,
    );

    // Circular star-deck floor
    const floorGeo = new THREE.CylinderGeometry(7.2, 7.2, 0.2, 28);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.1, 0);
    this.observatoryGroup.add(floorMesh);

    const ringGeo = new THREE.RingGeometry(4.4, 4.55, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, glowCyan);
    ringMesh.position.set(0, 0.015, -0.8);
    this.observatoryGroup.add(ringMesh);
    this.disposables.push(floorGeo, ringGeo);

    // Low perimeter wall + tall glass dome ribs + sky glass cupola
    this.addBox(this.observatoryGroup, 0.3, 1.35, 11.4, -6.5, 0.68, 0, wallMat);
    this.addBox(this.observatoryGroup, 0.3, 1.35, 11.4, 6.5, 0.68, 0, wallMat);
    this.addBox(this.observatoryGroup, 13.0, 1.15, 0.3, 0, 0.58, -5.8, wallMat);
    this.addBox(this.observatoryGroup, 5.2, 3.8, 0.3, -3.9, 1.9, 5.65, wallMat);
    this.addBox(this.observatoryGroup, 5.2, 3.8, 0.3, 3.9, 1.9, 5.65, wallMat);
    this.addBox(this.observatoryGroup, 2.8, 1.3, 0.3, 0, 3.15, 5.65, wallMat);
    this.addBox(this.observatoryGroup, 2.3, 0.1, 0.14, 0, 2.48, 5.48, glowCyan);

    // Glass dome cupola over the observatory
    const domeGeo = new THREE.SphereGeometry(7.4, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.46);
    const domeMesh = new THREE.Mesh(domeGeo, domeGlassMat);
    domeMesh.position.set(0, 1.1, -0.2);
    this.observatoryGroup.add(domeMesh);

    const ribGeo = new THREE.TorusGeometry(7.42, 0.08, 6, 32, Math.PI);
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(ribGeo, wallMat);
      rib.position.set(0, 1.1, -0.2);
      rib.rotation.y = (r * Math.PI) / 4;
      this.observatoryGroup.add(rib);
    }
    this.disposables.push(domeGeo, ribGeo);

    // Central Holographic Galaxy Orrery Pedestal
    const pedGeo = new THREE.CylinderGeometry(1.15, 1.35, 0.78, 20);
    const pedMesh = new THREE.Mesh(pedGeo, wallMat);
    pedMesh.position.set(0, 0.39, -1.0);
    this.observatoryGroup.add(pedMesh);

    const pedRimGeo = new THREE.TorusGeometry(1.16, 0.035, 8, 32);
    pedRimGeo.rotateX(Math.PI / 2);
    const pedRim = new THREE.Mesh(pedRimGeo, glowCyan);
    pedRim.position.set(0, 0.79, -1.0);
    this.observatoryGroup.add(pedRim);

    const sunGeo = new THREE.SphereGeometry(0.24, 16, 12);
    const sunMesh = new THREE.Mesh(sunGeo, glowGold);
    sunMesh.position.set(0, 1.65, -1.0);
    this.observatoryGroup.add(sunMesh);

    const orbitRadii = [0.52, 0.84, 1.18, 1.54];
    const orbitSpeeds = [1.3, 0.85, 0.55, 0.36];
    const planetSizes = [0.065, 0.09, 0.075, 0.11];
    const planetMats = [glowCyan, glowRose, glowEmerald, glowGold];
    const orbitRingGeoList: THREE.TorusGeometry[] = [];
    const miniPlanetGeo = new THREE.SphereGeometry(1, 12, 10);
    this.disposables.push(pedGeo, pedRimGeo, sunGeo, miniPlanetGeo);

    for (let i = 0; i < orbitRadii.length; i++) {
      const oRingGeo = new THREE.TorusGeometry(orbitRadii[i], 0.008, 6, 36);
      oRingGeo.rotateX(Math.PI / 2);
      orbitRingGeoList.push(oRingGeo);
      this.disposables.push(oRingGeo);

      const oRing = new THREE.Mesh(oRingGeo, glowCyan);
      oRing.position.set(0, 1.65, -1.0);
      this.observatoryGroup.add(oRing);

      const pivot = new THREE.Group();
      pivot.position.set(0, 1.65, -1.0);
      pivot.rotation.y = i * 1.4;
      pivot.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.09;

      const pMesh = new THREE.Mesh(miniPlanetGeo, planetMats[i]);
      pMesh.scale.setScalar(planetSizes[i]);
      pMesh.position.set(orbitRadii[i], 0, 0);
      pivot.add(pMesh);

      this.observatoryGroup.add(pivot);
      this.orreryPlanets.push({ pivot, speed: orbitSpeeds[i] });
    }

    this.obsObstacles.push({ x: 0, z: -1.0, halfW: 1.45, halfD: 1.45, height: 2.0 });

    // Brass Sky Telescope near front panoramic glass
    const scopeStandGeo = new THREE.CylinderGeometry(0.06, 0.25, 1.15, 10);
    const scopeStand = new THREE.Mesh(scopeStandGeo, wallMat);
    scopeStand.position.set(-3.4, 0.575, -3.9);
    this.observatoryGroup.add(scopeStand);
    const scopeTubeGeo = new THREE.CylinderGeometry(0.11, 0.08, 1.4, 12);
    const scopeTube = new THREE.Mesh(scopeTubeGeo, brassMat);
    scopeTube.position.set(-3.4, 1.3, -4.1);
    scopeTube.rotation.x = Math.PI * 0.34;
    this.observatoryGroup.add(scopeTube);
    this.disposables.push(scopeStandGeo, scopeTubeGeo);
    this.obsObstacles.push({ x: -3.4, z: -4.0, halfW: 0.7, halfD: 0.8, height: 1.8 });

    // Stargazing Panoramic Lounge Bench facing the Holographic Orrery & Sky Dome
    const bx = 0;
    const bz = 2.0;
    this.addBox(this.observatoryGroup, 2.7, 0.42, 0.95, bx, 0.21, bz, benchMat);
    this.addBox(this.observatoryGroup, 2.7, 0.46, 0.18, bx, 0.62, bz + 0.38, benchMat);
    this.obsObstacles.push({ x: bx, z: bz, halfW: 1.42, halfD: 0.56, height: 1.1 });

    this.obsSeats.push({
      id: 'observatory_bench',
      label: 'Присесть на скамью',
      playerPos: new THREE.Vector3(bx - 0.5, 1.1, bz),
      playerLookYaw: 0, // looks -Z toward rotating holographic planets & glass sky dome
      companionPos: new THREE.Vector3(bx + 0.52, 0, bz),
      companionYaw: 0,
      tableIndex: -1,
    });
  }

  public setMode(mode: InteriorMode): void {
    this.group.visible = mode !== 'none';
    this.cafeGroup.visible = mode === 'cafe';
    this.hotelGroup.visible = mode === 'hotel';
    this.observatoryGroup.visible = mode === 'observatory';
    if (mode !== 'cafe') {
      for (const cg of this.cafeCoffeeGroups) {
        cg.visible = false;
      }
    }
  }

  public animate(elapsed: number): void {
    if (!this.observatoryGroup.visible) return;
    for (const op of this.orreryPlanets) {
      op.pivot.rotation.y = elapsed * op.speed;
    }
  }

  public setCoffeeServed(tableIdx: number, served: boolean): void {
    if (tableIdx >= 0 && tableIdx < this.cafeCoffeeGroups.length) {
      this.cafeCoffeeGroups[tableIdx].visible = served;
    }
  }

  public updateAtmosphere(
    mode: InteriorMode,
    horizonColor: THREE.Color,
    nightFactor: number,
    themeHex: string,
    sleepFade: number,
  ): void {
    if (mode === 'none') return;
    const awakeMul = Math.max(0.12, 1 - sleepFade * 0.85);
    this.skyViewMat.color.copy(horizonColor);
    this.skyViewMat.opacity = 0.1 + (1 - nightFactor) * 0.1;

    if (mode === 'cafe') {
      this.interiorKeyLight.color.set('#ffe4bc');
      this.interiorKeyLight.intensity = 3.2;
      this.interiorFillLight.intensity = 1.4;
    } else if (mode === 'observatory') {
      this.interiorKeyLight.color.set('#bae6fd');
      this.interiorKeyLight.intensity = 2.4;
      this.interiorFillLight.intensity = 1.3;
    } else {
      this.interiorKeyLight.color.set('#ffd9b3');
      this.interiorKeyLight.intensity = (2.1 - nightFactor * 0.5) * awakeMul;
      this.interiorFillLight.intensity = 1.1 * awakeMul;
      this.hotelLampLight.intensity = (1.6 + nightFactor * 1.1) * awakeMul;
      this.hotelCoveMat.color.set(themeHex).multiplyScalar(0.55 + 0.45 * awakeMul);
    }
  }

  public clampPlayerPosition(mode: InteriorMode, pos: THREE.Vector3): void {
    const b = mode === 'cafe' ? CAFE_BOUNDS : mode === 'observatory' ? OBS_BOUNDS : HOTEL_BOUNDS;
    pos.x = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
  }

  public getObstacles(mode: InteriorMode): BuildingFootprint[] {
    if (mode === 'cafe') return this.cafeObstacles;
    if (mode === 'observatory') return this.obsObstacles;
    return this.hotelObstacles;
  }

  public getNearestSeat(mode: InteriorMode, x: number, z: number): InteriorSeatAnchor | null {
    const list =
      mode === 'cafe' ? this.cafeSeats : mode === 'observatory' ? this.obsSeats : this.hotelSeats;
    let best: InteriorSeatAnchor | null = null;
    let bestDist = 2.55;
    for (const s of list) {
      const d = Math.hypot(s.playerPos.x - x, s.playerPos.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  public isNearBed(mode: InteriorMode, x: number, z: number): boolean {
    if (mode !== 'hotel') return false;
    return Math.hypot(x - 2.4, z - 1.45) < 2.95;
  }

  public getBedAnchor(): InteriorBedAnchor {
    return this.hotelBed;
  }

  public getEntrySpawn(mode: InteriorMode): { playerPos: THREE.Vector3; companionPos: THREE.Vector3; heading: number } {
    if (mode === 'cafe') {
      return {
        playerPos: new THREE.Vector3(0, 0, 4.1),
        companionPos: new THREE.Vector3(0.9, 0, 4.4),
        heading: 0,
      };
    }
    if (mode === 'observatory') {
      return {
        playerPos: new THREE.Vector3(0, 0, 4.2),
        companionPos: new THREE.Vector3(0.85, 0, 4.45),
        heading: 0,
      };
    }
    return {
      playerPos: new THREE.Vector3(-0.3, 0, 3.8),
      companionPos: new THREE.Vector3(0.65, 0, 4.0),
      heading: 0,
    };
  }

  public isNearExitDoor(mode: InteriorMode, x: number, z: number): boolean {
    const exitZ = mode === 'cafe' ? 5.1 : mode === 'observatory' ? 5.2 : 4.7;
    return Math.abs(x) < 1.5 && z > exitZ - 0.85;
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
