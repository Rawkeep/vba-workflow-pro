// ══════ COLUMN OPERATIONS ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, showX, toast, L, H, A are cross-module dependencies from core
// TODO: pushUndo is from ./undo-redo.js
// TODO: showCtxAt, hideCtx are from ./context-menu.js
// TODO: sortByClick is from ./cells.js

export function XDC(ci){if(ci<0||ci>=S.xH.length)return;window.pushUndo();const name=S.xH[ci];S.xH.splice(ci,1);S.xD.forEach(r=>r.splice(ci,1));S.hiddenCols.delete(ci);const nh=new Set();S.hiddenCols.forEach(h=>{nh.add(h>ci?h-1:h)});S.hiddenCols=nh;window.showX();window.XR();window.L('Spalte gelöscht',name);window.toast(`Spalte "${name}" gelöscht`)}
export function XRenC(ci){const old=S.xH[ci];const n=prompt(`Spalte "${old}" umbenennen:`,old);if(!n||n===old)return;window.pushUndo();S.xH[ci]=n;window.showX();window.XR();window.L('Spalte umbenannt',`${old}→${n}`);window.toast(`"${old}" → "${n}"`)}
export function XHideC(ci){S.hiddenCols.add(ci);window.XR();updateHiddenBadge();window.toast(`"${S.xH[ci]}" ausgeblendet`)}
export function XShowC(ci){S.hiddenCols.delete(ci);window.XR();updateHiddenBadge()}
export function XShowAllC(){S.hiddenCols.clear();window.XR();updateHiddenBadge();window.toast('Alle Spalten sichtbar')}
export function updateHiddenBadge(){const b=$('x-hidden-badge');if(!b)return;if(S.hiddenCols.size>0){b.style.display='';b.textContent=`${S.hiddenCols.size} ausgeblendet`;} else{b.style.display='none'}}
export function showHiddenCols(ev){const items=[...S.hiddenCols].map(ci=>`<div class="ctx-item" onclick="XShowC(${ci});hideCtx()">${S.xH[ci]}</div>`).join('');window.showCtxAt(ev,`<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">Ausgeblendete Spalten</div><div class="ctx-sep"></div>${items}<div class="ctx-sep"></div><div class="ctx-item" onclick="XShowAllC();hideCtx()">Alle einblenden</div>`)}
export function XMoveC(ci,dir){const ni=ci+dir;if(ni<0||ni>=S.xH.length)return;window.pushUndo();[S.xH[ci],S.xH[ni]]=[S.xH[ni],S.xH[ci]];S.xD.forEach(r=>{[r[ci],r[ni]]=[r[ni],r[ci]]});window.XR();window.toast('Spalte verschoben')}
export function showColPicker(ev,action){
  if(action==='delete'){
    // Multi-select column delete
    let html='<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">Spalten löschen (mehrere wählbar)</div><div class="ctx-sep"></div>';
    html+='<div id="col-del-checks" style="max-height:260px;overflow-y:auto">';
    S.xH.forEach((h,i)=>{
      html+=`<div class="ctx-item" style="padding:5px 14px" onclick="event.stopPropagation();this.querySelector('input').checked=!this.querySelector('input').checked;_updateDelCount()"><input type="checkbox" data-ci="${i}" style="accent-color:var(--red);pointer-events:none;margin-right:6px">${window.H(h)}</div>`;
    });
    html+='</div><div class="ctx-sep"></div>';
    html+='<div class="ctx-item" style="padding:4px 14px"><label style="font:10px var(--mono);color:var(--tx3);cursor:pointer" onclick="event.stopPropagation();_toggleAllDelCols()"><input type="checkbox" id="col-del-all" style="accent-color:var(--acc);margin-right:4px;pointer-events:none">Alle auswählen</label></div>';
    html+='<div class="ctx-item danger" id="col-del-go" onclick="_deleteCheckedCols()" style="justify-content:center;font-weight:600;opacity:.5;pointer-events:none">✕ 0 Spalten löschen</div>';
    window.showCtxAt(ev,html);
    return;
  }
  const items=S.xH.map((h,i)=>{if(action==='hide'&&S.hiddenCols.has(i))return'';let onclick='';if(action==='rename')onclick=`XRenC(${i})`;else if(action==='hide')onclick=`XHideC(${i})`;return`<div class="ctx-item" onclick="${onclick};hideCtx()">${window.H(h)}</div>`}).join('');
  const label=action==='rename'?'Spalte umbenennen':'Spalte ausblenden';
  window.showCtxAt(ev,`<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">${label}</div><div class="ctx-sep"></div>${items}`);
}
export function _updateDelCount(){
  const checks=document.querySelectorAll('#col-del-checks input[type=checkbox]:checked');
  const btn=document.getElementById('col-del-go');
  if(btn){btn.textContent=`✕ ${checks.length} Spalte${checks.length!==1?'n':''} löschen`;btn.style.opacity=checks.length?'1':'.5';btn.style.pointerEvents=checks.length?'auto':'none'}
}
export function _toggleAllDelCols(){
  const all=document.getElementById('col-del-all');
  const checked=!all.checked;
  all.checked=checked;
  document.querySelectorAll('#col-del-checks input[type=checkbox]').forEach(cb=>cb.checked=checked);
  _updateDelCount();
}
export function _deleteCheckedCols(){
  const checks=document.querySelectorAll('#col-del-checks input[type=checkbox]:checked');
  const indices=[...checks].map(cb=>parseInt(cb.dataset.ci)).sort((a,b)=>b-a);
  if(!indices.length)return;
  if(!confirm(`${indices.length} Spalte(n) unwiderruflich löschen?`))return;
  window.pushUndo();
  indices.forEach(ci=>{S.xH.splice(ci,1);S.xD.forEach(r=>r.splice(ci,1))});
  // Rebuild hiddenCols
  const nh=new Set();
  S.hiddenCols.forEach(h=>{let adj=h;indices.forEach(di=>{if(h>di)adj--});if(adj>=0&&!indices.includes(h))nh.add(adj)});
  S.hiddenCols=nh;
  window.showX();window.XR();window.hideCtx();
  window.L('Spalten gelöscht',indices.length+'');
  window.toast(indices.length+' Spalten gelöscht');
}

// ══════ COLUMN RESIZE ══════
export function startResize(ev,ci){ev.preventDefault();ev.stopPropagation();const th=ev.target.parentElement;const startX=ev.clientX,startW=th.offsetWidth;const onMove=e=>{th.style.width=Math.max(40,startW+(e.clientX-startX))+'px';th.style.minWidth=th.style.width};const onUp=()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp)};document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp)}

// ══════ COLUMN STATISTICS ══════
export function colStats(ci){
  const vals=S.xD.map(r=>r[ci]).filter(v=>v!==''&&v!=null);
  const nums=vals.map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  const unique=new Set(vals);
  const empty=S.xD.filter(r=>!r[ci]||!String(r[ci]).trim()).length;
  let html=`<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">📊 ${window.H(S.xH[ci])}</div><div class="ctx-sep"></div>`;
  html+=`<div class="ctx-item" style="pointer-events:none;color:var(--tx2)">Werte: ${vals.length} · Leer: ${empty} · Unique: ${unique.size}</div>`;
  if(nums.length){
    const sum=nums.reduce((a,b)=>a+b,0);
    const avg=sum/nums.length;
    const min=Math.min(...nums);
    const max=Math.max(...nums);
    nums.sort((a,b)=>a-b);const mid=Math.floor(nums.length/2);
    const median=nums.length%2?nums[mid]:(nums[mid-1]+nums[mid])/2;
    html+=`<div class="ctx-item" style="pointer-events:none;color:var(--tx2)">Summe: <span style="color:var(--acc)">${sum.toLocaleString('de-DE',{maximumFractionDigits:2})}</span></div>`;
    html+=`<div class="ctx-item" style="pointer-events:none;color:var(--tx2)">Ø: <span style="color:var(--acc)">${avg.toLocaleString('de-DE',{maximumFractionDigits:2})}</span> · Median: <span style="color:var(--acc)">${median.toLocaleString('de-DE',{maximumFractionDigits:2})}</span></div>`;
    html+=`<div class="ctx-item" style="pointer-events:none;color:var(--tx2)">Min: <span style="color:var(--grn)">${min.toLocaleString('de-DE')}</span> · Max: <span style="color:var(--red)">${max.toLocaleString('de-DE')}</span></div>`;
  }else{
    // Show top 5 values
    const freq={};vals.forEach(v=>{freq[v]=(freq[v]||0)+1});
    const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5);
    html+=`<div class="ctx-sep"></div>`;
    top.forEach(([v,c])=>{html+=`<div class="ctx-item" style="pointer-events:none;color:var(--tx2)">${window.H(v)} <span style="color:var(--acc)">(${c}×)</span></div>`});
  }
  return html;
}

// Update header context menu to include stats
export function initColStatsOverride() {
  const _origCtxHeader=window.ctxHeader;
  window.ctxHeader=function(ev,ci){
    ev.preventDefault();ev.stopPropagation();
    const h=S.xH[ci];
    const stats=colStats(ci);
    window.showCtxAt(ev,`<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">${window.H(h)}</div><div class="ctx-sep"></div><div class="ctx-item" onclick="sortByClick(${ci});hideCtx()">Sortieren A→Z / Z→A</div><div class="ctx-item" onclick="XRenC(${ci});hideCtx()">✏ Umbenennen</div><div class="ctx-item" onclick="XHideC(${ci});hideCtx()">👁 Ausblenden</div><div class="ctx-item" onclick="XMoveC(${ci},-1);hideCtx()">← Nach links</div><div class="ctx-item" onclick="XMoveC(${ci},1);hideCtx()">→ Nach rechts</div><div class="ctx-sep"></div>${stats}<div class="ctx-sep"></div><div class="ctx-item danger" onclick="XDC(${ci});hideCtx()">✕ Spalte löschen</div>`);
  };
}
