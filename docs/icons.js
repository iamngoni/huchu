/* Corelith — inline icon helper (Lucide-style strokes)
 * Usage: <span data-icon="search"></span>
 *        Icons.render() runs on DOMContentLoaded automatically.
 */
(function () {
  const P = 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const I = {
    /* Anthropic asterisk — the Claude brand mark */
    asterisk:  `<g stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M12 3v18M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8M3 12h18"/></g>`,
    /* Corelith mark — the pentagonal shield with upward chevron */
    corelith:  `<path d="M12 1.7 L20.5 7 L20.5 18.6 L15.8 21.8 L14.4 20.4 L9.6 20.4 L8.2 21.8 L3.5 18.6 L3.5 7 Z" fill="currentColor"/><path d="M12 5.8 L16.8 15.4 L13.9 15.4 L13.9 19.2 L10.1 19.2 L10.1 15.4 L7.2 15.4 Z" fill="#FFFFFF"/>`,
    /* Window chrome / nav */
    menu:      `<path d="M4 7h16M4 12h16M4 17h16" ${P}/>`,
    sidebar:   `<rect x="3" y="4" width="18" height="16" rx="2" ${P}/><path d="M9 4v16" ${P}/>`,
    back:      `<path d="M15 6l-6 6 6 6" ${P}/>`,
    forward:   `<path d="M9 6l6 6-6 6" ${P}/>`,
    search:    `<circle cx="11" cy="11" r="7" ${P}/><path d="m20 20-3.5-3.5" ${P}/>`,
    /* Common UI */
    plus:      `<path d="M12 5v14M5 12h14" ${P}/>`,
    minus:     `<path d="M5 12h14" ${P}/>`,
    check:     `<path d="M5 12.5 10 17 19 7" ${P}/>`,
    x:         `<path d="M6 6l12 12M18 6 6 18" ${P}/>`,
    chevron:   `<path d="m6 9 6 6 6-6" ${P}/>`,
    chright:   `<path d="m9 6 6 6-6 6" ${P}/>`,
    chleft:    `<path d="m15 6-6 6 6 6" ${P}/>`,
    chup:      `<path d="m6 15 6-6 6 6" ${P}/>`,
    arrow:     `<path d="M5 12h14m-5-5 5 5-5 5" ${P}/>`,
    more:      `<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>`,
    morev:     `<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>`,
    filter:    `<path d="M4 5h16l-6 8v5l-4 2v-7z" ${P}/>`,
    sort:      `<path d="M7 5v14m-3-3 3 3 3-3M17 19V5m-3 3 3-3 3 3" ${P}/>`,
    download:  `<path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" ${P}/>`,
    upload:    `<path d="M12 20V8m0 0-4 4m4-4 4 4M4 20h16" ${P}/>`,
    external:  `<path d="M10 4H4v16h16v-6" ${P}/><path d="M14 4h6v6M20 4 11 13" ${P}/>`,
    eye:       `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" ${P}/><circle cx="12" cy="12" r="3" ${P}/>`,
    eyeoff:    `<path d="M4 4l16 16" ${P}/><path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.6 4.4M6.1 7.6A16 16 0 0 0 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1" ${P}/>`,
    info:      `<circle cx="12" cy="12" r="9" ${P}/><path d="M12 16v-5M12 8h.01" ${P}/>`,
    bell:      `<path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4 18h16z" ${P}/><path d="M10 21h4" ${P}/>`,
    /* Claude Code specific */
    chat:      `<path d="M21 12a8 8 0 1 1-3-6.2L21 5l-1 4a8 8 0 0 1 1 3z" ${P}/>`,
    cowork:    `<path d="M4 7h10M4 12h7M4 17h10" ${P}/><path d="m17 8 4 4-4 4" ${P}/>`,
    code:      `<path d="m9 8-5 4 5 4M15 8l5 4-5 4M14 5l-4 14" ${P}/>`,
    edit:      `<path d="M11 4H5v15h15v-6" ${P}/><path d="m17.5 3.5 3 3L11 16H8v-3z" ${P}/>`,
    routine:   `<path d="M21 12a9 9 0 1 1-3-6.7" ${P}/><path d="M21 4v5h-5" ${P}/>`,
    customize: `<rect x="3" y="6" width="18" height="13" rx="2" ${P}/><path d="M3 10h18M7 14h4" ${P}/>`,
    mic:       `<rect x="9" y="3" width="6" height="11" rx="3" ${P}/><path d="M6 11a6 6 0 0 0 12 0M12 17v3" ${P}/>`,
    add:       `<circle cx="12" cy="12" r="9" ${P}/><path d="M12 8v8M8 12h8" ${P}/>`,
    /* Settings & misc */
    settings:  `<circle cx="12" cy="12" r="3" ${P}/><path d="M19 12a7 7 0 0 0-.2-1.7l2-1.5-2-3.5-2.4.8a7 7 0 0 0-3-1.7L13 2h-2l-.4 2.4a7 7 0 0 0-3 1.7l-2.4-.8-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.5 2.4-.8a7 7 0 0 0 3 1.7L11 22h2l.4-2.4a7 7 0 0 0 3-1.7l2.4.8 2-3.5-2-1.5c.1-.5.2-1.1.2-1.7z" ${P}/>`,
    user:      `<circle cx="12" cy="8" r="4" ${P}/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" ${P}/>`,
    lock:      `<rect x="5" y="11" width="14" height="9" rx="2" ${P}/><path d="M8 11V8a4 4 0 1 1 8 0v3" ${P}/>`,
    card:      `<rect x="3" y="6" width="18" height="13" rx="2" ${P}/><path d="M3 10h18" ${P}/>`,
    gauge:     `<path d="M4 15a8 8 0 1 1 16 0" ${P}/><path d="m12 15 4-5" ${P}/>`,
    plug:      `<path d="M9 4v6M15 4v6" ${P}/><rect x="6" y="10" width="12" height="6" rx="2" ${P}/><path d="M12 16v5" ${P}/>`,
    extension: `<path d="M6 4h5v4a2 2 0 0 0 4 0V4h3a1 1 0 0 1 1 1v3h-4a2 2 0 0 0 0 4h4v5a1 1 0 0 1-1 1h-4a2 2 0 0 1 0-4V8H6z" ${P}/>`,
    terminal:  `<rect x="3" y="4" width="18" height="16" rx="2" ${P}/><path d="m7 9 3 3-3 3M13 15h4" ${P}/>`,
    chrome:    `<circle cx="12" cy="12" r="9" ${P}/><circle cx="12" cy="12" r="3" ${P}/><path d="M21 8h-9M15.5 17.5 11 9.5M8.5 17.5 13 9.5" ${P}/>`,
    /* Workspace / file context (bottom toolbar) */
    folder:    `<path d="M3 7v12h18V9h-9l-2-2H3z" ${P}/>`,
    branch:    `<circle cx="6" cy="5" r="2" ${P}/><circle cx="6" cy="19" r="2" ${P}/><circle cx="18" cy="9" r="2" ${P}/><path d="M6 7v10M8 9a4 4 0 0 0 4 4 4 4 0 0 1 4 4" ${P}/>`,
    pc:        `<rect x="3" y="4" width="18" height="12" rx="2" ${P}/><path d="M8 20h8M12 16v4" ${P}/>`,
    tree:      `<path d="M21 6V3M21 6h-3M21 6c0 2-2 4-4 5-3 1-5 3-5 6v3" ${P}/><path d="M11 12c0-2-2-3-4-3.5C5 8 3 6 3 4" ${P}/>`,
    refresh:   `<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" ${P}/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" ${P}/>`,
    /* Domain icons (mining/POS/schools context from huchu repo) */
    dashboard: `<rect x="3" y="3" width="8" height="10" rx="1.5" ${P}/><rect x="13" y="3" width="8" height="6" rx="1.5" ${P}/><rect x="13" y="11" width="8" height="10" rx="1.5" ${P}/><rect x="3" y="15" width="8" height="6" rx="1.5" ${P}/>`,
    gem:       `<path d="M6 3h12l3 5-9 13L3 8z" ${P}/><path d="M3 8h18M9 3 6 8l6 13M15 3l3 5-6 13" ${P}/>`,
    receipt:   `<path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" ${P}/><path d="M9 8h6M9 12h6M9 16h4" ${P}/>`,
    building:  `<rect x="4" y="3" width="16" height="18" rx="1" ${P}/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" ${P}/>`,
    car:       `<path d="M5 13h14l-2-5H7z" ${P}/><circle cx="8" cy="15" r="2" ${P}/><circle cx="16" cy="15" r="2" ${P}/>`,
    camera:    `<rect x="3" y="7" width="18" height="12" rx="2" ${P}/><circle cx="12" cy="13" r="3.5" ${P}/><path d="M9 7l1.5-2h3L15 7" ${P}/>`,
    badge_:    `<circle cx="12" cy="10" r="3" ${P}/><path d="M12 13v5l-3-2M12 18l3-2M17 6V4H7v2l5 3z" ${P}/>`,
    warehouse: `<path d="M3 21V9l9-5 9 5v12" ${P}/><path d="M7 21v-7h10v7" ${P}/><path d="M7 17h10" ${P}/>`,
    list:      `<path d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01" ${P}/>`,
    /* Extended set — vertical hubs, portals, motion */
    sparkles:  `<path d="M12 3v6M12 15v6M3 12h6M15 12h6M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" ${P}/>`,
    zap:       `<path d="M13 2 4 14h7l-1 8 9-12h-7z" ${P}/>`,
    box:       `<path d="M21 8 12 3 3 8v8l9 5 9-5z" ${P}/><path d="M3 8l9 5 9-5M12 13v8" ${P}/>`,
    recycle:   `<path d="M7 11 4 16l3 5h5M17 13l3 5-3 5h-5M16 10l-2-7h-4l-3 5" ${P}/><path d="m4 16 3 5M17 13l3 5M9 3l-2 5M14 3l3 5" ${P}/>`,
    coin:      `<circle cx="12" cy="12" r="9" ${P}/><path d="M9 10c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5-1.3 2-3 2-3 .5-3 2 1.3 2.5 3 2.5 3-1 3-2.5M12 6v12" ${P}/>`,
    home:      `<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" ${P}/>`,
    calendar:  `<rect x="3" y="5" width="18" height="16" rx="2" ${P}/><path d="M3 10h18M8 3v4M16 3v4" ${P}/>`,
    clock:     `<circle cx="12" cy="12" r="9" ${P}/><path d="M12 7v5l3 2" ${P}/>`,
    truck:     `<path d="M3 7h11v9H3z" ${P}/><path d="M14 10h4l3 3v3h-7" ${P}/><circle cx="7" cy="18" r="2" ${P}/><circle cx="17" cy="18" r="2" ${P}/>`,
    scale:     `<path d="M12 3v18M5 3h14" ${P}/><path d="m4 11 3-6 3 6a3 3 0 0 1-6 0M14 11l3-6 3 6a3 3 0 0 1-6 0" ${P}/>`,
    book:      `<path d="M4 4h7a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H4z" ${P}/><path d="M20 4h-7a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h8z" ${P}/>`,
    chart:     `<path d="M3 3v18h18" ${P}/><path d="m7 15 4-5 4 3 5-7" ${P}/>`,
    pie:       `<path d="M12 3v9h9a9 9 0 1 1-9-9z" ${P}/>`,
    target:    `<circle cx="12" cy="12" r="9" ${P}/><circle cx="12" cy="12" r="5" ${P}/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`,
    flag:      `<path d="M4 21V4h11l-2 4 2 4H4" ${P}/>`,
    shield:    `<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" ${P}/>`,
    play:      `<path d="m7 4 13 8L7 20z" ${P}/>`,
    pause:     `<rect x="7" y="5" width="4" height="14" rx="1" ${P}/><rect x="13" y="5" width="4" height="14" rx="1" ${P}/>`,
    phone:     `<rect x="7" y="2" width="10" height="20" rx="2" ${P}/><path d="M11 18h2" ${P}/>`,
    tablet:    `<rect x="4" y="3" width="16" height="18" rx="2" ${P}/><path d="M11 18h2" ${P}/>`,
    desktop:   `<rect x="3" y="4" width="18" height="12" rx="2" ${P}/><path d="M8 20h8M12 16v4" ${P}/>`,
    star:      `<path d="M12 3 14.7 9 21 9.7l-4.7 4.4L17.5 21 12 17.8 6.5 21l1.2-6.9L3 9.7 9.3 9z" ${P}/>`,
    heart:     `<path d="M12 20s-7-4.4-7-10A4 4 0 0 1 12 7a4 4 0 0 1 7 3c0 5.6-7 10-7 10z" ${P}/>`,
    bag:       `<path d="M6 8h12l-1 12H7z" ${P}/><path d="M9 8V6a3 3 0 1 1 6 0v2" ${P}/>`,
    cart:      `<path d="M3 4h2l2 12h11l2-9H7" ${P}/><circle cx="9" cy="20" r="1.5" ${P}/><circle cx="17" cy="20" r="1.5" ${P}/>`,
    grid:      `<rect x="3" y="3" width="7" height="7" rx="1" ${P}/><rect x="14" y="3" width="7" height="7" rx="1" ${P}/><rect x="3" y="14" width="7" height="7" rx="1" ${P}/><rect x="14" y="14" width="7" height="7" rx="1" ${P}/>`,
    layers:    `<path d="m12 3 9 5-9 5-9-5z" ${P}/><path d="m3 13 9 5 9-5M3 18l9 5 9-5" ${P}/>`,
    pin:       `<path d="M12 21v-7M5 8a7 7 0 0 1 14 0c0 4-7 8-7 8s-7-4-7-8z" ${P}/><circle cx="12" cy="8" r="2.5" ${P}/>`,
    wallet:    `<rect x="3" y="6" width="18" height="13" rx="2" ${P}/><path d="M3 10h18M16 14h2" ${P}/>`,
    print:     `<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" ${P}/><rect x="6" y="13" width="12" height="8" rx="1" ${P}/>`,
    qr:        `<rect x="3" y="3" width="7" height="7" rx="1" ${P}/><rect x="14" y="3" width="7" height="7" rx="1" ${P}/><rect x="3" y="14" width="7" height="7" rx="1" ${P}/><path d="M14 14h3v3h-3zM18 18h3v3h-3z" ${P}/>`,
    inbox:    `<path d="M3 13h6l2 3h2l2-3h6" ${P}/><path d="M3 13 6 4h12l3 9v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" ${P}/>`,
    folderx:  `<path d="M3 7v12h18V9h-9l-2-2H3z" ${P}/>`,
    wifi:     `<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0" ${P}/><circle cx="12" cy="19" r="1" fill="currentColor"/>`,
    battery:  `<rect x="3" y="8" width="16" height="8" rx="1.5" ${P}/><rect x="20" y="10" width="2" height="4" rx="0.5" fill="currentColor" stroke="none"/><rect x="5" y="10" width="9" height="4" rx="0.5" fill="currentColor" stroke="none"/>`,
    signal:   `<path d="M4 18h2v2H4zM8 14h2v6H8zM12 10h2v10h-2zM16 6h2v14h-2z" fill="currentColor" stroke="none"/>`,
    barcode:  `<path d="M4 5v14M7 5v14M9 5v14M12 5v14M14 5v14M17 5v14M20 5v14" ${P}/>`,
    /* Codex-flagged missing icons */
    trending: `<path d="m3 17 6-6 4 4 8-8M14 7h7v7" ${P}/>`,
    coins:    `<ellipse cx="9" cy="7" rx="6" ry="2.5" ${P}/><path d="M3 7v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" ${P}/><path d="M3 12v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" ${P}/><ellipse cx="16" cy="14" rx="5" ry="2" ${P}/><path d="M11 14v3c0 1.1 2.2 2 5 2s5-0.9 5-2v-3" ${P}/>`,
    mail:     `<rect x="3" y="5" width="18" height="14" rx="2" ${P}/><path d="m3 7 9 6 9-6" ${P}/>`,
    logout:   `<path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" ${P}/><path d="M21 12H9m12 0-4-4m4 4-4 4" ${P}/>`,
    tag:      `<path d="M3 12 12 3l9 3-3 9-9 9-6-6z" ${P}/><circle cx="9" cy="9" r="1.4" ${P}/>`,
  };
  const SVG = (name, size) => {
    const body = I[name] || I.info;
    const s = size || 16;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  };
  const render = (root = document) => {
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.iconRendered === '1') return;
      const name = el.dataset.icon;
      const size = el.dataset.iconSize ? parseInt(el.dataset.iconSize, 10) : 16;
      el.innerHTML = SVG(name, size);
      el.dataset.iconRendered = '1';
    });
  };
  window.Icons = { svg: SVG, render };
  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', () => render());
})();
