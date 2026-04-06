import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';
// TODO: import pushUndo from '...' (not yet extracted)
// TODO: import showX from '../excel/export.js' (circular)
// TODO: import XR from '../excel/export.js' (circular)

// ══════ IF/ELSEIF/ELSE ══════
export function ieAddElseIf(){const d=$('ie-chain');const div=document.createElement('div');div.className='ie-block';div.dataset.type='elseif';div.innerHTML=`<div class="row" style="padding:6px 0;border-bottom:1px solid var(--bdr)"><span class="case-kw" style="color:var(--ora)">ElseIf</span><select class="ie-col" style="width:110px">${colOpts()}</select><select class="ie-op" style="width:60px"><option>=</option><option>≠</option><option>></option><option><</option><option>>=</option><option><=</option><option>enthält</option><option>leer</option><option>nicht leer</option></select><input type="text" class="ie-val" placeholder="Wert" style="width:100px"><button class="b bo bs" onclick="ieAddCond(this)">+AND/OR</button><span class="case-arrow">→</span><input type="text" class="ie-res" placeholder="Dann" style="width:120px"><button class="b bo bs" onclick="this.closest('.ie-block').remove()">✕</button></div>`;d.appendChild(div)}
export function ieAddCond(btn){const row=btn.closest('.row');const extra=document.createElement('span');extra.className='ie-extra';extra.innerHTML=` <select class="ie-logic" style="width:55px"><option>AND</option><option>OR</option></select> <select class="ie-col" style="width:110px">${colOpts()}</select> <select class="ie-op" style="width:60px"><option>=</option><option>≠</option><option>></option><option><</option><option>>=</option><option><=</option><option>enthält</option></select> <input type="text" class="ie-val" placeholder="Wert" style="width:90px">`;row.insertBefore(extra,btn)}
export function ieAddNew(){const n=prompt('Neue Spalte:');if(!n)return;if(S.xH.includes(n)){toast('⚠ Spalte "'+n+'" existiert bereits');$('ie-tgt').value=n;return}S.xH.push(n);S.xD.forEach(r=>r.push(''));showX();XR();$('ie-tgt').value=n}
export function evalCond(row,col,op,val){const ci=S.xH.indexOf(col);if(ci===-1)return false;const c=String(row[ci]??''),n=parseFloat(c),nv=parseFloat(val);switch(op){case'=':return c===val;case'≠':return c!==val;case'>':return!isNaN(n)&&n>nv;case'<':return!isNaN(n)&&n<nv;case'>=':return!isNaN(n)&&n>=nv;case'<=':return!isNaN(n)&&n<=nv;case'enthält':return c.toLowerCase().includes(val.toLowerCase());case'leer':return!c.trim();case'nicht leer':return!!c.trim()}return false}
export function evalBlock(row,block){
  const conds=[];const cols=block.querySelectorAll('.ie-col');const ops=block.querySelectorAll('.ie-op');const vals=block.querySelectorAll('.ie-val');const logics=block.querySelectorAll('.ie-logic');
  for(let i=0;i<cols.length;i++){conds.push({col:cols[i].value,op:ops[i].value,val:vals[i].value,logic:i>0&&logics.length>=i?logics[i-1].value:''})}
  if(!conds.length)return false;
  let result=evalCond(row,conds[0].col,conds[0].op,conds[0].val);
  for(let i=1;i<conds.length;i++){const r=evalCond(row,conds[i].col,conds[i].op,conds[i].val);result=conds[i].logic==='AND'?result&&r:result||r}
  return result;
}
export function IE_RUN(){
  const tgt=$('ie-tgt').value,elseVal=$('ie-else').value;if(!tgt){toast('Zielspalte?');return}
  const ti=S.xH.indexOf(tgt);if(ti===-1)return;
  pushUndo();const blocks=[...document.querySelectorAll('#ie-chain .ie-block')];let count=0;
  S.xD.forEach(row=>{
    let matched=false;
    for(const block of blocks){if(evalBlock(row,block)){row[ti]=block.querySelector('.ie-res').value;matched=true;count++;break}}
    if(!matched&&elseVal){row[ti]=elseVal;count++}
  });
  XR();$('ie-result').innerHTML=`<span class="tg tg-g">${count} Zeilen</span>`;
  L('IF/ELSE',`→${tgt} (${count}×)`);toast(count+' ✓');
}
export function IE_SAVE(){
  const tgt=$('ie-tgt').value,elseVal=$('ie-else').value;if(!tgt)return;
  const blocks=[...document.querySelectorAll('#ie-chain .ie-block')].map(b=>{
    const res=b.querySelector('.ie-res').value;const conds=[];
    const cols=b.querySelectorAll('.ie-col'),ops=b.querySelectorAll('.ie-op'),vals=b.querySelectorAll('.ie-val'),logics=b.querySelectorAll('.ie-logic');
    for(let i=0;i<cols.length;i++)conds.push({col:cols[i].value,op:ops[i].value,val:vals[i].value,logic:i>0&&logics[i-1]?logics[i-1].value:''});
    return{conds,res,type:b.dataset.type};
  });
  S.savedIE.push({tgt,elseVal,blocks,name:`IF→${tgt}`});renderSavedIE();toast('IF/ELSE gespeichert ✓');
}
export function renderSavedIE(){if(!S.savedIE.length){$('ie-saved').innerHTML='';return}
$('ie-saved').innerHTML=S.savedIE.map((ie,i)=>`<div class="rule-card"><span class="tg tg-o">IF/ELSE</span><span class="rt">→${H(ie.tgt)}: ${ie.blocks.length} Bedingungen${ie.elseVal?' | Else→'+H(ie.elseVal):''}</span><button class="b bora bs" onclick="runSavedIE(${i})">▶</button><button class="b bo bs" onclick="S.savedIE.splice(${i},1);renderSavedIE()">✕</button></div>`).join('')}
export function runSavedIE(idx){const ie=S.savedIE[idx];const ti=S.xH.indexOf(ie.tgt);if(ti===-1)return;pushUndo();let n=0;
S.xD.forEach(row=>{let matched=false;for(const b of ie.blocks){let r=evalCond(row,b.conds[0].col,b.conds[0].op,b.conds[0].val);for(let j=1;j<b.conds.length;j++){const c=b.conds[j],v=evalCond(row,c.col,c.op,c.val);r=c.logic==='AND'?r&&v:r||v}if(r){row[ti]=b.res;matched=true;n++;break}}if(!matched&&ie.elseVal){row[ti]=ie.elseVal;n++}});
XR();toast(n+' ✓');macLog('ifelse',ie)}
