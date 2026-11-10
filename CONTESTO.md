# Xmas in Texa$ — contesto per Claude

## Cos'è
Web app (PWA) per gestire le spese e il viaggio di Natale in Texas di Matteo, Leslie e Leo.
Repository: https://github.com/Tarragona2026/texas-cash (pubblicata su GitHub Pages, nessun server).
Su Mac è installata come web app di Safari "Xmas Texa$" e apre https://tarragona2026.github.io/texas-cash/mac/index.html

## Struttura del codice
- `index.html`: versione telefono (la principale per le nuove funzioni)
- `mac/index.html`, `mac/report.js`: versione Mac, con export PDF (totale, giorno per giorno, persone, ricariche, commenti)
- `ocr.js`: lettura degli scontrini da foto
- `sw.js`: service worker (si aggiorna da solo quando c'è rete)
- `img/`: sfondi del viaggio, scelti da `selezione-immagini-texas.json`, che cambiano in base al giorno
- `manifest.json`, icone: Texas bianco su rosso

## Cosa c'è già
- Spese per persona e per giorno, ricariche (cash), categorie (anche Vestiti e Regali)
- Commento per ogni spesa
- Cambio USD/EUR (api frankfurter.dev)
- Lettura scontrini con OCR, mancia suggerita, correzione cifre
- Grafico a ciambella delle spese per tipologia
- Dati salvati solo sul telefono: localStorage per i dati, IndexedDB per le foto. Nessuna sincronizzazione tra persone.

## Cosa vogliamo aggiungere (solo versione telefono)
1. **Geolocalizzazione sulle spese**: alla registrazione di una spesa si salva la posizione (se manca il segnale, la spesa si salva lo stesso senza posizione). Mappa con un punto per spesa, che al tocco mostra importo, tipologia e commento. Da decidere: sulla mappa solo le spese di Matteo o di tutti.
2. **Traduttore italiano ⇄ inglese americano**: testo e voce, frasi pronte (ristorante, hotel, benzina, dogana). Si userà sempre con la rete.
3. **Diario di viaggio**: una voce per giorno con testo, foto, posizione e orario. Album foto condiviso tra Matteo, Leslie e Leo.
   - Servizio online: Firebase, piano gratuito
   - Accesso con codice viaggio (per esempio "TEXAS26"), senza account
   - Matteo deve prima creare il progetto Firebase con il suo account Google
   - Le foto vanno ridimensionate sul telefono prima del caricamento

## Ordine dei lavori
1. Posizione sulle spese e mappa
2. Traduttore
3. Diario e album condiviso (dopo che c'è Firebase)

## Come lavorare
- Parla in italiano, risposte brevi.
- Matteo non è un programmatore: spiega le cose in modo semplice.
- Dopo ogni modifica: commit e push su `main`, che pubblica la app.
