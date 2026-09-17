// Leonardo – duell-relé over WebSocket (innebygd i server.js)
//
// Hvorfor: den gamle duellen brukte PeerJS sin gratis-sky til å koble to
// nettlesere direkte (WebRTC). Den er upålitelig – særlig når begge spillerne
// sitter på SAMME lokale nett (samme NAT/ruter), eller når skolen blokkerer
// peer-til-peer-trafikk. Da virket duellen bare av og til.
//
// Denne modulen gir i stedet en liten, selvstendig WebSocket-relé på vår egen
// server. Begge spillerne kobler seg til serveren (samme adresse som de lastet
// siden fra), serveren setter en informasjonskapsel (cookie) for økten og
// videresender meldingene mellom dem. Da virker duellen:
//   – på samme lokale nett (begge når serveren på http://<lokal-ip>:4173)
//   – på tvers av nett (så lenge begge når serveren)
//   – helt uten eksterne tjenester (ingen CDN, virker offline på skolenettet)
//
// Vi har ingen npm-avhengigheter: WebSocket-håndtrykket og rammene (RFC 6455)
// håndteres med Node-kjernen. Dette er bevisst enkelt og lite.

import { createHash, randomBytes } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 128 * 1024;        // 128 kB – rikelig for duellmeldinger
const HEARTBEAT_MS = 20000;          // ping hvert 20. sekund
const DEAD_MS = 60000;               // lukk døde tilkoblinger etter 60 s
const ROOM_TTL_MS = 30 * 60 * 1000;  // tomme/foreldede rom ryddes etter 30 min
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** @type {Map<string, {code:string, host:Conn|null, guest:Conn|null, createdAt:number, lastAt:number}>} */
const rooms = new Map();
let stats = { duels: 0, active: 0, messages: 0 };

export function duelStatus() {
  return { ok: true, rooms: rooms.size, active: stats.active, duels: stats.duels, messages: stats.messages };
}

function makeCode(len = 5) {
  const n = CODE_ALPHABET.length;
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * n)];
  return s;
}

function sanitizeCode(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

// ---------- WebSocket-rammer (RFC 6455) ----------

function encodeFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = 0x81; // FIN + opcode text
  return Buffer.concat([header, payload]);
}

function encodeClose(code = 1000, reason = '') {
  const r = Buffer.from(reason, 'utf8');
  const payload = Buffer.alloc(2 + r.length);
  payload.writeUInt16BE(code, 0);
  r.copy(payload, 2);
  const header = Buffer.alloc(2);
  header[0] = 0x88; // FIN + close
  header[1] = payload.length; // < 126
  return Buffer.concat([header, payload]);
}

class Conn {
  constructor(socket, sid) {
    this.socket = socket;
    this.sid = sid;
    this.role = null;
    this.code = null;
    this.partner = null;
    this.buffer = Buffer.alloc(0);
    this.frag = null;      // { opcode, chunks }
    this.closed = false;
    this.lastSeen = Date.now();
    socket.on('data', (chunk) => this.onData(chunk));
    socket.on('error', () => this.destroy());
    socket.on('close', () => this.destroy());
  }

  send(obj) {
    if (this.closed || this.socket.destroyed) return;
    try { this.socket.write(encodeFrame(JSON.stringify(obj))); } catch { /* ignorer */ }
  }

  ping() {
    if (this.closed || this.socket.destroyed) return;
    try { this.socket.write(Buffer.from([0x89, 0x00])); } catch { /* ignorer */ }
  }

  pong() {
    if (this.closed || this.socket.destroyed) return;
    try { this.socket.write(Buffer.from([0x8a, 0x00])); } catch { /* ignorer */ }
  }

  close(code = 1000, reason = '') {
    if (this._gone) return;
    this._gone = true;
    this.closed = true;
    leaveRoom(this);
    try { this.socket.write(encodeClose(code, reason)); } catch { /* ignorer */ }
    try { this.socket.end(); } catch { /* ignorer */ }
  }

  destroy() {
    if (this._gone) return;
    this._gone = true;
    this.closed = true;
    leaveRoom(this);
    try { this.socket.destroy(); } catch { /* ignorer */ }
  }

  onData(chunk) {
    this.lastSeen = Date.now();
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    this.parseFrames();
  }

  parseFrames() {
    for (;;) {
      const buf = this.buffer;
      if (buf.length < 2) return;
      const b0 = buf[0];
      const b1 = buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        const big = buf.readBigUInt64BE(2);
        if (big > BigInt(MAX_FRAME)) { this.close(1009, 'for stor'); return; }
        len = Number(big);
        offset = 10;
      }
      if (len > MAX_FRAME) { this.close(1009, 'for stor'); return; }
      if (!masked) { this.close(1002, 'maskering mangler'); return; }
      if (buf.length < offset + 4 + len) return;
      const mask = buf.subarray(offset, offset + 4);
      offset += 4;
      const payload = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) payload[i] = buf[offset + i] ^ mask[i & 3];
      this.buffer = buf.subarray(offset + len);
      this.handleFrame(fin, opcode, payload);
      if (this.closed) return;
    }
  }

  handleFrame(fin, opcode, payload) {
    if (opcode === 0x8) { this.close(1000, ''); return; }       // close
    if (opcode === 0x9) { this.pong(); return; }                 // ping
    if (opcode === 0xA) { this.lastSeen = Date.now(); return; }  // pong

    if (opcode === 0x0) {
      // fortsettelsesramme
      if (!this.frag) { this.close(1002, 'uventet fortsettelse'); return; }
      this.frag.chunks.push(payload);
      if (fin) { const full = Buffer.concat(this.frag.chunks); this.frag = null; this.dispatch(full); }
      return;
    }

    if (opcode === 0x1 || opcode === 0x2) {
      if (!fin) { this.frag = { opcode, chunks: [payload] }; return; }
      this.dispatch(payload);
      return;
    }
    // ukjent opcode – ignorer
  }

  dispatch(payload) {
    let msg;
    try { msg = JSON.parse(payload.toString('utf8')); } catch { return; }
    handleMessage(this, msg);
  }
}

// ---------- Duell-protokoll ----------

function findFreeCode(preferred) {
  const code = sanitizeCode(preferred);
  if (code) {
    const room = rooms.get(code);
    if (!room) return code;
    // En vert som har forsvunnet (lukket fane / mistet tilkobling) etterlater
    // et "spøkelsesrom". Da kaster vi det med en gang og bruker koden på nytt.
    const hostDead = !room.host || room.host.closed || room.host.socket.destroyed;
    if (hostDead) { rooms.delete(code); return code; }
  }
  for (let i = 0; i < 50; i++) {
    const c = makeCode();
    if (!rooms.has(c)) return c;
  }
  return makeCode(6);
}

function handleMessage(conn, msg) {
  if (!msg || typeof msg !== 'object') return;
  const t = msg.t;
  stats.messages++;

  if (t === 'hello') {
    if (conn.role) return; // allerede registrert
    if (msg.role === 'host') {
      const code = findFreeCode(msg.code);
      conn.role = 'host';
      conn.code = code;
      rooms.set(code, { code, host: conn, guest: null, createdAt: Date.now(), lastAt: Date.now() });
      stats.active++;
      conn.send({ t: 'ready', code, role: 'host', mode: 'relay' });
    } else if (msg.role === 'guest') {
      const code = sanitizeCode(msg.code);
      const room = rooms.get(code);
      const deadHost = room && (!room.host || room.host.closed || room.host.socket.destroyed);
      if (deadHost) {
        // Rommet har en vert som er borte – fjern det og be gjesten prøve igjen.
        rooms.delete(code);
        conn.send({ t: 'error', error: 'no-room', message: 'Denne duellen er akkurat avsluttet. Be motstanderen opprette en ny duell.' });
        return;
      }
      if (!code || !room || !room.host) { conn.send({ t: 'error', error: 'no-room', message: `Fant ikke en duell med koden «${code || '?'}».` }); return; }
      if (room.guest) { conn.send({ t: 'error', error: 'room-full', message: 'Denne duellen har allerede to spillere.' }); return; }
      conn.role = 'guest';
      conn.code = code;
      room.guest = conn;
      conn.partner = room.host;
      room.host.partner = conn;
      room.lastAt = Date.now();
      stats.duels++;
      conn.send({ t: 'paired', code, role: 'guest', mode: 'relay' });
      room.host.send({ t: 'paired', code, role: 'host', mode: 'relay' });
    } else {
      conn.send({ t: 'error', error: 'bad-role', message: 'Ugyldig rolle.' });
    }
    return;
  }

  if (t === 'msg') {
    const room = conn.code ? rooms.get(conn.code) : null;
    if (room) room.lastAt = Date.now();
    if (conn.partner && !conn.partner.closed) conn.partner.send({ t: 'msg', data: msg.data });
    return;
  }

  if (t === 'ping') { conn.send({ t: 'pong' }); return; }
}

function leaveRoom(conn) {
  if (!conn.code || !conn.role) return;
  const room = rooms.get(conn.code);
  if (!room) return;
  if (room.host === conn) room.host = null;
  if (room.guest === conn) room.guest = null;
  const other = conn.partner;
  if (other && !other.closed) {
    other.partner = null;
    other.send({ t: 'peer-left' });
  }
  conn.partner = null;
  if (stats.active > 0) stats.active--;
  if (!room.host && !room.guest) rooms.delete(conn.code);
}

// ---------- Oppkobling ----------

export function attachDuelServer(server) {
  server.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
    if (url.pathname !== '/api/duel') { socket.destroy(); return; }

    const key = req.headers['sec-websocket-key'];
    const upgrade = String(req.headers['upgrade'] || '').toLowerCase();
    if (!key || upgrade !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    // Cookie: gjenbruk en eksisterende duell-økt, eller lag en ny.
    const cookies = parseCookies(req.headers.cookie);
    let sid = cookies.leo_duel;
    const isNew = !/^[a-f0-9]{16,64}$/.test(sid || '');
    if (isNew) sid = randomBytes(12).toString('hex');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(key)}`,
    ];
    if (isNew) {
      // Funksjonell informasjonskapsel (cookie) for duelløkten. SameSite=Lax
      // gjør at den følger med på vanlige sidelastinger; HttpOnly hindrer
      // skript i å lese den. Ingen sporing – kun økt-id for duellen.
      headers.push('Set-Cookie: leo_duel=' + sid + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000');
    }
    socket.write(headers.join('\r\n') + '\r\n\r\n');
    socket.setNoDelay(true);

    const conn = new Conn(socket, sid);
    if (head && head.length) conn.onData(head);
  });

  const beat = setInterval(() => {
    const now = Date.now();
    for (const conn of allConns()) {
      if (now - conn.lastSeen > DEAD_MS) { conn.destroy(); continue; }
      conn.ping();
    }
    for (const [code, room] of rooms) {
      if (!room.host && !room.guest && now - room.lastAt > 5000) { rooms.delete(code); continue; }
      if (now - room.lastAt > ROOM_TTL_MS) {
        try { room.host && room.host.close(1001, 'rom utløpt'); } catch { /* ignorer */ }
        try { room.guest && room.guest.close(1001, 'rom utløpt'); } catch { /* ignorer */ }
        rooms.delete(code);
      }
    }
  }, HEARTBEAT_MS);
  if (beat.unref) beat.unref();

  server.on('close', () => clearInterval(beat));
}

function* allConns() {
  const seen = new Set();
  for (const room of rooms.values()) {
    for (const c of [room.host, room.guest]) {
      if (c && !seen.has(c)) { seen.add(c); yield c; }
    }
  }
}
