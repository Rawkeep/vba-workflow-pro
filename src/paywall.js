// ─── Paywall UI ───
// Shows plan comparison + triggers Stripe checkout or IAP

import { isPro, isAI, getTier, activatePro } from './entitlements.js';
import { toast } from './nav.js';

let _prices = null;

async function fetchPrices() {
  if (_prices) return _prices;
  try {
    const res = await fetch('/api/stripe/prices');
    _prices = await res.json();
    return _prices;
  } catch {
    return {
      monthly: { label: '€9,99/Mo' },
      yearly:  { label: '€79,99/Jahr' },
      ai:      { label: '€19,99/Mo' },
    };
  }
}

async function checkout(priceId) {
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        deviceId: localStorage.getItem('vba_device_id') || 'web',
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast('Checkout fehlgeschlagen', 'red');
    }
  } catch {
    toast('Verbindungsfehler', 'red');
  }
}

export async function showPaywall() {
  const prices = await fetchPrices();
  const tier = getTier();

  const overlay = document.createElement('div');
  overlay.className = 'upgrade-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="paywall">
      <button class="paywall-close" onclick="this.closest('.upgrade-overlay').remove()">&times;</button>
      <h2>VBA BEAST Upgrade</h2>
      <p class="paywall-sub">Einmal upgraden — alle Features freischalten</p>

      <div class="paywall-plans">
        <!-- PRO Monthly -->
        <div class="paywall-card ${tier === 'pro' ? 'active' : ''}">
          <div class="paywall-badge">PRO</div>
          <div class="paywall-price">${prices.monthly.label}</div>
          <ul>
            <li>SELECT CASE unbegrenzt</li>
            <li>Pipelines &amp; Macros</li>
            <li>PDF &amp; DOCX Export</li>
            <li>Mail-Merge &amp; E-Mail</li>
            <li>Workspaces &amp; Templates</li>
            <li>Pivot &amp; Advanced Charts</li>
          </ul>
          ${tier === 'pro' ? '<div class="paywall-active">Aktiv</div>' :
            `<button class="paywall-btn" data-price="${prices.monthly.id}">Jetzt upgraden</button>`}
        </div>

        <!-- PRO Yearly -->
        <div class="paywall-card popular ${tier === 'pro' ? 'active' : ''}">
          <div class="paywall-ribbon">Spare 33%</div>
          <div class="paywall-badge">PRO JAHR</div>
          <div class="paywall-price">${prices.yearly.label}</div>
          <ul>
            <li>Alles aus PRO Monatlich</li>
            <li>= €6,67/Monat</li>
            <li>Einmal zahlen, 12 Monate nutzen</li>
          </ul>
          ${tier === 'pro' ? '<div class="paywall-active">Aktiv</div>' :
            `<button class="paywall-btn" data-price="${prices.yearly.id}">Jahresabo starten</button>`}
        </div>

        <!-- AI Tier -->
        <div class="paywall-card ai ${tier === 'ai' ? 'active' : ''}">
          <div class="paywall-badge">AI PRO</div>
          <div class="paywall-price">${prices.ai.label}</div>
          <ul>
            <li>Alle PRO-Features</li>
            <li>Workflow Builder (AI)</li>
            <li>Daten-Profiler (AI)</li>
            <li>Formel-Assistent (AI)</li>
            <li>Template Generator (AI)</li>
            <li>Unbegrenzte AI-Anfragen</li>
          </ul>
          ${tier === 'ai' ? '<div class="paywall-active">Aktiv</div>' :
            `<button class="paywall-btn ai-btn" data-price="${prices.ai.id}">AI Pro starten</button>`}
        </div>
      </div>

      <p class="paywall-footer">Jederzeit kündbar &middot; 7 Tage kostenlos testen &middot; DSGVO-konform</p>
    </div>`;

  // Bind checkout buttons
  overlay.querySelectorAll('.paywall-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const priceId = btn.dataset.price;
      if (priceId) checkout(priceId);
    });
  });

  document.body.appendChild(overlay);
}

// ─── Check subscription status on load ───

export async function syncEntitlement() {
  const customerId = localStorage.getItem('vba_stripe_customer');
  if (!customerId) return;

  try {
    const res = await fetch(`/api/stripe/status?customer=${encodeURIComponent(customerId)}`);
    const data = await res.json();
    if (data.tier && data.tier !== 'free') {
      activatePro(data.tier, data.expiresAt, 'stripe');
    }
  } catch {
    // Offline — keep cached entitlement
  }
}

// ─── Handle ?sub=success from Stripe redirect ───

export function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('sub') === 'success') {
    toast('Willkommen bei VBA BEAST PRO!', 'green');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    // Sync will pick up the subscription on next load
    syncEntitlement();
  }
}

// ─── Expose ───
window.showPaywall = showPaywall;
