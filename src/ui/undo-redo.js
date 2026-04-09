// ══════ UNDO / REDO ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, showX, toast are cross-module dependencies from core
// TODO: XDR, CC, XAR, XAC are mutators from core that get wrapped

export const _UNDO_MAX=25;
const _DELTA_THRESHOLD=2000; // rows above which we use delta snapshots

export function _snapState(){
  // For large datasets, only store changed rows (delta)
  if(S.xD.length>_DELTA_THRESHOLD&&S.undoStack.length>0){
    const prev=S.undoStack[S.undoStack.length-1];
    if(prev&&!prev._delta&&prev.xD.length===S.xD.length&&prev.xH.length===S.xH.length){
      const changes=[];
      for(let i=0;i<S.xD.length;i++){
        const cur=S.xD[i],old=prev._fullXD?prev._fullXD[i]:prev.xD[i];
        if(!old||cur.length!==old.length||cur.some((v,j)=>v!==old[j])){
          changes.push({i,row:[...cur]});
        }
      }
      if(changes.length<S.xD.length*0.5){
        return{xH:[...S.xH],_delta:true,_baseLen:S.xD.length,changes,_prevRef:prev}
      }
    }
  }
  return{xH:[...S.xH],xD:S.xD.map(r=>[...r])}
}

function _restoreSnap(s){
  S.xH=s.xH;
  if(s._delta){
    // Restore from delta: start with current data and apply reverse
    // We need the full data from prev reference
    const base=s._prevRef;
    S.xD=base.xD?base.xD.map(r=>[...r]):base._fullXD.map(r=>[...r]);
    s.changes.forEach(c=>{if(c.i<S.xD.length)S.xD[c.i]=[...c.row]});
  }else{
    S.xD=s.xD.map(r=>[...r]);
  }
}

export function pushUndo(){if(S.xD.length>5000){if(S.undoStack.length>=_UNDO_MAX)S.undoStack.length=0}S.undoStack.push(_snapState());if(S.undoStack.length>_UNDO_MAX)S.undoStack.shift();S.redoStack.length=0;updateUndoBtn()}
export function UNDO(){if(!S.undoStack.length)return;S.redoStack.push(_snapState());const s=S.undoStack.pop();_restoreSnap(s);window.showX();window.XR();updateUndoBtn();window.toast('↩ Rückgängig')}
export function REDO(){if(!S.redoStack.length)return;S.undoStack.push(_snapState());const s=S.redoStack.pop();_restoreSnap(s);window.showX();window.XR();updateUndoBtn();window.toast('↪ Wiederholt')}
export function updateUndoBtn(){if($('x-undo')){$('x-undo').disabled=!S.undoStack.length;$('x-undo').textContent=S.undoStack.length?`↩ ${S.undoStack.length}`:'↩'}if($('x-redo')){$('x-redo').disabled=!S.redoStack.length;$('x-redo').textContent=S.redoStack.length?`↪ ${S.redoStack.length}`:'↪'}}

// ══════ WRAP EXISTING MUTATORS WITH UNDO ══════
export function wrapMutatorsWithUndo() {
  const _origXDR=window.XDR;window.XDR=function(i){pushUndo();_origXDR(i)};
  const _origCC=window.CC;window.CC=function(r,c,el){pushUndo();_origCC(r,c,el)};
  const _origXAR=window.XAR;window.XAR=function(){pushUndo();_origXAR()};
  const _origXAC=window.XAC;window.XAC=function(){pushUndo();_origXAC()};
}
