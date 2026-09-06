// Leonardo – nettverk for duell (PeerJS).
// Ingen egen server trengs: duellkoden er peer-ID-en, og signalering skjer via
// PeerJS sin gratis-sky. Biblioteket hentes fra CDN første gang en duell åpnes.
const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const ID_PREFIX = 'leo-';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let peerjsPromise = null;

export function makeCode(len = 5) {
  let s = '';
  const n = CODE_ALPHABET.length;
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * n)];
  return s;
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
        reject(new Error('Kunne ikke laste duell-tjenesten. Sjekk internettforbindelsen.'));
      };
      document.head.appendChild(s);
    });
  }
  return peerjsPromise;
}

export class DuelNet {
  // role: 'host' | 'guest'
  // onData(msg), onPeerClose(), onOpen()
  constructor({ role, onData, onPeerClose }) {
    this.role = role;
    this.onData = onData;
    this.onPeerClose = onPeerClose;
    this.peer = null;
    this.conn = null;
    this.code = null;
  }

  async connect(code, timeoutMs = 20000) {
    this.code = code;
    this.timeoutMs = timeoutMs;
    const Peer = await loadPeerJS();
    if (this.role === 'host') {
      await this.startHost(Peer);
    } else {
      await this.startGuest(Peer);
    }
  }

  startHost(Peer) {
    return new Promise((resolve, reject) => {
      const timeout = this.timeoutMs;
      const attempt = () => {
        const id = ID_PREFIX + this.code;
        const peer = new Peer(id, { debug: 1 });
        this.peer = peer;
        const timer = setTimeout(() => { cleanup(); reject(new Error('Tidsavbrudd – ventet for lenge på motstander.')); }, timeout);

        const cleanup = () => clearTimeout(timer);
        peer.on('open', () => {});
        peer.on('error', (err) => {
          // Koden er allerede i bruk – prøv en ny duellkode.
          if (err && err.type === 'unavailable-id') {
            cleanup();
            this.code = makeCode();
            attempt();
            return;
          }
          if (err && err.type === 'peer-unavailable') return; // normal når motstander ikke er der ennå
          cleanup();
          reject(new Error('Duell-tjenesten svarer ikke. Prøv igjen om litt.'));
        });
        peer.on('connection', (conn) => {
          cleanup();
          this.conn = conn;
          conn.on('open', () => {
            conn.on('data', (d) => this.onData && this.onData(d));
            conn.on('close', () => this.onPeerClose && this.onPeerClose());
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
      const peer = new Peer({ debug: 1 });
      this.peer = peer;
      peer.on('error', () => {});
      peer.on('open', () => {
        const conn = peer.connect(ID_PREFIX + this.code, { reliable: true });
        this.conn = conn;
        const timer = setTimeout(() => { cleanup(); reject(new Error(`Fant ikke en duell med koden «${this.code}».`) ); }, timeout);
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
    try {
      if (this.conn && this.conn.open) this.conn.send(data);
    } catch { /* ignorer */ }
  }

  destroy() {
    try { if (this.conn) this.conn.close(); } catch { }
    try { if (this.peer) this.peer.destroy(); } catch { }
    this.conn = null;
    this.peer = null;
  }
}