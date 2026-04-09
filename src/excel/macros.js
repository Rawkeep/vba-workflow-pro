import { $ } from '../utils.js';
import { S } from '../store.js';
import { IDB } from '../idb.js';
import { toast, L, H, macLog, colOpts } from '../nav.js';
import { runSavedCase } from './select-case.js';
import { runSavedIE } from './if-else.js';
// TODO: import SO, FI, FIR, SR, TF, DD from '../excel/operations.js' (circular)
// TODO: import XE from '../excel/export.js' (circular)

// ══════ MAKROS ══════
export function MAC_REC(){S.macRec=true;S.macSteps=[];$('mac-rec').style.display='none';$('mac-stop').style.display='';$('mac-save').style.display='';$('rec-badge').style.display='';toast('⏺ REC');renderMacC()}
export function MAC_STOP(){S.macRec=false;$('mac-rec').style.display='';$('mac-stop').style.display='none';$('rec-badge').style.display='none';toast(`⏹ ${S.macSteps.length} Schritte`);renderMacC()}
export function MAC_SAVE(){const name=$('mac-name').value.trim()||`Makro ${S.macros.length+1}`;if(!S.macSteps.length)return;S.macros.push({name,steps:[...S.macSteps]});S.macSteps=[];$('mac-save').style.display='none';$('mac-name').value='';_persistMacros();renderMacList();renderMacC();toast('"'+name+'" 💾');L('Makro💾',name)}
function _persistMacros(){IDB.put('macros','list',S.macros).catch(e=>console.warn('Macro save:',e))}
export async function _hydrateMacros(){try{const m=await IDB.get('macros','list');if(m&&Array.isArray(m))S.macros=m}catch(e){console.warn('Macro hydrate:',e)}}
export function renderMacC(){$('mac-current').innerHTML=S.macSteps.length?'<div style="font:600 10px var(--mono);color:var(--red);margin-bottom:4px">REC ('+S.macSteps.length+'):</div>'+S.macSteps.map(s=>`<div class="macro-step">${s.action}: ${JSON.stringify(s.params).slice(0,60)}</div>`).join(''):S.macRec?'<p style="font-size:11px;color:var(--red)">⏺ Warte...</p>':''}
export function renderMacList(){if(!S.macros.length){$('mac-list').innerHTML='';return}$('mac-list').innerHTML=S.macros.map((m,i)=>`<div class="rule-card"><span class="tg tg-r">${H(m.name)}</span><span class="rt">${m.steps.length} Schritte</span><button class="b bd bs" onclick="MAC_RUN(${i})">▶</button><button class="b bo bs" onclick="S.macros.splice(${i},1);_persistMacros();renderMacList()">✕</button></div>`).join('')}
window._persistMacros=_persistMacros;
export function MAC_RUN(idx){const m=S.macros[idx];const prev=S.macRec;S.macRec=false;m.steps.forEach(s=>{const p=s.params;switch(s.action){case'sort':$('so-col').value=p.col;$('so-dir').value=p.dir;window.SO();break;case'filter':$('fi-col').value=p.col;$('fi-op').value=p.op;$('fi-val').value=p.val;window.FI();break;case'filterReset':window.FIR();break;case'sr':$('sr-find').value=p.find;$('sr-rep').value=p.rep;window.SR();break;case'textfn':$('tf-col').value=p.col;$('tf-fn').value=p.fn;window.TF();break;case'dedup':$('dd-col').value=p.col;window.DD();break;case'export':window.XE();break;case'case':if(typeof p==='number')runSavedCase(p);break;case'ifelse':if(typeof p==='number')runSavedIE(p);break}});S.macRec=prev;toast(`▶ "${m.name}" ✓`);L('Makro▶',m.name)}
