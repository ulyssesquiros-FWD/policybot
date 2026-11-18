export function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsvFile(rows, columns, filename) {
  const escapeCell = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  const csv = ['\uFEFF' + header, ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getInitials(fullName) {
  if (!fullName) return 'PB';
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getEstadoStyle(estado) {
  if (estado === 'ACTIVO' || estado === 'APROBADA' || estado === 'RESUELTO') {
    return { bg: 'rgba(48, 209, 88, 0.12)', color: '#1b7d36' };
  }
  if (estado === 'INCAPACITADO' || estado === 'RECHAZADA' || estado === 'ACTIVA' || estado === 'INACTIVO') {
    return { bg: 'rgba(255, 69, 58, 0.12)', color: '#d7261e' };
  }
  if (estado === 'VACACIONES' || estado === 'PENDIENTE' || estado === 'ABIERTO') {
    return { bg: 'rgba(255, 149, 0, 0.12)', color: '#b26500' };
  }
  return { bg: 'rgba(0, 0, 0, 0.06)', color: '#6E6E73' };
}
