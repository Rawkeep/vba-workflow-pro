import './styles/main.css';

// ─── Core ───
import { IDB } from './idb.js';
import { S, VBA_BEAST_VERSION, _appLog } from './store.js';
import { $ } from './utils.js';
import { NAV, N, T, toggleTheme, toast, H, A, L, RL, macLog, colOpts, navBack, navForward } from './nav.js';

// ─── Excel ───
import { XI, XSheet, loadSheet, XLocal, XSaveLocal } from './excel/import.js';
import { XPDF, XE, toggleExpDD, closeExpDD, showX, XR, CE, CC, XAR, XDR, XAC, XT, textToPDF, WESPDF, WEAPDF } from './excel/export.js';
import { csAddRow, csAddNew, CS_RUN, CS_SAVE, renderSavedCases, runSavedCase } from './excel/select-case.js';
import { ieAddElseIf, ieAddCond, ieAddNew, evalCond, evalBlock, IE_RUN, IE_SAVE, renderSavedIE, runSavedIE } from './excel/if-else.js';
import { ppAdd, ppRenum, PP_RUN, PP_SAVE, renderSavedPipes, runSavedPipe } from './excel/pipeline.js';
import { evalCalc, CALC, renderCalcH, reCalc } from './excel/calc.js';
import { MAC_REC, MAC_STOP, MAC_SAVE, renderMacC, renderMacList, MAC_RUN } from './excel/macros.js';
import { FM, PV, SO, FI, FIR, SR, TF, DD, VL, CH, VD_RUN } from './excel/operations.js';
import { swAddRule, swAddNew, SW_RUN, SW_SAVE, renderSavedSW, runSavedSW } from './excel/switch.js';

// ─── Word ───
import { UP, WI, WU, RW, DI, insertField } from './word/merge.js';
import { buildDocx, uploadLetterhead, removeLetterhead, saveFooterText } from './word/docx-builder.js';

// ─── Entitlements & Paywall ───
import './entitlements.js';
import { handleCheckoutReturn, syncEntitlement } from './paywall.js';

// ─── Modules ───
import './doccenter/index.js';
import './templates/index.js';
import './email/index.js';
import './database/index.js';

// ─── UI ───
import './ui/quick-ops.js';
import './ui/undo-redo.js';
import './ui/columns.js';
import './ui/rows.js';
import './ui/context-menu.js';
import './ui/cells.js';
import './ui/keyboard.js';
import './ui/drag-drop.js';
import './ui/demo-data.js';
import './ui/auto-save.js';
import './ui/error-boundary.js';
import './ui/tour.js';

// ─── AI ───
import './ai/index.js';

// ─── Excel Advanced ───
import './excel/render.js';
import './excel/suggestions.js';
import './excel/analyst.js';

// ─── Hybrid ───
import './hybrid/index.js';

// ─── Dashboard ───
import './dashboard/index.js';

// ─── Startup ───
import './startup.js';

// ─── Expose globals for inline onclick handlers in HTML ───
// The monolithic HTML uses onclick="functionName()" extensively.
// Until we migrate to addEventListener, we need window bindings.
Object.assign(window, {
  // Nav
  N, T, toggleTheme, navBack, navForward, toast,
  // Excel Import/Export
  XI, XSheet, loadSheet, XLocal, XSaveLocal,
  XPDF, XE, toggleExpDD, closeExpDD, showX, XR,
  CE, CC, XAR, XDR, XAC, XT, textToPDF, WESPDF, WEAPDF,
  // Select Case
  csAddRow, csAddNew, CS_RUN, CS_SAVE, renderSavedCases, runSavedCase,
  // If/Else
  ieAddElseIf, ieAddCond, ieAddNew, IE_RUN, IE_SAVE, renderSavedIE, runSavedIE,
  // Pipeline
  ppAdd, ppRenum, PP_RUN, PP_SAVE, renderSavedPipes, runSavedPipe,
  // Calc / Macros
  evalCalc, CALC, renderCalcH, reCalc,
  MAC_REC, MAC_STOP, MAC_SAVE, renderMacC, renderMacList, MAC_RUN,
  // Operations
  FM, PV, SO, FI, FIR, SR, TF, DD, VL, CH, VD_RUN,
  // Switch
  swAddRule, swAddNew, SW_RUN, SW_SAVE, renderSavedSW, runSavedSW,
  // Word
  UP, WI, WU, RW, DI, insertField,
  buildDocx, uploadLetterhead, removeLetterhead, saveFooterText,
  // Utils
  $, S, IDB, H, A, L, RL, macLog, colOpts, _appLog,
});

console.log(`VBA BEAST ${VBA_BEAST_VERSION} loaded.`);
