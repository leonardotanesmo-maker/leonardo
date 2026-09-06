// Leonardo – ikonsett (inline SVG)

const ICONS = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>',
  math: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M12 7v4M9 15h6"/>',
  abc: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 16c0-2 1-4 3-4s3 2 3 4M9.5 14h3"/><path d="M16 8h1.5a1.5 1.5 0 0 1 0 3H16m0 5 2-4"/>',
  sprout: '<path d="M12 22v-8"/><path d="M12 14c0-4 2-7 6-7 0 4-2 7-6 7z"/><path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5z"/>',
  landmark: '<path d="M3 21h18M4 18h16M6 18v-6M10 18v-6M14 18v-6M18 18v-6M3 6h18l-3-3H6z"/>',
  brain: '<path d="M12 4a3 3 0 0 0-3 3c-1.6 0-3 1.3-3 3 0 .6.2 1.1.5 1.6A3 3 0 0 0 5 17a3 3 0 0 0 5 2 4 4 0 0 0 4 0 3 3 0 0 0 5-2 3 3 0 0 0-1.5-5.4c.3-.5.5-1 .5-1.6 0-1.7-1.4-3-3-3a3 3 0 0 0-6-0z"/>',
  bolt: '<path d="M13 2 4 13h6l-1 9 9-11h-6z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  pin: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  pin2: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".6"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  flag: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8v3H8zM8 12h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.7"/><path d="M18.5 15c2 .6 3.3 2.2 3.8 4.4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  home: '<path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4M12 12v4M8 20h8M9 16h6a1 1 0 0 1 1 1v3H8v-3a1 1 0 0 1 1-1z"/>',
  pencil: '<path d="M4 20l4-1L20 7l-3-3L5 16z"/><path d="m14 6 3 3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  ruler: '<rect x="3" y="8" width="18" height="8" rx="2" transform="rotate(45 12 12)"/><path d="m8 8 8 8"/>',
  sparkles: '<path d="M12 3v6M9 6h6"/><path d="M5 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M18 12l.7 1.8L20.5 14.5 18.7 15.2 18 17l-.7-1.8L15.5 14.5l1.8-.7z"/>',
  external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  phone: '<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  map: '<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2z"/><path d="M9 4v14M15 6v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  times: '<path d="M6 6l12 12M18 6 6 18"/>',
  divide: '<path d="M5 12h14"/><circle cx="12" cy="6" r="1.6"/><circle cx="12" cy="18" r="1.6"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
};

export function icon(name, size = 18) {
  const body = ICONS[name] || ICONS.info;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function iconNode(name, size = 18) {
  const el = document.createElement('span');
  el.className = 'icon-wrap';
  el.innerHTML = icon(name, size);
  return el;
}