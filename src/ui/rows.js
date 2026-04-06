// ══════ ROW SELECTION ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, toast, L, H, A are cross-module dependencies from core
// TODO: pushUndo is from ./undo-redo.js
// TODO: showCtxAt, hideCtx are from ./context-menu.js
// TODO: XLSX is a global dependency

export function toggleRow(ri,ev){if(ev&&ev.shiftKey&&typeof S._lastToggled==='number'){const lo=Math.min(S._lastToggled,ri),hi=Math.max(S._lastToggled,ri);for(let i=lo;i<=hi;i++)S.selectedRows.add(i)}else{if(S.selectedRows.has(ri))S.selectedRows.delete(ri);else S.selectedRows.add(ri)}S._lastToggled=ri;XR()}
export function toggleAllRows(checked){if(checked){for(let i=0;i<S.xD.length;i++)S.selectedRows.add(i)}else{S.selectedRows.clear()}XR()}
export function showSelActions(ev){if(!S.selectedRows.size){toast('Keine Zeilen ausgewählt');return}
const n=S.selectedRows.size;showCtxAt(ev,`<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">${n} Zeilen ausgewählt</div><div class="ctx-sep"></div><div class="ctx-item danger" onclick="deleteSelectedRows();hideCtx()">Ausgewählte löschen</div><div class="ctx-item" onclick="copySelectedRows();hideCtx()">In Zwischenablage kopieren</div><div class="ctx-item" onclick="invertSelection();hideCtx()">Auswahl umkehren</div><div class="ctx-item" onclick="S.selectedRows.clear();XR();hideCtx()">Auswahl aufheben</div>`)}
export function deleteSelectedRows(){if(!S.selectedRows.size)return;pushUndo();const idxs=[...S.selectedRows].sort((a,b)=>b-a);idxs.forEach(i=>S.xD.splice(i,1));S.selectedRows.clear();XR();toast(idxs.length+' Zeilen gelöscht');L('Zeilen gelöscht',idxs.length+'')}
export function copySelectedRows(){const rows=[...S.selectedRows].sort((a,b)=>a-b);const vis=S.xH.map((_,i)=>!S.hiddenCols.has(i));const header=S.xH.filter((_,i)=>vis[i]).join('\t');const data=rows.map(ri=>S.xD[ri].filter((_,ci)=>vis[ci]).join('\t')).join('\n');navigator.clipboard.writeText(header+'\n'+data).then(()=>toast('📋 '+rows.length+' Zeilen kopiert'))}
export function invertSelection(){const ns=new Set();for(let i=0;i<S.xD.length;i++){if(!S.selectedRows.has(i))ns.add(i)}S.selectedRows=ns;XR()}

// ══════ EXPORT SELECTED ROWS ══════
export function XESel(){
  if(!S.selectedRows.size){toast('Keine Zeilen ausgewählt');return}
  const rows=[...S.selectedRows].sort((a,b)=>a-b).map(i=>S.xD[i]);
  const ws=XLSX.utils.aoa_to_sheet([S.xH,...rows]),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Auswahl');
  const n=(S.xFn||'export').replace(/\.[^.]+$/,'')+'_auswahl.xlsx';
  XLSX.writeFile(wb,n);L('Export Auswahl',n+' ('+rows.length+')');toast(rows.length+' Zeilen exportiert ✓')
}
