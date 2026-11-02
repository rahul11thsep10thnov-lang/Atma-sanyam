'use client';

import { WORKFLOW } from '@/lib/dadu';
import { useCan } from '@/components/ConsoleShell';

/** The eight editorial steps, who acts at each and whether the signed-in admin may. */
export function WorkflowLegend({ current }: { current?: string }) {
  const can = useCan();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Step</th>
            <th>Who moves an item here</th>
            <th>You</th>
          </tr>
        </thead>
        <tbody>
          {WORKFLOW.map((w, i) => (
            <tr key={w.key} style={current === w.key ? { background: 'var(--accent-soft)' } : undefined}>
              <td className="num">{i + 1}</td>
              <td>
                <strong>{w.label}</strong>
                <div className="small muted mono">{w.key}</div>
              </td>
              <td className="small">{w.who}</td>
              <td className="small">{can(w.permission) ? 'may act' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
