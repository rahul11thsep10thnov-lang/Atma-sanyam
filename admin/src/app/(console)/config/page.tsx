'use client';

import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ErrorAlert, Forbidden, OkAlert, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

type Value = Record<string, string | number | boolean>;

interface Setting {
  key: string;
  label: string;
  description: string;
  value: Value;
  defaults: Value;
  updatedAt: string | null;
}

const FIELD_HELP: Record<string, string> = {
  minimumVersion: 'Older app versions must update before they can continue.',
  latestVersion: 'Older app versions see a dismissible “update available” notice.',
  iosStoreUrl: 'App Store link opened by the update button (fill after first release).',
  androidStoreUrl: 'Play Store link opened by the update button (fill after first release).',
  announcement: 'Optional banner on the guardian dashboard. Leave empty to hide.',
  games: 'Show the Games tab in the Player Console.',
  artAndCraft: 'Show the Art & Craft tab in the Player Console.',
  didYouKnow: 'Show the Did You Know? tab in the Player Console.',
  liveMirroring: 'Allow guardians to watch a child\'s game live (guardians can still turn it off per child).',
  pushNotifications: 'Offer push notifications to guardians.',
  showInDevelopmentGames: 'Show games marked in_development to players (never in production).',
  studyPlayfully: 'Show the Study Playfully section of the Learn tab.',
  music: 'Show the Music section of the Learn tab.',
  sports: 'Show the Sports section of the Learn tab.',
  rankings: 'Global leaderboards (guardians can still opt a child out).',
  rewardShop: 'The coin reward shop (guardians can still close it per child).',
  ads: 'Allow interstitial ads for households without a subscription. Subscribers never see ads.',
  adSupportedAccess: 'Let households WITHOUT a subscription play with ads instead of being locked out. Off = the monthly plan is required (default).',
  tutorialCompleted: 'Coins for finishing a game\'s How to Play tutorial (once per game).',
  gameCompleted: 'Coins for finishing a game.',
  gameWon: 'Coins for winning a board game (Ludo, Chess, Checkers, Connect Four, Snakes & Ladders).',
  puzzleSolvedMin: 'Coins for an easy puzzle; harder levels scale up to the max.',
  puzzleSolvedMax: 'Coins for a hard puzzle.',
  dailyChallenge: 'Bonus for finishing the daily challenge game.',
  craftCompleted: 'Coins for finishing a craft (once per craft).',
  lessonCompleted: 'Coins for finishing a lesson (once per lesson).',
  quizCompleted: 'Coins for a correct Did You Know? quiz answer (once per question).',
  factDiscovered: 'Coins for reading a fact for the first time.',
  dailyCap: 'Most coins a child can earn per day. Guardians can lower it per child.',
  shopEnabled: 'Open the reward shop for everyone (guardians can still close it per child).',
  minPlayedForBoard: 'Games a child must have finished before appearing on a leaderboard.',
  showBracketFilter: 'Let children filter boards by age group.',
  showImprovement: 'Show week-over-week improvement arrows.',
  boardSize: 'Rows shown on a leaderboard.',
  firstAdTargetSeconds: 'Earliest moment (after the console opens) an ad may show before the first game. A target, not a promise.',
  betweenGamesTargetSeconds: 'Earliest moment after the last ad an ad may show between games.',
  minGapSeconds: 'Minimum seconds between two ads.',
  maxPerHour: 'Most ads per hour per device.',
  maxPerDay: 'Most ads per day per device.',
  loadTimeoutMs: 'How long the app waits for an ad to load before continuing without one.',
  testMode: 'Use Google\'s sample ad units (nothing is paid out). Turn off only with real unit ids in the server environment.',
  playerWelcome: '{name} is replaced with the child\'s nickname.',
  dailyLimitMinutes: 'Default daily playtime for new child profiles.',
  sessionLimitMinutes: 'Default length of one play session for new child profiles.',
  maxChildrenPerGuardian: 'How many child profiles one family account may have.',
};

const FIELD_LABELS: Record<string, string> = {
  enabled: 'Maintenance mode on',
  message: 'Message shown to people',
  minimumVersion: 'Minimum supported version',
  latestVersion: 'Latest version',
  updateMessage: 'Update message',
  iosStoreUrl: 'App Store URL',
  androidStoreUrl: 'Google Play URL',
  games: 'Games',
  artAndCraft: 'Art & Craft',
  didYouKnow: 'Did You Know?',
  liveMirroring: 'Live mirroring',
  pushNotifications: 'Push notifications',
  showInDevelopmentGames: 'Show in-development games',
  announcement: 'Dashboard announcement',
  guardianWelcome: 'Guardian welcome text',
  playerWelcome: 'Player welcome text',
  subscriptionPitch: 'Subscription pitch',
  timeUpMessage: 'Time-up message',
  dailyLimitMinutes: 'Daily limit (minutes)',
  sessionLimitMinutes: 'Session limit (minutes)',
  maxChildrenPerGuardian: 'Max children per guardian',
  studyPlayfully: 'Study Playfully',
  music: 'Music',
  sports: 'Sports',
  rankings: 'Rankings',
  rewardShop: 'Reward shop',
  ads: 'Ads (non-subscribers)',
  adSupportedAccess: 'Ad-supported access without a subscription',
  tutorialCompleted: 'Tutorial finished',
  gameCompleted: 'Game finished',
  gameWon: 'Game won',
  puzzleSolvedMin: 'Puzzle solved (min)',
  puzzleSolvedMax: 'Puzzle solved (max)',
  dailyChallenge: 'Daily challenge',
  craftCompleted: 'Craft finished',
  lessonCompleted: 'Lesson finished',
  quizCompleted: 'Quiz answer right',
  factDiscovered: 'Fact discovered',
  dailyCap: 'Daily coin cap',
  shopEnabled: 'Reward shop open',
  minPlayedForBoard: 'Minimum games for a board',
  showBracketFilter: 'Age-group filter',
  showImprovement: 'Improvement arrows',
  boardSize: 'Board size',
  firstAdTargetSeconds: 'First-ad target (seconds)',
  betweenGamesTargetSeconds: 'Between-games target (seconds)',
  minGapSeconds: 'Minimum gap (seconds)',
  maxPerHour: 'Max ads per hour',
  maxPerDay: 'Max ads per day',
  loadTimeoutMs: 'Load timeout (ms)',
  testMode: 'Test ads',
};
const humanize = (k: string) => FIELD_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function SettingCard({ setting, canEdit, onSaved }: { setting: Setting; canEdit: boolean; onSaved: () => void }) {
  const [value, setValue] = useState<Value>(setting.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const dirty = JSON.stringify(value) !== JSON.stringify(setting.value);

  async function save() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api(`settings/${setting.key}`, { method: 'PUT', body: { value } });
      setOk('Saved. Apps pick this up within about a minute.');
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{setting.label}</h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>{setting.description}</p>
        </div>
        {setting.key === 'maintenance' && (
          <span className={`badge ${setting.value.enabled ? 'badge-danger' : 'badge-good'}`}>{setting.value.enabled ? 'App is in maintenance' : 'App is live'}</span>
        )}
      </div>
      <ErrorAlert error={error} />
      <OkAlert message={ok} />
      <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, margin: 0 }}>
        {Object.entries(setting.defaults).map(([field, def]) => {
          const v = value[field];
          const help = FIELD_HELP[field];
          if (typeof def === 'boolean') {
            return (
              <label key={field} className="check" title={help}>
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => setValue((s) => ({ ...s, [field]: e.target.checked }))} />
                <span>
                  {humanize(field)}
                  {help && <span className="small muted" style={{ display: 'block', fontWeight: 400 }}>{help}</span>}
                </span>
              </label>
            );
          }
          if (typeof def === 'number') {
            return (
              <label key={field} className="field">
                <span>{humanize(field)}</span>
                <input className="input" type="number" value={Number(v)} onChange={(e) => setValue((s) => ({ ...s, [field]: Number(e.target.value) }))} style={{ maxWidth: 160 }} />
                {help && <small>{help}</small>}
              </label>
            );
          }
          const long = /message|announcement/i.test(field);
          return (
            <label key={field} className="field">
              <span>{humanize(field)}</span>
              {long ? (
                <textarea className="input" value={String(v ?? '')} onChange={(e) => setValue((s) => ({ ...s, [field]: e.target.value }))} />
              ) : (
                <input className="input" value={String(v ?? '')} onChange={(e) => setValue((s) => ({ ...s, [field]: e.target.value }))} />
              )}
              {help && <small>{help}</small>}
            </label>
          );
        })}
      </fieldset>
      {canEdit && (
        <div className="row">
          <button className="btn btn-primary" onClick={save} disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="btn btn-ghost" onClick={() => setValue(setting.value)} disabled={!dirty || busy}>Discard</button>
          <button className="btn btn-ghost" onClick={() => setValue(setting.defaults)} disabled={busy}>Reset to defaults</button>
          <span className="spacer" />
          <span className="small muted">{setting.updatedAt ? `Last changed ${fmtDate(setting.updatedAt)}` : 'Using defaults'}</span>
        </div>
      )}
    </section>
  );
}

export default function ConfigPage() {
  const can = useCan();
  const { data, error, reload } = useApi<Setting[]>(can('settings:read') ? 'settings' : null);
  if (!can('settings:read')) return <Forbidden />;
  return (
    <div>
      <PageHead title="App configuration" subtitle="Changes apply to every installed app without a new release." />
      <ErrorAlert error={error} />
      {!can('settings:write') && <div className="alert alert-warn">You have read-only access to configuration.</div>}
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {data?.map((s) => (
          <SettingCard key={`${s.key}-${s.updatedAt}`} setting={s} canEdit={can('settings:write')} onSaved={reload} />
        ))}
      </div>
    </div>
  );
}
