// ══════ SMART SUGGESTIONS ENGINE ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, toast, H, A are cross-module dependencies from core
// TODO: detectColTypes, calcDataQuality are from ./analyst.js
// TODO: pushUndo is from ../ui/undo-redo.js
// TODO: sortByClick is from ../ui/cells.js
// TODO: XE is a core export function
// TODO: loadSheet is a core function
// TODO: N is navigation from core

let _dismissed=new Set(); // dismissed suggestion keys for this session
let _ssDataHash=''; // track data changes

export function genSuggestions(){
  if(!S.xH.length||!S.xD.length)return[];
  const sg=[];
  const types=detectColTypes();
  const quality=calcDataQuality();
  const id=k=>k; // key generator

  // 1. Missing values → suggest cleanup
  if(quality.missing>0){
    const worst=quality.details.filter(d=>d.missing>0).sort((a,b)=>b.missing-a.missing)[0];
    sg.push({key:'clean-missing',ico:'🧹',cls:'ss-warn',
      text:`<strong>${quality.missing} leere Zelle${quality.missing>1?'n':''}</strong> in "${worst.col}"<small>Leere Zeilen entfernen oder Standardwert setzen</small>`,
      go:'Bereinigen',action:()=>{suggestFillMissing(worst.col)}});
  }

  // 2. Duplicates → suggest dedup
  const rowKeys=S.xD.map(r=>r.join('|'));
  const dupes=rowKeys.length-new Set(rowKeys).size;
  if(dupes>0){
    sg.push({key:'dedup',ico:'🔁',cls:'ss-warn',
      text:`<strong>${dupes} Duplikat${dupes>1?'e':''}</strong> erkannt<small>Tab "Dedup" entfernt doppelte Zeilen</small>`,
      go:'Entfernen',action:()=>{navToTab('xtp-dedup')}});
  }

  // 3. Country/category columns → suggest Regeln
  types.forEach((t,ci)=>{
    if(t.type!=='category')return;
    const name=S.xH[ci].toLowerCase();
    if(name.includes('land')||name.includes('country')||name.includes('code')||name.includes('status')||name.includes('typ')){
      const unique=new Set(S.xD.map(r=>String(r[ci])));
      if(unique.size>=2&&unique.size<=15){
        sg.push({key:'case-'+ci,ico:'🔀',cls:'',
          text:`<strong>${S.xH[ci]}</strong> hat ${unique.size} Kategorien<small>Regeln f\u00fcr automatische Zuordnung nutzen</small>`,
          go:'Regeln',action:()=>{navToTab('xtp-rules');prefillCase(ci)}});
      }
    }
  });

  // 4. Numeric columns with large variance → suggest conditional formatting or pivot
  types.forEach((t,ci)=>{
    if(t.type!=='number')return;
    const nums=S.xD.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v));
    if(nums.length<3)return;
    const max=Math.max(...nums),min=Math.min(...nums);
    if(max>min*5&&nums.length>=5){
      sg.push({key:'pivot-'+ci,ico:'📊',cls:'ss-success',
        text:`<strong>${S.xH[ci]}</strong> variiert stark (${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')})<small>Pivot-Analyse oder Chart für Übersicht</small>`,
        go:'Analysieren',action:()=>{navToTab('xtp-pivot');prefillPivot(ci)}});
    }
  });

  // 5. Date columns → suggest sorting
  types.forEach((t,ci)=>{
    if(t.type!=='date')return;
    sg.push({key:'sort-date-'+ci,ico:'📅',cls:'',
      text:`<strong>${S.xH[ci]}</strong> ist eine Datumsspalte<small>Chronologisch sortieren für Zeitanalyse</small>`,
      go:'Sortieren',action:()=>{sortByClick(ci)}});
  });

  // 6. Many rows → suggest pipeline
  if(S.xD.length>=20&&(S.savedRules||[]).length===0&&S.savedCases.length===0&&S.savedIE.length===0){
    sg.push({key:'pipeline',ico:'🔗',cls:'ss-success',
      text:`<strong>${S.xD.length} Zeilen</strong> — ideal für Batch-Verarbeitung<small>Pipeline kombiniert Filter→Sort→CASE→Export in einem Klick</small>`,
      go:'Pipeline',action:()=>{navToTab('xtp-pipe')}});
  }

  // 7. Regeln suggestion for numeric thresholds
  types.forEach((t,ci)=>{
    if(t.type!=='number')return;
    const name=S.xH[ci].toLowerCase();
    if(name.includes('betrag')||name.includes('eur')||name.includes('preis')||name.includes('umsatz')||name.includes('wert')||name.includes('brutto')||name.includes('netto')){
      sg.push({key:'ifelse-'+ci,ico:'⚡',cls:'',
        text:`<strong>${S.xH[ci]}</strong> als Schwellwert nutzen<small>Regeln f\u00fcr automatische Kategorisierung (z.B. >10.000 \u2192 "Premium")</small>`,
        go:'Regeln',action:()=>{navToTab('xtp-rules');prefillIE(ci)}});
    }
  });

  // 8. Text columns with mixed case → suggest text functions
  types.forEach((t,ci)=>{
    if(t.type!=='text')return;
    const vals=S.xD.map(r=>String(r[ci]||'')).filter(v=>v.length>0);
    const hasLower=vals.some(v=>v!==v.toUpperCase()&&v!==v.toLowerCase());
    if(hasLower&&vals.length>=5){
      sg.push({key:'textfn-'+ci,ico:'Aa',cls:'',
        text:`<strong>${S.xH[ci]}</strong> — Textbereinigung möglich<small>Groß-/Kleinschreibung, Trim, Extraktion</small>`,
        go:'Text',action:()=>{navToTab('xtp-txtfn')}});
    }
  });

  // 9. VLOOKUP suggestion when 2 tables loaded (word data present)
  if(S.wH.length>0&&S.xH.length>0){
    const common=S.xH.filter(h=>S.wH.includes(h));
    if(common.length>0){
      sg.push({key:'vlookup',ico:'🔗',cls:'ss-success',
        text:`<strong>VLOOKUP möglich</strong> — gemeinsame Spalte "${common[0]}"<small>Daten aus Word-Tabelle übernehmen</small>`,
        go:'VLOOKUP',action:()=>{navToTab('xtp-vlook')}});
    }
  }

  // 10. Export suggestion when data was modified
  if(S.undoStack.length>=2){
    sg.push({key:'export-modified',ico:'💾',cls:'ss-success',
      text:`<strong>${S.undoStack.length} Änderungen</strong> durchgeführt<small>Bearbeitete Daten als XLSX exportieren oder Workspace speichern</small>`,
      go:'Exportieren',action:()=>{XE()}});
  }

  return sg.filter(s=>!_dismissed.has(s.key)).slice(0,4); // max 4, skip dismissed
}

export function renderSuggestions(){
  const panel=$('smart-suggest');if(!panel)return;
  const sgs=genSuggestions();
  if(!sgs.length){panel.classList.remove('show');return}
  panel.innerHTML=`<div class="ss-header"><span>🤖 VORSCHLÄGE</span><span style="font:9px var(--mono);color:var(--tx3)">${sgs.length} für deine Daten</span></div><div class="ss-chips">${
    sgs.map(s=>`<div class="ss-chip ${s.cls}" data-key="${s.key}" onclick="execSuggestion('${s.key}')"><span class="ss-ico">${s.ico}</span><span class="ss-text">${s.text}</span><span class="ss-go">${s.go}</span><span class="ss-x" onclick="event.stopPropagation();dismissSuggestion('${s.key}')" title="Ausblenden">✕</span></div>`).join('')
  }</div>`;
  panel.classList.add('show');
}

// Store suggestion actions for execution
let _sgActions={};
export function execSuggestion(key){
  const sgs=genSuggestions();
  const sg=sgs.find(s=>s.key===key);
  if(sg&&sg.action){
    sg.action();
    // Animate success
    const chip=document.querySelector(`.ss-chip[data-key="${key}"]`);
    if(chip){chip.style.borderColor='var(--grn)';chip.style.opacity='.5';setTimeout(()=>renderSuggestions(),800)}
  }
}
export function dismissSuggestion(key){
  _dismissed.add(key);
  const chip=document.querySelector(`.ss-chip[data-key="${key}"]`);
  if(chip){chip.style.opacity='0';chip.style.transform='scale(0.9)';setTimeout(()=>renderSuggestions(),200)}
}

// Helper: navigate to a tab
export function navToTab(tabId){
  N('excel');
  const tabEl=document.querySelector(`[onclick*="XT(this,'${tabId}')"]`);
  if(tabEl)tabEl.click();
}

// Helper: prefill Rule builder with detected column
export function prefillCase(ci){
  setTimeout(()=>{
    const tgt=$('rl-tgt');if(tgt)tgt.value=S.xH[ci];
  },100);
}

// Helper: prefill Pivot with detected column
export function prefillPivot(ci){
  setTimeout(()=>{
    // Find a category column for grouping
    const types=detectColTypes();
    const catCol=types.findIndex(t=>t.type==='category');
    if(catCol>=0){const pg=$('pv-g');if(pg)pg.value=S.xH[catCol]}
    const pa=$('pv-a');if(pa)pa.value=S.xH[ci];
  },100);
}

// Helper: prefill IF/ELSE → now redirects to unified Regeln
export function prefillIE(ci){
  setTimeout(()=>{
    const tgt=$('rl-tgt');if(tgt)tgt.value=S.xH[ci];
  },100);
}

// Helper: suggest filling missing values
export function suggestFillMissing(colName){
  const ci=S.xH.indexOf(colName);if(ci<0)return;
  const fill=prompt(`Standardwert für leere Zellen in "${colName}":`, '—');
  if(fill===null)return;
  pushUndo();
  let count=0;
  S.xD.forEach(r=>{if(String(r[ci]||'').trim()===''){r[ci]=fill;count++}});
  XR();toast(`${count} Zelle${count>1?'n':''} gefüllt`);
}

// Hook suggestions into XR render cycle
export function initSuggestionsHook() {
  const _origXR_suggest=window.XR;
  window.XR=function(){
    _origXR_suggest();
    // Only re-render suggestions when data actually changed
    const newHash=S.xD.length+'-'+S.xH.length+'-'+S.undoStack.length;
    if(newHash!==_ssDataHash){_ssDataHash=newHash;renderSuggestions()}
  };

  // Reset dismissed on new data load
  const _origLoadSheet=typeof window.loadSheet==='function'?window.loadSheet:null;
  if(_origLoadSheet){window.loadSheet=function(){_dismissed.clear();_ssDataHash='';_origLoadSheet.apply(this,arguments)}}
}
