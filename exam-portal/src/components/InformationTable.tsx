const NOT_SPECIFIED = "Not specified in the available notification.";

export interface InfoRow {
  label: string;
  value: React.ReactNode | null | undefined;
}

/** A generic label/value table (Job/Result/AdmitCard/AnswerKey detail
 * pages). A missing value renders the spec's exact required copy
 * (Section 9) rather than being silently skipped or invented. */
export function InformationTable({ rows }: { rows: InfoRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-100 last:border-0">
              <th
                scope="row"
                className="w-1/3 bg-slate-50 px-4 py-2 text-left align-top font-medium text-slate-600"
              >
                {row.label}
              </th>
              <td className="px-4 py-2 text-slate-900">
                {row.value ?? (
                  <span className="text-slate-400 italic">{NOT_SPECIFIED}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
