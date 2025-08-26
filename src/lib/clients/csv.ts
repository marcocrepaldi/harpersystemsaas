export function toCSV(rows: Array<{
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  personType?: string | null;
  status?: string | null;
  cityUf?: string | null;
}>) {
  const header = ['Nome', 'Email', 'Telefone', 'Documento', 'Tipo', 'Status', 'Cidade/UF'];
  const escape = (s?: string | null) => `"${(s ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      escape(r.name),
      escape(r.email),
      escape(r.phone),
      escape(r.document),
      escape(r.personType),
      escape(r.status),
      escape(r.cityUf),
    ].join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export function downloadBlob(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
