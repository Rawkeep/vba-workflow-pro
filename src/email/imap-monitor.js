import { S, _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast, H } from '../nav.js';
import { hasImapConfigured, hasSmtpConfigured } from './settings.js';
import { gateFeature } from '../entitlements.js';

// ══════════════════════════════════════════════════════
// ═══ IMAP MONITOR — Watch, Rename, Forward ═══
// ══════════════════════════════════════════════════════

let _abortController = null;

export async function startImapWatch() {
  if (!hasImapConfigured()) return toast('Zuerst IMAP konfigurieren');
  if (!hasSmtpConfigured()) return toast('Zuerst SMTP konfigurieren (für Weiterleitung)');
  if (!S.imapRules?.forwardTo) return toast('Weiterleitungs-Adresse fehlt');

  gateFeature('imap-monitor', async () => {
    if (S.imapWatchActive) return toast('Monitor läuft bereits');

    S.imapWatchActive = true;
    S.imapForwards = [];
    renderImapStatus();

    _abortController = new AbortController();

    try {
      const res = await fetch('/api/email/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imap: S.imapCfg,
          forwardSmtp: S.smtpCfg,
          forwardTo: S.imapRules.forwardTo,
          renamePattern: S.imapRules.renamePattern || '{Von}_{Betreff}_{Original}',
        }),
        signal: _abortController.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'connected') {
              S._imapSessionId = ev.sessionId;
              toast('IMAP Monitor aktiv');
            } else if (ev.type === 'forwarded') {
              S.imapForwards.unshift({
                time: new Date().toISOString(),
                from: ev.from,
                subject: ev.subject,
                attachments: ev.attachments,
                to: ev.to,
              });
              if (S.imapForwards.length > 50) S.imapForwards.pop();
              toast(`Weitergeleitet: ${ev.attachments?.[0] || 'PDF'}`);
            } else if (ev.type === 'skipped') {
              // silent
            } else if (ev.type === 'error') {
              _appLog('IMAP: ' + ev.message);
            }
            renderImapStatus();
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        toast('IMAP Fehler: ' + e.message);
        _appLog('IMAP watch: ' + e.message);
      }
    } finally {
      S.imapWatchActive = false;
      _abortController = null;
      renderImapStatus();
    }
  });
}

export async function stopImapWatch() {
  if (_abortController) _abortController.abort();
  if (S._imapSessionId) {
    try {
      await fetch('/api/email/watch-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: S._imapSessionId }),
      });
    } catch {}
    S._imapSessionId = null;
  }
  S.imapWatchActive = false;
  renderImapStatus();
  toast('IMAP Monitor gestoppt');
}

export function renderImapStatus() {
  const el = $('imap-monitor-card');
  if (!el) return;

  const active = S.imapWatchActive;
  const badge = active
    ? '<span class="tg tg-g" style="animation:pulse 1.5s infinite">Aktiv</span>'
    : '<span class="tg tg-r">Inaktiv</span>';

  const logHtml = S.imapForwards.length
    ? S.imapForwards.slice(0, 20).map(f => `
      <div class="em-pv-card" style="padding:8px 10px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font:600 11px var(--mono);color:var(--cyn)">${H(f.from)}</span>
          <span style="font:9px var(--mono);color:var(--tx3)">${new Date(f.time).toLocaleTimeString('de-DE')}</span>
        </div>
        <div style="font:11px var(--mono);color:var(--tx2);margin:2px 0">${H(f.subject)}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${(f.attachments || []).map(a => `<span class="tg tg-g" style="font-size:9px">${H(a)}</span>`).join('')}
          <span class="tg tg-b" style="font-size:9px">→ ${H(f.to)}</span>
        </div>
      </div>`).join('')
    : '<p style="font:11px var(--mono);color:var(--tx3);text-align:center;padding:12px">Noch keine Weiterleitungen</p>';

  $('imap-status-badge').innerHTML = badge;
  $('imap-log').innerHTML = logHtml;

  const startBtn = $('imap-start-btn');
  const stopBtn = $('imap-stop-btn');
  if (startBtn) startBtn.disabled = active;
  if (stopBtn) stopBtn.disabled = !active;
}
