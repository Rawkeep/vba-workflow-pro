// ══════ CONDITIONAL FORMATTING ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
import { IDB } from '../idb.js';
import { toast, H } from '../nav.js';

// Rule format: { col, type, params, style }
// type: 'threshold' | 'gradient' | 'text_contains' | 'duplicates' | 'top_n' | 'empty'
// style: 'green' | 'yellow' | 'red' | 'gradient'
let _cfRules = [];

export function cfAddRule() {
  const col = $('cf-col').value;
  const type = $('cf-type').value;
  const val1 = $('cf-val1').value;
  const val2 = $('cf-val2').value;
  const style = $('cf-style').value;
  if (!col) { toast('Spalte wählen', 'warning'); return; }
  _cfRules.push({ col, type, val1, val2, style });
  _persistCF();
  cfApply();
  renderCFRules();
  toast('Regel hinzugefuegt');
}

export function cfRemoveRule(idx) {
  _cfRules.splice(idx, 1);
  _persistCF();
  cfApply();
  renderCFRules();
}

export function cfApply() {
  // Remove old formatting
  document.querySelectorAll('td.cf-green,td.cf-yellow,td.cf-red,td.cf-gradient').forEach(td => {
    td.classList.remove('cf-green', 'cf-yellow', 'cf-red', 'cf-gradient');
    td.style.removeProperty('--cf-width');
    const after = td.querySelector('.cf-bar');
    if (after) after.remove();
  });

  if (!S.xH.length || !S.xD.length) return;

  _cfRules.forEach(rule => {
    const ci = S.xH.indexOf(rule.col);
    if (ci === -1) return;

    const tbl = $('x-tw');
    if (!tbl) return;
    const tbody = tbl.querySelector('tbody');
    if (!tbody) return;

    // Precompute for gradient/top_n
    let nums = null, min = 0, max = 0;
    if (rule.type === 'gradient' || rule.type === 'top_n') {
      nums = S.xD.map(r => parseFloat(r[ci])).filter(v => !isNaN(v));
      min = Math.min(...nums);
      max = Math.max(...nums);
    }

    // Duplicates precompute
    let dupes = null;
    if (rule.type === 'duplicates') {
      const counts = {};
      S.xD.forEach(r => { const v = String(r[ci] ?? ''); counts[v] = (counts[v] || 0) + 1; });
      dupes = new Set(Object.keys(counts).filter(k => counts[k] > 1));
    }

    // Top N
    let topSet = null;
    if (rule.type === 'top_n' && nums) {
      const n = parseInt(rule.val1) || 10;
      const sorted = [...nums].sort((a, b) => b - a);
      topSet = new Set(sorted.slice(0, n));
    }

    const rows = tbody.querySelectorAll('tr[data-ri]');
    rows.forEach(tr => {
      const ri = parseInt(tr.dataset.ri);
      const row = S.xD[ri];
      if (!row) return;
      const td = tr.children[ci + 2]; // +2 for # and checkbox columns
      if (!td) return;
      const val = String(row[ci] ?? '');
      const num = parseFloat(val);
      let match = false;

      switch (rule.type) {
        case 'threshold':
          if (!isNaN(num)) {
            const t = parseFloat(rule.val1);
            match = !isNaN(t) && num >= t;
          }
          break;
        case 'below':
          if (!isNaN(num)) {
            const t = parseFloat(rule.val1);
            match = !isNaN(t) && num < t;
          }
          break;
        case 'between':
          if (!isNaN(num)) {
            const lo = parseFloat(rule.val1), hi = parseFloat(rule.val2);
            match = !isNaN(lo) && !isNaN(hi) && num >= lo && num <= hi;
          }
          break;
        case 'text_contains':
          match = val.toLowerCase().includes((rule.val1 || '').toLowerCase());
          break;
        case 'duplicates':
          match = dupes && dupes.has(val);
          break;
        case 'empty':
          match = !val.trim();
          break;
        case 'top_n':
          match = topSet && !isNaN(num) && topSet.has(num);
          break;
        case 'gradient':
          if (!isNaN(num) && max > min) {
            const pct = ((num - min) / (max - min)) * 100;
            td.classList.add('cf-gradient');
            // Add bar inside cell
            let bar = td.querySelector('.cf-bar');
            if (!bar) { bar = document.createElement('div'); bar.className = 'cf-bar'; bar.style.cssText = 'position:absolute;left:0;bottom:0;height:3px;border-radius:0 2px 2px 0;transition:width .3s'; td.style.position = 'relative'; td.appendChild(bar); }
            bar.style.width = pct + '%';
            bar.style.background = pct > 66 ? 'var(--grn)' : pct > 33 ? 'var(--ora)' : 'var(--red)';
          }
          return; // gradient doesn't use match
      }

      if (match) td.classList.add('cf-' + rule.style);
    });
  });
}

export function renderCFRules() {
  const el = $('cf-rules');
  if (!el) return;
  if (!_cfRules.length) { el.innerHTML = ''; return; }
  el.innerHTML = _cfRules.map((r, i) => `<div class="rule-card"><span class="tg tg-${r.style === 'green' ? 'g' : r.style === 'red' ? 'r' : r.style === 'yellow' ? 'o' : 'c'}">${r.type}</span><span class="rt">${H(r.col)} ${r.val1 ? (r.type === 'between' ? r.val1 + '–' + r.val2 : r.val1) : ''}</span><button class="b bo bs" onclick="cfRemoveRule(${i})">✕</button></div>`).join('');
}

// UI helper: show/hide val2 for "between" type
export function cfTypeChanged() {
  const t = $('cf-type').value;
  const v2 = $('cf-val2');
  if (v2) v2.style.display = t === 'between' ? '' : 'none';
  // Hide val1 for types that don't need it
  const v1 = $('cf-val1');
  if (v1) v1.style.display = (t === 'duplicates' || t === 'empty') ? 'none' : '';
}

function _persistCF() { IDB.put('autoSave', 'cfRules', _cfRules).catch(() => {}); }
export async function _hydrateCF() { try { const r = await IDB.get('autoSave', 'cfRules'); if (r && Array.isArray(r)) _cfRules = r; } catch (e) {} }

// ══════ CELL COMMENTS ══════
let _comments = {}; // { "r:c": "comment text" }

export function addComment(r, c) {
  const key = r + ':' + c;
  const existing = _comments[key] || '';
  const text = prompt('Kommentar:', existing);
  if (text === null) return;
  if (text.trim()) { _comments[key] = text.trim(); } else { delete _comments[key]; }
  _persistComments();
  // Mark cell
  const td = $((`c${r}-${c}`));
  if (td) { td.classList.toggle('has-comment', !!_comments[key]); td.title = _comments[key] || ''; }
  toast(text.trim() ? 'Kommentar gespeichert' : 'Kommentar entfernt');
}

export function getComment(r, c) { return _comments[r + ':' + c] || ''; }

export function applyComments() {
  Object.entries(_comments).forEach(([key, text]) => {
    const [r, c] = key.split(':');
    const td = $(`c${r}-${c}`);
    if (td) { td.classList.add('has-comment'); td.title = text; }
  });
}

function _persistComments() { IDB.put('autoSave', 'cellComments', _comments).catch(() => {}); }
export async function _hydrateComments() { try { const c = await IDB.get('autoSave', 'cellComments'); if (c) _comments = c; } catch (e) {} }
