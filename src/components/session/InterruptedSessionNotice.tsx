// At launch: a focus session the app was closed during is settled as
// having left the app (spaces/focusEngine settleInterruptedSession), and
// the person is told what that cost.
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useSettings } from '../../context/SettingsContext';
import { settleInterruptedSession } from '../../spaces/focusEngine';
import { t } from '../../i18n';

export function InterruptedSessionNotice() {
  const { loading } = useSettings();
  const done = useRef(false);
  useEffect(() => {
    // wait for the settings, so the notice is in the chosen language
    if (loading || done.current) return;
    done.current = true;
    settleInterruptedSession()
      .then((r) => {
        if (!r) return;
        const p = r.penalty;
        const lines = [t('session.closedBody')];
        if (p?.where === 'balcony') lines.push(t('session.droopLine', { plant: p.plantName.toLowerCase() }), t('session.penaltyLine', { space: t('space.balcony').toLowerCase() }));
        else if (p) lines.push(t('session.noPlantGrew', { plant: p.plantName }), t('session.saplingLeft', { segment: t(`paradise.segment.${p.where}` as never) }));
        Alert.alert(t('session.closedTitle'), lines.join('\n\n'));
      })
      .catch(() => undefined);
  }, [loading]);
  return null;
}
