// ─── AI Features (Freemium + BYOK) ───
import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast } from '../nav.js';
import { isAI, gateFeature } from '../entitlements.js';

// ─── BYOK Key Management ───

function getApiKey() {
  return localStorage.getItem('vba_ai_key') || '';
}

function setApiKey(key) {
  if (key) {
    localStorage.setItem('vba_ai_key', key.trim());
  } else {
    localStorage.removeItem('vba_ai_key');
  }
}

function byokHeaders() {
  const key = getApiKey();
  return key ? { 'x-user-api-key': key } : {};
}

// ─── API Helper ───

async function aiCall(endpoint, body) {
  const res = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...byokHeaders() },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.status === 429) {
    toast('AI Tageslimit erreicht — API-Key in Einstellungen hinterlegen', 'orange');
    return null;
  }
  if (!res.ok) {
    toast(data.error || 'AI-Fehler', 'red');
    return null;
  }

  // Update remaining badge
  if (data.remaining !== null && data.remaining !== undefined) {
    _updateBadge(data.remaining);
  }

  return data;
}

function _updateBadge(remaining) {
  const badge = $('ai-remaining');
  if (badge) badge.textContent = `${remaining} frei`;
}

// ─── Get current columns from loaded Excel data ───

function _getCols() {
  return S.xD?.[0] || [];
}

function _getSamples(count = 5) {
  if (!S.xD || S.xD.length < 2) return [];
  const cols = S.xD[0];
  return cols.map((_, ci) =>
    S.xD.slice(1, 1 + count).map(row => row[ci] || '')
  );
}

// ─── 1. Workflow Builder ───

async function aiWorkflow() {
  gateFeature('smart-suggestions', async () => {
    const desc = prompt('Beschreibe deinen Workflow (auf Deutsch):');
    if (!desc) return;

    toast('AI erstellt Pipeline...', 'blue');
    const data = await aiCall('suggest', { description: desc, columns: _getCols() });
    if (!data) return;

    try {
      const steps = JSON.parse(data.result);
      toast(`Pipeline mit ${steps.length} Schritten erstellt`, 'green');
      // Store as pipeline config for user to review
      S._aiPipeline = steps;
      _showResult('Workflow Builder', data.result);
    } catch {
      _showResult('Workflow Builder', data.result);
    }
  });
}

// ─── 2. Data Profiler ───

async function aiProfile() {
  gateFeature('analyst', async () => {
    const cols = _getCols();
    if (!cols.length) { toast('Erst Excel-Daten laden', 'orange'); return; }

    toast('AI analysiert Daten...', 'blue');
    const data = await aiCall('profile', { columns: cols, samples: _getSamples(8) });
    if (!data) return;

    _showResult('Daten-Profiler', data.result);
  });
}

// ─── 3. Formula Assistant ───

async function aiFormula() {
  gateFeature('analyst', async () => {
    const desc = prompt('Was soll berechnet werden? (z.B. "MwSt für Spalte Netto")');
    if (!desc) return;

    toast('AI erstellt Formel...', 'blue');
    const data = await aiCall('formula', { description: desc, columns: _getCols() });
    if (!data) return;

    try {
      const formula = JSON.parse(data.result);
      toast(`Formel "${formula.name}" erstellt`, 'green');
      _showResult('Formel-Assistent', `${formula.name} = ${formula.formula}`);
    } catch {
      _showResult('Formel-Assistent', data.result);
    }
  });
}

// ─── 4. Template Generator ───

async function aiTemplate() {
  gateFeature('templates', async () => {
    const desc = prompt('Was für ein Dokument? (z.B. "Angebot für Exportkunde")');
    if (!desc) return;

    toast('AI erstellt Vorlage...', 'blue');
    const data = await aiCall('template', { description: desc, columns: _getCols() });
    if (!data) return;

    toast('Vorlage erstellt', 'green');
    _showResult('Template Generator', data.result);
  });
}

// ─── Result Display ───

function _showResult(title, result) {
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="ai-result-modal">
      <button class="paywall-close" onclick="this.closest('.upgrade-overlay').remove()">&times;</button>
      <h3>${title}</h3>
      <pre class="ai-result-pre">${result.replace(/</g, '&lt;')}</pre>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button onclick="navigator.clipboard.writeText(this.closest('.ai-result-modal').querySelector('pre').textContent);window.toast?.('Kopiert','green')"
                style="padding:6px 16px;border-radius:6px;border:1px solid var(--brd);background:var(--s2);color:var(--tx);cursor:pointer;font-size:12px">
          Kopieren
        </button>
        <button onclick="this.closest('.upgrade-overlay').remove()"
                style="padding:6px 16px;border-radius:6px;border:none;background:var(--acc);color:#000;font-weight:700;cursor:pointer;font-size:12px">
          OK
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

// ─── Settings Panel ───

function aiSettings() {
  const key = getApiKey();
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="ai-result-modal" style="max-width:400px">
      <button class="paywall-close" onclick="this.closest('.upgrade-overlay').remove()">&times;</button>
      <h3>AI Einstellungen</h3>
      <p style="font-size:12px;color:var(--tx2);margin:8px 0">Ohne Key: 5 kostenlose Anfragen/Tag. Mit Key: unbegrenzt.</p>
      <div id="ai-usage-info" style="margin:12px 0;padding:8px;background:var(--s2);border-radius:8px;font-size:12px;color:var(--tx2)">Lade...</div>
      <label style="font-size:11px;color:var(--tx3);display:block;margin-top:12px">Anthropic API-Key (optional)</label>
      <input id="ai-key-input" type="password" value="${key}" placeholder="sk-ant-..."
             style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--brd);background:var(--s3);color:var(--tx);font:12px var(--mono);margin-top:4px">
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
        ${key ? `<button onclick="document.getElementById('ai-key-input').value=''"
                style="padding:6px 16px;border-radius:6px;border:1px solid rgba(255,60,60,.3);background:rgba(255,60,60,.1);color:#ff453a;cursor:pointer;font-size:12px">
          Key entfernen
        </button>` : ''}
        <button id="ai-key-save"
                style="padding:6px 16px;border-radius:6px;border:none;background:var(--acc);color:#000;font-weight:700;cursor:pointer;font-size:12px">
          Speichern
        </button>
      </div>
    </div>`;

  overlay.querySelector('#ai-key-save').addEventListener('click', () => {
    const val = overlay.querySelector('#ai-key-input').value;
    setApiKey(val);
    toast(val ? 'API-Key gespeichert' : 'Key entfernt — Freemium aktiv', 'green');
    overlay.remove();
  });

  document.body.appendChild(overlay);

  // Fetch usage info
  fetch('/api/ai/usage', { headers: byokHeaders() })
    .then(r => r.json())
    .then(data => {
      const el = overlay.querySelector('#ai-usage-info');
      if (!el) return;
      if (data.hasKey) {
        el.innerHTML = '<span style="color:var(--grn)">BYOK aktiv — unbegrenzte Anfragen</span>';
      } else {
        el.innerHTML = `<span>${data.remaining}/${data.dailyLimit} Anfragen heute frei</span>`;
      }
    })
    .catch(() => {});
}

// ─── Expose ───
window.aiWorkflow = aiWorkflow;
window.aiProfile = aiProfile;
window.aiFormula = aiFormula;
window.aiTemplate = aiTemplate;
window.aiSettings = aiSettings;
