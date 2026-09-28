import { formatDate } from "@/lib/format";

export interface DateRow {
  label: string;
  date: Date | null | undefined;
}

/** Section 9's "Important Dates" block. Only shows rows with a known
 * date — missing dates aren't rendered as blank rows or guessed, per
 * Section 9's "Not specified in the available notification." rule; if
 * every date is unknown, the caller just won't render this component. */
export function ImportantDates({ rows }: { rows: DateRow[] }) {
  const known = rows.filter((row) => row.date);
  if (known.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <tbody>
          {known.map((row) => (
            <tr key={row.label} className="border-b border-slate-100 last:border-0">
              <th
                scope="row"
                className="w-1/2 bg-slate-50 px-4 py-2 text-left font-medium text-slate-600"
              >
                {row.label}
              </th>
              <td className="px-4 py-2 text-slate-900">
                {formatDate(row.date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
