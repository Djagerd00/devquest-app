const paths = {
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  tasks:
    '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M9 3h6v4H9zM8 12l1 1 2-2m2 1h3m-8 5 1 1 2-2m2 1h3"/>',
  book: '<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 2-3-3-6-3-9-2zM6 8h2m8 0h2M6 12h2m8 0h2"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 3 3-1 2 2 3-1 1-3 3-1 2-3-2-2 1-3-3-3-3 1-2-2z"/><circle cx="12" cy="11" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  gem: '<path d="m6 3-4 6 10 13L22 9l-4-6zm-4 6h20M6 3l6 19L18 3"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  flame:
    '<path d="M13 2c2 6-4 6-2 10 2-1 3-3 3-5 4 3 6 6 5 10-1 3-3 5-7 5s-7-3-7-7c0-5 5-7 8-13z"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  game: '<path d="M7 7h10c4 0 6 11 3 12-2 1-4-3-5-3H9c-1 0-3 4-5 3C1 18 3 7 7 7zM7 10v5m-2-2.5h4m7-1h.01m2 2h.01M9 7V4h6"/>',
  app: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
  web: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 6.5h.01m3 0h.01m1 6-3 2 3 2m4-4 3 2-3 2"/>',
  other:
    '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  archive: '<path d="M4 9v12h16V9M3 3h18v6H3zm6 10h6"/>',
  restore: '<path d="M3 11a9 9 0 1 1 1 6M3 4v7h7M12 7v5l3 2"/>',
  trophy:
    '<path d="M7 3h10v6a5 5 0 0 1-10 0zm0 2H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4m-4 2v6m-4 1h8"/>',
  crown: '<path d="m3 6 5 5 4-8 4 8 5-5-2 13H5zM5 22h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="m9 7-1-4m7 4 1-4M3 9l4 2m-4 5 4-1m14-6-4 2m4 5-4-1m-5-4v9"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M3 15v6h18v-6"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M3 16v5h18v-5"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10z"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0m-3.5 4h.01"/>',
  offline:
    '<path d="m3 3 18 18M2 8a16 16 0 0 1 4-2m4-2a16 16 0 0 1 12 4M5 12a11 11 0 0 1 5-2m4 0a11 11 0 0 1 5 2m-10.5 4a5 5 0 0 1 7 0m-3.5 4h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
};
export function icon(name, className = "") {
  return `<svg class="icon ${className}" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}
