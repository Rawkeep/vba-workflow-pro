import { S } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, L } from '../nav.js';
// TODO: import checkSEM, RW from word/templates module (not yet extracted)
// TODO: import mammoth, XLSX from vendor/globals

// ══════ WORD ══════
const _FIELD_ALIASES={'firma':['kunde','company','unternehmen','lieferant','supplier'],'name':['kunde','ansprechpartner','empfänger','recipient','kontakt'],'stadt':['ort','city','hafen','port'],'betrag':['betrag_eur','brutto','netto','summe','preis','wert','amount'],'nr':['sendungsnr','auftragsnr','rechnungsnr','bestellnr','id','number'],'datum':['date','erstellt','created'],'land':['country','staat'],'status':['zustand','state'],'gewicht':['gewicht_kg','weight'],'anrede':['titel','title'],'absender':['sender','von'],'betreff':['subject','thema'],'text':['inhalt','body','beschreibung','content']};
export function _fieldSimilarity(a,b){a=a.toLowerCase();b=b.toLowerCase();if(a===b)return 1;if(a.includes(b)||b.includes(a))return 0.7;
  // Check alias dictionary
  for(const[key,aliases]of Object.entries(_FIELD_ALIASES)){
    const group=[key,...aliases];
    if(group.some(g=>a.includes(g))&&group.some(g=>b.includes(g)))return 0.6;
  }
  const aW=a.split(/[_\-\s]+/),bW=b.split(/[_\-\s]+/);let shared=0;aW.forEach(w=>{if(bW.some(w2=>w2.includes(w)||w.includes(w2)))shared++});return shared/Math.max(aW.length,bW.length)}
export function _suggestField(placeholder){
  if(!S.wH.length)return null;
  let best=null,bestScore=0;
  S.wH.forEach(h=>{const sc=_fieldSimilarity(placeholder,h);if(sc>bestScore){bestScore=sc;best=h}});
  return bestScore>=0.3?best:null;
}
export function _replaceFieldInTpl(oldF,newF){
  const ta=$('w-tpl');
  ta.value=ta.value.replace(new RegExp(`\\{\\{\\s*${oldF.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'g'),`{{${newF}}}`);
  UP();toast(`{{${oldF}}} → {{${newF}}} ersetzt`);
}
export function UP(){const t=$('w-tpl').value,ms=t.match(/\{\{([^}]+)\}\}/g);if(!ms){$('w-ph').innerHTML='';const wb=$('w-ph-warn');if(wb){wb.style.display='none'}return}const cols=S.wH.map(h=>h.toLowerCase());$('w-ph').innerHTML=[...new Set(ms.map(m=>m.replace(/[{}]/g,'').trim()))].map(p=>{const ok=cols.includes(p.toLowerCase());if(ok)return`<span class="tg tg-g" title="✓ Spalte gefunden" style="cursor:help">{{${H(p)}}} ✓</span>`;const sug=_suggestField(p);const sugHtml=sug?` <span class="tg tg-y" style="cursor:pointer;font-size:9px" onclick="_replaceFieldInTpl('${p.replace(/'/g,"\\'")}','${sug.replace(/'/g,"\\'")}')" title="Klick: {{${p}}} → {{${sug}}} ersetzen">→ ${H(sug)}</span>`:'';return`<span class="tg tg-r" title="✗ Keine passende Spalte${sug?' — Vorschlag: '+sug:''}" style="cursor:pointer"${sug?` onclick="_replaceFieldInTpl('${p.replace(/'/g,"\\'")}','${sug.replace(/'/g,"\\'")}')"`:''}>{{${H(p)}}} ✗</span>${sugHtml}`}).join(' ');const nOk=[...new Set(ms.map(m=>m.replace(/[{}]/g,'').trim()))].filter(p=>!cols.includes(p.toLowerCase())).length;const wb=$('w-ph-warn');if(wb){wb.style.display=nOk?'':'none';wb.innerHTML=nOk?`⚠ ${nOk} Platzhalter ohne passende Datenspalte — <strong style="cursor:pointer;text-decoration:underline" onclick="_autoFixAllFields()">Alle automatisch zuordnen</strong>`:''}}UP();
export function _autoFixAllFields(){
  const t=$('w-tpl').value;const ms=t.match(/\{\{([^}]+)\}\}/g);if(!ms)return;
  const cols=S.wH.map(h=>h.toLowerCase());
  let fixed=0;const ta=$('w-tpl');
  [...new Set(ms.map(m=>m.replace(/[{}]/g,'').trim()))].forEach(p=>{
    if(cols.includes(p.toLowerCase()))return;
    const sug=_suggestField(p);
    if(sug){ta.value=ta.value.replace(new RegExp(`\\{\\{\\s*${p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'g'),`{{${sug}}}`);fixed++}
  });
  UP();toast(fixed?`✨ ${fixed} Felder automatisch zugeordnet`:'Keine passenden Zuordnungen gefunden');
}
export function insertField(){const n=prompt('Feld:');if(!n)return;const ta=$('w-tpl'),p=ta.selectionStart;ta.value=ta.value.slice(0,p)+`{{${n}}}`+ta.value.slice(p);UP()}
export function DI(inp){const f=inp.files?.[0];if(!f)return;const r=new FileReader();r.onload=async e=>{try{$('w-tpl').value=(await mammoth.extractRawText({arrayBuffer:e.target.result})).value;UP();L('DOCX',f.name);toast('✓')}catch(e){alert(e.message)}};r.readAsArrayBuffer(f);inp.value=''}
export function WI(inp){const f=inp.files?.[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],j=XLSX.utils.sheet_to_json(ws,{header:1});if(j.length){S.wH=j[0].map(String);S.wD=j.slice(1).map(r=>j[0].map((_,i)=>r[i]??''));S.wI=true;RW();L('WData',f.name);toast('✓');checkSEM()}}catch(e){alert(e.message)}};r.readAsArrayBuffer(f);inp.value=''}
export function WU(){if(!S.xH.length)return;S.wH=[...S.xH];S.wD=S.xD.map(r=>[...r]);S.wI=true;RW();toast('✓');checkSEM()}
export function RW(){$('w-empty').style.display='none';$('w-dt').style.display='';$('w-merge').style.display='';$('w-dw').innerHTML=`<table><thead><tr>${S.wH.map(h=>`<th class="b">${H(h)}</th>`).join('')}</tr></thead><tbody>${S.wD.map(r=>'<tr>'+r.map(c=>`<td>${H(String(c??''))}</td>`).join('')+'</tr>').join('')}</tbody></table>`;$('w-pvs').innerHTML=S.wD.map((_,i)=>`<button class="b bo bs" onclick="WP(${i})">#${i+1}</button>`).join(' ');$('w-all').textContent=`⬇ ${S.wD.length} .docx`}

export { _FIELD_ALIASES };
