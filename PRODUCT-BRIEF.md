# Product Lens: IF/ELSE & SELECT CASE Rule Builders

**App:** VBA Workflow Pro (V3)
**Scope:** Mode 1 (Product Diagnostic) + Mode 3 (User Journey Audit)
**Date:** 2026-04-07
**Persona:** German office worker (Sachbearbeiter) — knows WENN() formulas, not VBA

---

## 1. Current State Analysis

### What Exists

Three separate rule builders that do functionally the same thing:

| Feature | Tab Name | Color | Logic Keywords | Saved Store |
|---------|----------|-------|----------------|-------------|
| SELECT CASE | `xtp-case` | Pink (`--pk`) | UND / ODER | `S.savedCases` |
| IF / ELSE | `xtp-ifelse` | Orange (`--ora`) | AND / OR | `S.savedIE` |
| SWITCH | `xtp-switch` | Cyan (`--cyn`) | AND / OR | `S.savedSW` |

All three share **identical capabilities**:
- Same 12 operators (`= != > < >= <= enthaelt beginnt endet leer nicht_leer zwischen`)
- Same multi-condition support (AND/OR per rule)
- Same per-rule target column override
- Same `{Spaltenname}` column reference syntax in result values
- Same "first match wins" evaluation strategy
- Same global target + Else fallback pattern
- Same save/load pattern
- Same "Neue Zielspalte" column creation via `prompt()`

### What Works

- The core evaluation engine is solid and correct (condition evaluation, column resolution, `{Spalte}` references)
- Save/load persists rules to the store for reuse in pipelines
- Per-rule target column is a genuine power feature
- Undo integration (`pushUndo()`) before every mutation
- Pipeline integration: saved rules can be chained as pipeline steps
- Legacy format backward compatibility in `select-case.js`

### What Doesn't Work

**A) Three tabs, one concept.** SELECT CASE, IF/ELSE, and SWITCH are functionally identical. The only differences are cosmetic (color, label, logic keywords DE vs EN). This is the single biggest UX problem. A user building "WENN Land=DE schreibe DAP" has no principled reason to choose one tab over another.

**B) No preview.** The user clicks "ausführen" and data mutates immediately. There is no dry run, no "what would happen" preview, no before/after comparison. For a data-transformation tool targeting non-programmers, this is high-risk.

**C) No visual feedback during building.** As the user adds conditions, they see only form elements. No natural-language summary ("If Land equals DE and Betrag is greater than 1000, write Premium in Status"). No match count preview ("14 of 230 rows would match").

**D) Mixed-language confusion.** SELECT CASE uses `UND/ODER` (German), IF/ELSE and SWITCH use `AND/OR` (English). The target audience thinks in German.

**E) Value input is blind.** The user types a comparison value into a free-text input with no autocomplete from actual column data. If the column "Land" contains "DE", "US", "NG", the user must know this from memory.

**F) New column via `prompt()`.** Creating a target column uses `window.prompt()`, which is jarring and provides no validation or preview.

**G) Rule reordering impossible.** Rules are appended in creation order. First-match-wins semantics means order matters critically, but there is no drag-and-drop or move-up/move-down.

**H) No conflict detection.** Two rules can match the same row. The user has no way to see overlapping rules or contradictions.

**I) No inline testing.** The user cannot pick a single row and ask "which rule would fire for this row?"

**J) Saved rules are opaque.** The saved rule cards show a terse description (`CASE 3 Regeln -> Incoterm`). No way to expand, edit, inspect, or clone them.

**K) VBA BEAST vs. Workflow Pro: identical code.** Both versions of `if-else.js` and `select-case.js` are line-for-line identical. No differentiation between the free and pro version in this module.

---

## 2. User Journey Map

### Task: "Map country codes to Incoterms" (Land -> Incoterm)

**Step-by-step in SELECT CASE:**

| # | Action | Clicks/Inputs | Friction |
|---|--------|--------------|----------|
| 1 | Find the TRANSFORMIEREN tab group in the tab bar | 0 (scan) | Must distinguish SELECT CASE from IF/ELSE from SWITCH |
| 2 | Click "SELECT CASE" tab | 1 click | |
| 3 | Select "Standard-Ziel" dropdown (target column) | 1 click + scroll | Must already know target column exists |
| 4 | If target doesn't exist: click "+ Neue Zielspalte" | 1 click | Opens `window.prompt()` |
| 5 | Type column name in prompt | keyboard | No validation, no preview |
| 6 | Click "OK" on prompt | 1 click | |
| 7 | Click "+ Regel hinzufügen" | 1 click | Adds one case row |
| 8 | In the new row: select source column from "WENN" dropdown | 1 click + scroll | |
| 9 | Select operator (= is default) | 0 if "=" | |
| 10 | Type value "DE" in "Wert" input | keyboard | No autocomplete from data |
| 11 | Confirm target column for this rule (auto-synced) | 0 | |
| 12 | Type result "DAP" in "schreibe" input | keyboard | |
| 13 | Repeat steps 7-12 for each country | N * 6 interactions | Adding 5 countries = 30 more interactions |
| 14 | Optionally type Case Else value | keyboard | |
| 15 | Click "SELECT CASE ausfuehren" | 1 click | **Data mutates immediately** |
| 16 | See result toast "N rows" | 0 (passive) | No before/after, no row-level detail |

**Total for 5 country mappings:** ~40 interactions (clicks + key entries), zero visual confirmation before execution.

**Comparison: same task in Excel Conditional Formatting:**
Excel users know: select column -> Home -> Conditional Formatting -> New Rule -> pick values. ~8 clicks for a similar concept, with live preview in cells.

### Task: "Build multi-condition rule" (Land=DE AND Betrag>1000 -> Premium)

| # | Action | Clicks |
|---|--------|--------|
| 1 | Navigate to IF/ELSE tab | 1 |
| 2 | Select target column | 1 |
| 3 | Click "+ IF / ElseIf Block" | 1 |
| 4 | Select source column "Land" | 1 |
| 5 | Select operator "=" | 0 (default) |
| 6 | Type "DE" | keyboard |
| 7 | Click "+ Bedingung" | 1 |
| 8 | Select AND/OR (defaults AND) | 0 |
| 9 | Select column "Betrag" | 1 |
| 10 | Select operator ">" | 1 |
| 11 | Type "1000" | keyboard |
| 12 | Type result "Premium" | keyboard |
| 13 | Click "IF/ELSE ausfuehren" | 1 |

**Total:** ~8 clicks + 3 keyboard entries. This is actually reasonable for a single complex rule. The problem is scale: adding a second ElseIf repeats steps 3-12.

---

## 3. Competitive Analysis

| Feature | VBA Workflow Pro | Excel Cond. Formatting | Notion Formulas | Zapier Filters | Airtable Automations |
|---------|-----------------|----------------------|----------------|---------------|---------------------|
| Unified rule builder | 3 separate tabs | 1 dialog | 1 formula bar | 1 filter step | 1 trigger config |
| Live preview | None | Yes (cells highlight) | Yes (inline) | Yes (test step) | Yes (test record) |
| Value autocomplete | None | Yes (from data) | Yes | Yes (from schema) | Yes (from field) |
| Natural language | None | None | None | None | None |
| Drag reorder | None | Yes | N/A | Yes | Yes |
| Test single row | None | N/A | Yes (hover) | Yes (test step) | Yes (test record) |
| Conflict detection | None | None | N/A | N/A | N/A |
| Rule templates | None | Built-in presets | Templates | Templates | Templates |
| Undo | Global only | Per-rule | Per-action | N/A | N/A |

**Key takeaway:** Every competitor with comparable features provides live preview. VBA Workflow Pro is the only tool in this category that mutates data without showing the user what will happen first.

---

## 4. Top 13 UX Improvements (ICE-Ranked)

Scoring: Impact (1-5) x Confidence (1-5) / Effort (1-5) = ICE Score

| Rank | Improvement | I | C | E | ICE | Rationale |
|------|-------------|---|---|---|-----|-----------|
| 1 | **a) Merge IF/ELSE + SELECT CASE + SWITCH into one "Regeln" builder** | 5 | 5 | 3 | 8.3 | Eliminates the biggest confusion. Three identical engines become one. Reduces codebase by ~60%. Users stop asking "which one do I use?" |
| 2 | **c) Live preview row** (show match count + first 3 before/after rows) | 5 | 5 | 2 | 12.5 | Highest-value feature missing. Non-programmers need to SEE what will happen. Debounced re-evaluation on every rule change. |
| 3 | **g) Smart value suggestions** (autocomplete from column data) | 5 | 5 | 2 | 12.5 | Typing "DE" from memory when the column has 12 country codes is error-prone. Show a datalist of unique values from the selected column. |
| 4 | **h) Inline row testing** ("Test this row" button) | 4 | 5 | 2 | 10.0 | Let user click any table row and see which rule fires, what the result would be. Critical for debugging rules that don't match as expected. |
| 5 | **d) Rule templates** (Preise-Staffel, Land-Mapping, Status-Workflow) | 4 | 4 | 2 | 8.0 | Pre-built rule sets for common German office scenarios (country -> incoterm, amount -> price tier, status workflow). Reduces blank-canvas paralysis. |
| 6 | **e) Drag-and-drop rule reorder** | 4 | 5 | 2 | 10.0 | First-match-wins means order is critical. Currently impossible to reorder without deleting and recreating. |
| 7 | **j) Rule conflict detection** | 4 | 4 | 3 | 5.3 | Show warnings when two rules can match the same row. Prevents silent data errors. |
| 8 | **b) Natural language input** | 5 | 3 | 4 | 3.8 | "Wenn Land = Nigeria, schreibe Form M erforderlich" parsed into rule. High impact but NLP parsing is effort-heavy and fragile for edge cases. |
| 9 | **m) Bulk rule editing** (change target column for all rules at once) | 3 | 5 | 1 | 15.0 | Quick win. Already partially implemented via `syncTargets()` but not exposed as explicit action. |
| 10 | **k) Excel WENN() formula import** | 4 | 3 | 4 | 3.0 | Parse `=WENN(A1="DE";"DAP";"EXW")` into rules. High value for migration but formula parsing is complex. |
| 11 | **f) Visual rule flow** (flowchart/tree view) | 3 | 3 | 4 | 2.3 | Nice visual aid but not critical for the target persona. They think in tables, not flowcharts. |
| 12 | **i) Undo per rule** | 3 | 4 | 3 | 4.0 | Currently only global undo exists. Per-rule undo would let users experiment more freely. |
| 13 | **l) Color-coded rule groups** | 2 | 4 | 1 | 8.0 | Quick visual win but low functional impact. |

**Re-sorted by ICE score (descending):**

| Priority | Improvement | ICE |
|----------|-------------|-----|
| P0 | Bulk rule editing (m) | 15.0 |
| P0 | Live preview (c) | 12.5 |
| P0 | Smart value suggestions (g) | 12.5 |
| P1 | Inline row testing (h) | 10.0 |
| P1 | Drag-and-drop reorder (e) | 10.0 |
| P1 | Merge into unified builder (a) | 8.3 |
| P1 | Color-coded groups (l) | 8.0 |
| P1 | Rule templates (d) | 8.0 |
| P2 | Rule conflict detection (j) | 5.3 |
| P2 | Per-rule undo (i) | 4.0 |
| P2 | Natural language input (b) | 3.8 |
| P3 | WENN() formula import (k) | 3.0 |
| P3 | Visual rule flow (f) | 2.3 |

---

## 5. Recommended Architecture

### Phase 1: Unified Rule Engine (merge a + quick wins m, l)

Replace three tabs with ONE "Regeln" tab. Internally, keep one engine (the current `evalCond` + `evalBlock` pattern is sound).

**New tab structure:**
```
TRANSFORMIEREN:
  [Regeln] [Text] [Berechnet] [Formeln] [VLOOKUP]
```

Instead of three separate files (`if-else.js`, `select-case.js`, `switch.js`), consolidate into one `rules.js` that:
- Uses German logic keywords consistently (UND/ODER, not AND/OR)
- Exposes one "add rule" button, one "add condition" button
- Keeps per-rule target column override
- Keeps else/default value
- Stores in one `S.savedRules` array (with migration for `savedCases`, `savedIE`, `savedSW`)

The existing `evalCond()` function from `if-else.js` is already shared by `switch.js` via import. SELECT CASE has its own `_csEvalCond()` which is identical code. This is a clear DRY violation begging to be unified.

### Phase 2: Preview Layer (c, h)

Add a `<div id="rule-preview">` below the rule builder that shows:
- Match count: "23 von 450 Zeilen betroffen"
- First 3 matching rows in a mini-table with before/after columns highlighted
- Debounced: re-evaluate on every dropdown change or value input (200ms debounce)

For inline row testing: clicking any row in the data table while the rule builder is open should highlight that row and show which rule matched (or "keine Regel passt").

### Phase 3: Smart Inputs (g, e)

- Replace free-text `<input>` for condition values with `<input list="datalist-{colName}">` populated from `new Set(S.xD.map(r => r[ci]))`. Max 200 unique values.
- Add drag handles to rule rows. Use the existing `drag-drop.js` module pattern. On drop, reorder the DOM elements and re-index.

### Phase 4: Templates & Intelligence (d, j)

- Shipping templates: Land -> Incoterm, Land -> Zollbehoerde, UN-Klasse -> Verpackungsgruppe
- Finance templates: Betrag -> Preis-Staffel, Konto -> Kategorie
- Conflict detection: after building rules, run all rows through all rules and flag rows where multiple rules match.

---

## 6. Code Duplication Analysis

The three files share massive duplication:

| Pattern | if-else.js | select-case.js | switch.js |
|---------|-----------|---------------|-----------|
| Operator list (12 ops) | `_ieOpOpts()` | `_csOpOpts()` | `_swOpOpts()` |
| Condition HTML builder | `_ieCondHTML()` | `_csCondHTML()` | `_swCondHTML()` |
| Op change handler (zwischen toggle) | `_ieBindOpChange()` | `_csCondOpChange()` | `_swBindOpChange()` |
| Column resolver `{Name}` | `_ieResolve()` | `_csResolveResult()` | `_swResolve()` |
| Condition evaluator | `evalCond()` | `_csEvalCond()` | reuses `evalCond()` |
| Block/rule evaluator | `evalBlock()` | `_csEvalRule()` | `_swEvalRule()` |
| DOM parser | `_ieParseBlock()` | `_csParseRules()` | `_swParseRule()` |
| Add row/block | `ieAddElseIf()` | `csAddRow()` | `swAddRule()` |
| Add condition | `ieAddCond()` | `csAddCond()` | `swAddCond()` |
| Sync targets | `ieSyncTargets()` | `csSyncTargets()` | `swSyncTargets()` |
| New column via prompt | `ieAddNew()` | `csAddNew()` | `swAddNew()` |
| Run | `IE_RUN()` | `CS_RUN()` | `SW_RUN()` |
| Save | `IE_SAVE()` | `CS_SAVE()` | `SW_SAVE()` |
| Render saved | `renderSavedIE()` | `renderSavedCases()` | `renderSavedSW()` |
| Run saved | `runSavedIE()` | `runSavedCase()` | `runSavedSW()` |

**15 duplicated patterns across 3 files = 45 nearly-identical functions** that could be **15 functions in one file**.

---

## 7. Anti-Goals (What NOT to Do)

1. **Do NOT add a fourth rule builder variant.** The problem is too many options, not too few.
2. **Do NOT add a code editor / VBA syntax input.** The target user does not write code. Natural language is the stretch goal, not a code editor.
3. **Do NOT remove the per-rule target column feature.** This is genuinely powerful and differentiating vs. simple conditional formatting.
4. **Do NOT break pipeline integration.** Saved rules feed into the pipeline system. Any refactor must preserve `runSavedCase()` / `runSavedIE()` compatibility or migrate the pipeline references.
5. **Do NOT add real-time evaluation on every keystroke for large datasets.** Preview should be debounced and limited to first N rows. The app runs 100% client-side; 10k+ rows will cause jank.
6. **Do NOT localize to English.** This is a German-market product. Commit to German throughout (UND/ODER, not AND/OR).

---

## 8. Success Metrics

| Metric | Current Baseline | Target |
|--------|-----------------|--------|
| Tabs needed to build one rule set | 3 options to choose from (confusion) | 1 unified tab |
| Clicks to build a 5-case country mapping | ~40 | ~25 (with autocomplete + templates) |
| Data mutations without preview | 100% (every run) | 0% (preview before every run) |
| Duplicated functions across rule files | 45 | 15 (single-file consolidation) |
| User errors from typos in value input | Unknown (no tracking) | Measurable via autocomplete adoption rate |
| Time to first successful rule (new user) | Unknown | Track via tour/onboarding completion + first rule execution |

---

## 9. Summary

The rule builder system in VBA Workflow Pro has a sound evaluation engine underneath a confusing, triplicated UI surface. The core problem is not technical -- `evalCond()` works correctly -- but structural: three tabs that do the same thing, no preview before mutation, and no assistance during value entry.

The highest-leverage changes are:
1. Merge three builders into one "Regeln" tab (eliminate confusion, cut code by 60%)
2. Add live preview (show match count + sample rows before execution)
3. Add value autocomplete from column data (prevent typos, accelerate input)

These three changes would transform the rule builders from a power-user tool that requires VBA mental models into an accessible data-transformation interface that matches the Excel-familiar expectations of the target persona.
