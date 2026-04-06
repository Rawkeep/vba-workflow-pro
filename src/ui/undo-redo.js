// ══════ UNDO / REDO ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, showX, toast are cross-module dependencies from core
// TODO: XDR, CC, XAR, XAC are mutators from core that get wrapped

export const _UNDO_MAX=25;
export function _snapState(){return{xH:[...S.xH],xD:S.xD.map(r=>[...r])}}
export function pushUndo(){if(S.xD.length>5000){if(S.undoStack.length>=_UNDO_MAX)S.undoStack.length=0}S.undoStack.push(_snapState());if(S.undoStack.length>_UNDO_MAX)S.undoStack.shift();S.redoStack.length=0;updateUndoBtn()}
export function UNDO(){if(!S.undoStack.length)return;S.redoStack.push(_snapState());const s=S.undoStack.pop();S.xH=s.xH;S.xD=s.xD;window.showX();window.XR();updateUndoBtn();window.toast('↩ Rückgängig')}
export function REDO(){if(!S.redoStack.length)return;S.undoStack.push(_snapState());const s=S.redoStack.pop();S.xH=s.xH;S.xD=s.xD;window.showX();window.XR();updateUndoBtn();window.toast('↪ Wiederholt')}
export function updateUndoBtn(){if($('x-undo')){$('x-undo').disabled=!S.undoStack.length;$('x-undo').textContent=S.undoStack.length?`↩ ${S.undoStack.length}`:'↩'}if($('x-redo')){$('x-redo').disabled=!S.redoStack.length;$('x-redo').textContent=S.redoStack.length?`↪ ${S.redoStack.length}`:'↪'}}

// ══════ WRAP EXISTING MUTATORS WITH UNDO ══════
export function wrapMutatorsWithUndo() {
  const _origXDR=window.XDR;window.XDR=function(i){pushUndo();_origXDR(i)};
  const _origCC=window.CC;window.CC=function(r,c,el){pushUndo();_origCC(r,c,el)};
  const _origXAR=window.XAR;window.XAR=function(){pushUndo();_origXAR()};
  const _origXAC=window.XAC;window.XAC=function(){pushUndo();_origXAC()};
}
