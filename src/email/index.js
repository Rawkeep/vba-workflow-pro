import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, A } from '../nav.js';
import { hasSmtpConfigured } from './settings.js';
import { gateFeature } from '../entitlements.js';

// TODO: cross-module dependency — addDashActivity is defined in dashboard/index.js

// ══════════════════════════════════════════════════════
// ═══ ENHANCED EMAIL / SERIEN-MAIL ═══
// ══════════════════════════════════════════════════════
export function initEmailMerge(){
  const sel=$('sem-col-email');
  if(!sel)return;
  sel.innerHTML='<option value="">E-Mail-Spalte…</option>';
  if(!S.wI)return;
  S.wH.forEach((h,i)=>{
    sel.innerHTML+=`<option value="${i}" ${h.toLowerCase().includes('mail')?'selected':''}>${H(h)}</option>`;
  });
  // Merge field buttons
  const fields=$('sem-fields');
  if(fields)fields.innerHTML=S.wH.map(h=>`<span style="padding:2px 8px;border-radius:4px;background:rgba(34,211,238,.1);color:var(--cyn);font:10px var(--mono);cursor:pointer;border:1px solid rgba(34,211,238,.2)" onclick="insertSemField('${A(h)}')">\{\{${H(h)}\}\}</span>`).join('');
  // Enable buttons
  const hasEmail=sel.value!=='';
  $('sem-btn2').disabled=!S.wI||!hasEmail;
  $('sem-pv-btn').disabled=!S.wI;
  if(S.wI)$('sem-att-panel').style.display='';
  $('sem-info2').textContent=S.wI?S.wD.length+' Empfänger':'Keine Daten';
}
export function insertSemField(h){
  const ta=$('sem-body');
  const pos=ta.selectionStart;
  const v=ta.value;
  ta.value=v.substring(0,pos)+'{{'+h+'}}'+v.substring(ta.selectionEnd);
  ta.focus();
  ta.selectionStart=ta.selectionEnd=pos+h.length+4;
}
export function semPreview(){
  const subj=$('sem-subj').value||'(kein Betreff)';
  const body=$('sem-body').value||$('w-tpl').value||'';
  const eci=parseInt($('sem-col-email').value);
  const pv=$('sem-preview');
  let html='';
  S.wD.slice(0,8).forEach((row,i)=>{
    let b=body,s=subj;
    S.wH.forEach((h,ci)=>{
      const re=new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi');
      b=b.replace(re,String(row[ci]??''));
      s=s.replace(re,String(row[ci]??''));
    });
    const email=(!isNaN(eci)&&row[eci])?String(row[eci]):'?';
    html+=`<div class="em-pv-card"><div class="epc-to">📧 ${H(email)}</div><div class="epc-subj">${H(s)}</div><div class="epc-body">${H(b)}</div></div>`;
  });
  if(S.wD.length>8)html+=`<p style="font-size:10px;color:var(--tx3);text-align:center;margin-top:6px">… und ${S.wD.length-8} weitere</p>`;
  pv.innerHTML=html;
}
export function SEM2(){
  const subj=$('sem-subj').value||'';
  const body=$('sem-body').value||$('w-tpl').value||'';
  const eci=parseInt($('sem-col-email').value);
  if(isNaN(eci))return toast('E-Mail-Spalte wählen');
  let opened=0;
  S.wD.forEach(row=>{
    let b=body,s=subj;
    S.wH.forEach((h,ci)=>{
      const re=new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi');
      b=b.replace(re,String(row[ci]??''));
      s=s.replace(re,String(row[ci]??''));
    });
    const em=String(row[eci]||'');
    if(em.includes('@')){
      window.open(`mailto:${encodeURIComponent(em)}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`);
      opened++;
    }
  });
  toast(opened+' E-Mails geöffnet');
  addDashActivity('📧',opened+' Serien-E-Mails versendet');
}
export function semExportAll(){
  const subj=$('sem-subj').value||'Serien-Mail';
  const body=$('sem-body').value||$('w-tpl').value||'';
  const eci=parseInt($('sem-col-email').value);
  const{jsPDF}=window.jspdf;const doc=new jsPDF();let first=true;
  S.wD.forEach((row,i)=>{
    if(!first)doc.addPage();first=false;
    let b=body,s=subj;
    S.wH.forEach((h,ci)=>{
      const re=new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi');
      b=b.replace(re,String(row[ci]??''));
      s=s.replace(re,String(row[ci]??''));
    });
    const em=(!isNaN(eci)&&row[eci])?String(row[eci]):'';
    doc.setFontSize(11);doc.setFont(undefined,'bold');
    doc.text('An: '+em,20,25);
    doc.text('Betreff: '+s,20,32);
    doc.setFont(undefined,'normal');doc.setFontSize(10);
    const lines=doc.splitTextToSize(b,170);
    doc.text(lines,20,44);
  });
  doc.save('Serien_Mail_'+S.wD.length+'.pdf');
  toast('PDF ✓');
  addDashActivity('📄','Serien-Mail PDF exportiert ('+S.wD.length+')');
}

// ══════════════════════════════════════════════════════
// ═══ BACKGROUND BATCH SEND (via Server SMTP) ═══
// ══════════════════════════════════════════════════════

function _mergeText(template, row) {
  let t = template;
  S.wH.forEach((h, ci) => {
    const re = new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
    t = t.replace(re, String(row[ci] ?? ''));
  });
  return t;
}

export async function sendBatchEmails() {
  if (!hasSmtpConfigured()) {
    toast('Kein SMTP — öffne Mail-Client');
    SEM2();
    return;
  }

  gateFeature('email-batch', async () => {
    const subj = $('sem-subj').value || '';
    const body = $('sem-body').value || $('w-tpl')?.value || '';
    const eci = parseInt($('sem-col-email').value);
    if (isNaN(eci)) return toast('E-Mail-Spalte wählen');

    // Build emails array
    const emails = [];
    S.wD.forEach((row, i) => {
      const em = String(row[eci] || '');
      if (!em.includes('@')) return;
      emails.push({
        to: em,
        subject: _mergeText(subj, row),
        text: _mergeText(body, row),
        attachments: [],
      });
    });

    if (!emails.length) return toast('Keine gültigen E-Mail-Adressen');

    // Init status
    S.emailStatus = emails.map((e, i) => ({ index: i, to: e.to, status: 'pending' }));
    renderBatchProgress();

    // SSE to backend
    try {
      const res = await fetch('/api/email/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: S.smtpCfg, emails }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.done) {
              toast(`${ev.sent} gesendet, ${ev.failed} Fehler`);
              addDashActivity('📧', `${ev.sent} E-Mails versendet`);
            } else if (ev.index !== undefined) {
              updateEmailStatus(ev.index, ev.status, ev.error);
            }
          } catch {}
        }
      }
    } catch (e) {
      toast('Sendefehler: ' + e.message);
    }
  });
}

export function updateEmailStatus(idx, status, error) {
  if (S.emailStatus[idx]) {
    S.emailStatus[idx].status = status;
    if (error) S.emailStatus[idx].error = error;
  }
  renderBatchProgress();
}

export function renderBatchProgress() {
  const el = $('sem-batch-progress');
  if (!el || !S.emailStatus.length) { if (el) el.style.display = 'none'; return; }
  el.style.display = '';

  const total = S.emailStatus.length;
  const sent = S.emailStatus.filter(e => e.status === 'sent').length;
  const failed = S.emailStatus.filter(e => e.status === 'error').length;
  const pct = Math.round(((sent + failed) / total) * 100);

  const badgeClass = (s) => s === 'sent' ? 'es-sent' : s === 'sending' ? 'es-sending' : s === 'error' ? 'es-error' : 'es-pending';
  const badgeLabel = (s) => s === 'sent' ? 'Gesendet' : s === 'sending' ? 'Sende...' : s === 'error' ? 'Fehler' : 'Warten';

  el.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font:500 11px var(--mono);color:var(--tx2);margin-bottom:4px">
        <span>${sent + failed} / ${total}</span>
        <span>${sent} gesendet${failed ? `, ${failed} Fehler` : ''}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${failed ? 'var(--ora)' : 'var(--grn)'}"></div></div>
    </div>
    <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:3px">
      ${S.emailStatus.map(e => `<div style="display:flex;align-items:center;gap:6px;font:11px var(--mono);color:var(--tx2)">
        <span class="es-badge ${badgeClass(e.status)}">${badgeLabel(e.status)}</span>
        <span>${H(e.to)}</span>
        ${e.error ? `<span style="color:var(--red);font-size:10px">${H(e.error)}</span>` : ''}
      </div>`).join('')}
    </div>`;
}
