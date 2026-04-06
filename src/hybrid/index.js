import { S, _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, A, L } from '../nav.js';
import { IDB } from '../idb.js';

// TODO: cross-module dependency — XT, XE, XPDF, DEMOS, loadDemo, showX, XR, N are defined in other modules
// TODO: cross-module dependency — autoRestore is defined in ui/auto-save.js
// TODO: cross-module dependency — pushUndo is defined in ui/undo-redo.js

// ══════ HYBRID: USAGE TRACKING ══════
const FEATURE_MAP={
  sort:{label:'Sortieren',ico:'↕',tab:'xtp-sort',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-sort\')"]')?.click()},
  filter:{label:'Filtern',ico:'🔽',tab:'xtp-filter',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-filter\')"]')?.click()},
  snr:{label:'Suchen & Ersetzen',ico:'🔍',tab:'xtp-fnr',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-fnr\')"]')?.click()},
  text:{label:'Textfunktionen',ico:'Aa',tab:'xtp-txtfn',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-txtfn\')"]')?.click()},
  dedup:{label:'Duplikate',ico:'🧹',tab:'xtp-dedup',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-dedup\')"]')?.click()},
  case:{label:'SELECT CASE',ico:'🔀',tab:'xtp-case',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-case\')"]')?.click()},
  ifelse:{label:'IF/ELSE',ico:'⚡',tab:'xtp-ifelse',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-ifelse\')"]')?.click()},
  calc:{label:'Berechnet',ico:'🧮',tab:'xtp-calc',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-calc\')"]')?.click()},
  pipe:{label:'Pipeline',ico:'🔗',tab:'xtp-pipe',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-pipe\')"]')?.click()},
  pivot:{label:'Pivot',ico:'📊',tab:'xtp-pivot',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-pivot\')"]')?.click()},
  chart:{label:'Charts',ico:'📈',tab:'xtp-chart',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-chart\')"]')?.click()},
  vlookup:{label:'VLOOKUP',ico:'🔗',tab:'xtp-vlook',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-vlook\')"]')?.click()},
  valid:{label:'Prüfen',ico:'✓',tab:'xtp-valid',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-valid\')"]')?.click()},
  switch:{label:'SWITCH',ico:'🔄',tab:'xtp-switch',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-switch\')"]')?.click()},
  export:{label:'Export XLSX',ico:'⬇',fn:()=>XE()},
  pdf:{label:'PDF Export',ico:'📄',fn:()=>XPDF()},
  macro:{label:'Makros',ico:'⏺',tab:'xtp-macro',fn:()=>document.querySelector('[onclick*="XT(this,\'xtp-macro\')"]')?.click()},
};
export function trackUsage(feature){
  if(!S.usage)S.usage={};
  S.usage[feature]=(S.usage[feature]||0)+1;
  saveHybridState();
  updateQuickActions();
}
export function getTopFeatures(n){
  if(!S.usage)return[];
  return Object.entries(S.usage).sort((a,b)=>b[1]-a[1]).slice(0,n||6);
}
export function updateQuickActions(){
  const qa=$('quick-actions');if(!qa)return;
  if(S.mode==='desk'||!S.xH.length){qa.classList.remove('show');return}
  const top=getTopFeatures(6);
  if(top.length<2){qa.classList.remove('show');return}
  qa.classList.add('show');
  let html='<span class="qa-label">Häufig →</span>';
  top.forEach(([key,count])=>{
    const f=FEATURE_MAP[key];if(!f)return;
    html+=`<button class="qa-btn" onclick="qaRun('${key}')">${f.ico} ${f.label} <span class="qa-count">${count}×</span></button>`;
  });
  qa.innerHTML=html;
}
export function qaRun(key){
  const f=FEATURE_MAP[key];if(!f)return;
  if(f.tab){N('excel');setTimeout(()=>f.fn&&f.fn(),50)}
  else if(f.fn)f.fn();
}

// ══════ HYBRID: RECENT FILES ══════
export function addRecentFile(name,rows,cols){
  if(!S.recentFiles)S.recentFiles=[];
  S.recentFiles=S.recentFiles.filter(f=>f.name!==name);
  S.recentFiles.unshift({name,rows,cols,ts:Date.now()});
  if(S.recentFiles.length>10)S.recentFiles.pop();
  saveHybridState();
  renderRecentFiles();
}
export function renderRecentFiles(){
  const sec=$('recent-files-section');const list=$('recent-files-list');
  const wsRec=$('ws-recent');
  if(!S.recentFiles||!S.recentFiles.length){
    if(sec)sec.style.display='none';
    if(wsRec)wsRec.innerHTML='<p style="font-size:11px;color:var(--tx3)">Noch keine Dateien geöffnet</p>';
    return;
  }
  if(sec)sec.style.display='';
  const makeHTML=(compact)=>S.recentFiles.slice(0,compact?5:10).map(f=>{
    const ago=timeAgo(f.ts);
    return `<div class="recent-item" onclick="restoreRecent('${H(f.name)}')"><span class="ri-ico">📄</span><span class="ri-name">${H(f.name)}</span><span class="ri-size">${f.rows}×${f.cols}</span><span class="ri-time">${ago}</span></div>`;
  }).join('');
  if(list)list.innerHTML=makeHTML(false);
  if(wsRec)wsRec.innerHTML=makeHTML(true);
}
export function timeAgo(ts){
  const d=Date.now()-ts;
  if(d<60000)return 'gerade';
  if(d<3600000)return Math.floor(d/60000)+'m';
  if(d<86400000)return Math.floor(d/3600000)+'h';
  return Math.floor(d/86400000)+'d';
}
export async function restoreRecent(name){
  // Try to restore from workspace
  const ws=loadWorkspaces();
  const found=ws.find(w=>w.data.xFn===name);
  if(found){loadWorkspaceByName(found.name);return}
  // Try auto-save from IndexedDB
  try{
    const d=await IDB.get('autoSave','current');
    if(d&&d.xFn===name){await autoRestore();return}
  }catch(e){_appLog('restoreRecent: '+e.message)}
  toast('Datei "'+name+'" nicht mehr verfügbar — bitte erneut importieren');
}

// ══════ HYBRID: WORKSPACES ══════
// Workspace cache for sync access (hydrated on startup)
let _wsCache=[];let _wsCacheReady=false;
export function loadWorkspaces(){return _wsCache}
export function saveWorkspaces(ws){
  _wsCache=ws;
  IDB.put('workspaces','all',ws).catch(e=>{toast('Speicher-Fehler');_appLog('saveWS: '+e.message)});
}
export async function _hydrateWorkspaces(){
  try{
    // Migrate from localStorage
    const legacy=localStorage.getItem('vbaBeastWorkspaces');
    if(legacy){const ld=JSON.parse(legacy);await IDB.put('workspaces','all',ld);localStorage.removeItem('vbaBeastWorkspaces');_wsCache=ld}
    else{_wsCache=await IDB.get('workspaces','all')||[]}
    _wsCacheReady=true;
  }catch(e){_wsCache=[];_wsCacheReady=true;_appLog('hydrateWS: '+e.message)}
}
export function saveWorkspace(){
  const input=$('ws-name-input');
  let name=(input?input.value:'').trim();
  if(!name)name=S.xFn||'Workspace '+(loadWorkspaces().length+1);
  if(!S.xH.length){toast('Keine Daten zum Speichern');return}
  const ws=loadWorkspaces();
  const existing=ws.findIndex(w=>w.name===name);
  const entry={
    name,ts:Date.now(),
    data:{xH:S.xH,xD:S.xD,xFn:S.xFn,savedCases:S.savedCases,savedIE:S.savedIE,savedSW:S.savedSW,
          calcCols:S.calcCols,pipelines:S.pipelines,usage:S.usage,favorites:S.favorites},
    meta:{rows:S.xD.length,cols:S.xH.length}
  };
  if(existing>=0)ws[existing]=entry;else ws.push(entry);
  saveWorkspaces(ws);
  S.activeWS=name;
  if(input)input.value='';
  renderWSList();renderSavedWSOnboard();
  toast('💾 Workspace "'+name+'" gespeichert');
}
export function loadWorkspaceByName(name){
  const ws=loadWorkspaces();
  const w=ws.find(w=>w.name===name);if(!w)return;
  S.xH=w.data.xH;S.xD=w.data.xD;S.xFn=w.data.xFn||name;
  S.savedCases=w.data.savedCases||[];S.savedIE=w.data.savedIE||[];S.savedSW=w.data.savedSW||[];
  S.calcCols=w.data.calcCols||[];S.pipelines=w.data.pipelines||[];
  if(w.data.usage)S.usage=w.data.usage;
  if(w.data.favorites)S.favorites=w.data.favorites;
  S.selectedRows=new Set();S.hiddenCols=new Set();S.sortCol=-1;S.sortDir='asc';S.undoStack=[];S.redoStack=[];
  S.activeWS=name;
  N('excel');showX();XR();
  renderWSList();updateQuickActions();
  toast('📂 "'+name+'" geladen');
}
export function deleteWorkspace(name){
  let ws=loadWorkspaces();
  ws=ws.filter(w=>w.name!==name);
  saveWorkspaces(ws);
  if(S.activeWS===name)S.activeWS=null;
  renderWSList();renderSavedWSOnboard();
  toast('Workspace "'+name+'" gelöscht');
}
export function renameWorkspace(oldName){
  const nn=prompt('Workspace umbenennen:',oldName);
  if(!nn||nn===oldName)return;
  const ws=loadWorkspaces();
  const w=ws.find(w=>w.name===oldName);if(!w)return;
  w.name=nn;w.ts=Date.now();
  saveWorkspaces(ws);
  if(S.activeWS===oldName)S.activeWS=nn;
  renderWSList();renderSavedWSOnboard();
}
export function renderWSList(){
  const list=$('ws-list');if(!list)return;
  const ws=loadWorkspaces();
  if(!ws.length){list.innerHTML='<p style="font-size:11px;color:var(--tx3);text-align:center">Noch keine Workspaces gespeichert</p>';return}
  list.innerHTML=ws.map(w=>`<div class="ws-card${S.activeWS===w.name?' active':''}">
    <div class="ws-name">${H(w.name)}</div>
    <div class="ws-meta">${w.meta.rows} Zeilen · ${w.meta.cols} Spalten · ${timeAgo(w.ts)}</div>
    <div class="ws-actions">
      <button class="b bg bs" onclick="loadWorkspaceByName('${A(w.name)}')">Laden</button>
      <button class="b bo bs" onclick="renameWorkspace('${A(w.name)}')">✏</button>
      <button class="b bd bs" onclick="deleteWorkspace('${A(w.name)}')">✕</button>
    </div></div>`).join('');
}
export function renderSavedWSOnboard(){
  const sec=$('saved-ws-section');const list=$('saved-ws-list');
  if(!sec||!list)return;
  const ws=loadWorkspaces();
  if(!ws.length){sec.style.display='none';return}
  sec.style.display='';
  list.innerHTML=ws.slice(0,4).map(w=>`<div class="recent-item" onclick="loadWorkspaceByName('${A(w.name)}')">
    <span class="ri-ico">💾</span><span class="ri-name">${H(w.name)}</span>
    <span class="ri-size">${w.meta.rows}×${w.meta.cols}</span><span class="ri-time">${timeAgo(w.ts)}</span>
  </div>`).join('');
}
export function toggleWSPanel(){
  const p=$('ws-panel');
  if(p.classList.contains('show')){p.classList.remove('show')}
  else{p.classList.add('show');renderWSList();renderRecentFiles()}
}

// ══════ HYBRID: FAVORITES ══════
export function toggleFavorite(type,name){
  if(!S.favorites)S.favorites=[];
  const key=type+':'+name;
  const idx=S.favorites.indexOf(key);
  if(idx>=0)S.favorites.splice(idx,1);else S.favorites.push(key);
  saveHybridState();
  renderFavorites();
}
export function isFavorite(type,name){return S.favorites&&S.favorites.includes(type+':'+name)}
export function renderFavorites(){
  // Update star icons on saved rules
  document.querySelectorAll('.fav-star').forEach(el=>{
    const key=el.dataset.favKey;
    if(key&&S.favorites&&S.favorites.includes(key))el.classList.add('active');
    else el.classList.remove('active');
  });
}

// ══════ HYBRID: MODE TOGGLE ══════
export function setMode(mode){
  S.mode=mode;
  document.querySelectorAll('.mode-toggle .mt-opt').forEach(el=>{
    el.classList.toggle('active',el.dataset.mode===mode);
  });
  const wsBtn=$('sb-ws-btn');
  if(wsBtn)wsBtn.style.display=mode==='workspace'?'':'none';
  // In desk mode: hide quick actions, workspace panel
  if(mode==='desk'){
    $('quick-actions')?.classList.remove('show');
    $('ws-panel')?.classList.remove('show');
  }else{
    updateQuickActions();
  }
  saveHybridState();
}

// ══════ HYBRID: PERSISTENCE (IndexedDB) ══════
export function saveHybridState(){
  const state={usage:S.usage,recentFiles:S.recentFiles,favorites:S.favorites,mode:S.mode,activeWS:S.activeWS};
  IDB.put('hybrid','state',state).catch(e=>_appLog('saveHybrid: '+e.message));
}
export async function restoreHybridState(){
  try{
    // Migrate from localStorage
    const legacy=localStorage.getItem('vbaBeastHybrid');
    if(legacy){const ld=JSON.parse(legacy);await IDB.put('hybrid','state',ld);localStorage.removeItem('vbaBeastHybrid')}
    const state=await IDB.get('hybrid','state');
    if(!state)return;
    if(state.usage)S.usage=state.usage;
    if(state.recentFiles)S.recentFiles=state.recentFiles;
    if(state.favorites)S.favorites=state.favorites;
    if(state.mode)S.mode=state.mode;
    if(state.activeWS)S.activeWS=state.activeWS;
  }catch(e){_appLog('restoreHybrid: '+e.message)}
}

// ══════ HOOK INTO EXISTING FUNCTIONS ══════
// Track feature usage when tabs are clicked
// TODO: cross-module dependency — XT is defined in excel/render.js or nav.js
const _origXT=typeof XT==='function'?XT:null;
if(_origXT){
  const tabToFeature={
    'xtp-sort':'sort','xtp-filter':'filter','xtp-fnr':'snr','xtp-txtfn':'text',
    'xtp-dedup':'dedup','xtp-case':'case','xtp-ifelse':'ifelse','xtp-calc':'calc',
    'xtp-pipe':'pipe','xtp-pivot':'pivot','xtp-chart':'chart','xtp-vlook':'vlookup',
    'xtp-valid':'valid','xtp-switch':'switch','xtp-macro':'macro'
  };
  XT=function(el,panelId){
    _origXT(el,panelId);
    const feat=tabToFeature[panelId];
    if(feat)trackUsage(feat);
  };
}
// Track exports
// TODO: cross-module dependency — XE is defined in excel/export.js
// TODO: cross-module dependency — XPDF is defined in excel/export.js
const _origXE2=XE;XE=function(){_origXE2();trackUsage('export')};
const _origXPDF2=XPDF;XPDF=function(){_origXPDF2();trackUsage('pdf')};

// Track file loads — hook into loadSheet and loadDemo
// TODO: cross-module dependency — loadDemo, DEMOS are defined in ui/demo-data.js
const _origLoadDemo=loadDemo;
loadDemo=function(key){
  _origLoadDemo(key);
  const d=DEMOS[key||'sendungen'];
  if(d)addRecentFile(d.name,d.d.length,d.h.length);
};

// Hook into showX to also show workspace button and quick actions
// TODO: cross-module dependency — showX is defined in excel/render.js
const _origShowX2=showX;
showX=function(){
  _origShowX2();
  if(S.mode==='workspace')updateQuickActions();
  addRecentFile(S.xFn,S.xD.length,S.xH.length);
};
