'use client';

import { useState } from 'react';
import { LANGS, LANG_NAMES, type Lang, type Localised } from '@/lib/dadu';

/** One localised string: English required, other languages in a collapsible row. */
export function LocalisedInput({
  label,
  value,
  onChange,
  multiline,
  required = true,
  languages,
}: {
  label: string;
  value: Localised | undefined;
  onChange: (v: Localised) => void;
  multiline?: boolean;
  required?: boolean;
  /** Languages to show besides English (defaults to all 14). */
  languages?: readonly Lang[];
}) {
  const [open, setOpen] = useState(false);
  const v: Localised = value ?? { en: '' };
  const langs = (languages ?? LANGS).filter((l) => l !== 'en');
  const filled = langs.filter((l) => (v[l] ?? '').trim().length > 0).length;
  const set = (l: Lang, text: string) => {
    const next = { ...v, [l]: text } as Localised;
    if (l !== 'en' && text.trim() === '') delete next[l];
    onChange(next);
  };
  const Field = multiline ? 'textarea' : 'input';
  return (
    <div className="field-group" style={{ marginBottom: 14 }}>
      <label className="field" style={{ marginBottom: 6 }}>
        <span>
          {label} <span className="small muted">(English{required ? ', required' : ''})</span>
        </span>
        <Field className="input" value={v.en ?? ''} required={required} onChange={(e) => set('en', e.target.value)} dir="auto" />
      </label>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Hide' : 'Show'} other languages ({filled}/{langs.length})
      </button>
      {open && (
        <div className="form-grid" style={{ marginTop: 8 }}>
          {langs.map((l) => (
            <label className="field" key={l}>
              <span className="small">{LANG_NAMES[l]}</span>
              <Field className="input" value={v[l] ?? ''} onChange={(e) => set(l, e.target.value)} dir={l === 'ur' ? 'rtl' : 'auto'} lang={l} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
