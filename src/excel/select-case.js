import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';

// ══════ SELECT CASE (Advanced Multi-Condition) ══════

function _csColOpts(){ return colOpts() }
function _csOpOpts(){
  return ['=','≠','>','<','>=','<=','enthält','beginnt','endet','leer','nicht leer','zwischen'].map(o=>`<option value="${o}">${o}</option>`).join('');
}

// Build a single condition row
function _csCondHTML(isFirst){
  return `<div class="cs-cond" style="display:inline-flex;align-items:center;gap:4px;margin:2px 0">${
    isFirst?'<span style="width:36px;font:600 10px var(--mono);color:var(--pk)">WENN</span>'
    :'<select class="cs-logic" style="width:50px;font-size:10px"><option>UND</option><option>ODER</option></select>'
  }<select class="cs-cond-col" style="width:100px">${_csColOpts()}</select><select class="cs-cond-op" style="width:70px">${_csOpOpts()}</select><input type="text" class="cs-cond-val" placeholder="Wert" style="width:90px"><input type="text" class="cs-cond-val2" placeholder="bis" style="width:60px;display:none"><button class="b bo bs" style="font-size:9px;padding:2px 5px" onclick="this.closest('.cs-cond').remove()">✕</button></div>`;
}

// Show/hide the "bis" field for "zwischen" operator
function _csCondOpChange(sel){
  const val2=sel.closest('.cs-cond').querySelector('.cs-cond-val2');
  val2.style.display=sel.value==='zwischen'?'':'none';
}

// Build a full case rule row
export function csAddRow(){
  const d=$('cs-rows');
  const div=document.createElement('div');
  div.className='case-row-adv';
  div.style.cssText='padding:8px;margin:4px 0;background:rgba(236,72,153,.04);border:1px solid rgba(236,72,153,.15);border-radius:6px';
  div.innerHTML=`<div class="cs-conds">${_csCondHTML(true)}</div><div style="display:flex;align-items:center;gap:6px;margin-top:4px"><button class="b bo bs" style="font-size:9px" onclick="csAddCond(this.closest('.case-row-adv'))">+ Bedingung</button><span class="case-arrow" style="color:var(--pk)">→</span><span style="font:600 10px var(--mono);color:var(--tx2)">in</span><select class="cs-rule-tgt" style="width:110px">${_csColOpts()}</select><span style="font:600 10px var(--mono);color:var(--tx2)">schreibe</span><input type="text" class="cs-res" placeholder="Wert oder {Spalte}" style="width:140px" title="Fester Wert oder {Spaltenname} zum Kopieren"><button class="b bo bs" onclick="this.closest('.case-row-adv').remove()" title="Regel entfernen">✕</button></div>`;
  d.appendChild(div);
  // Bind operator change
  div.querySelectorAll('.cs-cond-op').forEach(s=>s.addEventListener('change',()=>_csCondOpChange(s)));
}

// Add condition to existing rule
export function csAddCond(ruleDiv){
  const c=ruleDiv.querySelector('.cs-conds');
  const tmp=document.createElement('div');
  tmp.innerHTML=_csCondHTML(false);
  const cond=tmp.firstElementChild;
  c.appendChild(cond);
  cond.querySelector('.cs-cond-op').addEventListener('change',function(){_csCondOpChange(this)});
}

// Sync targets (no-op, kept for HTML compatibility)
export function csSyncTargets(){}

export function csAddNew(){
  const n=prompt('Neue Spalte:');if(!n)return;
  if(S.xH.includes(n)){toast('⚠ Spalte "'+n+'" existiert bereits');return}
  S.xH.push(n);S.xD.forEach(r=>r.push(''));window.showX();window.XR();
  // Set new column in all rule targets that are empty
  document.querySelectorAll('#cs-rows .cs-rule-tgt').forEach(sel=>{if(!sel.value)sel.value=n});
}

// Evaluate a single condition against a row
function _csEvalCond(row,col,op,val,val2){
  const ci=S.xH.indexOf(col);
  if(ci===-1) return false;
  const c=String(row[ci]??''), n=parseFloat(c), nv=parseFloat(val);
  switch(op){
    case'=': return c===val;
    case'≠': return c!==val;
    case'>': return !isNaN(n)&&n>nv;
    case'<': return !isNaN(n)&&n<nv;
    case'>=': return !isNaN(n)&&n>=nv;
    case'<=': return !isNaN(n)&&n<=nv;
    case'enthält': return c.toLowerCase().includes(val.toLowerCase());
    case'beginnt': return c.toLowerCase().startsWith(val.toLowerCase());
    case'endet': return c.toLowerCase().endsWith(val.toLowerCase());
    case'leer': return !c.trim();
    case'nicht leer': return !!c.trim();
    case'zwischen': {const nv2=parseFloat(val2);return !isNaN(n)&&n>=nv&&n<=nv2}
  }
  return false;
}

// Resolve result value — supports {Spaltenname} references
function _csResolveResult(row,resStr){
  return resStr.replace(/\{([^}]+)\}/g,(_,name)=>{
    const ci=S.xH.indexOf(name);
    return ci!==-1 ? String(row[ci]??'') : `{${name}}`;
  });
}

// Parse rules from DOM
function _csParseRules(){
  return [...document.querySelectorAll('#cs-rows .case-row-adv')].map(ruleDiv=>{
    const conds=[...ruleDiv.querySelectorAll('.cs-cond')].map((c,i)=>({
      logic: i===0 ? 'UND' : (c.querySelector('.cs-logic')?.value||'UND'),
      col: c.querySelector('.cs-cond-col').value,
      op: c.querySelector('.cs-cond-op').value,
      val: c.querySelector('.cs-cond-val').value,
      val2: c.querySelector('.cs-cond-val2')?.value||''
    }));
    return {
      conds,
      tgt: ruleDiv.querySelector('.cs-rule-tgt').value,
      res: ruleDiv.querySelector('.cs-res').value
    };
  });
}

// Evaluate all conditions of a rule against a row
function _csEvalRule(row,rule){
  if(!rule.conds.length) return false;
  let result=_csEvalCond(row,rule.conds[0].col,rule.conds[0].op,rule.conds[0].val,rule.conds[0].val2);
  for(let i=1;i<rule.conds.length;i++){
    const c=rule.conds[i];
    const cResult=_csEvalCond(row,c.col,c.op,c.val,c.val2);
    if(c.logic==='UND') result=result&&cResult;
    else result=result||cResult;
  }
  return result;
}

export function CS_RUN(){
  const elseVal=$('cs-else').value;
  const rules=_csParseRules();
  if(!rules.length){toast('Regeln hinzufügen');return}
  // Validate targets — each rule must have its own
  for(const r of rules){
    if(!r.tgt){toast('Zielspalte fehlt bei einer Regel');return}
    if(S.xH.indexOf(r.tgt)===-1){toast(`Spalte "${r.tgt}" nicht gefunden`);return}
  }
  const elseTgt=$('cs-else-tgt')?.value||rules[0].tgt;
  window.pushUndo();
  let count=0;
  S.xD.forEach(row=>{
    let matched=false;
    for(const rule of rules){
      if(_csEvalRule(row,rule)){
        const ti=S.xH.indexOf(rule.tgt);
        if(ti!==-1){
          row[ti]=_csResolveResult(row,rule.res);
          matched=true;count++;
        }
        break; // first match wins
      }
    }
    if(!matched&&elseVal){
      const ti=S.xH.indexOf(elseTgt);
      if(ti!==-1){row[ti]=_csResolveResult(row,elseVal);count++}
    }
  });
  window.XR();
  $('cs-result').innerHTML=`<span class="tg tg-g">${count} Zeilen</span>`;
  const ruleDesc=rules.map(r=>r.conds.map(c=>`${c.col}${c.op}${c.val}`).join('&')+`→${r.res}`).join(', ');
  L('CASE',`${ruleDesc} (${count}×)`);toast(count+' ✓');macLog('case',{rules,elseVal});
}

export function CS_SAVE(){
  const elseVal=$('cs-else').value;
  const rules=_csParseRules();
  if(!rules.length)return;
  const name=rules.length===1&&rules[0].conds.length===1
    ? `CASE ${rules[0].conds[0].col}→${rules[0].tgt}`
    : `CASE ${rules.length} Regeln→${rules.map(r=>r.tgt).filter((v,i,a)=>a.indexOf(v)===i).join(',')}`;
  const elseTgt=$('cs-else-tgt')?.value||rules[0].tgt;
  S.savedCases.push({rules,globalTgt:elseTgt,elseVal,name});
  renderSavedCases();toast('Case gespeichert ✓');
}

export function renderSavedCases(){
  if(!S.savedCases.length){$('cs-saved').innerHTML='';return}
  $('cs-saved').innerHTML=S.savedCases.map((c,i)=>{
    // Support both old format (src/cases) and new format (rules/conds)
    let desc;
    if(c.rules){
      desc=c.rules.map(r=>{
        const condStr=r.conds.map(cd=>`${cd.col}${cd.op}${cd.val}`).join(' & ');
        return `${condStr}→${r.res}`;
      }).join(' | ');
    } else {
      desc=`${c.src}: ${c.cases.map(x=>x.v+'→'+x.r).join(', ')}`;
    }
    if(c.elseVal) desc+=` | Else→${c.elseVal}`;
    return `<div class="rule-card"><span class="tg tg-pk">CASE</span><span class="rt" title="${H(desc)}">${H(c.name||desc)}</span><button class="b bpk bs" onclick="runSavedCase(${i})">▶</button><button class="b bo bs" onclick="S.savedCases.splice(${i},1);renderSavedCases()">✕</button></div>`;
  }).join('');
}

export function runSavedCase(i){
  const c=S.savedCases[i];
  window.pushUndo();
  let n=0;

  if(c.rules){
    // New format
    S.xD.forEach(row=>{
      let matched=false;
      for(const rule of c.rules){
        if(_csEvalRule(row,rule)){
          const ti=S.xH.indexOf(rule.tgt||c.globalTgt);
          if(ti!==-1){row[ti]=_csResolveResult(row,rule.res);matched=true;n++}
          break;
        }
      }
      if(!matched&&c.elseVal){
        const ti=S.xH.indexOf(c.globalTgt);
        if(ti!==-1){row[ti]=_csResolveResult(row,c.elseVal);n++}
      }
    });
  } else {
    // Legacy format (src/cases)
    const si=S.xH.indexOf(c.src),ti=S.xH.indexOf(c.tgt);
    if(si===-1||ti===-1)return;
    S.xD.forEach(row=>{
      const val=String(row[si]??'');let m=false;
      for(const cs of c.cases){
        if(cs.v.startsWith('>=')){if(parseFloat(val)>=parseFloat(cs.v.slice(2))){row[ti]=cs.r;m=true;n++;break}}
        else if(cs.v.startsWith('>')){if(parseFloat(val)>parseFloat(cs.v.slice(1))){row[ti]=cs.r;m=true;n++;break}}
        else if(cs.v.startsWith('<=')){if(parseFloat(val)<=parseFloat(cs.v.slice(2))){row[ti]=cs.r;m=true;n++;break}}
        else if(cs.v.startsWith('<')){if(parseFloat(val)<parseFloat(cs.v.slice(1))){row[ti]=cs.r;m=true;n++;break}}
        else if(val===cs.v){row[ti]=cs.r;m=true;n++;break}
      }
      if(!m&&c.elseVal){row[ti]=c.elseVal;n++}
    });
  }
  window.XR();toast(n+' ✓');macLog('case',c);
}
