import { $ } from '../utils.js';
import { S } from '../store.js';
import { toast, L, H, A, colOpts, macLog } from '../nav.js';

// ══════════════════════════════════════════════════════════════
//  UNIFIED RULE ENGINE — Regeln (IF/ELSE + SELECT CASE + SWITCH merged)
//  Phase 1: Unified builder
//  Phase 2: Live Preview
//  Phase 3: Smart Autocomplete + Drag Reorder
//  Phase 4: Templates + Conflict Detection
// ══════════════════════════════════════════════════════════════

// ── Shared Operator Options ──
function _opOpts(){
  return ['=','!=','>','<','>=','<=','enthält','beginnt','endet','leer','nicht leer','zwischen'].map(o=>`<option value="${o}">${o}</option>`).join('');
}

// ── Evaluate a single condition against a data row ──
export function evalCond(row, col, op, val, val2){
  const ci = S.xH.indexOf(col);
  if(ci === -1) return false;
  const c = String(row[ci] ?? ''), n = parseFloat(c), nv = parseFloat(val);
  switch(op){
    case '=': return c === val;
    case '!=': return c !== val;
    case '>': return !isNaN(n) && n > nv;
    case '<': return !isNaN(n) && n < nv;
    case '>=': return !isNaN(n) && n >= nv;
    case '<=': return !isNaN(n) && n <= nv;
    case 'enthält': return c.toLowerCase().includes(val.toLowerCase());
    case 'beginnt': return c.toLowerCase().startsWith(val.toLowerCase());
    case 'endet': return c.toLowerCase().endsWith(val.toLowerCase());
    case 'leer': return !c.trim();
    case 'nicht leer': return !!c.trim();
    case 'zwischen': { const nv2 = parseFloat(val2); return !isNaN(n) && n >= nv && n <= nv2; }
  }
  return false;
}

// ── Resolve {Spaltenname} references in result string ──
function _resolveRef(row, str){
  return str.replace(/\{([^}]+)\}/g, (_, name) => {
    const ci = S.xH.indexOf(name);
    return ci !== -1 ? String(row[ci] ?? '') : `{${name}}`;
  });
}

// ── Phase 3: Get unique values from a column for autocomplete ──
function _getColValues(colName){
  const ci = S.xH.indexOf(colName);
  if(ci === -1) return [];
  const vals = new Set();
  const limit = Math.min(S.xD.length, 500);
  for(let i = 0; i < limit; i++){
    const v = String(S.xD[i][ci] ?? '').trim();
    if(v) vals.add(v);
  }
  return [...vals].sort().slice(0, 50);
}

// ── Build datalist for autocomplete ──
function _buildDatalist(id, values){
  let dl = document.getElementById(id);
  if(!dl){ dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
  dl.innerHTML = values.map(v => `<option value="${H(v)}">`).join('');
  return id;
}

// ── Build a single condition HTML snippet ──
function _condHTML(isFirst){
  const listId = 'rl-autocomplete-' + Date.now();
  return `<div class="rl-cond" style="display:inline-flex;align-items:center;gap:4px;margin:2px 0;flex-wrap:wrap">${
    isFirst
      ? '<span style="width:42px;font:600 10px var(--mono);color:var(--pk)">WENN</span>'
      : '<select class="rl-logic" style="width:55px;font-size:10px"><option>UND</option><option>ODER</option></select>'
  }<select class="rl-col" style="width:100px" onchange="window._rlColChanged&&window._rlColChanged(this)">${colOpts()}</select><select class="rl-op" style="width:70px">${_opOpts()}</select><input type="text" class="rl-val" placeholder="Wert" style="width:90px" list="${listId}"><input type="text" class="rl-val2" placeholder="bis" style="width:55px;display:none"><button class="b bo bs" style="font-size:9px;padding:2px 5px" onclick="this.closest('.rl-cond').remove();window._rlPreview&&window._rlPreview()">x</button></div>`;
}

// ── Bind operator change (show/hide "bis" for "zwischen") ──
function _bindOpChange(container){
  container.querySelectorAll('.rl-op').forEach(s => {
    s.addEventListener('change', function(){
      const v2 = this.closest('.rl-cond').querySelector('.rl-val2');
      if(v2) v2.style.display = this.value === 'zwischen' ? '' : 'none';
      _schedulePreview();
    });
  });
  // Bind value inputs for live preview
  container.querySelectorAll('.rl-val, .rl-val2').forEach(inp => {
    inp.addEventListener('input', () => _schedulePreview());
  });
  container.querySelectorAll('.rl-col, .rl-logic').forEach(sel => {
    sel.addEventListener('change', () => _schedulePreview());
  });
}

// ── Phase 3: Column change → update autocomplete ──
// ── Phase UX: Target changed → show/hide "eigenes Ziel" badge ──
window._rlTgtChanged = function(sel){
  const ruleDiv = sel.closest('.rl-rule');
  if(!ruleDiv) return;
  const badge = ruleDiv.querySelector('.rl-tgt-badge');
  const globalTgt = $('rl-tgt')?.value || '';
  if(badge){
    badge.style.display = (sel.value !== globalTgt) ? 'inline' : 'none';
  }
};

window._rlColChanged = function(sel){
  const colName = sel.value;
  const valInput = sel.closest('.rl-cond').querySelector('.rl-val');
  if(valInput && colName){
    const values = _getColValues(colName);
    if(values.length){
      const dlId = _buildDatalist('rl-dl-' + colName, values);
      valInput.setAttribute('list', dlId);
    }
  }
  _schedulePreview();
};

// ══════ RULE BUILDER UI ══════

export function rlAddRule(){
  const d = $('rl-rows');
  const div = document.createElement('div');
  div.className = 'rl-rule';
  div.draggable = true;
  div.style.cssText = 'padding:8px;margin:4px 0;background:rgba(236,72,153,.04);border:1px solid rgba(236,72,153,.15);border-radius:6px;cursor:grab;transition:transform 0.15s,box-shadow 0.15s';
  div.innerHTML = `<div class="rl-drag-handle" style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><span style="cursor:grab;color:var(--tx3);font-size:12px" title="Ziehen zum Umsortieren">&#8661;</span><span style="font:600 10px var(--mono);color:var(--pk)">REGEL</span><span class="rl-rule-num" style="font:600 9px var(--mono);color:var(--tx3)"></span><button class="b bo bs" style="font-size:9px;margin-left:auto" onclick="this.closest('.rl-rule').remove();_rlRenum();window._rlPreview&&window._rlPreview()" title="Regel entfernen">x</button></div><div class="rl-conds">${_condHTML(true)}</div><div style="display:flex;align-items:center;gap:4px;margin-top:2px"><button class="b bo bs" style="font-size:9px" onclick="window.rlAddCond(this.closest('.rl-rule'))">+ Bedingung</button></div><div class="rl-target-row" style="display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;background:rgba(236,72,153,.06);border:1px dashed rgba(236,72,153,.25);border-radius:5px;flex-wrap:wrap"><span style="font:600 10px var(--mono);color:var(--pk)">&#8594; ZIEL:</span><select class="rl-rule-tgt" style="width:120px;border:1px solid rgba(236,72,153,.3)" onchange="this._userChanged=true;window._rlTgtChanged&&window._rlTgtChanged(this);window._rlPreview&&window._rlPreview()">${colOpts()}</select><span style="font:600 10px var(--mono);color:var(--tx3)">&#8592;</span><input type="text" class="rl-res" placeholder="Wert oder {Spalte}" style="width:150px;border:1px solid rgba(236,72,153,.3)" title="Fester Wert oder {Spaltenname} zum Kopieren" oninput="window._rlPreview&&window._rlPreview()"><span class="rl-tgt-badge" style="font-size:8px;color:var(--tx3);display:none" title="Eigenes Ziel (weicht vom Standard ab)">&#9733; eigenes Ziel</span></div>`;
  d.appendChild(div);
  _bindOpChange(div);
  _initDragForRule(div);
  // Sync default target
  const globalTgt = $('rl-tgt');
  if(globalTgt && globalTgt.value) div.querySelector('.rl-rule-tgt').value = globalTgt.value;
  _rlRenum();
  _schedulePreview();
}

export function rlAddCond(ruleDiv){
  const c = ruleDiv.querySelector('.rl-conds');
  const tmp = document.createElement('div');
  tmp.innerHTML = _condHTML(false);
  const cond = tmp.firstElementChild;
  c.appendChild(cond);
  _bindOpChange(cond);
  _schedulePreview();
}

export function rlSyncTargets(){
  const v = $('rl-tgt').value;
  document.querySelectorAll('#rl-rows .rl-rule-tgt').forEach(sel => {
    if(!sel._userChanged) sel.value = v;
    // Update badge visibility
    const badge = sel.closest('.rl-rule')?.querySelector('.rl-tgt-badge');
    if(badge) badge.style.display = (sel.value !== v) ? 'inline' : 'none';
  });
  _schedulePreview();
}

export function rlAddNewCol(){
  const n = prompt('Neue Spalte:');
  if(!n) return;
  if(S.xH.includes(n)){ toast('Spalte "' + n + '" existiert bereits'); $('rl-tgt').value = n; return; }
  S.xH.push(n);
  S.xD.forEach(r => r.push(''));
  window.showX();
  window.XR();
  $('rl-tgt').value = n;
}

// ── Renumber rules ──
function _rlRenum(){
  document.querySelectorAll('#rl-rows .rl-rule-num').forEach((el, i) => {
    el.textContent = '#' + (i + 1);
  });
}

// ══════ PARSE & EVALUATE ══════

function _parseRules(){
  return [...document.querySelectorAll('#rl-rows .rl-rule')].map(ruleDiv => {
    const conds = [...ruleDiv.querySelectorAll('.rl-cond')].map((c, i) => ({
      logic: i === 0 ? 'UND' : (c.querySelector('.rl-logic')?.value || 'UND'),
      col: c.querySelector('.rl-col').value,
      op: c.querySelector('.rl-op').value,
      val: c.querySelector('.rl-val').value,
      val2: c.querySelector('.rl-val2')?.value || ''
    }));
    return {
      conds,
      tgt: ruleDiv.querySelector('.rl-rule-tgt')?.value || '',
      res: ruleDiv.querySelector('.rl-res').value
    };
  });
}

export function evalRule(row, rule){
  const conds = rule.conds;
  if(!conds || !conds.length) return false;
  let result = evalCond(row, conds[0].col, conds[0].op, conds[0].val, conds[0].val2);
  for(let i = 1; i < conds.length; i++){
    const c = conds[i];
    const r = evalCond(row, c.col, c.op, c.val, c.val2);
    const logic = (c.logic || 'UND').toUpperCase();
    result = (logic === 'UND' || logic === 'AND') ? result && r : result || r;
  }
  return result;
}

// ══════ EXECUTE ══════

export function RULES_RUN(){
  const globalTgt = $('rl-tgt').value;
  const elseVal = $('rl-else').value;
  const rules = _parseRules();
  if(!rules.length){ toast('Regeln hinzufugen'); return; }
  // Validate targets
  for(const r of rules){
    const tgt = r.tgt || globalTgt;
    if(!tgt){ toast('Zielspalte fehlt'); return; }
    if(S.xH.indexOf(tgt) === -1){ toast('Spalte "' + tgt + '" nicht gefunden'); return; }
  }
  window.pushUndo();
  let count = 0;
  S.xD.forEach(row => {
    let matched = false;
    for(const rule of rules){
      if(evalRule(row, rule)){
        const ti = S.xH.indexOf(rule.tgt || globalTgt);
        if(ti !== -1){ row[ti] = _resolveRef(row, rule.res); matched = true; count++; }
        break; // first match wins
      }
    }
    if(!matched && elseVal){
      const ti = S.xH.indexOf(globalTgt);
      if(ti !== -1){ row[ti] = _resolveRef(row, elseVal); count++; }
    }
  });
  window.XR();
  $('rl-result').innerHTML = `<span class="tg tg-g">${count} Zeilen</span>`;
  L('REGELN', `${rules.length} Regeln (${count}x)`);
  toast(count + ' Zeilen aktualisiert');
  macLog('rules', { rules, elseVal, globalTgt });
}

// ══════ SAVE / LOAD ══════

export function RULES_SAVE(){
  const globalTgt = $('rl-tgt').value;
  const elseVal = $('rl-else').value;
  const rules = _parseRules();
  if(!rules.length) return;
  const nameInput = $('rl-name');
  const autoName = rules.length === 1 && rules[0].conds.length === 1
    ? `${rules[0].conds[0].col} ${rules[0].conds[0].op} ${rules[0].conds[0].val} -> ${rules[0].tgt || globalTgt}`
    : `${rules.length} Regeln -> ${globalTgt}`;
  const name = (nameInput && nameInput.value.trim()) || autoName;
  S.savedRules.push({ rules, globalTgt, elseVal, name, created: new Date().toISOString() });
  renderSavedRules();
  toast('Regel gespeichert');
  if(nameInput) nameInput.value = '';
}

export function renderSavedRules(){
  const container = $('rl-saved');
  if(!container) return;
  // Also render legacy saved rules from old format
  _migrateLegacyRules();

  if(!S.savedRules.length){ container.innerHTML = '<span style="font-size:10px;color:var(--tx3)">Keine gespeicherten Regeln</span>'; return; }
  container.innerHTML = S.savedRules.map((r, i) => {
    const ruleCount = r.rules?.length || r.blocks?.length || 0;
    const tgt = r.globalTgt || r.tgt || '';
    const condSummary = r.rules
      ? r.rules.map(rl => rl.conds.map(c => `${c.col}${c.op}${c.val}`).join(' & ')).join(' | ')
      : '';
    const originBadge = r._origin === 'case' ? '<span class="tg" style="background:var(--pk);color:#fff;font-size:8px">CASE</span>'
      : r._origin === 'ifelse' ? '<span class="tg" style="background:var(--ora);color:#fff;font-size:8px">IF</span>'
      : r._origin === 'switch' ? '<span class="tg" style="background:var(--cyn);color:#fff;font-size:8px">SW</span>'
      : '';
    return `<div class="rule-card" style="display:flex;align-items:center;gap:6px;padding:6px 8px;margin:3px 0;background:var(--bg2);border-radius:6px;border:1px solid var(--brd)">
      ${originBadge}<span class="tg tg-pk">REGEL</span>
      <span class="rt" style="flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${H(condSummary)}">${H(r.name || condSummary)}</span>
      <span style="font-size:9px;color:var(--tx3)">${ruleCount} Reg.</span>
      <button class="b bpk bs" onclick="window.runSavedRule(${i})" title="Ausfuhren">&#9654;</button>
      <button class="b bo bs" onclick="window.editSavedRule(${i})" title="Bearbeiten">&#9998;</button>
      <button class="b bo bs" onclick="S.savedRules.splice(${i},1);renderSavedRules()" title="Loschen">x</button>
    </div>`;
  }).join('');
}

export function runSavedRule(idx){
  const saved = S.savedRules[idx];
  if(!saved) return;
  const globalTgt = saved.globalTgt || saved.tgt;
  window.pushUndo();
  let n = 0;

  // Handle legacy IF/ELSE format (blocks instead of rules)
  const rules = saved.rules || saved.blocks;
  if(!rules){ toast('Ungultiges Regelformat'); return; }

  S.xD.forEach(row => {
    let matched = false;
    for(const rule of rules){
      // Support both legacy formats
      if(rule.conds){
        if(evalRule(row, rule)){
          const ti = S.xH.indexOf(rule.tgt || globalTgt);
          if(ti !== -1){ row[ti] = _resolveRef(row, rule.res); matched = true; n++; }
          break;
        }
      } else if(rule.col1){
        // Legacy switch format (col1/op1/val1)
        const c1 = evalCond(row, rule.col1, rule.op1, rule.val1, '');
        const c2 = rule.col2 ? evalCond(row, rule.col2, rule.op2, rule.val2, '') : true;
        const pass = rule.logic === 'AND' || rule.logic === 'UND' ? c1 && c2 : c1 || c2;
        if(pass){
          const ti = S.xH.indexOf(globalTgt);
          if(ti !== -1){ row[ti] = _resolveRef(row, rule.res); matched = true; n++; }
          break;
        }
      }
    }
    // Handle legacy case format (src/cases)
    if(!matched && saved.src && saved.cases){
      const si = S.xH.indexOf(saved.src), ti = S.xH.indexOf(saved.tgt);
      if(si !== -1 && ti !== -1){
        const val = String(row[si] ?? '');
        for(const cs of saved.cases){
          if(cs.v.startsWith('>=')){if(parseFloat(val)>=parseFloat(cs.v.slice(2))){row[ti]=cs.r;matched=true;n++;break}}
          else if(cs.v.startsWith('>')){if(parseFloat(val)>parseFloat(cs.v.slice(1))){row[ti]=cs.r;matched=true;n++;break}}
          else if(cs.v.startsWith('<=')){if(parseFloat(val)<=parseFloat(cs.v.slice(2))){row[ti]=cs.r;matched=true;n++;break}}
          else if(cs.v.startsWith('<')){if(parseFloat(val)<parseFloat(cs.v.slice(1))){row[ti]=cs.r;matched=true;n++;break}}
          else if(val===cs.v){row[ti]=cs.r;matched=true;n++;break}
        }
      }
    }
    if(!matched && saved.elseVal){
      const ti = S.xH.indexOf(globalTgt);
      if(ti !== -1){ row[ti] = _resolveRef(row, saved.elseVal); n++; }
    }
  });
  window.XR();
  toast(n + ' Zeilen aktualisiert');
  macLog('rules', saved);
}

// ── Load saved rule back into editor ──
export function editSavedRule(idx){
  const saved = S.savedRules[idx];
  if(!saved) return;
  const rules = saved.rules || saved.blocks;
  if(!rules) return;
  // Clear current rules
  $('rl-rows').innerHTML = '';
  // Set global target + else
  if(saved.globalTgt) $('rl-tgt').value = saved.globalTgt;
  if(saved.elseVal) $('rl-else').value = saved.elseVal;
  if($('rl-name')) $('rl-name').value = saved.name || '';
  // Rebuild each rule
  for(const rule of rules){
    rlAddRule();
    const ruleDiv = $('rl-rows').lastElementChild;
    if(!ruleDiv) continue;
    // Set target + result
    if(rule.tgt) ruleDiv.querySelector('.rl-rule-tgt').value = rule.tgt;
    if(rule.res) ruleDiv.querySelector('.rl-res').value = rule.res;
    // Set conditions
    const conds = rule.conds || [];
    if(conds.length > 0){
      // First condition is already there
      const firstCond = ruleDiv.querySelector('.rl-cond');
      if(firstCond && conds[0]){
        firstCond.querySelector('.rl-col').value = conds[0].col;
        firstCond.querySelector('.rl-op').value = conds[0].op;
        firstCond.querySelector('.rl-val').value = conds[0].val;
        const v2 = firstCond.querySelector('.rl-val2');
        if(v2 && conds[0].val2){ v2.value = conds[0].val2; v2.style.display = conds[0].op === 'zwischen' ? '' : 'none'; }
      }
      // Additional conditions
      for(let j = 1; j < conds.length; j++){
        rlAddCond(ruleDiv);
        const allConds = ruleDiv.querySelectorAll('.rl-cond');
        const condEl = allConds[allConds.length - 1];
        if(condEl){
          const logicSel = condEl.querySelector('.rl-logic');
          if(logicSel) logicSel.value = (conds[j].logic === 'AND' || conds[j].logic === 'UND') ? 'UND' : 'ODER';
          condEl.querySelector('.rl-col').value = conds[j].col;
          condEl.querySelector('.rl-op').value = conds[j].op;
          condEl.querySelector('.rl-val').value = conds[j].val;
          const v2 = condEl.querySelector('.rl-val2');
          if(v2 && conds[j].val2){ v2.value = conds[j].val2; v2.style.display = conds[j].op === 'zwischen' ? '' : 'none'; }
        }
      }
    }
  }
  // Remove the saved rule (it's now in editor)
  S.savedRules.splice(idx, 1);
  renderSavedRules();
  _schedulePreview();
  toast('Regel in Editor geladen');
}

// ══════ MIGRATION: Legacy savedCases/savedIE/savedSW → savedRules ══════

let _migrated = false;
function _migrateLegacyRules(){
  if(_migrated) return;
  _migrated = true;

  // Migrate savedCases
  if(S.savedCases && S.savedCases.length){
    for(const c of S.savedCases){
      // Normalize logic keywords to German
      if(c.rules){
        for(const r of c.rules){
          if(r.conds){
            for(const cond of r.conds){
              if(cond.logic === 'AND') cond.logic = 'UND';
              if(cond.logic === 'OR') cond.logic = 'ODER';
            }
          }
        }
      }
      S.savedRules.push({ ...c, _origin: 'case' });
    }
    S.savedCases = [];
  }

  // Migrate savedIE
  if(S.savedIE && S.savedIE.length){
    for(const ie of S.savedIE){
      // Convert blocks to rules format
      const rules = (ie.blocks || []).map(b => ({
        conds: (b.conds || []).map(c => ({
          ...c,
          logic: c.logic === 'AND' ? 'UND' : c.logic === 'OR' ? 'ODER' : (c.logic || 'UND')
        })),
        tgt: b.tgt || ie.globalTgt,
        res: b.res
      }));
      S.savedRules.push({
        rules,
        globalTgt: ie.globalTgt,
        elseVal: ie.elseVal,
        name: ie.name || `IF -> ${ie.globalTgt}`,
        _origin: 'ifelse'
      });
    }
    S.savedIE = [];
  }

  // Migrate savedSW
  if(S.savedSW && S.savedSW.length){
    for(const sw of S.savedSW){
      if(sw.rules){
        for(const r of sw.rules){
          if(r.conds){
            for(const cond of r.conds){
              if(cond.logic === 'AND') cond.logic = 'UND';
              if(cond.logic === 'OR') cond.logic = 'ODER';
            }
          }
        }
      }
      S.savedRules.push({ ...sw, _origin: 'switch' });
    }
    S.savedSW = [];
  }
}

// ══════ PHASE 2: LIVE PREVIEW ══════

let _previewTimer = null;
function _schedulePreview(){
  if(_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = setTimeout(_updatePreview, 300);
}
window._rlPreview = _schedulePreview;

function _updatePreview(){
  const previewEl = $('rl-preview');
  if(!previewEl) return;
  if(!S.xD.length || !S.xH.length){
    previewEl.innerHTML = '<span style="color:var(--tx3);font-size:10px">Keine Daten geladen</span>';
    return;
  }

  const rules = _parseRules();
  const globalTgt = $('rl-tgt')?.value || '';
  const elseVal = $('rl-else')?.value || '';

  if(!rules.length){
    previewEl.innerHTML = '<span style="color:var(--tx3);font-size:10px">Regeln hinzufugen fur Vorschau</span>';
    return;
  }

  // Count matches + collect first 3 examples per rule
  let matchCount = 0, elseCount = 0;
  const examples = rules.map(() => []);
  const elseExamples = [];

  S.xD.forEach((row, ri) => {
    let matched = false;
    for(let i = 0; i < rules.length; i++){
      if(evalRule(row, rules[i])){
        matched = true;
        matchCount++;
        if(examples[i].length < 3){
          const tgt = rules[i].tgt || globalTgt;
          const tgtIdx = S.xH.indexOf(tgt);
          const srcCols = rules[i].conds.map(c => c.col);
          examples[i].push({
            row: ri + 1,
            srcVals: srcCols.map(col => { const ci = S.xH.indexOf(col); return ci !== -1 ? String(row[ci] ?? '') : ''; }),
            srcCols,
            oldVal: tgtIdx !== -1 ? String(row[tgtIdx] ?? '') : '',
            newVal: _resolveRef(row, rules[i].res),
            tgt
          });
        }
        break;
      }
    }
    if(!matched){
      elseCount++;
      if(elseVal && elseExamples.length < 2){
        const tgtIdx = S.xH.indexOf(globalTgt);
        elseExamples.push({
          row: ri + 1,
          oldVal: tgtIdx !== -1 ? String(row[tgtIdx] ?? '') : '',
          newVal: _resolveRef(row, elseVal)
        });
      }
    }
  });

  const total = S.xD.length;
  const pct = total ? Math.round(matchCount / total * 100) : 0;

  // Phase 4: Conflict detection
  const conflicts = _detectConflicts(rules);

  let html = `<div style="padding:8px;background:var(--bg2);border-radius:6px;border:1px solid var(--brd)">`;
  html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">`;
  html += `<span style="font:600 11px var(--mono);color:var(--pk)">VORSCHAU</span>`;
  html += `<span class="tg tg-g">${matchCount} von ${total} Zeilen (${pct}%)</span>`;
  if(elseVal) html += `<span class="tg tg-o">${elseCount}x Else</span>`;
  html += `</div>`;

  // Conflict warnings
  if(conflicts.length){
    html += `<div style="padding:4px 8px;background:rgba(255,77,106,.08);border:1px solid rgba(255,77,106,.2);border-radius:4px;margin-bottom:6px;font-size:10px;color:var(--red)">`;
    html += `<strong>Konflikt-Warnung:</strong> `;
    html += conflicts.map(c => c.msg).join(' | ');
    html += `</div>`;
  }

  // Example table per rule
  rules.forEach((rule, i) => {
    if(!examples[i].length) return;
    const ruleLabel = rule.conds.map(c => `${c.col} ${c.op} ${c.val}`).join(` ${rule.conds[1]?.logic || 'UND'} `);
    html += `<div style="font-size:9px;color:var(--tx2);margin-top:4px"><strong>Regel ${i+1}:</strong> ${H(ruleLabel)} (${examples[i].length === 3 ? '3+' : examples[i].length} Treffer)</div>`;
    html += `<table style="width:100%;font-size:9px;border-collapse:collapse;margin:2px 0 6px"><tr style="background:var(--bg3)"><th style="padding:2px 4px;text-align:left">Zeile</th>`;
    const cols = examples[i][0]?.srcCols || [];
    cols.forEach(col => { html += `<th style="padding:2px 4px;text-align:left">${H(col)}</th>`; });
    html += `<th style="padding:2px 4px;text-align:left">${H(examples[i][0]?.tgt || '')}</th><th style="padding:2px 4px;text-align:left;color:var(--grn)">Neu</th></tr>`;
    examples[i].forEach(ex => {
      html += `<tr style="border-top:1px solid var(--brd)"><td style="padding:2px 4px;color:var(--tx3)">${ex.row}</td>`;
      ex.srcVals.forEach(v => { html += `<td style="padding:2px 4px">${H(v)}</td>`; });
      html += `<td style="padding:2px 4px;color:var(--tx3);text-decoration:line-through">${H(ex.oldVal)}</td>`;
      html += `<td style="padding:2px 4px;color:var(--grn);font-weight:600">${H(ex.newVal)}</td></tr>`;
    });
    html += `</table>`;
  });

  // Else examples
  if(elseVal && elseExamples.length){
    html += `<div style="font-size:9px;color:var(--ora);margin-top:2px"><strong>Else:</strong> ${elseCount} Zeilen &#8594; "${H(elseVal)}"</div>`;
  }

  html += `</div>`;
  previewEl.innerHTML = html;
}

// ══════ PHASE 3: DRAG & DROP REORDER ══════

let _dragSrc = null;

function _initDragForRule(div){
  div.addEventListener('dragstart', function(e){
    _dragSrc = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  });
  div.addEventListener('dragend', function(){
    this.style.opacity = '1';
    document.querySelectorAll('#rl-rows .rl-rule').forEach(r => r.classList.remove('rl-drag-over'));
  });
  div.addEventListener('dragover', function(e){
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('rl-drag-over');
  });
  div.addEventListener('dragleave', function(){
    this.classList.remove('rl-drag-over');
  });
  div.addEventListener('drop', function(e){
    e.preventDefault();
    this.classList.remove('rl-drag-over');
    if(_dragSrc !== this){
      const container = $('rl-rows');
      const rules = [...container.querySelectorAll('.rl-rule')];
      const fromIdx = rules.indexOf(_dragSrc);
      const toIdx = rules.indexOf(this);
      if(fromIdx < toIdx){
        container.insertBefore(_dragSrc, this.nextSibling);
      } else {
        container.insertBefore(_dragSrc, this);
      }
      _rlRenum();
      _schedulePreview();
    }
  });
}

// ══════ PHASE 4: TEMPLATES ══════

export const RULE_TEMPLATES = [
  {
    id: 'land-incoterm',
    name: 'Land -> Incoterm',
    desc: 'Standard-Incoterms nach Zielland zuweisen',
    icon: '&#127757;',
    rules: [
      { conds: [{ logic:'UND', col:'Land', op:'=', val:'DE', val2:'' }], tgt:'Incoterm', res:'DAP' },
      { conds: [{ logic:'UND', col:'Land', op:'=', val:'US', val2:'' }], tgt:'Incoterm', res:'CIF' },
      { conds: [{ logic:'UND', col:'Land', op:'=', val:'CN', val2:'' }], tgt:'Incoterm', res:'FOB' },
      { conds: [{ logic:'UND', col:'Land', op:'=', val:'NG', val2:'' }], tgt:'Incoterm', res:'CIF' },
    ],
    globalTgt: 'Incoterm',
    elseVal: 'EXW'
  },
  {
    id: 'preis-staffel',
    name: 'Preis-Staffel',
    desc: 'Rabattgruppen nach Bestellwert',
    icon: '&#128176;',
    rules: [
      { conds: [{ logic:'UND', col:'Betrag', op:'>=', val:'10000', val2:'' }], tgt:'Rabatt', res:'15%' },
      { conds: [{ logic:'UND', col:'Betrag', op:'>=', val:'5000', val2:'' }], tgt:'Rabatt', res:'10%' },
      { conds: [{ logic:'UND', col:'Betrag', op:'>=', val:'1000', val2:'' }], tgt:'Rabatt', res:'5%' },
    ],
    globalTgt: 'Rabatt',
    elseVal: '0%'
  },
  {
    id: 'status-klassifizierung',
    name: 'Status-Klassifizierung',
    desc: 'Textbasierte Status-Zuordnung',
    icon: '&#127991;',
    rules: [
      { conds: [{ logic:'UND', col:'Status', op:'enthält', val:'offen', val2:'' }], tgt:'Kategorie', res:'Aktiv' },
      { conds: [{ logic:'UND', col:'Status', op:'enthält', val:'abgeschlossen', val2:'' }], tgt:'Kategorie', res:'Erledigt' },
      { conds: [{ logic:'UND', col:'Status', op:'enthält', val:'storniert', val2:'' }], tgt:'Kategorie', res:'Abgebrochen' },
    ],
    globalTgt: 'Kategorie',
    elseVal: 'Unbekannt'
  },
  {
    id: 'dg-klassifizierung',
    name: 'Gefahrgut-Klassifizierung',
    desc: 'DG-Klasse basierend auf UN-Nummer',
    icon: '&#9888;',
    rules: [
      { conds: [{ logic:'UND', col:'UN_Nr', op:'zwischen', val:'1001', val2:'1500' }], tgt:'DG_Klasse', res:'Klasse 1-3' },
      { conds: [{ logic:'UND', col:'UN_Nr', op:'zwischen', val:'1501', val2:'2500' }], tgt:'DG_Klasse', res:'Klasse 4-6' },
      { conds: [{ logic:'UND', col:'UN_Nr', op:'zwischen', val:'2501', val2:'3500' }], tgt:'DG_Klasse', res:'Klasse 7-9' },
    ],
    globalTgt: 'DG_Klasse',
    elseVal: 'Kein DG'
  },
  {
    id: 'waehrung-symbol',
    name: 'Wahrungssymbol',
    desc: 'Wahrungskurzel zu Symbol zuordnen',
    icon: '&#128178;',
    rules: [
      { conds: [{ logic:'UND', col:'Waehrung', op:'=', val:'EUR', val2:'' }], tgt:'Symbol', res:'EUR' },
      { conds: [{ logic:'UND', col:'Waehrung', op:'=', val:'USD', val2:'' }], tgt:'Symbol', res:'$' },
      { conds: [{ logic:'UND', col:'Waehrung', op:'=', val:'GBP', val2:'' }], tgt:'Symbol', res:'GBP' },
      { conds: [{ logic:'UND', col:'Waehrung', op:'=', val:'NGN', val2:'' }], tgt:'Symbol', res:'NGN' },
    ],
    globalTgt: 'Symbol',
    elseVal: ''
  },
  {
    id: 'leer-auffuellen',
    name: 'Leere Felder fullen',
    desc: 'Fehlende Werte mit Standard belegen',
    icon: '&#128295;',
    rules: [
      { conds: [{ logic:'UND', col:'Status', op:'leer', val:'', val2:'' }], tgt:'Status', res:'Offen' },
    ],
    globalTgt: 'Status',
    elseVal: ''
  }
];

export function rlApplyTemplate(templateId){
  const tpl = RULE_TEMPLATES.find(t => t.id === templateId);
  if(!tpl){ toast('Vorlage nicht gefunden'); return; }
  // Clear current rules
  $('rl-rows').innerHTML = '';
  // Set global target + else
  $('rl-tgt').value = tpl.globalTgt;
  $('rl-else').value = tpl.elseVal || '';
  if($('rl-name')) $('rl-name').value = tpl.name;
  // Add rules
  for(const rule of tpl.rules){
    rlAddRule();
    const ruleDiv = $('rl-rows').lastElementChild;
    if(!ruleDiv) continue;
    // Match target column if it exists
    const tgtSel = ruleDiv.querySelector('.rl-rule-tgt');
    if(tgtSel){
      // Check if column exists, otherwise keep default
      const opts = [...tgtSel.options].map(o => o.value);
      if(opts.includes(rule.tgt)) tgtSel.value = rule.tgt;
    }
    ruleDiv.querySelector('.rl-res').value = rule.res;
    // Set conditions
    if(rule.conds && rule.conds.length){
      const firstCond = ruleDiv.querySelector('.rl-cond');
      if(firstCond){
        const colSel = firstCond.querySelector('.rl-col');
        const opts = [...colSel.options].map(o => o.value);
        if(opts.includes(rule.conds[0].col)) colSel.value = rule.conds[0].col;
        firstCond.querySelector('.rl-op').value = rule.conds[0].op;
        firstCond.querySelector('.rl-val').value = rule.conds[0].val;
        const v2 = firstCond.querySelector('.rl-val2');
        if(v2 && rule.conds[0].val2){ v2.value = rule.conds[0].val2; v2.style.display = rule.conds[0].op === 'zwischen' ? '' : 'none'; }
      }
      for(let j = 1; j < rule.conds.length; j++){
        rlAddCond(ruleDiv);
        const allConds = ruleDiv.querySelectorAll('.rl-cond');
        const condEl = allConds[allConds.length - 1];
        if(condEl){
          condEl.querySelector('.rl-col').value = rule.conds[j].col;
          condEl.querySelector('.rl-op').value = rule.conds[j].op;
          condEl.querySelector('.rl-val').value = rule.conds[j].val;
        }
      }
    }
  }
  _schedulePreview();
  toast('Vorlage "' + tpl.name + '" geladen');
}

export function renderTemplates(){
  const container = $('rl-templates');
  if(!container) return;
  container.innerHTML = RULE_TEMPLATES.map(t =>
    `<button class="b bo bs" style="font-size:10px;padding:4px 8px;margin:2px" onclick="window.rlApplyTemplate('${t.id}')" title="${H(t.desc)}"><span>${t.icon}</span> ${H(t.name)}</button>`
  ).join('');
}

// ══════ PHASE 4: CONFLICT DETECTION ══════

function _detectConflicts(rules){
  const conflicts = [];
  if(rules.length < 2) return conflicts;

  for(let i = 0; i < rules.length; i++){
    for(let j = i + 1; j < rules.length; j++){
      const ri = rules[i], rj = rules[j];
      // Same single-condition on same column with overlapping values → potential conflict
      if(ri.conds.length === 1 && rj.conds.length === 1){
        const ci = ri.conds[0], cj = rj.conds[0];
        if(ci.col === cj.col){
          // Exact same condition
          if(ci.op === cj.op && ci.val === cj.val){
            conflicts.push({ msg: `Regel ${i+1} und ${j+1}: identische Bedingung (${ci.col} ${ci.op} ${ci.val})`, severity: 'high' });
          }
          // Overlapping ranges
          else if(ci.op === '>=' && cj.op === '>='){
            const vi = parseFloat(ci.val), vj = parseFloat(cj.val);
            if(!isNaN(vi) && !isNaN(vj) && vi < vj){
              conflicts.push({ msg: `Regel ${i+1} (>=${ci.val}) fängt alles von Regel ${j+1} (>=${cj.val}) ab`, severity: 'medium' });
            }
          }
        }
      }
      // Dead rule: if rule i matches everything, rule j is unreachable
      if(ri.conds.length === 1 && (ri.conds[0].op === 'nicht leer' || ri.conds[0].op === 'leer')){
        // This is broad but not universal — skip for now
      }
    }
  }
  return conflicts;
}

// ══════ BACKWARD COMPATIBILITY EXPORTS ══════
// These wrappers keep pipeline.js and old saved data working

export function runSavedCase(idx){
  // Find the case in savedRules by _origin or fallback to savedCases
  _migrateLegacyRules();
  const caseRules = S.savedRules.filter(r => r._origin === 'case');
  if(caseRules[idx]){
    const realIdx = S.savedRules.indexOf(caseRules[idx]);
    runSavedRule(realIdx);
  } else if(S.savedCases && S.savedCases[idx]){
    // Legacy fallback: run from old array
    const old = S.savedCases[idx];
    S.savedRules.push({ ...old, _origin: 'case' });
    runSavedRule(S.savedRules.length - 1);
  }
}

export function runSavedIE(idx){
  _migrateLegacyRules();
  const ieRules = S.savedRules.filter(r => r._origin === 'ifelse');
  if(ieRules[idx]){
    const realIdx = S.savedRules.indexOf(ieRules[idx]);
    runSavedRule(realIdx);
  } else if(S.savedIE && S.savedIE[idx]){
    const old = S.savedIE[idx];
    const rules = (old.blocks || []).map(b => ({
      conds: b.conds, tgt: b.tgt || old.globalTgt, res: b.res
    }));
    S.savedRules.push({ rules, globalTgt: old.globalTgt, elseVal: old.elseVal, name: old.name, _origin: 'ifelse' });
    runSavedRule(S.savedRules.length - 1);
  }
}

export function runSavedSW(idx){
  _migrateLegacyRules();
  const swRules = S.savedRules.filter(r => r._origin === 'switch');
  if(swRules[idx]){
    const realIdx = S.savedRules.indexOf(swRules[idx]);
    runSavedRule(realIdx);
  }
}

// Legacy render functions (no-ops, unified rendering handles all)
export function renderSavedCases(){ renderSavedRules(); }
export function renderSavedIE(){ renderSavedRules(); }
export function renderSavedSW(){ renderSavedRules(); }

// Legacy builder functions (redirect to unified)
export function csAddRow(){ rlAddRule(); }
export function csAddCond(ruleDiv){ rlAddCond(ruleDiv); }
export function csSyncTargets(){ rlSyncTargets(); }
export function csAddNew(){ rlAddNewCol(); }
export function CS_RUN(){ RULES_RUN(); }
export function CS_SAVE(){ RULES_SAVE(); }
export function ieAddElseIf(){ rlAddRule(); }
export function ieAddCond(blockDiv){ rlAddCond(blockDiv); }
export function ieSyncTargets(){ rlSyncTargets(); }
export function ieAddNew(){ rlAddNewCol(); }
export function IE_RUN(){ RULES_RUN(); }
export function IE_SAVE(){ RULES_SAVE(); }
export function swAddRule(){ rlAddRule(); }
export function swAddCond(ruleDiv){ rlAddCond(ruleDiv); }
export function swSyncTargets(){ rlSyncTargets(); }
export function swAddNew(){ rlAddNewCol(); }
export function SW_RUN(){ RULES_RUN(); }
export function SW_SAVE(){ RULES_SAVE(); }

// evalBlock backward compat (used by if-else.js consumers)
export function evalBlock(row, block){
  if(block instanceof HTMLElement){
    // DOM-based evaluation — parse and evaluate
    const conds = [...block.querySelectorAll('.rl-cond, .ie-cond')].map((c, i) => ({
      logic: i === 0 ? 'UND' : (c.querySelector('.rl-logic, .ie-logic')?.value || 'UND'),
      col: (c.querySelector('.rl-col, .ie-col')?.value || ''),
      op: (c.querySelector('.rl-op, .ie-op')?.value || '='),
      val: (c.querySelector('.rl-val, .ie-val')?.value || ''),
      val2: (c.querySelector('.rl-val2, .ie-val2')?.value || '')
    }));
    return evalRule(row, { conds });
  }
  return evalRule(row, block);
}
