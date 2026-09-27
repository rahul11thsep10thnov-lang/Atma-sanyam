import { Router } from 'express';
import { z } from 'zod';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../lib/httpError.js';
import { audit } from '../../lib/audit.js';
import { isSettingKey, loadSettings, SETTING_DEFINITIONS, SETTING_KEYS, updateSetting } from '../../services/settingsService.js';
import type { AppDeps } from '../../types.js';

export function adminSettingsRouter({ db }: AppDeps, auth: Auth) {
  const r = Router();

  r.get('/', auth.requirePermission('settings:read'), async (_req, res) => {
    const { values, updatedAt } = await loadSettings(db);
    res.json(
      SETTING_KEYS.map((key) => ({
        key,
        label: SETTING_DEFINITIONS[key].label,
        description: SETTING_DEFINITIONS[key].description,
        value: values[key],
        defaults: SETTING_DEFINITIONS[key].defaults,
        updatedAt: updatedAt[key] ?? null,
      }))
    );
  });

  r.put('/:key', auth.requirePermission('settings:write'), async (req, res) => {
    const key = String(req.params.key ?? '');
    if (!isSettingKey(key)) throw notFound('Unknown setting');
    const body = parse(z.object({ value: z.unknown() }), req.body);
    const result = SETTING_DEFINITIONS[key].schema.safeParse(body.value);
    if (!result.success) {
      throw badRequest(
        'Invalid value',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      );
    }
    const row = await updateSetting(db, key, result.data, req.admin!.id);
    await audit(db, req.admin!.id, 'settings.updated', 'setting', key, { value: result.data });
    res.json({ key, value: row?.value, updatedAt: row?.updatedAt });
  });

  return r;
}
