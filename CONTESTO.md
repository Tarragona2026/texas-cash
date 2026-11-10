# Xmas in Texa$ — contesto per Claude

## Cos'è
Web app (PWA) per il viaggio di Natale in Texas (22 dic 2026 – 4 gen 2027) di Matteo, Leslie e Leo.
Repository: https://github.com/Tarragona2026/texas-cash (pubblico, pubblicato su GitHub Pages, nessun server).
Telefono: https://tarragona2026.github.io/texas-cash/ — Mac: `.../texas-cash/mac/index.html`
Le specifiche complete sono in `SPECIFICHE.md`.

## Come lavorare
- Parla in italiano, risposte brevi e semplici: Matteo non è un programmatore.
- Dopo ogni modifica: commit e push su `main` (pubblica l'app in 1–3 minuti).
- A ogni rilascio: alza `APP_VER` in `index.html` e `CACHE` in `sw.js` (ora **v49**; Mac `mac/sw.js` v11).
- Prima il telefono (`index.html`), poi il Mac (`mac/index.html`).
- Prova nel browser prima di pubblicare; cancella i dati di prova da Firebase (viaggi `_prova_*`).
- Il repository è pubblico: MAI scrivere nel codice indirizzi privati, numeri di telefono, PIN o la chiave privata del diario. L'indirizzo di casa di Flavi non va nel codice.
- Il PIN e il file chiave del diario li ha solo Matteo: non chiederli mai.
- La chiave Google funziona solo dal sito online (limitata per referrer), non da localhost.

## Struttura
- `index.html`: app telefono (tutto in un file). `ocr.js`: lettura importi e data dagli scontrini (test: `node test/parse.test.js`).
- `mac/index.html`, `mac/report.js`: app Mac, legge tutto da Firebase, export PDF.
- `firebase-config.js`, `google-config.js`, `diary-crypto.js`, `diario-config.js` (chiave pubblica diario), `diario-chiavi.html`.
- Firebase progetto `xmas-texas`, codice viaggio `texas2026`; raccolte sotto `trips/{codice}`: items, photos, album, albumFull, diary, diaryPhotos, checklist, calendar.
- Dati locali: localStorage `texascash.v1`, foto in IndexedDB `texascash` / `photos`.

## Fatto
- Spese, ricariche, categorie, cambio, grafico, sincronizzazione Firebase.
- Scontrini: OCR importi, data e ora (italiana e americana) con campo modificabile, indirizzo, riconoscimento negozio (Google Places + OpenStreetMap), ricerca a mano per indirizzo con elenco attività.
- Posizione sulle spese e mappa (OpenStreetMap, scelta di Matteo per non pagare).
- Traduttore IT⇄EN (solo dettatura da tastiera).
- Album foto condiviso; diario privato cifrato con calendario e mappa.
- Checklist per persona (Leslie vede le 3, Matteo la sua e di Leo, Leo solo la sua, il Mac tutte).
- Calendario di viaggio con itinerario aggiornato (id `c2_...`, `seedVer` 2) e scheda "Domani".
- App Mac: spese, mappa, foto, diari (file chiave + PIN), checklist.

## Da fare (in ordine)
1. **Documenti** (prossimo, non ancora iniziato): solo sul telefono, mai su Firebase, anche senza rete. Cartella "Viaggio" (ESTA, assicurazione, biglietti: foto o PDF), cartella "Personali" dietro PIN (solo foto), scheda "Flavia" con indirizzo e telefono inseriti da Matteo nell'app e tasto WhatsApp. Vedi SPECIFICHE.md punto 9.
2. Chiamata rapida (wa.me / tel:, contatti modificabili nelle Impostazioni).
3. "Dove sono i miei" (ultima posizione di Leslie e Leo).
4. Copia di sicurezza completa.
5. Grafica e tasti: Matteo li rivede quando lo dice lui.
6. Calendario sul Mac; PDF Mac con diari, foto e mappa (facoltativi).

## Da confermare con Matteo
- Scontrini veri: la lettura di indirizzo, negozio e data è stata provata solo con scontrini finti.
- Itinerario: mancano indirizzi di steak house del 23, colazione del 24, Airbnb di Galveston, BBQ del 28.
