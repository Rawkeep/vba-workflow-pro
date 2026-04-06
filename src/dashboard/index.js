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
  // Quality
  if(rows&&cols){
    let filled=0,total=rows*cols;
    S.xD.forEach(r=>r.forEach(c=>{if(c!==''&&c!==null&&c!==undefined)filled++}));
    const q=Math.round(filled/total*100);
    $('dk-quality').textContent=q+'%';
    $('dk-quality').parentElement.querySelector('.dk-bar').style.width=q+'%';
  } else { $('dk-quality').textContent='—'; }
  $('dk-rows').parentElement.querySelector('.dk-bar').style.width=Math.min(rows/100*100,100)+'%';
  $('dk-cols').parentElement.querySelector('.dk-bar').style.width=Math.min(cols/20*100,100)+'%';
  // Actions today
  const today=new Date().toISOString().slice(0,10);
  const todayActions=S.log.filter(l=>l.t&&l.t.startsWith(today)).length;
  $('dk-actions').textContent=todayActions;
  $('dk-actions').parentElement.querySelector('.dk-bar').style.width=Math.min(todayActions/20*100,100)+'%';
  // Workspaces
  const ws=loadWorkspaces();
  $('dk-ws').textContent=Object.keys(ws).length;
  $('dk-ws').parentElement.querySelector('.dk-bar').style.width=Math.min(Object.keys(ws).length/5*100,100)+'%';
  // Quick access
  $('dash-quick').style.display='';
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
  if(!_dashActivity.length){el.innerHTML='<p style="color:var(--tx2);font-size:11px">Noch keine Aktivitäten</p>';return}
  el.innerHTML=_dashActivity.slice(0,15).map(a=>{
    const ago=timeAgo(a.t);
    return `<div class="dash-act"><span class="da-time">${ago}</span><span class="da-ico">${a.ico}</span><span class="da-txt">${H(a.txt)}</span></div>`;
  }).join('');
}
