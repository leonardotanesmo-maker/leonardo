// Leonardo – nettverk for duell.
//
// To måter å koble to spillere sammen, i prioritert rekkefølge:
//
//  1) RELÉ (anbefalt): en liten WebSocket-tjeneste som er innebygd i
//     server.js. Begge spillerne kobler seg til SAMME server (den de lastet
//     siden fra), og serveren videresender meldingene. Dette virker på samme
//     lokale nett, på tvers av nett og helt uten eksterne tjenester.
//
//  2) P2P (reserve): PeerJS sin gratis-sky (WebRTC). Brukes bare hvis
//     serveren ikke har reléet – for eksempel på en ren statisk side uten
//     backend. Denne er upålitelig på samme WiFi, derfor er den ikke førstevalg.
//
// Duellkoden er den samme i begge modus.
const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const ID_PREFIX = 'leo-';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RELAY_OPEN_TIMEOUT = 6000; // hvor lenge vi prøver et lokalt/samme-adresse-relé
const EXTERNAL_RELAY_OPEN_TIMEOUT = 30000; // eksternt relé kan trenge å "våkne" (gratis-host)

let peerjsPromise = null;

export function makeCode(len = 5) {
  let s = '';
  const n = CODE_ALPHABET.length;
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * n)];
  return s;
}

// Reléet på samme adresse som siden (server.js). På en statisk host finnes
// det ikke, men da prøver vi bare og går videre til et ev. eksternt relé.
function sameOriginRelayUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/api/duel`;
}

// Gjør om det brukeren limte inn (grunnadresse eller full sti) til en gyldig
// ws/wss-adresse som ender på /api/duel.
function normalizeRelay(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (u.startsWith('https://')) u = 'wss://' + u.slice(8);
  else if (u.startsWith('http://')) u = 'ws://' + u.slice(7);
  else if (!/^wss?:\/\//i.test(u)) u = 'wss://' + u;
  try {
    const parsed = new URL(u);
    if (!/\/api\/duel\/?$/.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/api/duel';
    }
    return parsed.toString();
  } catch {
    return u;
  }
}

// Rekkefølgen vi prøver: først samme adresse (raskt lokalt), deretter et
// eventuelt eksternt relé (for statisk host som GitHub Pages).
function relayCandidates() {
  const out = [{ url: sameOriginRelayUrl(), timeout: RELAY_OPEN_TIMEOUT }];
  const ext = normalizeRelay(window.LEONARDO_RELAY_URL);
  if (ext && ext !== out[0].url) out.push({ url: ext, timeout: EXTERNAL_RELAY_OPEN_TIMEOUT });
  return out;
}

function loadPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!peerjsPromise) {
    peerjsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PEERJS_CDN;
      s.async = true;
      s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS mangler')));
      s.onerror = () => {
        peerjsPromise = null;
        reject(new Error('Kunne ikke koble til duellen. Sjekk nettverket og prøv igjen.'));
      };
      document.head.appendChild(s);
    });
  }
  return peerjsPromise;
}

// En feil som betyr «reléet finnes ikke her» – da prøver vi P2P i stedet.
class RelayUnavailable extends Error {}

export class DuelNet {
  // role: 'host' | 'guest'
  // onData(msg), onPeerClose(), onReady(code)  – onReady kalles når verten har
  // fått en ledig duellkode (før motstanderen har koblet seg til).
  constructor({ role, onData, onPeerClose, onReady }) {
    this.role = role;
    this.onData = onData;
    this.onPeerClose = onPeerClose;
    this.onReady = onReady;
    this.peer = null;
    this.conn = null;
    this.ws = null;
    this.code = null;
    this.mode = null; // 'relay' | 'p2p'
  }

  async connect(code, timeoutMs = 20000) {
    this.code = code;
    this.timeoutMs = timeoutMs;
    // Prøv alle relé-kandidatene; en feil vi kan leve med er RelayUnavailable.
    for (const cand of relayCandidates()) {
      try {
        await this.connectRelay(cand.url, cand.timeout);
        this.mode = 'relay';
        this.relayUrl = cand.url;
        return;
      } catch (err) {
        this._closeRelay();
        if (!(err instanceof RelayUnavailable)) throw err;
      }
    }
    // Ingen relé tilgjengelig – fall tilbake til PeerJS-skyen.
    const Peer = await loadPeerJS();
    this.mode = 'p2p';
    if (this.role === 'host') await this.startHost(Peer);
    else await this.startGuest(Peer);
  }

  // -------- Relé (WebSocket via server.js) --------
  connectRelay(url, openTimeout = RELAY_OPEN_TIMEOUT) {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(url);
      } catch {
        reject(new RelayUnavailable());
        return;
      }
      this.ws = ws;
      let opened = false;
      let settled = false;
      const openTimer = setTimeout(() => {
        if (!opened) { try { ws.close(); } catch { /* ignorer */ } reject(new RelayUnavailable()); }
      }, openTimeout);

      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(openTimer);
        reject(err);
      };
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(openTimer);
        resolve();
      };

      ws.onopen = () => {
        opened = true;
        ws.send(JSON.stringify({ t: 'hello', role: this.role, code: this.code }));
        // Verten venter på en motstander (ingen tidsavbrudd – avbryt-knappen gjelder).
        // Gjesten får svar fra serveren med en gang.
        if (this.role === 'guest') {
          this._guestTimer = setTimeout(() => fail(new Error(`Fant ikke en duell med koden «${this.code}».`)), this.timeoutMs);
        }
      };

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.t === 'ready' && this.role === 'host') {
          this.code = msg.code;
          if (this.onReady) this.onReady(msg.code);
        } else if (msg.t === 'paired') {
          if (this._guestTimer) { clearTimeout(this._guestTimer); this._guestTimer = null; }
          this._paired = true;
          settle();
        } else if (msg.t === 'error') {
          const err = new Error(msg.message || 'Kunne ikke bli med i duellen.');
          err.code = msg.error;
          fail(err);
        } else if (msg.t === 'msg') {
          if (this.onData) this.onData(msg.data);
        } else if (msg.t === 'peer-left') {
          if (this._paired && this.onPeerClose) this.onPeerClose();
        }
      };

      ws.onerror = () => {
        if (!opened) { fail(new RelayUnavailable()); return; }
        // Etter åpning: la onclose håndtere det.
      };
      ws.onclose = () => {
        if (!opened) { fail(new RelayUnavailable()); return; }
        if (this._paired && this.onPeerClose) this.onPeerClose();
        else if (!settled) fail(new Error('Mistet forbindelsen til duell-tjenesten.'));
      };
    });
  }

  _closeRelay() {
    if (this._guestTimer) { clearTimeout(this._guestTimer); this._guestTimer = null; }
    try { if (this.ws) this.ws.close(); } catch { /* ignorer */ }
    this.ws = null;
  }

  // -------- P2P (PeerJS) – reserve --------
  startHost(Peer) {
    return new Promise((resolve, reject) => {
      const timeout = this.timeoutMs;
      const attempt = () => {
        const id = ID_PREFIX + this.code;
        const peer = new Peer(id, { debug: 0 });
        this.peer = peer;
        const timer = setTimeout(() => { cleanup(); reject(new Error('Tidsavbrudd – ventet for lenge på motstander.')); }, timeout);
        const cleanup = () => clearTimeout(timer);

        peer.on('error', (err) => {
          if (err && err.type === 'unavailable-id') { cleanup(); this.code = makeCode(); attempt(); return; }
          if (err && err.type === 'peer-unavailable') return;
          cleanup();
          reject(new Error('Duell-tjenesten svarer ikke. Prøv igjen om litt.'));
        });
        peer.on('connection', (conn) => {
          cleanup();
          this.conn = conn;
          conn.on('open', () => {
            conn.on('data', (d) => this.onData && this.onData(d));
            conn.on('close', () => this.onPeerClose && this.onPeerClose());
            if (this.onReady) this.onReady(this.code);
            resolve();
          });
          conn.on('error', () => { cleanup(); reject(new Error('Kunne ikke koble til motstanderen.')); });
        });
        this.cleanupHostTimer = cleanup;
      };
      attempt();
    });
  }

  startGuest(Peer) {
    return new Promise((resolve, reject) => {
      const timeout = this.timeoutMs;
      const peer = new Peer({ debug: 0 });
      this.peer = peer;
      peer.on('error', () => {});
      peer.on('open', () => {
        const conn = peer.connect(ID_PREFIX + this.code, { reliable: true });
        this.conn = conn;
        const timer = setTimeout(() => { cleanup(); reject(new Error(`Fant ikke en duell med koden «${this.code}».`)); }, timeout);
        const cleanup = () => clearTimeout(timer);
        conn.on('open', () => {
          cleanup();
          conn.on('data', (d) => this.onData && this.onData(d));
          conn.on('close', () => this.onPeerClose && this.onPeerClose());
          resolve();
        });
        conn.on('error', () => { cleanup(); reject(new Error('Kunne ikke koble til duellen.')); });
      });
    });
  }

  send(data) {
    if (this.mode === 'relay') {
      try { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'msg', data })); } catch { /* ignorer */ }
      return;
    }
    try {
      if (this.conn && this.conn.open) this.conn.send(data);
    } catch { /* ignorer */ }
  }

  destroy() {
    this._closeRelay();
    try { if (this.conn) this.conn.close(); } catch { /* ignorer */ }
    try { if (this.peer) this.peer.destroy(); } catch { /* ignorer */ }
    this.conn = null;
    this.peer = null;
  }
}
