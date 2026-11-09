/* Riepilogo in PDF: totale, ogni persona giorno per giorno, ricariche e commenti. */
(function (root) {
  function f(n) { return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function usd(n) { return (n < 0 ? '-' : '') + '$' + f(Math.abs(n)); }
  function eur(n) { return (n < 0 ? '-' : '') + '€' + f(Math.abs(n)); }
  function sum(a, k) { return a.reduce(function (s, x) { return s + x[k]; }, 0); }
  function ekey(u, e) { return [u, e.data, e.ora, e.usd.toFixed(2), e.desc].join('|'); }
  function dayLabel(d) { return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }); }

  var INK = [28, 28, 30], SOFT = [99, 99, 102], RED = [192, 57, 31], BLUE = [0, 122, 255];

  function buildReport(jsPDF, people, comments, when) {
    var doc = new jsPDF({ unit: 'pt', format: 'a4' }), W = doc.internal.pageSize.getWidth(), M = 40, y = 0;
    var names = Object.keys(people).sort();
    function title(txt, size) { doc.setFont('helvetica', 'bold'); doc.setFontSize(size || 14); doc.setTextColor.apply(doc, INK); doc.text(txt, M, y); y += (size || 14) + 6; }
    function note(txt) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, SOFT); var l = doc.splitTextToSize(txt, W - 2 * M); doc.text(l, M, y); y += l.length * 12 + 4; }
    function table(head, body, opts) {
      doc.autoTable(Object.assign({ startY: y, head: [head], body: body, margin: { left: M, right: M, bottom: 40 }, theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, lineColor: [215, 215, 220], lineWidth: .4, textColor: INK },
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247, 247, 250] } }, opts || {}));
      y = doc.lastAutoTable.finalY + 16;
    }
    function need(h) { if (y + h > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = M + 10; } }

    /* intestazione */
    y = M + 18; doc.setFillColor.apply(doc, RED); doc.rect(0, 0, W, 8, 'F');
    title('Xmas in Texa$', 24); note('Riepilogo spese del viaggio · creato il ' + when);
    y += 4;

    /* totale */
    var allExp = [], allTop = [];
    names.forEach(function (n) { allExp = allExp.concat(people[n].expenses); allTop = allTop.concat(people[n].topups); });
    title('Totale', 15);
    var rows = names.map(function (n) {
      var p = people[n], top = sum(p.topups, 'usd'), sp = sum(p.expenses, 'usd');
      return [n, usd(top), usd(sp), usd(top - sp), eur(sum(p.expenses, 'eur'))];
    });
    var T = sum(allTop, 'usd'), S = sum(allExp, 'usd');
    rows.push(['Totale', usd(T), usd(S), usd(T - S), eur(sum(allExp, 'eur'))]);
    table(['Persona', 'Ricaricato', 'Speso', 'Rimasto', 'Speso in euro'], rows, {
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      didParseCell: function (d) { if (d.row.index === rows.length - 1 && d.section === 'body') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [232, 240, 255]; } }
    });

    /* per categoria */
    var cats = {}; allExp.forEach(function (e) { cats[e.cat] = 1; });
    var catKeys = Object.keys(cats).sort();
    if (catKeys.length) {
      need(80); title('Per categoria', 15);
      var crow = catKeys.map(function (c) {
        var line = [c]; names.forEach(function (n) { line.push(usd(sum(people[n].expenses.filter(function (e) { return e.cat === c; }), 'usd'))); });
        line.push(usd(sum(allExp.filter(function (e) { return e.cat === c; }), 'usd'))); return line;
      });
      var cs = {}; for (var i = 1; i <= names.length + 1; i++) cs[i] = { halign: 'right' };
      table(['Categoria'].concat(names, ['Totale']), crow, { columnStyles: cs });
    }

    /* giorno per giorno, tutti */
    var dset = {}; allExp.forEach(function (e) { dset[e.data] = 1; });
    var dkeys = Object.keys(dset).sort();
    if (dkeys.length) {
      need(80); title('Giorno per giorno', 15);
      var run = 0, drow = dkeys.map(function (d) {
        var line = [dayLabel(d)], tot = 0;
        names.forEach(function (n) { var v = sum(people[n].expenses.filter(function (e) { return e.data === d; }), 'usd'); tot += v; line.push(v ? usd(v) : '–'); });
        run += tot; line.push(usd(tot), usd(run)); return line;
      });
      var ds = {}; for (var j = 1; j <= names.length + 2; j++) ds[j] = { halign: 'right' };
      table(['Giorno'].concat(names, ['Totale', 'Progressivo']), drow, { columnStyles: ds });
    }

    /* una sezione per persona */
    names.forEach(function (n) {
      var p = people[n]; doc.addPage(); y = M + 10;
      doc.setFillColor.apply(doc, RED); doc.rect(0, 0, W, 8, 'F');
      title(n, 20);
      var top = sum(p.topups, 'usd'), sp = sum(p.expenses, 'usd');
      note('Ricaricato ' + usd(top) + ' · speso ' + usd(sp) + ' (' + eur(sum(p.expenses, 'eur')) + ') · rimasto ' + usd(top - sp));
      y += 2; title('Spese', 13);
      if (!p.expenses.length) note('Nessuna spesa.');
      else {
        var ex = p.expenses.slice().sort(function (a, b) { return (a.data + a.ora).localeCompare(b.data + b.ora); });
        table(['Giorno', 'Ora', 'Descrizione', 'Categoria', 'Dollari', 'Euro', 'Commento'], ex.map(function (e) {
          return [dayLabel(e.data), e.ora || '', e.desc || e.cat, e.cat, usd(e.usd), eur(e.eur), comments[ekey(n, e)] || ''];
        }), { columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 32 }, 4: { halign: 'right', cellWidth: 52 }, 5: { halign: 'right', cellWidth: 50 }, 6: { cellWidth: 100 } }, styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3.5, lineColor: [215, 215, 220], lineWidth: .4, textColor: INK, overflow: 'linebreak' } });
      }
      need(70); title('Ricariche', 13);
      if (!p.topups.length) note('Nessuna ricarica.');
      else table(['Giorno', 'Ora', 'Nota', 'Dollari', 'Euro'], p.topups.slice().sort(function (a, b) { return (a.data + a.ora).localeCompare(b.data + b.ora); }).map(function (t) {
        return [dayLabel(t.data), t.ora || '', t.desc || 'Ricarica', '+' + usd(t.usd), '+' + eur(t.eur)];
      }), { columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } } });
    });

    /* numeri di pagina */
    var n = doc.internal.getNumberOfPages();
    for (var p2 = 1; p2 <= n; p2++) { doc.setPage(p2); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, SOFT); doc.text('Pagina ' + p2 + ' di ' + n, W - M, doc.internal.pageSize.getHeight() - 20, { align: 'right' }); }
    return doc;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { buildReport: buildReport };
  else root.buildReport = buildReport;
})(typeof self !== 'undefined' ? self : this);
