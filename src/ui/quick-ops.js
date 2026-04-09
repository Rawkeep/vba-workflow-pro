// ══════ SCHNELL-AKTIONEN (Quick Ops) ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, toast, L, showX, H are cross-module dependencies from core
// TODO: pushUndo is from ./undo-redo.js

export function qopTrimAll(){
  window.pushUndo();let c=0;
  S.xD.forEach(r=>r.forEach((v,i)=>{const s=String(v??'');const t=s.trim().replace(/\s+/g,' ');if(t!==s){r[i]=t;c++}}));
  window.XR();window.toast(`✂ ${c} Zellen getrimmt`);window.L('Trim','Alle Zellen')
}
export function qopRemoveEmpty(){
  // Count first to show in confirm
  const empties=S.xD.filter(r=>!r.some(v=>String(v??'').trim()!=='')).length;
  if(!empties){window.toast('Keine leeren Zeilen','info');return}
  window.confirmAction(`${empties} leere Zeilen löschen?`,()=>{
    window.pushUndo();S.xD=S.xD.filter(r=>r.some(v=>String(v??'').trim()!==''));
    window.XR();window.toast(`🗑 ${empties} leere Zeilen entfernt`);window.L('Leere Zeilen',empties+'')
  })
}
export function qopRemoveDupes(){
  if(!S.xH.length)return;
  const seen=new Set();const dupeCount=S.xD.filter(r=>{const k=String(r[0]??'');if(seen.has(k))return true;seen.add(k);return false}).length;
  if(!dupeCount){window.toast('Keine Duplikate','info');return}
  window.confirmAction(`${dupeCount} Duplikate entfernen (nach ${S.xH[0]})?`,()=>{
    window.pushUndo();const seen2=new Set();
    S.xD=S.xD.filter(r=>{const k=String(r[0]??'');if(seen2.has(k))return false;seen2.add(k);return true});
    window.XR();window.toast(`♻ ${dupeCount} Duplikate entfernt`);window.L('Duplikate',dupeCount+'')
  })
}
export function qopFillMissing(){
  window.pushUndo();let c=0;
  S.xD.forEach(r=>r.forEach((v,i)=>{if(!String(v??'').trim()){r[i]='—';c++}}));
  window.XR();window.toast(`📝 ${c} Lücken gefüllt`);window.L('Lücken füllen',c+'')
}
export function qopAutoFormat(){
  window.pushUndo();let c=0;
  S.xD.forEach(r=>r.forEach((v,i)=>{
    const s=String(v??'').trim();
    // Try number
    const n=Number(s.replace(/,/g,'.'));
    if(s&&!isNaN(n)&&isFinite(n)){r[i]=n;c++;return}
    // Try date
    const dm=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if(dm){const y=dm[3].length===2?'20'+dm[3]:dm[3];r[i]=`${dm[1].padStart(2,'0')}.${dm[2].padStart(2,'0')}.${y}`;c++}
  }));
  window.XR();window.toast(`🔄 ${c} Zellen formatiert`);window.L('Auto-Format',c+'')
}
export function qopSortAZ(){
  if(!S.xH.length)return;window.pushUndo();
  S.xD.sort((a,b)=>String(a[0]??'').localeCompare(String(b[0]??'')));
  S.selectedRows.clear();window.XR();window.toast(`↕ Sortiert nach ${S.xH[0]}`);window.L('Sort',S.xH[0])
}
export function qopUpperHeaders(){
  window.pushUndo();
  S.xH=S.xH.map(h=>h.toUpperCase());
  window.showX();window.XR();window.toast('🔠 Header in GROSSBUCHSTABEN');window.L('Header','UPPER')
}
export function qopStats(){
  if(!S.xD.length)return;
  let html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">';
  S.xH.forEach((h,ci)=>{
    const vals=S.xD.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v));
    if(vals.length<2)return;
    const sum=vals.reduce((a,b)=>a+b,0);
    const avg=sum/vals.length;
    const min=Math.min(...vals);
    const max=Math.max(...vals);
    const fmt=v=>v.toLocaleString('de-DE',{maximumFractionDigits:2});
    html+=`<div style="background:var(--s2);border-radius:8px;padding:8px 10px;border:1px solid var(--bdr)"><div style="font:600 10px var(--mono);color:var(--acc);margin-bottom:4px">${window.H(h)}</div><div style="font:10px var(--mono);color:var(--tx2);line-height:1.7">Σ ${fmt(sum)}<br>Ø ${fmt(avg)}<br>Min ${fmt(min)}<br>Max ${fmt(max)}<br>n=${vals.length}</div></div>`;
  });
  html+='</div>';
  // Show in a modal-like overlay
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;display:flex;justify-content:center;align-items:center';
  ov.onclick=e=>{if(e.target===ov)ov.remove()};
  ov.innerHTML=`<div style="background:var(--s1);border:1px solid var(--bdr);border-radius:16px;padding:20px 24px;max-width:700px;width:90%;max-height:80vh;overflow-y:auto"><h3 style="color:var(--acc);margin-bottom:12px">📊 Statistik-Übersicht</h3>${html}<div style="text-align:center;margin-top:14px"><button class="b bo" onclick="this.closest('div[style*=fixed]').remove()">Schließen</button></div></div>`;
  document.body.appendChild(ov);
  window.L('Statistik','Übersicht')
}
