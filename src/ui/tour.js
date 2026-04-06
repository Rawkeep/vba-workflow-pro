// ══════ GUIDED TOUR ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: N is a cross-module dependency from core (navigation)

export const TOUR_STEPS=[
  {sel:'#sb-nav',title:'📍 Navigation',text:'Wechsle zwischen Excel, Word, Dokumenten-Center, E-Mail und mehr. Bei eingeklappter Sidebar zeigen Tooltips den Namen.',pos:'right'},
  {sel:'#x-empty, #x-tbl',title:'📊 Excel-Bereich',text:'Ziehe eine XLSX-/CSV-Datei hierher oder klicke Import. Alle Daten bleiben lokal auf deinem Rechner.',pos:'bottom'},
  {sel:'#x-tabs',title:'⚡ Daten transformieren',text:'Sortieren, Filtern, SELECT CASE, IF/ELSE, Formeln, Pivot, Charts — über 25 Funktionen direkt verfügbar.',pos:'bottom',nav:'excel'},
  {sel:'#p-word h2',title:'✉ Serienbriefe',text:'Erstelle echte DOCX-Dateien mit Platzhaltern aus deinen Excel-Daten. Briefkopf und Footer werden automatisch eingebettet.',pos:'bottom',nav:'word'},
  {sel:'#p-doccenter h2',title:'📁 Dokumenten-Center',text:'Verwalte Vorlagen nach Kategorie (Gefahrgut, Labels, Formulare). Definiere Trigger-Regeln und generiere Dokumente automatisch per Batch.',pos:'bottom',nav:'doccenter'},
  {sel:'#theme-toggle',title:'🎨 Design',text:'Wechsle zwischen Dark und Light Mode — je nach Vorliebe.',pos:'left'}
];
let _tourIdx=-1;
export function tourStart(){
  _tourIdx=0;
  document.getElementById('tour-overlay').style.display='block';
  document.getElementById('tour-spot').style.display='block';
  document.getElementById('tour-tip').style.display='block';
  _tourShow();
}
function _tourShow(){
  const step=TOUR_STEPS[_tourIdx];
  if(!step){tourEnd();return}
  if(step.nav)N(step.nav);
  setTimeout(()=>{
    const el=document.querySelector(step.sel);
    if(!el){_tourIdx++;_tourShow();return}
    const r=el.getBoundingClientRect();
    const spot=document.getElementById('tour-spot');
    spot.style.left=(r.left-8)+'px';
    spot.style.top=(r.top-8)+'px';
    spot.style.width=(r.width+16)+'px';
    spot.style.height=(r.height+16)+'px';
    const tip=document.getElementById('tour-tip');
    const dots=TOUR_STEPS.map((_,i)=>`<div class="tour-dot${i===_tourIdx?' a':''}"></div>`).join('');
    tip.innerHTML=`<h4>${step.title}</h4><p>${step.text}</p><div class="tour-dots">${dots}</div><div class="tour-nav"><span class="tour-step">${_tourIdx+1} / ${TOUR_STEPS.length}</span><div style="display:flex;gap:6px">${_tourIdx>0?'<button class="b bo bs" onclick="tourPrev()">← Zurück</button>':''}<button class="b bp bs" onclick="tourNext()">${_tourIdx<TOUR_STEPS.length-1?'Weiter →':'✓ Fertig'}</button><button class="b bo bs" onclick="tourEnd()">Überspringen</button></div></div>`;
    // Position tooltip
    if(step.pos==='right'){tip.style.left=(r.right+20)+'px';tip.style.top=r.top+'px';tip.style.right='auto';tip.style.bottom='auto'}
    else if(step.pos==='left'){tip.style.left='auto';tip.style.right=(innerWidth-r.left+20)+'px';tip.style.top=r.top+'px';tip.style.bottom='auto'}
    else if(step.pos==='bottom'){tip.style.left=Math.min(r.left,innerWidth-400)+'px';tip.style.top=(r.bottom+16)+'px';tip.style.right='auto';tip.style.bottom='auto'}
    else{tip.style.left=Math.min(r.left,innerWidth-400)+'px';tip.style.top='auto';tip.style.bottom=(innerHeight-r.top+16)+'px';tip.style.right='auto'}
    // Ensure on screen
    const tr=tip.getBoundingClientRect();
    if(tr.right>innerWidth-10)tip.style.left=(innerWidth-tr.width-20)+'px';
    if(tr.bottom>innerHeight-10)tip.style.top=(innerHeight-tr.height-20)+'px';
    if(tr.left<10)tip.style.left='10px';
    if(tr.top<10)tip.style.top='10px';
  },step.nav?250:50);
}
export function tourNext(){_tourIdx++;if(_tourIdx>=TOUR_STEPS.length){tourEnd()}else{_tourShow()}}
export function tourPrev(){if(_tourIdx>0){_tourIdx--;_tourShow()}}
export function tourEnd(){
  _tourIdx=-1;
  document.getElementById('tour-overlay').style.display='none';
  document.getElementById('tour-spot').style.display='none';
  document.getElementById('tour-tip').style.display='none';
  localStorage.setItem('vbaBeastTourDone','1');
  N('home');
}
