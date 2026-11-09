/* Lettura scontrini: estrae subtotale, tasse, mancia e totale dal testo riconosciuto dall'OCR.
   Tollera gli errori tipici dell'OCR (Tex, Tlp, T1P...), ignora le mancie suggerite
   e le percentuali, e ricava le voci mancanti dalla differenza tra i totali. */
(function (root) {
  var TAX_RE = /^(t[a4eo]x+[a-z0-9]?|tx|ta[xk]e?s?|taxes|sales?tax|salestax|vat)$/;
  var TIP_RE = /^(t[i1l|!j]p+s?|tips?|gratuit[a-z]*|gratulty|grat|gratuiy|svc|service)$/;
  var SUB_RE = /^(sub-?tota?l?|subtot|sub|subtotai|subtotal[a-z]?)$/;
  var TOT_RE = /^(tota?l|totai|t0tal|tctal|totall|due)$/;

  function cleanLine(line) {
    return String(line)
      .replace(/(\d),(\d{3})(?!\d)/g, '$1$2')            // 1,234.56 -> 1234.56
      .replace(/\d{1,3}(?:[.,]\d+)?\s?%/g, ' ');           // 8.25% non è un importo
  }

  function amountsIn(line) {
    var re = /(?:^|[^\d.,])(\d{0,5})\s?[.,]\s?(\d{2})(?!\d)/g, out = [], m, s = cleanLine(line);
    while ((m = re.exec(s))) out.push(parseFloat((m[1] || '0') + '.' + m[2]));
    return out;
  }

  function tokens(line) {
    return String(line).toLowerCase().split(/[^a-z0-9|!-]+/).filter(Boolean);
  }

  function classify(line, nAmounts) {
    var low = line.toLowerCase();
    if (/suggest|tip guide|guide/.test(low)) return 'skip';
    var tk = tokens(line), has = function (re) { return tk.some(function (t) { return re.test(t); }); };
    var isSub = has(SUB_RE) && (has(/^sub-?tota?l?$|^subtot|^subtotai/) || /sub-?\s?total/.test(low));
    var isTax = has(TAX_RE) && !/taxable|tax id|taxpayer/.test(low);
    var isTip = has(TIP_RE) && !/service(?!\s?charge|\s?chg)/.test(low) || /svc\s?chg|service\s?charge/.test(low);
    if (isTip && nAmounts >= 2) return 'skip';          // elenco di mancie suggerite (15% 18% 20%)
    if (isSub) return 'sub';
    if (isTax) return /total/.test(low) ? 'totaltax' : 'tax';
    if (isTip) return 'tip';
    if (has(TOT_RE) && !/saving|item|count|number|qty/.test(low)) return 'total';
    return null;
  }

  function plausibleTax(tax, sub) { return tax != null && (sub == null || (tax >= 0 && tax <= sub * 0.2)); }

  function parseReceipt(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var r = { subtotal: null, tax: null, tip: null, total: null, notes: [] }, totalTax = null, all = [], pending = null;

    lines.forEach(function (l) {
      var a = amountsIn(l);
      a.forEach(function (x) { all.push(x); });
      var kind = classify(l, a.length);

      if (!a.length) {                       // etichetta senza importo: forse l'importo è nella riga dopo
        pending = kind && kind !== 'skip' ? kind : null;
        return;
      }
      if (!kind && pending && a.length === 1 && l.replace(/[\s$S\d.,:]/g, '').length <= 2) kind = pending;   // riga con solo l'importo
      pending = null;
      var v = a[a.length - 1];
      if (kind === 'sub') { if (r.subtotal === null) r.subtotal = v; }
      else if (kind === 'totaltax') { totalTax = v; }
      else if (kind === 'tax') { if (r.tax === null) r.tax = v; }
      else if (kind === 'tip') { if (r.tip === null) r.tip = v; }
      else if (kind === 'total') { r.total = v; }
    });

    if (totalTax !== null) r.tax = totalTax;
    if (r.total === null && all.length) {
      var mx = Math.max.apply(null, all);
      if (mx > 0) { r.total = mx; r.notes.push('Totale preso come importo più alto.'); }
    }

    /* controlli di coerenza: ricava le voci mancanti o scarta quelle impossibili */
    var sub = r.subtotal, tot = r.total;
    if (sub && !plausibleTax(r.tax, sub)) { r.tax = null; r.notes.push('Tasse scartate: valore non credibile.'); }
    if (sub && tot && tot > sub) {
      if (r.tax === null) {
        var t1 = tot - sub - (r.tip || 0);
        if (t1 > 0 && t1 <= sub * 0.12) { r.tax = Math.round(t1 * 100) / 100; r.notes.push('Tasse calcolate dalla differenza.'); }
      }
      if (r.tip === null && r.tax !== null) {
        var t2 = tot - sub - r.tax;
        if (t2 >= sub * 0.08 && t2 <= sub * 0.4) { r.tip = Math.round(t2 * 100) / 100; r.notes.push('Mancia calcolata dalla differenza.'); }
      }
    }
    return r;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { parseReceipt: parseReceipt };
  else root.parseReceipt = parseReceipt;
})(typeof self !== 'undefined' ? self : this);
