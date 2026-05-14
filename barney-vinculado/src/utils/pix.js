import { env } from '../config/env.js';

function field(id, value) {
  const text = String(value ?? '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixPayload({ amount, description, txid }) {
  if (!env.PIX_KEY) {
    throw new Error('PIX_KEY não configurada');
  }

  const gui = field('00', 'BR.GOV.BCB.PIX');
  const key = field('01', env.PIX_KEY);
  const desc = field('02', String(description || 'BARNEY').slice(0, 72));
  const merchantAccount = field('26', gui + key + desc);

  let payload =
    field('00', '01') +
    merchantAccount +
    field('52', '0000') +
    field('53', '986') +
    field('54', Number(amount).toFixed(2)) +
    field('58', 'BR') +
    field('59', String(env.PIX_MERCHANT_NAME || 'BARNEY').slice(0, 25)) +
    field('60', String(env.PIX_MERCHANT_CITY || 'IGARAPE').slice(0, 15)) +
    field('62', field('05', String(txid || 'BARNEY').slice(0, 25))) +
    '6304';

  return payload + crc16(payload);
}
