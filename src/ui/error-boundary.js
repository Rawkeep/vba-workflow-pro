// ══════ ROBUSTNESS: Error boundaries for all major operations ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: toast is a cross-module dependency from core
// TODO: CS_RUN, IE_RUN, SW_RUN, SO, SR, TF, DD, CALC, VD_RUN are core functions

export function safeExec(fn,label){
  return function(){
    try{return fn.apply(this,arguments)}
    catch(e){toast('Fehler bei '+label+': '+e.message);console.error(label,e)}
  };
}

// Wrap critical functions
export function initErrorBoundaries() {
  if(typeof CS_RUN==='function'){const _cs=CS_RUN;CS_RUN=safeExec(_cs,'SELECT CASE')}
  if(typeof IE_RUN==='function'){const _ie=IE_RUN;IE_RUN=safeExec(_ie,'IF/ELSE')}
  if(typeof SW_RUN==='function'){const _sw=SW_RUN;SW_RUN=safeExec(_sw,'SWITCH')}
  if(typeof SO==='function'){const _so=SO;SO=safeExec(_so,'Sortieren')}
  if(typeof SR==='function'){const _sr=SR;SR=safeExec(_sr,'Suchen & Ersetzen')}
  if(typeof TF==='function'){const _tf=TF;TF=safeExec(_tf,'Text')}
  if(typeof DD==='function'){const _dd=DD;DD=safeExec(_dd,'Dedup')}
  if(typeof CALC==='function'){const _calc=CALC;CALC=safeExec(_calc,'Berechnung')}
  if(typeof VD_RUN==='function'){const _vd=VD_RUN;VD_RUN=safeExec(_vd,'Validierung')}
}
