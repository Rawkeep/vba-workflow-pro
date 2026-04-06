import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';
// TODO: import pushUndo from '...' (not yet extracted)
// TODO: import showX from '../excel/export.js' (circular)
// TODO: import XR from '../excel/export.js' (circular)

// ══════ SELECT CASE ══════
export function csAddRow(){const d=$('cs-rows');const div=document.createElement('div');div.className='case-row';div.innerHTML=`<span class="case-kw" style="color:var(--pk)">Case</span><input type="text" placeholder="Wert" style="width:120px" class="cs-val"><span class="case-arrow">→</span><input type="text" placeholder="Dann" style="width:150px" class="cs-res"><button class="b bo bs" onclick="this.closest('.case-row').remove()">✕</button>`;d.appendChild(div)}
export function csAddNew(){const n=prompt('Neue Spalte:');if(!n)return;if(S.xH.includes(n)){toast('⚠ Spalte "'+n+'" existiert bereits');$('cs-tgt').value=n;return}S.xH.push(n);S.xD.forEach(r=>r.push(''));showX();XR();$('cs-tgt').value=n}
export function CS_RUN(){
  const src=$('cs-src').value,tgt=$('cs-tgt').value,elseVal=$('cs-else').value;
  if(!src||!tgt){toast('Spalten wählen');return}
  const si=S.xH.indexOf(src),ti=S.xH.indexOf(tgt);if(si===-1||ti===-1)return;
  pushUndo();const cases=[];document.querySelectorAll('#cs-rows .case-row').forEach(row=>{
    const v=row.querySelector('.cs-val').value,r=row.querySelector('.cs-res').value;if(v&&r)cases.push({v,r})});
  let count=0;
  S.xD.forEach(row=>{
    const val=String(row[si]??'');
    let matched=false;
    for(const c of cases){
      // Support range operators
      if(c.v.startsWith('>=')){const n=parseFloat(c.v.slice(2)),rv=parseFloat(val);if(!isNaN(rv)&&rv>=n){row[ti]=c.r;matched=true;count++;break}}
      else if(c.v.startsWith('<=')){const n=parseFloat(c.v.slice(2)),rv=parseFloat(val);if(!isNaN(rv)&&rv<=n){row[ti]=c.r;matched=true;count++;break}}
      else if(c.v.startsWith('>')){const n=parseFloat(c.v.slice(1)),rv=parseFloat(val);if(!isNaN(rv)&&rv>n){row[ti]=c.r;matched=true;count++;break}}
      else if(c.v.startsWith('<')){const n=parseFloat(c.v.slice(1)),rv=parseFloat(val);if(!isNaN(rv)&&rv<n){row[ti]=c.r;matched=true;count++;break}}
      else if(val===c.v){row[ti]=c.r;matched=true;count++;break}
    }
    if(!matched&&elseVal){row[ti]=elseVal;count++}
  });
  XR();$('cs-result').innerHTML=`<span class="tg tg-g">${count} Zeilen</span>`;
  L('CASE',`${src}→${tgt} (${cases.length} Cases, ${count}×)`);toast(count+' ✓');macLog('case',{src,tgt,cases,elseVal});
}
export function CS_SAVE(){
  const src=$('cs-src').value,tgt=$('cs-tgt').value,elseVal=$('cs-else').value;
  const cases=[];document.querySelectorAll('#cs-rows .case-row').forEach(row=>{
    const v=row.querySelector('.cs-val').value,r=row.querySelector('.cs-res').value;if(v)cases.push({v,r})});
  if(!src||!cases.length)return;
  S.savedCases.push({src,tgt,cases,elseVal,name:`CASE ${src}→${tgt}`});renderSavedCases();toast('Case gespeichert ✓');
}
export function renderSavedCases(){if(!S.savedCases.length){$('cs-saved').innerHTML='';return}
$('cs-saved').innerHTML=S.savedCases.map((c,i)=>`<div class="rule-card"><span class="tg tg-pk">CASE</span><span class="rt">${H(c.src)}→${H(c.tgt)}: ${c.cases.map(x=>x.v+'→'+x.r).join(', ')}${c.elseVal?' | Else→'+c.elseVal:''}</span><button class="b bpk bs" onclick="runSavedCase(${i})">▶</button><button class="b bo bs" onclick="S.savedCases.splice(${i},1);renderSavedCases()">✕</button></div>`).join('')}
export function runSavedCase(i){const c=S.savedCases[i];const si=S.xH.indexOf(c.src),ti=S.xH.indexOf(c.tgt);if(si===-1||ti===-1)return;pushUndo();let n=0;S.xD.forEach(row=>{const val=String(row[si]??'');let m=false;for(const cs of c.cases){if(cs.v.startsWith('>=')){if(parseFloat(val)>=parseFloat(cs.v.slice(2))){row[ti]=cs.r;m=true;n++;break}}else if(cs.v.startsWith('>')){if(parseFloat(val)>parseFloat(cs.v.slice(1))){row[ti]=cs.r;m=true;n++;break}}else if(cs.v.startsWith('<=')){if(parseFloat(val)<=parseFloat(cs.v.slice(2))){row[ti]=cs.r;m=true;n++;break}}else if(cs.v.startsWith('<')){if(parseFloat(val)<parseFloat(cs.v.slice(1))){row[ti]=cs.r;m=true;n++;break}}else if(val===cs.v){row[ti]=cs.r;m=true;n++;break}}if(!m&&c.elseVal){row[ti]=c.elseVal;n++}});XR();toast(n+' ✓');macLog('case',c)}
