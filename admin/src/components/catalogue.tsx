'use client';

// Shared field helpers for the catalogue editors (games, crafts, facts).
export const BRACKETS: { key: 'A' | 'B' | 'C' | 'D'; label: string }[] = [
  { key: 'A', label: 'A · 3–5' },
  { key: 'B', label: 'B · 6–8' },
  { key: 'C', label: 'C · 9–10' },
  { key: 'D', label: 'D · 11–12' },
];

export function BracketPicker({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="row" role="group" aria-label="Age brackets">
      {BRACKETS.map((b) => (
        <label key={b.key} className="check" style={{ marginBottom: 0 }}>
          <input type="checkbox" disabled={disabled} checked={value.includes(b.key)} onChange={(e) => onChange(e.target.checked ? [...value, b.key].sort() : value.filter((x) => x !== b.key))} />
          {b.label}
        </label>
      ))}
    </div>
  );
}

/** A textarea whose lines become a string array. */
export function LinesField({ label, value, onChange, help, placeholder, rows = 4 }: { label: string; value: string[]; onChange: (v: string[]) => void; help?: string; placeholder?: string; rows?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className="input" rows={rows} placeholder={placeholder} value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((l) => l.trimEnd()).filter((l, i, a) => l.length > 0 || i < a.length - 1))} />
      {help && <small>{help}</small>}
    </label>
  );
}

/** JSON editor with validation feedback; keeps the raw text so typing is never interrupted. */
export function JsonField({ label, value, onChange, help, rows = 12 }: { label: string; value: unknown; onChange: (v: unknown, valid: boolean) => void; help?: string; rows?: number }) {
  return (
    <JsonFieldInner key={label} label={label} initial={value} onChange={onChange} help={help} rows={rows} />
  );
}

import { useState } from 'react';
function JsonFieldInner({ label, initial, onChange, help, rows }: { label: string; initial: unknown; onChange: (v: unknown, valid: boolean) => void; help?: string; rows: number }) {
  const [text, setText] = useState(() => JSON.stringify(initial ?? [], null, 2));
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="input"
        rows={rows}
        style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            setProblem(null);
            onChange(parsed, true);
          } catch (err) {
            setProblem(err instanceof Error ? err.message : 'Invalid JSON');
            onChange(undefined, false);
          }
        }}
      />
      {problem ? <small style={{ color: 'var(--danger)' }}>{problem}</small> : help ? <small>{help}</small> : null}
    </label>
  );
}

export const STATUS_HELP: Record<string, string> = {
  draft: 'Hidden from everyone.',
  in_development: 'Hidden in production; visible when the “show in-development games” flag is on.',
  published: 'Visible to children in its age brackets.',
  archived: 'Removed from the catalogue; progress is kept.',
};
