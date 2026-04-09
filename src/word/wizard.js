import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H } from '../nav.js';
import { createWizard } from '../ui/wizard.js';

// ══════════════════════════════════════════════════════
// ═══ SERIENBRIEF WIZARD (4 Steps) ═══
// ══════════════════════════════════════════════════════

let _wordWizard = null;

export function initWordWizard() {
  const container = $('word-wizard-container');
  if (!container) return;

  _wordWizard = createWizard({
    containerId: 'word-wizard-container',
    color: 'blu',
    steps: [
      { id: 'data', label: 'Daten', render: _renderStep1, validate: _validateStep1 },
      { id: 'template', label: 'Template', render: _renderStep2, validate: _validateStep2 },
      { id: 'preview', label: 'Vorschau', render: _renderStep3, validate: () => true },
      { id: 'export', label: 'Export', render: _renderStep4 },
    ],
    onComplete: () => toast('Serienbrief-Export abgeschlossen'),
  });
}

export function setWordMode(mode) {
  const wizard = $('word-wizard-container');
  const pro = $('word-pro-container');
  if (!wizard || !pro) return;
  wizard.style.display = mode === 'wizard' ? '' : 'none';
  pro.style.display = mode === 'wizard' ? 'none' : '';
  document.querySelectorAll('#word-mode-toggle span').forEach(s => {
    s.classList.toggle('active', s.dataset.mode === mode);
  });
  if (mode === 'wizard' && _wordWizard) _wordWizard.render();
}

// ── Step 1: Daten laden ──
function _renderStep1(el) {
  const hasData = S.wI && S.wD.length > 0;
  el.innerHTML = `
    <div style="text-align:center;padding:16px 0">
      ${hasData ? `
        <div style="font:600 14px var(--mono);color:var(--grn);margin-bottom:8px">\u2713 ${S.wD.length} Datens\u00e4tze geladen</div>
        <div style="font:11px var(--mono);color:var(--tx2);margin-bottom:12px">${S.wH.length} Spalten: ${S.wH.slice(0, 5).map(h => H(h)).join(', ')}${S.wH.length > 5 ? '...' : ''}</div>
        <button class="b bo bs" onclick="document.getElementById('wz-file-input').click()">Andere Datei laden</button>
        <button class="b bb bs" onclick="WU();if(_wordWizard)_wordWizard.render()">Excel \u00fcbernehmen</button>
      ` : `
        <div class="drop-zone" id="wz-drop-zone" onclick="document.getElementById('wz-file-input').click()">
          <div style="font-size:32px;margin-bottom:8px">\ud83d\udcc2</div>
          <div>Excel/CSV hierher ziehen<br>oder klicken zum Ausw\u00e4hlen</div>
        </div>
        <div style="margin-top:10px">
          <button class="b bb bs" onclick="WU();if(_wordWizard)_wordWizard.render()">Aktuelle Excel-Daten \u00fcbernehmen</button>
        </div>
      `}
      <input type="file" id="wz-file-input" accept=".xlsx,.xls,.csv" style="display:none"
        onchange="WI(this);setTimeout(()=>{if(_wordWizard)_wordWizard.render()},300)">
    </div>`;

  // Drag & drop
  const dz = $('wz-drop-zone');
  if (dz) {
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = () => dz.classList.remove('dragover');
    dz.ondrop = (e) => {
      e.preventDefault(); dz.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f) { const inp = $('wz-file-input'); const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; window.WI(inp); setTimeout(() => { if (_wordWizard) _wordWizard.render(); }, 300); }
    };
  }
}

function _validateStep1() {
  return S.wI && S.wD.length > 0 ? true : 'Zuerst Daten laden';
}

// ── Step 2: Template bearbeiten ──
function _renderStep2(el) {
  el.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:1">
        <label style="font:500 11px var(--mono);color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">VORLAGE</label>
        <textarea id="wz-tpl" rows="14" style="width:100%;resize:vertical;line-height:1.7;font-size:13px"
          oninput="$('w-tpl').value=this.value;UP();_wzLivePreview()"
          placeholder="Sehr geehrte/r {{Anrede}} {{Name}},\n\nIhre Bestellung {{Auftragsnr}}...\n\nMfG">${$('w-tpl')?.value || ''}</textarea>
        <div id="wz-ph-status" style="margin-top:6px"></div>
      </div>
      <div class="merge-field-sidebar">
        <div style="font:600 10px var(--mono);color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Felder</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${S.wH.map(h => `<div class="merge-field-chip" draggable="true"
            ondragstart="event.dataTransfer.setData('text/plain','{{${H(h)}}}');this.classList.add('dragging')"
            ondragend="this.classList.remove('dragging')"
            onclick="_wzInsertField('${h.replace(/'/g, "\\'")}')"
            title="Klick oder Drag">{{${H(h)}}}</div>`).join('')}
        </div>
      </div>
    </div>
    <div id="wz-live-pv" style="margin-top:8px;padding:10px;background:var(--s2);border-radius:8px;border:1px solid var(--bdr);font:12px/1.7 var(--mono);color:var(--tx2);max-height:150px;overflow-y:auto;display:none"></div>`;

  // Sync from main template if exists
  const wzTpl = $('wz-tpl');
  if (wzTpl) {
    wzTpl.ondragover = (e) => e.preventDefault();
    wzTpl.ondrop = (e) => {
      e.preventDefault();
      const text = e.dataTransfer.getData('text/plain');
      if (text.startsWith('{{')) {
        const pos = wzTpl.selectionStart;
        wzTpl.value = wzTpl.value.slice(0, pos) + text + wzTpl.value.slice(wzTpl.selectionEnd);
        wzTpl.focus();
        wzTpl.selectionStart = wzTpl.selectionEnd = pos + text.length;
        if ($('w-tpl')) $('w-tpl').value = wzTpl.value;
        window.UP?.();
        _wzLivePreview();
      }
    };
  }

  // Template library buttons
  _wzUpdatePH();
  _wzLivePreview();
}

function _validateStep2() {
  const tpl = $('wz-tpl')?.value || $('w-tpl')?.value || '';
  return tpl.trim().length > 10 ? true : 'Template ist zu kurz';
}

// ── Step 3: Vorschau ──
function _renderStep3(el) {
  const tpl = $('wz-tpl')?.value || $('w-tpl')?.value || '';
  const max = Math.min(S.wD.length, 12);
  let html = `<div style="font:500 11px var(--mono);color:var(--tx2);margin-bottom:8px">${S.wD.length} Dokumente — Vorschau der ersten ${max}:</div>`;
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px;max-height:400px;overflow-y:auto">';

  for (let i = 0; i < max; i++) {
    let merged = tpl;
    S.wH.forEach((h, ci) => {
      const re = new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
      merged = merged.replace(re, String(S.wD[i]?.[ci] ?? ''));
    });
    const unresolved = merged.match(/\{\{[^}]+\}\}/g);
    const badge = unresolved
      ? `<span class="tg tg-r" style="font-size:9px">${unresolved.length} offen</span>`
      : '<span class="tg tg-g" style="font-size:9px">OK</span>';

    html += `<div class="cd" style="padding:10px;margin:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font:600 11px var(--mono);color:var(--cyn)">#${i + 1}</span>${badge}
      </div>
      <div style="font:11px/1.6 var(--mono);color:var(--tx2);max-height:120px;overflow-y:auto;white-space:pre-wrap">${H(merged.slice(0, 300))}${merged.length > 300 ? '...' : ''}</div>
    </div>`;
  }

  if (S.wD.length > max) html += `<div style="text-align:center;font:11px var(--mono);color:var(--tx3);padding:8px">... und ${S.wD.length - max} weitere</div>`;
  html += '</div>';
  el.innerHTML = html;
}

// ── Step 4: Export ──
function _renderStep4(el) {
  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font:600 16px var(--mono);color:var(--tx);margin-bottom:4px">${S.wD.length} Serienbriefe bereit</div>
      <p style="font:12px var(--mono);color:var(--tx2);margin-bottom:20px">W\u00e4hle das Exportformat:</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="b bb" onclick="WEA()">Alle als .docx</button>
        <button class="b bpur" onclick="WEAPDF()">Alle als PDF</button>
        <button class="b bo" onclick="WES()">Vorschau .docx</button>
        <button class="b bo" onclick="WESPDF()">Vorschau PDF</button>
      </div>
    </div>`;
}

// ── Helpers ──
function _wzInsertField(h) {
  const ta = $('wz-tpl');
  if (!ta) return;
  const pos = ta.selectionStart;
  ta.value = ta.value.slice(0, pos) + `{{${h}}}` + ta.value.slice(ta.selectionEnd);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = pos + h.length + 4;
  if ($('w-tpl')) $('w-tpl').value = ta.value;
  window.UP?.();
  _wzLivePreview();
}

let _wzPvTimer = null;
function _wzLivePreview() {
  clearTimeout(_wzPvTimer);
  _wzPvTimer = setTimeout(() => {
    const pv = $('wz-live-pv');
    const tpl = $('wz-tpl')?.value || '';
    if (!pv || !tpl || !S.wD.length) { if (pv) pv.style.display = 'none'; return; }
    let merged = tpl;
    S.wH.forEach((h, ci) => {
      const re = new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
      merged = merged.replace(re, String(S.wD[0]?.[ci] ?? ''));
    });
    pv.style.display = '';
    pv.innerHTML = `<div style="font:600 9px var(--mono);color:var(--tx3);margin-bottom:4px">LIVE-VORSCHAU (Zeile 1):</div>${H(merged)}`;
  }, 200);
}

function _wzUpdatePH() {
  const tpl = $('wz-tpl')?.value || '';
  const ms = tpl.match(/\{\{([^}]+)\}\}/g);
  const el = $('wz-ph-status');
  if (!el) return;
  if (!ms) { el.innerHTML = ''; return; }
  const cols = S.wH.map(h => h.toLowerCase());
  const unique = [...new Set(ms.map(m => m.replace(/[{}]/g, '').trim()))];
  const matched = unique.filter(p => cols.includes(p.toLowerCase())).length;
  el.innerHTML = `<span style="font:11px var(--mono);color:${matched === unique.length ? 'var(--grn)' : 'var(--ora)'}">
    ${matched}/${unique.length} Felder zugeordnet</span>`;
}

// Expose for inline handlers
window._wordWizard = null;
window._wzInsertField = _wzInsertField;
window._wzLivePreview = _wzLivePreview;

export { _wordWizard };
