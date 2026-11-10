# Xmas in Texa$ — contesto per Claude

## Cos'è
Web app (PWA) per il viaggio di Natale in Texas (22 dic 2026 – 4 gen 2027) di Matteo, Leslie e Leo.
Repository: https://github.com/Tarragona2026/texas-cash (pubblico, pubblicato su GitHub Pages, nessun server).
Telefono: https://tarragona2026.github.io/texas-cash/ — Mac: `.../texas-cash/mac/index.html`
Le specifiche complete sono in `SPECIFICHE.md`.

## Come lavorare
- Parla in italiano, risposte brevi e semplici: Matteo non è un programmatore.
- Dopo ogni modifica: commit e push su `main` (pubblica l'app in 1–3 minuti).
- A ogni rilascio: alza `APP_VER` in `index.html` e `CACHE` in `sw.js` (ora **v53**; Mac `mac/sw.js` v11).
- Prima il telefono (`index.html`), poi il Mac (`mac/index.html`).
- Prova nel browser prima di pubblicare; cancella i dati di prova da Firebase (viaggi `_prova_*`).
- Il repository è pubblico: MAI scrivere nel codice indirizzi privati, numeri di telefono, PIN o la chiave privata del diario. L'indirizzo di casa di Flavi non va nel codice.
- Il PIN e il file chiave del diario li ha solo Matteo: non chiederli mai.
- La chiave Google funziona solo dal sito online (limitata per referrer), non da localhost.

## Struttura
- `index.html`: app telefono (tutto in un file). `ocr.js`: lettura importi e data dagli scontrini (test: `node test/parse.test.js`).
- `mac/index.html`, `mac/report.js`: app Mac, legge tutto da Firebase, export PDF.
- `firebase-config.js`, `google-config.js`, `diary-crypto.js`, `diario-config.js` (chiave pubblica diario), `diario-chiavi.html`.
- Firebase progetto `xmas-texas`, codice viaggio `texas2026`; raccolte sotto `trips/{codice}`: items, photos, album, albumFull, diary, diaryPhotos, checklist, calendar, positions.
- Dati locali: localStorage `texascash.v1`, foto in IndexedDB `texascash` / `photos`.
- Documenti: archivio a parte, mai in sync né nel backup: IndexedDB `texascash-docs` / `files` e localStorage `texascash.docs.v1` (scheda Flavia e dati del PIN). PDF mostrati con `vendor/pdf.min.js` (pdf.js 3.11 legacy, caricato solo quando serve).

## Fatto
- Spese, ricariche, categorie, cambio, grafico, sincronizzazione Firebase.
- Scontrini: OCR importi, data e ora (italiana e americana) con campo modificabile, indirizzo, riconoscimento negozio (Google Places + OpenStreetMap), ricerca a mano per indirizzo con elenco attività.
- Posizione sulle spese e mappa (OpenStreetMap, scelta di Matteo per non pagare).
- Traduttore IT⇄EN (solo dettatura da tastiera).
- Album foto condiviso; diario privato cifrato con calendario e mappa.
- Checklist per persona (Leslie vede le 3, Matteo la sua e di Leo, Leo solo la sua, il Mac tutte).
- Calendario di viaggio con itinerario aggiornato (id `c2_...`, `seedVer` 2) e scheda "Domani".
- Documenti (v50, solo telefono): cartella "Viaggio" (foto o PDF), cartella "Personali" cifrata con un PIN scelto su ogni telefono (AES-GCM, chiave dal PIN; si richiude uscendo), scheda "Flavia" (indirizzo, telefono, note scritti nell'app; tasti WhatsApp, Chiama, Mappe).
- v51: "Calendario" si chiama "Programma di viaggio", "Registro" si chiama "Registro spese e ricariche". Mappa del Programma: prima tutto il viaggio, poi toccando una data solo quel giorno; tasto per trovare tutti i luoghi mancanti. Icone della home spostabili (tieni premuto, trascina, "Fine"; ordine in `st.homeOrder`).
- v52, riordino: una sola Mappa (`renderMap`, `openMap`) con filtri Programma / Spese / Foto / Diario e fila dei giorni; il Programma ha il tasto "Vedi il viaggio sulla mappa" che la apre solo con le tappe. Dal Diario tolte le schede Calendario e Mappa: resta la scrittura con la fila dei giorni del viaggio. Sul telefono la mappa mostra solo i propri punti (foto da `st.album`).
- v53: "Chiama" (contatti in `st.contacts`, solo sul telefono, modificabili in Impostazioni; WhatsApp con `wa.me` o chiamata normale `tel:`; Flavia presa dalla scheda in Documenti; tasto 911). "Dove sono i miei" (`positions/{nome}` su Firebase: ultima posizione di ognuno, aggiornata con "Sono qui" e quando si salva spesa, foto o diario; tutti e tre vedono tutti).
- App Mac: spese, mappa, foto, diari (file chiave + PIN), checklist.

## Da fare (in ordine)
1. Copia di sicurezza completa.
2. Grafica e tasti: Matteo li rivede quando lo dice lui.
3. Calendario sul Mac; PDF Mac con diari, foto e mappa (facoltativi).

## Da confermare con Matteo
- Sicurezza: il codice viaggio `texas2026` è scritto nel codice pubblico, quindi chi lo legge può vedere su Firebase spese, foto e ora anche le posizioni. Proposto a Matteo (10 nov 2026) di passare a un codice segreto scritto a mano sui tre telefoni e sul Mac: in attesa di risposta.
- Chiama e Dove sono i miei: provati solo nel browser del Mac con numeri e posizioni finti.
- Home in gruppi (Soldi, Viaggio, Ricordi, Utili): proposta, Matteo non l'ha chiesta. Non farla senza il suo via.
- Icone spostabili: provate solo nel browser del Mac, da provare su iPhone.
- Documenti: provati solo nel browser del Mac con file finti. Da provare su iPhone: foto dalla fotocamera, PDF veri (biglietti, assicurazione), PIN.
- Scontrini veri: la lettura di indirizzo, negozio e data è stata provata solo con scontrini finti.
- Itinerario: mancano indirizzi di steak house del 23, colazione del 24, Airbnb di Galveston, BBQ del 28.
