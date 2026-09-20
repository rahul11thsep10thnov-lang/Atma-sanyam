export interface AdminColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

export function AdminTable<T extends { id: string }>({ rows, columns }: { rows: T[]; columns: AdminColumn<T>[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-forest-100">
      <table className="min-w-full divide-y divide-forest-100 text-sm">
        <thead className="bg-forest-50">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-2 text-left font-semibold text-charcoal">
                {col.header}
              </th>
            ))}
            <th className="px-4 py-2 text-left font-semibold text-charcoal">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-2 text-charcoal-light">
                  {col.render(row)}
                </td>
              ))}
              <td className="px-4 py-2">
                <button
                  type="button"
                  disabled
                  title="Editing writes to the database — connect DATABASE_URL to enable"
                  className="cursor-not-allowed text-xs font-medium text-forest-400"
                >
                  Edit
                </button>
                <span className="mx-1 text-charcoal-light">·</span>
                <button
                  type="button"
                  disabled
                  title="Deleting writes to the database — connect DATABASE_URL to enable"
                  className="cursor-not-allowed text-xs font-medium text-terracotta-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
