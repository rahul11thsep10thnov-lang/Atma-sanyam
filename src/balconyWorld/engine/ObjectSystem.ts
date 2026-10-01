import * as THREE from 'three';
import { AssetDefinition, UserPlacedObject } from '../state/types';
import { getAsset } from '../catalog/AssetCatalog';
import { PROCEDURAL_BUILDERS } from '../catalog/procedural/builders';
import { blobShadowTexture } from './materials';
import { QualityProfile } from './QualityProfile';

export interface PlacedObject {
  record: UserPlacedObject;
  def: AssetDefinition;
  group: THREE.Group;
}

/** Owns every object in the scene (architecture doc, section B): builds it
 * from its catalog entry, keeps the live three.js group and the persistent
 * record in step, and exposes picking, moving and ambient animation. Knows
 * nothing about gestures or storage. */
export class ObjectSystem {
  private objects = new Map<string, PlacedObject>();
  private blobMaterial: THREE.MeshBasicMaterial;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly profile: QualityProfile,
  ) {
    this.blobMaterial = new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false });
  }

  add(record: UserPlacedObject): PlacedObject | null {
    const def = getAsset(record.assetId);
    if (!def) return null;
    const build = def.kind === 'procedural' ? PROCEDURAL_BUILDERS[def.ref] : undefined;
    if (!build) return null; // glb loading arrives with the asset pipeline step

    const group = build();
    group.userData.objectId = record.id;
    group.position.set(...record.position);
    group.rotation.set(...record.rotation);
    group.scale.setScalar(record.scale);

    if (this.profile.level === 'LOW') {
      group.getObjectByName('prop-light')?.removeFromParent();
    }
    if (!this.profile.shadowMap && def.footprint[2] > 0.05) {
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(def.footprint[0] * 1.35, def.footprint[1] * 1.35), this.blobMaterial);
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.004;
      blob.name = 'blob-shadow';
      blob.renderOrder = 1;
      group.add(blob);
    }

    this.scene.add(group);
    const placed = { record, def, group };
    this.objects.set(record.id, placed);
    return placed;
  }

  remove(id: string) {
    const obj = this.objects.get(id);
    if (!obj) return;
    this.scene.remove(obj.group);
    this.objects.delete(id);
  }

  get(id: string) {
    return this.objects.get(id) ?? null;
  }

  list(): PlacedObject[] {
    return Array.from(this.objects.values());
  }

  records(): UserPlacedObject[] {
    return this.list().map((o) => o.record);
  }

  moveTo(id: string, position: THREE.Vector3) {
    const obj = this.objects.get(id);
    if (!obj) return;
    obj.group.position.copy(position);
    obj.record = { ...obj.record, position: [position.x, position.y, position.z], updatedAt: Date.now() };
  }

  /** The placed object under a ray, if any (walks up from the hit mesh). */
  pick(raycaster: THREE.Raycaster): PlacedObject | null {
    const groups = this.list().map((o) => o.group);
    const hits = raycaster.intersectObjects(groups, true);
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node && node.userData.objectId === undefined) node = node.parent;
      if (node) {
        const obj = this.objects.get(node.userData.objectId as string);
        if (obj) return obj;
      }
    }
    return null;
  }

  /** Bounding sphere for camera framing. */
  boundsOf(obj: PlacedObject): { center: THREE.Vector3; radius: number } {
    const [w, d, h] = obj.def.footprint;
    const center = obj.group.position.clone().add(new THREE.Vector3(0, (h * obj.record.scale) / 2, 0));
    const radius = (Math.sqrt(w * w + d * d + h * h) / 2) * obj.record.scale;
    return { center, radius };
  }

  /** Leaf sway and anything else flagged for ambient motion — a few
   * rotations per frame, capped by the profile's ambient fps upstream. */
  updateAmbient(timeSeconds: number) {
    let index = 0;
    for (const obj of this.objects.values()) {
      obj.group.traverse((node) => {
        if (node.userData.sway) {
          node.rotation.z = Math.sin(timeSeconds * 0.9 + index * 1.7) * 0.028;
          node.rotation.x = Math.sin(timeSeconds * 0.6 + index) * 0.018;
          index++;
        }
      });
    }
  }
}
