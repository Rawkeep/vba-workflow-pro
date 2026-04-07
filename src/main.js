import './styles/main.css';

// ─── Core ───
import { IDB } from './idb.js';
import { S, VBA_BEAST_VERSION, _appLog } from './store.js';
import { $ } from './utils.js';
import { NAV, N, T, toggleTheme, toast, H, A, L, RL, macLog, colOpts, navBack, navForward } from './nav.js';

// ─── Excel ───
import { XI, XSheet, loadSheet, XLocal, XSaveLocal } from './excel/import.js';
import { XPDF, XE, toggleExpDD, closeExpDD, showX, XR, CE, CC, XAR, XDR, XAC, XT, textToPDF, WESPDF, WEAPDF } from './excel/export.js';
import { csAddRow, csAddCond, csSyncTargets, csAddNew, CS_RUN, CS_SAVE, renderSavedCases, runSavedCase, ieAddElseIf, ieAddCond, ieSyncTargets, ieAddNew, evalCond, evalBlock, IE_RUN, IE_SAVE, renderSavedIE, runSavedIE, swAddRule, swAddCond, swSyncTargets, swAddNew, SW_RUN, SW_SAVE, renderSavedSW, runSavedSW, rlAddRule, rlAddCond, rlSyncTargets, rlAddNewCol, RULES_RUN, RULES_SAVE, renderSavedRules, runSavedRule, editSavedRule, rlApplyTemplate, renderTemplates, evalRule } from './excel/rules.js';
import { ppAdd, ppRenum, PP_RUN, PP_SAVE, renderSavedPipes, runSavedPipe } from './excel/pipeline.js';
import { evalCalc, CALC, renderCalcH, reCalc } from './excel/calc.js';
import { MAC_REC, MAC_STOP, MAC_SAVE, renderMacC, renderMacList, MAC_RUN } from './excel/macros.js';
import { FM, PV, SO, FI, FIR, SR, TF, DD, VL, CH, VD_RUN } from './excel/operations.js';

// ─── Excel Advanced ───
import { setActiveCell, colLetter, fbKeydown, fbBlur, showColFilter, closeColFilter, filterDDSearch, filterDDToggleAll, filterDDToggle, applyColFilter, clearColFilter, applyAllFilters, initClipboardPaste, showCellTip, hideCellTip, autoFitCol, autoFitAllCols, toggleFullscreen, initEnhancedCellEditing, initExcelXROverride, initExcelKeyboardNav } from './excel/render.js';
import { genSuggestions, renderSuggestions, execSuggestion, dismissSuggestion, navToTab, prefillCase, prefillPivot, prefillIE, suggestFillMissing, initSuggestionsHook } from './excel/suggestions.js';
import { detectColTypes, calcDataQuality, generateInsights, renderDataProfile, renderInsights, initAnalystXROverride } from './excel/analyst.js';

// ─── Word ───
import { UP, WI, WU, RW, DI, insertField, _replaceFieldInTpl, _autoFixAllFields } from './word/merge.js';
import { buildDocx, uploadLetterhead, removeLetterhead, saveFooterText } from './word/docx-builder.js';

// ─── Entitlements & Paywall ───
import { isPro, isAI, getTier, canUse, getLimit, activatePro, deactivate, gateFeature, showUpgradePrompt } from './entitlements.js';
import { handleCheckoutReturn, syncEntitlement } from './paywall.js';

// ─── DocCenter ───
import { dcTab, dcAddCategory, dcRemoveCategory, dcRenderCategories, dcUploadTemplate, dcDetectPlaceholders, dcSaveTemplate, dcEditTemplate, dcDeleteTemplate, dcCreateManualTemplate, dcRenderTemplates, dcAddTrigger, dcRemoveTrigger, dcUseExcelData, dcInitUI, dcAddBuiltin, dcBatchGenerate, mr, db, dl, WES, WEA, WPD, WP } from './doccenter/index.js';

// ─── Templates ───
import { setDocType, renderTemplateCards, loadLibTemplate, setLabelLayout, updateLabelPreview, exportLabelsPDF, insertFieldFromData, autoGenTemplate, _hydrateTemplates, saveUserTemplate, loadUserTemplate, renderSavedTemplates, checkSEM, EM, EMC, EMPDF, SEM, DLE, DA } from './templates/index.js';

// ─── Email ───
import { initEmailMerge, insertSemField, semPreview, SEM2, semExportAll } from './email/index.js';

// ─── Database ───
import { dbSaveCurrent, dbImportFile, dbLoadEntry, dbDeleteEntry, dbRenameEntry, dbSetCategory, dbDuplicateEntry, dbExportEntry, dbExportAll, dbMergeSelected, dbToggleEntry, dbToggleAll, dbAddCategory, dbRemoveCategory, dbRender } from './database/index.js';

// ─── UI ───
import { qopTrimAll, qopRemoveEmpty, qopRemoveDupes, qopFillMissing, qopAutoFormat, qopSortAZ, qopUpperHeaders, qopStats } from './ui/quick-ops.js';
import { pushUndo, UNDO, REDO, updateUndoBtn, wrapMutatorsWithUndo } from './ui/undo-redo.js';
import { XDC, XRenC, XHideC, XShowC, XShowAllC, updateHiddenBadge, showHiddenCols, XMoveC, showColPicker, startResize, _toggleAllDelCols, _deleteCheckedCols, _updateDelCount, initColStatsOverride } from './ui/columns.js';
import { toggleRow, toggleAllRows, showSelActions, deleteSelectedRows, copySelectedRows, invertSelection, XESel } from './ui/rows.js';
import { showCtxAt, hideCtx, initContextMenuListeners, ctxHeader, ctxCell } from './ui/context-menu.js';
import { pasteToCell, clearCell, fillDown, insertRowAbove, insertRowBelow, sortByClick, updateStatusBar } from './ui/cells.js';
import { initKeyboardShortcuts, initEnhancedKeyboard } from './ui/keyboard.js';
import { initDragDrop } from './ui/drag-drop.js';
import { DEMOS, loadDemo, loadTemplates } from './ui/demo-data.js';
import { _lsUsage, autoSave, autoRestore, initAutoSaveHook, qSearchOpen, qSearchClose, qSearch } from './ui/auto-save.js';
import { safeExec, initErrorBoundaries } from './ui/error-boundary.js';
import { tourStart, tourNext, tourPrev, tourEnd } from './ui/tour.js';
import { setChartType, exportChartPNG, renderErrLog, renderLSUsage, showHelp, hideHelp } from './ui/misc.js';

// ─── AI ───
import './ai/index.js';

// ─── Hybrid ───
import { trackUsage, getTopFeatures, updateQuickActions, qaRun, addRecentFile, renderRecentFiles, restoreRecent, loadWorkspaces, saveWorkspaces, saveWorkspace, loadWorkspaceByName, deleteWorkspace, renameWorkspace, renderWSList, renderSavedWSOnboard, toggleWSPanel, toggleFavorite, isFavorite, renderFavorites, setMode, timeAgo, saveHybridState, restoreHybridState } from './hybrid/index.js';

// ─── Dashboard ───
import { updateDashboard, addDashActivity, renderDashActivity } from './dashboard/index.js';

// ─── Startup ───
import './startup.js';

// ─── Expose globals for inline onclick handlers in HTML ───
Object.assign(window, {
  // Nav
  N, T, toggleTheme, navBack, navForward, toast,
  // Excel Import/Export
  XI, XSheet, loadSheet, XLocal, XSaveLocal,
  XPDF, XE, toggleExpDD, closeExpDD, showX, XR,
  CE, CC, XAR, XDR, XAC, XT, textToPDF, WESPDF, WEAPDF,
  // Select Case
  csAddRow, csAddCond, csSyncTargets, csAddNew, CS_RUN, CS_SAVE, renderSavedCases, runSavedCase,
  // If/Else
  ieAddElseIf, ieAddCond, ieSyncTargets, ieAddNew, IE_RUN, IE_SAVE, renderSavedIE, runSavedIE,
  // Pipeline
  ppAdd, ppRenum, PP_RUN, PP_SAVE, renderSavedPipes, runSavedPipe,
  // Calc / Macros
  evalCalc, CALC, renderCalcH, reCalc,
  MAC_REC, MAC_STOP, MAC_SAVE, renderMacC, renderMacList, MAC_RUN,
  // Operations
  FM, PV, SO, FI, FIR, SR, TF, DD, VL, CH, VD_RUN,
  // Switch (legacy)
  swAddRule, swAddCond, swSyncTargets, swAddNew, SW_RUN, SW_SAVE, renderSavedSW, runSavedSW,
  // Unified Rules
  rlAddRule, rlAddCond, rlSyncTargets, rlAddNewCol, RULES_RUN, RULES_SAVE,
  renderSavedRules, runSavedRule, editSavedRule, rlApplyTemplate, renderTemplates, evalRule,
  // Excel Advanced
  setActiveCell, colLetter, fbKeydown, fbBlur,
  showColFilter, closeColFilter, filterDDSearch, filterDDToggleAll,
  filterDDToggle, applyColFilter, clearColFilter, applyAllFilters,
  initClipboardPaste, showCellTip, hideCellTip,
  autoFitCol, autoFitAllCols, toggleFullscreen,
  detectColTypes, calcDataQuality, generateInsights, renderDataProfile, renderInsights,
  genSuggestions, renderSuggestions, execSuggestion, dismissSuggestion,
  navToTab, prefillCase, prefillPivot, prefillIE, suggestFillMissing,
  // Word
  UP, WI, WU, RW, DI, insertField, _replaceFieldInTpl, _autoFixAllFields,
  buildDocx, uploadLetterhead, removeLetterhead, saveFooterText,
  // DocCenter
  dcTab, dcAddCategory, dcRemoveCategory, dcRenderCategories,
  dcUploadTemplate, dcDetectPlaceholders, dcSaveTemplate, dcEditTemplate,
  dcDeleteTemplate, dcCreateManualTemplate, dcRenderTemplates,
  dcAddTrigger, dcRemoveTrigger, dcUseExcelData, dcInitUI, dcAddBuiltin, dcBatchGenerate,
  mr, db, dl, WES, WEA, WPD, WP,
  // Templates
  setDocType, renderTemplateCards, loadLibTemplate,
  setLabelLayout, updateLabelPreview, exportLabelsPDF,
  insertFieldFromData, autoGenTemplate,
  saveUserTemplate, loadUserTemplate, renderSavedTemplates, checkSEM,
  EM, EMC, EMPDF, SEM, DLE, DA,
  // Email
  insertSemField, semPreview, SEM2, semExportAll,
  // Database
  dbSaveCurrent, dbImportFile, dbLoadEntry, dbDeleteEntry, dbRenameEntry,
  dbSetCategory, dbDuplicateEntry, dbExportEntry, dbExportAll,
  dbMergeSelected, dbToggleEntry, dbToggleAll, dbAddCategory, dbRemoveCategory, dbRender,
  // Quick Ops
  qopTrimAll, qopRemoveEmpty, qopRemoveDupes, qopFillMissing,
  qopAutoFormat, qopSortAZ, qopUpperHeaders, qopStats,
  // Undo/Redo
  pushUndo, UNDO, REDO, updateUndoBtn,
  // Columns
  XDC, XRenC, XHideC, XShowC, XShowAllC, updateHiddenBadge,
  showHiddenCols, XMoveC, showColPicker, startResize,
  _toggleAllDelCols, _deleteCheckedCols, _updateDelCount,
  // Rows
  toggleRow, toggleAllRows, showSelActions, deleteSelectedRows,
  copySelectedRows, invertSelection, XESel,
  // Context Menu
  showCtxAt, hideCtx, ctxHeader, ctxCell,
  // Cells
  pasteToCell, clearCell, fillDown, insertRowAbove, insertRowBelow,
  sortByClick, updateStatusBar,
  // Demo Data
  DEMOS, loadDemo, loadTemplates,
  // Auto-save / Search
  _lsUsage, autoSave, autoRestore, qSearchOpen, qSearchClose, qSearch,
  // Error Boundary
  safeExec,
  // Tour
  tourStart, tourNext, tourPrev, tourEnd,
  // Misc UI
  setChartType, exportChartPNG, renderErrLog, renderLSUsage, showHelp, hideHelp,
  // Hybrid
  trackUsage, getTopFeatures, updateQuickActions, qaRun,
  addRecentFile, renderRecentFiles, restoreRecent,
  loadWorkspaces, saveWorkspaces, timeAgo,
  saveWorkspace, loadWorkspaceByName, deleteWorkspace, renameWorkspace,
  renderWSList, renderSavedWSOnboard, toggleWSPanel,
  toggleFavorite, isFavorite, renderFavorites, setMode,
  saveHybridState, restoreHybridState,
  // Dashboard
  updateDashboard, addDashActivity, renderDashActivity,
  // Entitlements
  isPro, isAI, getTier, canUse, gateFeature, showUpgradePrompt,
  // Utils
  $, S, IDB, H, A, L, RL, macLog, colOpts, _appLog,
});

console.log(`VBA BEAST ${VBA_BEAST_VERSION} loaded.`);
