import { S, _appLog } from '../store.js';
import { $ } from '../utils.js';
import { toast, H, A, L, N } from '../nav.js';
import { IDB } from '../idb.js';

// TODO: cross-module dependency — showX, XR are defined in excel/render.js
// TODO: cross-module dependency — timeAgo is defined in hybrid/index.js

// ══════ DATENBANK-MANAGER ══════
let _dbEntries=[];
let _dbCategories=['Kundendaten','Sendungen','Rechnungen','Stammdaten','Berichte','Sonstige'];
let _dbSelected=new Set();

export async function _hydrateDatabase(){
  try{
    _dbEntries=await IDB.get('database','entries')||[];
    const cats=await IDB.get('database','categories');
    if(cats)_dbCategories=cats;
  }catch(e){_appLog('hydrateDB: '+e.message)}
}
function _saveDbEntries(){IDB.put('database','entries',_dbEntries).catch(e=>_appLog('saveDB: '+e.message))}
function _saveDbCats(){IDB.put('database','categories',_dbCategories).catch(e=>_appLog('saveDBCats: '+e.message))}

export function dbSaveCurrent(){
  if(!S.xH.length){toast('Keine Daten zum Speichern');return}
  const name=prompt('Datensatz-Name:',S.xFn||'Datensatz '+(Date.now()%10000));
  if(!name)return;
  const existing=_dbEntries.findIndex(e=>e.name===name);
  const entry={
    id:existing>=0?_dbEntries[existing].id:Date.now()+'_'+Math.random().toString(36).slice(2,6),
    name,category:'Sonstige',
    headers:[...S.xH],
    data:S.xD.map(r=>[...r]),
    meta:{rows:S.xD.length,cols:S.xH.length,filename:S.xFn},
    created:existing>=0?_dbEntries[existing].created:Date.now(),
    updated:Date.now()
  };
  if(existing>=0)_dbEntries[existing]=entry;else _dbEntries.push(entry);
  _saveDbEntries();dbRender();
  toast('💾 "'+name+'" gespeichert');L('DB Speichern',name)
}

export function dbImportFile(inp){
  const files=inp.files;if(!files.length)return;
  [...files].forEach(f=>{
    const ext=f.name.split('.').pop().toLowerCase();
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        let headers,data;
        if(ext==='json'){
          const json=JSON.parse(e.target.result);
          if(Array.isArray(json)&&json.length){
            headers=Object.keys(json[0]);
            data=json.map(r=>headers.map(h=>r[h]??''));
          }else throw new Error('Ungültiges JSON');
        }else{
          const wb=XLSX.read(ext==='csv'||ext==='tsv'?e.target.result:e.target.result,{type:ext==='csv'||ext==='tsv'?'string':'array',raw:false});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const raw=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
          headers=raw[0]?.map(h=>String(h).trim())||[];
          data=raw.slice(1);
        }
        const entry={
          id:Date.now()+'_'+Math.random().toString(36).slice(2,6),
          name:f.name.replace(/\.[^.]+$/,''),
          category:'Sonstige',
          headers,data,
          meta:{rows:data.length,cols:headers.length,filename:f.name},
          created:Date.now(),updated:Date.now()
        };
        _dbEntries.push(entry);
        _saveDbEntries();dbRender();
        toast('📂 "'+entry.name+'" importiert');L('DB Import',entry.name)
      }catch(err){toast('Fehler: '+err.message);_appLog('dbImport: '+err.message)}
    };
    if(ext==='csv'||ext==='tsv'||ext==='txt')reader.readAsText(f,'UTF-8');
    else if(ext==='json')reader.readAsText(f,'UTF-8');
    else reader.readAsArrayBuffer(f);
  });
  inp.value='';
}

export function dbLoadEntry(id){
  const entry=_dbEntries.find(e=>e.id===id);if(!entry)return;
  S.xH=[...entry.headers];
  S.xD=entry.data.map(r=>[...r]);
  S.xFn=entry.name;
  S.selectedRows=new Set();S.hiddenCols=new Set();S.undoStack=[];S.redoStack=[];
  N('excel');showX();XR();
  toast('📂 "'+entry.name+'" geladen');L('DB Laden',entry.name)
}

export function dbDeleteEntry(id){
  const entry=_dbEntries.find(e=>e.id===id);
  if(!entry||!confirm('"'+entry.name+'" unwiderruflich löschen?'))return;
  _dbEntries=_dbEntries.filter(e=>e.id!==id);
  _dbSelected.delete(id);
  _saveDbEntries();dbRender();
  toast('🗑 "'+entry.name+'" gelöscht');L('DB Löschen',entry.name)
}

export function dbRenameEntry(id){
  const entry=_dbEntries.find(e=>e.id===id);if(!entry)return;
  const nn=prompt('Umbenennen:',entry.name);
  if(!nn||nn===entry.name)return;
  entry.name=nn;entry.updated=Date.now();
  _saveDbEntries();dbRender();toast('✏ Umbenannt')
}

export function dbSetCategory(id,cat){
  const entry=_dbEntries.find(e=>e.id===id);if(!entry)return;
  entry.category=cat;entry.updated=Date.now();
  _saveDbEntries();dbRender()
}

export function dbDuplicateEntry(id){
  const entry=_dbEntries.find(e=>e.id===id);if(!entry)return;
  const copy={
    ...entry,
    id:Date.now()+'_'+Math.random().toString(36).slice(2,6),
    name:entry.name+' (Kopie)',
    headers:[...entry.headers],
    data:entry.data.map(r=>[...r]),
    created:Date.now(),updated:Date.now()
  };
  _dbEntries.push(copy);_saveDbEntries();dbRender();
  toast('📋 Kopie erstellt')
}

export function dbExportEntry(id){
  const entry=_dbEntries.find(e=>e.id===id);if(!entry)return;
  const ws=XLSX.utils.aoa_to_sheet([entry.headers,...entry.data]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Daten');
  XLSX.writeFile(wb,entry.name+'.xlsx');
  toast('⬇ '+entry.name+'.xlsx');L('DB Export',entry.name)
}

export function dbExportAll(){
  if(!_dbEntries.length){toast('Keine Datensätze');return}
  _dbEntries.forEach(e=>dbExportEntry(e.id));
  toast('⬇ '+_dbEntries.length+' Dateien exportiert')
}

export function dbMergeSelected(){
  const ids=[..._dbSelected];
  if(ids.length<2){toast('Mindestens 2 Datensätze auswählen');return}
  const entries=ids.map(id=>_dbEntries.find(e=>e.id===id)).filter(Boolean);
  // Check compatible headers
  const baseH=entries[0].headers;
  const compatible=entries.every(e=>e.headers.length===baseH.length&&e.headers.every((h,i)=>h===baseH[i]));
  if(!compatible){
    if(!confirm('Spalten stimmen nicht überein. Trotzdem zusammenführen?\n(Fehlende Spalten werden leer gelassen)'))return;
    // Union of all headers
    const allH=new Set();entries.forEach(e=>e.headers.forEach(h=>allH.add(h)));
    const mergedH=[...allH];
    const mergedD=[];
    entries.forEach(e=>{
      e.data.forEach(r=>{
        const nr=mergedH.map(h=>{const i=e.headers.indexOf(h);return i>=0?(r[i]??''):''});
        mergedD.push(nr);
      });
    });
    const name='Zusammengeführt_'+Date.now()%10000;
    _dbEntries.push({id:Date.now()+'_m',name,category:'Sonstige',headers:mergedH,data:mergedD,meta:{rows:mergedD.length,cols:mergedH.length},created:Date.now(),updated:Date.now()});
  }else{
    const mergedD=[];entries.forEach(e=>mergedD.push(...e.data));
    const name='Zusammengeführt_'+Date.now()%10000;
    _dbEntries.push({id:Date.now()+'_m',name,category:'Sonstige',headers:[...baseH],data:mergedD,meta:{rows:mergedD.length,cols:baseH.length},created:Date.now(),updated:Date.now()});
  }
  _dbSelected.clear();_saveDbEntries();dbRender();
  toast('🔗 Datensätze zusammengeführt');L('DB Merge',ids.length+' Datensätze')
}

export function dbToggleEntry(id){
  if(_dbSelected.has(id))_dbSelected.delete(id);else _dbSelected.add(id);
  dbRender()
}
export function dbToggleAll(checked){
  if(checked)_dbEntries.forEach(e=>_dbSelected.add(e.id));else _dbSelected.clear();
  dbRender()
}

export function dbAddCategory(){
  const inp=$('db-new-cat');const name=inp.value.trim();
  if(!name||_dbCategories.includes(name))return;
  _dbCategories.push(name);_saveDbCats();inp.value='';dbRender();toast('🏷 "'+name+'" hinzugefügt')
}
export function dbRemoveCategory(cat){
  _dbCategories=_dbCategories.filter(c=>c!==cat);
  _dbEntries.forEach(e=>{if(e.category===cat)e.category='Sonstige'});
  _saveDbCats();_saveDbEntries();dbRender()
}

export function dbRender(){
  const filter=$('db-cat-filter')?.value||'';
  const search=($('db-search')?.value||'').toLowerCase();
  let entries=_dbEntries;
  if(filter)entries=entries.filter(e=>e.category===filter);
  if(search)entries=entries.filter(e=>e.name.toLowerCase().includes(search)||e.headers.some(h=>h.toLowerCase().includes(search)));

  // Stats
  if($('db-count'))$('db-count').textContent=_dbEntries.length;
  if($('db-rows'))$('db-rows').textContent=_dbEntries.reduce((s,e)=>s+(e.meta?.rows||e.data.length),0).toLocaleString('de-DE');
  if($('db-cats'))$('db-cats').textContent=_dbCategories.length;
  IDB.usage().then(u=>{if($('db-size'))$('db-size').textContent=u.used>1048576?(u.used/1048576).toFixed(1)+' MB':(u.used/1024).toFixed(0)+' KB'}).catch(()=>{});

  // Categories
  const catFilter=$('db-cat-filter');
  if(catFilter){
    const cur=catFilter.value;
    catFilter.innerHTML='<option value="">Alle Kategorien</option>'+_dbCategories.map(c=>`<option value="${c}">${c}</option>`).join('');
    catFilter.value=cur;
  }
  const catTags=$('db-cat-tags');
  if(catTags){
    const catColors=['var(--grn)','var(--blu)','var(--pur)','var(--ora)','var(--cyn)','var(--pk)','var(--red)','var(--acc)'];
    catTags.innerHTML=_dbCategories.map((c,i)=>{
      const color=catColors[i%catColors.length];
      const count=_dbEntries.filter(e=>e.category===c).length;
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font:500 10px var(--mono);background:${color}20;color:${color}">${c} (${count})<span onclick="dbRemoveCategory('${c.replace(/'/g,"\\'")}')" style="cursor:pointer;opacity:.5;margin-left:2px" title="Kategorie entfernen">×</span></span>`;
    }).join('');
  }

  // Table
  const tbody=$('db-tbody');
  const empty=$('db-empty');
  const wrap=$('db-table-wrap');
  if(!entries.length&&!_dbEntries.length){
    if(empty)empty.style.display='';
    if(wrap)wrap.style.display='none';
  }else{
    if(empty)empty.style.display='none';
    if(wrap)wrap.style.display='';
    const catColors=['var(--grn)','var(--blu)','var(--pur)','var(--ora)','var(--cyn)','var(--pk)','var(--red)','var(--acc)'];
    if(tbody)tbody.innerHTML=entries.map(e=>{
      const ci=_dbCategories.indexOf(e.category);
      const color=ci>=0?catColors[ci%catColors.length]:'var(--tx3)';
      const colPreview=e.headers.slice(0,4).join(', ')+(e.headers.length>4?' +'+( e.headers.length-4):'');
      const ago=timeAgo(e.updated||e.created);
      return `<tr style="${_dbSelected.has(e.id)?'background:rgba(10,132,255,.08)':''}">
        <td class="cb-cell"><input type="checkbox" ${_dbSelected.has(e.id)?'checked':''} onchange="dbToggleEntry('${e.id}')" style="accent-color:var(--acc)"></td>
        <td><strong style="color:var(--acc);cursor:pointer" onclick="dbLoadEntry('${e.id}')" title="Klicken zum Laden">${H(e.name)}</strong></td>
        <td><select onchange="dbSetCategory('${e.id}',this.value)" style="font-size:10px;padding:2px 6px;background:${color}15;border-color:${color}40;color:${color}">${_dbCategories.map(c=>`<option${c===e.category?' selected':''}>${c}</option>`).join('')}</select></td>
        <td style="text-align:right;font:600 11px var(--mono);color:var(--tx)">${(e.meta?.rows||e.data.length).toLocaleString('de-DE')}</td>
        <td style="text-align:right;color:var(--tx2)">${e.meta?.cols||e.headers.length}</td>
        <td style="font:10px var(--mono);color:var(--tx3);max-width:200px;overflow:hidden;text-overflow:ellipsis">${H(colPreview)}</td>
        <td style="font:10px var(--mono);color:var(--tx3)">${ago}</td>
        <td><div style="display:flex;gap:3px;flex-wrap:wrap">
          <button class="b bg bs" onclick="dbLoadEntry('${e.id}')" title="In Excel laden" style="padding:3px 8px;font-size:10px">📂 Laden</button>
          <button class="b bo bs" onclick="dbExportEntry('${e.id}')" title="Als XLSX exportieren" style="padding:3px 8px;font-size:10px">⬇</button>
          <button class="b bo bs" onclick="dbDuplicateEntry('${e.id}')" title="Kopie erstellen" style="padding:3px 8px;font-size:10px">📋</button>
          <button class="b bo bs" onclick="dbRenameEntry('${e.id}')" title="Umbenennen" style="padding:3px 8px;font-size:10px">✏</button>
          <button class="b bd bs" onclick="dbDeleteEntry('${e.id}')" title="Löschen" style="padding:3px 8px;font-size:10px">✕</button>
        </div></td>
      </tr>`;
    }).join('');
  }
  // Update select-all
  const selAll=$('db-sel-all');
  if(selAll)selAll.checked=_dbEntries.length>0&&_dbSelected.size===_dbEntries.length;
}
