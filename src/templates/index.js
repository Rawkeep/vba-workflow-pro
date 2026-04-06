import { S, _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, A, L } from '../nav.js';
import { IDB } from '../idb.js';
// TODO: import UP, _suggestField, RW from '../word/merge.js' (cross-module dependency)
// TODO: import buildDocx from '../word/docx-builder.js' (cross-module dependency)
// TODO: import mr from '../doccenter/index.js' (cross-module dependency)
// TODO: import textToPDF, dl from utility module (not yet extracted)
// TODO: import jsPDF from vendor/globals

// ══════ TEMPLATE LIBRARY ══════
export const DOC_TEMPLATES={
brief:{
  'geschaeftsbrief':{name:'Geschäftsbrief',ico:'📄',desc:'Formeller Brief mit Absender, Empfänger, Betreff',
    tpl:`{{Firma}}
{{Ansprechpartner}}
{{Straße}}
{{PLZ}} {{Stadt}}

Datum: {{Datum}}

Betreff: {{Betreff}}

Sehr geehrte/r {{Anrede}} {{Ansprechpartner}},

{{Text}}

Mit freundlichen Grüßen

{{Absender}}
{{Absender_Firma}}`},
  'bestaetigung':{name:'Auftragsbestätigung',ico:'✅',desc:'Bestätigung mit Auftragsnr, Lieferdatum, Betrag',
    tpl:`AUFTRAGSBESTÄTIGUNG

Auftrags-Nr.: {{Auftragsnr}}
Datum: {{Datum}}
Kunde: {{Firma}} ({{KundenNr}})

Sehr geehrte/r {{Anrede}} {{Ansprechpartner}},

hiermit bestätigen wir Ihren Auftrag:

Position: {{Beschreibung}}
Menge: {{Menge}}
Einzelpreis: {{Preis}} EUR
Gesamtbetrag: {{Betrag}} EUR

Voraussichtliches Lieferdatum: {{Lieferdatum}}
Lieferbedingung: {{Incoterm}}

Mit freundlichen Grüßen`},
  'spedition':{name:'Sendungsinfo',ico:'🚢',desc:'Speditionsbrief mit Sendung, Hafen, Gewicht, Status',
    tpl:`Sendung: {{Sendungsnr}}
Kunde: {{Kunde}}
Datum: {{Datum}}

Sehr geehrter Kunde,

Ihre Sendung nach {{Hafen}}, {{Land}} (Incoterm: {{Incoterm}}) ist {{Status}}.

Gewicht: {{Gewicht_kg}} kg
Wert: {{Betrag_EUR}} EUR
Gefahrgut: {{Gefahrgut}}

Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen`},
  'mahnung':{name:'Zahlungserinnerung',ico:'⚠',desc:'Freundliche Mahnung mit Rechnungsnr, Betrag, Frist',
    tpl:`ZAHLUNGSERINNERUNG

Rechnungs-Nr.: {{Rechnungsnr}}
Rechnungsdatum: {{Datum}}
Fällig seit: {{Fällig_am}}

Sehr geehrte/r {{Anrede}} {{Ansprechpartner}},

bei der Überprüfung unserer Konten haben wir festgestellt, dass die o.g. Rechnung über {{Brutto_EUR}} EUR noch nicht beglichen wurde.

Bitte überweisen Sie den offenen Betrag innerhalb von 14 Tagen.

IBAN: {{IBAN}}
Verwendungszweck: {{Rechnungsnr}}

Mit freundlichen Grüßen`}
},
rechnung:{
  'standard':{name:'Standard-Rechnung',ico:'🧾',desc:'Rechnung mit Positionen, MwSt, Zahlungsziel',
    tpl:`RECHNUNG Nr. {{Rechnungsnr}}

An:
{{Firma}}
{{Ansprechpartner}}
{{Straße}}
{{PLZ}} {{Stadt}}

Datum: {{Datum}}
Kunden-Nr.: {{KundenNr}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Beschreibung          Betrag
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{Beschreibung}}      {{Netto_EUR}} EUR

Netto:                {{Netto_EUR}} EUR
MwSt ({{MwSt_Satz}}%):         {{MwSt_EUR}} EUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GESAMT:               {{Brutto_EUR}} EUR

Zahlungsziel: {{Zahlungsziel}}
IBAN: {{IBAN}}`},
  'export':{name:'Export-Rechnung',ico:'🌍',desc:'Commercial Invoice für internationalen Handel',
    tpl:`COMMERCIAL INVOICE

Invoice No.: {{Rechnungsnr}}
Date: {{Datum}}

Consignee:
{{Firma}}, {{Stadt}}, {{Land}}

Incoterm: {{Incoterm}}
Port of Loading: {{Abgangshafen}}
Port of Discharge: {{Zielhafen}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Description    Qty    Amount EUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{Beschreibung}}  {{Menge}}  {{Betrag_EUR}}

TOTAL: {{Betrag_EUR}} EUR
Weight: {{Gewicht_kg}} kg
Dangerous Goods: {{Gefahrgut}}`}
},
lieferschein:{
  'standard':{name:'Lieferschein',ico:'📦',desc:'Mit Sendungsnr, Positionen, Gewicht',
    tpl:`LIEFERSCHEIN

Sendungs-Nr.: {{Sendungsnr}}
Datum: {{Datum}}

Empfänger:
{{Firma}}
{{Ansprechpartner}}
{{Stadt}}, {{Land}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Artikel           Menge    Gewicht
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{Beschreibung}}  {{Menge}}  {{Gewicht_kg}} kg

Gesamtgewicht: {{Gewicht_kg}} kg
Incoterm: {{Incoterm}}
Hafen: {{Hafen}}

Unterschrift Empfänger: _______________`},
  'container':{name:'Container-Packzettel',ico:'🚢',desc:'Container ID, Gewicht, Gefahrgut-Info',
    tpl:`CONTAINER PACKING LIST

Container: {{Container_ID}}
Typ: {{Typ}}
Kunde: {{Kunde}}

Route: {{Abgangshafen}} → {{Zielhafen}}
ETD: {{ETD}}  |  ETA: {{ETA}}

Gewicht: {{Gewicht_kg}} kg
Wert: {{Wert_EUR}} EUR
Gefahrgut: {{Gefahrgut}}
Dokumente komplett: {{Dokumente_OK}}

Status: {{Status}}`}
},
etikett:{
  'adresse':{name:'Adress-Etikett',ico:'📮',desc:'Name, Firma, Adresse, PLZ Ort',
    tpl:`{{Anrede}} {{Ansprechpartner}}
{{Firma}}
{{Straße}}
{{PLZ}} {{Stadt}}
{{Land}}`},
  'versand':{name:'Versand-Etikett',ico:'📦',desc:'Sendungsnr, Kunde, Ziel, Gewicht',
    tpl:`{{Sendungsnr}}
{{Kunde}}
→ {{Hafen}}, {{Land}}
{{Gewicht_kg}} kg | {{Incoterm}}
{{Status}}`},
  'produkt':{name:'Produkt-Etikett',ico:'🏷',desc:'Artikelnr, Name, Preis',
    tpl:`{{Artikelnr}}
{{Bezeichnung}}
{{Preis}} EUR`},
  'namensschild':{name:'Namensschild',ico:'👤',desc:'Name, Firma, Abteilung',
    tpl:`{{Ansprechpartner}}
{{Firma}}
{{Abteilung}}`}
}
};

// Label layout presets
export const LABEL_LAYOUTS={
  avery3422:{name:'Avery 3422',cols:2,rows:7,w:105,h:37,desc:'14/Seite'},
  avery3474:{name:'Avery 3474',cols:3,rows:8,w:70,h:36,desc:'24/Seite'},
  avery3659:{name:'Avery 3659',cols:2,rows:5,w:97,h:55,desc:'10/Seite'},
  a5half:{name:'A5 Halb',cols:1,rows:2,w:148,h:105,desc:'2/Seite'},
  a6quarter:{name:'A6 Viertel',cols:2,rows:2,w:105,h:148,desc:'4/Seite'},
  badge:{name:'Namensschilder',cols:2,rows:4,w:90,h:55,desc:'8/Seite'},
};

let _currentDocType='brief';
let _currentLabelLayout='avery3659';

export function setDocType(type){
  _currentDocType=type;
  document.querySelectorAll('.doc-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.dtype===type));
  $('w-label-cfg').style.display=type==='etikett'?'':'none';
  const lblBtn=$('w-labels-pdf');if(lblBtn)lblBtn.style.display=type==='etikett'?'':'none';
  renderTemplateCards();
}

export function renderTemplateCards(){
  const container=$('w-tpl-cards');if(!container)return;
  const templates=DOC_TEMPLATES[_currentDocType]||{};
  if(!Object.keys(templates).length){
    container.innerHTML='<p style="font-size:11px;color:var(--tx3)">Eigene Vorlage im Editor erstellen oder DOCX importieren</p>';
    return;
  }
  const cols=S.wH.map(h=>h.toLowerCase());
  container.innerHTML=Object.entries(templates).map(([key,t])=>{
    // Calculate match percentage if data loaded
    let matchBadge='';
    if(cols.length){
      const ms=t.tpl.match(/\{\{([^}]+)\}\}/g)||[];
      const unique=[...new Set(ms.map(m=>m.replace(/[{}]/g,'').trim()))];
      const matched=unique.filter(p=>cols.includes(p.toLowerCase())).length;
      const pct=unique.length?Math.round(matched/unique.length*100):0;
      const clr=pct===100?'var(--grn)':pct>=50?'var(--ora)':'var(--red)';
      matchBadge=`<div style="font:600 9px var(--mono);color:${clr};margin-top:3px">${pct}% Match</div>`;
    }
    return`<div class="tpl-lib-card" onclick="loadLibTemplate('${A(_currentDocType)}','${A(key)}')"><div class="tlc-ico">${H(t.ico)}</div><div class="tlc-name">${H(t.name)}</div><div class="tlc-desc">${H(t.desc)}</div>${matchBadge}</div>`;
  }).join('');
}

export function loadLibTemplate(type,key){
  const t=DOC_TEMPLATES[type]?.[key];if(!t)return;
  $('w-tpl').value=t.tpl;
  UP();
  // Smart: check how many fields match and offer auto-fix
  if(S.wH.length){
    const ms=t.tpl.match(/\{\{([^}]+)\}\}/g)||[];
    const cols=S.wH.map(h=>h.toLowerCase());
    const unmatched=[...new Set(ms.map(m=>m.replace(/[{}]/g,'').trim()))].filter(p=>!cols.includes(p.toLowerCase()));
    const fixable=unmatched.filter(p=>_suggestField(p)).length;
    if(unmatched.length>0&&fixable>0){
      toast(`📄 ${t.name} — ${fixable} Felder können zugeordnet werden`,3000);
    }else if(unmatched.length===0){
      toast(`📄 ${t.name} — alle Felder passen ✓`);
    }else{
      toast(`📄 ${t.name} — ${unmatched.length} Felder ohne Match`);
    }
  }else{
    toast('📄 '+t.name+' geladen');
  }
}

// Label layout
export function setLabelLayout(key){
  if(key==='custom'){
    document.querySelectorAll('.label-layout-btn').forEach(b=>b.classList.remove('active'));
    $('label-custom-btn').classList.add('active');
    return;
  }
  _currentLabelLayout=key;
  const layout=LABEL_LAYOUTS[key];if(!layout)return;
  $('lbl-cols').value=layout.cols;$('lbl-rows').value=layout.rows;
  $('lbl-w').value=layout.w;$('lbl-h').value=layout.h;
  updateLabelPreview();
  document.querySelectorAll('.label-layout-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.label-layout-btn[onclick*="${key}"]`)?.classList.add('active');
}

export function updateLabelPreview(){
  const cols=parseInt($('lbl-cols').value)||2;
  const rows=parseInt($('lbl-rows').value)||5;
  $('lbl-info').textContent=`${cols*rows} Etiketten/Seite`;
}

// Export labels as PDF
export function exportLabelsPDF(){
  if(!S.wI||!S.wD.length){toast('Keine Daten');return}
  const{jsPDF}=window.jspdf;
  const cols=parseInt($('lbl-cols').value)||2;
  const rows=parseInt($('lbl-rows').value)||5;
  const lw=parseInt($('lbl-w').value)||85;
  const lh=parseInt($('lbl-h').value)||50;
  const perPage=cols*rows;
  const marginX=(210-cols*lw)/(cols+1); // A4 width centering
  const marginY=(297-rows*lh)/(rows+1); // A4 height centering

  const doc=new jsPDF({unit:'mm',format:'a4'});
  doc.setFont('helvetica','normal');

  S.wD.forEach((row,idx)=>{
    const pageIdx=idx%perPage;
    if(idx>0&&pageIdx===0)doc.addPage();
    const col=pageIdx%cols;
    const rowN=Math.floor(pageIdx/cols);
    const x=marginX+col*(lw+marginX);
    const y=marginY+rowN*(lh+marginY);

    // Draw label border
    doc.setDrawColor(200);doc.setLineWidth(0.2);
    doc.rect(x,y,lw,lh);

    // Merge template for this row
    const text=mr(idx);
    const lines=text.split('\n');
    doc.setFontSize(9);
    lines.forEach((line,li)=>{
      if(li*4+4<lh)doc.text(line.trim(),x+3,y+5+li*4);
    });
  });

  const name=(_currentDocType==='etikett'?'Etiketten':'Labels')+'_'+S.wD.length+'.pdf';
  doc.save(name);
  toast('🏷 '+S.wD.length+' Etiketten exportiert');
  L('Etiketten PDF',name);
}

// Insert field from loaded data columns
export function insertFieldFromData(){
  if(!S.wH.length){toast('Keine Daten geladen');return}
  // Remove existing popup if any
  const old=document.getElementById('field-picker-popup');if(old)old.remove();
  const popup=document.createElement('div');popup.id='field-picker-popup';
  popup.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--c2);border:1px solid var(--bdr);border-radius:10px;padding:16px;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,.4);min-width:260px;max-width:360px';
  popup.innerHTML=`<div style="font:600 13px var(--mono);color:var(--blu);margin-bottom:10px">Feld aus Daten einfügen</div><div style="display:flex;flex-wrap:wrap;gap:6px">${S.wH.map(h=>`<button class="b bo bs" onclick="(function(){const ta=$('w-tpl'),p=ta.selectionStart;ta.value=ta.value.slice(0,p)+'{{${h}}}'+ta.value.slice(p);UP();document.getElementById('field-picker-popup').remove();toast('{{${h}}} eingefügt')})()">{{${H(h)}}}</button>`).join('')}</div><button class="b bs" onclick="this.parentElement.remove()" style="margin-top:10px;width:100%">Schließen</button>`;
  document.body.appendChild(popup);
}

// Auto-generate template from data columns
export function autoGenTemplate(){
  if(!S.wH.length){toast('Keine Daten geladen');return}
  const h=S.wH;
  // Smart detection of field roles
  const find=(...keys)=>h.find(c=>keys.some(k=>c.toLowerCase().includes(k)))||'';
  const nameF=find('kunde','name','firma','company','empfänger','recipient');
  const dateF=find('datum','date','created');
  const idF=find('sendung','auftrag','rechnung','invoice','nr','number','id');
  // Build header fields (ID + Name + Datum)
  const headerLines=[];
  if(idF)headerLines.push(`${idF}: {{${idF}}}`);
  if(nameF)headerLines.push(`Kunde: {{${nameF}}}`);
  if(dateF)headerLines.push(`Datum: {{${dateF}}}`);
  // Body fields (everything else)
  const usedTop=new Set([nameF,dateF,idF].filter(Boolean).map(s=>s.toLowerCase()));
  const bodyFields=h.filter(c=>!usedTop.has(c.toLowerCase()));
  const bodyLines=bodyFields.map(f=>`${f}: {{${f}}}`);
  // Compose professional letter
  const tpl=[
    ...headerLines,
    '',
    nameF?`Sehr geehrte/r Kunde ({{${nameF}}}),`:'Sehr geehrte Damen und Herren,',
    '',
    'anbei die Informationen zu Ihrem Vorgang:',
    '',
    ...bodyLines,
    '',
    'Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.',
    '',
    'Mit freundlichen Grüßen'
  ].join('\n');
  $('w-tpl').value=tpl;
  UP();toast('⚡ Professionelles Template aus '+h.length+' Spalten generiert');
}

// Save/Load user templates
export let _tplCache=[];
export async function _hydrateTemplates(){
  try{
    const legacy=localStorage.getItem('vbaBeastTemplates');
    if(legacy){const ld=JSON.parse(legacy);await IDB.put('templates','all',ld);localStorage.removeItem('vbaBeastTemplates');_tplCache=ld}
    else{_tplCache=await IDB.get('templates','all')||[]}
  }catch(e){_tplCache=[];_appLog('hydrateTpl: '+e.message)}
}
export function saveUserTemplate(){
  const tpl=$('w-tpl').value;if(!tpl.trim()){toast('Template ist leer');return}
  const name=prompt('Vorlage speichern als:');if(!name)return;
  _tplCache=_tplCache.filter(t=>t.name!==name);
  _tplCache.push({name,tpl,type:_currentDocType,ts:Date.now()});
  IDB.put('templates','all',_tplCache).catch(e=>_appLog('saveTpl: '+e.message));
  renderSavedTemplates();
  toast('💾 "'+name+'" gespeichert');
}
export function loadUserTemplate(name){
  if(!name)return;
  const t=_tplCache.find(t=>t.name===name);if(!t)return;
  $('w-tpl').value=t.tpl;
  if(t.type)setDocType(t.type);
  UP();toast('📄 "'+name+'" geladen');
  $('w-saved-tpl').value='';
}
export function renderSavedTemplates(){
  const sel=$('w-saved-tpl');if(!sel)return;
  sel.innerHTML='<option value="">— Gespeicherte ('+_tplCache.length+') —</option>'+
    _tplCache.map(t=>`<option value="${H(t.name)}">${H(t.name)} (${t.type||'custom'})</option>`).join('');
}

// Show "Insert from Data" button when data is loaded
// TODO: This monkey-patches RW — needs to be wired up in main.js after RW is available
// const _origRW=RW;
// RW=function(){_origRW();$('w-insert-data').style.display=S.wI?'':'none';$('w-auto-tpl').style.display=S.wI?'':'none';if(_currentDocType==='etikett')$('w-labels-pdf').style.display='';UP()}
export function patchRW(origRW){
  return function(){origRW();$('w-insert-data').style.display=S.wI?'':'none';$('w-auto-tpl').style.display=S.wI?'':'none';if(_currentDocType==='etikett')$('w-labels-pdf').style.display='';UP()};
}

// Init
renderTemplateCards();
renderSavedTemplates();

export function EM(){const to=$('em-to').value;if(!to)return;let u=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent($('em-subj').value)}&body=${encodeURIComponent($('em-body').value)}`;if($('em-cc').value)u+=`&cc=${encodeURIComponent($('em-cc').value)}`;window.open(u);toast('✓')}
export function EMC(){navigator.clipboard.writeText(`An: ${$('em-to').value}\nBetreff: ${$('em-subj').value}\n\n${$('em-body').value}`).then(()=>toast('📋 ✓'))}
export function EMPDF(){const subj=$('em-subj').value||'E-Mail';const body=`An: ${$('em-to').value}${$('em-cc').value?'\nCC: '+$('em-cc').value:''}\nBetreff: ${subj}\nDatum: ${new Date().toLocaleDateString('de-DE')}\n\n${$('em-body').value}`;textToPDF(body,subj.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g,'_')+'.pdf');toast('PDF ✓')}
export function checkSEM(){const h=S.wH.some(h=>h.toLowerCase().includes('mail'));$('sem-btn').disabled=!S.wI||!h;$('sem-info').textContent=S.wI?(h?S.wD.length+' ✓':'⚠ "Email"?'):''}
export function SEM(){const subj=$('sem-subj').value||'—',tpl=$('w-tpl').value;const ei=S.wH.findIndex(h=>h.toLowerCase().includes('mail'));if(ei===-1)return;let html='';S.wD.forEach(row=>{let body=tpl,s=subj;S.wH.forEach((h,ci)=>{const re=new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi');body=body.replace(re,String(row[ci]??''));s=s.replace(re,String(row[ci]??''))});const em=row[ei],u=`mailto:${encodeURIComponent(em)}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(body)}`;html+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bdr)"><span style="font:11px var(--mono);color:var(--blu);min-width:150px">${H(String(em))}</span><span style="font-size:10px;color:var(--tx2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H(s)}</span><a href="${u}" target="_blank" class="b bg bs" style="text-decoration:none">📧</a></div>`});$('sem-list').innerHTML=html;toast(S.wD.length+' ✓')}
export function DLE(){dl(new Blob([JSON.stringify({log:S.log},null,2)],{type:'application/json'}),`DSGVO_${new Date().toISOString().slice(0,10)}.json`)}
export function DA(){S.xH=[];S.xD=[];S.xFn='';S.xBak=null;S.filtered=false;S.wH=[];S.wD=[];S.wI=false;S.wPv=null;S.calcCols=[];S.savedCases=[];S.savedIE=[];S.savedSW=[];S.macros=[];S.macSteps=[];S.macRec=false;S.pipelines=[];S.pipeSteps=[];S.selectedRows=new Set();S.hiddenCols=new Set();S.sortCol=-1;S.sortDir='asc';S.undoStack=[];S.redoStack=[];if(S.chart){S.chart.destroy();S.chart=null}$('x-empty').style.display='';$('status-bar').classList.remove('show');['x-exp','x-csv','x-add','x-acol','x-delcol','x-rencol','x-hidecol','x-selact','x-expsel','x-tbl','x-tabs','x-pdf','x-undoredo','x-quick-ops'].forEach(id=>{if($(id))$(id).style.display='none'});IDB.clear('autoSave').catch(()=>{});IDB.clear('workspaces').catch(()=>{});IDB.clear('templates').catch(()=>{});IDB.clear('hybrid').catch(()=>{});IDB.clear('docConfig').catch(()=>{});IDB.clear('docCenter').catch(()=>{});IDB.clear('database').catch(()=>{});_wsCache=[];_tplCache=[];_docxHeader=null;_docxFooter='';_dcTemplates=[];_dcCategories=[...DC_DEFAULT_CATS];_dcTriggers=[];_dbEntries=[];_dbSelected=new Set();$('x-sheet').style.display='none';_wb=null;['fm-out','pv-out','fi-info','sr-out','dd-out','vl-out','cs-result','ie-result','calc-history','cs-saved','ie-saved','mac-current','mac-list','pp-steps','pp-saved'].forEach(id=>{if($(id))$(id).innerHTML=''});$('ch-wrap').style.display='none';$('rec-badge').style.display='none';$('w-tpl').value='';UP();['w-empty'].forEach(id=>$(id).style.display='');['w-dt','w-merge','w-pvbox','w-use'].forEach(id=>{if($(id))$(id).style.display='none'});['em-to','em-cc','em-subj','em-body','sem-subj'].forEach(id=>{if($(id))$(id).value=''});$('sem-list').innerHTML='';$('sem-btn').disabled=true;$('del-cfm').style.display='none';if($('data-profile'))$('data-profile').classList.remove('show');if($('insights-panel'))$('insights-panel').classList.remove('show');if($('quick-actions'))$('quick-actions').classList.remove('show');if($('formula-bar'))$('formula-bar').classList.remove('show');if($('fs-toggle'))$('fs-toggle').classList.remove('show');if($('smart-suggest'))$('smart-suggest').classList.remove('show');_activeCell=null;_colFilters={};S._autoFitted=false;_dismissed.clear();_ssDataHash='';L('LÖSCHUNG','Art.17');toast('Gelöscht')}
