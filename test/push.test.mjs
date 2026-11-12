// Prova del servizio notifiche: node test/push.test.mjs
// Decifra con un'implementazione separata (node:crypto) quello che il servizio cifra con WebCrypto.
import nodeCrypto from 'node:crypto';
import assert from 'node:assert';
import worker, { encryptPayload, vapidAuth, vapidPublic, hostAllowed, b64u, unb64u } from '../cloudflare/worker.js';

const hk = (salt, ikm, info, len) => Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, info, len));
function decrypt(ecdh, auth, body) {                        // lato telefono, RFC 8291
  const salt = body.subarray(0, 16), idlen = body[20], asPublic = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  assert.strictEqual(body.readUInt32BE(16), 4096); assert.strictEqual(idlen, 65);
  const shared = ecdh.computeSecret(asPublic);
  const ikm = hk(auth, shared, Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), asPublic]), 32);
  const cek = hk(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), nonce = hk(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const d = nodeCrypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const out = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  assert.strictEqual(out[out.length - 1], 2); return out.subarray(0, out.length - 1).toString('utf8');
}
const phone = () => { const ecdh = nodeCrypto.createECDH('prime256v1'); ecdh.generateKeys(); const auth = nodeCrypto.randomBytes(16); return { ecdh, auth, sub: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth) } }; };

let n = 0; const ok = (name) => { n++; console.log('ok', name); };

// 1. cifratura
{ const p = phone(), text = JSON.stringify({ title: 'Xmas in Texa$', body: 'Matteo chiede dove sei — àèìòù' });
  const body = Buffer.from(await encryptPayload(p.sub.p256dh, p.sub.auth, new TextEncoder().encode(text)));
  assert.strictEqual(decrypt(p.ecdh, p.auth, body), text); ok('il telefono decifra il messaggio');
  const other = phone(); assert.throws(() => decrypt(other.ecdh, other.auth, body)); ok('un altro telefono non lo decifra'); }

// 2. firma
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwkFull = await crypto.subtle.exportKey('jwk', kp.privateKey), jwk = { d: jwkFull.d, x: jwkFull.x, y: jwkFull.y };
{ const h = await vapidAuth(jwk, 'https://web.push.apple.com/abc/def', 1800000000), m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  assert.ok(m); assert.strictEqual(m[4], vapidPublic(jwk)); assert.strictEqual(unb64u(m[4]).length, 65);
  const claims = JSON.parse(Buffer.from(unb64u(m[2])).toString());
  assert.strictEqual(claims.aud, 'https://web.push.apple.com'); assert.strictEqual(claims.exp, 1800000000 + 43200); assert.ok(/^https:/.test(claims.sub));
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, unb64u(m[3]), new TextEncoder().encode(m[1] + '.' + m[2]))); ok('firma valida'); }

// 3. indirizzi permessi
assert.ok(hostAllowed('https://web.push.apple.com/x')); assert.ok(hostAllowed('https://fcm.googleapis.com/fcm/send/x')); assert.ok(hostAllowed('https://updates.push.services.mozilla.com/x'));
assert.ok(!hostAllowed('https://evil.example.com/x')); assert.ok(!hostAllowed('http://web.push.apple.com/x')); assert.ok(!hostAllowed('https://push.apple.com.evil.com/x')); assert.ok(!hostAllowed('nonsense')); ok('solo i server di notifica veri');

// 4. il servizio intero, con la rete finta
{ const env = { VAPID_JWK: JSON.stringify(jwk) }, O = 'https://tarragona2026.github.io', p = phone(), sent = [];
  const realFetch = globalThis.fetch; globalThis.fetch = async (url, opt) => { sent.push({ url, opt }); return new Response(null, { status: url.includes('gone') ? 410 : 201 }); };
  const call = (method, origin, body) => worker.fetch(new Request('https://texas-push.example.workers.dev/', { method, headers: Object.assign({ 'Content-Type': 'application/json' }, origin ? { Origin: origin } : {}), body: body ? JSON.stringify(body) : undefined }), env);
  let r = await call('OPTIONS', O); assert.strictEqual(r.status, 204); assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), O);
  r = await call('OPTIONS', 'https://altro.example'); assert.strictEqual(r.status, 403);
  r = await call('GET'); assert.strictEqual((await r.json()).key, vapidPublic(jwk));
  r = await call('POST', 'https://altro.example', { subs: [], msg: {} }); assert.strictEqual(r.status, 403);
  r = await call('POST', O, { subs: [], msg: { body: 'x' } }); assert.strictEqual(r.status, 400);
  r = await worker.fetch(new Request('https://x/', { method: 'POST', headers: { Origin: O }, body: '{}' }), {}); assert.strictEqual(r.status, 500);
  r = await call('POST', O, { subs: [Object.assign({ endpoint: 'https://web.push.apple.com/ok' }, p.sub), Object.assign({ endpoint: 'https://web.push.apple.com/gone' }, p.sub), Object.assign({ endpoint: 'https://evil.example.com/x' }, p.sub), { endpoint: 'https://web.push.apple.com/bad', p256dh: 'AAAA', auth: 'AAAA' }], msg: { body: 'Matteo chiede dove sei', kind: 'pos' } });
  const j = await r.json(); assert.deepStrictEqual(j.results.map((x) => x.status), [201, 410, 0, 0]); assert.strictEqual(sent.length, 2);
  const s0 = sent[0]; assert.strictEqual(s0.opt.headers['Content-Encoding'], 'aes128gcm'); assert.ok(/^vapid t=/.test(s0.opt.headers.Authorization));
  const msg = JSON.parse(decrypt(p.ecdh, p.auth, Buffer.from(s0.opt.body))); assert.strictEqual(msg.body, 'Matteo chiede dove sei'); assert.strictEqual(msg.kind, 'pos'); assert.strictEqual(msg.title, 'Xmas in Texa$');
  globalThis.fetch = realFetch; ok('il servizio accetta solo la nostra app e consegna il messaggio cifrato'); }

// 5. app iOS: richiesta ad Apple (APNs) con la rete finta
{ const { apnsJwt } = await import('../cloudflare/worker.js');
  const kp2 = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', kp2.privateKey)).toString('base64');
  const pem = '-----BEGIN PRIVATE KEY-----\n' + der.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
  const env = { APNS_KEY: pem, APNS_KEY_ID: 'ABC123DEFG', APNS_TEAM_ID: 'TEAM123456', APNS_TOPIC: 'com.example.app' };
  const jwt = await apnsJwt(env, 1800000000), parts = jwt.split('.');
  assert.deepStrictEqual(JSON.parse(Buffer.from(unb64u(parts[0])).toString()), { alg: 'ES256', kid: 'ABC123DEFG' });
  assert.deepStrictEqual(JSON.parse(Buffer.from(unb64u(parts[1])).toString()), { iss: 'TEAM123456', iat: 1800000000 });
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp2.publicKey, unb64u(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])));
  const sent = [], realFetch = globalThis.fetch, T = 'a'.repeat(64), SB = 'b'.repeat(64), GONE = 'c'.repeat(64);
  globalThis.fetch = async (url, opt) => { sent.push({ url, opt });
    if (url.includes(GONE)) return new Response(JSON.stringify({ reason: 'Unregistered' }), { status: 410 });
    if (url.includes(SB) && !url.includes('sandbox')) return new Response(JSON.stringify({ reason: 'BadDeviceToken' }), { status: 400 });
    return new Response(null, { status: 200 }); };
  const call = (body, e) => worker.fetch(new Request('https://x/apns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), e || env);
  let r = await call({ tokens: [T], msg: { body: 'x' } }, {}); assert.strictEqual(r.status, 500);
  r = await call({ tokens: [], msg: { body: 'x' } }); assert.strictEqual(r.status, 400);
  r = await call({ tokens: [T, SB, GONE, 'non-valido'], msg: { title: 'Leslie ha speso', body: '$12,50 · Ristoranti', kind: 'spesa' } });
  const j = await r.json(); assert.deepStrictEqual(j.results.map((x) => x.status), [200, 200, 410, 0]); assert.strictEqual(j.results[2].reason, 'Unregistered');
  assert.strictEqual(sent.length, 4); assert.ok(sent.some((x) => x.url === 'https://api.push.apple.com/3/device/' + T)); assert.ok(sent.some((x) => x.url === 'https://api.sandbox.push.apple.com/3/device/' + SB));
  assert.strictEqual(sent[0].opt.headers['apns-topic'], 'com.example.app'); assert.ok(/^bearer /.test(sent[0].opt.headers.authorization));
  const pl = JSON.parse(sent[0].opt.body); assert.strictEqual(pl.aps.alert.title, 'Leslie ha speso'); assert.strictEqual(pl.aps.alert.body, '$12,50 · Ristoranti');
  globalThis.fetch = realFetch; ok('app iOS: firma APNs valida, consegna e ripiego sull\'ambiente di prova'); }

console.log('tutti i test passano (' + n + ')');
