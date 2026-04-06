import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, L, colOpts, macLog } from '../nav.js';
// TODO: import pushUndo, showX, XR from excel core module (not yet extracted)

// ══════ SWITCH (Multi-Column) ══════
export function swAddRule(){const d=$('sw-rows');const div=document.createElement('div');div.className='sw-rule';div.innerHTML=`<div class="row" style="padding:6px 0;border-bottom:1px solid var(--bdr)"><span class="case-kw" style="color:var(--cyn)">WENN</span><select class="sw-col1" style="width:100px">${colOpts()}</select><select class="sw-op1" style="width:50px"><option>=</option><option>≠</option><option>></option><option><</option><option>enthält</option></select><input type="text" class="sw-val1" placeholder="Wert" style="width:70px"><select class="sw-logic" style="width:50px"><option>AND</option><option>OR</option></select><select class="sw-col2" style="width:100px">${colOpts()}</select><select class="sw-op2" style="width:50px"><option>=</option><option>≠</option><option>></option><option><</option><option>enthält</option></select><input type="text" class="sw-val2" placeholder="Wert" style="width:70px"><span class="case-arrow">→</span><input type="text" class="sw-res" placeholder="Dann" style="width:90px"><button class="b bo bs" onclick="this.closest('.sw-rule').remove()">✕</button></div>`;d.appendChild(div)}
export function swAddNew(){const n=prompt('Neue Spalte:');if(!n)return;if(S.xH.includes(n)){toast('⚠ Spalte "'+n+'" existiert bereits');$('sw-tgt').value=n;return}S.xH.push(n);S.xD.forEach(r=>r.push(''));showX();XR();$('sw-tgt').value=n}
export function swEvalCond(row,col,op,val){const ci=S.xH.indexOf(col);if(ci===-1)return false;const c=String(row[ci]??''),n=parseFloat(c),nv=parseFloat(val);switch(op){case'=':return c===val;case'≠':return c!==val;case'>':return!isNaN(n)&&n>nv;case'<':return!isNaN(n)&&n<nv;case'enthält':return c.toLowerCase().includes(val.toLowerCase())}return false}
export function SW_RUN(){
  const tgt=$('sw-tgt').value,elseVal=$('sw-else').value;if(!tgt){toast('Zielspalte?');return}
  const ti=S.xH.indexOf(tgt);if(ti===-1)return;pushUndo();
  const rules=[...document.querySelectorAll('#sw-rows .sw-rule')].map(r=>({
    col1:r.querySelector('.sw-col1').value,op1:r.querySelector('.sw-op1').value,val1:r.querySelector('.sw-val1').value,
    logic:r.querySelector('.sw-logic').value,
    col2:r.querySelector('.sw-col2').value,op2:r.querySelector('.sw-op2').value,val2:r.querySelector('.sw-val2').value,
    res:r.querySelector('.sw-res').value
  }));
  let count=0;
  S.xD.forEach(row=>{let matched=false;
    for(const r of rules){
      const c1=swEvalCond(row,r.col1,r.op1,r.val1);
      const c2=r.col2?swEvalCond(row,r.col2,r.op2,r.val2):true;
      const pass=r.logic==='AND'?c1&&c2:c1||c2;
      if(pass){row[ti]=r.res;matched=true;count++;break}
    }
    if(!matched&&elseVal){row[ti]=elseVal;count++}
  });
  XR();$('sw-result').innerHTML=`<span class="tg tg-g">${count} Zeilen</span>`;
  L('SWITCH',`→${tgt} (${count}×)`);toast(count+' ✓');macLog('switch',{tgt,rules,elseVal});
}
export function SW_SAVE(){
  const tgt=$('sw-tgt').value,elseVal=$('sw-else').value;
  const rules=[...document.querySelectorAll('#sw-rows .sw-rule')].map(r=>({col1:r.querySelector('.sw-col1').value,op1:r.querySelector('.sw-op1').value,val1:r.querySelector('.sw-val1').value,logic:r.querySelector('.sw-logic').value,col2:r.querySelector('.sw-col2').value,op2:r.querySelector('.sw-op2').value,val2:r.querySelector('.sw-val2').value,res:r.querySelector('.sw-res').value}));
  if(!tgt||!rules.length)return;
  S.savedSW.push({tgt,elseVal,rules,name:`SW→${tgt}`});renderSavedSW();toast('SWITCH gespeichert ✓');
}
export function renderSavedSW(){if(!S.savedSW.length){$('sw-saved').innerHTML='';return}
$('sw-saved').innerHTML=S.savedSW.map((s,i)=>`<div class="rule-card"><span class="tg tg-c">SWITCH</span><span class="rt">→${H(s.tgt)}: ${s.rules.length} Regeln</span><button class="b bcyn bs" onclick="runSavedSW(${i})">▶</button><button class="b bo bs" onclick="S.savedSW.splice(${i},1);renderSavedSW()">✕</button></div>`).join('')}
export function runSavedSW(idx){const s=S.savedSW[idx];const ti=S.xH.indexOf(s.tgt);if(ti===-1)return;pushUndo();let n=0;
S.xD.forEach(row=>{let matched=false;for(const r of s.rules){const c1=swEvalCond(row,r.col1,r.op1,r.val1),c2=r.col2?swEvalCond(row,r.col2,r.op2,r.val2):true;if(r.logic==='AND'?c1&&c2:c1||c2){row[ti]=r.res;matched=true;n++;break}}if(!matched&&s.elseVal){row[ti]=s.elseVal;n++}});
XR();toast(n+' ✓')}
