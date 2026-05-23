/**
 * Convert an array of objects to CSV and trigger a browser download.
 * Pure client-side, no backend.
 */
export function downloadCSV<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[],
) {
  if (rows.length === 0) return;
  const keys = columns ? columns.map((c) => c.key) : (Object.keys(rows[0]) as (keyof T)[]);
  const headers = columns ? columns.map((c) => c.header) : keys.map(String);

  const escape = (val: unknown): string => {
    if (val == null) return '';
    const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
