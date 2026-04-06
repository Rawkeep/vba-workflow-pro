// ══════ CONTROLLER / DATA ANALYST ENGINE ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: XR, _appLog, _cacheKey are cross-module dependencies from core
// TODO: _typeCache, _typeCacheKey, _qualCache, _qualCacheKey are module-level caches

let _typeCache=null;
let _typeCacheKey='';
let _qualCache=null;
let _qualCacheKey='';

// Column type detection (cached)
export function detectColTypes(){
  if(!S.xH.length)return[];
  const ck=_cacheKey();
  if(_typeCache&&_typeCacheKey===ck)return _typeCache;
  _typeCacheKey=ck;
  _typeCache=S.xH.map((h,ci)=>{
    const vals=S.xD.map(r=>r[ci]).filter(v=>v!==''&&v!=null&&String(v).trim()!=='');
    if(!vals.length)return{type:'empty',icon:'○',cls:'txt'};
    const nums=vals.filter(v=>!isNaN(parseFloat(v))&&isFinite(v));
    const dates=vals.filter(v=>/^\d{4}-\d{2}-\d{2}/.test(String(v))||/^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(String(v)));
    if(nums.length>=vals.length*.7)return{type:'number',icon:'#',cls:'num'};
    if(dates.length>=vals.length*.7)return{type:'date',icon:'📅',cls:'date'};
    const unique=new Set(vals);
    if(unique.size<=Math.min(12,vals.length*.4))return{type:'category',icon:'◉',cls:'cat'};
    return{type:'text',icon:'T',cls:'txt'};
  });
  return _typeCache;
}

// Data quality score (cached)
export function calcDataQuality(){
  if(!S.xD.length||!S.xH.length)return{score:0,total:0,filled:0,missing:0,details:[]};
  const ck=_cacheKey();
  if(_qualCache&&_qualCacheKey===ck)return _qualCache;
  _qualCacheKey=ck;
  const total=S.xD.length*S.xH.length;
  let missing=0;const colMissing=S.xH.map(()=>0);
  S.xD.forEach(r=>{r.forEach((c,ci)=>{
    if(c===''||c===null||c===undefined||String(c).trim()===''){missing++;colMissing[ci]++}
  })});
  const filled=total-missing;
  const score=Math.round((filled/total)*100);
  const details=S.xH.map((h,i)=>({col:h,missing:colMissing[i],pct:Math.round(((S.xD.length-colMissing[i])/S.xD.length)*100)}));
  _qualCache={score,total,filled,missing,details};
  return _qualCache;
}

// Auto-generate insights
export function generateInsights(){
  if(!S.xD.length||!S.xH.length)return[];
  const insights=[];
  const types=detectColTypes();
  const quality=calcDataQuality();

  // Data quality insight
  if(quality.missing>0){
    const worstCols=quality.details.filter(d=>d.missing>0).sort((a,b)=>b.missing-a.missing);
    insights.push({ico:'⚠',text:`<span class="i-warn">${quality.missing}</span> leere Zellen gefunden`+(worstCols.length?` — am meisten in <span class="i-val">${worstCols[0].col}</span> (${worstCols[0].missing}×)`:''),type:'warn'});
  }else{
    insights.push({ico:'✅',text:'<span class="i-good">100% Datenqualität</span> — keine leeren Zellen',type:'good'});
  }

  // Numeric column insights
  types.forEach((t,ci)=>{
    if(t.type!=='number')return;
    const nums=S.xD.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v));
    if(!nums.length)return;
    const sum=nums.reduce((a,b)=>a+b,0);
    const avg=sum/nums.length;
    const max=Math.max(...nums);const min=Math.min(...nums);
    const outlierThresh=avg+(max-min)*0.8;
    const outliers=nums.filter(v=>v>outlierThresh).length;
    if(outliers>0&&outliers<nums.length*.2){
      insights.push({ico:'📊',text:`<span class="i-val">${S.xH[ci]}</span>: Ø <span class="i-val">${avg.toLocaleString('de-DE',{maximumFractionDigits:0})}</span>, Spanne ${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')}`,type:'info'});
    }
  });

  // Duplicate check
  const rowKeys=S.xD.map(r=>r.join('|'));
  const dupes=rowKeys.length-new Set(rowKeys).size;
  if(dupes>0)insights.push({ico:'🔁',text:`<span class="i-warn">${dupes} Duplikat${dupes>1?'e':''}</span> gefunden — Tab "Dedup" zum Bereinigen`,type:'warn'});

  // Category distribution
  types.forEach((t,ci)=>{
    if(t.type!=='category')return;
    const freq={};S.xD.forEach(r=>{const v=String(r[ci]||'');freq[v]=(freq[v]||0)+1});
    const entries=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    if(entries.length>=2&&entries.length<=8){
      const top=entries.slice(0,3).map(([v,c])=>`${v} (${c})`).join(', ');
      insights.push({ico:'◉',text:`<span class="i-val">${S.xH[ci]}</span>: ${entries.length} Kategorien — ${top}`,type:'info'});
    }
  });

  return insights.slice(0,6);
}

// Render data profiling bar
export function renderDataProfile(){
  const dp=$('data-profile');if(!dp||!S.xH.length||!S.xD.length){if(dp)dp.classList.remove('show');return}
  const quality=calcDataQuality();
  const types=detectColTypes();
  const numCols=types.filter(t=>t.type==='number');
  const scoreCls=quality.score>=95?'good':quality.score>=80?'ok':'bad';
  const barColor=quality.score>=95?'var(--grn)':quality.score>=80?'var(--acc)':'var(--red)';

  // Calculate key KPIs from numeric columns
  let kpis='';
  types.forEach((t,ci)=>{
    if(t.type!=='number')return;
    const nums=S.xD.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v));
    if(!nums.length)return;
    const sum=nums.reduce((a,b)=>a+b,0);
    kpis+=`<div class="dp-kpi"><span class="dp-k-val">${sum>=1e6?(sum/1e6).toFixed(1)+'M':sum>=1e3?(sum/1e3).toFixed(1)+'K':sum.toLocaleString('de-DE',{maximumFractionDigits:0})}</span><span class="dp-k-lbl">Σ ${S.xH[ci].length>10?S.xH[ci].slice(0,9)+'…':S.xH[ci]}</span></div>`;
  });

  dp.innerHTML=`<div class="dp-header">
    <div class="dp-quality"><span class="dp-score ${scoreCls}">${quality.score}%</span><div><div style="font:600 9px var(--mono);color:var(--tx2);margin-bottom:2px">DATENQUALITÄT</div><div class="dp-bar-bg"><div class="dp-bar-fill" style="width:${quality.score}%;background:${barColor}"></div></div></div></div>
    <div style="font:11px var(--mono);color:var(--tx2)">${S.xD.length} Zeilen · ${S.xH.length} Spalten · ${numCols.length}× numerisch</div>
    <div class="dp-kpis">${kpis}</div>
  </div>`;
  dp.classList.add('show');
}

// Render insights panel
export function renderInsights(){
  const panel=$('insights-panel');if(!panel||!S.xH.length){if(panel)panel.classList.remove('show');return}
  const insights=generateInsights();
  if(!insights.length){panel.classList.remove('show');return}
  panel.innerHTML=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font:600 10px var(--mono);color:var(--blu)">💡 QUICK INSIGHTS</span><span style="font:9px var(--mono);color:var(--tx3)">${insights.length} Beobachtungen</span></div>`+
    insights.map(i=>`<div class="insight-row"><span class="i-ico">${i.ico}</span><span class="i-txt">${i.text}</span></div>`).join('');
  panel.classList.add('show');
}

// Enhanced XR — add data bars, column types, missing value indicators, number formatting
export function initAnalystXROverride() {
  const _origXR_analyst=XR;
  XR=function(){
    _origXR_analyst();
    if(!S.xH.length||!S.xD.length)return;
    try{
      const types=detectColTypes();
      // Add column type icons to headers
      document.querySelectorAll('#x-tw thead th').forEach((th,i)=>{
        const hi=i-2; // account for # and checkbox columns
        if(hi<0||hi>=types.length||!types[hi])return;
        const span=th.querySelector('span:first-child');
        if(span&&!span.querySelector('.col-type')){
          span.innerHTML=`<span class="col-type ${types[hi].cls}">${types[hi].icon}</span>${span.innerHTML}`;
        }
      });
      // Add data bars + missing via rAF to avoid layout thrashing
      requestAnimationFrame(()=>{
        const tbody=$('x-tw')?.querySelector('tbody');if(!tbody)return;
        // Precompute numeric column max values
        const numMaxes=new Map();
        types.forEach((t,ci)=>{
          if(S.hiddenCols?.has(ci)||t.type!=='number')return;
          let max=0;for(let ri=0;ri<S.xD.length;ri++){const v=Math.abs(parseFloat(S.xD[ri][ci]));if(!isNaN(v)&&v>max)max=v}
          if(max>0)numMaxes.set(ci,max);
        });
        const trs=tbody.children;
        for(let t=0;t<trs.length;t++){
          const tr=trs[t];if(!tr.dataset.ri)continue;
          const ri=+tr.dataset.ri,row=S.xD[ri];if(!row)continue;
          const tds=tr.children;
          for(let j=2;j<tds.length-1;j++){
            const ci=j-2,td=tds[j];
            if(S.hiddenCols?.has(ci))continue;
            const typ=types[ci];if(!typ)continue;
            if(typ.type==='number'){
              const v=parseFloat(row[ci]);
              if(isNaN(v)){if(String(row[ci]||'').trim()==='')td.classList.add('missing');continue}
              td.classList.add('num-cell','data-bar-cell');
              const max=numMaxes.get(ci);
              if(max){const bar=document.createElement('div');bar.className='data-bar';bar.style.width=(Math.abs(v)/max*100)+'%';td.appendChild(bar)}
            }else{
              if(String(row[ci]||'').trim()===''){td.classList.add('missing');td.textContent='—'}
            }
          }
        }
      });
      renderDataProfile();
      renderInsights();
    }catch(e){_appLog('XR-Analyst: '+e.message)}
  };
}
