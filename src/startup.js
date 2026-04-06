import { S } from './store.js';
import { VBA_BEAST_VERSION } from './store.js';
import { $ } from './utils.js';
import { _appLog } from './store.js';
import { N } from './nav.js';
import { IDB } from './idb.js';
import { handleCheckoutReturn, syncEntitlement } from './paywall.js';

// TODO: cross-module dependency — _hydrateWorkspaces, restoreHybridState, setMode, renderRecentFiles, renderSavedWSOnboard are defined in hybrid/index.js
// TODO: cross-module dependency — _hydrateTemplates, renderSavedTemplates is defined in word/ or templates/
// TODO: cross-module dependency — _hydrateDocConfig, _renderLetterheadPreview, _docxFooter are defined in word/
// TODO: cross-module dependency — _hydrateDokCenter, dcInitUI are defined in doccenter/
// TODO: cross-module dependency — _hydrateDatabase is defined in database/index.js
// TODO: cross-module dependency — autoRestore is defined in ui/auto-save.js
// TODO: cross-module dependency — RL, checkSEM are defined in nav.js or other modules
// TODO: cross-module dependency — updateDashboard is defined in dashboard/index.js
// TODO: cross-module dependency — tourStart is defined in ui/tour.js

// ══════ STARTUP (async IndexedDB) ══════
(async function _startup(){
  try{
    await IDB.open();
    await Promise.all([_hydrateWorkspaces(),_hydrateTemplates(),restoreHybridState(),_hydrateDocConfig(),_hydrateDokCenter(),_hydrateDatabase()]);
    setMode(S.mode||'workspace');
    renderRecentFiles();
    renderSavedWSOnboard();
    renderSavedTemplates();
    _renderLetterheadPreview();
    if(_docxFooter&&$('w-footer-input'))$('w-footer-input').value=_docxFooter;
    dcInitUI();
    const restored=await autoRestore();
    if(!restored){/* Show welcome state */}
    RL();checkSEM();
    updateDashboard();
    handleCheckoutReturn();
    syncEntitlement();
    if(!localStorage.getItem('vbaBeastTourDone'))setTimeout(tourStart,800);
  }catch(e){
    _appLog('Startup: '+e.message);
    // Fallback: show app without restored data
    setMode(S.mode||'workspace');
    RL();checkSEM();updateDashboard();
  }
})();
// ══════ PWA SERVICE WORKER ══════
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(e=>_appLog('SW: '+e.message))}
// ══════ VERSION DISPLAY ══════
if($('sb-foot')){const vEl=document.createElement('div');vEl.style.cssText='font:500 9px var(--mono);color:var(--tx3);margin-top:4px';vEl.textContent='v'+VBA_BEAST_VERSION;$('sb-foot').appendChild(vEl)}
