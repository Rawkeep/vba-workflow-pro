// ══════ KEYBOARD SHORTCUTS ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: UNDO, REDO are from ./undo-redo.js
// TODO: toggleAllRows, deleteSelectedRows are from ./rows.js
// TODO: hideCtx is from ./context-menu.js
// TODO: XR, CE, navBack, navForward are cross-module dependencies from core
// TODO: qSearchOpen, qSearchClose are from ./auto-save.js

export function initKeyboardShortcuts() {
  document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key==='z'&&!e.target.matches('input,textarea,select,.ci')){e.preventDefault();UNDO()}
  if(e.ctrlKey&&e.key==='y'&&!e.target.matches('input,textarea,select,.ci')){e.preventDefault();REDO()}
  if(e.ctrlKey&&e.key==='a'&&$('p-excel').classList.contains('a')&&!e.target.matches('input,textarea,select,.ci')){e.preventDefault();toggleAllRows(true)}
  if(e.key==='Delete'&&S.selectedRows.size>0&&!e.target.matches('input,textarea,select,.ci')){e.preventDefault();deleteSelectedRows()}
  if(e.key==='Escape'){hideCtx();S.selectedRows.clear();XR()}
  // Tab navigation in cells
  if(e.key==='Tab'&&e.target.classList.contains('ci')){e.preventDefault();const td=e.target.closest('td');const tr=td.closest('tr');const ri=parseInt(tr.dataset.ri);const id=td.id;const m=id.match(/c(\d+)-(\d+)/);if(m){let r=parseInt(m[1]),c=parseInt(m[2]);e.target.blur();if(e.shiftKey){c--;if(c<0){c=S.xH.length-1;r--}}else{c++;if(c>=S.xH.length){c=0;r++}}if(r>=0&&r<S.xD.length)setTimeout(()=>CE(r,c),50)}}
  // Arrow keys in cells
  if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target.classList.contains('ci')){e.preventDefault();const td=e.target.closest('td');const id=td.id;const m=id.match(/c(\d+)-(\d+)/);if(m){let r=parseInt(m[1]),c=parseInt(m[2]);e.target.blur();r+=e.key==='ArrowDown'?1:-1;if(r>=0&&r<S.xD.length)setTimeout(()=>CE(r,c),50)}}
  });
  // Navigation history keyboard shortcuts
  document.addEventListener('keydown',e=>{
    if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();navBack()}
    if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();navForward()}
  });
}

// ══════ ENHANCED KEYBOARD ══════
export function initEnhancedKeyboard() {
  const _origKeydown=document.onkeydown;
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.key==='f'&&$('p-excel').classList.contains('a')){e.preventDefault();qSearchOpen()}
    if(e.key==='Escape'&&$('qsearch').classList.contains('show')){qSearchClose();e.stopPropagation()}
    if(e.key==='?'&&!e.target.matches('input,textarea,select,.ci')&&!e.ctrlKey){$('shortcuts').classList.add('show')}
    if(e.key==='Escape'&&$('shortcuts').classList.contains('show')){$('shortcuts').classList.remove('show')}
  },true);
}
