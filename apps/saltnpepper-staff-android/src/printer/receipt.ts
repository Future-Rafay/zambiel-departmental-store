import type { Order } from '../types';

export type PaperWidth = 58 | 80;

const lineWidth = { 58: 32, 80: 48 };

function money(rappen: number) {
  return `CHF ${(rappen / 100).toFixed(2)}`;
}

function wrap(text: string, width: PaperWidth, indent = '') {
  const max = lineWidth[width] - indent.length;
  const words = text.trim().split(/\s+/);
  const rows: string[] = [];
  let row = '';
  for (const word of words) {
    if (word.length > max) {
      if (row) rows.push(row);
      for (let index = 0; index < word.length; index += max)
        rows.push(word.slice(index, index + max));
      row = '';
    } else if (!row || row.length + word.length + 1 <= max) {
      row += `${row ? ' ' : ''}${word}`;
    } else {
      rows.push(row);
      row = word;
    }
  }
  if (row) rows.push(row);
  return (rows.length ? rows : ['']).map(value => `${indent}${value}`);
}

function center(text: string, width: PaperWidth) {
  return wrap(text, width).map(row =>
    row.padStart(row.length + Math.floor((lineWidth[width] - row.length) / 2)),
  );
}

function priceLine(label: string, value: string, width: PaperWidth) {
  const columns = lineWidth[width];
  const labels = wrap(label, width);
  const last = labels.pop() || '';
  return last.length + value.length < columns
    ? [
        ...labels,
        `${last}${' '.repeat(columns - last.length - value.length)}${value}`,
      ]
    : [...labels, last, value.padStart(columns)];
}

export function formatReceipt(order: Order, width: PaperWidth) {
  const divider = '-'.repeat(lineWidth[width]);
  const german = order.locale === 'DE';
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(german ? 'de-CH' : 'en-CH', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    }).format(new Date(value));
  const rows = [
    ...center('ZAMBIEL', width),
    '',
    divider,
    ...center(`ORDER / BESTELLUNG ${order.orderNumber}`, width),
    ...wrap(
      `Type / Art: ${order.fulfillmentType === 'DELIVERY' ? 'Delivery / Lieferung' : 'Pickup / Abholung'}`,
      width,
    ),
    ...wrap(`Placed / Bestellt: ${dateTime(order.createdAt)}`, width),
    divider,
    'Customer / Kunde',
    ...wrap(order.customerName, width),
    ...wrap(`Phone / Telefon: ${order.customerPhone}`, width),
    ...(order.address
      ? wrap(
          `Address / Adresse: ${order.address.street}${order.address.streetExtra ? `, ${order.address.streetExtra}` : ''}, ${order.address.postalCode} ${order.address.city}`,
          width,
        )
      : []),
    divider,
    ...order.items.flatMap(item => [
      ...priceLine(
        `${item.quantity}x ${german ? item.productNameDe : item.productNameEn}`,
        money(item.lineSubtotalRappen),
        width,
      ),
      ...(item.variantNameDe || item.variantNameEn
        ? wrap(
            `- ${(german ? item.variantNameDe : item.variantNameEn) || ''}`,
            width,
            '  ',
          )
        : []),
      ...item.options.flatMap(option =>
        wrap(`+ ${german ? option.nameDe : option.nameEn}`, width, '  '),
      ),
    ]),
    divider,
    ...priceLine(
      'Subtotal / Zwischensumme',
      money(order.subtotalRappen),
      width,
    ),
    ...(order.discountRappen
      ? priceLine('Discount / Rabatt', `-${money(order.discountRappen)}`, width)
      : []),
    ...(order.fulfillmentType === 'DELIVERY'
      ? priceLine(
          'Delivery / Lieferung',
          order.deliveryFeeRappen ? money(order.deliveryFeeRappen) : 'FREE',
          width,
        )
      : []),
    ...(order.taxAmountRappen
      ? priceLine('Tax / MwSt.', money(order.taxAmountRappen), width)
      : []),
    divider,
    ...priceLine('TOTAL / SUMME', money(order.totalRappen), width),
    divider,
    ...wrap(
      `Payment / Zahlung: ${order.paymentMethod} (${order.payment?.status || 'PENDING'})`,
      width,
    ),
    ...(order.note
      ? ['', ...wrap(`Note / Hinweis: ${order.note}`, width)]
      : []),
    '',
    divider,
    ...center('Vielen Dank / Thank you!', width),
  ];
  return `${rows.flat().join('\n')}\n`;
}

export function receiptToEscPosText(order: Order, width: PaperWidth) {
  return formatReceipt(order, width);
}
