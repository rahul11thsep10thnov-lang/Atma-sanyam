'use client';

import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { ErrorAlert, Forbidden, Kpi, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Item { key: string; name: string; description: string; kind: string; emoji: string; color: string; price: number; premiumOnly: boolean; status: string; sortOrder: number; owners: number }
interface Data { items: Item[]; economy: { earned: number; spent: number; transactions: number; purchases: number } }
interface RankRow { gameId: string; kind: string; label: string; events: number; players: number; wins: number; last7d: number }

const KINDS = ['avatar_accessory', 'theme', 'board_skin', 'background', 'badge', 'effect', 'token_design', 'craft_template'];

export default function RewardsPage() {
  const can = useCan();
  const { data, error, reload } = useApi<Data>(can('content:read') ? 'reward-items' : null);
  const { data: rankings } = useApi<{ games: RankRow[] }>(can('analytics:read') ? 'rankings/overview' : null);
  const [draft, setDraft] = useState({ key: '', name: '', description: '', kind: 'avatar_accessory', emoji: '🎁', color: '#FFC93C', price: 30, premiumOnly: false });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!can('content:read')) return <Forbidden />;
  const canEdit = can('content:write');
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try { await api('reward-items', { method: 'POST', body: { ...draft, price: Number(draft.price) } }); setOk('Item created.'); setDraft((d) => ({ ...d, key: '', name: '', description: '' })); void reload(); } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }
  async function patch(key: string, body: Record<string, unknown>) {
    setBusy(true); setErr(null);
    try { await api(`reward-items/${key}`, { method: 'PATCH', body }); void reload(); } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }
  return (
    <div>
      <PageHead title="Coins, rewards & rankings" subtitle="The cosmetic reward shop (bought with coins earned by playing and learning — never with money), the coin economy, and how each ranked game is scored. Coin values and caps live under Feature flags & config → Coins & rewards." />
      <ErrorAlert error={error ?? err} />
      <OkAlert message={ok} />
      {data && (
        <div className="kpis">
          <Kpi label="Coins earned" value={data.economy.earned} sub="all children, all time" />
          <Kpi label="Coins spent" value={data.economy.spent} sub={`${data.economy.purchases} purchases`} />
          <Kpi label="Ledger entries" value={data.economy.transactions} sub="every change is one row" />
          <Kpi label="Shop items" value={data.items.filter((i) => i.status === 'published').length} sub={`${data.items.length} total`} />
        </div>
      )}
      <section className="card">
        <div className="card-head"><h2>Shop items</h2></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Item</th><th>Kind</th><th className="num">Price</th><th>Who</th><th className="num">Owners</th><th>Status</th>{canEdit && <th />}</tr></thead>
          <tbody>
            {data?.items.map((i) => (
              <tr key={i.key}>
                <td>{i.emoji} <strong>{i.name}</strong><div className="small muted">{i.key} · {i.description}</div></td>
                <td>{i.kind.replace('_', ' ')}</td>
                <td className="num">{canEdit ? <input className="input" type="number" min={0} defaultValue={i.price} style={{ width: 90 }} onBlur={(e) => { const v = Number(e.target.value); if (v !== i.price) void patch(i.key, { price: v }); }} aria-label={`Price of ${i.name}`} /> : i.price}</td>
                <td>{i.premiumOnly ? <span className="badge">subscribers</span> : 'everyone'}</td>
                <td className="num">{i.owners}</td>
                <td><StatusBadge status={i.status} /></td>
                {canEdit && <td className="row">{i.status !== 'published' && <button className="btn btn-sm" onClick={() => patch(i.key, { status: 'published' })} disabled={busy}>Publish</button>}{i.status === 'published' && <button className="btn btn-sm" onClick={() => patch(i.key, { status: 'archived' })} disabled={busy}>Archive</button>}<button className="btn btn-sm" onClick={() => patch(i.key, { premiumOnly: !i.premiumOnly })} disabled={busy}>{i.premiumOnly ? 'Open to all' : 'Subscribers only'}</button></td>}
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
      {canEdit && (
        <form onSubmit={create} className="card" style={{ marginTop: 16 }}>
          <h2>New item</h2>
          <div className="grid-2">
            <label className="field"><span>Key</span><input className="input" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required /></label>
            <label className="field"><span>Name</span><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label>
            <label className="field"><span>Kind</span><select className="input" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>{KINDS.map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}</select></label>
            <label className="field"><span>Emoji</span><input className="input" value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} /></label>
            <label className="field"><span>Colour</span><input className="input" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></label>
            <label className="field"><span>Price (coins)</span><input className="input" type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label>
            <label className="check"><input type="checkbox" checked={draft.premiumOnly} onChange={(e) => setDraft({ ...draft, premiumOnly: e.target.checked })} /> Subscribers only</label>
          </div>
          <label className="field"><span>Description</span><input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          <button className="btn btn-primary" type="submit" disabled={busy}>Create</button>
        </form>
      )}
      {rankings && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><h2>Rankings</h2><span className="small muted">Results are written by the server once per session after validation; abandoned, too-short and out-of-range games never count.</span></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Game</th><th>Scoring</th><th className="num">Results</th><th className="num">Players</th><th className="num">Wins</th><th className="num">Last 7 days</th></tr></thead>
            <tbody>{rankings.games.map((g) => <tr key={g.gameId}><td>{g.gameId}</td><td className="small">{g.kind} · {g.label}</td><td className="num">{g.events}</td><td className="num">{g.players}</td><td className="num">{g.wins}</td><td className="num">{g.last7d}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}
