// ══════ CONTEXT MENUS ══════
import { S } from '../store.js';
import { $ } from '../utils.js';
// TODO: H, A are cross-module dependencies from core
// TODO: CE, sortByClick are from ./cells.js
// TODO: XRenC, XHideC, XMoveC, XDC are from ./columns.js
// TODO: XDR is a core mutator
// TODO: pasteToCell, fillDown, clearCell, insertRowAbove, insertRowBelow are from ./cells.js

export function showCtxAt(ev,html){if(ev){ev.preventDefault();ev.stopPropagation()}const m=$('ctx-menu');m.innerHTML=html;m.style.display='block';const x=ev?ev.clientX:100,y=ev?ev.clientY:100;m.style.left=Math.min(x,innerWidth-220)+'px';m.style.top=Math.min(y,innerHeight-m.offsetHeight-10)+'px'}
export function hideCtx(){$('ctx-menu').style.display='none'}

export function initContextMenuListeners() {
  document.addEventListener('mousedown',e=>{if(!e.target.closest('#ctx-menu')&&$('ctx-menu').style.display==='block')hideCtx()});
}

export function ctxHeader(ev,ci){ev.preventDefault();ev.stopPropagation();const h=S.xH[ci];showCtxAt(ev,`<div class="ctx-item" style="color:var(--acc);font-weight:600;pointer-events:none">${window.H(h)}</div><div class="ctx-sep"></div><div class="ctx-item" onclick="sortByClick(${ci});hideCtx()">Sortieren A→Z / Z→A</div><div class="ctx-item" onclick="XRenC(${ci});hideCtx()">✏ Umbenennen</div><div class="ctx-item" onclick="XHideC(${ci});hideCtx()">👁 Ausblenden</div><div class="ctx-item" onclick="XMoveC(${ci},-1);hideCtx()">← Nach links</div><div class="ctx-item" onclick="XMoveC(${ci},1);hideCtx()">→ Nach rechts</div><div class="ctx-sep"></div><div class="ctx-item danger" onclick="XDC(${ci});hideCtx()">✕ Spalte löschen</div>`)}
export function ctxCell(ev,ri,ci){ev.preventDefault();ev.stopPropagation();const val=S.xD[ri][ci];showCtxAt(ev,`<div class="ctx-item" onclick="CE(${ri},${ci});hideCtx()">✏ Bearbeiten</div><div class="ctx-item" onclick="navigator.clipboard.writeText('${window.A(String(val??''))}');toast('📋');hideCtx()">📋 Kopieren</div><div class="ctx-item" onclick="pasteToCell(${ri},${ci});hideCtx()">📥 Einfügen</div><div class="ctx-sep"></div><div class="ctx-item" onclick="fillDown(${ri},${ci});hideCtx()">↓ Nach unten füllen</div><div class="ctx-item" onclick="clearCell(${ri},${ci});hideCtx()">Zelle leeren</div><div class="ctx-sep"></div><div class="ctx-item" onclick="insertRowAbove(${ri});hideCtx()">+ Zeile darüber</div><div class="ctx-item" onclick="insertRowBelow(${ri});hideCtx()">+ Zeile darunter</div><div class="ctx-item danger" onclick="XDR(${ri});hideCtx()">✕ Zeile löschen</div>`)}
