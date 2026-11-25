import * as THREE from 'three';
import { getActiveSpacePlanets, getPlanetConfig, type PlanetConfig } from './planets';
import type { ControlInputs, PlanetId, VehicleFlightState, WeatherMode } from '../types/simulation';

export interface BuildingFootprint {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  height: number;
}

const _spaceDir = new THREE.Vector3();
const _toPlanet = new THREE.Vector3();

export class VehiclePhysics {
  public readonly position = new THREE.Vector3(0, 0, 0);
  public readonly spacePos = new THREE.Vector3(0, 260, 0);
  public activePlanetId: PlanetId = 'coruscant';

  public heading = 0;
  public spacePitch = 0.08;
  public forwardSpeed = 0;
  public spaceSpeed = 0;
  public lateralSpeed = 0;
  public verticalSpeed = 0;
  public pitch = 0;
  public roll = 0;
  public steerAngle = 0;
  public suspensionHeave = 0;
  public flightState: VehicleFlightState = 'road';
  public targetFlightAltitude = 104;
  public spaceFactor = 0;

  public isWalking = false;
  public readonly walkerPos = new THREE.Vector3();
  public walkerHeading = 0;
  public walkerPitch = 0;
  public walkBob = 0;
  public readonly companionPos = new THREE.Vector3();
  public companionHeading = 0;
  public companionMoveSpeed = 0;
  public boostTimer = 0;

  private prevForwardSpeed = 0;
  private distanceTraveled = 0;
  private onPlanetSwitch?: (planetId: PlanetId) => void;

  public triggerBoost(): void {
    this.boostTimer = 4.0;
  }

  public setOnPlanetSwitch(cb: (planetId: PlanetId) => void): void {
    this.onPlanetSwitch = cb;
  }

  public exitVehicle(inCity: boolean): boolean {
    if (this.flightState !== 'road' || !inCity || this.isWalking) {
      return false;
    }
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.pitch = 0;
    this.roll = 0;
    this.steerAngle = 0;
    this.suspensionHeave = 0;

    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    // Step out onto the street beside the left (driver) door
    this.walkerPos.set(
      this.position.x - cosH * 1.72,
      0,
      this.position.z + sinH * 1.72,
    );
    // Companion steps out on the passenger side beside the front door
    this.companionPos.set(
      this.position.x + cosH * 1.85 - sinH * 0.4,
      0,
      this.position.z - sinH * 1.85 - cosH * 0.4,
    );
    this.walkerHeading = this.heading;
    this.companionHeading = this.heading;
    this.companionMoveSpeed = 0;
    this.walkerPitch = 0;
    this.walkBob = 0;
    this.isWalking = true;
    return true;
  }

  public enterVehicle(): boolean {
    if (!this.isWalking) return false;
    this.isWalking = false;
    this.walkBob = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    return true;
  }

  public toggleFlight(): void {
    if (this.isWalking || this.flightState === 'space' || this.flightState === 'launching') {
      return;
    }
    if (this.flightState === 'road' || this.flightState === 'descending') {
      this.flightState = 'ascending';
      this.targetFlightAltitude = 104;
      if (this.forwardSpeed < 16) {
        this.forwardSpeed = Math.max(this.forwardSpeed, 16);
      }
    } else if (this.flightState === 'ascending' || this.flightState === 'flight' || this.flightState === 'entering') {
      this.flightState = 'descending';
    }
  }

  public launchToSpace(): void {
    if (this.isWalking) return;
    if (this.flightState !== 'ascending' && this.flightState !== 'flight') return;
    this.flightState = 'launching';
    if (this.forwardSpeed < 42) {
      this.forwardSpeed = 42;
    }
  }

  public enterPlanet(planet: PlanetConfig): void {
    if (this.flightState !== 'space') return;
    this.activePlanetId = planet.id;
    this.onPlanetSwitch?.(planet.id);
    this.position.set(0, 390, 0);
    this.targetFlightAltitude = 104;
    this.forwardSpeed = 44;
    this.verticalSpeed = -26;
    this.spacePitch = 0;
    this.flightState = 'entering';
  }

  public update(
    dt: number,
    inputs: ControlInputs,
    weather: WeatherMode,
    elapsed: number,
    nearbyBuildings: BuildingFootprint[],
    canWalkAt?: (x: number, z: number) => boolean,
    options?: {
      holdHands?: boolean;
      freezeWalking?: boolean;
      skipCarCollision?: boolean;
      clampWalkBounds?: (pos: THREE.Vector3) => void;
    },
  ): void {
    const delta = Math.min(dt, 0.05);

    if (this.isWalking) {
      if (!options?.freezeWalking) {
        this.updateWalking(delta, inputs, elapsed, nearbyBuildings, canWalkAt, options);
      }
      return;
    }

    if (this.flightState === 'space') {
      this.updateSpacePhysics(delta, inputs, elapsed);
      return;
    }

    if (inputs.brake) {
      this.boostTimer = 0;
    } else if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - delta);
    }

    const boostActive = this.boostTimer > 0 || inputs.boost;
    const isRoad = this.flightState === 'road';
    const wetFactor = weather === 'rain' ? 0.35 : weather === 'storm' ? 0.55 : 0;

    const maxForward = isRoad
      ? boostActive
        ? 98
        : 68
      : this.flightState === 'launching'
        ? 135
        : boostActive
          ? 126
          : 86;
    const maxReverse = isRoad ? -14 : 0;

    const speedRatio = Math.abs(this.forwardSpeed) / maxForward;
    const torqueCurve = Math.max(0.25, 1.0 - speedRatio * 0.64);
    const engineAccel = (boostActive ? 46 : 24) * torqueCurve;
    const brakeDecel = isRoad ? 34 : 28;

    let longitudinalAccel = 0;

    if (inputs.throttle || boostActive || this.flightState === 'launching') {
      if (this.forwardSpeed < 0) {
        longitudinalAccel = brakeDecel;
      } else {
        longitudinalAccel = engineAccel * (1 - Math.pow(speedRatio, 2.2));
      }
    } else if (inputs.brake) {
      if (this.forwardSpeed > 0.6) {
        longitudinalAccel = -brakeDecel;
      } else if (isRoad) {
        longitudinalAccel = -12;
      } else {
        this.forwardSpeed = THREE.MathUtils.damp(this.forwardSpeed, 0, 6, delta);
      }
    }

    const aeroDrag = (isRoad ? 0.0011 : 0.0007) * this.forwardSpeed * Math.abs(this.forwardSpeed);
    const rollingDrag = isRoad
      ? Math.sign(this.forwardSpeed) * (Math.abs(this.forwardSpeed) > 0.2 ? 0.75 : 0)
      : this.forwardSpeed * 0.04;

    this.forwardSpeed += (longitudinalAccel - aeroDrag - rollingDrag) * delta;
    if (!inputs.throttle && !boostActive && !inputs.brake && this.flightState !== 'launching' && Math.abs(this.forwardSpeed) < 0.15) {
      this.forwardSpeed = 0;
    }
    this.forwardSpeed = THREE.MathUtils.clamp(this.forwardSpeed, maxReverse, maxForward);

    const netLongAccel = (this.forwardSpeed - this.prevForwardSpeed) / Math.max(0.001, delta);
    this.prevForwardSpeed = this.forwardSpeed;

    const digitalSteer = (inputs.steerLeft ? 1 : 0) - (inputs.steerRight ? 1 : 0);
    const rawSteer = THREE.MathUtils.clamp(digitalSteer + inputs.steerAxis, -1, 1);
    const steerResponsiveness = isRoad ? 7.5 : 4.2;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, rawSteer, steerResponsiveness, delta);

    if (isRoad) {
      const absSpeed = Math.abs(this.forwardSpeed);
      const lowSpeedFactor = THREE.MathUtils.clamp(absSpeed / 6, 0, 1);
      const highSpeedDamp = 1 / (1 + absSpeed * 0.022);
      const reverseSign = this.forwardSpeed >= -0.05 ? 1 : -1;
      const yawRate = this.steerAngle * 1.45 * lowSpeedFactor * highSpeedDamp * reverseSign;

      this.heading += yawRate * delta;

      const centripetal = this.forwardSpeed * yawRate;
      const targetSlip = centripetal * (0.045 + wetFactor * 0.075);
      const gripLambda = 9.0 - wetFactor * 3.8;
      this.lateralSpeed = THREE.MathUtils.damp(this.lateralSpeed, targetSlip, gripLambda, delta);

      const targetPitch = THREE.MathUtils.clamp(netLongAccel * 0.0022, -0.045, 0.045);
      const targetRoll = THREE.MathUtils.clamp(-centripetal * 0.0032, -0.06, 0.06);
      this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 8, delta);
      this.roll = THREE.MathUtils.damp(this.roll, targetRoll, 8, delta);

      this.distanceTraveled += absSpeed * delta;
      const roadWave =
        (Math.sin(this.distanceTraveled * 0.16) * 0.012 +
          Math.sin(this.distanceTraveled * 0.43) * 0.005) *
        THREE.MathUtils.clamp(absSpeed / 25, 0, 1);
      this.suspensionHeave = THREE.MathUtils.damp(this.suspensionHeave, roadWave, 14, delta);
    } else {
      const yawRate = this.steerAngle * (0.58 + 0.25 * Math.min(1, this.forwardSpeed / 40));
      this.heading += yawRate * delta;
      this.lateralSpeed = THREE.MathUtils.damp(this.lateralSpeed, 0, 5, delta);

      const bankTarget = this.steerAngle * 0.34;
      this.roll = THREE.MathUtils.damp(this.roll, bankTarget, 4.2, delta);

      if (this.flightState === 'flight') {
        const climbInput = (inputs.climb ? 1 : 0) - (inputs.descend ? 1 : 0);
        this.targetFlightAltitude = THREE.MathUtils.clamp(
          this.targetFlightAltitude + climbInput * 26 * delta,
          68,
          165,
        );
      }

      const cloudFloat = Math.sin(elapsed * 0.9) * 0.08 + Math.cos(elapsed * 0.47) * 0.05;
      this.suspensionHeave = THREE.MathUtils.damp(this.suspensionHeave, cloudFloat, 4, delta);
    }

    if (this.flightState === 'ascending') {
      const altErr = this.targetFlightAltitude - this.position.y;
      const desiredVy = THREE.MathUtils.clamp(altErr * 0.95, 8, 34);
      this.verticalSpeed = THREE.MathUtils.damp(this.verticalSpeed, desiredVy, 3.2, delta);
      this.position.y += this.verticalSpeed * delta;

      const climbPitch = THREE.MathUtils.clamp(this.verticalSpeed * 0.0075, -0.05, 0.22);
      this.pitch = THREE.MathUtils.damp(this.pitch, climbPitch, 4.5, delta);

      if (Math.abs(altErr) < 2.2) {
        this.flightState = 'flight';
      }
    } else if (this.flightState === 'flight') {
      const altErr = this.targetFlightAltitude - this.position.y;
      const desiredVy = THREE.MathUtils.clamp(altErr * 1.4, -22, 22);
      this.verticalSpeed = THREE.MathUtils.damp(this.verticalSpeed, desiredVy, 4, delta);
      this.position.y += this.verticalSpeed * delta;

      const flightPitch =
        THREE.MathUtils.clamp(this.verticalSpeed * 0.007, -0.15, 0.15) -
        THREE.MathUtils.clamp(netLongAccel * 0.0012, -0.04, 0.04);
      this.pitch = THREE.MathUtils.damp(this.pitch, flightPitch, 5, delta);
    } else if (this.flightState === 'launching') {
      const targetSpaceExitY = 420;
      const desiredVy = 72;
      this.verticalSpeed = THREE.MathUtils.damp(this.verticalSpeed, desiredVy, 2.4, delta);
      this.position.y += this.verticalSpeed * delta;
      this.pitch = THREE.MathUtils.damp(this.pitch, 0.34, 3.5, delta);

      if (this.position.y >= targetSpaceExitY) {
        const planet = getPlanetConfig(this.activePlanetId);
        // Transition smoothly above the planet's orbital horizon looking outward across the system
        this.spacePos.set(
          planet.spacePos.x,
          planet.spacePos.y + planet.radius + 95,
          planet.spacePos.z + 75,
        );
        this.spacePitch = 0.06;
        this.spaceSpeed = 115;
        this.flightState = 'space';
        this.spaceFactor = 1;
        return;
      }
    } else if (this.flightState === 'entering') {
      const altErr = this.targetFlightAltitude - this.position.y;
      const desiredVy = THREE.MathUtils.clamp(altErr * 0.65, -58, -14);
      this.verticalSpeed = THREE.MathUtils.damp(this.verticalSpeed, desiredVy, 2.8, delta);
      this.position.y += this.verticalSpeed * delta;
      this.pitch = THREE.MathUtils.damp(this.pitch, -0.22, 3.8, delta);

      if (this.position.y <= this.targetFlightAltitude + 4) {
        this.flightState = 'flight';
      }
    } else if (this.flightState === 'descending') {
      const alt = this.position.y;
      const desiredVy = -THREE.MathUtils.clamp(alt * 0.85 + 2.5, 2.2, 32);
      this.verticalSpeed = THREE.MathUtils.damp(this.verticalSpeed, desiredVy, 3.8, delta);
      this.position.y += this.verticalSpeed * delta;

      const divePitch = THREE.MathUtils.clamp(this.verticalSpeed * 0.0055, -0.16, 0.02);
      this.pitch = THREE.MathUtils.damp(this.pitch, divePitch, 4.5, delta);

      if (this.position.y <= 0.08) {
        this.position.y = 0;
        this.verticalSpeed = 0;
        this.flightState = 'road';
        this.suspensionHeave = -0.11;
      }
    } else {
      this.position.y = 0;
      this.verticalSpeed = 0;
    }

    this.spaceFactor = THREE.MathUtils.clamp((this.position.y - 165) / 245, 0, 1);

    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    this.position.x += (-sinH * this.forwardSpeed + cosH * this.lateralSpeed) * delta;
    this.position.z += (-cosH * this.forwardSpeed - sinH * this.lateralSpeed) * delta;

    const carRadius = 4.2;
    for (let i = 0; i < nearbyBuildings.length; i++) {
      const b = nearbyBuildings[i];
      if (this.position.y > b.height + 1.5) continue;

      const dx = this.position.x - b.x;
      const dz = this.position.z - b.z;
      const ex = b.halfW + carRadius;
      const ez = b.halfD + carRadius;

      if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
        const penX = ex - Math.abs(dx);
        const penZ = ez - Math.abs(dz);
        if (penX < penZ) {
          this.position.x += Math.sign(dx || 1) * penX;
        } else {
          this.position.z += Math.sign(dz || 1) * penZ;
        }
        this.forwardSpeed *= 0.92;
      }
    }
  }

  private updateSpacePhysics(delta: number, inputs: ControlInputs, elapsed: number): void {
    this.spaceFactor = 1;
    if (inputs.brake) {
      this.boostTimer = 0;
    } else if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - delta);
    }
    const boostActive = this.boostTimer > 0 || inputs.boost;
    const maxSpace = boostActive ? 325 : 195;
    const minSpace = -55;

    if (inputs.throttle || boostActive) {
      this.spaceSpeed += (boostActive ? 120 : 62) * delta;
    } else if (inputs.brake) {
      this.spaceSpeed -= 85 * delta;
    } else {
      // Meditative low-friction glide in deep space
      this.spaceSpeed = THREE.MathUtils.damp(this.spaceSpeed, 0, 0.25, delta);
    }
    this.spaceSpeed = THREE.MathUtils.clamp(this.spaceSpeed, minSpace, maxSpace);
    this.forwardSpeed = this.spaceSpeed;

    const digitalSteer = (inputs.steerLeft ? 1 : 0) - (inputs.steerRight ? 1 : 0);
    const rawSteer = THREE.MathUtils.clamp(digitalSteer + inputs.steerAxis, -1, 1);
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, rawSteer, 4.2, delta);

    const yawRate = this.steerAngle * 0.85;
    this.heading += yawRate * delta;

    const pitchInput = (inputs.climb ? 1 : 0) - (inputs.descend ? 1 : 0);
    this.spacePitch = THREE.MathUtils.clamp(this.spacePitch + pitchInput * 0.72 * delta, -1.05, 1.05);

    this.pitch = THREE.MathUtils.damp(this.pitch, this.spacePitch, 5.5, delta);
    this.roll = THREE.MathUtils.damp(this.roll, this.steerAngle * 0.36, 4.5, delta);
    this.suspensionHeave = Math.sin(elapsed * 0.6) * 0.04;

    const cosP = Math.cos(this.spacePitch);
    _spaceDir.set(
      -Math.sin(this.heading) * cosP,
      Math.sin(this.spacePitch),
      -Math.cos(this.heading) * cosP,
    );
    this.spacePos.addScaledVector(_spaceDir, this.spaceSpeed * delta);

    // Soft spherical orbital repulsion around nearby procedural planets' upper atmospheres
    const activePlanets = getActiveSpacePlanets(this.spacePos, 16);
    for (let i = 0; i < activePlanets.length; i++) {
      const p = activePlanets[i];
      _toPlanet.subVectors(this.spacePos, p.spacePos);
      const minDist = p.radius + 24;
      const distSq = _toPlanet.lengthSq();
      if (distSq < minDist * minDist && distSq > 0.001) {
        _toPlanet.normalize().multiplyScalar(minDist);
        this.spacePos.copy(p.spacePos).add(_toPlanet);
      }
    }
  }

  private updateWalking(
    delta: number,
    inputs: ControlInputs,
    elapsed: number,
    nearbyBuildings: BuildingFootprint[],
    canWalkAt?: (x: number, z: number) => boolean,
    options?: {
      holdHands?: boolean;
      skipCarCollision?: boolean;
      clampWalkBounds?: (pos: THREE.Vector3) => void;
    },
  ): void {
    this.spaceFactor = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - delta);
    }
    const boostActive = this.boostTimer > 0 || inputs.boost;

    const digitalSteer = (inputs.steerLeft ? 1 : 0) - (inputs.steerRight ? 1 : 0);
    const turnInput = THREE.MathUtils.clamp(digitalSteer + inputs.steerAxis, -1, 1);
    this.walkerHeading += turnInput * 2.1 * delta;

    const moveInput = (inputs.throttle ? 1 : 0) - (inputs.brake ? 0.72 : 0);
    const walkSpeed = boostActive ? 8.0 : 4.4;
    const step = moveInput * walkSpeed;

    this.forwardSpeed = Math.abs(step);

    if (Math.abs(step) > 0.01) {
      const nextX = this.walkerPos.x - Math.sin(this.walkerHeading) * step * delta;
      const nextZ = this.walkerPos.z - Math.cos(this.walkerHeading) * step * delta;
      if (!canWalkAt || canWalkAt(nextX, nextZ)) {
        this.walkerPos.x = nextX;
        this.walkerPos.z = nextZ;
      }
      this.walkBob = THREE.MathUtils.damp(
        this.walkBob,
        Math.sin(elapsed * (boostActive ? 12.5 : 8.8)) * 0.042,
        14,
        delta,
      );
    } else {
      this.walkBob = THREE.MathUtils.damp(this.walkBob, 0, 10, delta);
    }

    // Collide player with buildings / furniture / parked car
    this.resolveWalkObstacles(this.walkerPos, 0.58, nearbyBuildings, Boolean(options?.skipCarCollision));
    options?.clampWalkBounds?.(this.walkerPos);

    // Update companion walking alongside the player (closer when holding hands!)
    const wSin = Math.sin(this.walkerHeading);
    const wCos = Math.cos(this.walkerHeading);
    const sideGap = options?.holdHands ? 0.76 : 1.15;
    const fwdGap = options?.holdHands ? -0.15 : -0.65;
    const targetX = this.walkerPos.x + wCos * sideGap + wSin * fwdGap;
    const targetZ = this.walkerPos.z - wSin * sideGap + wCos * fwdGap;

    const toTargetX = targetX - this.companionPos.x;
    const toTargetZ = targetZ - this.companionPos.z;
    const distToAnchor = Math.hypot(toTargetX, toTargetZ);

    const toPlayerX = this.walkerPos.x - this.companionPos.x;
    const toPlayerZ = this.walkerPos.z - this.companionPos.z;
    const distToPlayer = Math.hypot(toPlayerX, toPlayerZ);

    const playerIsMoving = Math.abs(step) > 0.05;
    const anchorThresh = options?.holdHands ? 0.22 : playerIsMoving ? 0.35 : 1.75;
    if (distToAnchor > anchorThresh || distToPlayer > (options?.holdHands ? 1.25 : 2.3)) {
      const followSpeed = distToAnchor > 3.5 ? 6.2 : inputs.boost ? 7.6 : 4.4;
      const moveDist = Math.min(distToAnchor, followSpeed * delta);
      if (distToAnchor > 0.001) {
        this.companionPos.x += (toTargetX / distToAnchor) * moveDist;
        this.companionPos.z += (toTargetZ / distToAnchor) * moveDist;
        const desiredHeading = options?.holdHands && !playerIsMoving ? this.walkerHeading : Math.atan2(-toTargetX, -toTargetZ);
        let diff = ((desiredHeading - this.companionHeading + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        this.companionHeading += diff * Math.min(1, delta * 7.5);
      }
      this.companionMoveSpeed = THREE.MathUtils.damp(this.companionMoveSpeed, followSpeed, 10, delta);
    } else {
      this.companionMoveSpeed = THREE.MathUtils.damp(this.companionMoveSpeed, 0, 10, delta);
      if (!playerIsMoving && distToPlayer > 0.2) {
        const facePlayerHeading = Math.atan2(-toPlayerX, -toPlayerZ);
        let diff = ((facePlayerHeading - this.companionHeading + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        this.companionHeading += diff * Math.min(1, delta * 4.5);
      }
    }

    this.resolveWalkObstacles(this.companionPos, 0.48, nearbyBuildings, Boolean(options?.skipCarCollision));
    options?.clampWalkBounds?.(this.companionPos);
  }

  private resolveWalkObstacles(
    pos: THREE.Vector3,
    pedRadius: number,
    nearbyBuildings: BuildingFootprint[],
    skipCarCollision = false,
  ): void {
    for (let i = 0; i < nearbyBuildings.length; i++) {
      const b = nearbyBuildings[i];
      const dx = pos.x - b.x;
      const dz = pos.z - b.z;
      const ex = b.halfW + pedRadius;
      const ez = b.halfD + pedRadius;

      if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
        const penX = ex - Math.abs(dx);
        const penZ = ez - Math.abs(dz);
        if (penX < penZ) {
          pos.x += Math.sign(dx || 1) * penX;
        } else {
          pos.z += Math.sign(dz || 1) * penZ;
        }
      }
    }

    if (skipCarCollision) return;

    const relX = pos.x - this.position.x;
    const relZ = pos.z - this.position.z;
    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    const localX = relX * cosH - relZ * sinH;
    const localZ = relX * sinH + relZ * cosH;

    const halfCarW = 1.42;
    const halfCarBack = 1.98;
    const halfCarFront = 2.75;
    if (localX > -halfCarW && localX < halfCarW && localZ > -halfCarFront && localZ < halfCarBack) {
      const penLeft = localX + halfCarW;
      const penRight = halfCarW - localX;
      const penFront = localZ + halfCarFront;
      const penBack = halfCarBack - localZ;
      const minPen = Math.min(penLeft, penRight, penFront, penBack);

      let pushedX = localX;
      let pushedZ = localZ;
      if (minPen === penLeft) pushedX = -halfCarW;
      else if (minPen === penRight) pushedX = halfCarW;
      else if (minPen === penFront) pushedZ = -halfCarFront;
      else pushedZ = halfCarBack;

      pos.x = this.position.x + pushedX * cosH + pushedZ * sinH;
      pos.z = this.position.z - pushedX * sinH + pushedZ * cosH;
    }
  }
}
