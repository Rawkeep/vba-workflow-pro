import { S } from '../store.js';
import { $ } from '../utils.js';
import { H } from '../nav.js';

// TODO: cross-module dependency — loadWorkspaces is defined in hybrid/index.js
// TODO: cross-module dependency — timeAgo is defined in hybrid/index.js

// ══════════════════════════════════════════════════════
// ═══ DASHBOARD ENGINE ═══
// ══════════════════════════════════════════════════════
let _dashActivity=[];
export function updateDashboard(){
  // KPI stats
  const rows=S.xD?S.xD.length:0;
  const cols=S.xH?S.xH.length:0;
  $('dk-rows').textContent=rows.toLocaleString('de-DE');
  $('dk-cols').textContent=cols;
  // Quality with color coding
  if(rows&&cols){
    let filled=0,total=rows*cols;
    S.xD.forEach(r=>r.forEach(c=>{if(c!==''&&c!==null&&c!==undefined)filled++}));
    const q=Math.round(filled/total*100);
    const qEl=$('dk-quality');
    qEl.textContent=q+'%';
    qEl.style.color=q>=90?'var(--grn)':q>=70?'var(--ora)':'var(--red)';
    qEl.parentElement.querySelector('.dk-bar').style.width=q+'%';
    qEl.parentElement.querySelector('.dk-bar').style.background=
      q>=90?'linear-gradient(90deg,var(--grn),var(--cyn))':
      q>=70?'linear-gradient(90deg,var(--ora),var(--acc))':
      'linear-gradient(90deg,var(--red),var(--ora))';
  } else { $('dk-quality').textContent='—'; }
  // Logarithmic scaling for rows KPI (better visual for small+large datasets)
  $('dk-rows').parentElement.querySelector('.dk-bar').style.width=rows?Math.min(Math.log10(rows+1)/5*100,100)+'%':'0';
  $('dk-cols').parentElement.querySelector('.dk-bar').style.width=Math.min(cols/20*100,100)+'%';
  // Actions today
  const today=new Date().toISOString().slice(0,10);
  const todayActions=S.log.filter(l=>l.t&&l.t.startsWith(today)).length;
  $('dk-actions').textContent=todayActions;
  $('dk-actions').parentElement.querySelector('.dk-bar').style.width=Math.min(todayActions/20*100,100)+'%';
  // Workspaces
  const ws=window.loadWorkspaces();
  $('dk-ws').textContent=Object.keys(ws).length;
  $('dk-ws').parentElement.querySelector('.dk-bar').style.width=Math.min(Object.keys(ws).length/5*100,100)+'%';
  // File info badge
  const fileInfo=$('dash-file-info');
  if(fileInfo){
    if(S.xFn){fileInfo.innerHTML=`<span class="tg tg-a">📂 ${H(S.xFn)}</span> <span style="font:10px var(--mono);color:var(--tx3)">${rows.toLocaleString('de-DE')} Zeilen x ${cols} Spalten</span>`;fileInfo.style.display=''}
    else{fileInfo.style.display='none'}
  }
  // Workspaces grid
  const wsKeys=Object.keys(ws);
  if(wsKeys.length){
    $('dash-ws-wrap').style.display='';
    $('dash-ws-grid').innerHTML=wsKeys.map(k=>{
      const w=ws[k];
      return `<div class="dash-ws" onclick="loadWorkspaceByName('${k.replace(/'/g,"\\'")}')"><div class="dw-name">${H(k)}</div><div class="dw-meta">${w.xH?w.xH.length:0} Spalten · ${w.xD?w.xD.length:0} Zeilen</div></div>`;
    }).join('');
  } else { $('dash-ws-wrap').style.display='none'; }
  // Activity feed
  renderDashActivity();
}
export function addDashActivity(ico,txt){
  _dashActivity.unshift({ico,txt,t:Date.now()});
  if(_dashActivity.length>30)_dashActivity.pop();
  renderDashActivity();
}
export function renderDashActivity(){
  const el=$('dash-activity');
  if(!_dashActivity.length){
    el.innerHTML='<div class="empty-state"><div class="es-ico">📋</div><div class="es-msg">Noch keine Aktivitäten.<br>Importiere Daten oder lade eine Demo.</div><button class="b bp bs es-cta" onclick="N(\'excel\');loadDemo()">&#9654; Demo laden</button></div>';
    return;
  }
  el.innerHTML=_dashActivity.slice(0,20).map(a=>{
    const ago=window.timeAgo(a.t);
    return `<div class="dash-act"><span class="da-time">${ago}</span><span class="da-ico">${a.ico}</span><span class="da-txt">${H(a.txt)}</span></div>`;
  }).join('');
}
