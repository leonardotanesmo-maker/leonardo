// Leonardo – enkel localStorage-basert "siste aktivitet"

const KEY = 'leonardo:recent';
const MAX = 5;

export function track(kind, id, name) {
  try {
    const list = getRecent();
    const next = [{ kind, id, name, at: Date.now() }, ...list.filter((x) => !(x.kind === kind && x.id === id))];
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  } catch {
    /* ignorér lagring som ikke virker (privat modus osv.) */
  }
}

export function getRecent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}