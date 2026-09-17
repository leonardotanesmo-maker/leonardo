// Leonardo – IP- og geolokalisering for besøkende (server-side)
//
// Bruker `geoip-lite` (MaxMinds GeoLite2-data, bundlet i npm-pakken) for å
// slå opp land, region, by, koordinater og tidssone fra IP-en.
//
// Personvern/GDPR:
//   – IP-adresser er personopplysninger. Standard er å lagre HELE IP-en
//     (LEONARDO_ANALYTICS_IP_MODE=forkortet for å maskere siste oktetter).
//   – Sett LEONARDO_ANALYTICS_IP_MODE=forkortet hvis du kun trenger land/by.
//
// Miljøvariabler:
//   LEONARDO_ANALYTICS_IP_MODE  = full (default) | forkortet
//
// geoip-lite er valgfritt: hvis pakken ikke er installert (f.eks. på en lett
// gratis-host som bare kjører duell-reléet) starter serveren likevel, og
// geo-oppslag returnerer bare null. Lastes derfor lazy i stedet for statisk.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let _geoip;
let _geoipTried = false;
function loadGeoip() {
  if (_geoipTried) return _geoip;
  _geoipTried = true;
  try {
    _geoip = require('geoip-lite');
  } catch {
    _geoip = null;
  }
  return _geoip;
}

const IP_MODE = process.env.LEONARDO_ANALYTICS_IP_MODE === 'forkortet' ? 'forkortet' : 'full';

const cache = new Map();
const cacheHits = { hits: 0, misses: 0 };
const MAX_CACHE = 20000;

// Hent besøkerens IP fra requesten. Tar hensyn til proxy-headere, men
// kun hvis de ikke er tomme – `x-forwarded-for` settes av serveren selv i
// produksjon. Fallback til socket-adressen.
export function clientIp(req) {
  if (!req || typeof req !== 'object') return '0.0.0.0';
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    const first = String(fwd).split(',')[0].trim();
    if (first) return normalizeIp(first);
  }
  const ra = req.socket && req.socket.remoteAddress;
  return normalizeIp(String(ra || '')) || '0.0.0.0';
}

// Fjern ":port"/IPv6-kompaktnotasjon og sørg for ren IP-string.
function normalizeIp(ipRaw) {
  if (!ipRaw) return '';
  let ip = ipRaw.replace(/^::ffff:/, '');
  ip = ip.split('%')[0];
  return ip || '';
}

// Lagre IP videreformet etter innstilling.
//  - full:      192.168.1.45
//  - forkortet: 192.168.1.0   (IPv4: siste oktett nullstilles)
//              fd00:1234::    (IPv6: siste 32 bit nullstilles)
export function storedIp(ip) {
  if (!ip || ip === '0.0.0.0' || ip === '::1') return ip || '';
  if (IP_MODE === 'forkortet') {
    if (ip.includes('.')) {
      const parts = ip.split('.');
      parts[3] = '0';
      return parts.join('.');
    }
    const parts = ip.split(':');
    parts[parts.length - 1] = '';
    parts[parts.length - 2] = '';
    return parts.join(':').replace(/:{2,}/g, '::');
  }
  return ip;
}

export function ipMode() {
  return IP_MODE;
}

// Slå opp geo-informasjon for en IP. Http-cache med maks størrelse.
export function geoForIp(ip) {
  if (!ip) return null;
  if (cache.has(ip)) {
    cacheHits.hits++;
    return cache.get(ip);
  }
  cacheHits.misses++;
  const raw = GeoLookupSafe(ip);
  const geo = raw
    ? {
        country: raw.country || '',
        countryCode: raw.country || '',
        region: raw.region || '',
        city: raw.city || '',
        lat: Number.isFinite(raw.ll?.[0]) ? raw.ll[0] : null,
        lon: Number.isFinite(raw.ll?.[1]) ? raw.ll[1] : null,
        tz: raw.timezone || '',
        metro: raw.metro ? Number(raw.metro) : null,
      }
    : null;
  if (cache.size >= MAX_CACHE && cache.size) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(ip, geo);
  return geo;
}

// geoip-lite kan kaste unntak for rare IP-er (f.eks. bokstaver).
function GeoLookupSafe(ip) {
  try {
    if (!ip || !/^[\da-fA-F:.]+$/.test(ip)) return null;
    const geoip = loadGeoip();
    if (!geoip) return null;
    return geoip.lookup(ip);
  } catch {
    return null;
  }
}

export function geoCacheInfo() {
  return { size: cache.size, hits: cacheHits.hits, misses: cacheHits.misses };
}

// Om geo-databasen faktisk er tilgjengelig (geoip-lite kan mangle på lette hoster).
export function geoAvailable() {
  return !!loadGeoip();
}