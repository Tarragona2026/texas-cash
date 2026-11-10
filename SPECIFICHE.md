# Xmas in Texa$ — specifiche per Claude

## Come lavorare

- Parla in italiano, risposte brevi.
- Matteo non è un programmatore: spiega le cose in modo semplice.
- Dopo ogni modifica: commit e push su `main`, che pubblica la app.
- Repository: https://github.com/Tarragona2026/texas-cash (GitHub Pages, nessun server).
- Lavorare sulla versione telefono (`index.html`). Il Mac si adegua dopo (vedi sezione Mac).
- Procedere per fasi, nell'ordine indicato sotto. Alla fine di ogni fase Matteo prova sul telefono prima di passare alla successiva.

## Contesto

Web app (PWA) per le spese e il viaggio di Natale in Texas di Matteo, Leslie e Leo. Sul Mac è installata come web app di Safari "Xmas Texa$" e apre `https://tarragona2026.github.io/texas-cash/mac/index.html`.

Struttura del codice: - `index.html`: versione telefono (la principale per le nuove funzioni) - `mac/index.html`, `mac/report.js`: versione Mac, con export PDF (totale, giorno per giorno, persone, ricariche, commenti) - `ocr.js`: lettura scontrini da foto - `sw.js`: service worker (si aggiorna da solo quando c'è rete) - `img/`: sfondi del viaggio, scelti da `selezione-immagini-texas.json`, che cambiano in base al giorno - `manifest.json`, icone: Texas bianco su rosso

Già presente: spese per persona e per giorno, ricariche (cash), categorie (anche Vestiti e Regali), commento per spesa, cambio USD/EUR (frankfurter.dev), OCR scontrini con mancia suggerita e correzione cifre, grafico a ciambella per tipologia. Dati oggi solo sul telefono (localStorage per i dati, IndexedDB per le foto). Oggi il telefono crea un CSV e l'app Mac lo importa.

Home attuale: plafond (budget in dollari con barra che si riempie), saluto "Ciao, Matteo", neve leggera, dock di navigazione in basso; calcolo prezzo con mancia e caricamento scontrino sono schermate separate.

Viaggio: arrivo in Texas il 22 dicembre alle 22:00, rientro il 4 gennaio (verso l'aeroporto IAH). Anno 2026-27. Data e orario esatti del volo di andata e di ritorno: da confermare con Matteo.

## Decisioni prese

### 1. Home nuova

- Il dock in basso sparisce (sarebbe doppio).
- Sotto il plafond, griglia di icone grandi e tondeggianti, come tasti di un telefono, con scritta corta sotto. Stessa pressione elastica dei pulsanti attuali.
- Icone: Aggiungi spesa, Carica scontrino, Registro (lista spese + grafico), Foto, Diario, Traduttore, Mappa, Calendario, Checklist, Documenti, Chiama, Dove sono i miei, Impostazioni.
- In home anche un riquadro "Domani" con il programma del giorno dopo (dal Calendario).
- "Aggiungi spesa" e "Carica scontrino" sono sempre in vista. "Carica scontrino" apre direttamente la fotocamera, legge la cifra con OCR, propone mancia e categoria, poi salva con la posizione.
- Sfondo: eliminare lo sfondo che cambia ogni giorno e le sue immagini (cartella `img/` degli sfondi, `selezione-immagini-texas.json`, crediti delle foto nell'app, voci in `sw.js`). Matteo non vuole cambi di sfondo ("diventa troppo pesante"): usare un fondo fisso nei colori già usati dall'app (rosso/bianco Texas). Prima di cancellare, controllare che la versione Mac non usi quelle immagini. Confermare con Matteo l'aspetto del fondo.

### 2. Firebase per tutto

- Servizio online: Firebase, piano gratuito.
- Accesso con codice viaggio (per esempio "TEXAS26"), senza account.
- Matteo crea il progetto Firebase con il suo account Google. Guidarlo passo passo.
- Ognuno carica dal proprio telefono: spese, scontrini, foto, diario, posizioni. Il Mac scarica e unisce tutto. Il CSV resta solo come copia di sicurezza.
- Le foto vanno ridimensionate sul telefono prima del caricamento.
- Funzionamento senza rete: l'app salva tutto sul telefono e carica da sola quando torna la connessione (coda di sincronizzazione). Matteo prenderà tre SIM dati, ma deve funzionare comunque.
- Spese: non si dividono tra Matteo, Leslie e Leo. Niente "chi deve cosa a chi". Restano le spese per persona già presenti.

### 3. Diario (privato)

- Tre diari separati, uno per persona, scritti sul proprio telefono. Ogni voce ha testo, foto, posizione e orario.
- I telefoni di Leslie e Leo scrivono soltanto: non leggono i diari degli altri.
- Solo il Mac di Matteo legge tutti e tre i diari, con le foto, protetto da un PIN che conosce solo Matteo.
- Attenzione tecnica: senza account, il codice viaggio da solo non basta a rendere i diari privati. Valutare con Matteo la cifratura dei diari sul telefono con una chiave derivata dal PIN, così su Firebase restano illeggibili. Spiegarlo in modo semplice.

### 4. Foto e album condiviso

- Il tasto "Scatta foto" apre la fotocamera. Dopo lo scatto l'app: prende la posizione, registra l'orario, ridimensiona la foto, la carica nell'album condiviso su Firebase con il nome di chi l'ha scattata.
- L'album è condiviso e visibile a tutti e tre.
- Un solo gesto "Salva" dopo lo scatto: mette la foto nell'album e nella voce del diario di oggi (se oggi non c'è una voce, l'app la crea; il testo si aggiunge dopo) e apre il menu di condivisione per copiarla anche nel rullino.
- Limite iOS: una web app non può scrivere da sola nel rullino. Il passaggio nel menu "Salva immagine" resta manuale. Alternativa semplice per chi vuole l'originale in alta qualità: scattare con la fotocamera normale e poi scegliere la foto dal rullino nell'app.
- Da confermare con Matteo: il comportamento "un solo gesto" appena sopra.

### 5. Posizione e mappa

- La posizione si salva solo quando si registra una spesa, una foto o una voce di diario. Solo punti, niente tracciato continuo (batteria; in una web app funzionerebbe solo con lo schermo acceso).
- Se manca il segnale, l'elemento si salva lo stesso senza posizione.
- Per le foto, usare la posizione GPS presa al momento del salvataggio nell'app (le foto della fotocamera possono non averla).
- Mappa sul telefono: ognuno vede solo i propri punti. Tocco su un punto: importo, tipologia e commento (spese), anteprima (foto/diario).
- Mappa sul Mac: tutti e tre, un colore per persona, icone diverse per spese/foto/diario, filtro per giorno e per tipo. Leslie e Leo vanno informati che Matteo vede le loro spese sulla mappa.
- "Dove sono i miei": sul telefono, l'ultima posizione di Leslie e Leo. Si aggiorna con un tasto "Sono qui" e in automatico quando salvano spesa, foto o voce di diario.

### 6. Traduttore italiano ⇄ inglese americano

- Testo e voce (sintesi vocale del telefono per leggere la traduzione).
- Frasi pronte: ristorante, hotel, benzina, dogana, un tocco per farle leggere.
- Modalità conversazione: premi il microfono, parli in italiano, il telefono legge in inglese; poi l'altra persona parla in inglese e tu leggi (o senti) in italiano; un pulsante cambia lingua.
- Si usa sempre con la rete. Scegliere un servizio di traduzione gratuito o a basso costo e spiegarne i limiti a Matteo.
- Limiti noti: il riconoscimento vocale su iPhone nel browser è meno affidabile che su Android e il microfono va premuto ogni volta (non ascolta da solo in continuo).

### 7. Calendario di viaggio

- Agenda giorno per giorno con tappe, luoghi e orari, modificabile da Matteo, Leslie e Leo. Le modifiche arrivano a tutti via Firebase.
- Ogni tappa può avere un luogo: si vede sulla mappa e si apre in Maps con un tocco.
- Parte con la bozza dell'itinerario (appendice) già inserita, poi modificabile nell'app.
- Riquadro "Domani" in home (base).
- Notifica serale: ogni sera, a un orario scelto (per esempio le 20:00), con il programma di domani; toccandola si apre la giornata con i luoghi sulla mappa. Richiede notifiche push da Firebase e l'app installata nella Home con iOS 16.4 o più recente. Se si cambia un orario, cambia anche l'avviso. Se le notifiche si rivelano troppo complesse, il riquadro "Domani" basta.

### 8. Checklist di viaggio

- Liste per tema: Documenti, Valigia, Prima di partire, Arrivo in Texas. Casella da spuntare per ogni voce, contatore in cima.
- Lista generale condivisa tra i tre (se Leslie spunta "ESTA fatta", lo vedono tutti). Lista Valigia separata per persona.
- Si possono aggiungere, togliere e spostare voci. Lista di partenza con le cose tipiche per gli Stati Uniti.
- Promemoria (notifiche): una settimana prima, due giorni prima e la sera prima della partenza, con quante voci mancano. Facoltativo: avviso per voci con scadenza.

### 9. Documenti (solo sul telefono, mai su Firebase)

- Restano solo sul telefono di ciascuno, si aprono anche senza rete.
- Cartella "Viaggio": ESTA, assicurazione, biglietto aereo, altri biglietti e prenotazioni (foto o PDF).
- Cartella "Personali", dietro PIN: carta d'identità e passaporto, solo come foto, senza scrivere i numeri nell'app.
- Scheda "Flavia" (sorella di Leslie, che ospita il gruppo): indirizzo e telefono si aprono senza rete, con tasto per scriverle su WhatsApp. L'indirizzo e il numero li inserisce Matteo nell'app: NON scriverli nel codice né in questo file.

### 10. Chiamata rapida

- Tasto per ogni contatto: Leslie, Leo, Flavia. Apre la chat WhatsApp (link `wa.me`), poi la chiamata si avvia con un ultimo tocco.
- Hotel, noleggio auto e emergenze (911) usano la chiamata normale del telefono (`tel:`), perché WhatsApp non chiama le emergenze.
- Elenco contatti modificabile nelle Impostazioni: nome, numero, tipo di chiamata (WhatsApp o normale). I numeri non vanno scritti nel codice.

### 11. Copia di sicurezza

- Un tasto che esporta tutti i dati dell'utente in un file (spese, diario, foto, checklist), per recuperare tutto se si rompe o si ripristina il telefono.
- I documenti personali restano solo sul telefono: decidere con Matteo se includerli nell'export (di default no).

### Non inclusi

Conto tra i tre, parcheggio, calcolo benzina/galloni, meteo e fuso orario.

## Ordine dei lavori

1. Nuova home a icone e pulizia degli sfondi.
2. Firebase (Matteo crea il progetto) con sincronizzazione delle spese, scontrini e funzionamento senza rete.
3. Posizione sulle spese e mappa.
4. Traduttore.
5. Foto, album condiviso e diario.
6. Calendario di viaggio con notifiche, checklist, documenti, "Dove sono i miei", chiamata rapida, copia di sicurezza. Documenti, chiamata rapida e copia di sicurezza non dipendono da Firebase e si possono anticipare se serve.

## Versione Mac (dopo il telefono)

- Il Mac si collega a Firebase con lo stesso codice viaggio e non importa più il CSV (il CSV resta come alternativa/backup).
- Scarica e unisce spese, scontrini, foto, tre diari (con PIN di Matteo), posizioni.
- Mappa completa con tutti e tre, colore per persona, filtro per giorno.
- L'export PDF (`mac/report.js`) può includere in seguito diari, foto e mappa.

## Appendice — Itinerario (bozza di Matteo, da caricare nel Calendario)

Date: dal 22 dicembre 2026 al 4 gennaio 2027. Testo originale in inglese; da rifinire dentro l'app.

- **22 dic** — Arrival 10pm. Dinner at home.
- **23 dic** — Breakfast at home (very light). HEB supermarket visit. BD lunch, steak house reserved 1pm. Outlet 365 stores visit (Leo). Dinner at home.
- **24 dic** — Breakfast at (Matteo old diner). Cooking for dinner, Steve at home. Xmas dinner home. Most places close.
- **25 dic** — Steve at home for lunch. Relax at home, opening gifts. Mostly stores/places closed. Dinner out if open.
- **26 dic** — 7:30am leave home. Breakfast out on the way to NASA. 11am NASA tour (3 hours). Late lunch at Kemah pier. From there to Galveston. Airbnb check-in. Dinner seafood at Fisherman's Wharf.
- **27 dic** — Check out. Breakfast in Galveston. Stroll in the city. Lunch at Louisiana Galleria. Academy Sports (Leo). Dinner at home.
- **28 dic** — Leave 8am to Austin to visit Steve. Round visit on the way. Lunch at a famous BBQ place. Sports bar (?). Dinner: da decidere (Smithville?). Sleep at Steve's home.
- **29 dic** — Breakfast at Steve's. Bastrop visit and lunch. Drive home. Cypress 290 outlet. Texas cowboy boots store visit. Dinner at a Mexican restaurant (fajitas).
- **30 dic** — Breakfast at home. Lunch at The Corkscrew BBQ. Old Town Spring visit. Dinner at Shogun.
- **31 dic** — Breakfast at (da decidere). Cooking for NYE, decorate the table. 8pm friends arrive at home.
- **1 gen** — Most stores close. Home sweet home, relax.
- **2 gen** — Breakfast at home. Lunch at Woodson's hamburgers. Costco. Check places to see country music at night.
- **3 gen** — Breakfast at home. Lunch at a Mexican restaurant. 4pm leave for the NBA game downtown. Leslie and Matteo at Il Postino.
- **4 gen** — Morning: pack. Drive to IAH. Bye bye.