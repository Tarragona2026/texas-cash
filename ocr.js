/* Lettura scontrini: estrae subtotale, tasse, mancia e totale dal testo riconosciuto. */
(function (root) {
  var AMT = /(?:^|[^\d])(\d{1,4})\s?[.,]\s?(\d{2})(?!\d)/g;

  function amounts(line) {
    var out = [], m;
    AMT.lastIndex = 0;
    while ((m = AMT.exec(line))) out.push(parseFloat(m[1] + '.' + m[2]));
    return out;
  }

  function parseReceipt(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var r = { subtotal: null, tax: null, tip: null, total: null };
    var all = [];
    lines.forEach(function (l) {
      var a = amounts(l);
      if (!a.length) return;
      all = all.concat(a);
      var last = a[a.length - 1], low = l.toLowerCase();
      if (/sub\s?-?\s?total|food total|net/.test(low)) { if (r.subtotal === null) r.subtotal = last; }
      else if (/tax/.test(low)) { if (r.tax === null) r.tax = last; }
      else if (/tip|gratuity/.test(low)) { if (r.tip === null) r.tip = last; }
      else if (/total|balance due|amount due|amount$|grand/.test(low)) { r.total = last; }
    });
    if (r.total === null && all.length) {
      var mx = Math.max.apply(null, all);
      if (mx > 0) r.total = mx;
    }
    return r;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { parseReceipt: parseReceipt };
  else root.parseReceipt = parseReceipt;
})(typeof self !== 'undefined' ? self : this);
