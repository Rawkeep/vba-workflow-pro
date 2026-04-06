// ══════ AUTO-SAVE (IndexedDB) ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, toast, N, showX, L, _appLog are cross-module dependencies from core
// TODO: IDB is a global dependency (IndexedDB wrapper)

export function _lsUsage(){return IDB.usage()}
export async function autoSave(){
  if(!S.xH.length)return;
  try{
    const data={xH:S.xH,xD:S.xD,xFn:S.xFn,savedCases:S.savedCases,savedIE:S.savedIE,savedSW:S.savedSW,calcCols:S.calcCols,pipelines:S.pipelines,ts:Date.now()};
    await IDB.put('autoSave','current',data);
    const b=$('autosave-badge');b.classList.add('show');setTimeout(()=>b.classList.remove('show'),1500);
  }catch(e){toast('⚠ AutoSave fehlgeschlagen');_appLog('AutoSave: '+e.message)}
}
export async function autoRestore(){
  try{
    // Migrate from localStorage if exists
    const legacy=localStorage.getItem('vbaBeastAutoSave');
    if(legacy){const ld=JSON.parse(legacy);await IDB.put('autoSave','current',ld);localStorage.removeItem('vbaBeastAutoSave')}
    const data=await IDB.get('autoSave','current');
    if(!data||!data.xH||!data.xH.length)return false;
    if(Date.now()-data.ts>86400000){await IDB.del('autoSave','current');return false}
    S.xH=data.xH;S.xD=data.xD;S.xFn=data.xFn||'Wiederhergestellt';
    S.savedCases=data.savedCases||[];S.savedIE=data.savedIE||[];S.savedSW=data.savedSW||[];
    S.calcCols=data.calcCols||[];S.pipelines=data.pipelines||[];
    S.selectedRows=new Set();S.hiddenCols=new Set();S.sortCol=-1;S.sortDir='asc';S.undoStack=[];S.redoStack=[];
    N('excel');showX();XR();
    toast('♻ Letzte Sitzung wiederhergestellt');L('Restore',S.xFn);
    return true;
  }catch(e){_appLog('autoRestore: '+e.message);return false}
}

// Auto-save after mutations
let _asTmr=null;
export function initAutoSaveHook() {
  const _origXR=window.XR;
  window.XR=function(){_origXR();if(S.xH.length){clearTimeout(_asTmr);_asTmr=setTimeout(autoSave,2000)}};
}

// ══════ QUICK SEARCH (Ctrl+F) ══════
let _qsMatches=[];let _qsIdx=-1;
export function qSearchOpen(){$('qsearch').classList.add('show');$('qs-input').focus();$('qs-input').select()}
export function qSearchClose(){$('qsearch').classList.remove('show');$('qs-input').value='';_qsMatches=[];_qsIdx=-1;$('qs-info').textContent='';XR()}
export function qSearch(val){
  _qsMatches=[];_qsIdx=-1;
  if(!val.trim()||!S.xH.length){$('qs-info').textContent='';XR();return}
  const q=val.toLowerCase();
  S.xD.forEach((row,ri)=>{row.forEach((c,ci)=>{if(String(c).toLowerCase().includes(q))_qsMatches.push({r:ri,c:ci})})});
  $('qs-info').textContent=_qsMatches.length?_qsMatches.length+' Treffer':'0';
  // Highlight matches in table
  XR();
  _qsMatches.forEach(m=>{const td=$(`c${m.r}-${m.c}`);if(td)td.style.background='rgba(240,165,0,.2)'});
  if(_qsMatches.length){_qsIdx=0;const f=$(`c${_qsMatches[0].r}-${_qsMatches[0].c}`);if(f)f.scrollIntoView({block:'center'})}
}
