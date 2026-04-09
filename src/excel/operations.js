import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';
// TODO: import pushUndo from '...' (not yet extracted)
// TODO: import showX from '../excel/export.js' (circular)
// TODO: import XR from '../excel/export.js' (circular)

// ══════ FORMULA HELPERS ══════
function _fmCol(name){return S.xH.findIndex(h=>h.toUpperCase()===name.trim().toUpperCase())}
function _fmErr(msg){$('fm-out').innerHTML=`<span class="tg tg-r">${msg||'?'}</span>`}
function _fmRes(v){$('fm-out').innerHTML=`<span class="fr">= ${v}</span>`}
function _fmNums(ci){return S.xD.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v))}
const _fmAlias={SUMME:'SUM',MITTELWERT:'AVG',ANZAHL:'COUNT',ANZAHLWENN:'COUNTIF',STABW:'STDEV',SUMMEWENN:'SUMIF',ZÄHLENWENN:'COUNTIF',MITTELWERTWENN:'AVERAGEIF',SVERWEIS:'VLOOKUP',XVERWEIS:'XLOOKUP',HEUTE:'TODAY',RUNDEN:'ROUND',AUFRUNDEN:'ROUNDUP',ABRUNDEN:'ROUNDDOWN',OBERGRENZE:'CEILING',UNTERGRENZE:'FLOOR',RANG:'RANK',QUARTILE:'QUARTILE',PERCENTILE:'PERCENTILE'};

// ══════ EXISTING OPS ══════
export function FM(){const raw=$('fm-in').value.trim().toUpperCase();
  // ─── SUMIF / AVERAGEIF / COUNTIFS ───
  const sif=raw.match(/^(SUMIF|SUMMEWENN|AVERAGEIF|MITTELWERTWENN|COUNTIFS?|ZÄHLENWENN)\((.+),(.+?)(?:,(.+))?\)$/);
  if(sif){let[,fn,cn,cd,vn]=sif;fn=_fmAlias[fn]||fn;const ci=_fmCol(cn);const vi=vn?_fmCol(vn):ci;if(ci===-1||(vn&&vi===-1)){_fmErr();return}let s=0,c=0;S.xD.forEach(r=>{if(String(r[ci]).toUpperCase()===cd.trim()){c++;const v=parseFloat(r[vi]);if(!isNaN(v))s+=v}});if(fn==='COUNTIF'||fn==='COUNTIFS')_fmRes(c);else if(fn==='AVERAGEIF')_fmRes(c?(s/c).toFixed(2):'0');else _fmRes(s.toFixed(2));return}
  // ─── XLOOKUP(value,searchCol,returnCol) ───
  const xl=raw.match(/^(?:XLOOKUP|XVERWEIS)\((.+),(.+),(.+)\)$/);
  if(xl){const[,val,sc,rc]=xl;const si=_fmCol(sc),ri=_fmCol(rc);if(si===-1||ri===-1){_fmErr();return}const row=S.xD.find(r=>String(r[si]).toUpperCase()===val.trim().replace(/^["']|["']$/g,''));_fmRes(row?H(String(row[ri])):'#NV');return}
  // ─── TODAY() / DATEDIF(date1,date2) ───
  if(raw==='TODAY()'||raw==='HEUTE()'){_fmRes(new Date().toLocaleDateString('de-DE'));return}
  const ddf=raw.match(/^DATEDIF\((.+),(.+)\)$/);
  if(ddf){try{const d1=new Date(ddf[1].trim().replace(/["']/g,'')),d2=new Date(ddf[2].trim().replace(/["']/g,''));const days=Math.round(Math.abs(d2-d1)/(1e3*60*60*24));_fmRes(days+' Tage')}catch{_fmErr()}return}
  // ─── ROUND/ROUNDUP/ROUNDDOWN(col,digits) ───
  const rnd=raw.match(/^(ROUND|ROUNDUP|ROUNDDOWN|RUNDEN|AUFRUNDEN|ABRUNDEN)\((.+),(\d+)\)$/);
  if(rnd){let[,fn,cn,dig]=rnd;fn=_fmAlias[fn]||fn;const ci=_fmCol(cn);if(ci===-1){_fmErr();return}const d=parseInt(dig);const vs=_fmNums(ci);if(!vs.length){_fmErr('∅');return}const avg=vs.reduce((a,b)=>a+b,0)/vs.length;let r;if(fn==='ROUNDUP')r=Math.ceil(avg*10**d)/10**d;else if(fn==='ROUNDDOWN')r=Math.floor(avg*10**d)/10**d;else r=Number(avg.toFixed(d));_fmRes(r);return}
  // ─── RANK(value,col) / PERCENTILE(col,pct) / QUARTILE(col,q) ───
  const rk=raw.match(/^(RANK|RANG)\((.+),(.+)\)$/);
  if(rk){const val=parseFloat(rk[2]),ci=_fmCol(rk[3]);if(isNaN(val)||ci===-1){_fmErr();return}const vs=_fmNums(ci).sort((a,b)=>b-a);_fmRes('#'+(vs.indexOf(val)+1)+' von '+vs.length);return}
  const pct=raw.match(/^PERCENTILE\((.+),([\d.]+)\)$/);
  if(pct){const ci=_fmCol(pct[1]),p=parseFloat(pct[2]);if(ci===-1||isNaN(p)){_fmErr();return}const vs=_fmNums(ci).sort((a,b)=>a-b);const idx=p*(vs.length-1);const lo=Math.floor(idx),hi=Math.ceil(idx);_fmRes(lo===hi?vs[lo].toFixed(2):(vs[lo]+(vs[hi]-vs[lo])*(idx-lo)).toFixed(2));return}
  // ─── Standard aggregations ───
  const m=raw.match(/^(SUM|SUMME|AVG|AVERAGE|MITTELWERT|COUNT|ANZAHL|COUNTIF|ANZAHLWENN|MIN|MAX|MEDIAN|STDEV|STABW)\((.+)\)$/);if(!m){_fmErr();return}let[,fn,cn]=m;if(_fmAlias[fn])fn=_fmAlias[fn];const ci=_fmCol(cn);if(ci===-1){_fmErr();return}const vs=_fmNums(ci);if(!vs.length){_fmErr('∅');return}let res;switch(fn){case'SUM':res=vs.reduce((a,b)=>a+b,0).toFixed(2);break;case'AVG':case'AVERAGE':res=(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2);break;case'COUNT':res=vs.length;break;case'COUNTIF':res=S.xD.filter(r=>r[ci]!==''&&r[ci]!=null).length;break;case'MIN':res=Math.min(...vs).toFixed(2);break;case'MAX':res=Math.max(...vs).toFixed(2);break;case'MEDIAN':vs.sort((a,b)=>a-b);const mid=Math.floor(vs.length/2);res=vs.length%2?vs[mid].toFixed(2):((vs[mid-1]+vs[mid])/2).toFixed(2);break;case'STDEV':const avg=vs.reduce((a,b)=>a+b,0)/vs.length;res=Math.sqrt(vs.reduce((s,v)=>s+Math.pow(v-avg,2),0)/vs.length).toFixed(4);break}_fmRes(res)}
export function PV(){const gc=$('pv-g').value,ac=$('pv-a').value,fn=$('pv-f').value;if(!gc||!ac)return;const gi=S.xH.indexOf(gc),ai=S.xH.indexOf(ac);const grp={};S.xD.forEach(r=>{const k=String(r[gi]||'—');if(!grp[k])grp[k]=[];const v=parseFloat(r[ai]);if(!isNaN(v))grp[k].push(v)});let rows='';for(const[k,vs]of Object.entries(grp)){let r;switch(fn){case'SUM':r=vs.reduce((a,b)=>a+b,0).toFixed(2);break;case'AVG':r=vs.length?(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2):'0';break;case'COUNT':r=vs.length;break;case'MIN':r=Math.min(...vs).toFixed(2);break;case'MAX':r=Math.max(...vs).toFixed(2);break;case'MEDIAN':vs.sort((a,b)=>a-b);const m=Math.floor(vs.length/2);r=vs.length%2?vs[m].toFixed(2):((vs[m-1]+vs[m])/2).toFixed(2);break}rows+=`<tr><td>${H(k)}</td><td style="text-align:right;font-weight:700;color:var(--acc)">${r}</td></tr>`}$('pv-out').innerHTML=`<table><thead><tr><th>${H(gc)}</th><th style="text-align:right">${fn}(${H(ac)})</th></tr></thead><tbody>${rows}</tbody></table>`}
export function SO(){const col=$('so-col').value,dir=$('so-dir').value;if(!col)return;window.pushUndo();const ci=S.xH.indexOf(col);S.xD.sort((a,b)=>{const na=parseFloat(a[ci]),nb=parseFloat(b[ci]);if(!isNaN(na)&&!isNaN(nb))return dir==='asc'?na-nb:nb-na;return dir==='asc'?String(a[ci]).localeCompare(String(b[ci])):String(b[ci]).localeCompare(String(a[ci]))});window.XR();L('Sort',`${col}`);toast('✓');macLog('sort',{col,dir})}
export function FI(){const col=$('fi-col').value,op=$('fi-op').value,val=$('fi-val').value;if(!col)return;const ci=S.xH.indexOf(col);if(!S.xBak)S.xBak=S.xD.map(r=>[...r]);S.xD=S.xBak.filter(r=>{const c=String(r[ci]??''),n=parseFloat(c),nv=parseFloat(val);switch(op){case'enthält':return c.toLowerCase().includes(val.toLowerCase());case'beginnt mit':return c.toLowerCase().startsWith(val.toLowerCase());case'endet mit':return c.toLowerCase().endsWith(val.toLowerCase());case'=':return c===val;case'≠':return c!==val;case'>':return!isNaN(n)&&n>nv;case'<':return!isNaN(n)&&n<nv;case'leer':return!c.trim();case'nicht leer':return!!c.trim()}return true});S.filtered=true;window.XR();$('fi-info').textContent=`${S.xD.length}/${S.xBak.length}`;L('Filter',`${col} ${op}`);toast('✓');macLog('filter',{col,op,val})}
export function FIR(){if(S.xBak){S.xD=S.xBak;S.xBak=null;S.filtered=false;window.XR();$('fi-info').textContent='';toast('✓');macLog('filterReset',{})}}
export function SR(){const f=$('sr-find').value,r=$('sr-rep').value,col=$('sr-col').value;if(!f)return;window.pushUndo();let c=0;S.xD.forEach(row=>row.forEach((v,ci)=>{if(col!=='__ALL__'&&S.xH[ci]!==col)return;const s=String(v);if(s.includes(f)){row[ci]=s.split(f).join(r);c++}}));window.XR();$('sr-out').textContent=c+' ersetzt';toast(c+' ✓');macLog('sr',{find:f,rep:r,col})}
export function TF(){const col=$('tf-col').value,fn=$('tf-fn').value,n=parseInt($('tf-n').value)||5;if(!col)return;window.pushUndo();const ci=S.xH.indexOf(col);S.xD.forEach(r=>{let s=String(r[ci]??'');switch(fn){case'UPPER':r[ci]=s.toUpperCase();break;case'LOWER':r[ci]=s.toLowerCase();break;case'TRIM':r[ci]=s.trim().replace(/\s+/g,' ');break;case'PROPER':r[ci]=s.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());break;case'LEN':r[ci]=s.length;break;case'LEFT(n)':r[ci]=s.substring(0,n);break;case'RIGHT(n)':r[ci]=s.substring(s.length-n);break;case'REVERSE':r[ci]=s.split('').reverse().join('');break}});window.XR();toast('✓');macLog('textfn',{col,fn})}
export function DD(){const col=$('dd-col').value;if(!col)return;window.pushUndo();const ci=S.xH.indexOf(col),b=S.xD.length,seen=new Set();S.xD=S.xD.filter(r=>{const v=String(r[ci]);if(seen.has(v))return false;seen.add(v);return true});window.XR();$('dd-out').textContent=`${b-S.xD.length} entf.`;toast('✓');macLog('dedup',{col})}
export function VL(){const val=$('vl-val').value,sc=$('vl-scol').value,rc=$('vl-rcol').value;if(!val||!sc||!rc)return;const si=S.xH.indexOf(sc),ri=S.xH.indexOf(rc);const row=S.xD.find(r=>String(r[si]).toLowerCase()===val.toLowerCase());$('vl-out').innerHTML=row?`<span class="fr">= ${H(String(row[ri]))}</span>`:'<span class="tg tg-r">#NV</span>'}
export function CH(){const type=$('ch-type').value,lc=$('ch-label').value,dc=$('ch-data').value;if(!lc||!dc)return;const li=S.xH.indexOf(lc),di=S.xH.indexOf(dc);const labels=S.xD.map(r=>String(r[li])).slice(0,30),data=S.xD.map(r=>parseFloat(r[di])||0).slice(0,30);const clr=['#f0a500','#4da6ff','#00e08e','#ff4d6a','#a78bfa','#22d3ee','#f97316','#ec4899','#84cc16'];$('ch-wrap').style.display='';if(S.chart)S.chart.destroy();S.chart=new Chart($('ch-canvas'),{type,data:{labels,datasets:[{label:dc,data,backgroundColor:type==='line'?'rgba(240,165,0,.2)':labels.map((_,i)=>clr[i%clr.length]+'cc'),borderColor:type==='line'?'#f0a500':labels.map((_,i)=>clr[i%clr.length]),borderWidth:2,tension:.3,fill:type==='line'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#dfe6f0',font:{family:'IBM Plex Mono'}}}},scales:['pie','doughnut','radar'].includes(type)?{}:{x:{ticks:{color:'#5c7194'},grid:{color:'#1a274422'}},y:{ticks:{color:'#5c7194'},grid:{color:'#1a274444'}}}}})}

// ══════ PRÜFSPALTEN / VALIDIERUNG ══════
document.getElementById('vd-fmt').addEventListener('change',function(){const c=this.value==='custom';$('vd-ctrue').style.display=c?'':'none';$('vd-cfalse').style.display=c?'':'none'});
export function VD_RUN(){
  const col=$('vd-col').value,type=$('vd-type').value,p1=$('vd-p1').value,p2=$('vd-p2').value;
  const outName=$('vd-out').value.trim()||'Prüfung';const fmt=$('vd-fmt').value;
  if(!col){toast('Spalte wählen');return}window.pushUndo();
  const ci=S.xH.indexOf(col);if(ci===-1)return;
  // Add output column if not exists
  let oi=S.xH.indexOf(outName);
  if(oi===-1){S.xH.push(outName);S.xD.forEach(r=>r.push(''));oi=S.xH.length-1}
  const trueVal=fmt==='bool'?'✓':fmt==='jn'?'Ja':fmt==='10'?'1':$('vd-ctrue').value||'Wahr';
  const falseVal=fmt==='bool'?'✗':fmt==='jn'?'Nein':fmt==='10'?'0':$('vd-cfalse').value||'Falsch';
  // Duplicate detection - precompute
  let dupeSet=null;
  if(type==='duplicate'){const counts={};S.xD.forEach(r=>{const v=String(r[ci]??'');counts[v]=(counts[v]||0)+1});dupeSet=new Set(Object.keys(counts).filter(k=>counts[k]>1))}
  let hits=0;
  S.xD.forEach(r=>{
    const v=String(r[ci]??''),n=parseFloat(v);let pass=false;
    switch(type){
      case'empty':pass=!v.trim();break;
      case'filled':pass=!!v.trim();break;
      case'numeric':pass=v.trim()!==''&&!isNaN(Number(v));break;
      case'email':pass=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);break;
      case'duplicate':pass=dupeSet.has(v);break;
      case'len_min':pass=v.length>=parseInt(p1||0);break;
      case'len_max':pass=v.length<=parseInt(p1||999);break;
      case'between':pass=!isNaN(n)&&n>=parseFloat(p1)&&n<=parseFloat(p2);break;
      case'in_list':const list=p1.split(',').map(s=>s.trim().toLowerCase());pass=list.includes(v.toLowerCase());break;
      case'regex':try{pass=new RegExp(p1).test(v)}catch(e){toast('Ungültiger Regex: '+e.message,'error');pass=false};break;
      case'starts':pass=v.toLowerCase().startsWith(p1.toLowerCase());break;
      case'ends':pass=v.toLowerCase().endsWith(p1.toLowerCase());break;
      case'contains_num':pass=/\d/.test(v);break;
      case'all_upper':pass=v===v.toUpperCase()&&v.trim()!=='';break;
    }
    r[oi]=pass?trueVal:falseVal;if(pass)hits++;
  });
  window.showX();window.XR();
  $('vd-result').innerHTML=`<span class="tg tg-g">${hits}/${S.xD.length} bestanden</span>`;
  L('Prüfung',`${type} auf ${col}: ${hits}/${S.xD.length}`);toast(`Prüfung: ${hits}/${S.xD.length} ✓`);
}
