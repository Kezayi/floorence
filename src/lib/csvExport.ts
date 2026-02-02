/**
 * Convert an array of objects to CSV string
 */
export const objectsToCSV = <T,>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string => {
  if (data.length === 0) return '';

  // Header row
  const header = columns.map((col) => `"${col.label}"`).join(',');

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        if (value === null || value === undefined) return '""';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (value instanceof Date) return `"${value.toISOString()}"`;
        return `"${String(value)}"`;
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
};

/**
 * Download CSV string as a file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export data to CSV file
 */
export const exportToCSV = <T,>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): void => {
  const csv = objectsToCSV(data, columns);
  downloadCSV(csv, filename);
};
