import * as THREE from 'three';
import { PlacementZone, Vec3 } from '../state/types';
import { ObjectSystem, PlacedObject } from './ObjectSystem';

/** Screen point → surface point → validated position (architecture doc,
 * section E). The prototype handles the floor plane; wall, railing and
 * ceiling surfaces are the same raycast against a different plane and
 * arrive with the placement step. */
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
  pointOnFloor(ndc: THREE.Vector2, camera: THREE.Camera, zone: PlacementZone, footprint: Vec3, scale: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, hit)) return null;
    const halfW = (footprint[0] * scale) / 2;
    const halfD = (footprint[1] * scale) / 2;
    const minX = zone.center[0] - zone.size[0] / 2 + halfW;
    const maxX = zone.center[0] + zone.size[0] / 2 - halfW;
    const minZ = zone.center[2] - zone.size[1] / 2 + halfD;
    const maxZ = zone.center[2] + zone.size[1] / 2 - halfD;
    hit.x = Math.max(minX, Math.min(maxX, hit.x));
    hit.z = Math.max(minZ, Math.min(maxZ, hit.z));
    hit.y = zone.center[1];
    return hit;
  }

  /** Axis-aligned footprint overlap on the floor. Flat objects (rugs) never
   * collide — things are meant to sit on them. */
  overlaps(moving: PlacedObject, at: THREE.Vector3, others: PlacedObject[]): boolean {
    if (moving.def.footprint[2] <= 0.05) return false;
    const [mw, md] = moving.def.footprint;
    const ms = moving.record.scale;
    for (const other of others) {
      if (other.record.id === moving.record.id) continue;
      if (other.def.footprint[2] <= 0.05) continue;
      if (other.def.placementType !== 'floor') continue;
      const [ow, od] = other.def.footprint;
      const os = other.record.scale;
      const dx = Math.abs(at.x - other.group.position.x);
      const dz = Math.abs(at.z - other.group.position.z);
      if (dx < (mw * ms + ow * os) / 2 - 0.02 && dz < (md * ms + od * os) / 2 - 0.02) return true;
    }
    return false;
  }
}
