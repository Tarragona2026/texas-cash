/* Lettura scontrini: estrae subtotale, tasse, mancia e totale dal testo riconosciuto dall'OCR.
   Tollera gli errori tipici dell'OCR (Tex, fax, Tlp, punto decimale perso), ignora le mancie
   suggerite e le percentuali, ricava le voci mancanti e confronta più letture dello stesso
   scontrino scegliendo la combinazione in cui subtotale + tasse = totale. */
(function (root) {
  var TAX_RE = /^([tf][a4eo][xk]+[a-z0-9]?|tx|taxes|sales?tax|salestax|vat)$/;
  var TIP_RE = /^(t[i1l|!j]p+s?|tips?|gratuit[a-z]*|gratulty|grat|gratuiy|svc)$/;
  var SUB_RE = /^(sub-?tota?l?|subtot|subtotai|subtotal[a-z]?)$/;
  var TOT_RE = /^(tota?l|totai|t0tal|tctal|totall|due)$/;

  function r2(n) { return Math.round(n * 100) / 100; }
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
  /* importi senza punto decimale (l'OCR l'ha perso): "TAX 384" -> 3,84, "AMOUNT 67 83" -> 67,83 */
  function bareAmounts(line) {
    var s = cleanLine(line), m = /(?:^|[^\d.,])(\d{1,4})\s(\d{2})\s*$/.exec(s);
    if (m) return [parseFloat(m[1] + '.' + m[2])];
    m = /(?:^|[^\d.,-])(\d{3,6})(?:\s*[^\d\s]{0,3})?\s*$/.exec(s);
    return m ? [parseInt(m[1], 10) / 100] : [];
  }
  function tokens(line) { return String(line).toLowerCase().split(/[^a-z0-9|!-]+/).filter(Boolean); }

  function classify(line, nAmounts) {
    var low = line.toLowerCase();
    if (/suggest|tip guide|guide/.test(low)) return 'skip';
    var tk = tokens(line), has = function (re) { return tk.some(function (t) { return re.test(t); }); };
    var isSub = has(SUB_RE) || /sub-?\s?total/.test(low);
    var isTax = has(TAX_RE) && !/taxable|tax id|taxpayer/.test(low);
    var isTip = (has(TIP_RE) && !/service(?!\s?charge|\s?chg)/.test(low)) || /svc\s?chg|service\s?charge/.test(low);
    if (isTip && nAmounts >= 2) return 'skip';          // elenco di mancie suggerite (15% 18% 20%)
    if (isSub) return 'sub';
    if (isTax) return /total/.test(low) ? 'totaltax' : 'tax';
    if (isTip) return 'tip';
    if (has(TOT_RE) && !/saving|item|count|number|qty/.test(low)) return 'total';
    if (has(/^balance$/) || (has(/^amount$/) && has(/^pa[iod]d?$/))) return 'total2';
    return null;
  }

  function roundTip(gap, sub, tax) {                       // la mancia di solito è una percentuale tonda
    return [10, 12, 15, 18, 20, 22, 25].some(function (p) { return Math.abs(gap - sub * p / 100) <= 0.015 || Math.abs(gap - (sub + tax) * p / 100) <= 0.015; });
  }
  function plausibleTax(tax, sub) { return tax != null && (sub == null || (tax >= 0 && tax <= sub * 0.2)); }
  function digits(n) { return String(Math.round(n * 100)); }
  function dist(a, b) {                                   // distanza di modifica tra due stringhe di cifre
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  function parseReceipt(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var r = { subtotal: null, tax: null, tip: null, total: null, notes: [] }, totalTax = null, total2 = null, all = [], pending = null, pctTips = [], sugg = 0;

    lines.forEach(function (l) {
      var a = amountsIn(l), kind = classify(l, a.length);
      if (/suggest|gratuity guide|tip guide/i.test(l)) sugg = 6;                       // le righe che seguono sono mancie suggerite
      else if (sugg > 0) { sugg--; if (kind === 'tip') kind = 'skip'; }
      a.forEach(function (x) { all.push(x); });
      if (!a.length && kind && kind !== 'skip') a = bareAmounts(l);      // punto decimale perso dall'OCR
      if (!a.length) { pending = kind && kind !== 'skip' ? kind : null; return; }   // etichetta: l'importo può essere nella riga dopo
      if (!kind && pending && a.length === 1 && l.replace(/[\s$S£\d.,:]/g, '').length <= 2) kind = pending;
      pending = null;
      var v = a[a.length - 1];
      if (kind === 'sub') { if (r.subtotal === null) r.subtotal = v; }
      else if (kind === 'totaltax') { totalTax = v; }
      else if (kind === 'tax') { if (r.tax === null) r.tax = v; }
      else if (kind === 'tip') { if (/\d\s?%/.test(l)) pctTips.push(v); else if (r.tip === null) r.tip = v; }
      else if (kind === 'total') { r.total = v; }
      else if (kind === 'total2') { total2 = v; }
    });

    if (totalTax !== null) r.tax = totalTax;
    if (r.tip === null && pctTips.length === 1) r.tip = pctTips[0];   // più righe con percentuali = mancie suggerite
    if (r.total === null && total2 !== null) r.total = total2;
    if (r.total === null && r.subtotal !== null) { r.total = r2(r.subtotal + (r.tax || 0) + (r.tip || 0)); r.notes.push('Totale calcolato da subtotale e tasse.'); }
    if (r.total === null && all.length) {
      var mx = Math.max.apply(null, all);
      if (mx > 0) { r.total = mx; r.notes.push('Totale preso come importo più alto.'); }
    }
    return reconcile(r);
  }

  /* controlli di coerenza: ricava le voci mancanti, scarta quelle impossibili, corregge una cifra letta male */
  function reconcile(r) {
    var sub = r.subtotal, tot = r.total, fixed = false;
    if (sub && !plausibleTax(r.tax, sub)) { r.tax = null; r.notes.push('Tasse scartate: valore non credibile.'); }
    if (sub && tot && tot > sub && r.tax === null && r.tip === null) {
      var t1 = tot - sub;
      if (t1 > 0 && t1 <= sub * 0.12) { r.tax = r2(t1); r.notes.push('Tasse calcolate dalla differenza.'); }
    } else if (sub && tot && tot > sub && r.tax === null) {
      var t1b = tot - sub - r.tip;
      if (t1b > 0 && t1b <= sub * 0.12) { r.tax = r2(t1b); r.notes.push('Tasse calcolate dalla differenza.'); }
    }
    sub = r.subtotal; tot = r.total;
    if (sub != null && r.tax != null && tot != null) {
      var tip = r.tip || 0, gap = tot - sub - r.tax, mismatch = r.tip != null ? Math.abs(gap - tip) > 0.02 : Math.abs(gap) > 0.02;
      if (mismatch) {
        if (r.tip === null && gap > 0.02 && roundTip(gap, sub, r.tax)) { r.tip = r2(gap); r.tipInferred = true; r.notes.push('Mancia calcolata dalla differenza.'); }
        else {
          var cands = [];                                    // una cifra letta male? provo a correggere una sola voce
          var s2 = tot - r.tax - tip; if (s2 > 0 && r.tax <= s2 * 0.12) cands.push(['subtotal', r2(s2), dist(digits(sub), digits(s2))]);
          var x2 = sub + r.tax + tip; if (x2 > 0) cands.push(['total', r2(x2), dist(digits(tot), digits(x2))]);
          var t3 = tot - sub - tip; if (t3 > 0 && t3 <= sub * 0.12) cands.push(['tax', r2(t3), dist(digits(r.tax), digits(t3))]);
          var ok = cands.filter(function (c) { return c[2] <= 1; });
          if (ok.length === 1) { r[ok[0][0]] = ok[0][1]; r.notes.push('Ho corretto ' + ({ subtotal: 'il subtotale', total: 'il totale', tax: 'le tasse' })[ok[0][0]] + ' perché i conti non tornavano.'); }
          else r.notes.push('I conti non tornano: controlla gli importi.');
        }
      }
    }
    return r;
  }

  function consistent(s, t, x, p) {
    if (s == null || t == null || x == null) return false;
    var b = s + t; return Math.abs(b - x) <= 0.02 || (p != null && Math.abs(b + p - x) <= 0.02);
  }
  /* più letture dello stesso scontrino: sceglie la combinazione in cui subtotale + tasse = totale */
  function mergeResults(rs) {
    rs = rs.filter(Boolean);
    function cands(k) { var out = []; rs.forEach(function (r) { if (r[k] != null && !(k === 'tip' && r.tipInferred) && out.indexOf(r[k]) < 0) out.push(r[k]); }); return out; }
    var S = cands('subtotal'), T = cands('tax'), X = cands('total'), P = cands('tip').concat([null]), best = null;
    S.forEach(function (s, i) { T.forEach(function (t, j) { X.forEach(function (x, k) {
      P.forEach(function (p, m) {
        if (!consistent(s, t, x, p)) return;
        var score = i + j + k + m * 0.1;
        if (!best || score < best.score) best = { score: score, s: s, t: t, x: x, p: p };
      });
    }); }); });
    if (best) {
      var tc = cands('tip'), match = tc.filter(function (p) { return Math.abs(best.s + best.t + p - best.x) <= 0.02; }), tip = match.length ? match[0] : (tc.length ? tc[0] : null);
      return { subtotal: best.s, tax: best.t, tip: tip, total: best.x, notes: [] };
    }
    var pick = rs.slice().sort(function (a, b) { return count(b) - count(a); })[0] || { subtotal: null, tax: null, tip: null, total: null, notes: [] };
    return pick;
  }
  function count(r) { return [r.subtotal, r.tax, r.tip, r.total].filter(function (x) { return x != null; }).length; }
  function isConsistent(r) { return !!r && consistent(r.subtotal, r.tax, r.total, r.tip); }

  var api = { parseReceipt: parseReceipt, mergeResults: mergeResults, isConsistent: isConsistent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.parseReceipt = parseReceipt; root.mergeResults = mergeResults; root.isConsistent = isConsistent; }
})(typeof self !== 'undefined' ? self : this);
