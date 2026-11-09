const assert = require('assert');
const { parseReceipt } = require('../ocr.js');
const cases = [
  ['standard', 'Subtotal 43.70\nSales Tax 8.25% 3.61\nTotal 47.31\nTip 9.00', { subtotal: 43.7, tax: 3.61, tip: 9, total: 47.31 }],
  ['OCR errori Tex/Tlp', 'Sub Total $43.70\nSales Tex $3.61\nTotal $47.31\nTlp $9.00', { subtotal: 43.7, tax: 3.61, tip: 9, total: 47.31 }],
  ['T1P e TAX1', 'SUBTOTAL 43.70\nTAX1 8.25% 3.61\nT1P 8.74\nTOTAL 56.05', { subtotal: 43.7, tax: 3.61, tip: 8.74, total: 56.05 }],
  ['mancia suggerita ignorata', 'Subtotal 50.00\nTax 4.13\nTotal 54.13\nSuggested Tip\n18% $9.00 20% $10.00 22% $11.00\nTip 18% 9.00 20% 10.00', { subtotal: 50, tax: 4.13, tip: null, total: 54.13 }],
  ['percentuale non e importo', 'Subtotal 50.00\nSales Tax 8.25%\nTotal 54.13', { subtotal: 50, tax: 4.13, tip: null, total: 54.13 }],
  ['importo nella riga dopo', 'Subtotal 50.00\nTax\n4.13\nTotal 54.13', { subtotal: 50, tax: 4.13, total: 54.13 }],
  ['gratuity e due totali', 'Sub Total $122.75\nTax $10.75\nTotal $133.50\nGratuity $18.41\nTotal $151.91', { subtotal: 122.75, tax: 10.75, tip: 18.41, total: 151.91 }],
  ['total tax', 'Subtotal 3.99\nTOTAL TAX .30\nTOTAL 4.29', { subtotal: 3.99, tax: 0.3, total: 4.29 }],
  ['tasse ricavate', 'Subtotal 50.00\nTotal 54.13', { subtotal: 50, tax: 4.13, total: 54.13 }],
  ['mancia ricavata', 'Subtotal 50.00\nTax 4.13\nTotal 63.13', { subtotal: 50, tax: 4.13, tip: 9, total: 63.13 }],
  ['migliaia', 'Subtotal 1,250.00\nTax 103.13\nTotal 1,353.13', { subtotal: 1250, tax: 103.13, total: 1353.13 }],
  ['tea non e tip', 'Iced Tea 2.75\nTop Sirloin 24.50\nSubtotal 27.25\nTax 2.25\nTotal 29.50', { subtotal: 27.25, tax: 2.25, tip: null, total: 29.5 }],
  ['servizio incluso', 'Subtotal 100.00\nTax 8.25\nService Charge 18.00\nTotal 126.25', { subtotal: 100, tax: 8.25, tip: 18, total: 126.25 }],
  ['riga Rate Sales Amount non e il totale', 'Sub Total $122.75\nTax $10.75\nTotal $133.50\nRate Sales Amount\n8.7500 $122.75 $10.74', { subtotal: 122.75, tax: 10.75, total: 133.5 }],
];
let bad = 0;
cases.forEach(([n, text, exp]) => {
  const r = parseReceipt(text);
  Object.keys(exp).forEach(k => { try { assert.strictEqual(r[k], exp[k]); } catch (e) { bad++; console.log('FAIL', n, k, 'atteso', exp[k], 'ottenuto', r[k]); } });
});
console.log(bad ? bad + ' errori' : 'tutti i test passano (' + cases.length + ')');
process.exit(bad ? 1 : 0);
