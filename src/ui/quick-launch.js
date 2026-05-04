// ══════ QUICK LAUNCH ══════
// Command Palette (Cmd/Ctrl+K) + Smart Resume + Hero Quickbar wiring + Empty-State CTAs.
// Goal: shrink the click path from ~7 to 0–1 for the most common results.

import { S } from '../store.js';
import { $ } from '../utils.js';

const RESUME_DISMISS_KEY = 'vbaBeastResumeDismissed';
let _palOpen = false;
let _palItems = [];
let _palFiltered = [];
let _palIdx = 0;

// ── Action registry: each entry = one row in the palette ──
function buildActions() {
  const w = window;
  const has = key => typeof w[key] === 'function';
  const items = [
    { id: 'import',        g: 'Daten',       i: '⬆',  l: 'Datei importieren (XLSX/CSV/TSV)', kw: 'open file upload xlsx csv',
      run: () => { w.N('excel'); setTimeout(() => $('xf')?.click(), 60); } },
    { id: 'demo',          g: 'Daten',       i: '▶',  l: 'Demo laden – Sendungen', kw: 'demo testdaten beispiel',
      run: () => has('loadDemo') && w.loadDemo('sendungen') },
    { id: 'demo-rech',     g: 'Daten',       i: '▶',  l: 'Demo laden – Rechnungen', kw: 'demo invoice',
      run: () => has('loadDemo') && w.loadDemo('rechnungen') },
    { id: 'demo-kunden',   g: 'Daten',       i: '▶',  l: 'Demo laden – Kunden', kw: 'demo customer',
      run: () => has('loadDemo') && w.loadDemo('kunden') },
    { id: 'demo-container',g: 'Daten',       i: '▶',  l: 'Demo laden – Container', kw: 'demo container',
      run: () => has('loadDemo') && w.loadDemo('container') },
    { id: 'save-ws',       g: 'Workspace',   i: '💾', l: 'Workspace speichern', kw: 'save workspace',
      run: () => { w.N('excel'); setTimeout(() => has('saveWorkspace') && w.saveWorkspace(), 30); }, when: () => S.xH.length > 0 },
    { id: 'export-xlsx',   g: 'Export',      i: '⬇',  l: 'Als XLSX exportieren', kw: 'download save excel',
      run: () => has('XE') && w.XE(), when: () => S.xH.length > 0 },
    { id: 'export-csv',    g: 'Export',      i: '⬇',  l: 'Als CSV exportieren', kw: 'download csv',
      run: () => has('XE') && w.XE('csv'), when: () => S.xH.length > 0 },
    { id: 'export-pdf',    g: 'Export',      i: '📄', l: 'Als PDF exportieren', kw: 'download pdf',
      run: () => has('XPDF') && w.XPDF(), when: () => S.xH.length > 0 },
    { id: 'qop-trim',      g: 'Bereinigen',  i: '✂',  l: 'Leerzeichen trimmen', kw: 'trim spaces clean',
      run: () => has('qopTrimAll') && w.qopTrimAll(), when: () => S.xH.length > 0 },
    { id: 'qop-empty',     g: 'Bereinigen',  i: '🗑', l: 'Leere Zeilen entfernen', kw: 'remove empty rows',
      run: () => has('qopRemoveEmpty') && w.qopRemoveEmpty(), when: () => S.xH.length > 0 },
    { id: 'qop-dupes',     g: 'Bereinigen',  i: '♻',  l: 'Duplikate entfernen', kw: 'remove duplicates',
      run: () => has('qopRemoveDupes') && w.qopRemoveDupes(), when: () => S.xH.length > 0 },
    { id: 'qop-fill',      g: 'Bereinigen',  i: '📝', l: 'Lücken füllen', kw: 'fill missing gaps',
      run: () => has('qopFillMissing') && w.qopFillMissing(), when: () => S.xH.length > 0 },
    { id: 'qop-fmt',       g: 'Bereinigen',  i: '🔄', l: 'Auto-Format anwenden', kw: 'format auto',
      run: () => has('qopAutoFormat') && w.qopAutoFormat(), when: () => S.xH.length > 0 },
    { id: 'qop-sort',      g: 'Bereinigen',  i: '🔀', l: 'Sortieren A→Z (1. Spalte)', kw: 'sort',
      run: () => has('qopSortAZ') && w.qopSortAZ(), when: () => S.xH.length > 0 },
    { id: 'qop-stats',     g: 'Analyse',     i: '📈', l: 'Statistik anzeigen', kw: 'stats analyse',
      run: () => has('qopStats') && w.qopStats(), when: () => S.xH.length > 0 },
    { id: 'undo',          g: 'Bearbeiten',  i: '↩',  l: 'Rückgängig (Ctrl+Z)', kw: 'undo',
      run: () => has('UNDO') && w.UNDO() },
    { id: 'redo',          g: 'Bearbeiten',  i: '↪',  l: 'Wiederholen (Ctrl+Y)', kw: 'redo',
      run: () => has('REDO') && w.REDO() },
    { id: 'nav-home',      g: 'Navigation',  i: '🏠', l: 'Dashboard', kw: 'home start',
      run: () => w.N('home') },
    { id: 'nav-excel',     g: 'Navigation',  i: '📊', l: 'Excel öffnen', kw: 'spreadsheet table',
      run: () => w.N('excel') },
    { id: 'nav-word',      g: 'Navigation',  i: '✉',  l: 'Word / Serienbrief', kw: 'word merge mail letter',
      run: () => w.N('word') },
    { id: 'nav-email',     g: 'Navigation',  i: '📧', l: 'E-Mail / Serienmail', kw: 'email mail send smtp',
      run: () => w.N('email') },
    { id: 'nav-dok',       g: 'Navigation',  i: '📂', l: 'Dok-Center / Vorlagen', kw: 'doccenter templates',
      run: () => w.N('doccenter') },
    { id: 'nav-db',        g: 'Navigation',  i: '🗄', l: 'Datenbank', kw: 'database storage',
      run: () => w.N('database') },
    { id: 'nav-dsgvo',     g: 'Navigation',  i: '🛡', l: 'Datenschutz / DSGVO', kw: 'privacy gdpr',
      run: () => w.N('dsgvo') },
    { id: 'nav-guide',     g: 'Navigation',  i: '📖', l: 'Anleitung', kw: 'guide help docs',
      run: () => w.N('guide') },
    { id: 'tour',          g: 'Hilfe',       i: '🎯', l: 'Tour starten', kw: 'tour onboarding',
      run: () => has('tourStart') && w.tourStart() },
    { id: 'shortcuts',     g: 'Hilfe',       i: '⌨',  l: 'Tastenkürzel anzeigen', kw: 'shortcuts keys',
      run: () => $('shortcuts')?.classList.add('show') },
    { id: 'theme',         g: 'Ansicht',     i: '🎨', l: 'Light/Dark wechseln', kw: 'theme dark light',
      run: () => has('toggleTheme') && w.toggleTheme() },
    { id: 'fullscreen',    g: 'Ansicht',     i: '🖥', l: 'Vollbild umschalten', kw: 'fullscreen',
      run: () => has('toggleFullscreen') && w.toggleFullscreen() },
  ];
  // Dynamic: each saved workspace as its own action
  if (typeof w.loadWorkspaces === 'function') {
    const ws = w.loadWorkspaces() || [];
    ws.forEach(entry => {
      const name = entry.name;
      items.push({
        id: 'ws:' + name, g: 'Workspace', i: '🗂',
        l: 'Workspace laden: ' + name,
        kw: 'workspace load resume ' + name.toLowerCase(),
        run: () => w.loadWorkspaceByName(name)
      });
    });
  }
  return items.filter(a => !a.when || a.when());
}

// ── Fuzzy match score: higher = better ──
function scoreItem(item, q) {
  if (!q) return 1;
  const hay = (item.l + ' ' + (item.kw || '') + ' ' + item.g).toLowerCase();
  const needle = q.toLowerCase().trim();
  if (!needle) return 1;
  if (hay.startsWith(needle)) return 1000;
  if (item.l.toLowerCase().startsWith(needle)) return 900;
  if (hay.includes(needle)) return 500;
  // subsequence match
  let hi = 0, score = 0;
  for (const ch of needle) {
    const idx = hay.indexOf(ch, hi);
    if (idx < 0) return 0;
    score += 10 - Math.min(9, idx - hi);
    hi = idx + 1;
  }
  return score;
}

function renderPalette() {
  const list = $('cmdpal-list');
  if (!list) return;
  if (!_palFiltered.length) {
    list.innerHTML = '<div class="cmdpal-empty">Keine Treffer.</div>';
    return;
  }
  let lastGroup = '';
  list.innerHTML = _palFiltered.map((it, idx) => {
    const grp = it.g !== lastGroup ? `<div class="cmdpal-group">${it.g}</div>` : '';
    lastGroup = it.g;
    const active = idx === _palIdx ? ' a' : '';
    return grp + `<div class="cmdpal-item${active}" data-idx="${idx}">
      <span class="cmdpal-ico">${it.i || ''}</span>
      <span class="cmdpal-lbl">${escapeHtml(it.l)}</span>
    </div>`;
  }).join('');
  // Scroll active into view
  const act = list.querySelector('.cmdpal-item.a');
  if (act) act.scrollIntoView({ block: 'nearest' });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function filterPalette(q) {
  const scored = _palItems
    .map(it => ({ it, s: scoreItem(it, q) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 50);
  _palFiltered = scored.map(x => x.it);
  _palIdx = 0;
  renderPalette();
}

export function openCmdPalette() {
  _palItems = buildActions();
  _palFiltered = _palItems.slice();
  _palIdx = 0;
  _palOpen = true;
  const overlay = $('cmdpal');
  if (!overlay) return;
  overlay.classList.add('show');
  const input = $('cmdpal-input');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 10); }
  renderPalette();
}

export function closeCmdPalette() {
  _palOpen = false;
  $('cmdpal')?.classList.remove('show');
}

function executeAt(idx) {
  const it = _palFiltered[idx];
  if (!it) return;
  closeCmdPalette();
  try { it.run(); } catch (e) {
    if (typeof window.toast === 'function') window.toast('Fehler: ' + e.message, 'error');
  }
}

export function initCmdPalette() {
  const input = $('cmdpal-input');
  const overlay = $('cmdpal');
  if (!input || !overlay) return;

  // Open: Cmd/Ctrl+K
  document.addEventListener('keydown', e => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      _palOpen ? closeCmdPalette() : openCmdPalette();
      return;
    }
    if (!_palOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeCmdPalette(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _palIdx = Math.min(_palFiltered.length - 1, _palIdx + 1);
      renderPalette();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _palIdx = Math.max(0, _palIdx - 1);
      renderPalette();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeAt(_palIdx);
    }
  }, true);

  input.addEventListener('input', e => filterPalette(e.target.value));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCmdPalette(); });
  $('cmdpal-list')?.addEventListener('click', e => {
    const row = e.target.closest('.cmdpal-item');
    if (!row) return;
    executeAt(parseInt(row.dataset.idx, 10));
  });
}

// ══════ SMART RESUME ══════
// On boot, if we have a recent workspace and the user hasn't dismissed it, auto-load it
// and show a toast with an "undo" option. Safe — doesn't run if data already restored.
export function smartResume() {
  // Already have data (autoRestore loaded something)? do nothing.
  if (S.xH && S.xH.length > 0) { renderHeroQuickbar(); return; }
  if (typeof window.loadWorkspaces !== 'function') { renderHeroQuickbar(); return; }
  const ws = window.loadWorkspaces() || [];
  if (!ws.length) { renderHeroQuickbar(); return; }
  // Pick most recent by ts
  const sorted = ws.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const recent = sorted[0];
  if (!recent) { renderHeroQuickbar(); return; }
  const dismissed = sessionStorage.getItem(RESUME_DISMISS_KEY);
  if (dismissed === recent.name) { renderHeroQuickbar(); return; }
  // Auto-load
  try {
    window.loadWorkspaceByName(recent.name);
    if (typeof window.toast === 'function') {
      window.toast('↻ Weiter bei: ' + recent.name);
    }
  } catch (e) { /* swallow — fallback to dashboard */ }
  renderHeroQuickbar();
}

// ══════ HERO QUICKBAR ══════
// The big primary actions on top of the Dashboard. Updates with current state
// (shows "Fortsetzen" only when a workspace exists).
export function renderHeroQuickbar() {
  const el = $('hero-quickbar');
  if (!el) return;
  const ws = (typeof window.loadWorkspaces === 'function') ? (window.loadWorkspaces() || []) : [];
  const recent = ws.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
  const resumeBtn = recent
    ? `<button class="hq-btn hq-resume" onclick="loadWorkspaceByName('${escapeHtml(recent.name).replace(/'/g, "\\'")}')">
         <span class="hq-ico">↻</span>
         <span class="hq-lbl">Fortsetzen</span>
         <span class="hq-sub">${escapeHtml(recent.name)}</span>
       </button>`
    : '';
  el.innerHTML = `
    <button class="hq-btn hq-primary" onclick="N('excel');setTimeout(()=>document.getElementById('xf').click(),50)">
      <span class="hq-ico">📂</span>
      <span class="hq-lbl">Datei öffnen</span>
      <span class="hq-sub">XLSX · CSV · TSV</span>
    </button>
    <button class="hq-btn hq-demo" onclick="loadDemo()">
      <span class="hq-ico">▶</span>
      <span class="hq-lbl">Demo laden</span>
      <span class="hq-sub">Sofort testen</span>
    </button>
    ${resumeBtn}
    <button class="hq-btn hq-pal" onclick="openCmdPalette()">
      <span class="hq-ico">⌘</span>
      <span class="hq-lbl">Schnell-Befehl</span>
      <span class="hq-sub">Strg/Cmd + K</span>
    </button>`;
}

// ══════ EMPTY-STATE CTAs ══════
// Inject a "Demo laden & loslegen" button into pages that are empty without data,
// so users never hit a dead-end blank state.
const EMPTY_TARGETS = [
  { sel: '#p-excel #x-quick-ops', when: () => !S.xH.length },
];
export function wireEmptyStateCTAs() {
  // Listen for nav changes via MutationObserver on .pg.a
  const refresh = () => {
    document.querySelectorAll('.ql-empty-cta').forEach(n => n.remove());
    if (!S.xH.length) {
      const excelPage = $('p-excel');
      if (excelPage && excelPage.classList.contains('a')) {
        const banner = document.createElement('div');
        banner.className = 'ql-empty-cta cd';
        banner.innerHTML = `
          <div class="ql-ec-inner">
            <div class="ql-ec-ico">📊</div>
            <div class="ql-ec-msg">Noch keine Daten geladen.</div>
            <div class="ql-ec-actions">
              <button class="b bp" onclick="document.getElementById('xf').click()">⬆ Datei importieren</button>
              <button class="b bg" onclick="loadDemo()">▶ Demo laden &amp; loslegen</button>
              <button class="b bo" onclick="openCmdPalette()">⌘ Mehr (Strg+K)</button>
            </div>
          </div>`;
        const toolbar = excelPage.querySelector('.cd.row');
        if (toolbar && toolbar.parentNode) {
          toolbar.parentNode.insertBefore(banner, toolbar.nextSibling);
        }
      }
    }
  };
  // Hook into nav: wrap window.N
  const origN = window.N;
  if (typeof origN === 'function' && !origN._qlWrapped) {
    window.N = function (p) {
      const r = origN.apply(this, arguments);
      setTimeout(refresh, 20);
      return r;
    };
    window.N._qlWrapped = true;
  }
  refresh();
}
