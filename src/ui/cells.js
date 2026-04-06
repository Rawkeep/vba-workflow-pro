// ══════ CELL OPERATIONS ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, toast are cross-module dependencies from core
// TODO: pushUndo is from ./undo-redo.js

export async function pasteToCell(r,c){try{const t=await navigator.clipboard.readText();pushUndo();S.xD[r][c]=t;XR();toast('📥 Eingefügt')}catch{toast('Zwischenablage nicht verfügbar')}}
export function clearCell(r,c){pushUndo();S.xD[r][c]='';XR()}
export function fillDown(fromR,c){if(fromR>=S.xD.length-1)return;pushUndo();const val=S.xD[fromR][c];if(S.selectedRows.size>0){[...S.selectedRows].sort((a,b)=>a-b).forEach(ri=>{if(ri!==fromR)S.xD[ri][c]=val})}else{for(let i=fromR+1;i<S.xD.length;i++)S.xD[i][c]=val}XR();toast('↓ Gefüllt')}
export function insertRowAbove(ri){pushUndo();S.xD.splice(ri,0,S.xH.map(()=>''));XR()}
export function insertRowBelow(ri){pushUndo();S.xD.splice(ri+1,0,S.xH.map(()=>''));XR()}

// ══════ SORT BY CLICK ══════
export function sortByClick(ci){if(S.sortCol===ci){S.sortDir=S.sortDir==='asc'?'desc':'asc'}else{S.sortCol=ci;S.sortDir='asc'}pushUndo();S.xD.sort((a,b)=>{const na=parseFloat(a[ci]),nb=parseFloat(b[ci]);if(!isNaN(na)&&!isNaN(nb))return S.sortDir==='asc'?na-nb:nb-na;return S.sortDir==='asc'?String(a[ci]).localeCompare(String(b[ci])):String(b[ci]).localeCompare(String(a[ci]))});S.selectedRows.clear();XR();toast(`${S.xH[ci]} ${S.sortDir==='asc'?'A→Z':'Z→A'}`)}

// ══════ STATUS BAR ══════
export function updateStatusBar(){if(!$('sb-rows'))return;$('sb-rows').textContent=S.xD.length;$('sb-cols').textContent=S.xH.length-S.hiddenCols.size;const ns=S.selectedRows.size;$('sb-sel-wrap').style.display=ns?'':'none';$('sb-sel').textContent=ns;
if(ns>0){const vals=[];[...S.selectedRows].forEach(ri=>{S.xD[ri].forEach(c=>{const n=parseFloat(c);if(!isNaN(n))vals.push(n)})});if(vals.length){const sum=vals.reduce((a,b)=>a+b,0);$('sb-sum-wrap').style.display='';$('sb-sum').textContent=sum.toLocaleString('de-DE',{maximumFractionDigits:2});$('sb-avg-wrap').style.display='';$('sb-avg').textContent=(sum/vals.length).toLocaleString('de-DE',{maximumFractionDigits:2})}else{$('sb-sum-wrap').style.display='none';$('sb-avg-wrap').style.display='none'}}else{$('sb-sum-wrap').style.display='none';$('sb-avg-wrap').style.display='none'}}
