import { notInArray, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import { permissions, rolePermissions, roles } from './schema.js';
import { PERMISSIONS, ROLES } from './rbac.js';

export async function syncRbac(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    const permRows = Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description }));
    await tx
      .insert(permissions)
      .values(permRows)
      .onConflictDoUpdate({ target: permissions.key, set: { description: sql`excluded.description` } });

    const roleRows = Object.entries(ROLES).map(([key, r]) => ({ key, name: r.name, description: r.description }));
    await tx
      .insert(roles)
      .values(roleRows)
      .onConflictDoUpdate({
        target: roles.key,
        set: { name: sql`excluded.name`, description: sql`excluded.description` },
      });

    await tx.delete(rolePermissions);
    const links = Object.entries(ROLES).flatMap(([roleKey, r]) =>
      r.permissions.map((permissionKey) => ({ roleKey, permissionKey }))
    );
    await tx.insert(rolePermissions).values(links);

    await tx.delete(permissions).where(notInArray(permissions.key, Object.keys(PERMISSIONS)));
  });
}
