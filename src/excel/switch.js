import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, L, colOpts, macLog } from '../nav.js';
import { evalCond } from './if-else.js';

// ══════ SWITCH (Enhanced Multi-Column) ══════

function _swOpOpts(){
  return ['=','≠','>','<','>=','<=','enthält','beginnt','endet','leer','nicht leer','zwischen'].map(o=>`<option value="${o}">${o}</option>`).join('');
}

// Build a single condition HTML snippet
function _swCondHTML(isFirst){
  return `<div class="sw-cond" style="display:inline-flex;align-items:center;gap:4px;margin:2px 0">${
    isFirst?''
    :'<select class="sw-logic" style="width:50px;font-size:10px"><option>AND</option><option>OR</option></select>'
  }<select class="sw-col" style="width:100px">${colOpts()}</select><select class="sw-op" style="width:70px">${_swOpOpts()}</select><input type="text" class="sw-val" placeholder="Wert" style="width:90px"><input type="text" class="sw-val2" placeholder="bis" style="width:55px;display:none"><button class="b bo bs" style="font-size:9px;padding:2px 5px" onclick="this.closest('.sw-cond').remove()">✕</button></div>`;
}

function _swBindOpChange(container){
  container.querySelectorAll('.sw-op').forEach(s=>{
    s.addEventListener('change',function(){
      const v2=this.closest('.sw-cond').querySelector('.sw-val2');
      if(v2) v2.style.display=this.value==='zwischen'?'':'none';
    });
  });
}

// Resolve {Spaltenname} references in result string
function _swResolve(row,str){
  return str.replace(/\{([^}]+)\}/g,(_,name)=>{
    const ci=S.xH.indexOf(name);
    return ci!==-1?String(row[ci]??''):`{${name}}`;
  });
}

export function swAddRule(){
  const d=$('sw-rows');
  const div=document.createElement('div');
  div.className='sw-rule';
  div.style.cssText='padding:8px;margin:4px 0;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:6px';
  div.innerHTML=`<div class="sw-conds">${_swCondHTML(true)}</div><div style="display:flex;align-items:center;gap:6px;margin-top:4px"><button class="b bo bs" style="font-size:9px" onclick="swAddCond(this.closest('.sw-rule'))">+ Bedingung</button><span class="case-arrow" style="color:var(--cyn)">→</span><span style="font:600 10px var(--mono);color:var(--tx2)">in</span><select class="sw-rule-tgt" style="width:100px">${colOpts()}</select><span style="font:600 10px var(--mono);color:var(--tx2)">schreibe</span><input type="text" class="sw-res" placeholder="Wert oder {Spalte}" style="width:130px"><button class="b bo bs" onclick="this.closest('.sw-rule').remove()">✕</button></div>`;
  d.appendChild(div);
  _swBindOpChange(div);
  // Sync default target
  const globalTgt=$('sw-tgt');
  if(globalTgt&&globalTgt.value) div.querySelector('.sw-rule-tgt').value=globalTgt.value;
}

export function swAddCond(ruleDiv){
  const c=ruleDiv.querySelector('.sw-conds');
  const tmp=document.createElement('div');
  tmp.innerHTML=_swCondHTML(false);
  const cond=tmp.firstElementChild;
  c.appendChild(cond);
  _swBindOpChange(cond);
}

export function swSyncTargets(){
  const v=$('sw-tgt').value;
  document.querySelectorAll('#sw-rows .sw-rule-tgt').forEach(sel=>sel.value=v);
}

export function swAddNew(){
  const n=prompt('Neue Spalte:');if(!n)return;
  if(S.xH.includes(n)){toast('⚠ Spalte "'+n+'" existiert bereits');$('sw-tgt').value=n;return}
  S.xH.push(n);S.xD.forEach(r=>r.push(''));window.showX();window.XR();$('sw-tgt').value=n;
}

// Parse rule conditions from DOM
function _swParseRule(ruleDiv){
  const conds=[...ruleDiv.querySelectorAll('.sw-cond')].map((c,i)=>({
    logic: i===0?'AND':(c.querySelector('.sw-logic')?.value||'AND'),
    col: c.querySelector('.sw-col').value,
    op: c.querySelector('.sw-op').value,
    val: c.querySelector('.sw-val').value,
    val2: c.querySelector('.sw-val2')?.value||''
  }));
  return {
    conds,
    tgt: ruleDiv.querySelector('.sw-rule-tgt')?.value||'',
    res: ruleDiv.querySelector('.sw-res').value
  };
}

// Evaluate all conditions in a rule
function _swEvalRule(row,rule){
  const conds=rule.conds;
  if(!conds||!conds.length) return false;
  let result=evalCond(row,conds[0].col,conds[0].op,conds[0].val,conds[0].val2);
  for(let i=1;i<conds.length;i++){
    const c=conds[i];
    const r=evalCond(row,c.col,c.op,c.val,c.val2);
    result=c.logic==='AND'?result&&r:result||r;
  }
  return result;
}

export function SW_RUN(){
  const globalTgt=$('sw-tgt').value,elseVal=$('sw-else').value;
  if(!globalTgt){toast('Zielspalte?');return}
  const rules=[...document.querySelectorAll('#sw-rows .sw-rule')].map(r=>_swParseRule(r));
  if(!rules.length){toast('Regeln hinzufügen');return}
  window.pushUndo();let count=0;
  S.xD.forEach(row=>{
    let matched=false;
    for(const rule of rules){
      if(_swEvalRule(row,rule)){
        const ti=S.xH.indexOf(rule.tgt||globalTgt);
        if(ti!==-1){row[ti]=_swResolve(row,rule.res);matched=true;count++}
        break;
      }
    }
    if(!matched&&elseVal){
      const ti=S.xH.indexOf(globalTgt);
      if(ti!==-1){row[ti]=_swResolve(row,elseVal);count++}
    }
  });
  window.XR();$('sw-result').innerHTML=`<span class="tg tg-g">${count} Zeilen</span>`;
  L('SWITCH',`→${globalTgt} (${count}×)`);toast(count+' ✓');
}

export function SW_SAVE(){
  const globalTgt=$('sw-tgt').value,elseVal=$('sw-else').value;if(!globalTgt)return;
  const rules=[...document.querySelectorAll('#sw-rows .sw-rule')].map(r=>_swParseRule(r));
  if(!rules.length)return;
  S.savedSW.push({globalTgt,elseVal,rules,name:`SW→${globalTgt}`});renderSavedSW();toast('SWITCH gespeichert ✓');
}

export function renderSavedSW(){
  if(!S.savedSW.length){$('sw-saved').innerHTML='';return}
  $('sw-saved').innerHTML=S.savedSW.map((s,i)=>{
    const tgt=s.globalTgt||s.tgt;
    const ruleCount=s.rules?.length||0;
    return `<div class="rule-card"><span class="tg tg-c">SWITCH</span><span class="rt">→${H(tgt)}: ${ruleCount} Regeln${s.elseVal?' | Else→'+H(s.elseVal):''}</span><button class="b bcyn bs" onclick="runSavedSW(${i})">▶</button><button class="b bo bs" onclick="S.savedSW.splice(${i},1);renderSavedSW()">✕</button></div>`;
  }).join('');
}

export function runSavedSW(idx){
  const s=S.savedSW[idx];
  const globalTgt=s.globalTgt||s.tgt;
  window.pushUndo();let n=0;
  S.xD.forEach(row=>{
    let matched=false;
    for(const rule of s.rules){
      // Support both legacy format (col1/op1/val1/col2/op2/val2) and new format (conds)
      if(rule.conds){
        if(_swEvalRule(row,rule)){
          const ti=S.xH.indexOf(rule.tgt||globalTgt);
          if(ti!==-1){row[ti]=_swResolve(row,rule.res);matched=true;n++}
          break;
        }
      } else {
        // Legacy format
        const c1=evalCond(row,rule.col1,rule.op1,rule.val1,'');
        const c2=rule.col2?evalCond(row,rule.col2,rule.op2,rule.val2,''):true;
        const pass=rule.logic==='AND'?c1&&c2:c1||c2;
        if(pass){
          const ti=S.xH.indexOf(globalTgt);
          if(ti!==-1){row[ti]=_swResolve(row,rule.res);matched=true;n++}
          break;
        }
      }
    }
    if(!matched&&s.elseVal){
      const ti=S.xH.indexOf(globalTgt);
      if(ti!==-1){row[ti]=_swResolve(row,s.elseVal);n++}
    }
  });
  window.XR();toast(n+' ✓');macLog('switch',s);
}
