// ══════ MISCELLANEOUS UI FUNCTIONS ══════
// Functions that were in the monolithic file but not yet extracted to a dedicated module
import { S } from '../store.js';
import { $ } from '../utils.js';
import { H } from '../nav.js';

// ── Chart Type ──
let _chartType='bar';
export function setChartType(type,btn){
  _chartType=type;
  document.querySelectorAll('.chart-type-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  $('ch-type').value=type;
  $('ch-data2').style.display=(type==='waterfall'||type==='line')?'':'none';
}
export function exportChartPNG(){
  const canvas=$('ch-canvas');
  if(!canvas)return;
  const link=document.createElement('a');
  link.download='chart_'+_chartType+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
}

// ── Error Log ──
export function renderErrLog(){
  const el=$('errlc');if(el)el.textContent=S._errLog.length;
  const tbl=$('err-tbl');if(!tbl)return;
  if(!S._errLog.length){tbl.innerHTML='<p style="color:var(--tx2);font-size:12px">Keine Fehler — alles OK</p>';return}
  tbl.innerHTML='<div class="tw" style="max-height:200px"><table><thead><tr><th class="d">Zeit</th><th class="d">Meldung</th></tr></thead><tbody>'+
    [...S._errLog].reverse().map(e=>`<tr><td style="color:var(--tx2);white-space:nowrap">${new Date(e.t).toLocaleString('de-DE')}</td><td style="color:var(--ora)">${H(e.m)}</td></tr>`).join('')+
    '</tbody></table></div>';
}

// ── Storage Usage ──
export async function renderLSUsage(){
  const el=$('ls-usage');if(!el)return;
  const u=await window.IDB.usage();
  const fmt=b=>b>1024*1024?(b/1024/1024).toFixed(1)+' MB':b>1024?(b/1024).toFixed(1)+' KB':b+' B';
  let html=`<strong>IndexedDB Speicher:</strong> ${fmt(u.used)} / ${fmt(u.max)} (${u.pct}%)<br>`;
  html+=`<div class="dp-bar-bg" style="margin:6px 0"><div class="dp-bar-fill" style="width:${Math.min(u.pct,100)}%;background:${u.pct>80?'var(--red)':u.pct>50?'var(--ora)':'var(--grn)'}"></div></div>`;
  html+='<strong>Stores:</strong><br>';
  for(const store of window.IDB._stores){
    try{const keys=await window.IDB.getAllKeys(store);html+=`<span style="color:var(--acc)">${store}</span>: ${keys.length} Einträge<br>`}catch(e){}
  }
  el.innerHTML=html;
}

// ── Contextual Help Tooltips ──
const HELP_TIPS={
  'trigger-regeln':'<strong>Trigger-Regeln</strong> verknüpfen Excel-Spalten mit Vorlagen.<br><br>Beispiel: Wenn Spalte <code>Gefahrgut</code> = <code>Ja</code>, dann wird automatisch die Gefahrgut-Vorlage generiert.<br><br>Operatoren: <code>= gleich</code>, <code>enthält</code>, <code>beginnt mit</code>',
  'select-case':'<strong>SELECT CASE</strong> prüft einen Wert gegen mehrere Fälle — wie eine Zuordnungstabelle.<br><br>Beispiel: Land DE → Incoterm DAP, Land US → FCA, sonst → EXW.<br><br>Unterstützt auch Vergleiche: <code>>1000</code>, <code>>=5000</code>',
  'if-else':'<strong>IF/ELSE</strong> erstellt mehrstufige Bedingungen mit AND/OR.<br><br>Beispiel: Wenn Land=DE UND Betrag>1000 → "Premium", sonst → "Standard"',
  'pipeline':'<strong>Pipeline</strong> verkettet mehrere Operationen automatisch nacheinander.<br><br>Beispiel: Filter → Sortieren → SELECT CASE → Export — alles in einem Klick.',
  'batch-export':'<strong>Batch-Export</strong> prüft jede Excel-Zeile gegen deine Trigger-Regeln und generiert automatisch alle passenden Dokumente als ZIP-Download.',
  'calc-cols':'<strong>Berechnete Spalten</strong> erstellen neue Spalten per Formel.<br><br>Syntax: <code>Menge * Preis</code>, <code>ROUND(x,2)</code>, <code>IF(x>1000,"A","B")</code>',
  'vorlagen':'<strong>Vorlagen</strong> sind DOCX-Dokumente mit <code>{{Platzhaltern}}</code>.<br><br>Die Platzhalter werden beim Export automatisch mit Excel-Daten befüllt. Lade ein bestehendes DOCX hoch oder erstelle manuell.',
  'briefkopf':'<strong>Briefkopf & Footer</strong> werden in jede generierte DOCX-Datei eingebettet.<br><br>Briefkopf: PNG/JPG Bild (Logo/Firmenkopf). Footer: Zentrierter Text am Seitenende.',
  'validierung':'<strong>Validierung</strong> erstellt eine Prüfspalte mit ✓/✗ Ergebnissen.<br><br>Prüft z.B. ob E-Mail gültig, Wert im Bereich, PLZ-Format korrekt, oder ob Duplikate existieren.'
};
export function showHelp(ev,key){
  const tip=document.getElementById('ctx-help-tip');
  if(!tip||!HELP_TIPS[key])return;
  tip.innerHTML=HELP_TIPS[key];
  tip.classList.add('show');
  const r=ev.target.getBoundingClientRect();
  tip.style.left=Math.min(r.right+10,innerWidth-360)+'px';
  tip.style.top=r.top+'px';
  const tr=tip.getBoundingClientRect();
  if(tr.bottom>innerHeight-10)tip.style.top=(innerHeight-tr.height-10)+'px';
}
export function hideHelp(){document.getElementById('ctx-help-tip').classList.remove('show')}
