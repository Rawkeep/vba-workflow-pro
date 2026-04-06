import { $ } from './utils.js';
import { S } from './store.js';

export const NAV=[{id:'home',l:'Dashboard',ico:'<path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-4 0v-6a1 1 0 011-1h2a1 1 0 011 1v6"/>'},{id:'excel',l:'Excel',ico:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'},{id:'word',l:'Word',ico:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>'},{id:'doccenter',l:'Dok-Center',ico:'<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>'},{id:'email',l:'E-Mail',ico:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>'},{id:'database',l:'Datenbank',ico:'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v4c0 1.66 3.58 3 8 3s8-1.34 8-3V8"/><path d="M4 12v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4"/>'},{id:'dsgvo',l:'Datenschutz',ico:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'},{id:'guide',l:'Anleitung',ico:'<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'}];
$('sb-nav').innerHTML=NAV.map(n=>`<div class="ni${n.id==='home'?' a':''}" data-p="${n.id}" onclick="N('${n.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();N('${n.id}')}" role="button" aria-label="${n.l}" title="${n.l}" tabindex="0"><svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">${n.ico}</svg><span class="nl">${n.l}</span></div>`).join('');
$('home-cards').innerHTML=NAV.slice(1,-1).map(n=>`<div class="cd" style="cursor:pointer;padding:12px 14px" onclick="N('${n.id}')" onmouseenter="this.style.borderColor='var(--acc)'" onmouseleave="this.style.borderColor='var(--bdr)'"><svg width="18" height="18" fill="none" stroke="var(--acc)" stroke-width="2" viewBox="0 0 24 24" style="margin-bottom:4px">${n.ico}</svg><h3 style="color:var(--acc);font-size:11px">${n.l}</h3></div>`).join('');
const _pgEls=document.querySelectorAll('.pg');const _niEls=document.querySelectorAll('.ni');

// ══════ NAVIGATION HISTORY ══════
const _navHistory=[];
let _navIdx=-1;
let _navSkipPush=false;
const _navLabels={home:'Dashboard',excel:'Excel',word:'Word',doccenter:'Dok-Center',database:'Datenbank',email:'E-Mail',dsgvo:'Datenschutz',guide:'Anleitung'};

function _navPush(p){
  if(_navSkipPush)return;
  // If we're not at the end, truncate forward history
  if(_navIdx<_navHistory.length-1)_navHistory.length=_navIdx+1;
  // Don't push duplicate
  if(_navHistory[_navHistory.length-1]===p)return;
  _navHistory.push(p);
  if(_navHistory.length>50)_navHistory.shift(); // limit
  _navIdx=_navHistory.length-1;
  _updateNavBtns();
  try{history.pushState({page:p},'','')}catch(e){}
}
export function navBack(){
  if(_navIdx<=0)return;
  _navIdx--;
  _navSkipPush=true;
  N(_navHistory[_navIdx]);
  _navSkipPush=false;
  _updateNavBtns();
}
export function navForward(){
  if(_navIdx>=_navHistory.length-1)return;
  _navIdx++;
  _navSkipPush=true;
  N(_navHistory[_navIdx]);
  _navSkipPush=false;
  _updateNavBtns();
}
function _updateNavBtns(){
  const back=$('nav-back'),fwd=$('nav-fwd'),crumb=$('nav-crumb');
  if(back)back.disabled=_navIdx<=0;
  if(fwd)fwd.disabled=_navIdx>=_navHistory.length-1;
  if(crumb){
    const cur=_navHistory[_navIdx];
    crumb.textContent=_navLabels[cur]||cur||'';
  }
}
// Browser history integration
window.addEventListener('popstate',e=>{
  if(e.state&&e.state.page){
    _navSkipPush=true;
    N(e.state.page);
    _navSkipPush=false;
    // Sync internal index
    const idx=_navHistory.indexOf(e.state.page);
    if(idx>=0)_navIdx=idx;
    _updateNavBtns();
  }
});

export function N(p){_navPush(p);_pgEls.forEach(e=>e.classList.remove('a'));_niEls.forEach(e=>e.classList.remove('a'));$('p-'+p).classList.add('a');document.querySelector(`.ni[data-p="${p}"]`).classList.add('a');if(innerWidth<=700)$('sb').classList.remove('o');if(p==='excel'&&S.xH.length){showX();XR()}if(p==='doccenter'){dcRenderTemplates();dcRenderCategories()}}
_navPush('home'); // Initial page
export function T(){$('sb').classList.toggle('o')}
export function toggleTheme(){const b=document.body,t=$('theme-toggle');b.classList.toggle('light');const isLight=b.classList.contains('light');t.innerHTML=isLight?'☀️ Light':'🌙 Dark';localStorage.setItem('vbaBeastTheme',isLight?'light':'dark')}
(function(){const saved=localStorage.getItem('vbaBeastTheme');if(saved==='light'){document.body.classList.add('light');$('theme-toggle').innerHTML='☀️ Light'}})()
export function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
export const _hDiv=document.createElement('div');export function H(s){_hDiv.textContent=s;return _hDiv.innerHTML}
export function A(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/`/g,'&#96;')}
export function L(a,d){S.log.push({a,d,t:new Date().toISOString()});RL()}
export function RL(){$('lc').textContent=S.log.length;$('dl-tbl').innerHTML=S.log.length?'<div class="tw" style="max-height:220px"><table><thead><tr><th class="d">Zeit</th><th class="d">Aktion</th><th class="d">Details</th></tr></thead><tbody>'+[...S.log].reverse().map(l=>`<tr><td style="color:var(--tx2)">${H(new Date(l.t).toLocaleString('de-DE'))}</td><td><span class="tg tg-${l.a.includes('LÖSCH')?'r':'a'}">${H(l.a)}</span></td><td style="color:var(--tx2)">${H(l.d)}</td></tr>`).join('')+'</tbody></table></div>':'<p style="color:var(--tx2);font-size:12px">—</p>'}
export function macLog(action,params){if(S.macRec)S.macSteps.push({action,params})}
export function colOpts(){return'<option value="">Spalte…</option>'+S.xH.map(h=>`<option value="${A(h)}">${H(h)}</option>`).join('')}
