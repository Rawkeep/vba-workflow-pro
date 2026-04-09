export const VBA_BEAST_VERSION='3.1.0';
export let S={xH:[],xD:[],xFn:'',xBak:null,wH:[],wD:[],wI:false,wPv:null,log:[],chart:null,filtered:false,
calcCols:[],savedCases:[],savedIE:[],savedSW:[],savedRules:[],macros:[],macRec:false,macSteps:[],pipelines:[],pipeSteps:[],
selectedRows:new Set(),hiddenCols:new Set(),sortCol:-1,sortDir:'asc',undoStack:[],redoStack:[],
// Hybrid: Workspace + Schreibtisch
mode:'workspace', // 'desk' or 'workspace'
usage:{},recentFiles:[],favorites:[],activeWS:null,_errLog:[],
// Email
smtpCfg:null,imapCfg:null,imapRules:null,emailStatus:[],imapWatchActive:false,imapForwards:[]};
// ══════ APP ERROR LOG ══════
export function _appLog(msg){S._errLog.push({t:new Date().toISOString(),m:msg});if(S._errLog.length>100)S._errLog.shift();console.warn('[VBA-BEAST]',msg)}
// ══════ PERFORMANCE: Type/Quality Cache ══════
export let _typeCache=null,_typeCacheKey='';
export let _qualCache=null,_qualCacheKey='';
export function _cacheKey(){
  // Content-based cache key: uses first+last row + lengths (avoids undo-stack dependency)
  const last=S.xD[S.xD.length-1];
  return S.xD.length+':'+S.xH.length+':'+(S.xD[0]?S.xD[0].slice(0,3).join(','):'')+(last?':'+last.slice(0,3).join(','):'')
}
export const _origDetectColTypes_cache=null; // will be overridden after detectColTypes is defined
