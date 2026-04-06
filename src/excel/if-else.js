import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';

// ══════ IF/ELSEIF/ELSE (Enhanced) ══════

function _ieOpOpts(){
  return ['=','≠','>','<','>=','<=','enthält','beginnt','endet','leer','nicht leer','zwischen'].map(o=>`<option value="${o}">${o}</option>`).join('');
}

// Evaluate a single condition
export function evalCond(row,col,op,val,val2){
  const ci=S.xH.indexOf(col);if(ci===-1)return false;
  const c=String(row[ci]??''),n=parseFloat(c),nv=parseFloat(val);
  switch(op){
    case'=':return c===val;case'≠':return c!==val;
    case'>':return!isNaN(n)&&n>nv;case'<':return!isNaN(n)&&n<nv;
    case'>=':return!isNaN(n)&&n>=nv;case'<=':return!isNaN(n)&&n<=nv;
    case'enthält':return c.toLowerCase().includes(val.toLowerCase());
    case'beginnt':return c.toLowerCase().startsWith(val.toLowerCase());
    case'endet':return c.toLowerCase().endsWith(val.toLowerCase());
    case'leer':return!c.trim();case'nicht leer':return!!c.trim();
    case'zwischen':{const nv2=parseFloat(val2);return!isNaN(n)&&n>=nv&&n<=nv2}
  }
  return false;
}

// Resolve {Spaltenname} references in result string
function _ieResolve(row,str){
  return str.replace(/\{([^}]+)\}/g,(_,name)=>{
    const ci=S.xH.indexOf(name);
    return ci!==-1?String(row[ci]??''):`{${name}}`;
  });
}

// Build a condition HTML snippet
function _ieCondHTML(isFirst){
  return `<div class="ie-cond" style="display:inline-flex;align-items:center;gap:4px;margin:2px 0">${
    isFirst?''
    :'<select class="ie-logic" style="width:50px;font-size:10px"><option>AND</option><option>OR</option></select>'
  }<select class="ie-col" style="width:100px">${colOpts()}</select><select class="ie-op" style="width:70px">${_ieOpOpts()}</select><input type="text" class="ie-val" placeholder="Wert" style="width:90px"><input type="text" class="ie-val2" placeholder="bis" style="width:55px;display:none"><button class="b bo bs" style="font-size:9px;padding:2px 5px" onclick="this.closest('.ie-cond').remove()">✕</button></div>`;
}

function _ieBindOpChange(container){
  container.querySelectorAll('.ie-op').forEach(s=>{
    s.addEventListener('change',function(){
      const v2=this.closest('.ie-cond').querySelector('.ie-val2');
      if(v2) v2.style.display=this.value==='zwischen'?'':'none';
    });
  });
}

export function ieAddElseIf(){
  const d=$('ie-chain');
  const div=document.createElement('div');
  div.className='ie-block';div.dataset.type='elseif';
  div.style.cssText='padding:8px;margin:4px 0;background:rgba(247,159,31,.04);border:1px solid rgba(247,159,31,.15);border-radius:6px';
  div.innerHTML=`<div class="ie-conds">${_ieCondHTML(true)}</div><div style="display:flex;align-items:center;gap:6px;margin-top:4px"><button class="b bo bs" style="font-size:9px" onclick="ieAddCond(this.closest('.ie-block'))">+ Bedingung</button><span class="case-arrow" style="color:var(--ora)">→</span><span style="font:600 10px var(--mono);color:var(--tx2)">in</span><select class="ie-rule-tgt" style="width:100px">${colOpts()}</select><span style="font:600 10px var(--mono);color:var(--tx2)">schreibe</span><input type="text" class="ie-res" placeholder="Wert oder {Spalte}" style="width:130px"><button class="b bo bs" onclick="this.closest('.ie-block').remove()">✕</button></div>`;
  d.appendChild(div);
  _ieBindOpChange(div);
  // Sync default target
  const globalTgt=$('ie-tgt');
  if(globalTgt&&globalTgt.value) div.querySelector('.ie-rule-tgt').value=globalTgt.value;
}

export function ieAddCond(blockDiv){
  const c=blockDiv.querySelector('.ie-conds');
  const tmp=document.createElement('div');
  tmp.innerHTML=_ieCondHTML(false);
  const cond=tmp.firstElementChild;
  c.appendChild(cond);
  _ieBindOpChange(cond);
}

export function ieSyncTargets(){
  const v=$('ie-tgt').value;
  document.querySelectorAll('#ie-chain .ie-rule-tgt').forEach(sel=>sel.value=v);
}

export function ieAddNew(){
  const n=prompt('Neue Spalte:');if(!n)return;
  if(S.xH.includes(n)){toast('⚠ Spalte "'+n+'" existiert bereits');$('ie-tgt').value=n;return}
  S.xH.push(n);S.xD.forEach(r=>r.push(''));window.showX();window.XR();$('ie-tgt').value=n;
}

// Parse block conditions from DOM
function _ieParseBlock(blockDiv){
  const conds=[...blockDiv.querySelectorAll('.ie-cond')].map((c,i)=>({
    logic: i===0?'AND':(c.querySelector('.ie-logic')?.value||'AND'),
    col: c.querySelector('.ie-col').value,
    op: c.querySelector('.ie-op').value,
    val: c.querySelector('.ie-val').value,
    val2: c.querySelector('.ie-val2')?.value||''
  }));
  return {
    conds,
    tgt: blockDiv.querySelector('.ie-rule-tgt')?.value||'',
    res: blockDiv.querySelector('.ie-res').value,
    type: blockDiv.dataset.type
  };
}

// Evaluate all conditions in a block
export function evalBlock(row,block){
  // Support both DOM elements and plain objects
  let conds, tgt, res;
  if(block instanceof HTMLElement){
    const parsed=_ieParseBlock(block);
    conds=parsed.conds; tgt=parsed.tgt; res=parsed.res;
  } else {
    conds=block.conds; tgt=block.tgt; res=block.res;
  }
  if(!conds||!conds.length) return false;
  let result=evalCond(row,conds[0].col,conds[0].op,conds[0].val,conds[0].val2);
  for(let i=1;i<conds.length;i++){
    const c=conds[i];
    const r=evalCond(row,c.col,c.op,c.val,c.val2);
    result=c.logic==='AND'?result&&r:result||r;
  }
  return result;
}

export function IE_RUN(){
  const globalTgt=$('ie-tgt').value,elseVal=$('ie-else').value;
  if(!globalTgt){toast('Zielspalte?');return}
  const blocks=[...document.querySelectorAll('#ie-chain .ie-block')];
  if(!blocks.length){toast('Bedingungen hinzufügen');return}
  window.pushUndo();let count=0;
  S.xD.forEach(row=>{
    let matched=false;
    for(const block of blocks){
      const parsed=_ieParseBlock(block);
      if(evalBlock(row,parsed)){
        const ti=S.xH.indexOf(parsed.tgt||globalTgt);
        if(ti!==-1){row[ti]=_ieResolve(row,parsed.res);matched=true;count++}
        break;
      }
    }
    if(!matched&&elseVal){
      const ti=S.xH.indexOf(globalTgt);
      if(ti!==-1){row[ti]=_ieResolve(row,elseVal);count++}
    }
  });
  window.XR();$('ie-result').innerHTML=`<span class="tg tg-g">${count} Zeilen</span>`;
  L('IF/ELSE',`→${globalTgt} (${count}×)`);toast(count+' ✓');
}

export function IE_SAVE(){
  const globalTgt=$('ie-tgt').value,elseVal=$('ie-else').value;if(!globalTgt)return;
  const blocks=[...document.querySelectorAll('#ie-chain .ie-block')].map(b=>_ieParseBlock(b));
  if(!blocks.length)return;
  S.savedIE.push({globalTgt,elseVal,blocks,name:`IF→${globalTgt}`});renderSavedIE();toast('IF/ELSE gespeichert ✓');
}

export function renderSavedIE(){
  if(!S.savedIE.length){$('ie-saved').innerHTML='';return}
  $('ie-saved').innerHTML=S.savedIE.map((ie,i)=>{
    const tgt=ie.globalTgt||ie.tgt;
    const blockCount=ie.blocks?.length||0;
    return `<div class="rule-card"><span class="tg tg-o">IF/ELSE</span><span class="rt">→${H(tgt)}: ${blockCount} Bedingungen${ie.elseVal?' | Else→'+H(ie.elseVal):''}</span><button class="b bora bs" onclick="runSavedIE(${i})">▶</button><button class="b bo bs" onclick="S.savedIE.splice(${i},1);renderSavedIE()">✕</button></div>`;
  }).join('');
}

export function runSavedIE(idx){
  const ie=S.savedIE[idx];
  const globalTgt=ie.globalTgt||ie.tgt;
  window.pushUndo();let n=0;
  S.xD.forEach(row=>{
    let matched=false;
    for(const b of ie.blocks){
      if(evalBlock(row,b)){
        const ti=S.xH.indexOf(b.tgt||globalTgt);
        if(ti!==-1){row[ti]=_ieResolve(row,b.res);matched=true;n++}
        break;
      }
    }
    if(!matched&&ie.elseVal){
      const ti=S.xH.indexOf(globalTgt);
      if(ti!==-1){row[ti]=_ieResolve(row,ie.elseVal);n++}
    }
  });
  window.XR();toast(n+' ✓');macLog('ifelse',ie);
}
