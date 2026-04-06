import { S, _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, A, L } from '../nav.js';
import { IDB } from '../idb.js';
// TODO: import buildDocx, _MiniZip, _xmlEsc from '../word/docx-builder.js' (cross-module dependency)
// TODO: import mammoth from vendor/globals
// TODO: import dl from download utility (not yet extracted)

// ══════ DOKUMENTEN-CENTER ══════
export const DC_DEFAULT_CATS=[
  {id:'gefahrgut',name:'Gefahrgut',color:'var(--red)'},
  {id:'labels',name:'Labels / Etiketten',color:'var(--ora)'},
  {id:'formulare',name:'Formulare',color:'var(--blu)'},
  {id:'versand',name:'Versanddokumente',color:'var(--grn)'},
  {id:'zoll',name:'Zoll / Export',color:'var(--pur)'},
  {id:'sonstige',name:'Sonstige',color:'var(--tx2)'}
];

let _dcTemplates=[];
let _dcCategories=[];
let _dcTriggers=[];
let _dcEditId=null; // template being edited

export async function _hydrateDokCenter(){
  try{
    _dcCategories=await IDB.get('docCenter','categories')||[];
    if(!_dcCategories.length){_dcCategories=[...DC_DEFAULT_CATS];await IDB.put('docCenter','categories',_dcCategories)}
    _dcTemplates=await IDB.get('docCenter','templates')||[];
    _dcTriggers=await IDB.get('docCenter','triggers')||[];
  }catch(e){_appLog('hydrateDC: '+e.message)}
}
function _saveDC(key,val){IDB.put('docCenter',key,val).catch(e=>_appLog('saveDC: '+e.message))}

// Tab switching within Dok-Center
export function dcTab(el,panelId){
  document.querySelectorAll('#dc-tabs .tab').forEach(t=>t.classList.remove('a'));
  el.classList.add('a');
  ['dc-tpl','dc-trigger','dc-batch'].forEach(id=>{
    const p=$(id);if(p)p.style.display=id===panelId?'':'none';
  });
  if(panelId==='dc-trigger')dcRenderTriggerUI();
  if(panelId==='dc-batch')dcRenderBatchUI();
}

// ── Category Management ──
export function dcAddCategory(){
  const name=$('dc-cat-name').value.trim();
  const color=$('dc-cat-color').value;
  if(!name){toast('Name eingeben');return}
  const id=name.toLowerCase().replace(/[^a-z0-9]/g,'-');
  if(_dcCategories.find(c=>c.id===id)){toast('Existiert bereits');return}
  _dcCategories.push({id,name,color});
  _saveDC('categories',_dcCategories);
  $('dc-cat-name').value='';
  dcRenderCategories();
  dcRenderCatDropdowns();
  toast('Kategorie hinzugefügt ✓');
}
export function dcRemoveCategory(id){
  _dcCategories=_dcCategories.filter(c=>c.id!==id);
  _saveDC('categories',_dcCategories);
  dcRenderCategories();
  dcRenderCatDropdowns();
}
export function dcRenderCategories(){
  const el=$('dc-cat-list');
  if(!el)return;
  el.innerHTML=_dcCategories.map(c=>{
    const count=_dcTemplates.filter(t=>t.categoryId===c.id).length;
    return`<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:var(--s2);border:1px solid var(--bdr);font:500 11px var(--mono)"><span style="width:8px;height:8px;border-radius:50%;background:${c.color}"></span>${H(c.name)} <span style="color:var(--tx3)">(${count})</span><span style="cursor:pointer;color:var(--tx3);margin-left:2px" onclick="dcRemoveCategory('${c.id}')" title="Entfernen">✕</span></span>`;
  }).join('');
}
export function dcRenderCatDropdowns(){
  const opts=_dcCategories.map(c=>`<option value="${c.id}">${H(c.name)}</option>`).join('');
  const filter=$('dc-cat-filter');
  if(filter)filter.innerHTML='<option value="">Alle Kategorien</option>'+opts;
  const newCat=$('dc-new-cat');
  if(newCat)newCat.innerHTML=opts;
}

// ── Template Upload ──
export function dcUploadTemplate(inp){
  const f=inp.files?.[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const buf=e.target.result;
      // Extract text using mammoth for placeholder detection
      const result=await mammoth.extractRawText({arrayBuffer:buf.slice(0)});
      const text=result.value||'';
      // Also try to normalize DOCX XML for better placeholder matching
      let xmlContent='';
      try{
        const zipFiles=_MiniZip.unzip(new Uint8Array(buf.slice(0)));
        const docXml=zipFiles.get('word/document.xml');
        if(docXml)xmlContent=new TextDecoder().decode(docXml);
      }catch(ex){}
      // Show form with extracted content
      _dcEditId=null;
      $('dc-new-name').value=f.name.replace(/\.docx?$/i,'');
      $('dc-new-content').value=text;
      $('dc-new-client').value='';
      // Store buffer temporarily
      $('dc-new-form').dataset.buffer='';//flag
      $('dc-new-form')._docxBuffer=buf;
      $('dc-new-form')._docxXml=xmlContent;
      dcDetectPlaceholders();
      $('dc-new-form').style.display='';
      $('dc-new-form').scrollIntoView({behavior:'smooth'});
      toast('DOCX gelesen — Platzhalter prüfen und speichern');
    }catch(ex){toast('Fehler: '+ex.message)}
  };
  reader.readAsArrayBuffer(f);
  inp.value='';
}

export function dcDetectPlaceholders(){
  const text=$('dc-new-content').value;
  const matches=text.match(/\{\{([^}]+)\}\}/g)||[];
  const unique=[...new Set(matches.map(m=>m.replace(/[{}]/g,'').trim()))];
  $('dc-new-ph').innerHTML=unique.length
    ?unique.map(p=>`<span class="tg tg-b">{{${H(p)}}}</span>`).join(' ')
    :'<span style="color:var(--tx3)">Keine {{Platzhalter}} gefunden — füge welche im Text ein</span>';
}

export function dcSaveTemplate(){
  const name=$('dc-new-name').value.trim();
  const catId=$('dc-new-cat').value;
  const client=$('dc-new-client').value.trim();
  const content=$('dc-new-content').value;
  if(!name){toast('Name eingeben');return}
  if(!content.trim()){toast('Vorlage ist leer');return}

  const matches=content.match(/\{\{([^}]+)\}\}/g)||[];
  const placeholders=[...new Set(matches.map(m=>m.replace(/[{}]/g,'').trim()))];
  const clients=client?client.split(',').map(c=>c.trim()).filter(Boolean):['Alle'];

  const form=$('dc-new-form');
  const buf=form._docxBuffer||null;
  const xml=form._docxXml||'';

  if(_dcEditId){
    // Update existing
    const idx=_dcTemplates.findIndex(t=>t.id===_dcEditId);
    if(idx>=0){
      _dcTemplates[idx].name=name;
      _dcTemplates[idx].categoryId=catId;
      _dcTemplates[idx].clients=clients;
      _dcTemplates[idx].content=content;
      _dcTemplates[idx].placeholders=placeholders;
      if(buf)_dcTemplates[idx].docxBuffer=buf;
      if(xml)_dcTemplates[idx].docxXml=xml;
      _dcTemplates[idx].updatedAt=Date.now();
    }
  }else{
    // Create new
    _dcTemplates.push({
      id:'dc-'+Date.now(),
      name,
      categoryId:catId,
      clients,
      content,
      placeholders,
      docxBuffer:buf,
      docxXml:xml,
      createdAt:Date.now(),
      updatedAt:Date.now()
    });
  }

  _saveDC('templates',_dcTemplates);
  $('dc-new-form').style.display='none';
  _dcEditId=null;
  dcRenderTemplates();
  dcRenderCategories();
  toast('💾 "'+name+'" gespeichert');
}

export function dcEditTemplate(id){
  const t=_dcTemplates.find(t=>t.id===id);
  if(!t)return;
  _dcEditId=id;
  $('dc-new-name').value=t.name;
  $('dc-new-cat').value=t.categoryId;
  $('dc-new-client').value=(t.clients||[]).join(', ');
  $('dc-new-content').value=t.content;
  $('dc-new-form')._docxBuffer=t.docxBuffer||null;
  $('dc-new-form')._docxXml=t.docxXml||'';
  dcDetectPlaceholders();
  $('dc-new-form').style.display='';
  $('dc-new-form').scrollIntoView({behavior:'smooth'});
}

export function dcDeleteTemplate(id){
  if(!confirm('Vorlage wirklich löschen?'))return;
  _dcTemplates=_dcTemplates.filter(t=>t.id!==id);
  _dcTriggers=_dcTriggers.filter(t=>t.templateId!==id);
  _saveDC('templates',_dcTemplates);
  _saveDC('triggers',_dcTriggers);
  dcRenderTemplates();
  dcRenderCategories();
  toast('Gelöscht');
}

export function dcCreateManualTemplate(){
  _dcEditId=null;
  $('dc-new-name').value='';
  $('dc-new-content').value='';
  $('dc-new-client').value='';
  $('dc-new-form')._docxBuffer=null;
  $('dc-new-form')._docxXml='';
  dcDetectPlaceholders();
  $('dc-new-form').style.display='';
  $('dc-new-form').scrollIntoView({behavior:'smooth'});
}

export function dcRenderTemplates(){
  const catFilter=$('dc-cat-filter')?.value||'';
  const clientFilter=$('dc-client-filter')?.value||'';
  let filtered=_dcTemplates;
  if(catFilter)filtered=filtered.filter(t=>t.categoryId===catFilter);
  if(clientFilter)filtered=filtered.filter(t=>(t.clients||[]).some(c=>c===clientFilter||c==='Alle'));

  // Update client filter options
  const allClients=new Set();
  _dcTemplates.forEach(t=>(t.clients||[]).forEach(c=>{if(c!=='Alle')allClients.add(c)}));
  const cf=$('dc-client-filter');
  if(cf){
    const cur=cf.value;
    cf.innerHTML='<option value="">Alle Kunden</option>'+[...allClients].sort().map(c=>`<option value="${H(c)}">${H(c)}</option>`).join('');
    cf.value=cur;
  }

  const grid=$('dc-tpl-grid');
  const empty=$('dc-tpl-empty');
  if(!filtered.length){grid.innerHTML='';empty.style.display='';return}
  empty.style.display='none';
  grid.innerHTML=filtered.map(t=>{
    const cat=_dcCategories.find(c=>c.id===t.categoryId);
    const catBadge=cat?`<span style="display:inline-flex;align-items:center;gap:3px;font:500 9px var(--mono);padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.05)"><span style="width:6px;height:6px;border-radius:50%;background:${cat.color}"></span>${H(cat.name)}</span>`:'';
    const clientBadges=(t.clients||[]).map(c=>`<span style="font:400 9px var(--mono);padding:1px 5px;border-radius:3px;background:rgba(255,255,255,.04);color:var(--tx3)">${H(c)}</span>`).join(' ');
    const phBadges=(t.placeholders||[]).slice(0,5).map(p=>`<span class="tg tg-b" style="font-size:8px">{{${H(p)}}}</span>`).join(' ');
    const more=(t.placeholders||[]).length>5?`<span style="font-size:8px;color:var(--tx3)">+${t.placeholders.length-5}</span>`:'';
    const hasDocx=t.docxBuffer?'<span style="font:9px var(--mono);color:var(--grn)" title="Original-DOCX gespeichert">📎 DOCX</span>':'';
    const triggerCount=_dcTriggers.filter(tr=>tr.templateId===t.id).length;
    const trigBadge=triggerCount?`<span style="font:9px var(--mono);color:var(--ora)">⚡${triggerCount} Trigger</span>`:'';
    return`<div style="background:var(--s2);border-radius:10px;padding:12px;border:1px solid var(--bdr);cursor:pointer;transition:border-color .2s" onmouseenter="this.style.borderColor='var(--ora)'" onmouseleave="this.style.borderColor='var(--bdr)'">
<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
<div style="font:600 12px var(--mono);color:var(--tx)">${H(t.name)}</div>
<div style="display:flex;gap:4px">
<span style="cursor:pointer;font-size:12px" onclick="event.stopPropagation();dcEditTemplate('${t.id}')" title="Bearbeiten">✏</span>
<span style="cursor:pointer;font-size:12px;color:var(--red)" onclick="event.stopPropagation();dcDeleteTemplate('${t.id}')" title="Löschen">✕</span>
</div></div>
<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${catBadge} ${clientBadges}</div>
<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">${phBadges}${more}</div>
<div style="display:flex;gap:8px;align-items:center">${hasDocx} ${trigBadge}</div>
<div style="font:10px var(--mono);color:var(--tx3);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${H((t.content||'').substring(0,80))}</div>
</div>`;
  }).join('');
}

// ── Trigger Management ──
export function dcRenderTriggerUI(){
  // Populate column dropdown from Excel headers
  const colSel=$('dc-tr-col');
  if(colSel){
    colSel.innerHTML='<option value="">— Excel-Spalte —</option>'+
      (S.xH||[]).map(h=>`<option value="${A(h)}">${H(h)}</option>`).join('');
  }
  // Populate template dropdown
  const tplSel=$('dc-tr-tpl');
  if(tplSel){
    tplSel.innerHTML='<option value="">— Vorlage —</option>'+
      _dcTemplates.map(t=>`<option value="${t.id}">${H(t.name)}</option>`).join('');
  }
  dcRenderTriggerList();
}

export function dcAddTrigger(){
  const col=$('dc-tr-col').value;
  const op=$('dc-tr-op').value;
  const val=$('dc-tr-val').value.trim();
  const tplId=$('dc-tr-tpl').value;
  if(!col){toast('Spalte wählen');return}
  if(!val){toast('Wert eingeben');return}
  if(!tplId){toast('Vorlage wählen');return}
  _dcTriggers.push({id:'tr-'+Date.now(),templateId:tplId,column:col,operator:op,value:val,priority:_dcTriggers.length});
  _saveDC('triggers',_dcTriggers);
  $('dc-tr-val').value='';
  dcRenderTriggerList();
  dcRenderTemplates();
  toast('Trigger hinzugefügt ✓');
}

export function dcRemoveTrigger(id){
  _dcTriggers=_dcTriggers.filter(t=>t.id!==id);
  _saveDC('triggers',_dcTriggers);
  dcRenderTriggerList();
  dcRenderTemplates();
}

export function dcRenderTriggerList(){
  const list=$('dc-trigger-list');
  const empty=$('dc-trigger-empty');
  if(!_dcTriggers.length){if(list)list.innerHTML='';if(empty)empty.style.display='';return}
  if(empty)empty.style.display='none';
  if(!list)return;
  list.innerHTML=_dcTriggers.map(tr=>{
    const tpl=_dcTemplates.find(t=>t.id===tr.templateId);
    const opLabel={eq:'=',contains:'enthält',starts:'beginnt mit'}[tr.operator]||tr.operator;
    return`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--s2);border-radius:8px;margin-bottom:4px;border:1px solid var(--bdr)">
<span style="font:600 11px var(--mono);color:var(--acc)">${H(tr.column)}</span>
<span style="font:10px var(--mono);color:var(--tx3)">${opLabel}</span>
<span style="font:600 11px var(--mono);color:var(--cyn)">"${H(tr.value)}"</span>
<span style="color:var(--tx3)">→</span>
<span style="font:500 11px var(--mono);color:var(--ora)">${tpl?H(tpl.name):'(gelöscht)'}</span>
<span style="margin-left:auto;cursor:pointer;color:var(--red);font-size:12px" onclick="dcRemoveTrigger('${tr.id}')" title="Regel löschen">✕</span>
</div>`;
  }).join('');
}

// ── Trigger Matching Engine ──
export function dcMatchTemplates(rowIndex){
  const row=S.xD[rowIndex];
  if(!row)return[];
  const matched=[];
  for(const tr of _dcTriggers){
    const colIdx=S.xH.indexOf(tr.column);
    if(colIdx<0)continue;
    const val=String(row[colIdx]??'');
    let hit=false;
    if(tr.operator==='eq')hit=val===tr.value;
    else if(tr.operator==='contains')hit=val.toLowerCase().includes(tr.value.toLowerCase());
    else if(tr.operator==='starts')hit=val.toLowerCase().startsWith(tr.value.toLowerCase());
    if(hit&&!matched.includes(tr.templateId))matched.push(tr.templateId);
  }
  return matched;
}

// ── Merge DOCX Buffer with Row Data ──
export function dcMergeText(content,rowIndex){
  let text=content;
  S.xH.forEach((h,ci)=>{
    text=text.replace(new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi'),String(S.xD[rowIndex]?.[ci]??''));
  });
  return text;
}

export function dcMergeDocxBuffer(template,rowIndex){
  // If we have the original DOCX buffer, merge into it
  if(template.docxBuffer){
    try{
      const buf=template.docxBuffer;
      const zipFiles=_MiniZip.unzip(new Uint8Array(buf instanceof ArrayBuffer?buf:buf));
      // Process each XML file for placeholder replacement
      const processedFiles=[];
      for(const [name,data] of zipFiles){
        if(name.endsWith('.xml')||name.endsWith('.rels')){
          let xml=new TextDecoder().decode(data);
          // Normalize Word's split runs: merge adjacent <w:t> in same run
          xml=xml.replace(/<\/w:t><\/w:r><w:r><w:t[^>]*>/g,'');
          // Replace placeholders
          S.xH.forEach((h,ci)=>{
            xml=xml.replace(new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi'),_xmlEsc(String(S.xD[rowIndex]?.[ci]??'')));
          });
          processedFiles.push({name,data:new TextEncoder().encode(xml)});
        }else{
          processedFiles.push({name,data});
        }
      }
      const zipData=_MiniZip.create(processedFiles);
      return new Blob([zipData],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    }catch(e){
      _appLog('dcMergeDocx: '+e.message);
    }
  }
  // Fallback: build new DOCX from text content
  const merged=dcMergeText(template.content,rowIndex);
  return buildDocx(merged);
}

// ── Batch Export ──
export function dcUseExcelData(){
  if(!S.xH.length){toast('Erst Excel-Daten laden');return}
  dcRenderBatchUI();
}

export function dcRenderBatchUI(){
  const status=$('dc-data-status');
  if(!S.xH.length){
    if(status)status.textContent='Keine Daten geladen — erst Excel importieren';
    $('dc-match-preview').style.display='none';
    return;
  }
  if(status)status.innerHTML=`<span style="color:var(--grn)">✓</span> ${S.xH.length} Spalten · ${S.xD.length} Zeilen · <strong>${S.xFn||'Daten'}</strong>`;

  if(!_dcTriggers.length){
    $('dc-match-preview').style.display='none';
    $('dc-gen-info').textContent='Keine Trigger-Regeln definiert';
    return;
  }

  // Build match preview table
  let totalDocs=0;
  const rows=S.xD.map((row,i)=>{
    const matched=dcMatchTemplates(i);
    totalDocs+=matched.length;
    const tplNames=matched.map(id=>{
      const t=_dcTemplates.find(t=>t.id===id);
      return t?`<span class="tg tg-o" style="font-size:8px">${H(t.name)}</span>`:'';
    }).join(' ');
    const preview=row.slice(0,3).map(c=>H(String(c??'').substring(0,15))).join(' | ');
    return`<tr><td style="font:10px var(--mono);color:var(--tx3)">${i+1}</td><td style="font:10px var(--mono)">${preview}</td><td>${tplNames||'<span style="color:var(--tx3);font-size:9px">—</span>'}</td><td style="font:600 10px var(--mono);color:${matched.length?'var(--grn)':'var(--tx3)'}">${matched.length}</td></tr>`;
  });

  $('dc-match-table').innerHTML=`<table><thead><tr><th>#</th><th>Daten (Auszug)</th><th>Zugeordnete Vorlagen</th><th>Docs</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  $('dc-gen-info').textContent=`${totalDocs} Dokumente für ${S.xD.length} Zeilen`;
  $('dc-gen-btn').disabled=totalDocs===0;
  $('dc-match-preview').style.display='';
}

export async function dcBatchGenerate(){
  if(!S.xH.length||!_dcTriggers.length)return;

  const allFiles=[];
  for(let i=0;i<S.xD.length;i++){
    const matchedIds=dcMatchTemplates(i);
    for(const tplId of matchedIds){
      const tpl=_dcTemplates.find(t=>t.id===tplId);
      if(!tpl)continue;
      const blob=dcMergeDocxBuffer(tpl,i);
      const safeName=(tpl.name||'Dokument').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g,'_');
      const rowId=String(S.xD[i][0]??`Zeile${i+1}`).replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g,'_');
      allFiles.push({name:`${safeName}_${rowId}.docx`,blob});
    }
  }

  if(!allFiles.length){toast('Keine Dokumente generiert');return}

  if(allFiles.length===1){
    dl(allFiles[0].blob,allFiles[0].name);
  }else{
    // Package all into a single ZIP
    const zipEntries=[];
    for(const f of allFiles){
      const buf=await f.blob.arrayBuffer();
      zipEntries.push({name:f.name,data:new Uint8Array(buf)});
    }
    const zipData=_MiniZip.create(zipEntries);
    const zipBlob=new Blob([zipData],{type:'application/zip'});
    dl(zipBlob,`Dokumente_${allFiles.length}_${new Date().toISOString().slice(0,10)}.zip`);
  }

  const result=$('dc-batch-result');
  result.innerHTML=`<div style="background:rgba(48,209,88,.08);border:1px solid rgba(48,209,88,.2);border-radius:10px;padding:12px;text-align:center">
<div style="font-size:24px;margin-bottom:4px">✅</div>
<div style="font:600 13px var(--mono);color:var(--grn)">${allFiles.length} Dokumente generiert</div>
<div style="font:10px var(--mono);color:var(--tx2);margin-top:4px">${allFiles.length>1?'Als ZIP heruntergeladen':'Als DOCX heruntergeladen'}</div>
</div>`;
  result.style.display='';
  L('Batch-Export',allFiles.length+' Dokumente');
  toast(`${allFiles.length} Dokumente ✓`);
}

// ── Built-in Templates Library ──
export const DC_BUILTINS=[
  {name:'CMR Frachtbrief',cat:'versand',content:'INTERNATIONALER FRACHTBRIEF (CMR)\n\nAbsender: {{Firma}}\nAdresse: {{Adresse}}\n\nEmpfänger: {{Empfänger}}\nLieferadresse: {{Lieferadresse}}\n\nWare: {{Warenbezeichnung}}\nAnzahl Packstücke: {{Packstücke}}\nBruttogewicht (kg): {{Gewicht_kg}}\n\nBeilagen: {{Beilagen}}\nFrachtführer: {{Frachtführer}}\nKennzeichen: {{Kennzeichen}}\n\nOrt/Datum: {{Ort}}, {{Datum}}\nUnterschrift: _______________'},
  {name:'Gefahrgut-Deklaration',cat:'gefahrgut',content:'GEFAHRGUT-DEKLARATION\n\nUN-Nummer: UN{{UN_Nummer}}\nKlasse: {{Gefahrklasse}}\nVerpackungsgruppe: {{Verpackungsgruppe}}\nTechnische Bezeichnung: {{Stoffbezeichnung}}\n\nAbsender: {{Firma}}\nEmpfänger: {{Empfänger}}\nGesamtmenge: {{Menge}} {{Einheit}}\nAnzahl Versandstücke: {{Packstücke}}\nVerpackungsart: {{Verpackung}}\n\nNotfallkontakt: {{Notfallnummer}}\nDatum: {{Datum}}'},
  {name:'Lieferschein',cat:'versand',content:'LIEFERSCHEIN Nr. {{Lieferschein_Nr}}\n\nDatum: {{Datum}}\nKunde: {{Kunde}}\nKundennr: {{Kundennr}}\nLieferadresse: {{Lieferadresse}}\n\nPos. | Artikel | Menge | Einheit\n1    | {{Artikel_1}} | {{Menge_1}} | {{Einheit_1}}\n2    | {{Artikel_2}} | {{Menge_2}} | {{Einheit_2}}\n3    | {{Artikel_3}} | {{Menge_3}} | {{Einheit_3}}\n\nBemerkung: {{Bemerkung}}\nUnterschrift Empfänger: _______________'},
  {name:'Rechnung',cat:'formulare',content:'RECHNUNG Nr. {{Rechnungsnr}}\n\nDatum: {{Datum}}\nKunde: {{Kunde}}\nAdresse: {{Adresse}}\nUSt-IdNr.: {{UStId}}\n\nPos. | Beschreibung | Menge | Einzelpreis | Gesamt\n1    | {{Pos1_Text}} | {{Pos1_Menge}} | {{Pos1_Preis}} EUR | {{Pos1_Gesamt}} EUR\n2    | {{Pos2_Text}} | {{Pos2_Menge}} | {{Pos2_Preis}} EUR | {{Pos2_Gesamt}} EUR\n\nNettobetrag: {{Netto}} EUR\nMwSt 19%: {{MwSt}} EUR\nBruttobetrag: {{Brutto}} EUR\n\nZahlungsziel: {{Zahlungsziel}}\nBankverbindung: {{Bank}} · IBAN {{IBAN}}'},
  {name:'Versandetikett',cat:'labels',content:'VON:\n{{Absender_Firma}}\n{{Absender_Strasse}}\n{{Absender_PLZ}} {{Absender_Ort}}\n{{Absender_Land}}\n\nAN:\n{{Empfänger_Name}}\n{{Empfänger_Strasse}}\n{{Empfänger_PLZ}} {{Empfänger_Ort}}\n{{Empfänger_Land}}\n\nSendungsnr: {{Sendungsnr}}\nGewicht: {{Gewicht_kg}} kg'},
  {name:'Zollinhaltserklärung',cat:'zoll',content:'ZOLLINHALTSERKLÄRUNG / CUSTOMS DECLARATION\n\nAbsender/Sender: {{Absender}}\nEmpfänger/Recipient: {{Empfänger}}\nLand/Country: {{Land}}\n\nWarenbeschreibung/Description: {{Warenbezeichnung}}\nHS-Code: {{HS_Code}}\nMenge/Quantity: {{Menge}}\nWert/Value: {{Warenwert}} {{Währung}}\nGewicht/Weight: {{Gewicht_kg}} kg\nUrsprungsland/Origin: {{Ursprungsland}}\n\nDatum/Date: {{Datum}}\nUnterschrift/Signature: _______________'},
  {name:'Auftragsbestätigung',cat:'formulare',content:'AUFTRAGSBESTÄTIGUNG Nr. {{Auftragsnr}}\n\nDatum: {{Datum}}\nKunde: {{Kunde}}\nAnsprechpartner: {{Ansprechpartner}}\n\nWir bestätigen Ihren Auftrag:\n{{Auftragstext}}\n\nLiefertermin: {{Liefertermin}}\nLieferbedingung: {{Incoterm}}\nZahlungsbedingung: {{Zahlungsbedingung}}\nGesamtbetrag: {{Betrag}} EUR\n\nMit freundlichen Grüßen\n{{Absender}}'}
];
export function dcRenderBuiltins(){
  const grid=document.getElementById('dc-builtin-grid');
  if(!grid)return;
  const catMap={};
  _dcCategories.forEach(c=>catMap[c.id]=c);
  grid.innerHTML=DC_BUILTINS.map((b,i)=>{
    const cat=catMap[b.cat];
    const color=cat?cat.color:'var(--tx2)';
    const catName=cat?cat.name:b.cat;
    return `<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px 12px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='rgba(240,165,0,.3)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(255,255,255,.06)';this.style.transform=''" onclick="dcAddBuiltin(${i})"><div style="font:600 11px var(--mono);color:var(--acc);margin-bottom:3px">${b.name}</div><span style="display:inline-block;padding:1px 6px;border-radius:4px;font:500 9px var(--mono);background:${color}20;color:${color}">${catName}</span><div style="font:10px var(--mono);color:var(--tx3);margin-top:4px">${(b.content.match(/\{\{[^}]+\}\}/g)||[]).length} Platzhalter</div></div>`;
  }).join('');
}
export function dcAddBuiltin(idx){
  const b=DC_BUILTINS[idx];
  const tpl={id:Date.now()+'_'+Math.random().toString(36).slice(2,6),name:b.name,category:b.cat,client:'',content:b.content,placeholders:(b.content.match(/\{\{([^}]+)\}\}/g)||[]).map(m=>m.slice(2,-2)),created:Date.now()};
  _dcTemplates.push(tpl);
  IDB.put('docCenter','templates',_dcTemplates);
  dcRenderTemplates();
  toast('✓ "'+b.name+'" hinzugefügt');
}

// ── Initialize Dok-Center UI ──
export function dcInitUI(){
  dcRenderCatDropdowns();
  dcRenderCategories();
  dcRenderTemplates();
  dcRenderBuiltins();
}

// ── Nav handler for doccenter ──


export function mr(i){let t=$('w-tpl').value;S.wH.forEach((h,ci)=>{t=t.replace(new RegExp(`\\{\\{\\s*${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\}\\}`,'gi'),String(S.wD[i]?.[ci]??''))});return t}
export function WP(i){S.wPv=mr(i);$('w-pvbox').style.display='';const remaining=S.wPv.match(/\{\{[^}]+\}\}/g);if(remaining){const hl=S.wPv.replace(/\{\{[^}]+\}\}/g,m=>`⟪${m}⟫`);$('w-pvbox').innerHTML=`<div style="padding:4px 8px;margin-bottom:6px;background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);border-radius:4px;font:600 10px var(--mono);color:#ff5252">⚠ ${remaining.length} Platzhalter nicht ersetzt: ${[...new Set(remaining)].join(', ')}</div><pre style="white-space:pre-wrap;margin:0">${H(S.wPv).replace(/\{\{[^}]+\}\}/g,m=>`<mark style="background:rgba(255,80,80,.25);padding:1px 3px;border-radius:3px">${m}</mark>`)}</pre>`}else{$('w-pvbox').textContent=S.wPv}$('w-ep').style.display='';$('w-eppdf').style.display=''}
export function db(t){return buildDocx(t)}
export function dl(b,n){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();URL.revokeObjectURL(u)}
export function WES(){if(S.wPv)dl(buildDocx(S.wPv),'Vorschau.docx');L('DOCX','Vorschau.docx');toast('DOCX ✓')}
export function WEA(){S.wD.forEach((_,i)=>dl(buildDocx(mr(i)),`Brief_${i+1}.docx`));L('DOCX Serienbriefe',S.wD.length+'');toast(S.wD.length+' DOCX ✓')}
export function WPD(){if(!S.wPv)return;const w=window.open('');const doc=w.document;doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:2cm}body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.7;white-space:pre-wrap}</style></head><body></body></html>');doc.close();doc.body.textContent=S.wPv;doc.body.innerHTML=doc.body.innerHTML.replace(/\n/g,'<br>');setTimeout(()=>w.print(),400)}

// Re-export module-level state for external access
export { _dcTemplates, _dcCategories, _dcTriggers };
