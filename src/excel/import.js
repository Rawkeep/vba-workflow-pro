import { $ } from '../utils.js';
import { S, _appLog } from '../store.js';
import { IDB } from '../idb.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';
// TODO: import showX from '...' (not yet extracted)
// TODO: import XR from '...' (not yet extracted - defined in this section, see below)
// TODO: import updateStatusBar from '...' (not yet extracted)
// TODO: import updateHiddenBadge from '...' (not yet extracted)
// TODO: import checkSEM from '...' (not yet extracted)
// TODO: import renderCalcH from '../excel/calc.js' (circular - defined in calc.js)
// TODO: import renderSavedCases from '../excel/select-case.js' (circular)
// TODO: import renderSavedIE from '../excel/if-else.js' (circular)
// TODO: import renderMacList from '../excel/macros.js' (circular)
// TODO: import renderSavedPipes from '../excel/pipeline.js' (circular)
// TODO: import renderSavedSW from '...' (not yet extracted)
// TODO: import _debounce from '...' (not yet extracted)

// ══════ ROBUST IMPORT ══════
export let _wb=null; // keep workbook for sheet switching
export function XI(inp){
  const f=inp.files?.[0];if(!f)return;
  const ext=f.name.split('.').pop().toLowerCase();
  // CSV/TSV: show encoding/delimiter preview
  if(ext==='csv'||ext==='tsv'||ext==='txt'){
    const r=new FileReader();
    r.onload=e=>{
      const text=e.target.result;
      const lines=text.split(/\r?\n/).filter(l=>l.trim());
      const delim=ext==='tsv'?'\t':(text.includes(';')?';':',');
      const delimName=delim==='\t'?'Tab':delim===';'?'Semikolon':'Komma';
      const preview=lines.slice(0,5).map(l=>l.substring(0,120)).join('\n');
      if(!confirm(`📂 Import: ${f.name}\n\nTrennzeichen: ${delimName}\nZeilen: ${lines.length}\nSpalten: ~${(lines[0]||'').split(delim).length}\n\nVorschau:\n${preview}\n\nImportieren?`))return;
      try{
        const opts={type:'string',raw:false};
        _wb=XLSX.read(text,opts);
        if(_wb.SheetNames.length>1){$('x-sheet').style.display='';$('x-sheet').innerHTML=_wb.SheetNames.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}else{$('x-sheet').style.display='none'}
        S.xFn=f.name;loadSheet(0);
        L('Import',`${f.name} ${S.xD.length}×${S.xH.length}`);toast('Import ✓ ('+S.xD.length+' Zeilen)');
      }catch(err){alert('Import-Fehler: '+err.message);_appLog('CSV Import: '+err.message)}
    };
    r.readAsText(f,'UTF-8');inp.value='';return;
  }
  // XLSX/XLS: binary import with preview confirmation
  const r=new FileReader();
  r.onload=e=>{try{
    const opts={type:'array',cellDates:true,cellNF:true,cellText:true,raw:false,dense:false};
    _wb=XLSX.read(e.target.result,opts);
    const ws=_wb.Sheets[_wb.SheetNames[0]];
    const range=XLSX.utils.decode_range(ws['!ref']||'A1');
    const rows=range.e.r-range.s.r;const cols=range.e.c-range.s.c+1;
    if(rows>50&&!confirm(`📂 Import: ${f.name}\n\nZeilen: ~${rows}\nSpalten: ${cols}\nSheets: ${_wb.SheetNames.length}\n\nImportieren?`))return;
    // Multi-sheet handling
    if(_wb.SheetNames.length>1){
      $('x-sheet').style.display='';
      $('x-sheet').innerHTML=_wb.SheetNames.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
    }else{$('x-sheet').style.display='none'}
    S.xFn=f.name;
    loadSheet(0);
    L('Import',`${f.name} ${S.xD.length}×${S.xH.length}${_wb.SheetNames.length>1?' ('+_wb.SheetNames.length+' Sheets)':''}`);
    toast('Import ✓ ('+S.xD.length+' Zeilen)');
  }catch(e){alert('Import-Fehler: '+e.message);_appLog('Import: '+e.message)}};
  r.readAsArrayBuffer(f);inp.value='';
}
export function XSheet(idx){loadSheet(parseInt(idx))}
export function loadSheet(idx){
  if(!_wb)return;
  const ws=_wb.Sheets[_wb.SheetNames[idx]];
  // Get range to ensure ALL columns/rows
  const range=XLSX.utils.decode_range(ws['!ref']||'A1');
  const ncols=range.e.c-range.s.c+1;
  const nrows=range.e.r-range.s.r+1;
  // Convert with defval to keep empty cells, raw for full data
  const j=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,dateNF:'yyyy-mm-dd'});
  if(!j.length){toast('Leeres Sheet');return}
  // Find actual header row (first non-empty row)
  let hIdx=0;
  for(let i=0;i<Math.min(j.length,10);i++){
    const nonEmpty=j[i].filter(c=>c!==''&&c!=null).length;
    if(nonEmpty>=2){hIdx=i;break}
  }
  // Ensure all rows have same column count
  const maxCols=Math.max(...j.map(r=>r.length),ncols);
  const headers=[];
  for(let c=0;c<maxCols;c++){
    const v=j[hIdx]?.[c];
    headers.push(v!==''&&v!=null?String(v):`Spalte_${c+1}`);
  }
  S.xH=headers;
  S.xD=j.slice(hIdx+1).map(row=>{
    const r=[];
    for(let c=0;c<maxCols;c++){
      let v=row[c]??'';
      // Clean up date objects
      if(v instanceof Date)v=v.toISOString().slice(0,10);
      // Clean up numbers displayed as strings
      if(typeof v==='number')v=String(v);
      r.push(String(v));
    }
    return r;
  }).filter(r=>r.some(c=>c!=='')); // Remove fully empty rows
  S.xBak=null;S.filtered=false;S.selectedRows=new Set();S.hiddenCols=new Set();S.sortCol=-1;S.sortDir='asc';S.undoStack=[];S.redoStack=[];
  showX();XR();
  $('x-info').textContent=`${S.xFn}${_wb.SheetNames.length>1?' ['+_wb.SheetNames[idx]+']':''} — ${S.xD.length}×${S.xH.length}`;
}

// ══════ LOCAL FILE ACCESS (File System Access API) ══════
export async function XLocal(){
  if(!window.showOpenFilePicker){toast('Browser unterstützt keinen lokalen Zugriff — Chrome/Edge nötig');return}
  try{
    const [handle]=await window.showOpenFilePicker({types:[
      {description:'Tabellen',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
        'application/vnd.ms-excel':['.xls'],'text/csv':['.csv'],'text/tab-separated-values':['.tsv']}}
    ],multiple:false});
    S._fileHandle=handle; // keep for re-read
    const file=await handle.getFile();
    const buf=await file.arrayBuffer();
    const opts={type:'array',cellDates:true,cellText:true,raw:false};
    _wb=XLSX.read(buf,opts);
    if(_wb.SheetNames.length>1){
      $('x-sheet').style.display='';
      $('x-sheet').innerHTML=_wb.SheetNames.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
    }else{$('x-sheet').style.display='none'}
    S.xFn=file.name;
    loadSheet(0);
    L('Lokal',`${file.name} ${S.xD.length}×${S.xH.length}`);
    toast('📂 Lokal geladen ✓');
  }catch(e){if(e.name!=='AbortError')toast('Fehler: '+e.message)}
}
export async function XSaveLocal(){
  if(!window.showSaveFilePicker){XE();return} // fallback
  try{
    const handle=await window.showSaveFilePicker({suggestedName:S.xFn||'export.xlsx',types:[
      {description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}
    ]});
    const ws=XLSX.utils.aoa_to_sheet([S.xH,...S.xD]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Daten');
    const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
    const writable=await handle.createWritable();
    await writable.write(buf);await writable.close();
    L('Lokal gespeichert',handle.name);toast('💾 Lokal gespeichert ✓');
  }catch(e){if(e.name!=='AbortError')XE()} // fallback to download
}
