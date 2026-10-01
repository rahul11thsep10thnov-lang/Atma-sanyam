import * as THREE from 'three';
import { PlacementZone, Vec3 } from '../state/types';
import { ObjectSystem, PlacedObject } from './ObjectSystem';

/** Screen point → surface point → validated position (architecture doc,
 * section E). The prototype handles the floor plane; wall, railing and
 * ceiling surfaces are the same raycast against a different plane and
 * arrive with the placement step. */
/** Width/depth an object covers on the floor once its Y rotation is
 * applied (the axis-aligned box around the rotated footprint). */
export function floorExtent(footprint: Vec3, scale: number, rotationY: number): [number, number] {
  const c = Math.abs(Math.cos(rotationY));
  const s = Math.abs(Math.sin(rotationY));
  const [w, d] = footprint;
  return [(w * c + d * s) * scale, (w * s + d * c) * scale];
}

export class PlacementController {
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  pick(ndc: THREE.Vector2, camera: THREE.Camera, objects: ObjectSystem): PlacedObject | null {
    this.raycaster.setFromCamera(ndc, camera);
    return objects.pick(this.raycaster);
  }

  /** Where the finger points on the floor, clamped so the object's footprint
   * stays inside the zone. Null when the ray misses the floor (pointing at
   * the sky). */
  pointOnFloor(ndc: THREE.Vector2, camera: THREE.Camera, zone: PlacementZone, footprint: Vec3, scale: number, rotationY = 0): THREE.Vector3 | null {
    this.raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, hit)) return null;
    const [ew, ed] = floorExtent(footprint, scale, rotationY);
    const halfW = ew / 2;
    const halfD = ed / 2;
    const minX = zone.center[0] - zone.size[0] / 2 + halfW;
    const maxX = zone.center[0] + zone.size[0] / 2 - halfW;
    const minZ = zone.center[2] - zone.size[1] / 2 + halfD;
    const maxZ = zone.center[2] + zone.size[1] / 2 - halfD;
    hit.x = Math.max(minX, Math.min(maxX, hit.x));
    hit.z = Math.max(minZ, Math.min(maxZ, hit.z));
    hit.y = zone.center[1];
    return hit;
  }

  /** A free floor position for a new object: candidate points on a grid
   * across the zone, nearest the zone centre first, the first one that
   * neither leaves the zone nor overlaps anything. Null when the balcony is
   * full. */
  findFreeSpot(zone: PlacementZone, footprint: Vec3, scale: number, rotationY: number, others: PlacedObject[], step = 0.2): THREE.Vector3 | null {
    const [ew, ed] = floorExtent(footprint, scale, rotationY);
    const minX = zone.center[0] - zone.size[0] / 2 + ew / 2;
    const maxX = zone.center[0] + zone.size[0] / 2 - ew / 2;
    const minZ = zone.center[2] - zone.size[1] / 2 + ed / 2;
    const maxZ = zone.center[2] + zone.size[1] / 2 - ed / 2;
    if (minX > maxX || minZ > maxZ) return null;
    const candidates: THREE.Vector3[] = [];
    for (let x = minX; x <= maxX + 1e-6; x += step) for (let z = minZ; z <= maxZ + 1e-6; z += step) candidates.push(new THREE.Vector3(x, zone.center[1], z));
    const cx = zone.center[0];
    const cz = zone.center[2];
    candidates.sort((a, b) => (a.x - cx) ** 2 + (a.z - cz) ** 2 - ((b.x - cx) ** 2 + (b.z - cz) ** 2));
    const probe = { def: { footprint, placementType: 'floor' }, record: { id: '__probe__', scale, rotation: [0, rotationY, 0] } } as unknown as PlacedObject;
    for (const c of candidates) if (!this.overlaps(probe, c, others)) return c;
    return null;
  }

  /** Axis-aligned footprint overlap on the floor. Flat objects (rugs) never
   * collide — things are meant to sit on them. */
  overlaps(moving: PlacedObject, at: THREE.Vector3, others: PlacedObject[]): boolean {
    if (moving.def.footprint[2] <= 0.05) return false;
    const [mw, md] = floorExtent(moving.def.footprint, moving.record.scale, moving.record.rotation[1]);
    for (const other of others) {
      if (other.record.id === moving.record.id) continue;
      if (other.def.footprint[2] <= 0.05) continue;
      if (other.def.placementType !== 'floor') continue;
      const [ow, od] = floorExtent(other.def.footprint, other.record.scale, other.record.rotation[1]);
      const dx = Math.abs(at.x - other.group.position.x);
      const dz = Math.abs(at.z - other.group.position.z);
      if (dx < (mw + ow) / 2 - 0.02 && dz < (md + od) / 2 - 0.02) return true;
    }
    return false;
  }
}
