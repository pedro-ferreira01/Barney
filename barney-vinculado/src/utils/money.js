export function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(value) {
  return Number((Number(value || 0) / 100).toFixed(2));
}

export function maskDocument(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 11) return '***';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

export function maskPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return '***';
  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}
