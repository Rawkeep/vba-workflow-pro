import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H } from '../nav.js';
import { createWizard } from '../ui/wizard.js';
import { hasSmtpConfigured } from './settings.js';

// ══════════════════════════════════════════════════════
// ═══ SERIENEMAIL WIZARD (4 Steps) ═══
// ══════════════════════════════════════════════════════

let _emailWizard = null;

export function initEmailWizard() {
  const container = $('email-wizard-container');
  if (!container) return;

  _emailWizard = createWizard({
    containerId: 'email-wizard-container',
    color: 'cyn',
    steps: [
      { id: 'data', label: 'Daten', render: _renderStep1, validate: _validateStep1 },
      { id: 'template', label: 'Template', render: _renderStep2, validate: _validateStep2 },
      { id: 'preview', label: 'Vorschau', render: _renderStep3, validate: () => true },
      { id: 'send', label: 'Senden', render: _renderStep4 },
    ],
    onComplete: () => toast('Serien-E-Mail abgeschlossen'),
  });
}

export function setEmailMode(mode) {
  const wizard = $('email-wizard-container');
  const pro = $('email-pro-container');
  if (!wizard || !pro) return;
  wizard.style.display = mode === 'wizard' ? '' : 'none';
  pro.style.display = mode === 'wizard' ? 'none' : '';
  document.querySelectorAll('#email-mode-toggle span').forEach(s => {
    s.classList.toggle('active', s.dataset.mode === mode);
  });
  if (mode === 'wizard' && _emailWizard) _emailWizard.render();
}

// ── Step 1: Daten laden ──
function _renderStep1(el) {
  const hasData = S.wI && S.wD.length > 0;
  // Find email column
  const emailCol = S.wH.findIndex(h => h.toLowerCase().includes('mail'));

  el.innerHTML = `
    <div style="text-align:center;padding:16px 0">
      ${hasData ? `
        <div style="font:600 14px var(--mono);color:var(--grn);margin-bottom:8px">\u2713 ${S.wD.length} Empf\u00e4nger geladen</div>
        <div style="font:11px var(--mono);color:var(--tx2);margin-bottom:6px">${S.wH.length} Spalten: ${S.wH.slice(0, 5).map(h => H(h)).join(', ')}${S.wH.length > 5 ? '...' : ''}</div>
        ${emailCol >= 0
          ? `<div style="font:11px var(--mono);color:var(--grn);margin-bottom:12px">\u2713 E-Mail-Spalte: ${H(S.wH[emailCol])}</div>`
          : `<div style="font:11px var(--mono);color:var(--ora);margin-bottom:12px">\u26a0 Keine E-Mail-Spalte erkannt</div>`}
        <button class="b bo bs" onclick="document.getElementById('ewz-file-input').click()">Andere Datei</button>
        <button class="b bb bs" onclick="WU();if(_emailWizard)_emailWizard.render()">Excel \u00fcbernehmen</button>
      ` : `
        <div class="drop-zone" id="ewz-drop-zone" onclick="document.getElementById('ewz-file-input').click()">
          <div style="font-size:32px;margin-bottom:8px">\ud83d\udce7</div>
          <div>Excel/CSV mit E-Mail-Spalte<br>hierher ziehen oder klicken</div>
        </div>
        <div style="margin-top:10px">
          <button class="b bb bs" onclick="WU();if(_emailWizard)_emailWizard.render()">Aktuelle Excel-Daten \u00fcbernehmen</button>
        </div>
      `}
      <input type="file" id="ewz-file-input" accept=".xlsx,.xls,.csv" style="display:none"
        onchange="WI(this);setTimeout(()=>{if(_emailWizard)_emailWizard.render()},300)">
    </div>`;

  // Drag & drop
  const dz = $('ewz-drop-zone');
  if (dz) {
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = () => dz.classList.remove('dragover');
    dz.ondrop = (e) => {
      e.preventDefault(); dz.classList.remove('dragover');
      const f = e.dataTransfer.files[0];
      if (f) { const inp = $('ewz-file-input'); const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; window.WI(inp); setTimeout(() => { if (_emailWizard) _emailWizard.render(); }, 300); }
    };
  }
}

function _validateStep1() {
  if (!S.wI || !S.wD.length) return 'Zuerst Daten laden';
  const hasEmail = S.wH.some(h => h.toLowerCase().includes('mail'));
  return hasEmail ? true : 'Keine E-Mail-Spalte gefunden. Spalte muss "mail" oder "email" enthalten.';
}

// ── Step 2: Template + Betreff ──
function _renderStep2(el) {
  // Auto-select email column
  const emailCol = S.wH.findIndex(h => h.toLowerCase().includes('mail'));

  el.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div style="flex:1"><label style="font:500 10px var(--mono);color:var(--tx3);text-transform:uppercase">BETREFF</label>
        <input type="text" id="ewz-subj" placeholder="Betreff mit {{Felder}}..." style="width:100%" value="${$('sem-subj')?.value || ''}"></div>
        <div style="min-width:140px"><label style="font:500 10px var(--mono);color:var(--tx3);text-transform:uppercase">E-MAIL-SPALTE</label>
        <select id="ewz-email-col" style="width:100%">
          ${S.wH.map((h, i) => `<option value="${i}" ${i === emailCol ? 'selected' : ''}>${H(h)}</option>`).join('')}
        </select></div>
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:1">
        <label style="font:500 11px var(--mono);color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">NACHRICHT</label>
        <textarea id="ewz-body" rows="12" style="width:100%;resize:vertical;line-height:1.7;font-size:13px"
          oninput="$('sem-body').value=this.value;_ewzLivePreview()"
          placeholder="Sehr geehrte/r {{Anrede}} {{Name}},\n\nIhre Bestellung {{Auftragsnr}} wurde versendet.\n\nMfG">${$('sem-body')?.value || ''}</textarea>
      </div>
      <div class="merge-field-sidebar">
        <div style="font:600 10px var(--mono);color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Felder</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${S.wH.map(h => `<div class="merge-field-chip" draggable="true"
            ondragstart="event.dataTransfer.setData('text/plain','{{${H(h)}}}');this.classList.add('dragging')"
            ondragend="this.classList.remove('dragging')"
            onclick="_ewzInsertField('${h.replace(/'/g, "\\'")}')"
            title="Klick oder Drag">{{${H(h)}}}</div>`).join('')}
        </div>
      </div>
    </div>
    <div id="ewz-live-pv" style="margin-top:8px;padding:10px;background:var(--s2);border-radius:8px;border:1px solid var(--bdr);font:12px/1.7 var(--mono);color:var(--tx2);max-height:150px;overflow-y:auto;display:none"></div>`;

  // Drag & drop on textarea
  const ta = $('ewz-body');
  if (ta) {
    ta.ondragover = (e) => e.preventDefault();
    ta.ondrop = (e) => {
      e.preventDefault();
      const text = e.dataTransfer.getData('text/plain');
      if (text.startsWith('{{')) {
        const pos = ta.selectionStart;
        ta.value = ta.value.slice(0, pos) + text + ta.value.slice(ta.selectionEnd);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = pos + text.length;
        if ($('sem-body')) $('sem-body').value = ta.value;
        _ewzLivePreview();
      }
    };
  }

  _ewzLivePreview();
}

function _validateStep2() {
  const body = $('ewz-body')?.value || $('sem-body')?.value || '';
  if (body.trim().length < 10) return 'Nachricht ist zu kurz';
  // Sync to main form
  if ($('sem-subj')) $('sem-subj').value = $('ewz-subj')?.value || '';
  if ($('sem-body')) $('sem-body').value = $('ewz-body')?.value || '';
  if ($('sem-col-email')) $('sem-col-email').value = $('ewz-email-col')?.value || '';
  return true;
}

// ── Step 3: Vorschau ──
function _renderStep3(el) {
  const subj = $('ewz-subj')?.value || $('sem-subj')?.value || '(kein Betreff)';
  const body = $('ewz-body')?.value || $('sem-body')?.value || '';
  const eci = parseInt($('ewz-email-col')?.value ?? $('sem-col-email')?.value);
  const max = Math.min(S.wD.length, 8);

  let html = `<div style="font:500 11px var(--mono);color:var(--tx2);margin-bottom:8px">${S.wD.length} E-Mails — Vorschau:</div>`;
  html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto">';

  for (let i = 0; i < max; i++) {
    let s = subj, b = body;
    S.wH.forEach((h, ci) => {
      const re = new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
      s = s.replace(re, String(S.wD[i]?.[ci] ?? ''));
      b = b.replace(re, String(S.wD[i]?.[ci] ?? ''));
    });
    const email = (!isNaN(eci) && S.wD[i]?.[eci]) ? String(S.wD[i][eci]) : '?';

    html += `<div class="em-pv-card">
      <div class="epc-to">${H(email)}</div>
      <div class="epc-subj">${H(s)}</div>
      <div class="epc-body">${H(b.slice(0, 200))}${b.length > 200 ? '...' : ''}</div>
    </div>`;
  }

  if (S.wD.length > max) html += `<p style="font:11px var(--mono);color:var(--tx3);text-align:center;padding:6px">... und ${S.wD.length - max} weitere</p>`;
  html += '</div>';
  el.innerHTML = html;
}

// ── Step 4: Senden ──
function _renderStep4(el) {
  const smtpOk = hasSmtpConfigured();
  const count = S.wD.filter((row) => {
    const eci = parseInt($('ewz-email-col')?.value ?? $('sem-col-email')?.value);
    return !isNaN(eci) && String(row[eci] || '').includes('@');
  }).length;

  el.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font:600 16px var(--mono);color:var(--tx);margin-bottom:4px">${count} E-Mails bereit</div>
      ${smtpOk
        ? `<p style="font:12px var(--mono);color:var(--grn);margin-bottom:16px">\u2713 SMTP konfiguriert — Hintergrundversand</p>
           <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
             <button class="b bcyn" onclick="sendBatchEmails()">Alle senden</button>
             <button class="b bo bs" onclick="SEM2()">Mail-Client (Fallback)</button>
             <button class="b bpur bs" onclick="semExportAll()">Alle als PDF</button>
           </div>`
        : `<p style="font:12px var(--mono);color:var(--ora);margin-bottom:16px">\u26a0 Kein SMTP — nur Mail-Client oder PDF m\u00f6glich</p>
           <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
             <button class="b bo" onclick="SEM2()">Mail-Client \u00f6ffnen</button>
             <button class="b bpur bs" onclick="semExportAll()">Alle als PDF</button>
             <button class="b bcyn bs" onclick="toggleEmailSettings()">SMTP einrichten</button>
           </div>`}
      <div id="ewz-progress" style="margin-top:16px"></div>
    </div>`;
}

// ── Helpers ──
function _ewzInsertField(h) {
  const ta = $('ewz-body');
  if (!ta) return;
  const pos = ta.selectionStart;
  ta.value = ta.value.slice(0, pos) + `{{${h}}}` + ta.value.slice(ta.selectionEnd);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = pos + h.length + 4;
  if ($('sem-body')) $('sem-body').value = ta.value;
  _ewzLivePreview();
}

let _ewzPvTimer = null;
function _ewzLivePreview() {
  clearTimeout(_ewzPvTimer);
  _ewzPvTimer = setTimeout(() => {
    const pv = $('ewz-live-pv');
    const body = $('ewz-body')?.value || '';
    const subj = $('ewz-subj')?.value || '';
    if (!pv || !body || !S.wD.length) { if (pv) pv.style.display = 'none'; return; }
    let s = subj, b = body;
    S.wH.forEach((h, ci) => {
      const re = new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
      s = s.replace(re, String(S.wD[0]?.[ci] ?? ''));
      b = b.replace(re, String(S.wD[0]?.[ci] ?? ''));
    });
    pv.style.display = '';
    pv.innerHTML = `<div style="font:600 9px var(--mono);color:var(--tx3);margin-bottom:4px">LIVE-VORSCHAU (Empf\u00e4nger 1):</div>
      <div style="font:600 11px var(--mono);color:var(--cyn);margin-bottom:2px">Betreff: ${H(s)}</div>${H(b)}`;
  }, 200);
}

// Expose for inline handlers
window._emailWizard = null;
window._ewzInsertField = _ewzInsertField;
window._ewzLivePreview = _ewzLivePreview;

export { _emailWizard };
