// Xmas in Texa$ — servizio che spedisce le notifiche push (Cloudflare Worker).
// Non conserva niente: riceve dall'app l'elenco dei telefoni a cui scrivere e il testo,
// cifra il messaggio (RFC 8291), lo firma con la chiave privata (segreto VAPID_JWK, RFC 8292)
// e lo consegna ai server di Apple / Google / Mozilla. La chiave privata non è nel repository.

const ALLOWED_ORIGINS = ['https://tarragona2026.github.io'];
const PUSH_HOSTS = ['.push.apple.com', 'fcm.googleapis.com', '.push.services.mozilla.com', '.notify.windows.com'];
const SUBJECT = 'https://tarragona2026.github.io/texas-cash/';
const MAX_SUBS = 12, MAX_BYTES = 1800;

const enc = new TextEncoder();
export const b64u = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = (s) => { const t = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; };
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

// Cifratura del messaggio per un telefono (aes128gcm, un solo record).
export async function encryptPayload(p256dh, auth, plain) {
  const uaPublic = unb64u(p256dh), authSecret = unb64u(auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('bad-keys');
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(plain, new Uint8Array([2]))));
  const header = concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPublic.length]), asPublic);
  return concat(header, body);
}

export function vapidPublic(jwk) { return b64u(concat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y))); }

// Intestazione "Authorization" firmata con la chiave privata (ES256).
export async function vapidAuth(jwk, endpoint, nowSec) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: jwk.d, x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + claims));
  return 'vapid t=' + head + '.' + claims + '.' + b64u(sig) + ', k=' + vapidPublic(jwk);
}

export function hostAllowed(endpoint) {
  let u; try { u = new URL(endpoint); } catch (e) { return false; }
  if (u.protocol !== 'https:') return false;
  return PUSH_HOSTS.some((h) => (h[0] === '.' ? u.hostname.endsWith(h) : u.hostname === h));
}

async function sendOne(jwk, sub, plain) {
  try {
    if (!sub || !hostAllowed(sub.endpoint)) return { status: 0, error: 'endpoint' };
    const body = await encryptPayload(sub.p256dh, sub.auth, plain);
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidAuth(jwk, sub.endpoint, Math.floor(Date.now() / 1000)), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '10800', Urgency: 'high' },
      body,
    });
    return { status: r.status };
  } catch (e) { return { status: 0, error: String((e && e.message) || e).slice(0, 80) }; }
}

function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
function json(obj, status, origin) { return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, origin ? cors(origin) : {}) }); }

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '', ok = ALLOWED_ORIGINS.includes(origin);
    let jwk = null; try { jwk = JSON.parse(env.VAPID_JWK || 'null'); } catch (e) {}
    if (req.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: ok ? cors(origin) : {} });
    if (req.method === 'GET') return json({ ok: true, key: jwk && jwk.d ? vapidPublic(jwk) : null }, 200, ok ? origin : '');
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!ok) return json({ error: 'origin' }, 403);
    if (!jwk || !jwk.d) return json({ error: 'no-key' }, 500, origin);
    let data; try { data = await req.json(); } catch (e) { return json({ error: 'json' }, 400, origin); }
    const subs = Array.isArray(data && data.subs) ? data.subs.slice(0, MAX_SUBS) : [], m = (data && data.msg) || {};
    const msg = { title: String(m.title || 'Xmas in Texa$').slice(0, 80), body: String(m.body || '').slice(0, 240), tag: String(m.tag || 'texas').slice(0, 30), kind: String(m.kind || '').slice(0, 20) };
    const plain = enc.encode(JSON.stringify(msg));
    if (!subs.length || plain.length > MAX_BYTES) return json({ error: 'input' }, 400, origin);
    const results = await Promise.all(subs.map((s) => sendOne(jwk, s, plain)));
    return json({ results }, 200, origin);
  },
};
