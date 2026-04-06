// ══════ EXCEL-KILLER UX ENGINE ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, CE, toast, H, _appLog are cross-module dependencies from core
// TODO: pushUndo is from ../ui/undo-redo.js
// TODO: detectColTypes is from ./analyst.js
// TODO: showColFilter, closeColFilter, _colFilters are defined here
// TODO: showCellTip, hideCellTip are defined here

// ── Formula / Address Bar ──
let _activeCell=null; // {r, c}
export { _activeCell };

export function setActiveCell(r,c){
  _activeCell={r,c};
  document.querySelectorAll('td.active-cell').forEach(td=>td.classList.remove('active-cell'));
  const td=$(`c${r}-${c}`);if(td)td.classList.add('active-cell');
  const fb=$('formula-bar');if(fb)fb.classList.add('show');
  const addr=$('fb-addr');if(addr)addr.textContent=colLetter(c)+(r+1);
  const inp=$('fb-input');if(inp){inp.value=String(S.xD[r]?.[c]??'');inp.placeholder=''}
  const ft=$('fb-type');
  if(ft){
    const types=detectColTypes();
    const t=types[c];
    ft.innerHTML=t?`<span class="col-type ${t.cls}">${t.icon}</span>${t.type}`:'';
  }
}
export function colLetter(ci){let s='';ci++;while(ci>0){ci--;s=String.fromCharCode(65+(ci%26))+s;ci=Math.floor(ci/26)}return s}
export function fbKeydown(e){
  if(e.key==='Enter'&&_activeCell){
    e.preventDefault();
    pushUndo();
    S.xD[_activeCell.r][_activeCell.c]=$('fb-input').value;
    XR();setActiveCell(_activeCell.r,_activeCell.c);
    toast('✓');
  }
  if(e.key==='Escape'){$('fb-input').blur();_activeCell=null;document.querySelectorAll('td.active-cell').forEach(td=>td.classList.remove('active-cell'))}
}
export function fbBlur(){/* keep showing last value */}

// ── Column Auto-Filter Dropdowns ──
export let _colFilters={}; // {colIndex: Set of allowed values}
export function showColFilter(ev,ci){
  ev.preventDefault();ev.stopPropagation();
  const dd=$('col-filter-dd');
  const vals=new Set(S.xD.map(r=>String(r[ci]??'')));
  const sorted=[...vals].sort();
  const current=_colFilters[ci];
  const allChecked=!current||current.size===vals.size;

  let html=`<div class="cfd-header"><input class="cfd-search" placeholder="Filtern…" oninput="filterDDSearch(${ci},this.value)"><span style="cursor:pointer;color:var(--tx2)" onclick="closeColFilter()">✕</span></div>`;
  html+=`<div class="cfd-list" id="cfd-list-${ci}">`;
  html+=`<div class="cfd-item"><input type="checkbox" ${allChecked?'checked':''} onchange="filterDDToggleAll(${ci},this.checked)"><span style="font-weight:600;color:var(--acc)">(Alle)</span></div>`;
  sorted.forEach(v=>{
    const checked=!current||current.has(v);
    const display=v||'(Leer)';
    html+=`<div class="cfd-item" data-val="${H(v)}"><input type="checkbox" ${checked?'checked':''} data-fv="${H(v)}" onchange="filterDDToggle(${ci})"><span>${H(display)}</span></div>`;
  });
  html+=`</div><div class="cfd-footer"><button class="b bo bs" onclick="clearColFilter(${ci})">Zurücksetzen</button><button class="b bp bs" onclick="applyColFilter(${ci})">Anwenden</button></div>`;
  dd.innerHTML=html;
  dd.classList.add('show');
  const x=Math.min(ev.clientX,innerWidth-220);
  const y=Math.min(ev.clientY,innerHeight-340);
  dd.style.left=x+'px';dd.style.top=y+'px';
}
export function closeColFilter(){$('col-filter-dd').classList.remove('show')}
export function filterDDSearch(ci,q){
  q=q.toLowerCase();
  document.querySelectorAll(`#cfd-list-${ci} .cfd-item`).forEach((el,i)=>{
    if(i===0)return; // skip "(Alle)"
    el.style.display=el.dataset.val?.toLowerCase().includes(q)?'':'none';
  });
}
export function filterDDToggleAll(ci,checked){
  document.querySelectorAll(`#cfd-list-${ci} input[data-fv]`).forEach(cb=>cb.checked=checked);
}
export function filterDDToggle(ci){/* individual toggle, applied on "Anwenden" */}
export function applyColFilter(ci){
  const checks=document.querySelectorAll(`#cfd-list-${ci} input[data-fv]`);
  const allowed=new Set();
  checks.forEach(cb=>{if(cb.checked)allowed.add(cb.dataset.fv)});
  if(allowed.size===checks.length){delete _colFilters[ci]}
  else{_colFilters[ci]=allowed}
  applyAllFilters();
  closeColFilter();
}
export function clearColFilter(ci){
  delete _colFilters[ci];
  applyAllFilters();
  closeColFilter();
}
export function applyAllFilters(){
  const hasFilters=Object.keys(_colFilters).length>0;
  if(!hasFilters){
    if(S.xBak){S.xD=S.xBak;S.xBak=null;S.filtered=false}
    XR();return;
  }
  const src=S.xBak||S.xD;
  if(!S.xBak)S.xBak=S.xD.map(r=>[...r]);
  S.xD=src.filter(r=>{
    return Object.entries(_colFilters).every(([ci,allowed])=>allowed.has(String(r[ci]??'')));
  });
  S.filtered=true;
  XR();
  const total=S.xBak.length;
  toast(`⚡ ${S.xD.length} von ${total} Zeilen`);
}

// ── Clipboard Multi-Cell Paste ──
export function initClipboardPaste() {
  document.addEventListener('paste',function(e){
    if(e.target.matches('input,textarea,select,.ci'))return;
    if(!_activeCell||!S.xH.length)return;
    e.preventDefault();
    const text=(e.clipboardData||window.clipboardData).getData('text');
    if(!text)return;
    const rows=text.split(/\r?\n/).filter(r=>r.length>0);
    if(rows.length===0)return;
    pushUndo();
    const startR=_activeCell.r,startC=_activeCell.c;
    rows.forEach((row,ri)=>{
      const cells=row.split('\t');
      cells.forEach((val,ci)=>{
        const tr=startR+ri,tc=startC+ci;
        if(tr<S.xD.length&&tc<S.xH.length)S.xD[tr][tc]=val;
      });
    });
    XR();
    const pastedCells=rows.length*rows[0].split('\t').length;
    toast(`📋 ${pastedCells} Zellen eingefügt`);
  });
}

// ── Cell Hover Tooltips ──
let _tipTimer=null;
export function showCellTip(ev,r,c){
  clearTimeout(_tipTimer);
  const val=String(S.xD[r]?.[c]??'');
  if(val.length<20)return;
  _tipTimer=setTimeout(()=>{
    const tip=$('cell-tip');if(!tip)return;
    tip.textContent=val;
    tip.style.display='block';
    tip.style.left=Math.min(ev.clientX+10,innerWidth-420)+'px';
    tip.style.top=Math.min(ev.clientY-30,innerHeight-60)+'px';
  },500);
}
export function hideCellTip(){clearTimeout(_tipTimer);const tip=$('cell-tip');if(tip)tip.style.display='none'}

// ── Auto-fit Column Width ──
export function autoFitCol(ci){
  const th=document.querySelector(`#x-tw thead th:nth-child(${ci+3})`); // +3 for #, checkbox
  if(!th)return;
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  ctx.font='12px "IBM Plex Mono"';
  let maxW=ctx.measureText(S.xH[ci]).width;
  S.xD.forEach(r=>{const w=ctx.measureText(String(r[ci]??'')).width;if(w>maxW)maxW=w});
  th.style.width=Math.min(Math.max(maxW+30,50),350)+'px';
  th.style.minWidth=th.style.width;
}
export function autoFitAllCols(){S.xH.forEach((_,i)=>autoFitCol(i))}

// ── Fullscreen Data Mode ──
export function toggleFullscreen(){
  document.body.classList.toggle('fullscreen-data');
  const isFS=document.body.classList.contains('fullscreen-data');
  $('fs-toggle').textContent=isFS?'✕ Beenden':'⛶ Vollbild';
}

// ── Sparklines in Headers ──
export function drawSparkline(canvas,data,w,h){
  const ctx=canvas.getContext('2d');
  canvas.width=w;canvas.height=h;
  ctx.clearRect(0,0,w,h);
  if(data.length<2)return;
  const min=Math.min(...data),max=Math.max(...data);
  const range=max-min||1;
  ctx.strokeStyle='rgba(77,166,255,.6)';
  ctx.lineWidth=1.2;ctx.beginPath();
  data.forEach((v,i)=>{
    const x=(i/(data.length-1))*w;
    const y=h-((v-min)/range)*h;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();
  // dot on last value
  const lastX=w,lastY=h-((data[data.length-1]-min)/range)*h;
  ctx.fillStyle=data[data.length-1]>=data[0]?'rgba(0,224,142,.8)':'rgba(255,77,106,.8)';
  ctx.beginPath();ctx.arc(lastX,lastY,2,0,Math.PI*2);ctx.fill();
}

// ── Smart Number Formatting ──
export function fmtNum(val,colName){
  const n=parseFloat(val);if(isNaN(n))return null;
  const name=(colName||'').toLowerCase();
  if(name.includes('eur')||name.includes('betrag')||name.includes('preis')||name.includes('netto')||name.includes('brutto')||name.includes('umsatz')||name.includes('wert'))
    return{formatted:n.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:0}),isCurrency:true};
  if(name.includes('satz')||name.includes('prozent')||name.includes('pct')||name.includes('anteil'))
    return{formatted:n.toLocaleString('de-DE',{maximumFractionDigits:1}),isPct:true};
  if(name.includes('kg')||name.includes('gewicht'))
    return{formatted:n.toLocaleString('de-DE',{maximumFractionDigits:0}),isWeight:true};
  return{formatted:n.toLocaleString('de-DE',{maximumFractionDigits:2})};
}

// ── Enhanced Cell Editing with Active Cell ──
export function initEnhancedCellEditing() {
  const _origCE=CE;
  CE=function(r,c){
    setActiveCell(r,c);
    _origCE(r,c);
    // After edit opens, sync formula bar
    setTimeout(()=>{
      const inp=document.querySelector(`#c${r}-${c} input.ci`);
      if(inp){
        inp.addEventListener('input',()=>{$('fb-input').value=inp.value});
      }
    },30);
  };
}

// ── Override XR to add all enhancements ──
export function initExcelXROverride() {
  const _origXR_excel=XR;
  XR=function(){
    _origXR_excel();
    if(!S.xH.length||!S.xD.length)return;
    try{
      const types=detectColTypes();

      // Formula bar visibility
      const fb=$('formula-bar');if(fb&&S.xH.length)fb.classList.add('show');

      // Fullscreen toggle visibility
      const fst=$('fs-toggle');if(fst)fst.classList.toggle('show',S.xH.length>0);

      // Event delegation on table (replaces per-cell inline handlers)
      const tbl=$('x-tw');
      if(!tbl._delEvt){
        tbl._delEvt=true;
        tbl.addEventListener('mousedown',function(e){
          const td=e.target.closest('td.ed');if(!td)return;
          const m=td.id.match(/^c(\d+)-(\d+)$/);if(m)setActiveCell(+m[1],+m[2]);
        });
        tbl.addEventListener('mouseenter',function(e){
          const td=e.target.closest('td.ed');if(!td)return;
          if(td.textContent.length>18){const m=td.id.match(/^c(\d+)-(\d+)$/);if(m)showCellTip(e,+m[1],+m[2])}
        },true);
        tbl.addEventListener('mouseleave',function(e){
          if(e.target.closest('td.ed'))hideCellTip();
        },true);
      }
      // Batch DOM reads/writes via rAF for active cell + type styling
      requestAnimationFrame(()=>{
        if(_activeCell){const atd=$(`c${_activeCell.r}-${_activeCell.c}`);if(atd)atd.classList.add('active-cell')}
        // Precompute type lookups
        const numCols=new Set(),dateCols=new Set();
        types.forEach((t,ci)=>{if(t?.type==='number')numCols.add(ci);if(t?.type==='date')dateCols.add(ci)});
        if(!numCols.size&&!dateCols.size)return;
        const tbody=tbl.querySelector('tbody');if(!tbody)return;
        const trs=tbody.children;
        for(let t=0;t<trs.length;t++){
          const tr=trs[t];if(!tr.dataset.ri)continue;
          const ri=+tr.dataset.ri,row=S.xD[ri];if(!row)continue;
          const tds=tr.children;
          for(let j=2;j<tds.length-1;j++){
            const ci=j-2;const td=tds[j];
            if(numCols.has(ci)){const v=parseFloat(row[ci]);if(v<0)td.classList.add('num-neg');td.title=String(row[ci])}
            if(dateCols.has(ci)&&String(row[ci]).match(/\d/))td.classList.add('date-cell');
          }
        }
      });

      // Sparklines + filter icons in single pass over headers
      const ths2=tbl.querySelectorAll('thead th');
      for(let i=0;i<ths2.length;i++){
        const ci=i-2,th=ths2[i];
        if(ci<0||ci>=S.xH.length)continue;
        // Filter styling
        if(_colFilters[ci])th.classList.add('filtered');
        // Event: only attach once
        if(!th._dblEvt){th._dblEvt=true;th.addEventListener('dblclick',(ev)=>{ev.stopPropagation();showColFilter(ev,ci)})}
        // Sparklines for numeric columns
        if(ci<types.length&&types[ci]?.type==='number'&&!th.querySelector('.spark-wrap')){
          const nums=S.xD.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v));
          if(nums.length>=3){const wrap=document.createElement('span');wrap.className='spark-wrap';const cv=document.createElement('canvas');cv.style.width='36px';cv.style.height='12px';wrap.appendChild(cv);const span=th.querySelector('span:first-child');if(span)span.appendChild(wrap);drawSparkline(cv,nums,36,12)}
        }
      }

      // Auto-fit on first render
      if(!S._autoFitted&&S.xD.length){S._autoFitted=true;setTimeout(autoFitAllCols,100)}

    }catch(e){_appLog('XR-Excel: '+e.message)}
  };
}

// ── Enhanced Keyboard Navigation ──
export function initExcelKeyboardNav() {
  document.addEventListener('keydown',function(e){
    // Arrow key navigation when not editing
    if(!e.target.matches('input,textarea,select,.ci')&&_activeCell&&S.xD.length){
      const {r,c}=_activeCell;
      if(e.key==='ArrowRight'){e.preventDefault();let nc=c+1;while(nc<S.xH.length&&S.hiddenCols?.has(nc))nc++;if(nc<S.xH.length)setActiveCell(r,nc)}
      if(e.key==='ArrowLeft'){e.preventDefault();let nc=c-1;while(nc>=0&&S.hiddenCols?.has(nc))nc--;if(nc>=0)setActiveCell(r,nc)}
      if(e.key==='ArrowDown'){e.preventDefault();if(r+1<S.xD.length)setActiveCell(r+1,c)}
      if(e.key==='ArrowUp'){e.preventDefault();if(r>0)setActiveCell(r-1,c)}
      if(e.key==='Enter'){e.preventDefault();CE(r,c)} // Enter opens cell editor
      if(e.key==='F2'){e.preventDefault();CE(r,c)} // F2 like Excel
      // Type to start editing
      if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        CE(r,c);
        setTimeout(()=>{
          const inp=document.querySelector(`#c${r}-${c} input.ci`);
          if(inp){inp.value=e.key;inp.setSelectionRange(1,1)}
        },30);
        e.preventDefault();
      }
    }
    // Ctrl+Shift+F for column filter on active cell
    if(e.ctrlKey&&e.shiftKey&&e.key==='F'&&_activeCell){
      e.preventDefault();
      const th=document.querySelector(`#x-tw thead th:nth-child(${_activeCell.c+3})`);
      if(th){const rect=th.getBoundingClientRect();showColFilter({preventDefault:()=>{},stopPropagation:()=>{},clientX:rect.left,clientY:rect.bottom},_activeCell.c)}
    }
  },true);

  // Close filter dropdown on outside click
  document.addEventListener('mousedown',e=>{
    if(!e.target.closest('#col-filter-dd')&&$('col-filter-dd').classList.contains('show'))closeColFilter();
  });

  // Escape closes fullscreen
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.body.classList.contains('fullscreen-data'))toggleFullscreen();
  });
}
