/* Cifratura del diario. Ogni voce e ogni foto si chiudono sul telefono con una chiave casuale (AES-GCM);
   quella chiave si chiude a sua volta con la chiave PUBBLICA di Matteo (RSA-OAEP).
   Solo chi ha la chiave PRIVATA (protetta dal PIN di Matteo) puo' aprire tutto. Il database vede solo dati illeggibili. */
(function (root) {
  var subtle = root.crypto && root.crypto.subtle;
  function b64(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  var RSA = { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
  var ITER = 600000;

  function pinKey(pin, salt, iter) {
    return subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  // crea la coppia di chiavi; la privata esce protetta dal PIN
  function generateKeys(pin) {
    return subtle.generateKey(RSA, true, ['encrypt', 'decrypt']).then(function (kp) {
      return Promise.all([subtle.exportKey('jwk', kp.publicKey), subtle.exportKey('pkcs8', kp.privateKey)]).then(function (ex) {
        var salt = root.crypto.getRandomValues(new Uint8Array(16)), iv = root.crypto.getRandomValues(new Uint8Array(12));
        return pinKey(pin, salt, ITER).then(function (k) { return subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, ex[1]); }).then(function (ct) {
          return { publicJwk: ex[0], protectedPrivate: { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) } };
        });
      });
    });
  }
  function unlockPrivate(prot, pin) {
    return pinKey(pin, unb64(prot.salt), prot.iter).then(function (k) { return subtle.decrypt({ name: 'AES-GCM', iv: unb64(prot.iv) }, k, unb64(prot.data)); })
      .then(function (pk) { return subtle.importKey('pkcs8', pk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']); });
  }
  // cifra dei byte per la chiave pubblica
  function encryptFor(pubJwk, bytes) {
    return subtle.importKey('jwk', pubJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']).then(function (pub) {
      return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']).then(function (ak) {
        var iv = root.crypto.getRandomValues(new Uint8Array(12));
        return Promise.all([subtle.encrypt({ name: 'AES-GCM', iv: iv }, ak, bytes), subtle.exportKey('raw', ak).then(function (raw) { return subtle.encrypt({ name: 'RSA-OAEP' }, pub, raw); })]).then(function (r) {
          return { v: 1, iv: b64(iv), ct: b64(r[0]), wk: b64(r[1]) };
        });
      });
    });
  }
  function decryptWith(privKey, pack) {
    return subtle.decrypt({ name: 'RSA-OAEP' }, privKey, unb64(pack.wk)).then(function (raw) {
      return subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    }).then(function (ak) { return subtle.decrypt({ name: 'AES-GCM', iv: unb64(pack.iv) }, ak, unb64(pack.ct)); });
  }
  function encryptJson(pubJwk, obj) { return encryptFor(pubJwk, new TextEncoder().encode(JSON.stringify(obj))); }
  function decryptJson(privKey, pack) { return decryptWith(privKey, pack).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); }); }
  function encryptBlob(pubJwk, blob) { return blob.arrayBuffer().then(function (ab) { return encryptFor(pubJwk, new Uint8Array(ab)); }); }
  function decryptBlob(privKey, pack, type) { return decryptWith(privKey, pack).then(function (b) { return new Blob([b], { type: type || 'image/jpeg' }); }); }

  root.DiaryCrypto = { generateKeys: generateKeys, unlockPrivate: unlockPrivate, encryptJson: encryptJson, decryptJson: decryptJson, encryptBlob: encryptBlob, decryptBlob: decryptBlob, b64: b64, unb64: unb64 };
})(typeof self !== 'undefined' ? self : this);
