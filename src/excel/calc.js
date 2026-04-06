import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, macLog } from '../nav.js';
// TODO: import pushUndo from '...' (not yet extracted)
// TODO: import showX from '../excel/export.js' (circular)
// TODO: import XR from '../excel/export.js' (circular)

// ══════ CALC ══════
export let _calcRegexCache=null,_calcRegexKey='';
export function _getCalcRegexes(){const key=S.xH.join('\x00');if(_calcRegexCache&&_calcRegexKey===key)return _calcRegexCache;_calcRegexKey=key;const sorted=[...S.xH].sort((a,b)=>b.length-a.length);_calcRegexCache=sorted.map(h=>({h,ci:S.xH.indexOf(h),re:new RegExp('\\b'+h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g')}));return _calcRegexCache}
export function evalCalc(f,row){let e=f;const cm=e.match(/^CONCAT\((.+)\)$/i);if(cm){return cm[1].split(',').map(p=>{p=p.trim();if(/^["']/.test(p))return p.slice(1,-1);const ci=S.xH.indexOf(p);return ci!==-1?String(row[ci]??''):p}).join('')}
const im=e.match(/^IF\((.+?)\s*(>|<|>=|<=|=|!=)\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\)$/i);if(im){let[,l,op,r,tv,ev]=im;const lci=S.xH.findIndex(h=>h===l.trim());let lv=lci!==-1?row[lci]:l;const ln=parseFloat(lv),rn=parseFloat(r);let c=false;if(!isNaN(ln)&&!isNaN(rn)){switch(op){case'>':c=ln>rn;break;case'<':c=ln<rn;break;case'>=':c=ln>=rn;break;case'<=':c=ln<=rn;break;case'=':c=ln===rn;break;case'!=':c=ln!==rn;break}}else{c=op==='='?String(lv)===r.trim().replace(/^["']|["']$/g,''):String(lv)!==r.trim().replace(/^["']|["']$/g,'')}let rv=c?tv.trim():ev.trim();return rv.replace(/^["']|["']$/g,'')}
const regexes=_getCalcRegexes();for(const{ci,re}of regexes){re.lastIndex=0;e=e.replace(re,()=>{const v=parseFloat(row[ci]);return isNaN(v)?'0':v})};
try{return Number(_safeMathEval(e)).toFixed(2)}catch{return'ERR'}}
export function _safeMathEval(expr){const tokens=expr.match(/(\d+\.?\d*|[+\-*/%().]|\s+)/g);if(!tokens||tokens.join('').replace(/\s/g,'')!==expr.replace(/\s/g,''))return NaN;const safe=tokens.join('');if(/[a-zA-Z_$\\]/.test(safe))return NaN;return Function('"use strict";return ('+safe+')')()}
export function CALC(){const name=$('calc-name').value.trim(),f=$('calc-formula').value.trim();if(!name||!f)return;window.pushUndo();S.xH.push(name);S.xD.forEach(r=>r.push(evalCalc(f,r)));S.calcCols.push({name,f});window.showX();window.XR();renderCalcH();L('Calc',`${name}=${f}`);toast('"'+name+'" ✓');macLog('calc',{name,f})}
export function renderCalcH(){if(!S.calcCols.length){$('calc-history').innerHTML='';return}$('calc-history').innerHTML=S.calcCols.map((c,i)=>`<div class="rule-card"><span class="tg tg-p">${H(c.name)}</span><span class="rt">= ${H(c.f)}</span><button class="b bo bs" onclick="reCalc(${i})">🔄</button></div>`).join('')}
export function reCalc(i){const c=S.calcCols[i],ci=S.xH.indexOf(c.name);if(ci===-1)return;S.xD.forEach(r=>r[ci]=evalCalc(c.f,r));window.XR();toast('🔄 ✓')}
