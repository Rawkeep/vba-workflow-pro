// ══════ ROBUSTNESS: Error boundaries for all major operations ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: toast is a cross-module dependency from core
// TODO: CS_RUN, IE_RUN, SW_RUN, SO, SR, TF, DD, CALC, VD_RUN are core functions

export function safeExec(fn,label){
  return function(){
    try{return fn.apply(this,arguments)}
    catch(e){window.toast('Fehler bei '+label+': '+e.message);console.error(label,e)}
  };
}

// Wrap critical functions
export function initErrorBoundaries() {
  if(typeof window.CS_RUN==='function'){const _cs=window.CS_RUN;window.CS_RUN=safeExec(_cs,'SELECT CASE')}
  if(typeof window.IE_RUN==='function'){const _ie=window.IE_RUN;window.IE_RUN=safeExec(_ie,'IF/ELSE')}
  if(typeof window.SW_RUN==='function'){const _sw=window.SW_RUN;window.SW_RUN=safeExec(_sw,'SWITCH')}
  if(typeof window.SO==='function'){const _so=window.SO;window.SO=safeExec(_so,'Sortieren')}
  if(typeof window.SR==='function'){const _sr=window.SR;window.SR=safeExec(_sr,'Suchen & Ersetzen')}
  if(typeof window.TF==='function'){const _tf=window.TF;window.TF=safeExec(_tf,'Text')}
  if(typeof window.DD==='function'){const _dd=window.DD;window.DD=safeExec(_dd,'Dedup')}
  if(typeof window.CALC==='function'){const _calc=window.CALC;window.CALC=safeExec(_calc,'Berechnung')}
  if(typeof window.VD_RUN==='function'){const _vd=window.VD_RUN;window.VD_RUN=safeExec(_vd,'Validierung')}
}
