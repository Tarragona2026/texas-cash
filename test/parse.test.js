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
  ['gratuity suggerita con percentuali', 'Sub Total: 88.00\nTax: 7.81\nTOTAL: 95.81\nSuggested Gratuity\n18% GRATUIT 15.84\n20% GRATUIT 17.60\n22% GRATUIT 19.36\nGratuity is Not Included', { subtotal: 88, tax: 7.81, tip: null, total: 95.81 }],
  ['percentuali senza intestazione', 'Subtotal 88.00\nTax 7.81\nTotal 95.81\n18% GRATUIT 15.84\n20% GRATUIT 17.60\n22% GRATUIT 19.36', { subtotal: 88, tax: 7.81, tip: null, total: 95.81 }],
  ['punto decimale perso', 'SUBTOTAL 6399\nTAX 384\nBALANCE 6783\nAMOUNT PAD 6783', { subtotal: 63.99, tax: 3.84, total: 67.83 }],
  ['punto perso con spazio', 'Subtotal 4599\nTotal tax 275\nTOTAL 4874', { subtotal: 45.99, tax: 2.75, total: 48.74 }],
  ['fax al posto di tax', 'Sub Total: 88.00\nfax: 7.81\nTOTAL: 95.81', { subtotal: 88, tax: 7.81, total: 95.81 }],
  ['subtotale letto male corretto', 'Sub Total $33.16\nSales Tax $3.47\nOrder Total $42.63', { subtotal: 39.16, tax: 3.47, total: 42.63 }],
  ['totale mancante ricavato', 'Sub Total $27.43\nSales Tax $2.43', { subtotal: 27.43, tax: 2.43, total: 29.86 }],
  ['balance come totale', 'SUBTOTAL 63.99\nTAX 3.84\n****BALANCE 67.83\nAMOUNT PAID 67.83', { subtotal: 63.99, tax: 3.84, total: 67.83 }],
];
const {mergeResults}=require('../ocr.js');
(function(){ const a=parseReceipt('Sub Total 83.00\nTax 1.81\nTotal 95.81'), b=parseReceipt('Sub Total 88.00\nTax 7.81\nTotal 95.81'); const m=mergeResults([a,b]); [['subtotal',88],['tax',7.81],['total',95.81]].forEach(([k,v])=>{ if(m[k]!==v){ console.log('FAIL merge',k,v,m[k]); process.exitCode=1; } }); })();
let bad = 0;
cases.forEach(([n, text, exp]) => {
  const r = parseReceipt(text);
  Object.keys(exp).forEach(k => { try { assert.strictEqual(r[k], exp[k]); } catch (e) { bad++; console.log('FAIL', n, k, 'atteso', exp[k], 'ottenuto', r[k]); } });
});

const { parseReceiptDate } = require('../ocr.js');
const now = new Date(2026, 11, 28, 10).getTime();
[['26/12/2026 14:35\nIVA\nTOTALE EURO 2,70', '2026-12-26', '14:35'], ['12/26/2026 02:35 PM\nTax 3.61', '2026-12-26', '14:35'], ['Dec 27, 2026 9:15 AM\nTotal 5.00', '2026-12-27', '09:15'], ['27 DIC 2026 08:10\nTOTALE', '2026-12-27', '08:10']].forEach(c => {
  const r = parseReceiptDate(c[0], now);
  try { assert.strictEqual(r && r.date, c[1]); assert.strictEqual(r.time, c[2]); } catch (e) { bad++; console.log('FAIL data', c[0]); }
});
// motore Apple: pezzi di testo con posizione -> righe (origine in basso a sinistra; etichetta a sinistra e importo a destra sulla stessa riga)
{ const { linesFromBoxes, isConsistent } = require('../ocr.js');
  const B = (text, x, y) => ({ text, x, y, w: 0.2, h: 0.02 });
  const t = linesFromBoxes([B('3.61', 0.8, 0.401), B('Total', 0.1, 0.35), B('H-E-B', 0.4, 0.9), B('Subtotal', 0.1, 0.45), B('43.70', 0.8, 0.452), B('Sales Tax', 0.1, 0.4), B('47.31', 0.8, 0.349), { text: '', x: 0, y: 0, w: 1, h: 1 }]);
  assert.strictEqual(t, 'H-E-B\nSubtotal  43.70\nSales Tax  3.61\nTotal  47.31');
  const r = parseReceipt(t); assert.strictEqual(r.subtotal, 43.7); assert.strictEqual(r.tax, 3.61); assert.strictEqual(r.total, 47.31); assert.ok(isConsistent(r));
  assert.strictEqual(linesFromBoxes([]), ''); assert.strictEqual(linesFromBoxes(null), '');
  console.log('ok motore Apple: righe ricostruite dalle posizioni'); }
console.log(bad ? bad + ' errori' : 'tutti i test passano (' + cases.length + ')');
process.exit(bad ? 1 : 0);
