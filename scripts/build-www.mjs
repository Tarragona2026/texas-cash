// Copia in www/ solo i file della app telefono: è la cartella che Capacitor mette dentro l'app iOS.
// La PWA su GitHub Pages continua a usare i file originali: qui non si modifica niente.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
const FILES = ['index.html', 'ocr.js', 'firebase-config.js', 'google-config.js', 'diary-crypto.js', 'diario-config.js', 'push-config.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const DIRS = ['vendor', 'img'];
rmSync('www', { recursive: true, force: true }); mkdirSync('www');
for (const f of FILES) if (existsSync(f)) cpSync(f, 'www/' + f);
for (const d of DIRS) cpSync(d, 'www/' + d, { recursive: true });
console.log('www pronta');
