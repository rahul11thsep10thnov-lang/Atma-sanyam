'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtDay, fmtNumber } from '@/lib/format';

// Single-series column chart: one hue (--series-1), 1px recessive gridlines,
// bars capped at 24px with a 4px rounded top and square baseline, per-bar
// hover/focus tooltip, and a table view so no value is hover-gated.
// A single series needs no legend: the card title names it.

interface Point {
  date: string;
  count: number;
}

const H = 180;
const PAD_L = 36;
const PAD_B = 22;
const PAD_T = 8;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s * 4 >= v) ?? pow * 10;
  return step * 4;
}

export function ColumnChart({ data, valueLabel }: { data: Point[]; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  // Lay out in real pixels (not a scaled viewBox) so tick labels stay 11px
  // at every container width.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [asTable]);
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.count))), [data]);
  const plotW = W - PAD_L;
  const plotH = H - PAD_B - PAD_T;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(3, slot - 2)); // 2px surface gap between neighbours
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(W / 80)));

  const toggle = (
    <button className="btn btn-sm btn-ghost" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
      {asTable ? 'Show chart' : 'Show table'}
    </button>
  );

  if (asTable) {
    return (
      <div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>{toggle}</div>
        <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                <th className="num">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{fmtDay(d.date)}</td>
                  <td className="num">{fmtNumber(d.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const hovered = hover !== null ? data[hover] : null;
  return (
    <div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>{toggle}</div>
      <div className="chart" ref={wrapRef} onMouseLeave={() => setHover(null)}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${valueLabel} per day`}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? 'baseline' : 'gridline'} x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} />
              <text className="tick" x={PAD_L - 6} y={y(t) + 4} textAnchor="end">
                {fmtNumber(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD_L + slot * i + slot / 2;
            const top = y(d.count);
            const h = Math.max(0, PAD_T + plotH - top);
            const r = Math.min(4, h, barW / 2);
            const x0 = cx - barW / 2;
            const base = PAD_T + plotH;
            // Rounded data-end (top), square at the baseline.
            const path =
              h <= 0
                ? ''
                : `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${base} Z`;
            return (
              <g key={d.date}>
                <rect
                  className="hit"
                  x={PAD_L + slot * i}
                  y={PAD_T}
                  width={slot}
                  height={plotH}
                  tabIndex={0}
                  aria-label={`${fmtDay(d.date)}: ${d.count} ${valueLabel}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
                {path && <path className="bar" d={path} style={{ opacity: hover === null || hover === i ? 1 : 0.55 }} />}
                {i % labelEvery === 0 && (
                  <text className="tick" x={cx} y={H - 4} textAnchor="middle">
                    {fmtDay(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hovered && hover !== null && (
          <div
            className="tooltip"
            style={{ left: `${((PAD_L + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(hovered.count) / H) * 100}%` }}
          >
            <strong>{fmtNumber(hovered.count)}</strong>
            <span className="muted">
              {valueLabel} · {fmtDay(hovered.date)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
