import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';
import { runSavedCase, runSavedIE } from './rules.js';
import { runSavedRule } from './rules.js';
import { XE } from './export.js';
// TODO: import SO, FI, TF, SR, DD from '../excel/operations.js' (circular)
// TODO: import FIR from '../excel/operations.js' (circular)

// ══════ BATCH PIPELINE ══════
export function ppAdd(){const type=$('pp-type').value;const div=document.createElement('div');const n=S.pipeSteps.length+1;
let fields='';
switch(type){
case'sort':fields=`<select class="pp-col" style="width:110px">${colOpts()}</select><select class="pp-dir" style="width:70px"><option value="asc">A→Z</option><option value="desc">Z→A</option></select>`;break;
case'filter':fields=`<select class="pp-col" style="width:100px">${colOpts()}</select><select class="pp-op" style="width:70px"><option>enthält</option><option>=</option><option>≠</option><option>></option><option><</option></select><input type="text" class="pp-val" placeholder="Wert" style="width:80px">`;break;
case'text':fields=`<select class="pp-col" style="width:100px">${colOpts()}</select><select class="pp-fn" style="width:90px"><option>UPPER</option><option>LOWER</option><option>TRIM</option><option>PROPER</option></select>`;break;
case'sr':fields=`<input type="text" class="pp-find" placeholder="Suchen" style="width:100px"><input type="text" class="pp-rep" placeholder="Ersetzen" style="width:100px">`;break;
case'dedup':fields=`<select class="pp-col" style="width:110px">${colOpts()}</select>`;break;
case'case':fields=`<span style="font-size:10px;color:var(--tx2)">(gespeicherter Case #)</span><input type="number" class="pp-idx" value="1" style="width:40px" min="1">`;break;
case'ifelse':fields=`<span style="font-size:10px;color:var(--tx2)">(gespeichertes IF/ELSE #)</span><input type="number" class="pp-idx" value="1" style="width:40px" min="1">`;break;
case'switch':fields=`<span style="font-size:10px;color:var(--tx2)">(gespeichertes SWITCH #)</span><input type="number" class="pp-idx" value="1" style="width:40px" min="1">`;break;
case'rules':fields=`<span style="font-size:10px;color:var(--tx2)">(gespeicherte Regel #)</span><input type="number" class="pp-idx" value="1" style="width:40px" min="1">`;break;
case'export':fields='<span style="font-size:10px;color:var(--tx2)">XLSX exportieren</span>';break;
}
S.pipeSteps.push(type);
const el=document.createElement('div');
el.innerHTML=`<div class="pipe-step" data-type="${type}"><span class="pipe-num">${n}</span><span class="tg tg-${type==='case'?'pk':type==='ifelse'?'o':type==='export'?'g':'a'}">${type.toUpperCase()}</span>${fields}<button class="b bo bs" onclick="this.closest('.pipe-step').remove();ppRenum()" style="margin-left:auto">✕</button></div>`;
if($('pp-steps').children.length>0){const arrow=document.createElement('div');arrow.className='pipe-arrow';arrow.textContent='↓';$('pp-steps').appendChild(arrow)}
$('pp-steps').appendChild(el.firstChild);
}
export function ppRenum(){let n=1;$('pp-steps').querySelectorAll('.pipe-num').forEach(el=>{el.textContent=n++});S.pipeSteps=[];$('pp-steps').querySelectorAll('.pipe-step').forEach(el=>S.pipeSteps.push(el.dataset.type))}
export function PP_RUN(){
  const steps=$('pp-steps').querySelectorAll('.pipe-step');
  steps.forEach(step=>{
    const type=step.dataset.type;
    switch(type){
      case'sort':{const c=step.querySelector('.pp-col').value,d=step.querySelector('.pp-dir').value;if(c){$('so-col').value=c;$('so-dir').value=d;window.SO()}}break;
      case'filter':{const c=step.querySelector('.pp-col').value,o=step.querySelector('.pp-op').value,v=step.querySelector('.pp-val').value;if(c){$('fi-col').value=c;$('fi-op').value=o;$('fi-val').value=v;window.FI()}}break;
      case'text':{const c=step.querySelector('.pp-col').value,f=step.querySelector('.pp-fn').value;if(c){$('tf-col').value=c;$('tf-fn').value=f;window.TF()}}break;
      case'sr':{const f=step.querySelector('.pp-find').value,r=step.querySelector('.pp-rep').value;$('sr-find').value=f;$('sr-rep').value=r;$('sr-col').value='__ALL__';window.SR()}break;
      case'dedup':{const c=step.querySelector('.pp-col').value;if(c){$('dd-col').value=c;window.DD()}}break;
      case'case':{const idx=parseInt(step.querySelector('.pp-idx').value)-1;if(S.savedCases[idx])runSavedCase(idx)}break;
      case'ifelse':{const idx=parseInt(step.querySelector('.pp-idx').value)-1;if(S.savedIE[idx])runSavedIE(idx)}break;
      case'switch':{const idx=parseInt(step.querySelector('.pp-idx').value)-1;if(S.savedRules)runSavedRule(idx)}break;
      case'rules':{const idx=parseInt(step.querySelector('.pp-idx').value)-1;if(S.savedRules&&S.savedRules[idx])runSavedRule(idx)}break;
      case'export':XE();break;
    }
  });
  toast(`Pipeline (${steps.length} Schritte) ✓`);L('Pipeline',`${steps.length} Schritte`);
}
export function PP_SAVE(){const name=$('pp-name').value.trim()||`Pipeline ${S.pipelines.length+1}`;const steps=[];$('pp-steps').querySelectorAll('.pipe-step').forEach(s=>{const t=s.dataset.type;const d={type:t};switch(t){case'sort':d.col=s.querySelector('.pp-col').value;d.dir=s.querySelector('.pp-dir').value;break;case'filter':d.col=s.querySelector('.pp-col').value;d.op=s.querySelector('.pp-op').value;d.val=s.querySelector('.pp-val').value;break;case'text':d.col=s.querySelector('.pp-col').value;d.fn=s.querySelector('.pp-fn').value;break;case'sr':d.find=s.querySelector('.pp-find').value;d.rep=s.querySelector('.pp-rep').value;break;case'dedup':d.col=s.querySelector('.pp-col').value;break;case'case':case'ifelse':case'switch':case'rules':d.idx=parseInt(s.querySelector('.pp-idx').value)-1;break}steps.push(d)});
if(!steps.length)return;S.pipelines.push({name,steps});renderSavedPipes();toast('Pipeline gespeichert ✓')}
export function renderSavedPipes(){if(!S.pipelines.length){$('pp-saved').innerHTML='';return}
$('pp-saved').innerHTML=S.pipelines.map((p,i)=>`<div class="rule-card"><span class="tg tg-c">${H(p.name)}</span><span class="rt">${p.steps.map(s=>s.type).join(' → ')}</span><button class="b bcyn bs" onclick="runSavedPipe(${i})">🚀</button><button class="b bo bs" onclick="S.pipelines.splice(${i},1);renderSavedPipes()">✕</button></div>`).join('')}
export function runSavedPipe(idx){const p=S.pipelines[idx];p.steps.forEach(s=>{switch(s.type){case'sort':$('so-col').value=s.col;$('so-dir').value=s.dir;window.SO();break;case'filter':$('fi-col').value=s.col;$('fi-op').value=s.op;$('fi-val').value=s.val;window.FI();break;case'text':$('tf-col').value=s.col;$('tf-fn').value=s.fn;window.TF();break;case'sr':$('sr-find').value=s.find;$('sr-rep').value=s.rep;$('sr-col').value='__ALL__';window.SR();break;case'dedup':$('dd-col').value=s.col;window.DD();break;case'case':if(S.savedCases[s.idx])runSavedCase(s.idx);break;case'ifelse':if(S.savedIE[s.idx])runSavedIE(s.idx);break;case'switch':case'rules':if(S.savedRules&&S.savedRules[s.idx])runSavedRule(s.idx);break;case'export':XE();break}});toast(`🚀 "${p.name}" ✓`);L('Pipe▶',p.name)}
