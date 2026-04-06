// ══════ DRAG & DROP ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, toast, L, N are cross-module dependencies from core
// TODO: showX, loadSheet are cross-module dependencies from core
// TODO: autoSave is from ./auto-save.js
// TODO: XLSX, _wb are global dependencies

export function initDragDrop() {
  document.addEventListener('dragover',e=>{e.preventDefault();$('drop-zone').classList.add('active')});
  document.addEventListener('dragleave',e=>{if(e.relatedTarget===null||!document.contains(e.relatedTarget))$('drop-zone').classList.remove('active')});
  $('drop-zone').addEventListener('dragover',e=>e.preventDefault());
  $('drop-zone').addEventListener('drop',e=>{
    e.preventDefault();$('drop-zone').classList.remove('active');
    const f=e.dataTransfer.files[0];if(!f)return;
    const ext=f.name.split('.').pop().toLowerCase();
    if(!['xlsx','xls','csv','tsv','txt'].includes(ext)){window.toast('Nur XLSX/CSV/TSV');return}
    const r=new FileReader();
    r.onload=ev=>{try{
      const opts={type:'array',cellDates:true,cellText:true,raw:false};
      window._wb=XLSX.read(ev.target.result,opts);
      if(window._wb.SheetNames.length>1){$('x-sheet').style.display='';$('x-sheet').innerHTML=window._wb.SheetNames.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}else{$('x-sheet').style.display='none'}
      S.xFn=f.name;window.N('excel');window.loadSheet(0);
      window.L('Drop Import',f.name);window.toast('📂 '+f.name+' ✓');
    }catch(e){alert('Import-Fehler: '+e.message)}};
    r.readAsArrayBuffer(f);
  });
}
