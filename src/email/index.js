import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, A } from '../nav.js';

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
