import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';
import { invalidateAnalystCache } from './analyst.js';
// TODO: import _docxFooter from '...' (not yet extracted)
// TODO: import mr from '...' (not yet extracted)
// TODO: import dl from '...' (not yet extracted)
// TODO: import showX from '...' (not yet extracted)
// TODO: import XR from '...' (not yet extracted)
// TODO: import updateStatusBar from '...' (not yet extracted)
// TODO: import updateHiddenBadge from '...' (not yet extracted)
// TODO: import _debounce from '...' (not yet extracted)

// ══════ PDF GENERATION ══════
// Sanitize text for jsPDF (Helvetica can't render Unicode box-drawing chars)
export function _pdfSanitize(text){
  return text
    .replace(/[═╦╩╬╠╣╗╔╚╝║]/g,'-')
    .replace(/[━┳┻╋┣┫┓┏┗┛┃]/g,'-')
    .replace(/[─┬┴┼├┤┐┌└┘│]/g,'-')
    .replace(/[▀▄█▌▐░▒▓]/g,'')
    .replace(/⟪|⟫/g,'');
}
export function _pdfIsTitle(line){return line===line.toUpperCase()&&line.length>2&&/[A-ZÄÖÜ]/.test(line)&&line.length<60}
export function _pdfIsSep(line){return /^[-=_·•.]{4,}$/.test(line.trim())}
export function textToPDF(text, filename){
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const clean=_pdfSanitize(text);
  const lines=clean.split('\n');
  let y=25;const pageH=280;const lm=20;const tw=170;
  // Header line (date)
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(130,130,130);
  doc.text(new Date().toLocaleDateString('de-DE'),190,12,{align:'right'});
  // Footer text if available
  const ft=window._docxFooter||'';
  lines.forEach(line=>{
    const trimmed=line.trim();
    if(_pdfIsSep(trimmed)){
      // Draw a horizontal rule instead of broken chars
      doc.setDrawColor(180,180,180);doc.setLineWidth(0.3);
      doc.line(lm,y-1,lm+tw,y-1);y+=3;return;
    }
    if(_pdfIsTitle(trimmed)){
      if(y>pageH){doc.addPage();y=25}
      doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(0,0,0);
      const wrapped=doc.splitTextToSize(trimmed,tw);
      wrapped.forEach(wl=>{if(y>pageH){doc.addPage();y=25}doc.text(wl,lm,y);y+=6.5});
      doc.setFont('helvetica','normal');doc.setFontSize(11);
      return;
    }
    if(!trimmed){y+=4;return} // empty line = paragraph spacing
    doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(30,30,30);
    const wrapped=doc.splitTextToSize(trimmed,tw);
    wrapped.forEach(wl=>{
      if(y>pageH){doc.addPage();y=25}
      doc.text(wl,lm,y);y+=5.5;
    });
  });
  // Footer on each page
  if(ft){
    const pc=doc.internal.getNumberOfPages();
    for(let p=1;p<=pc;p++){
      doc.setPage(p);
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(150,150,150);
      doc.text(ft,105,290,{align:'center'});
    }
  }
  doc.save(filename);
}
export function XPDF(){
  if(!S.xH.length)return;
  if(S.filtered&&S.xBak&&!confirm('⚠ Filter aktiv! Es werden nur '+S.xD.length+' von '+S.xBak.length+' Zeilen exportiert.\n\nFortfahren?'))return;
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4',orientation:S.xH.length>6?'landscape':'portrait'});
  doc.setFont('helvetica','bold');doc.setFontSize(14);
  doc.text(S.xFn||'Daten-Export',14,15);
  doc.setFont('helvetica','normal');doc.setFontSize(8);
  doc.text(`${S.xD.length} Zeilen × ${S.xH.length} Spalten — ${new Date().toLocaleDateString('de-DE')}`,14,21);
  // Table
  const head=[S.xH.map(h=>h.length>15?h.slice(0,14)+'…':h)];
  const body=S.xD.map(r=>r.map(c=>{const s=String(c??'');return s.length>25?s.slice(0,24)+'…':s}));
  doc.autoTable({head,body,startY:25,styles:{font:'helvetica',fontSize:7,cellPadding:1.5},
    headStyles:{fillColor:[240,165,0],textColor:[0,0,0],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[245,245,250]},
    margin:{left:10,right:10}});
  const name=(S.xFn||'export').replace(/\.[^.]+$/,'')+'.pdf';
  doc.save(name);L('PDF Export',name);toast('PDF ✓');
}
export function WESPDF(){
  if(!S.wPv)return;
  textToPDF(S.wPv,'Vorschau.pdf');L('PDF','Vorschau.pdf');toast('PDF ✓');
}
export function WEAPDF(){
  if(!S.wD.length)return;
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const ft=window._docxFooter||'';
  const lm=20;const tw=170;
  S.wD.forEach((_,i)=>{
    if(i>0)doc.addPage();
    const clean=_pdfSanitize(window.mr(i));
    const lines=clean.split('\n');
    let y=25;
    // Page number + date header
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(130,130,130);
    doc.text(`Brief ${i+1}/${S.wD.length}`,lm,12);
    doc.text(new Date().toLocaleDateString('de-DE'),190,12,{align:'right'});
    lines.forEach(line=>{
      const trimmed=line.trim();
      if(_pdfIsSep(trimmed)){doc.setDrawColor(180);doc.setLineWidth(0.3);doc.line(lm,y-1,lm+tw,y-1);y+=3;return}
      if(_pdfIsTitle(trimmed)){
        if(y>280){doc.addPage();y=25}
        doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(0,0,0);
        const wr=doc.splitTextToSize(trimmed,tw);
        wr.forEach(wl=>{if(y>280){doc.addPage();y=25}doc.text(wl,lm,y);y+=6.5});
        doc.setFont('helvetica','normal');doc.setFontSize(11);return;
      }
      if(!trimmed){y+=4;return}
      doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(30,30,30);
      const wr=doc.splitTextToSize(trimmed,tw);
      wr.forEach(wl=>{if(y>280){doc.addPage();y=25}doc.text(wl,lm,y);y+=5.5});
    });
  });
  // Footer on every page
  if(ft){const pc=doc.internal.getNumberOfPages();for(let p=1;p<=pc;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(150);doc.text(ft,105,290,{align:'center'})}}
  doc.save(`Serienbriefe_${S.wD.length}.pdf`);
  L('PDF Serienbriefe',S.wD.length+'');toast(`📄 ${S.wD.length} Briefe in 1 PDF ✓`);
}
export function XE(fmt){if(!S.xH.length)return;if(S.filtered&&S.xBak){if(!confirm('⚠ Filter aktiv! Es werden nur '+S.xD.length+' von '+S.xBak.length+' Zeilen exportiert.\n\nFortfahren?'))return}if(fmt==='csv'){const sep=';';const rows=[S.xH.map(h=>'"'+h.replace(/"/g,'""')+'"').join(sep),...S.xD.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(sep))];const blob=new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});const n=(S.xFn||'export').replace(/\.[^.]+$/,'.csv');window.dl(blob,n);L('CSV Export',n);toast('CSV ✓');macLog('export',{n});return}const ws=XLSX.utils.aoa_to_sheet([S.xH,...S.xD]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Daten');const n=S.xFn.replace(/\.[^.]+$/,'_out.xlsx')||'export.xlsx';XLSX.writeFile(wb,n);L('Export',n);toast('✓');macLog('export',{n})}
export function toggleExpDD(e){e.stopPropagation();const dd=$('exp-dd');dd.classList.toggle('show');if(dd.classList.contains('show')){setTimeout(()=>document.addEventListener('click',closeExpDD,{once:true}),0)}}
export function closeExpDD(){const dd=$('exp-dd');if(dd)dd.classList.remove('show')}
export const _showXIds=['x-tbl','x-tabs','x-undoredo','tb-export-group','tb-sep-export','tb-sep-undo','tb-row-group','tb-sep-rows','tb-col-group','tb-sep-cols','tb-sel-group','tb-sep-sel','x-quick-ops'];
export const _colOptIds=['cf-col','so-col','fi-col','tf-col','dd-col','vl-scol','vl-rcol','ch-label','ch-data','pv-g','pv-a','vd-col','cs-else-tgt','ie-else-tgt','sw-else-tgt'];
export function showX(){$('x-empty').style.display='none';for(let i=0;i<_showXIds.length;i++){const el=$(_showXIds[i]);if(el)el.style.display=''}$('status-bar').classList.add('show');$('x-info').textContent=`${S.xFn} — ${S.xD.length}×${S.xH.length}`;const o=colOpts();for(let i=0;i<_colOptIds.length;i++){const el=$(_colOptIds[i]);if(el)el.innerHTML=o}$('sr-col').innerHTML='<option value="__ALL__">Alle</option>'+S.xH.map(h=>`<option value="${A(h)}">${H(h)}</option>`).join('');document.querySelectorAll('.ie-col,.sw-col1,.sw-col2').forEach(el=>el.innerHTML=o);$('w-use').style.display='';window.updateStatusBar();window.updateHiddenBadge();window.checkSEM();window.renderCalcH();window.renderSavedCases();window.renderSavedIE();window.renderMacList();window.renderSavedPipes();window.renderSavedSW()}
export const _VS_ROW_H=28;export const _VS_MAX=200; // virtual scroll: max rows rendered at once
export let _vsStart=0;
export function _vsRenderRow(ri){
  const row=S.xD[ri];if(!row)return'';
  const sel=S.selectedRows&&S.selectedRows.has(ri);
  const cells=row.map((c,ci2)=>{if(S.hiddenCols&&S.hiddenCols.has(ci2))return'';
    return`<td class="ed" onclick="CE(${ri},${ci2})" oncontextmenu="ctxCell(event,${ri},${ci2})" id="c${ri}-${ci2}">${H(String(c??''))}</td>`}).join('');
  return`<tr class="${sel?'selected':''}" data-ri="${ri}"><td class="rn">${ri+1}</td><td class="cb-cell"><input type="checkbox" ${sel?'checked':''} onchange="toggleRow(${ri},event)"></td>${cells}<td style="width:24px;text-align:center"><span class="rdl" onclick="XDR(${ri})" title="Zeile löschen">✕</span></td></tr>`;
}
export function XR(){
invalidateAnalystCache(); // invalidate caches on data change
const ths=S.xH.map((h,hi)=>{if(S.hiddenCols&&S.hiddenCols.has(hi))return'';const sa=S.sortCol===hi?(S.sortDir==='asc'?'▲':'▼'):'⇅';const saCls=S.sortCol===hi?'sort-arrow active':'sort-arrow';return`<th onclick="sortByClick(${hi})" oncontextmenu="ctxHeader(event,${hi})"><span>${H(h)}</span><span class="${saCls}">${sa}</span><div class="col-resize" onmousedown="startResize(event,${hi})"></div></th>`}).join('');
const allSel=S.selectedRows&&S.selectedRows.size===S.xD.length&&S.xD.length>0;
const useVS=S.xD.length>_VS_MAX;
const renderStart=useVS?_vsStart:0;
const renderEnd=useVS?Math.min(_vsStart+_VS_MAX,S.xD.length):S.xD.length;
let rows='';
if(useVS&&renderStart>0)rows+=`<tr style="height:${renderStart*_VS_ROW_H}px"><td colspan="${S.xH.length+3}"></td></tr>`;
for(let ri=renderStart;ri<renderEnd;ri++)rows+=_vsRenderRow(ri);
if(useVS&&renderEnd<S.xD.length)rows+=`<tr style="height:${(S.xD.length-renderEnd)*_VS_ROW_H}px"><td colspan="${S.xH.length+3}"></td></tr>`;
$('x-tw').innerHTML=`<table role="grid" aria-label="Datentabelle"><thead><tr><th class="rn" scope="col">#</th><th class="cb-cell" scope="col"><input type="checkbox" ${allSel?'checked':''} onchange="toggleAllRows(this.checked)" title="Alle auswählen" aria-label="Alle Zeilen auswählen"></th>${ths}<th style="width:24px" scope="col"></th></tr></thead><tbody>${rows}</tbody></table>`;
if(useVS){const tw=$('x-tw');if(!tw._vsEvt){tw._vsEvt=true;tw.addEventListener('scroll',window._debounce(function(){const st=tw.scrollTop;const newStart=Math.max(0,Math.floor(st/_VS_ROW_H)-20);if(Math.abs(newStart-_vsStart)>10){_vsStart=newStart;XR()}},60),{passive:true})}}
$('x-info').textContent=`${S.xFn} — ${S.xD.length}×${S.xH.length}${S.filtered?' ⚡':''}${useVS?' (virtuell)':''}`;window.updateStatusBar();if(window.cfApply)window.cfApply();if(window.applyComments)window.applyComments()}
export function CE(r,c){const td=$(`c${r}-${c}`);td.innerHTML=`<input class="ci" value="${A(String(S.xD[r][c]??''))}" onblur="CC(${r},${c},this)" onkeydown="if(event.key==='Enter')this.blur()" autofocus>`;td.querySelector('input').focus()}
export function CC(r,c,el){S.xD[r][c]=el.value;XR()}
export function XAR(){S.xD.push(S.xH.map(()=>''));XR()}
export function XDR(i){S.xD.splice(i,1);XR()}
export function XAC(){const n=prompt('Spaltenname:');if(!n)return;S.xH.push(n);S.xD.forEach(r=>r.push(''));showX();XR();L('Spalte hinzugefügt',n)}
export let _xtTabs,_xtPanels;export function XT(tab,pid){if(!_xtTabs)_xtTabs=document.querySelectorAll('#x-tabs .tab');if(!_xtPanels)_xtPanels=document.querySelectorAll('.tpanel');_xtTabs.forEach(t=>t.classList.remove('a'));_xtPanels.forEach(p=>p.classList.remove('a'));tab.classList.add('a');$(pid).classList.add('a')}
