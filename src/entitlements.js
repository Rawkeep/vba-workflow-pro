// ─── Feature Entitlements (FREE vs PRO) ───
// Checks localStorage for active subscription. Mobile: synced via RevenueCat.
// Web: synced via Stripe webhook → localStorage.

const FREE_FEATURES = new Set([
  'excel-import',
  'excel-export-csv',
  'basic-if-else',      // max 3 rules
  'basic-charts',       // bar + line only
  'basic-calc',         // 1 calculated column
  'data-validation',
  'sort-filter',
  'search-replace',
  'text-functions',
]);

const PRO_FEATURES = new Set([
  'select-case',
  'switch-multi',
  'pipeline',
  'macros',
  'pdf-export',
  'docx-builder',
  'mail-merge',
  'email-batch',
  'workspaces',
  'doccenter',
  'templates',
  'database',
  'advanced-charts',
  'unlimited-if-else',
  'unlimited-calc',
  'pivot',
  'analyst',
  'smart-suggestions',
  'imap-monitor',
]);

const FREE_LIMITS = {
  ifElseRules: 3,
  calcColumns: 1,
  chartTypes: ['bar', 'line'],
};

// ─── State ───

function _getEntitlement() {
  try {
    const raw = localStorage.getItem('vba_entitlement');
    if (!raw) return null;
    const ent = JSON.parse(raw);
    // Check expiry
    if (ent.expiresAt && new Date(ent.expiresAt) < new Date()) {
      localStorage.removeItem('vba_entitlement');
      return null;
    }
    // Integrity check: require signed source
    if (!ent.sig || !['stripe','revenuecat'].includes(ent.source)) {
      return null;
    }
    return ent;
  } catch {
    return null;
  }
}

export function isPro() {
  const ent = _getEntitlement();
  return ent?.tier === 'pro' || ent?.tier === 'ai';
}

export function isAI() {
  const ent = _getEntitlement();
  return ent?.tier === 'ai';
}

export function getTier() {
  const ent = _getEntitlement();
  return ent?.tier || 'free';
}

export function canUse(feature) {
  if (isPro()) return true;
  return FREE_FEATURES.has(feature);
}

export function getLimit(key) {
  if (isPro()) return Infinity;
  return FREE_LIMITS[key];
}

// ─── Activation ───

export function activatePro(tier, expiresAt, source, sig) {
  localStorage.setItem('vba_entitlement', JSON.stringify({
    tier,        // 'pro' | 'ai'
    expiresAt,   // ISO string
    source,      // 'stripe' | 'revenuecat'
    sig,         // HMAC from server
    activatedAt: new Date().toISOString(),
  }));
  window.dispatchEvent(new CustomEvent('entitlement-change', { detail: { tier } }));
}

export function deactivate() {
  localStorage.removeItem('vba_entitlement');
  window.dispatchEvent(new CustomEvent('entitlement-change', { detail: { tier: 'free' } }));
}

// ─── UI Gate Helper ───

export function gateFeature(feature, action) {
  if (canUse(feature)) {
    action();
    return;
  }
  showUpgradePrompt(feature);
}

export function showUpgradePrompt(feature) {
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-overlay';
  overlay.innerHTML = `
    <div class="upgrade-modal">
      <h3>PRO Feature</h3>
      <p><strong>${feature}</strong> ist ein PRO-Feature.</p>
      <p>Upgrade auf VBA BEAST PRO für unbegrenzten Zugriff auf alle Features.</p>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
        <button onclick="this.closest('.upgrade-overlay').remove()"
                style="padding:8px 16px;border-radius:8px;border:1px solid var(--brd);background:var(--s2);color:var(--tx);cursor:pointer">
          Später
        </button>
        <button onclick="window.showPaywall?.();this.closest('.upgrade-overlay').remove()"
                style="padding:8px 16px;border-radius:8px;border:none;background:var(--acc);color:#000;font-weight:700;cursor:pointer">
          Upgrade — €9,99/Mo
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ─── Expose ───
window.isPro = isPro;
window.isAI = isAI;
window.getTier = getTier;
window.canUse = canUse;
window.gateFeature = gateFeature;
