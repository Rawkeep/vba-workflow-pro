import { S } from './store.js';
import { VBA_BEAST_VERSION } from './store.js';
import { $ } from './utils.js';
import { _appLog } from './store.js';
import { N, RL } from './nav.js';
import { IDB } from './idb.js';
import { handleCheckoutReturn, syncEntitlement } from './paywall.js';

// Cross-module imports
import { _hydrateWorkspaces, restoreHybridState, setMode, renderRecentFiles, renderSavedWSOnboard } from './hybrid/index.js';
import { _hydrateTemplates, renderSavedTemplates, checkSEM } from './templates/index.js';
import { _hydrateDocConfig, _renderLetterheadPreview, _docxFooter } from './word/docx-builder.js';
import { _hydrateDokCenter, dcInitUI } from './doccenter/index.js';
import { _hydrateDatabase } from './database/index.js';
import { _hydrateMacros, renderMacList } from './excel/macros.js';
import { _hydrateCF, _hydrateComments, cfApply, applyComments, renderCFRules } from './excel/conditional-format.js';
import { _hydrateEmailConfig, renderSmtpSettings, renderImapSettings, renderImapRules } from './email/settings.js';
import { autoRestore } from './ui/auto-save.js';
import { updateDashboard } from './dashboard/index.js';
import { tourStart } from './ui/tour.js';
import { initWordWizard } from './word/wizard.js';
import { initEmailWizard } from './email/wizard.js';
import { initKeyboardShortcuts, initEnhancedKeyboard } from './ui/keyboard.js';
import { initDragDrop } from './ui/drag-drop.js';
import { initCmdPalette, smartResume, renderHeroQuickbar, wireEmptyStateCTAs } from './ui/quick-launch.js';

// ══════ STARTUP (async IndexedDB) ══════
(async function _startup(){
  try{
    await IDB.open();
    await Promise.all([_hydrateWorkspaces(),_hydrateTemplates(),restoreHybridState(),_hydrateDocConfig(),_hydrateDokCenter(),_hydrateDatabase(),_hydrateEmailConfig(),_hydrateMacros(),_hydrateCF(),_hydrateComments()]);
    setMode(S.mode||'workspace');
    renderRecentFiles();
    renderSavedWSOnboard();
    renderSavedTemplates();
    _renderLetterheadPreview();
    if(_docxFooter&&$('w-footer-input'))$('w-footer-input').value=_docxFooter;
    dcInitUI();renderMacList();renderCFRules();cfApply();applyComments();
    const restored=await autoRestore();
    if(!restored){/* Show welcome state */}
    RL();checkSEM();
    renderSmtpSettings();renderImapSettings();renderImapRules();
    // Wizards init after DOM paint settles
    setTimeout(()=>{initWordWizard();initEmailWizard()},0);
    updateDashboard();
    // ── Init previously-dead modules + Quick Launch ──
    initKeyboardShortcuts();
    initEnhancedKeyboard();
    initDragDrop();
    initCmdPalette();
    wireEmptyStateCTAs();
    smartResume();
    renderHeroQuickbar();
    handleCheckoutReturn();
    syncEntitlement();
    if(!localStorage.getItem('vbaBeastTourDone'))setTimeout(tourStart,800);
  }catch(e){
    _appLog('Startup: '+e.message);
    // Fallback: show app without restored data
    setMode(S.mode||'workspace');
    RL();checkSEM();updateDashboard();
    try{initKeyboardShortcuts();initEnhancedKeyboard();initDragDrop();initCmdPalette();wireEmptyStateCTAs();renderHeroQuickbar();}catch(_){}
  }
})();
// ══════ OFFLINE DETECTION ══════
window.addEventListener('offline',()=>{const b=$('email-offline-banner');if(b)b.style.display=''});
window.addEventListener('online',()=>{const b=$('email-offline-banner');if(b)b.style.display='none'});

// ══════ PWA SERVICE WORKER ══════
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(e=>_appLog('SW: '+e.message))}
// ══════ VERSION DISPLAY ══════
if($('sb-foot')){const vEl=document.createElement('div');vEl.style.cssText='font:500 9px var(--mono);color:var(--tx3);margin-top:4px';vEl.textContent='v'+VBA_BEAST_VERSION;$('sb-foot').appendChild(vEl)}
