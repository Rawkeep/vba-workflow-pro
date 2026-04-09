import { S, _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast, H } from '../nav.js';
import { IDB } from '../idb.js';

// ══════════════════════════════════════════════════════
// ═══ EMAIL SETTINGS (SMTP / IMAP / Rules) ═══
// ══════════════════════════════════════════════════════

// ── Hydrate from IDB on startup ──
export async function _hydrateEmailConfig() {
  try {
    S.smtpCfg = await IDB.get('emailConfig', 'smtp') || null;
    S.imapCfg = await IDB.get('emailConfig', 'imap') || null;
    S.imapRules = await IDB.get('emailConfig', 'imapRules') || null;
  } catch (e) { _appLog('hydrateEmail: ' + e.message); }
}

// ── SMTP ──
export async function saveSmtpConfig() {
  const cfg = {
    host: $('smtp-host')?.value.trim() || '',
    port: $('smtp-port')?.value.trim() || '587',
    user: $('smtp-user')?.value.trim() || '',
    pass: $('smtp-pass')?.value.trim() || '',
    from: $('smtp-from')?.value.trim() || '',
    secure: $('smtp-secure')?.checked ?? false,
  };
  if (!cfg.host || !cfg.user || !cfg.pass) return toast('Host, User und Passwort erforderlich');
  S.smtpCfg = cfg;
  await IDB.put('emailConfig', 'smtp', cfg);
  toast('SMTP gespeichert');
  _updateSmtpStatus(true);
}

export async function testSmtpConnection() {
  const cfg = S.smtpCfg;
  if (!cfg) return toast('Zuerst SMTP speichern');
  const el = $('smtp-test-result');
  if (el) { el.textContent = 'Teste...'; el.style.color = 'var(--tx2)'; }
  try {
    const res = await fetch('/api/email/test-smtp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const data = await res.json();
    if (el) {
      el.textContent = data.ok ? 'Verbindung OK' : 'Fehler: ' + data.error;
      el.style.color = data.ok ? 'var(--grn)' : 'var(--red)';
    }
    if (data.ok) toast('SMTP Verbindung OK');
  } catch (e) {
    if (el) { el.textContent = 'Offline oder Server nicht erreichbar'; el.style.color = 'var(--red)'; }
  }
}

export async function clearSmtpConfig() {
  S.smtpCfg = null;
  await IDB.del('emailConfig', 'smtp');
  renderSmtpSettings();
  _updateSmtpStatus(false);
  toast('SMTP gelöscht');
}

export function hasSmtpConfigured() {
  return !!(S.smtpCfg?.host && S.smtpCfg?.user && S.smtpCfg?.pass);
}

// ── IMAP ──
export async function saveImapConfig() {
  const cfg = {
    host: $('imap-host')?.value.trim() || '',
    port: $('imap-port')?.value.trim() || '993',
    user: $('imap-user')?.value.trim() || '',
    pass: $('imap-pass')?.value.trim() || '',
    secure: $('imap-secure')?.checked ?? true,
  };
  if (!cfg.host || !cfg.user || !cfg.pass) return toast('Host, User und Passwort erforderlich');
  S.imapCfg = cfg;
  await IDB.put('emailConfig', 'imap', cfg);
  toast('IMAP gespeichert');
}

export async function testImapConnection() {
  const cfg = S.imapCfg;
  if (!cfg) return toast('Zuerst IMAP speichern');
  const el = $('imap-test-result');
  if (el) { el.textContent = 'Teste...'; el.style.color = 'var(--tx2)'; }
  try {
    const res = await fetch('/api/email/test-imap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const data = await res.json();
    if (el) {
      el.textContent = data.ok ? 'Verbindung OK' : 'Fehler: ' + data.error;
      el.style.color = data.ok ? 'var(--grn)' : 'var(--red)';
    }
    if (data.ok) toast('IMAP Verbindung OK');
  } catch (e) {
    if (el) { el.textContent = 'Offline oder Server nicht erreichbar'; el.style.color = 'var(--red)'; }
  }
}

export async function clearImapConfig() {
  S.imapCfg = null;
  await IDB.del('emailConfig', 'imap');
  renderImapSettings();
  toast('IMAP gelöscht');
}

export function hasImapConfigured() {
  return !!(S.imapCfg?.host && S.imapCfg?.user && S.imapCfg?.pass);
}

// ── IMAP Forwarding Rules ──
export async function saveImapRules() {
  const rules = {
    forwardTo: $('imap-fwd-to')?.value.trim() || '',
    renamePattern: $('imap-rename')?.value.trim() || '{Von}_{Betreff}_{Original}',
    enabled: $('imap-rules-enabled')?.checked ?? true,
  };
  if (!rules.forwardTo) return toast('Weiterleitungs-Adresse erforderlich');
  S.imapRules = rules;
  await IDB.put('emailConfig', 'imapRules', rules);
  toast('Regeln gespeichert');
}

// ── Render Settings ──
export function renderSmtpSettings() {
  const c = S.smtpCfg || {};
  if ($('smtp-host')) $('smtp-host').value = c.host || '';
  if ($('smtp-port')) $('smtp-port').value = c.port || '587';
  if ($('smtp-user')) $('smtp-user').value = c.user || '';
  if ($('smtp-pass')) $('smtp-pass').value = c.pass || '';
  if ($('smtp-from')) $('smtp-from').value = c.from || '';
  if ($('smtp-secure')) $('smtp-secure').checked = c.secure ?? false;
  _updateSmtpStatus(hasSmtpConfigured());
}

export function renderImapSettings() {
  const c = S.imapCfg || {};
  if ($('imap-host')) $('imap-host').value = c.host || '';
  if ($('imap-port')) $('imap-port').value = c.port || '993';
  if ($('imap-user')) $('imap-user').value = c.user || '';
  if ($('imap-pass')) $('imap-pass').value = c.pass || '';
  if ($('imap-secure')) $('imap-secure').checked = c.secure ?? true;
}

export function renderImapRules() {
  const r = S.imapRules || {};
  if ($('imap-fwd-to')) $('imap-fwd-to').value = r.forwardTo || '';
  if ($('imap-rename')) $('imap-rename').value = r.renamePattern || '{Von}_{Betreff}_{Original}';
  if ($('imap-rules-enabled')) $('imap-rules-enabled').checked = r.enabled ?? true;
}

// ── Toggle & Tabs ──
export function toggleEmailSettings() {
  const el = $('email-settings-card');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (!open) { renderSmtpSettings(); renderImapSettings(); renderImapRules(); }
}

export function emailCfgTab(tabEl, panelId) {
  document.querySelectorAll('#ecfg-tabs .tab').forEach(t => t.classList.remove('a'));
  tabEl.classList.add('a');
  ['ecfg-smtp', 'ecfg-imap', 'ecfg-rules'].forEach(id => {
    const p = $(id); if (p) p.style.display = id === panelId ? '' : 'none';
  });
}

// ── Internal ──
function _updateSmtpStatus(ok) {
  const badge = $('smtp-status-badge');
  if (!badge) return;
  badge.className = ok ? 'tg tg-g' : 'tg tg-r';
  badge.textContent = ok ? 'SMTP aktiv' : 'Kein SMTP';
}
